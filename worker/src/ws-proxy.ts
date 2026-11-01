import type { Env } from './db';
import {
  createSession,
  endSession,
  insertSegment,
  promoteSpeakerToOwner,
  getActiveSession,
  closeStaleSessions,
} from './db';
import type { UserAuth } from './auth';
import { isAllowedOrigin } from './api';

// Supported language codes
export const SUPPORTED_LANGUAGES = [
  'guess',
  'multi',
  'ja',
  'en',
  'fr',
  'de',
  'pt',
  'es',
  'ar',
  'he',
  'ca',
  'it',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Maximum allowed duration for a single WebSocket transcription session (30 minutes)
export const MAX_SESSION_DURATION_MS = 30 * 60 * 1000;

// Maximum byte budget per second (40 KB/s - well above the 32 KB/s for 16kHz 16-bit linear PCM)
export const MAX_AUDIO_BYTES_PER_SEC = 40 * 1024;

// Maximum allowed length for incoming client text control messages (4 KB)
export const MAX_CLIENT_MESSAGE_LEN = 4096;

// Maximum allowed number of distinct muted speakers
export const MAX_MUTED_SPEAKERS_COUNT = 64;

// Maximum raw speaker ID number accepted from client control messages
export const MAX_RAW_SPEAKER_ID = 64;

// Maximum allowed transcript length per segment (10,000 characters)
// A speaker talking for several seconds typically generates 50-300 characters.
// 10,000 characters comfortably allows multi-minute continuous utterances while preventing D1 payload exhaustion.
export const MAX_TRANSCRIPT_SEGMENT_LEN = 10000;

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words?: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResponse {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: DeepgramChannel;
  start?: number;
  duration?: number;
}

/**
 * Handles incoming WebSocket upgrade requests, establishes an upstream connection
 * to Deepgram Nova-3, forwards binary audio streams, tracks muted speaker IDs,
 * and persists finalized transcript segments to Cloudflare D1.
 */
export async function handleWebSocketUpgrade(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  auth: UserAuth
): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, env)) {
    console.warn(`[CORS] Rejected WebSocket connection from unauthorized origin: ${origin}`);
    return new Response('Forbidden: Origin not allowed', { status: 403 });
  }

  const url = new URL(request.url);

  // Validate language parameter
  const rawLang = (url.searchParams.get('lang') || 'ja').toLowerCase();
  const lang = SUPPORTED_LANGUAGES.includes(rawLang as SupportedLanguage)
    ? (rawLang as SupportedLanguage)
    : 'ja';

  // Construct Deepgram WebSocket URL with Nova-3 and required parameters
  const deepgramUrl = new URL('https://api.deepgram.com/v1/listen');
  deepgramUrl.searchParams.set('model', 'nova-3');
  deepgramUrl.searchParams.set('diarize', 'true');
  deepgramUrl.searchParams.set('smart_format', 'true');
  deepgramUrl.searchParams.set('interim_results', 'true');
  deepgramUrl.searchParams.set('encoding', 'linear16');
  deepgramUrl.searchParams.set('sample_rate', '16000');
  deepgramUrl.searchParams.set('channels', '1');
  deepgramUrl.searchParams.set('endpointing', '300');
  deepgramUrl.searchParams.set('utterance_end_ms', '1000');

  if (lang === 'guess' || lang === 'multi') {
    deepgramUrl.searchParams.set('language', 'multi');
  } else {
    deepgramUrl.searchParams.set('language', lang);
  }

  // Create a WebSocket pair for the client
  const webSocketPair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(webSocketPair);

  // Accept the server-side WebSocket
  serverWs.accept();

  // Validate API configuration upfront
  if (!env.DEEPGRAM_API_KEY) {
    serverWs.send(
      JSON.stringify({
        type: 'error',
        message: 'Server error: DEEPGRAM_API_KEY is not configured',
      })
    );
    serverWs.close(1011, 'DEEPGRAM_API_KEY missing');
    return new Response(null, { status: 101, webSocket: clientWs });
  }

  // 1. Enforce single active session per user & clean up stale sessions (> 30 min)
  try {
    const activeSession = await getActiveSession(env.DB, auth.userId, MAX_SESSION_DURATION_MS);
    if (activeSession) {
      serverWs.send(
        JSON.stringify({
          type: 'error',
          code: 'SESSION_CONCURRENCY_LIMIT',
          message: 'An active transcription session is already open for this user. Only one session is permitted.',
        })
      );
      serverWs.close(1008, 'Concurrent session limit exceeded');
      return new Response(null, { status: 101, webSocket: clientWs });
    }
  } catch (err) {
    console.warn('Failed to verify active sessions in D1:', err);
  }

  // Close any stale unclosed sessions in the background
  ctx.waitUntil(
    closeStaleSessions(env.DB, auth.userId, MAX_SESSION_DURATION_MS).catch((err) =>
      console.warn('Failed to close stale sessions:', err)
    )
  );

  // 2. Connect to Deepgram upstream via WebSocket BEFORE creating session in D1.
  // This guarantees that upstream handshake failures do not leave unclosed "ghost" sessions
  // in D1 that lock the user out for 30 minutes.
  let deepgramWs: WebSocket;
  try {
    const deepgramResponse = await fetch(deepgramUrl.toString(), {
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        Upgrade: 'websocket',
      },
    });

    const upstreamWs = deepgramResponse.webSocket;
    if (!upstreamWs) {
      throw new Error(`Deepgram WebSocket handshake failed with status ${deepgramResponse.status}`);
    }
    deepgramWs = upstreamWs;
    deepgramWs.accept();
  } catch (err) {
    console.error('Failed to connect to Deepgram upstream:', err);
    serverWs.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to establish connection with transcription service',
      })
    );
    serverWs.close(1011, 'Upstream connection failure');
    return new Response(null, { status: 101, webSocket: clientWs });
  }

  // 3. Upstream connection succeeded: register session in Cloudflare D1
  const sessionId = crypto.randomUUID();
  const sessionStartedAt = Date.now();

  try {
    await createSession(env.DB, {
      id: sessionId,
      userId: auth.userId,
      language: lang,
      startedAt: sessionStartedAt,
    });
  } catch (err) {
    console.error('Failed to create session in D1:', err);
    try {
      deepgramWs.close();
    } catch {
      // Ignore
    }
    serverWs.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to initialize session database records',
      })
    );
    serverWs.close(1011, 'Database error');
    return new Response(null, { status: 101, webSocket: clientWs });
  }

  // Set of canonical speaker IDs (0 = owner, 1..N = other speakers) that the client user has muted
  const mutedSpeakers = new Set<number>();
  // Ordered list of distinct raw Deepgram speaker IDs seen in this session
  const rawSpeakerOrder: number[] = [];
  // Raw Deepgram speaker ID identified as the voiceprint owner (mapped to canonical Speaker 0)
  let ownerRawSpeaker: number | null = null;

  // Track audio streaming rate (bytes received within current 1-second window)
  let currentSecWindow = Math.floor(Date.now() / 1000);
  let bytesInCurrentSec = 0;

  // Track idempotent cleanup state across timers and socket close events
  let isCleanedUp = false;
  let sessionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let tokenExpTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Idempotent session cleanup handler:
   * 1. Clears duration and token expiration timers.
   * 2. Marks session as ended in D1 with caller userId guard.
   * 3. Closes upstream Deepgram WebSocket stream.
   * 4. Closes client-facing WebSocket connection.
   */
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (sessionTimeoutTimer) {
      clearTimeout(sessionTimeoutTimer);
      sessionTimeoutTimer = null;
    }
    if (tokenExpTimer) {
      clearTimeout(tokenExpTimer);
      tokenExpTimer = null;
    }

    ctx.waitUntil(
      endSession(env.DB, sessionId, auth.userId).catch((err) =>
        console.error('Failed to mark session ended in D1:', err)
      )
    );

    try {
      if (deepgramWs.readyState === WebSocket.OPEN || deepgramWs.readyState === WebSocket.CONNECTING) {
        deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
        deepgramWs.close();
      }
    } catch {
      // Ignore
    }

    try {
      if (serverWs.readyState === WebSocket.OPEN || serverWs.readyState === WebSocket.CONNECTING) {
        serverWs.close();
      }
    } catch {
      // Ignore
    }
  };

  // Server-side maximum session duration timer (30 minutes)
  sessionTimeoutTimer = setTimeout(() => {
    try {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(
          JSON.stringify({
            type: 'session_timeout',
            message: 'Session reached maximum allowed duration (30 minutes).',
          })
        );
      }
    } catch {
      // Ignore
    }
    cleanup();
  }, MAX_SESSION_DURATION_MS);

  // Optional token expiration timer (if exp is present on JWT payload)
  if (auth.exp && typeof auth.exp === 'number') {
    const timeUntilExpMs = auth.exp * 1000 - Date.now();
    if (timeUntilExpMs > 0 && timeUntilExpMs < MAX_SESSION_DURATION_MS) {
      tokenExpTimer = setTimeout(() => {
        try {
          if (serverWs.readyState === WebSocket.OPEN) {
            serverWs.send(
              JSON.stringify({
                type: 'error',
                code: 'TOKEN_EXPIRED',
                message: 'Authentication token expired during active session.',
              })
            );
          }
        } catch {
          // Ignore
        }
        cleanup();
      }, timeUntilExpMs);
    }
  }

  /**
   * Maps a raw Deepgram speaker ID to a canonical speaker ID where:
   * - Speaker 0 is strictly reserved for the speaker matching the owner's voice fingerprint.
   * - Non-owner speakers are numbered 1, 2, 3, ... in order of appearance.
   */
  const mapRawSpeaker = (rawSpk: number): number => {
    if (!rawSpeakerOrder.includes(rawSpk)) {
      rawSpeakerOrder.push(rawSpk);
    }
    if (ownerRawSpeaker !== null && rawSpk === ownerRawSpeaker) {
      return 0;
    }
    let nonOwnerIdx = 0;
    for (const s of rawSpeakerOrder) {
      if (s === ownerRawSpeaker) continue;
      nonOwnerIdx++;
      if (s === rawSpk) return nonOwnerIdx;
    }
    return nonOwnerIdx + 1;
  };

  // Send session confirmation to client
  serverWs.send(
    JSON.stringify({
      type: 'session_started',
      sessionId,
      language: lang,
    })
  );

  // Handle messages from the client (Audio chunks or JSON control messages)
  serverWs.addEventListener('message', (event) => {
    try {
      if (typeof event.data === 'string') {
        // Enforce max control message size (4 KB) to prevent memory allocation abuse
        if (event.data.length > MAX_CLIENT_MESSAGE_LEN) {
          console.warn(`[ControlMessage] User ${auth.userId} sent oversized message (${event.data.length} chars)`);
          return;
        }

        // Control message from client (e.g., mute/unmute state updates or owner identification)
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.type === 'set_owner_speaker' &&
            typeof msg.rawSpeaker === 'number' &&
            Number.isInteger(msg.rawSpeaker) &&
            msg.rawSpeaker >= 0 &&
            msg.rawSpeaker < MAX_RAW_SPEAKER_ID
          ) {
            if (ownerRawSpeaker === null) {
              const oldSpeakerId = mapRawSpeaker(msg.rawSpeaker);
              ownerRawSpeaker = msg.rawSpeaker;
              mutedSpeakers.add(0);
              ctx.waitUntil(
                promoteSpeakerToOwner(env.DB, sessionId, oldSpeakerId, auth.userId).catch((err) =>
                  console.error('Failed to promote owner speaker in D1:', err)
                )
              );
            }
          } else if (
            msg.type === 'mute_speaker' &&
            typeof msg.speaker === 'number' &&
            Number.isInteger(msg.speaker) &&
            msg.speaker >= 0 &&
            msg.speaker < MAX_RAW_SPEAKER_ID
          ) {
            if (mutedSpeakers.size < MAX_MUTED_SPEAKERS_COUNT) {
              mutedSpeakers.add(msg.speaker);
            }
          } else if (
            msg.type === 'unmute_speaker' &&
            typeof msg.speaker === 'number' &&
            Number.isInteger(msg.speaker)
          ) {
            mutedSpeakers.delete(msg.speaker);
          } else if (msg.type === 'set_muted_speakers' && Array.isArray(msg.speakers)) {
            mutedSpeakers.clear();
            for (const spk of msg.speakers.slice(0, MAX_MUTED_SPEAKERS_COUNT)) {
              if (
                typeof spk === 'number' &&
                Number.isInteger(spk) &&
                spk >= 0 &&
                spk < MAX_RAW_SPEAKER_ID
              ) {
                mutedSpeakers.add(spk);
              }
            }
          }
        } catch {
          // Non-JSON string, ignore or log
        }
      } else if (event.data instanceof ArrayBuffer || ArrayBuffer.isView(event.data)) {
        // Enforce rate limiting on audio streaming (byte budget per second)
        const byteLength = event.data.byteLength;
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec === currentSecWindow) {
          bytesInCurrentSec += byteLength;
        } else {
          currentSecWindow = nowSec;
          bytesInCurrentSec = byteLength;
        }

        if (bytesInCurrentSec > MAX_AUDIO_BYTES_PER_SEC) {
          console.warn(`[RateLimit] User ${auth.userId} exceeded audio bandwidth budget: ${bytesInCurrentSec} bytes/sec`);
          // Silently drop excess chunks to prevent flooding upstream Deepgram connection
          return;
        }

        // Binary PCM audio chunk from AudioWorklet -> relay to Deepgram
        if (deepgramWs.readyState === WebSocket.OPEN) {
          deepgramWs.send(event.data);
        }
      }
    } catch (err) {
      console.error('Error handling client message:', err);
    }
  });

  // Handle messages from Deepgram -> relay to client & persist final blocks to D1
  deepgramWs.addEventListener('message', (event) => {
    try {
      if (typeof event.data === 'string') {
        // Forward JSON message to client so UI updates immediately
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.send(event.data);
        }

        // Asynchronously inspect and persist finalized segments to D1
        const response: DeepgramResponse = JSON.parse(event.data);
        const alt = response.channel?.alternatives?.[0];

        if (response.is_final && alt && alt.transcript && alt.transcript.trim().length > 0) {
          // Truncate segment to a safe upper bound (10,000 characters) if extraordinarily long,
          // which easily covers multi-minute continuous speech sentences without overflowing D1.
          const cleanTranscript = alt.transcript.trim().slice(0, MAX_TRANSCRIPT_SEGMENT_LEN);

          // If words are available with speaker diarization, group by speaker
          if (alt.words && alt.words.length > 0) {
            const speakerBlocks = groupWordsBySpeaker(alt.words, cleanTranscript);
            for (const block of speakerBlocks) {
              const mappedSpeaker = mapRawSpeaker(block.speaker);
              const isMuted = mutedSpeakers.has(mappedSpeaker);
              const blockTranscript = block.transcript.slice(0, MAX_TRANSCRIPT_SEGMENT_LEN);
              ctx.waitUntil(
                insertSegment(env.DB, {
                  sessionId,
                  userId: auth.userId,
                  speaker: mappedSpeaker,
                  transcript: blockTranscript,
                  isMuted,
                  startSec: block.startSec,
                  endSec: block.endSec,
                  createdAt: Date.now(),
                }).catch((err) => console.error('Failed to insert segment into D1:', err))
              );
            }
          } else {
            // Fallback if no individual word diarization is present
            const mappedSpeaker = mapRawSpeaker(0);
            ctx.waitUntil(
              insertSegment(env.DB, {
                sessionId,
                userId: auth.userId,
                speaker: mappedSpeaker,
                transcript: cleanTranscript,
                isMuted: mutedSpeakers.has(mappedSpeaker),
                startSec: response.start,
                endSec: response.start && response.duration ? response.start + response.duration : undefined,
                createdAt: Date.now(),
              }).catch((err) => console.error('Failed to insert fallback segment into D1:', err))
            );
          }
        }
      }
    } catch (err) {
      console.error('Error handling Deepgram message:', err);
    }
  });

  // Register lifecycle event listeners
  serverWs.addEventListener('close', cleanup);
  serverWs.addEventListener('error', cleanup);
  deepgramWs.addEventListener('close', cleanup);
  deepgramWs.addEventListener('error', (err) => {
    console.error('Deepgram WebSocket error:', err);
    cleanup();
  });

  return new Response(null, {
    status: 101,
    webSocket: clientWs,
  });
}

/**
 * Removes isolated 1-word speaker glitches (e.g. Speaker 0 -> Speaker 1 -> Speaker 0
 * for a duration under 0.45 seconds).
 */
export function smoothWordSpeakers(words: DeepgramWord[]): DeepgramWord[] {
  if (words.length < 3) return words;
  const smoothed = words.map((w) => ({ ...w }));

  for (let i = 1; i < smoothed.length - 1; i++) {
    const prevSpk = smoothed[i - 1].speaker ?? 0;
    const currSpk = smoothed[i].speaker ?? 0;
    const nextSpk = smoothed[i + 1].speaker ?? 0;

    if (currSpk !== prevSpk && prevSpk === nextSpk) {
      const dur = (smoothed[i].end ?? 0) - (smoothed[i].start ?? 0);
      if (dur < 0.45) {
        smoothed[i].speaker = prevSpk;
      }
    }
  }

  return smoothed;
}

/**
 * Concatenates words intelligently, omitting spaces between CJK characters (Japanese, Chinese)
 * while preserving standard whitespace for alphabetic languages.
 */
export function joinWordsRespectingLanguage(words: string[]): string {
  if (words.length === 0) return '';
  let result = words[0];

  for (let i = 1; i < words.length; i++) {
    const prevChar = result.slice(-1);
    const nextChar = words[i].charAt(0);

    const isPrevCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(prevChar);
    const isNextCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(nextChar);

    if (isPrevCjk || isNextCjk) {
      result += words[i];
    } else {
      result += ' ' + words[i];
    }
  }

  return result;
}

/**
 * Groups consecutive words with the same speaker ID into unified transcript blocks.
 * If all words belong to a single speaker, preserves Deepgram's original Smart Formatting.
 */
export function groupWordsBySpeaker(
  words: DeepgramWord[],
  fallbackTranscript?: string
): Array<{
  speaker: number;
  transcript: string;
  startSec: number;
  endSec: number;
}> {
  if (words.length === 0) {
    if (fallbackTranscript && fallbackTranscript.trim().length > 0) {
      return [
        {
          speaker: 0,
          transcript: fallbackTranscript.trim(),
          startSec: 0,
          endSec: 0,
        },
      ];
    }
    return [];
  }

  const smoothed = smoothWordSpeakers(words);
  const firstSpeaker = smoothed[0].speaker ?? 0;
  const isSingleSpeaker = smoothed.every((w) => (w.speaker ?? 0) === firstSpeaker);

  // If entire utterance is from one speaker, preserve Deepgram's exact Smart Formatting
  if (isSingleSpeaker && fallbackTranscript && fallbackTranscript.trim().length > 0) {
    return [
      {
        speaker: firstSpeaker,
        transcript: fallbackTranscript.trim(),
        startSec: smoothed[0].start,
        endSec: smoothed[smoothed.length - 1].end,
      },
    ];
  }

  const blocks: Array<{
    speaker: number;
    transcript: string;
    startSec: number;
    endSec: number;
  }> = [];

  let currentSpeaker: number | null = null;
  let currentWords: string[] = [];
  let startSec = 0;
  let endSec = 0;

  for (const wordObj of smoothed) {
    const spk = wordObj.speaker ?? 0;
    const text = wordObj.punctuated_word || wordObj.word;

    if (currentSpeaker === null) {
      currentSpeaker = spk;
      startSec = wordObj.start;
      endSec = wordObj.end;
      currentWords = [text];
    } else if (currentSpeaker === spk) {
      currentWords.push(text);
      endSec = wordObj.end;
    } else {
      // Speaker changed -> flush previous block
      blocks.push({
        speaker: currentSpeaker,
        transcript: joinWordsRespectingLanguage(currentWords),
        startSec,
        endSec,
      });
      currentSpeaker = spk;
      startSec = wordObj.start;
      endSec = wordObj.end;
      currentWords = [text];
    }
  }

  if (currentSpeaker !== null && currentWords.length > 0) {
    blocks.push({
      speaker: currentSpeaker,
      transcript: joinWordsRespectingLanguage(currentWords),
      startSec,
      endSec,
    });
  }

  return blocks;
}

