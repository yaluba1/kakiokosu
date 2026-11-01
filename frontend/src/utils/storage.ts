export const FINGERPRINT_STORAGE_KEY = 'kakiokoshi_owner_fp';
export const LEGACY_FINGERPRINT_STORAGE_KEY = 'kakiokosu_owner_fp';
export const LAST_CONVERSATION_STORAGE_KEY = 'kakiokoshi_last_conversation';
export const LEGACY_LAST_CONVERSATION_STORAGE_KEY = 'kakiokosu_last_conversation';

export interface StoredVoiceprint {
  version: 1;
  method: 'onnx' | 'pitch';
  /** 192-dimensional normalized speaker embedding vector (Solution 1) */
  embedding: number[] | null;
  /** Median fundamental frequency F0 in Hz (Solution 2) */
  ownerPitchHz: number;
  /** Interquartile spread of F0 in Hz */
  pitchSpreadHz: number;
  createdAt: number;
}

/**
 * Returns the localStorage key for the last conversation, scoped by userId if authenticated.
 */
export function getLastConversationStorageKey(userId?: string): string {
  return userId ? `${LAST_CONVERSATION_STORAGE_KEY}_${userId}` : LAST_CONVERSATION_STORAGE_KEY;
}

/**
 * Clears cached last conversation from localStorage to prevent cross-account leakage.
 */
export function clearLastConversation(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(`${LAST_CONVERSATION_STORAGE_KEY}_${userId}`);
    }
    localStorage.removeItem(LAST_CONVERSATION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_LAST_CONVERSATION_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove last conversation from localStorage:', err);
  }
}

/**
 * Loads and validates a stored owner voiceprint from localStorage.
 * Enforces schema validation: 192-dimensional finite float embedding and finite pitch bounds.
 */
export function loadStoredVoiceprint(userId?: string): StoredVoiceprint | null {
  try {
    const userKey = userId ? `${FINGERPRINT_STORAGE_KEY}_${userId}` : null;
    const raw =
      (userKey ? localStorage.getItem(userKey) : null) ||
      localStorage.getItem(FINGERPRINT_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_FINGERPRINT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Support legacy raw array format only if strictly valid (192 finite numbers)
    if (Array.isArray(parsed)) {
      if (
        parsed.length === 192 &&
        parsed.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))
      ) {
        return {
          version: 1,
          method: 'onnx',
          embedding: parsed,
          ownerPitchHz: 150,
          pitchSpreadHz: 25,
          createdAt: Date.now(),
        };
      }
      return null;
    }

    // Validate structured StoredVoiceprint
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.ownerPitchHz === 'number' &&
      Number.isFinite(parsed.ownerPitchHz) &&
      parsed.ownerPitchHz >= 0 &&
      typeof parsed.pitchSpreadHz === 'number' &&
      Number.isFinite(parsed.pitchSpreadHz) &&
      (parsed.embedding === null ||
        (Array.isArray(parsed.embedding) &&
          parsed.embedding.length === 192 &&
          parsed.embedding.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))))
    ) {
      return parsed as StoredVoiceprint;
    }

    return null;
  } catch (err) {
    console.warn('Failed to load owner voiceprint from localStorage:', err);
    return null;
  }
}

/**
 * Saves owner voiceprint, optionally scoped to the authenticated userId.
 */
export function saveStoredVoiceprint(data: StoredVoiceprint, userId?: string): void {
  try {
    const key = userId ? `${FINGERPRINT_STORAGE_KEY}_${userId}` : FINGERPRINT_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save owner voiceprint to localStorage:', err);
  }
}

/**
 * Removes owner voiceprint from localStorage.
 */
export function removeStoredVoiceprint(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(`${FINGERPRINT_STORAGE_KEY}_${userId}`);
    }
    localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
    localStorage.removeItem(LEGACY_FINGERPRINT_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove owner voiceprint from localStorage:', err);
  }
}
