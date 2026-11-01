import { useRef, useCallback } from 'react';

const SAMPLE_RATE = 16000;
// Keep the last 20 seconds of audio in the rolling buffer (320,000 Int16 samples = 640 KB)
const MAX_BUFFER_SECONDS = 20;
const MAX_BUFFER_SAMPLES = SAMPLE_RATE * MAX_BUFFER_SECONDS;

// Accumulate up to 4 seconds of speech per speaker ID during a session for reliable voiceprint matching
const MAX_SPEAKER_ACCUM_SAMPLES = SAMPLE_RATE * 4;

interface AudioChunkEntry {
  startSample: number;
  endSample: number;
  samples: Int16Array;
}

export interface UseAudioBufferReturn {
  /** Reset stream sample counter and buffers at the start/end of a session */
  resetBuffer: () => void;
  /** Append a 16kHz Int16 PCM chunk at the exact moment it is sent to Deepgram */
  appendChunk: (buffer: ArrayBuffer) => void;
  /** Retrieve the contiguous Int16 PCM slice corresponding to Deepgram's [startSec, endSec] */
  getSlice: (startSec: number, endSec: number) => Int16Array;
  /** Append a speaker's slice and return the accumulated PCM for that speaker in this session */
  accumulateSpeakerAudio: (speakerId: number, slice: Int16Array) => Int16Array;
}

/**
 * Maintains a rolling 20-second buffer of 16kHz Int16 PCM microphone audio
 * indexed by the exact sample count sent to the Deepgram WebSocket.
 */
export function useAudioBuffer(): UseAudioBufferReturn {
  const chunksRef = useRef<AudioChunkEntry[]>([]);
  const totalSamplesSentRef = useRef<number>(0);
  const speakerAudioMapRef = useRef<Map<number, Int16Array>>(new Map());

  const resetBuffer = useCallback(() => {
    chunksRef.current = [];
    totalSamplesSentRef.current = 0;
    speakerAudioMapRef.current.clear();
  }, []);

  const appendChunk = useCallback((buffer: ArrayBuffer) => {
    const samples = new Int16Array(buffer.slice(0));
    if (samples.length === 0) return;

    const startSample = totalSamplesSentRef.current;
    const endSample = startSample + samples.length;
    totalSamplesSentRef.current = endSample;

    chunksRef.current.push({
      startSample,
      endSample,
      samples,
    });

    // Prune old chunks outside the 20-second rolling window
    const minKeepSample = endSample - MAX_BUFFER_SAMPLES;
    while (chunksRef.current.length > 0 && chunksRef.current[0].endSample <= minKeepSample) {
      chunksRef.current.shift();
    }
  }, []);

  const getSlice = useCallback((startSec: number, endSec: number): Int16Array => {
    const reqStart = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
    const reqEnd = Math.max(reqStart, Math.ceil(endSec * SAMPLE_RATE));
    if (reqEnd <= reqStart) {
      return new Int16Array(0);
    }

    const overlapping = chunksRef.current.filter(
      (c) => c.endSample > reqStart && c.startSample < reqEnd
    );

    if (overlapping.length === 0) {
      // Fallback: return the most recent 2 seconds if timestamps were not provided
      const fallbackSamples = Math.min(SAMPLE_RATE * 2, totalSamplesSentRef.current);
      const fbStart = totalSamplesSentRef.current - fallbackSamples;
      const recent = chunksRef.current.filter((c) => c.endSample > fbStart);
      const totalLen = recent.reduce((acc, c) => acc + c.samples.length, 0);
      const out = new Int16Array(totalLen);
      let offset = 0;
      for (const c of recent) {
        out.set(c.samples, offset);
        offset += c.samples.length;
      }
      return out;
    }

    const actualStart = Math.max(reqStart, overlapping[0].startSample);
    const actualEnd = Math.min(reqEnd, overlapping[overlapping.length - 1].endSample);
    if (actualEnd <= actualStart) {
      return new Int16Array(0);
    }

    const result = new Int16Array(actualEnd - actualStart);
    for (const chunk of overlapping) {
      const copyStart = Math.max(actualStart, chunk.startSample);
      const copyEnd = Math.min(actualEnd, chunk.endSample);
      if (copyEnd > copyStart) {
        const srcOffset = copyStart - chunk.startSample;
        const dstOffset = copyStart - actualStart;
        const len = copyEnd - copyStart;
        result.set(chunk.samples.subarray(srcOffset, srcOffset + len), dstOffset);
      }
    }

    return result;
  }, []);

  const accumulateSpeakerAudio = useCallback(
    (speakerId: number, slice: Int16Array): Int16Array => {
      if (slice.length === 0) {
        return speakerAudioMapRef.current.get(speakerId) || new Int16Array(0);
      }
      const existing = speakerAudioMapRef.current.get(speakerId);
      if (!existing || existing.length === 0) {
        const capped =
          slice.length > MAX_SPEAKER_ACCUM_SAMPLES
            ? slice.subarray(slice.length - MAX_SPEAKER_ACCUM_SAMPLES)
            : slice;
        const copy = new Int16Array(capped);
        speakerAudioMapRef.current.set(speakerId, copy);
        return copy;
      }

      const combinedLen = Math.min(MAX_SPEAKER_ACCUM_SAMPLES, existing.length + slice.length);
      const combined = new Int16Array(combinedLen);
      const keepExistingLen = combinedLen - Math.min(slice.length, combinedLen);
      if (keepExistingLen > 0) {
        combined.set(existing.subarray(existing.length - keepExistingLen), 0);
      }
      const sliceToCopy =
        slice.length > combinedLen ? slice.subarray(slice.length - combinedLen) : slice;
      combined.set(sliceToCopy, keepExistingLen);
      speakerAudioMapRef.current.set(speakerId, combined);
      return combined;
    },
    []
  );

  return {
    resetBuffer,
    appendChunk,
    getSlice,
    accumulateSpeakerAudio,
  };
}

