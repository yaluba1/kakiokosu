import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptUtterance, DeepgramResponse } from '../types/transcription';
import { groupWordsBySpeaker } from '../utils/transcriptionUtils';
import { useAudioBuffer } from './useAudioBuffer';
import { useFingerprint } from '../context/FingerprintContext';

export type TranscriptionStatusCode =
  | 'ready'
  | 'idle'
  | 'authRequired'
  | 'connecting'
  | 'listening'
  | 'error'
  | 'micError';

const SESSION_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface UseTranscriptionOptions {
  workerWsUrl: string;
  token: string | null;
  language: string;
}

export function useTranscription({
  workerWsUrl,
  token,
  language,
}: UseTranscriptionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [utterances, setUtterances] = useState<TranscriptUtterance[]>([]);
  const [interimText, setInterimText] = useState('');
  const [interimSpeaker, setInterimSpeaker] = useState(1);
  const [mutedSpeakers, setMutedSpeakers] = useState<number[]>([]);
  const [statusCode, setStatusCode] = useState<TranscriptionStatusCode>('ready');

  const { resetBuffer, appendChunk, getSlice, accumulateSpeakerAudio } = useAudioBuffer();
  const {
    hasFingerprint,
    setOwnerSpeakerId,
    matchSpeaker,
    lockButton,
  } = useFingerprint();

  // Raw Deepgram speaker ID that has been verified to match the owner's voiceprint.
  // Canonical Speaker 0 is strictly reserved for this matched speaker; all other speakers are 1, 2, ...
  const ownerRawSpeakerRef = useRef<number | null>(null);
  const rawSpeakerOrderRef = useRef<number[]>([]);
  const speakerMatchStreakRef = useRef<Map<number, number>>(new Map());
  const matchingInProgressRef = useRef<boolean>(false);

  const mapRawSpeakerToCanonical = useCallback(
    (rawSpk: number, ownerRaw: number | null, order: number[]): number => {
      if (!order.includes(rawSpk)) {
        order.push(rawSpk);
      }
      if (ownerRaw !== null && rawSpk === ownerRaw) {
        return 0;
      }
      let nonOwnerIdx = 0;
      for (const s of order) {
        if (s === ownerRaw) continue;
        nonOwnerIdx++;
        if (s === rawSpk) return nonOwnerIdx;
      }
      return nonOwnerIdx + 1;
    },
    []
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isManualWakeLockReleaseRef = useRef(false);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request screen wake lock so tablet/phone screen stays awake during conversation
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        // If we already hold an active unreleased lock, no need to duplicate
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return;
        }
        isManualWakeLockReleaseRef.current = false;
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;

        // If OS releases wake lock (e.g. system power saver or inactivity timeout)
        // while the session is still active and visible, re-acquire immediately to keep screen awake
        lock.addEventListener('release', () => {
          wakeLockRef.current = null;
          if (!isManualWakeLockReleaseRef.current && document.visibilityState === 'visible') {
            void requestWakeLock();
          }
        });
      }
    } catch {
      // Ignore wake lock error on unsupported platforms
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      isManualWakeLockReleaseRef.current = true;
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Sync muted speakers with Worker whenever it changes
  const notifyWorkerMutedSpeakers = useCallback((speakers: number[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'set_muted_speakers',
          speakers,
        })
      );
    }
  }, []);

  const toggleMuteSpeaker = useCallback(
    (speakerId: number) => {
      setMutedSpeakers((prev) => {
        const next = prev.includes(speakerId)
          ? prev.filter((id) => id !== speakerId)
          : [...prev, speakerId];
        notifyWorkerMutedSpeakers(next);
        return next;
      });
    },
    [notifyWorkerMutedSpeakers]
  );

  const unmuteSpeaker = useCallback(
    (speakerId: number) => {
      setMutedSpeakers((prev) => {
        const next = prev.filter((id) => id !== speakerId);
        notifyWorkerMutedSpeakers(next);
        return next;
      });
    },
    [notifyWorkerMutedSpeakers]
  );

  const clearAllMuted = useCallback(() => {
    setMutedSpeakers([]);
    notifyWorkerMutedSpeakers([]);
  }, [notifyWorkerMutedSpeakers]);

  // Clean stop audio capture & WebSocket
  const stopRecording = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    releaseWakeLock();

    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Session closed');
      }
      wsRef.current = null;
    }

    resetBuffer();
    lockButton();
    ownerRawSpeakerRef.current = null;
    rawSpeakerOrderRef.current = [];
    speakerMatchStreakRef.current.clear();
    matchingInProgressRef.current = false;

    setIsRecording(false);
    setInterimText('');
    setInterimSpeaker(1);
    setUtterances([]);
    setMutedSpeakers([]);
    setStatusCode('idle');
  }, [resetBuffer, lockButton]);

  // Start audio capture & WebSocket streaming
  const startRecording = useCallback(async () => {
    if (!token) {
      setStatusCode('authRequired');
      return;
    }

    try {
      setStatusCode('connecting');
      resetBuffer();
      lockButton();
      void requestWakeLock();
      ownerRawSpeakerRef.current = null;
      rawSpeakerOrderRef.current = [];
      speakerMatchStreakRef.current.clear();
      matchingInProgressRef.current = false;
      setOwnerSpeakerId(null);

      // 1. Acquire microphone with aggressive noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup AudioContext and AudioWorklet
      // Request 16,000 Hz natively so the browser performs high-grade anti-aliased sinc resampling
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioContextClass({ sampleRate: 16000 });
      } catch {
        audioCtx = new AudioContextClass();
      }
      audioContextRef.current = audioCtx;

      // Ensure audio context is running (iOS Safari requires explicit resume)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Load our downsampler & Int16 PCM AudioWorklet processor
      await audioCtx.audioWorklet.addModule('/audio-processor.js');

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
      workletNodeRef.current = workletNode;

      // 3. Connect to Cloudflare Worker WebSocket
      // Replace http/https with ws/wss if necessary, ensuring secure WebSocket (wss) on HTTPS pages
      const wsUrl = new URL(workerWsUrl);
      if (wsUrl.protocol === 'https:' || wsUrl.protocol === 'wss:') {
        wsUrl.protocol = 'wss:';
      } else {
        const isLocalhost =
          wsUrl.hostname === 'localhost' ||
          wsUrl.hostname === '127.0.0.1' ||
          wsUrl.hostname === '[::1]';
        wsUrl.protocol =
          window.location.protocol === 'https:' && !isLocalhost
            ? 'wss:'
            : 'ws:';
      }
      if (!wsUrl.pathname.endsWith('/ws')) {
        wsUrl.pathname = wsUrl.pathname === '/' ? '/ws' : `${wsUrl.pathname.replace(/\/+$/, '')}/ws`;
      }
      wsUrl.searchParams.set('token', token);
      wsUrl.searchParams.set('lang', language);

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setStatusCode('listening');
        setIsRecording(true);
        requestWakeLock();
        // Sync any active muted speakers immediately
        notifyWorkerMutedSpeakers(mutedSpeakers);
      };

      // Feed PCM audio chunks from AudioWorklet to WebSocket & rolling audio buffer
      workletNode.port.onmessage = (event) => {
        if (ws.readyState === WebSocket.OPEN && event.data instanceof ArrayBuffer) {
          appendChunk(event.data);
          ws.send(event.data);
        }
      };

      sourceNode.connect(workletNode);
      // Connect to destination to keep worklet ticking (we output 0s or nothing to prevent feedback)
      workletNode.connect(audioCtx.destination);

      // 4. Handle incoming Deepgram transcript events
      ws.onmessage = (event) => {
        try {
          const data: DeepgramResponse = JSON.parse(event.data);
          const alt = data.channel?.alternatives?.[0];
          if (!alt) return;

          const transcript = alt.transcript || '';

          if (data.is_final) {
            // Finalized block
            setInterimText('');
            if (transcript.trim().length > 0) {
              const blocks = groupWordsBySpeaker(alt.words || [], transcript);
              if (blocks.length > 0) {
                const newUtterances: TranscriptUtterance[] = blocks.map((block) => ({
                  id: crypto.randomUUID(),
                  speaker: mapRawSpeakerToCanonical(
                    block.speaker,
                    ownerRawSpeakerRef.current,
                    rawSpeakerOrderRef.current
                  ),
                  rawSpeaker: block.speaker,
                  text: block.transcript,
                  isFinal: true,
                  startSec: block.startSec ?? data.start,
                  endSec:
                    block.endSec ??
                    (data.start && data.duration ? data.start + data.duration : undefined),
                  timestamp: Date.now(),
                }));
                setUtterances((prev) => [...prev, ...newUtterances]);

                // Automatic Owner Voiceprint Matching (runs until ownerRawSpeakerRef is identified in this session)
                if (
                  hasFingerprint &&
                  ownerRawSpeakerRef.current === null &&
                  !matchingInProgressRef.current
                ) {
                  matchingInProgressRef.current = true;
                  void (async () => {
                    try {
                      for (const block of blocks) {
                        if (ownerRawSpeakerRef.current !== null) break;
                        const bStart = block.startSec ?? data.start ?? 0;
                        const bEnd =
                          block.endSec ??
                          (data.start && data.duration ? data.start + data.duration : bStart + 1.5);
                        const durationSec = bEnd - bStart;

                        // Ignore very short interjections/noise (< 0.3s or < 2 chars) so they don't pollute speaker audio
                        if (durationSec < 0.3 || block.transcript.trim().length < 2) {
                          continue;
                        }

                        const slice = getSlice(bStart, bEnd);
                        const accumulated = accumulateSpeakerAudio(block.speaker, slice);

                        const isOwner = await matchSpeaker(accumulated, block.speaker);
                        if (isOwner) {
                          const prevStreak = speakerMatchStreakRef.current.get(block.speaker) ?? 0;
                          const nextStreak = prevStreak + 1;
                          speakerMatchStreakRef.current.set(block.speaker, nextStreak);

                          // Promote to Speaker 0 as soon as accumulated speaker audio matches the voiceprint
                          if (nextStreak >= 1) {
                            const matchedRaw = block.speaker;
                            const oldCanonicalId = mapRawSpeakerToCanonical(
                              matchedRaw,
                              null,
                              rawSpeakerOrderRef.current
                            );
                            ownerRawSpeakerRef.current = matchedRaw;
                            setOwnerSpeakerId(0);

                            // Remap all existing session utterances so matched speaker is 0 and others are 1, 2, ...
                            setUtterances((prev) =>
                              prev.map((u) => {
                                if (typeof u.rawSpeaker === 'number') {
                                  return {
                                    ...u,
                                    speaker: mapRawSpeakerToCanonical(
                                      u.rawSpeaker,
                                      matchedRaw,
                                      rawSpeakerOrderRef.current
                                    ),
                                  };
                                }
                                return u;
                              })
                            );

                            // Notify worker of the identified raw owner speaker so D1 segments are updated to Speaker 0
                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                              wsRef.current.send(
                                JSON.stringify({
                                  type: 'set_owner_speaker',
                                  rawSpeaker: matchedRaw,
                                })
                              );
                            }

                            // Automatically mute Speaker 0 (the owner) and shift any manually-muted non-owner IDs
                            setMutedSpeakers((prev) => {
                              const remapped = prev
                                .filter((id) => id !== oldCanonicalId)
                                .map((id) => (id > oldCanonicalId ? id - 1 : id));
                              const next = remapped.includes(0) ? remapped : [0, ...remapped];
                              notifyWorkerMutedSpeakers(next);
                              return next;
                            });
                            break;
                          }
                        }
                      }
                    } catch (err) {
                      console.warn('Speaker matching error:', err);
                    } finally {
                      matchingInProgressRef.current = false;
                    }
                  })();
                }
              }
            }
          } else {
            // Interim/in-progress live preview
            setInterimText(transcript);
            if (alt.words && alt.words.length > 0) {
              // Pick the speaker of the latest spoken word for active interim speech
              const latestWord = alt.words[alt.words.length - 1];
              const rawSpk = latestWord.speaker ?? 0;
              setInterimSpeaker(
                mapRawSpeakerToCanonical(
                  rawSpk,
                  ownerRawSpeakerRef.current,
                  rawSpeakerOrderRef.current
                )
              );
            }
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatusCode('error');
        stopRecording();
      };

      ws.onclose = () => {
        setStatusCode('idle');
        setIsRecording(false);
      };
    } catch (err) {
      console.error('Failed to start transcription:', err);
      setStatusCode('micError');
      stopRecording();
    }
  }, [
    token,
    workerWsUrl,
    language,
    mutedSpeakers,
    notifyWorkerMutedSpeakers,
    stopRecording,
    resetBuffer,
    lockButton,
    setOwnerSpeakerId,
    appendChunk,
    hasFingerprint,
    getSlice,
    accumulateSpeakerAudio,
    matchSpeaker,
    mapRawSpeakerToCanonical,
    requestWakeLock,
  ]);

  // Session auto-close lifecycle handlers:
  // 1. App goes to background or user switches tab/window or leaves page
  // 2. Display turns off (triggers visibilitychange to hidden and/or wake lock release)
  // 3. 30 minutes duration limit
  useEffect(() => {
    if (!isRecording) return;

    // 30 minutes timeout
    sessionTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, SESSION_MAX_DURATION_MS);

    // App backgrounded, tab switched, or display turned off / device locked
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopRecording();
      } else if (document.visibilityState === 'visible' && isRecording) {
        // Re-acquire wake lock to ensure screen stays awake when page returns to view
        void requestWakeLock();
      }
    };

    // User switches to a different window or app
    const handleBlur = () => {
      stopRecording();
    };

    // User navigates away, closes page, or page is frozen
    const handlePageHide = () => {
      stopRecording();
    };

    const handleBeforeUnload = () => {
      stopRecording();
    };

    const handleFreeze = () => {
      stopRecording();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('freeze', handleFreeze);

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [isRecording, stopRecording, requestWakeLock]);

  // End session immediately if user signs out during an active session (token becomes null)
  useEffect(() => {
    if (!token && isRecording) {
      stopRecording();
    }
  }, [token, isRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    utterances,
    interimText,
    interimSpeaker,
    mutedSpeakers,
    statusCode,
    statusText: statusCode,
    startRecording,
    stopRecording,
    toggleMuteSpeaker,
    unmuteSpeaker,
    clearAllMuted,
    clearUtterances: () => setUtterances([]),
  };
}

