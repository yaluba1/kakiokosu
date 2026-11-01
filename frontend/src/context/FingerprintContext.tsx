import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import * as ort from 'onnxruntime-web/wasm';
import {
  canRunWasmSimd,
  loadVoiceprintModel,
  computeEmbedding,
  extractAcousticFeatures192,
  cosineSim,
  computeF0,
  computePitchStats,
} from '../utils/ownerMatcher';
import {
  StoredVoiceprint,
  loadStoredVoiceprint,
  saveStoredVoiceprint,
  removeStoredVoiceprint,
} from '../utils/storage';
import { useAuthSession } from '../hooks/useAuthSession';

export interface CandidateVoiceprint {
  method: 'onnx' | 'pitch';
  embedding: Float32Array | null;
  ownerPitchHz: number;
  pitchSpreadHz: number;
  voicedFrameCount: number;
}

export interface FingerprintContextType {
  hasFingerprint: boolean;
  fingerprint: Float32Array | null;
  ownerPitch: number;
  ownerSpeakerId: number | null;
  useModel: boolean;
  fallbackToPitch: boolean;
  activeMethod: 'onnx' | 'pitch';
  isButtonUnlocked: boolean;
  unlockButton: () => void;
  lockButton: () => void;
  setOwnerSpeakerId: (speakerId: number | null) => void;
  analyzeEnrollmentAudio: (pcm: Int16Array) => Promise<CandidateVoiceprint>;
  saveCandidateVoiceprint: (candidate: CandidateVoiceprint) => void;
  setFingerprint: (vec: Float32Array, pitchHz?: number) => void;
  clearFingerprint: () => void;
  matchSpeaker: (pcm: Int16Array, speakerId: number) => Promise<boolean>;
}

const defaultContext: FingerprintContextType = {
  hasFingerprint: false,
  fingerprint: null,
  ownerPitch: 0,
  ownerSpeakerId: null,
  useModel: false,
  fallbackToPitch: false,
  activeMethod: 'onnx',
  isButtonUnlocked: false,
  unlockButton: () => {},
  lockButton: () => {},
  setOwnerSpeakerId: () => {},
  analyzeEnrollmentAudio: async () => ({
    method: 'pitch',
    embedding: null,
    ownerPitchHz: 0,
    pitchSpreadHz: 0,
    voicedFrameCount: 0,
  }),
  saveCandidateVoiceprint: () => {},
  setFingerprint: () => {},
  clearFingerprint: () => {},
  matchSpeaker: async () => false,
};

export const FingerprintContext = createContext<FingerprintContextType>(defaultContext);

export const useFingerprint = () => useContext(FingerprintContext);

export const FingerprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const [useModel, setUseModel] = useState<boolean>(false);
  const [fallbackToPitch, setFallbackToPitch] = useState<boolean>(false);

  const { user } = useAuthSession();
  const userId = user?.id;

  const [fingerprint, setFingerprintState] = useState<Float32Array | null>(null);
  const [ownerPitch, setOwnerPitch] = useState<number>(0);
  const [hasFingerprint, setHasFingerprint] = useState<boolean>(false);
  const [ownerSpeakerId, setOwnerSpeakerId] = useState<number | null>(null);

  // Disabled/locked by default; unlocked when the user holds the fingerprint button for > 2s,
  // and disabled again under the same lifecycle events that close a session.
  const [isButtonUnlocked, setIsButtonUnlocked] = useState<boolean>(false);

  // 1. Device Capability Detection: Solution 1 (ONNX) with automatic fallback to Solution 2 (Pitch F0)
  useEffect(() => {
    let cancelled = false;
    const initCapability = async () => {
      const simdSupported = canRunWasmSimd();
      if (!simdSupported) {
        if (!cancelled) {
          setUseModel(false);
          setFallbackToPitch(true);
        }
        return;
      }

      try {
        const session = await loadVoiceprintModel('/models/ecapa_tdnn_int8.onnx');
        if (!cancelled) {
          setModel(session);
          setUseModel(true);
          setFallbackToPitch(false);
        }
      } catch (err) {
        console.warn('ONNX voiceprint model unavailable on this handset; falling back to Pitch F0 fingerprinting:', err);
        if (!cancelled) {
          setModel(null);
          setUseModel(false);
          setFallbackToPitch(true);
        }
      }
    };

    initCapability();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load persisted fingerprint on startup or user change
  useEffect(() => {
    const stored = loadStoredVoiceprint(userId);
    if (stored) {
      if (stored.embedding && stored.embedding.length > 0) {
        setFingerprintState(Float32Array.from(stored.embedding));
      } else {
        setFingerprintState(null);
      }
      setOwnerPitch(stored.ownerPitchHz || 0);
      setHasFingerprint(
        Boolean((stored.embedding && stored.embedding.length > 0) || stored.ownerPitchHz > 0)
      );
    } else {
      setFingerprintState(null);
      setOwnerPitch(0);
      setHasFingerprint(false);
      setOwnerSpeakerId(null);
    }
  }, [userId]);

  const unlockButton = useCallback(() => {
    setIsButtonUnlocked(true);
  }, []);

  const lockButton = useCallback(() => {
    setIsButtonUnlocked(false);
  }, []);

  // Automatically disable/lock the fingerprint button in the same lifecycle cases that close a session
  useEffect(() => {
    if (!isButtonUnlocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsButtonUnlocked(false);
      }
    };
    const handleBlur = () => setIsButtonUnlocked(false);
    const handlePageHide = () => setIsButtonUnlocked(false);
    const handleBeforeUnload = () => setIsButtonUnlocked(false);
    const handleFreeze = () => setIsButtonUnlocked(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('freeze', handleFreeze);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [isButtonUnlocked]);

  // 3. Analyze 5-second enrollment audio using Solution 1 (if supported) + Solution 2 Pitch F0
  const analyzeEnrollmentAudio = useCallback(
    async (pcm: Int16Array): Promise<CandidateVoiceprint> => {
      const pitchStats = computePitchStats(pcm);

      if (useModel && model && !fallbackToPitch) {
        try {
          const emb = await computeEmbedding(pcm, model);
          return {
            method: 'onnx',
            embedding: emb,
            ownerPitchHz: pitchStats.medianF0,
            pitchSpreadHz: pitchStats.spreadHz,
            voicedFrameCount: pitchStats.voicedFrameCount,
          };
        } catch (err) {
          console.warn('ONNX embedding failed during enrollment; using Pitch F0 fallback:', err);
          setFallbackToPitch(true);
          setUseModel(false);
        }
      }

      return {
        method: 'pitch',
        embedding: null,
        ownerPitchHz: pitchStats.medianF0,
        pitchSpreadHz: pitchStats.spreadHz,
        voicedFrameCount: pitchStats.voicedFrameCount,
      };
    },
    [useModel, model, fallbackToPitch]
  );

  const saveCandidateVoiceprint = useCallback((candidate: CandidateVoiceprint) => {
    const payload: StoredVoiceprint = {
      version: 1,
      method: candidate.method,
      embedding: candidate.embedding ? Array.from(candidate.embedding) : null,
      ownerPitchHz: candidate.ownerPitchHz,
      pitchSpreadHz: candidate.pitchSpreadHz,
      createdAt: Date.now(),
    };
    saveStoredVoiceprint(payload, userId);
    setFingerprintState(candidate.embedding);
    setOwnerPitch(candidate.ownerPitchHz);
    setHasFingerprint(true);
    setOwnerSpeakerId(null);
  }, [userId]);

  const setFingerprint = useCallback(
    (vec: Float32Array, pitchHz = 0) => {
      const effectivePitch = pitchHz || ownerPitch || 140;
      const payload: StoredVoiceprint = {
        version: 1,
        method: useModel && !fallbackToPitch ? 'onnx' : 'pitch',
        embedding: Array.from(vec),
        ownerPitchHz: effectivePitch,
        pitchSpreadHz: 25,
        createdAt: Date.now(),
      };
      saveStoredVoiceprint(payload, userId);
      setFingerprintState(vec);
      setOwnerPitch(effectivePitch);
      setHasFingerprint(true);
      setOwnerSpeakerId(null);
    },
    [ownerPitch, useModel, fallbackToPitch, userId]
  );

  const clearFingerprint = useCallback(() => {
    removeStoredVoiceprint(userId);
    setFingerprintState(null);
    setOwnerPitch(0);
    setHasFingerprint(false);
    setOwnerSpeakerId(null);
  }, [userId]);

  // 4. Runtime Speaker Matching: Solution 1 (ONNX) when available, Solution 2 (Pitch F0) fallback
  const matchSpeaker = useCallback(
    async (pcm: Int16Array, _speakerId: number): Promise<boolean> => {
      if (!hasFingerprint) return false;

      // Require at least 0.75s of accumulated audio and >= 10 voiced frames (~160ms of clean voiced speech)
      if (pcm.length < 16000 * 0.75) {
        return false;
      }

      const pitchStats = computePitchStats(pcm);
      if (pitchStats.voicedFrameCount < 10) {
        return false;
      }

      // Reject extreme multi-speaker blended diarization clusters while allowing expressive speech intonation
      if (pitchStats.spreadHz > 85) {
        return false;
      }

      const f0 = pitchStats.medianF0 || computeF0(pcm);

      // Enforce fundamental frequency (F0) register compatibility in ALL modes whenever ownerPitch is known.
      // Allows natural conversational pitch variation (±30% / ~4.8 semitones) while blocking different vocal registers.
      if (ownerPitch > 0) {
        if (f0 <= 0) return false;
        const maxHzDiff = Math.max(38, ownerPitch * 0.30);
        const semitoneDiff = 12 * Math.abs(Math.log2(f0 / ownerPitch));
        if (Math.abs(f0 - ownerPitch) > maxHzDiff || semitoneDiff > 4.8) {
          return false;
        }
      }

      // ---------- SOLUTION 2: Acoustic Pitch (F0) + Spectral Fallback ----------
      if (fallbackToPitch || !useModel || !model || !fingerprint) {
        if (ownerPitch <= 0 || f0 <= 0) return false;
        if (pitchStats.voicedFrameCount < 12 || pitchStats.spreadHz > 75) return false;
        const strictHzDiff = Math.max(30, ownerPitch * 0.25);
        const semitoneDiff = 12 * Math.abs(Math.log2(f0 / ownerPitch));
        if (Math.abs(f0 - ownerPitch) > strictHzDiff || semitoneDiff > 4.0) {
          return false;
        }
        if (fingerprint) {
          const acousticVec = extractAcousticFeatures192(pcm);
          if (cosineSim(acousticVec, fingerprint) < 0.55) {
            return false;
          }
        }
        return true;
      }

      // ---------- SOLUTION 1: Client-Side ONNX Voice Embedding ----------
      try {
        const emb = await computeEmbedding(pcm, model);
        const sim = cosineSim(emb, fingerprint);
        return sim > 0.58;
      } catch (err) {
        console.warn('ONNX runtime match failed, falling back to strict Pitch+Spectral check:', err);
        if (ownerPitch <= 0 || f0 <= 0) return false;
        const strictHzDiff = Math.max(30, ownerPitch * 0.25);
        const semitoneDiff = 12 * Math.abs(Math.log2(f0 / ownerPitch));
        return Math.abs(f0 - ownerPitch) <= strictHzDiff && semitoneDiff <= 4.0;
      }
    },
    [hasFingerprint, fallbackToPitch, useModel, model, fingerprint, ownerPitch]
  );

  const activeMethod: 'onnx' | 'pitch' = useModel && !fallbackToPitch ? 'onnx' : 'pitch';

  return (
    <FingerprintContext.Provider
      value={{
        hasFingerprint,
        fingerprint,
        ownerPitch,
        ownerSpeakerId,
        useModel,
        fallbackToPitch,
        activeMethod,
        isButtonUnlocked,
        unlockButton,
        lockButton,
        setOwnerSpeakerId,
        analyzeEnrollmentAudio,
        saveCandidateVoiceprint,
        setFingerprint,
        clearFingerprint,
        matchSpeaker,
      }}
    >
      {children}
    </FingerprintContext.Provider>
  );
};
