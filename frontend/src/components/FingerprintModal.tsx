import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Mic, Check, Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useFingerprint, CandidateVoiceprint } from '../context/FingerprintContext';
import { recordOwnerAudio } from '../utils/recordOwnerAudio';

interface FingerprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep =
  | 'manage'
  | 'confirm_change'
  | 'confirm_remove'
  | 'record'
  | 'recording'
  | 'analyzing'
  | 'confirm_save';

export const FingerprintModal: React.FC<FingerprintModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    hasFingerprint,
    ownerPitch,
    activeMethod,
    analyzeEnrollmentAudio,
    saveCandidateVoiceprint,
    clearFingerprint,
  } = useFingerprint();

  const [step, setStep] = useState<ModalStep>('record');
  const [progress, setProgress] = useState<number>(0);
  const [rmsLevel, setRmsLevel] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateVoiceprint | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize modal step based on whether a fingerprint already exists
  useEffect(() => {
    if (isOpen) {
      setStep(hasFingerprint ? 'manage' : 'record');
      setProgress(0);
      setRmsLevel(0);
      setErrorMsg(null);
      setCandidate(null);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen, hasFingerprint]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setProgress(0);
    setRmsLevel(0);
    setStep('recording');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const pcm = await recordOwnerAudio({
        durationMs: 5000,
        signal: controller.signal,
        onProgress: (ratio, rms) => {
          setProgress(ratio);
          setRmsLevel(rms);
        },
      });

      setStep('analyzing');
      const result = await analyzeEnrollmentAudio(pcm);

      // Verify enough clear voiced speech was captured (at least 10 voiced frames)
      if (result.voicedFrameCount < 10 || result.ownerPitchHz <= 0) {
        setErrorMsg(t('fingerprint.tooQuietError'));
        setStep('record');
        return;
      }

      setCandidate(result);
      setStep('confirm_save');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Voiceprint enrollment recording failed:', err);
      setErrorMsg(t('fingerprint.micError'));
      setStep('record');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleConfirmSave = () => {
    if (candidate) {
      saveCandidateVoiceprint(candidate);
      onClose();
    }
  };

  const handleConfirmRemove = () => {
    clearFingerprint();
    onClose();
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  };

  const methodBadgeText =
    activeMethod === 'onnx' ? t('fingerprint.methodOnnx') : t('fingerprint.methodPitch');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border ${
                hasFingerprint
                  ? 'bg-sky-950/90 border-sky-400 text-sky-400'
                  : 'bg-slate-800 border-slate-600 text-slate-400'
              }`}
            >
              <Fingerprint
                className={`w-8 h-8 ${hasFingerprint ? 'text-sky-400' : 'text-slate-400 grayscale'}`}
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {t('fingerprint.modalTitle')}
              </h2>
              <p className="text-slate-400 text-sm">{t('fingerprint.modalSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label={t('fingerprint.close')}
            className="p-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Status & Active Method Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 font-bold">
            <span
              className={`w-3 h-3 rounded-full ${
                hasFingerprint ? 'bg-sky-400 ring-4 ring-sky-400/20' : 'bg-slate-500'
              }`}
            />
            <span className={hasFingerprint ? 'text-sky-300' : 'text-slate-400'}>
              {hasFingerprint ? t('fingerprint.statusActive') : t('fingerprint.statusInactive')}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-600 text-xs font-semibold text-slate-300">
            {methodBadgeText}
            {hasFingerprint && ownerPitch > 0 ? ` • ${Math.round(ownerPitch)} Hz` : ''}
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/70 text-rose-200 flex items-center gap-3 font-semibold">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP: MANAGE EXISTING FINGERPRINT */}
        {step === 'manage' && (
          <div className="py-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep('confirm_change')}
              className="w-full py-4 px-5 bg-sky-600 hover:bg-sky-500 text-slate-950 font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer"
            >
              <RefreshCw className="w-6 h-6" />
              <span>{t('fingerprint.changeButton')}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('confirm_remove')}
              className="w-full py-4 px-5 bg-rose-950/80 hover:bg-rose-900/80 border-2 border-rose-500/60 text-rose-200 font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              <Trash2 className="w-6 h-6 text-rose-400" />
              <span>{t('fingerprint.removeButton')}</span>
            </button>
          </div>
        )}

        {/* STEP: CONFIRM CHANGE */}
        {step === 'confirm_change' && (
          <div className="py-6 space-y-5">
            <div className="p-5 rounded-2xl bg-amber-950/60 border-2 border-amber-500/70 text-amber-100 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-xl text-amber-300">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <span>{t('fingerprint.confirmChangeTitle')}</span>
              </div>
              <p className="text-base text-amber-200">{t('fingerprint.confirmChangeDesc')}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('manage')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg rounded-2xl transition"
              >
                {t('fingerprint.cancel')}
              </button>
              <button
                type="button"
                onClick={() => setStep('record')}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-lg rounded-2xl transition"
              >
                {t('fingerprint.confirmChangeYes')}
              </button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM REMOVE */}
        {step === 'confirm_remove' && (
          <div className="py-6 space-y-5">
            <div className="p-5 rounded-2xl bg-rose-950/70 border-2 border-rose-500/70 text-rose-100 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-xl text-rose-300">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <span>{t('fingerprint.confirmRemoveTitle')}</span>
              </div>
              <p className="text-base text-rose-200">{t('fingerprint.confirmRemoveDesc')}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('manage')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg rounded-2xl transition"
              >
                {t('fingerprint.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-lg rounded-2xl transition"
              >
                {t('fingerprint.confirmRemoveYes')}
              </button>
            </div>
          </div>
        )}

        {/* STEP: RECORD PROMPT */}
        {step === 'record' && (
          <div className="py-5 space-y-4">
            <p className="text-slate-200 text-base sm:text-lg font-medium leading-relaxed">
              {t('fingerprint.instructions')}
            </p>

            <div className="p-4 rounded-2xl bg-sky-950/50 border-2 border-sky-500/50 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                {t('fingerprint.samplePromptLabel')}
              </span>
              <p dir="auto" className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                “{t('fingerprint.sampleSentence')}”
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartRecording}
              className="w-full py-4 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xl rounded-2xl flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer"
            >
              <Mic className="w-6 h-6" />
              <span>{t('fingerprint.startRecording')}</span>
            </button>
          </div>
        )}

        {/* STEP: RECORDING IN PROGRESS */}
        {step === 'recording' && (
          <div className="py-6 space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-sky-950/50 border-2 border-sky-400/60">
              <p dir="auto" className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                “{t('fingerprint.sampleSentence')}”
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-emerald-300">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  {t('fingerprint.recordingInProgress')}
                </span>
                <span>{Math.min(5, Math.ceil(progress * 5))} / 5s</span>
              </div>

              {/* 5s Time Progress Bar */}
              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>

              {/* Live Mic Volume Meter */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round(rmsLevel * 100))}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition"
            >
              {t('fingerprint.cancel')}
            </button>
          </div>
        )}

        {/* STEP: ANALYZING */}
        {step === 'analyzing' && (
          <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw className="w-12 h-12 text-sky-400 animate-spin" />
            <p className="text-lg font-bold text-slate-200">{t('fingerprint.analyzing')}</p>
          </div>
        )}

        {/* STEP: CONFIRM SAVE */}
        {step === 'confirm_save' && candidate && (
          <div className="py-6 space-y-5">
            <div className="p-5 rounded-2xl bg-sky-950/70 border-2 border-sky-400 text-sky-100 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-xl text-sky-300">
                <Check className="w-7 h-7 stroke-[3] text-emerald-400 shrink-0" />
                <span>{t('fingerprint.confirmSaveTitle')}</span>
              </div>
              <p className="text-base text-slate-200">{t('fingerprint.confirmSaveDesc')}</p>
              <div className="pt-2 text-xs font-semibold text-sky-300">
                {candidate.method === 'onnx'
                  ? t('fingerprint.methodOnnx')
                  : t('fingerprint.methodPitch')}{' '}
                • {Math.round(candidate.ownerPitchHz)} Hz
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('record')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg rounded-2xl transition"
              >
                {t('fingerprint.confirmSaveNo')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg rounded-2xl transition"
              >
                {t('fingerprint.confirmSaveYes')}
              </button>
            </div>
          </div>
        )}

        {/* Footer Close Button (for manage/record steps) */}
        {(step === 'manage' || step === 'record') && (
          <div className="pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-2xl transition"
            >
              {t('fingerprint.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

