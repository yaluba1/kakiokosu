/**
 * Records raw 16kHz Int16 PCM audio from the microphone for voiceprint enrollment.
 * Re-uses the same /audio-processor.js worklet pipeline used during live transcription.
 */
export interface RecordOwnerAudioOptions {
  durationMs?: number;
  onProgress?: (progressRatio: number, rmsLevel: number) => void;
  signal?: AbortSignal;
}

export async function recordOwnerAudio({
  durationMs = 5000,
  onProgress,
  signal,
}: RecordOwnerAudioOptions = {}): Promise<Int16Array> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000,
    },
  });

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioContextClass({ sampleRate: 16000 });
  } catch {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  await audioCtx.audioWorklet.addModule('/audio-processor.js');

  const sourceNode = audioCtx.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');

  const collectedChunks: Int16Array[] = [];
  const startedAt = Date.now();

  return new Promise<Int16Array>((resolve, reject) => {
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      try {
        workletNode.disconnect();
      } catch {}
      try {
        sourceNode.disconnect();
      } catch {}
      stream.getTracks().forEach((t) => t.stop());
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      const totalLen = collectedChunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Int16Array(totalLen);
      let offset = 0;
      for (const chunk of collectedChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      if (onProgress) onProgress(1, 0);
      resolve(merged);
    }, durationMs);

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId);
          cleanup();
          reject(new DOMException('Recording aborted', 'AbortError'));
        },
        { once: true }
      );
    }

    workletNode.port.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const chunk = new Int16Array(event.data.slice(0));
        collectedChunks.push(chunk);

        if (onProgress) {
          // Compute RMS level for visual microphone meter
          let sumSq = 0;
          for (let i = 0; i < chunk.length; i++) {
            const norm = chunk[i] / 32768;
            sumSq += norm * norm;
          }
          const rms = Math.min(1, Math.sqrt(sumSq / Math.max(1, chunk.length)) * 4);
          const elapsed = Date.now() - startedAt;
          const progress = Math.min(1, elapsed / durationMs);
          onProgress(progress, rms);
        }
      }
    };

    sourceNode.connect(workletNode);
    workletNode.connect(audioCtx.destination);
  });
}

