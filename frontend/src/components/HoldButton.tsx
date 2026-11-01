import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface HoldButtonProps {
  onHoldComplete: () => void;
  holdDurationMs?: number;
  disabled?: boolean;
  hintText?: string;
  progressBarColor?: string;
  hintClassName?: string;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'data-logout-button'?: string;
  'data-stop-button'?: string;
  children: React.ReactNode;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onHoldComplete,
  holdDurationMs = 1000,
  disabled = false,
  hintText,
  progressBarColor = 'bg-sky-400',
  hintClassName = 'border-sky-400/70 text-sky-200',
  className = '',
  title,
  'aria-label': ariaLabel,
  'data-logout-button': dataLogoutButton,
  'data-stop-button': dataStopButton,
  children,
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);
  const triggeredInHoldRef = useRef<boolean>(false);

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
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    triggeredInHoldRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    holdStartRef.current = Date.now();

    clearTimers();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(1, elapsed / holdDurationMs));
    }, 30);

    holdTimerRef.current = setTimeout(() => {
      clearTimers();
      triggeredInHoldRef.current = true;
      setIsHolding(false);
      setHoldProgress(0);
      setShowHint(false);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {
          // Ignore vibrate errors if unsupported
        }
      }
      onHoldComplete();
    }, holdDurationMs);
  };

  const endHold = () => {
    if (!isHolding) return;
    const elapsed = Date.now() - holdStartRef.current;
    clearTimers();
    setIsHolding(false);
    setHoldProgress(0);

    if (!triggeredInHoldRef.current && elapsed < holdDurationMs) {
      if (hintText) {
        setShowHint(true);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => {
          setShowHint(false);
        }, 2000);
      }
    }
  };

  const cancelHold = () => {
    if (!isHolding) return;
    clearTimers();
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.repeat || isHolding) return;
      triggeredInHoldRef.current = false;
      setIsHolding(true);
      setHoldProgress(0);
      holdStartRef.current = Date.now();
      clearTimers();

      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - holdStartRef.current;
        setHoldProgress(Math.min(1, elapsed / holdDurationMs));
      }, 30);

      holdTimerRef.current = setTimeout(() => {
        clearTimers();
        triggeredInHoldRef.current = true;
        setIsHolding(false);
        setHoldProgress(0);
        setShowHint(false);
        onHoldComplete();
      }, holdDurationMs);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      endHold();
    }
  };

  return (
    <div
      className="relative inline-flex"
      data-logout-button={dataLogoutButton}
      data-stop-button={dataStopButton}
    >
      <button
        type="button"
        disabled={disabled}
        data-logout-button={dataLogoutButton}
        data-stop-button={dataStopButton}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        title={title}
        aria-label={ariaLabel || title}
        className={`relative overflow-hidden select-none ${className}`}
        style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
      >
        {children}

        {/* Visual progress bar along bottom of button */}
        {isHolding && (
          <span
            className={`absolute bottom-0 left-0 h-1 sm:h-1.5 ${progressBarColor} transition-all duration-75 pointer-events-none`}
            style={{ width: `${Math.round(holdProgress * 100)}%` }}
          />
        )}
      </button>

      {/* Brief tooltip hint when tapped too quickly */}
      {showHint && hintText && (
        <div
          className={`absolute top-full mt-2 right-0 z-40 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-800 border text-xs font-bold shadow-xl pointer-events-none ${hintClassName}`}
        >
          {hintText}
        </div>
      )}
    </div>
  );
};

