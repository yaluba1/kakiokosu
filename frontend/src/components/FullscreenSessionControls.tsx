import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HoldButton } from './HoldButton';

const StopIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="5" width="14" height="14" rx="2" ry="2" />
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

interface FullscreenSessionControlsProps {
  isRecording: boolean;
  onStopSession: () => void;
}

const HOLD_DURATION_MS = 3000;
const MOVE_TOLERANCE_PX = 15;

const EXIT_HINTS: Record<string, string> = {
  ja: '画面を3秒長押し、または「終了」長押しでセッション終了',
  en: 'Hold anywhere for 3s or hold Stop to exit session',
  es: 'Mantén pulsado 3s o mantén Detener para salir',
  fr: 'Maintenez 3s ou maintenez Arrêter pour quitter',
  de: '3 Sek. gedrückt halten oder Stopp halten zum Beenden',
  pt: 'Segure em qualquer lugar por 3s ou segure Parar para sair',
  it: 'Tieni premuto per 3s o tieni premuto Ferma per uscire',
  ca: 'Mantingueu premut 3s o mantingueu Aturar per sortir',
  ar: 'اضغط مع الاستمرار لمدة 3 ثوانٍ أو اضغط على إيقاف للخروج',
  he: 'לחץ לחיצה ארוכה למשך 3 שניות או החזק עצור ליציאה',
};

const HOLD_LABELS: Record<string, string> = {
  ja: '長押しで終了',
  en: 'Hold to Exit',
  es: 'Mantén para salir',
  fr: 'Maintenir pour quitter',
  de: 'Halten zum Beenden',
  pt: 'Segure para sair',
  it: 'Tieni premuto per uscire',
  ca: 'Mantingueu per sortir',
  ar: 'اضغط للخروج',
  he: 'החזק ליציאה',
};

export const FullscreenSessionControls: React.FC<FullscreenSessionControlsProps> = ({
  isRecording,
  onStopSession,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'ja';

  const exitHintText = EXIT_HINTS[currentLang] || EXIT_HINTS.en;
  const holdLabelText = HOLD_LABELS[currentLang] || HOLD_LABELS.en;

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdPos, setHoldPos] = useState<{ x: number; y: number } | null>(null);
  const [showToast, setShowToast] = useState(false);

  const activePointerIdRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    activePointerIdRef.current = null;
    startPosRef.current = null;
  }, []);

  // Show intro toast when recording starts, auto-hide after 4 seconds
  useEffect(() => {
    if (isRecording) {
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
      }, 4000);
    } else {
      setShowToast(false);
      clearHoldTimers();
      setIsHolding(false);
      setHoldPos(null);
    }

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      clearHoldTimers();
    };
  }, [isRecording, clearHoldTimers]);

  // Handle 3-second long press anywhere on the window
  useEffect(() => {
    if (!isRecording) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right/middle clicks
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // Ignore touches directly on the floating stop button or muted speakers bar
      const target = e.target as Element | null;
      if (target?.closest?.('[data-stop-button="true"], [data-muted-bar="true"]')) return;

      // Dismiss the intro toast on any screen interaction
      setShowToast(false);

      // Only track one pointer at a time
      if (activePointerIdRef.current !== null) return;

      clearHoldTimers();

      activePointerIdRef.current = e.pointerId;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      // Clamp position so progress ring is comfortably inside screen edges
      const ringRadius = 44;
      const clampedX = Math.max(
        ringRadius + 16,
        Math.min(window.innerWidth - ringRadius - 16, e.clientX)
      );
      const clampedY = Math.max(
        ringRadius + 16,
        Math.min(window.innerHeight - ringRadius - 16, e.clientY)
      );

      setHoldPos({ x: clampedX, y: clampedY });
      setIsHolding(true);
      setHoldProgress(0);

      const startTime = Date.now();

      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(1, elapsed / HOLD_DURATION_MS);
        setHoldProgress(p);
      }, 20);

      holdTimerRef.current = setTimeout(() => {
        clearHoldTimers();
        setIsHolding(false);
        setHoldPos(null);

        // Haptic feedback on Samsung / Android devices
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([60, 40, 60]);
          } catch {
            // Ignore unsupported vibrate
          }
        }

        onStopSession();
      }, HOLD_DURATION_MS);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current || !startPosRef.current) return;

      const dist = Math.hypot(
        e.clientX - startPosRef.current.x,
        e.clientY - startPosRef.current.y
      );

      // If user moves finger > 15px (scrolling or swiping), cancel the hold
      if (dist > MOVE_TOLERANCE_PX) {
        clearHoldTimers();
        setIsHolding(false);
        setHoldPos(null);
      }
    };

    const handlePointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId === activePointerIdRef.current) {
        clearHoldTimers();
        setIsHolding(false);
        setHoldPos(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUpOrCancel, { passive: true });
    window.addEventListener('pointercancel', handlePointerUpOrCancel, { passive: true });

    return () => {
      clearHoldTimers();
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
    };
  }, [isRecording, onStopSession, clearHoldTimers]);

  if (!isRecording) return null;

  // Geometry for the circular SVG progress ring (radius 32, circumference ~201.06)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - holdProgress);
  const remainingSeconds = Math.max(
    1,
    Math.ceil(((1 - holdProgress) * HOLD_DURATION_MS) / 1000)
  );

  return (
    <>
      {/* Option 2: Floating Minimalist Exit / Stop Button (top right) */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-40">
        <HoldButton
          data-stop-button="true"
          onHoldComplete={onStopSession}
          holdDurationMs={1000}
          hintText={t('header.holdHint')}
          progressBarColor="bg-rose-500"
          hintClassName="border-rose-400/70 text-rose-200"
          title={t('header.action.stop')}
          className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border-2 border-rose-500/60 hover:border-rose-400 text-rose-300 hover:text-white rounded-2xl flex items-center gap-2 font-bold text-sm shadow-2xl transition cursor-pointer"
        >
          <StopIcon className="w-4 h-4 fill-rose-500 text-rose-500" />
          <span>{t('header.action.stop')}</span>
        </HoldButton>
      </div>

      {/* Option 1: Visual Touch Indicator for 3-Second Hold Anywhere */}
      {isHolding && holdPos && (
        <div
          data-screen-hold-overlay="true"
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: `${holdPos.x}px`, top: `${holdPos.y}px` }}
        >
          {/* Radial progress ring */}
          <div className="relative w-20 h-20 rounded-full bg-slate-950/85 backdrop-blur-md border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.45)] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              {/* Background track circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-slate-700/60"
                strokeWidth="4"
                fill="none"
              />
              {/* Animated fill progress circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-rose-500"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Inner Stop Icon */}
            <StopIcon className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
          </div>

          {/* Floating countdown badge */}
          <div className="mt-2 whitespace-nowrap px-3 py-1 bg-slate-900/90 border border-rose-500/60 rounded-full text-xs font-bold text-rose-200 shadow-xl backdrop-blur-sm">
            {remainingSeconds}s ... {holdLabelText}
          </div>
        </div>
      )}

      {/* Brief transient hint toast shown when session starts */}
      {showToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 py-2 bg-slate-900/90 border border-slate-700/90 backdrop-blur-md rounded-full shadow-2xl flex items-center gap-2 text-slate-200 text-xs sm:text-sm font-semibold transition-opacity duration-300 animate-fade-in"
          style={{ maxWidth: '90vw' }}
        >
          <InfoIcon className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate">{exitHintText}</span>
        </div>
      )}
    </>
  );
};
