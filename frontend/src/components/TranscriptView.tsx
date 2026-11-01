import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TranscriptUtterance } from '../types/transcription';
import { Volume2, VolumeX, Fingerprint } from 'lucide-react';
import { useFingerprint } from '../context/FingerprintContext';

const REQUIRED_CONSECUTIVE_TAPS = 3;
const MAX_TAP_DURATION_MS = 450;
const CONSECUTIVE_TAP_WINDOW_MS = 650;

interface TranscriptViewProps {
  utterances: TranscriptUtterance[];
  interimText: string;
  interimSpeaker?: number;
  mutedSpeakers: number[];
  onToggleMuteSpeaker: (speakerId: number) => void;
  fontSize: 'normal' | 'large' | 'huge';
  isRecording: boolean;
  onStartSession?: () => void;
}

// Visual color schemes for different speakers with high-contrast text
const SPEAKER_STYLES = [
  {
    bg: 'bg-sky-950/90',
    border: 'border-sky-400',
    badge: 'bg-sky-600 text-slate-950',
  },
  {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-400',
    badge: 'bg-emerald-500 text-slate-950',
  },
  {
    bg: 'bg-amber-950/90',
    border: 'border-amber-400',
    badge: 'bg-amber-400 text-slate-950',
  },
  {
    bg: 'bg-purple-950/90',
    border: 'border-purple-400',
    badge: 'bg-purple-400 text-slate-950',
  },
];

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  utterances,
  interimText,
  interimSpeaker = 1,
  mutedSpeakers,
  onToggleMuteSpeaker,
  fontSize,
  isRecording,
  onStartSession,
}) => {
  const { t } = useTranslation();
  const { ownerSpeakerId } = useFingerprint();
  const mainContainerRef = useRef<HTMLElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Track 3 short consecutive taps per speaker to prevent accidental muting
  const [tapProgress, setTapProgress] = useState<{ speakerId: number; count: number } | null>(null);
  const tapStateRef = useRef<{ speakerId: number; count: number; lastTapAt: number } | null>(null);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const clearTapState = useCallback(() => {
    if (tapResetTimerRef.current) {
      clearTimeout(tapResetTimerRef.current);
      tapResetTimerRef.current = null;
    }
    tapStateRef.current = null;
    setTapProgress(null);
  }, []);

  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, []);

  const registerShortTap = useCallback(
    (speakerId: number) => {
      const now = Date.now();
      const prev = tapStateRef.current;

      const isConsecutive =
        prev !== null &&
        prev.speakerId === speakerId &&
        now - prev.lastTapAt <= CONSECUTIVE_TAP_WINDOW_MS;

      const nextCount = isConsecutive ? prev.count + 1 : 1;

      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
        tapResetTimerRef.current = null;
      }

      if (nextCount >= REQUIRED_CONSECUTIVE_TAPS) {
        tapStateRef.current = null;
        setTapProgress(null);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(40);
          } catch {
            // Ignore unsupported vibrate
          }
        }
        onToggleMuteSpeaker(speakerId);
        return;
      }

      tapStateRef.current = { speakerId, count: nextCount, lastTapAt: now };
      setTapProgress({ speakerId, count: nextCount });

      tapResetTimerRef.current = setTimeout(() => {
        tapStateRef.current = null;
        setTapProgress(null);
        tapResetTimerRef.current = null;
      }, CONSECUTIVE_TAP_WINDOW_MS);
    },
    [onToggleMuteSpeaker]
  );

  // Typography sizing classes based on font size setting
  const textClass =
    fontSize === 'huge'
      ? 'text-3xl sm:text-4xl md:text-5xl leading-relaxed sm:leading-relaxed font-bold'
      : fontSize === 'large'
      ? 'text-2xl sm:text-3xl md:text-4xl leading-relaxed sm:leading-relaxed font-semibold'
      : 'text-xl sm:text-2xl md:text-3xl leading-relaxed font-medium';

  // Filter out any muted speakers
  const visibleUtterances = utterances.filter(
    (u) => !mutedSpeakers.includes(u.speaker)
  );

  const isInterimVisible =
    interimText.trim().length > 0 && !mutedSpeakers.includes(interimSpeaker);

  // Auto-scroll to bottom of the transcript container only as actual speech arrives,
  // without shifting the browser window or ancestor viewports.
  useEffect(() => {
    if (visibleUtterances.length > 0 || isInterimVisible) {
      if (mainContainerRef.current) {
        mainContainerRef.current.scrollTo({
          top: mainContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [visibleUtterances.length, interimText, isInterimVisible]);

  return (
    <main
      ref={mainContainerRef}
      aria-live="polite"
      className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6"
    >
      {visibleUtterances.length === 0 && !isInterimVisible && (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none">
          {!isRecording ? (
            <button
              type="button"
              onClick={onStartSession}
              aria-label={t('header.action.start')}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-900 hover:bg-slate-800 border-4 border-emerald-500 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 flex items-center justify-center mb-6 shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400/40 ring-4 ring-emerald-500/20"
            >
              <Volume2 className="w-14 h-14 sm:w-18 sm:h-18" />
            </button>
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-900 border-4 border-rose-500/80 flex items-center justify-center text-rose-400 mb-6 animate-pulse ring-8 ring-rose-500/20">
              <Volume2 className="w-14 h-14 sm:w-18 sm:h-18" />
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-200">
            {isRecording ? t('transcript.empty.listeningTitle') : t('transcript.empty.idleTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-slate-400 mt-2 max-w-md">
            {isRecording
              ? t('transcript.empty.listeningDesc')
              : t('transcript.empty.idleDesc')}
          </p>
        </div>
      )}

      {/* Render Finalized Utterances */}
      {visibleUtterances.map((u) => {
        const isOwner = u.speaker === 0 || (ownerSpeakerId !== null && u.speaker === ownerSpeakerId);
        const style = SPEAKER_STYLES[u.speaker % SPEAKER_STYLES.length];
        const activeTapCount =
          tapProgress && tapProgress.speakerId === u.speaker ? tapProgress.count : 0;

        return (
          <article
            key={u.id}
            data-speaker-bubble="true"
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              pointerDownRef.current = { time: Date.now(), x: e.clientX, y: e.clientY };
            }}
            onClick={(e) => {
              const down = pointerDownRef.current;
              pointerDownRef.current = null;
              if (down) {
                const duration = Date.now() - down.time;
                const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
                if (duration > MAX_TAP_DURATION_MS || moved > 15) {
                  clearTapState();
                  return;
                }
              }
              registerShortTap(u.speaker);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.repeat) return;
                e.preventDefault();
                registerShortTap(u.speaker);
              }
            }}
            title={t('transcript.tapToHide')}
            className={`w-full group cursor-pointer transition-transform active:scale-[0.99] rounded-3xl p-5 sm:p-7 border-3 shadow-xl ${style.bg} ${style.border}`}
          >
            {/* Speaker Header with 3-Tap to Mute hint */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 select-none">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm sm:text-base ${
                    isOwner ? 'bg-sky-500 text-slate-950' : style.badge
                  }`}
                >
                  {isOwner && <Fingerprint className="w-4 h-4" />}
                  <span>
                    {isOwner
                      ? `${t('transcript.speaker', { number: 0 })} (${t('fingerprint.ownerBadge')})`
                      : t('transcript.speaker', { number: u.speaker })}
                  </span>
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition ${
                  activeTapCount > 0
                    ? 'text-amber-300'
                    : 'text-slate-400 group-hover:text-amber-400'
                }`}
              >
                <VolumeX className="w-4 h-4" />
                <span className={activeTapCount > 0 ? 'inline font-bold' : 'hidden sm:inline'}>
                  {t('transcript.tapToHide')}
                </span>
                {activeTapCount > 0 && (
                  <span
                    data-tap-progress={`${activeTapCount}/${REQUIRED_CONSECUTIVE_TAPS}`}
                    className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs"
                  >
                    {activeTapCount}/{REQUIRED_CONSECUTIVE_TAPS}
                  </span>
                )}
              </span>
            </div>

            {/* Transcript Text with auto direction detection for mixed/RTL content */}
            <p dir="auto" className={`text-white tracking-wide ${textClass}`}>
              {u.text}
            </p>
          </article>
        );
      })}

      {/* Render Real-Time Interim (In-Progress) Speech */}
      {isInterimVisible && (
        <article
          className={`w-full rounded-3xl p-5 sm:p-7 border-3 border-dashed border-sky-400/80 bg-sky-950/50 shadow-lg animate-pulse`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-400/20">
            <span className="px-3 py-1 rounded-full bg-sky-400 text-slate-950 font-black text-xs sm:text-sm">
              {t('transcript.interimBadge')}
            </span>
          </div>
          <p dir="auto" className={`text-sky-200 tracking-wide ${textClass}`}>
            {interimText}
          </p>
        </article>
      )}

      {/* Anchor for automatic smooth scrolling */}
      <div ref={bottomAnchorRef} className="h-4" />
    </main>
  );
};
