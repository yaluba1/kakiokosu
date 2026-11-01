/**
 * AudioWorkletProcessor for Kakiokoshi
 *
 * Responsibilities:
 * 1. Receives Float32Array PCM frames from user microphone.
 * 2. Downsamples cleanly to 16,000 Hz if the browser hardware runs at 44.1kHz or 48kHz.
 * 3. Converts normalized [-1.0, 1.0] samples to 16-bit signed integer PCM (Int16Array, Little Endian).
 * 4. Buffers and posts chunks (e.g. 100ms = 1600 samples = 3200 bytes) to the main thread for WebSocket transmission.
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.buffer = [];
    // Emit chunks roughly every 100ms (1600 samples at 16kHz)
    this.chunkSize = 1600;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Downsample if needed
    const currentSampleRate = sampleRate; // Global AudioWorklet sampleRate
    let resampled;

    if (currentSampleRate === this.targetSampleRate) {
      resampled = channelData;
    } else {
      // Linear interpolation downsampler
      const ratio = currentSampleRate / this.targetSampleRate;
      const newLength = Math.round(channelData.length / ratio);
      resampled = new Float32Array(newLength);

      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i * ratio;
        const low = Math.floor(sourceIndex);
        const high = Math.min(low + 1, channelData.length - 1);
        const fraction = sourceIndex - low;
        resampled[i] = channelData[low] * (1 - fraction) + channelData[high] * fraction;
      }
    }

    // Convert Float32 to 16-bit signed PCM
    for (let i = 0; i < resampled.length; i++) {
      let s = Math.max(-1, Math.min(1, resampled[i]));
      // Scale to 16-bit signed range [-32768, 32767]
      this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);

      if (this.buffer.length >= this.chunkSize) {
        const int16Chunk = new Int16Array(this.buffer);
        // Post buffer transfer to main thread
        this.port.postMessage(int16Chunk.buffer, [int16Chunk.buffer]);
        this.buffer = [];
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);

