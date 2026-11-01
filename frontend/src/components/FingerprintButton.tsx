import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { useFingerprint } from '../context/FingerprintContext';
import { FingerprintModal } from './FingerprintModal';

const HOLD_DURATION_MS = 2050; // > 2 seconds required to unlock and configure

interface FingerprintButtonProps {
  disabled?: boolean;
}

export const FingerprintButton: React.FC<FingerprintButtonProps> = ({ disabled = false }) => {
  const { t } = useTranslation();
  const { hasFingerprint, isButtonUnlocked, unlockButton, lockButton } = useFingerprint();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showShortTapHint, setShowShortTapHint] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);
  const triggeredInHoldRef = useRef<boolean>(false);

  // Lock button again whenever recording starts (same lifecycle as closing/starting session)
  useEffect(() => {
    if (disabled && isButtonUnlocked) {
      lockButton();
    }
  }, [disabled, isButtonUnlocked, lockButton]);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [clearTimers]);

  const startHold = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // Only respond to primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    triggeredInHoldRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    holdStartRef.current = Date.now();

    clearTimers();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(1, elapsed / HOLD_DURATION_MS));
    }, 40);

    holdTimerRef.current = setTimeout(() => {
      clearTimers();
      triggeredInHoldRef.current = true;
      setIsHolding(false);
      setHoldProgress(0);
      setShowShortTapHint(false);
      unlockButton();
      setIsModalOpen(true);
    }, HOLD_DURATION_MS);
  };

  const endHold = () => {
    if (!isHolding) return;
    const elapsed = Date.now() - holdStartRef.current;
    clearTimers();
    setIsHolding(false);
    setHoldProgress(0);

    if (!triggeredInHoldRef.current && elapsed < HOLD_DURATION_MS) {
      if (isButtonUnlocked) {
        // Button was already unlocked during this idle period -> open modal
        setIsModalOpen(true);
      } else {
        // Show brief hint that 2-second press is required
        setShowShortTapHint(true);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => {
          setShowShortTapHint(false);
        }, 2200);
      }
    }
  };

  const cancelHold = () => {
    if (!isHolding) return;
    clearTimers();
    setIsHolding(false);
    setHoldProgress(0);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        title={
          hasFingerprint ? t('fingerprint.activeTooltip') : t('fingerprint.inactiveTooltip')
        }
        aria-label={
          hasFingerprint ? t('fingerprint.activeTooltip') : t('fingerprint.inactiveTooltip')
        }
        className={`relative overflow-hidden p-2.5 sm:p-3 rounded-2xl border flex items-center gap-1.5 font-bold text-sm transition select-none ${
          disabled
            ? 'opacity-30 cursor-not-allowed pointer-events-none bg-slate-800 border-slate-600'
            : hasFingerprint
            ? isButtonUnlocked
              ? 'bg-sky-950/90 border-sky-400 text-sky-200 hover:bg-sky-900/90 shadow-md shadow-sky-500/20 cursor-pointer'
              : 'bg-slate-800 border-sky-500/70 text-sky-300 hover:bg-slate-700 cursor-pointer'
            : isButtonUnlocked
            ? 'bg-slate-800 border-slate-400 text-slate-300 hover:bg-slate-700 cursor-pointer'
            : 'bg-slate-800/80 border-slate-600 text-slate-400 hover:bg-slate-700 cursor-pointer'
        }`}
      >
        {/* Fingerprint icon: vibrant color when fingerprint is available, greyscale when unavailable */}
        <Fingerprint
          className={`w-5 h-5 transition-all ${
            hasFingerprint
              ? 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.65)] filter-none'
              : 'text-slate-500 grayscale opacity-65'
          }`}
        />
        <span
          className={`hidden lg:inline ${
            hasFingerprint ? 'text-sky-300' : 'text-slate-400 grayscale'
          }`}
        >
          {t('fingerprint.buttonLabel')}
        </span>

        {/* Hold > 2s visual progress bar */}
        {isHolding && (
          <span
            className="absolute bottom-0 left-0 h-1 bg-sky-400 transition-all duration-75"
            style={{ width: `${Math.round(holdProgress * 100)}%` }}
          />
        )}
      </button>

      {/* Brief tooltip when user taps for < 2s while button is locked */}
      {showShortTapHint && (
        <div className="absolute top-full mt-2 right-0 z-40 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-800 border border-sky-400/70 text-sky-200 text-xs font-bold shadow-xl pointer-events-none">
          {t('fingerprint.holdHint')}
        </div>
      )}

      <FingerprintModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

