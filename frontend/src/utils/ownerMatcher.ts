import * as ort from 'onnxruntime-web/wasm';

const SAMPLE_RATE = 16000;
const EMBEDDING_DIM = 192;

/**
 * Checks if the browser supports WebAssembly SIMD instructions.
 */
export function canRunWasmSimd(): boolean {
  try {
    if (typeof WebAssembly !== 'object' || typeof WebAssembly.validate !== 'function') {
      return false;
    }
    // Standard minimal WebAssembly SIMD validation module (v128.const 0)
    const simdProbe = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0, 253,
      15, 26, 11,
    ]);
    return WebAssembly.validate(simdProbe);
  } catch {
    return false;
  }
}

/**
 * Loads the ONNX voiceprint model using the WebAssembly execution provider.
 */
export async function loadVoiceprintModel(
  modelUrl = '/models/ecapa_tdnn_int8.onnx'
): Promise<ort.InferenceSession> {
  // Single-threaded WASM avoids requiring Cross-Origin-Opener-Policy headers that break Firebase Auth popups
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;

  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm'],
  });

  // Run a quick warmup pass to verify execution works on this handset
  const dummyInput = new Float32Array(EMBEDDING_DIM);
  const tensor = new ort.Tensor('float32', dummyInput, [1, EMBEDDING_DIM]);
  const inputName = session.inputNames[0] || 'input';
  await session.run({ [inputName]: tensor });

  return session;
}

/**
 * In-place Radix-2 Cooley-Tukey FFT for frame size N (power of 2, e.g. 512).
 */
function fftRadix2(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = real[i];
      const ti = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tr;
      imag[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let i = 0; i < n; i += size) {
      for (let k = 0; k < halfSize; k++) {
        const angle = k * angleStep;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const evenIdx = i + k;
        const oddIdx = i + k + halfSize;
        const tr = cosA * real[oddIdx] - sinA * imag[oddIdx];
        const ti = sinA * real[oddIdx] + cosA * imag[oddIdx];
        real[oddIdx] = real[evenIdx] - tr;
        imag[oddIdx] = imag[evenIdx] - ti;
        real[evenIdx] += tr;
        imag[evenIdx] += ti;
      }
    }
  }
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Solution 2: Computes median Fundamental Frequency (F0 in Hz) and IQR spread
 * from 16kHz Int16 PCM using normalized autocorrelation over voiced frames.
 */
export function computePitchStats(pcm: Int16Array): {
  medianF0: number;
  spreadHz: number;
  voicedFrameCount: number;
} {
  const frameSize = 512; // 32 ms at 16 kHz
  const hopSize = 256; // 16 ms hop
  // F0 range: 65 Hz (lag 246) to 400 Hz (lag 40)
  const minLag = Math.floor(SAMPLE_RATE / 400); // 40
  const maxLag = Math.ceil(SAMPLE_RATE / 65); // 246

  const f0Values: number[] = [];

  for (let start = 0; start + frameSize <= pcm.length; start += hopSize) {
    // Compute mean and RMS energy
    let sum = 0;
    for (let i = 0; i < frameSize; i++) {
      sum += pcm[start + i] / 32768;
    }
    const mean = sum / frameSize;

    const frame = new Float32Array(frameSize);
    let energy = 0;
    for (let i = 0; i < frameSize; i++) {
      const v = pcm[start + i] / 32768 - mean;
      frame[i] = v;
      energy += v * v;
    }
    const rms = Math.sqrt(energy / frameSize);
    // Skip silent / background noise frames
    if (rms < 0.008) continue;

    // Normalized autocorrelation search with McLeod/Praat first-peak selection
    // to prevent subharmonic (octave-down, e.g. 220 Hz female -> 110 Hz male) errors
    const minVoicedCorr = 0.50;
    const corrArr = new Float32Array(maxLag + 2);

    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let num = 0;
      let den1 = 0;
      let den2 = 0;
      const limit = frameSize - lag;
      for (let i = 0; i < limit; i++) {
        const a = frame[i];
        const b = frame[i + lag];
        num += a * b;
        den1 += a * a;
        den2 += b * b;
      }
      const denom = Math.sqrt(den1 * den2);
      corrArr[lag] = denom > 1e-8 ? num / denom : 0;
    }

    // Collect local peaks after the initial zero-lag descent valley
    let foundFirstValley = false;
    let maxPeakCorr = 0;
    const peaks: Array<{ lag: number; corr: number }> = [];

    for (let lag = minLag; lag <= maxLag; lag++) {
      const c = corrArr[lag];
      if (c < 0.25) {
        foundFirstValley = true;
      }
      if (
        foundFirstValley &&
        c >= minVoicedCorr &&
        c > corrArr[lag - 1] &&
        c >= corrArr[lag + 1]
      ) {
        peaks.push({ lag, corr: c });
        if (c > maxPeakCorr) {
          maxPeakCorr = c;
        }
      }
    }

    // Pick the first local peak (shortest lag = true fundamental F0) within 85% of the global max peak
    let bestLag = -1;
    if (peaks.length > 0 && maxPeakCorr >= minVoicedCorr) {
      const relativeThreshold = Math.max(minVoicedCorr, maxPeakCorr * 0.85);
      const firstStrongPeak = peaks.find((p) => p.corr >= relativeThreshold);
      if (firstStrongPeak) {
        bestLag = firstStrongPeak.lag;
      }
    }

    if (bestLag >= minLag && bestLag <= maxLag) {
      // Parabolic interpolation for sub-sample precision
      const prev = corrArr[bestLag - 1];
      const curr = corrArr[bestLag];
      const next = corrArr[bestLag + 1];
      const denom = 2 * (2 * curr - prev - next);
      const delta = Math.abs(denom) > 1e-6 ? (next - prev) / denom : 0;
      const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, delta));
      const f0 = SAMPLE_RATE / refinedLag;
      if (f0 >= 65 && f0 <= 400) {
        f0Values.push(f0);
      }
    }
  }

  if (f0Values.length === 0) {
    return { medianF0: 0, spreadHz: 0, voicedFrameCount: 0 };
  }

  f0Values.sort((a, b) => a - b);
  const mid = Math.floor(f0Values.length / 2);
  const medianF0 =
    f0Values.length % 2 === 0 ? (f0Values[mid - 1] + f0Values[mid]) / 2 : f0Values[mid];

  const q25 = f0Values[Math.floor(f0Values.length * 0.25)];
  const q75 = f0Values[Math.floor(f0Values.length * 0.75)];
  const spreadHz = Math.max(5, q75 - q25);

  return {
    medianF0,
    spreadHz,
    voicedFrameCount: f0Values.length,
  };
}

/**
 * Simple wrapper returning median F0 in Hz (Solution 2).
 */
export function computeF0(pcm: Int16Array): number {
  return computePitchStats(pcm).medianF0;
}

/**
 * Extracts a 192-dimensional acoustic feature representation (Mel-filterbank energies,
 * MFCC cepstrals, spectral formant statistics, and harmonicity features) from 16kHz PCM.
 */
export function extractAcousticFeatures192(pcm: Int16Array): Float32Array {
  const frameSize = 512;
  const hopSize = 256;
  const numBins = frameSize / 2 + 1; // 257
  const numMelBands = 40;
  const numMfcc = 32;

  // Precompute Hann window
  const hann = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
  }

  // Precompute Mel filterbank (80 Hz to 7600 Hz)
  const minMel = hzToMel(80);
  const maxMel = hzToMel(7600);
  const melPoints = new Float32Array(numMelBands + 2);
  const binPoints = new Int32Array(numMelBands + 2);
  for (let m = 0; m < numMelBands + 2; m++) {
    melPoints[m] = minMel + ((maxMel - minMel) * m) / (numMelBands + 1);
    const hz = melToHz(melPoints[m]);
    binPoints[m] = Math.min(numBins - 1, Math.max(0, Math.floor(((frameSize + 1) * hz) / SAMPLE_RATE)));
  }

  const melFrames: Float32Array[] = [];
  const spectralDescriptors: Float32Array[] = [];

  for (let start = 0; start + frameSize <= pcm.length; start += hopSize) {
    let energy = 0;
    const real = new Float32Array(frameSize);
    const imag = new Float32Array(frameSize);

    // Pre-emphasis filter (y[n] = x[n] - 0.97 * x[n-1]) + Hann window
    for (let i = 0; i < frameSize; i++) {
      const curr = pcm[start + i] / 32768;
      const prev = i > 0 ? pcm[start + i - 1] / 32768 : curr;
      const pre = curr - 0.97 * prev;
      energy += curr * curr;
      real[i] = pre * hann[i];
    }

    const rms = Math.sqrt(energy / frameSize);
    if (rms < 0.01) continue; // Only keep active speech frames

    fftRadix2(real, imag);

    const powerSpec = new Float32Array(numBins);
    let totalPower = 1e-10;
    let weightedFreqSum = 0;
    for (let k = 0; k < numBins; k++) {
      const p = real[k] * real[k] + imag[k] * imag[k];
      powerSpec[k] = p;
      totalPower += p;
      weightedFreqSum += k * p;
    }

    // 40 Log-Mel filterbank energies
    const melEnergies = new Float32Array(numMelBands);
    let melMean = 0;
    for (let m = 1; m <= numMelBands; m++) {
      const fLeft = binPoints[m - 1];
      const fCenter = binPoints[m];
      const fRight = binPoints[m + 1];
      let sum = 1e-10;
      for (let k = fLeft; k <= fCenter; k++) {
        const weight = fCenter > fLeft ? (k - fLeft) / (fCenter - fLeft) : 1;
        sum += powerSpec[k] * weight;
      }
      for (let k = fCenter + 1; k <= fRight; k++) {
        const weight = fRight > fCenter ? (fRight - k) / (fRight - fCenter) : 1;
        sum += powerSpec[k] * weight;
      }
      const logMel = Math.log(sum);
      melEnergies[m - 1] = logMel;
      melMean += logMel;
    }

    // Cepstral mean normalization + local 7-band moving-average subtraction (liftering)
    // Removes universal 1/f speech spectral tilt so only speaker-specific formant peaks (F1-F4) remain
    melMean /= numMelBands;
    const rawMel = new Float32Array(numMelBands);
    for (let m = 0; m < numMelBands; m++) {
      rawMel[m] = melEnergies[m] - melMean;
    }
    for (let m = 0; m < numMelBands; m++) {
      let localSum = 0;
      let count = 0;
      for (let k = Math.max(0, m - 3); k <= Math.min(numMelBands - 1, m + 3); k++) {
        localSum += rawMel[k];
        count++;
      }
      melEnergies[m] = rawMel[m] - localSum / count;
    }
    melFrames.push(melEnergies);

    // Spectral descriptors (local formant sub-band peaks across 100 Hz - 4200 Hz)
    const desc = new Float32Array(16);
    desc[0] = (weightedFreqSum / totalPower / numBins - 0.12) * 3.0;
    const rawBands = new Float32Array(15);
    const maxSpeechBin = Math.floor(numBins * 0.55); // up to ~4400 Hz
    for (let b = 0; b < 15; b++) {
      const bStart = Math.max(1, Math.floor((b * maxSpeechBin) / 15));
      const bEnd = Math.max(bStart + 1, Math.floor(((b + 1) * maxSpeechBin) / 15));
      let bandSum = 1e-10;
      for (let k = bStart; k < bEnd; k++) {
        bandSum += powerSpec[k];
      }
      rawBands[b] = Math.log(bandSum / totalPower);
    }
    for (let b = 0; b < 15; b++) {
      let local = 0;
      let cnt = 0;
      for (let k = Math.max(0, b - 2); k <= Math.min(14, b + 2); k++) {
        local += rawBands[k];
        cnt++;
      }
      desc[b + 1] = rawBands[b] - local / cnt;
    }
    spectralDescriptors.push(desc);
  }

  const features = new Float32Array(EMBEDDING_DIM);
  if (melFrames.length === 0) {
    return features;
  }

  const numFrames = melFrames.length;

  // 1. Dims [0..39]: Mean of 40 liftered log-Mel bands (vocal tract formant peaks)
  for (let m = 0; m < numMelBands; m++) {
    let sum = 0;
    for (let f = 0; f < numFrames; f++) sum += melFrames[f][m];
    features[m] = (sum / numFrames) * 1.2;
  }

  // 2. Dims [40..79]: Zero-centered StdDev of 40 liftered log-Mel bands
  let stdMean = 0;
  for (let m = 0; m < numMelBands; m++) {
    const mean = features[m] / 1.2;
    let sumSq = 0;
    for (let f = 0; f < numFrames; f++) {
      const d = melFrames[f][m] - mean;
      sumSq += d * d;
    }
    const std = Math.sqrt(sumSq / numFrames);
    features[40 + m] = std;
    stdMean += std;
  }
  stdMean /= numMelBands;
  for (let m = 0; m < numMelBands; m++) {
    features[40 + m] = (features[40 + m] - stdMean) * 0.8;
  }

  // 3. Dims [80..111] & [112..143]: Higher-order DCT-II MFCC (c = 2..33) mean & zero-centered std
  let mfccStdMean = 0;
  for (let c = 0; c < numMfcc; c++) {
    let mfccSum = 0;
    const mfccSeries = new Float32Array(numFrames);
    const cepOrder = c + 2; // Skip c=0,1 global tilt
    for (let f = 0; f < numFrames; f++) {
      let val = 0;
      for (let m = 0; m < numMelBands; m++) {
        val += melFrames[f][m] * Math.cos((Math.PI * cepOrder * (m + 0.5)) / numMelBands);
      }
      mfccSeries[f] = val * 0.35;
      mfccSum += mfccSeries[f];
    }
    const mfccMean = mfccSum / numFrames;
    let mfccSq = 0;
    for (let f = 0; f < numFrames; f++) {
      const d = mfccSeries[f] - mfccMean;
      mfccSq += d * d;
    }
    const std = Math.sqrt(mfccSq / numFrames);
    features[80 + c] = mfccMean;
    features[112 + c] = std;
    mfccStdMean += std;
  }
  mfccStdMean /= numMfcc;
  for (let c = 0; c < numMfcc; c++) {
    features[112 + c] = (features[112 + c] - mfccStdMean) * 0.6;
  }

  // 4. Dims [144..159]: Mean of 16 liftered sub-band formant descriptors
  for (let d = 0; d < 16; d++) {
    let sum = 0;
    for (let f = 0; f < spectralDescriptors.length; f++) {
      sum += spectralDescriptors[f][d];
    }
    features[144 + d] = (sum / spectralDescriptors.length) * 1.2;
  }

  // 5. Dims [160..191]: Orthogonal Fourier-harmonic & RBF pitch encoding (32 dims)
  const pitchStats = computePitchStats(pcm);
  if (pitchStats.medianF0 > 0) {
    const logF0 = Math.log2(pitchStats.medianF0 / 65); // [0.0 .. 2.55]
    const theta = (Math.PI * logF0) / 1.4;
    // 16 dims of multi-scale harmonic phase [cos(k*theta), sin(k*theta)] with 1/k decay
    // so natural conversational pitch variations remain positively correlated
    for (let k = 1; k <= 8; k++) {
      const weight = 1.8 / k;
      features[160 + (k - 1) * 2] = Math.cos(k * theta) * weight;
      features[160 + (k - 1) * 2 + 1] = Math.sin(k * theta) * weight;
    }
    // 14 dims of zero-centered smooth RBF across [65 Hz .. 380 Hz]
    let rbfMean = 0;
    for (let b = 0; b < 14; b++) {
      const center = (b / 13) * 2.55;
      const dist = (logF0 - center) / 0.26;
      const val = Math.exp(-0.5 * dist * dist) * 1.6;
      features[176 + b] = val;
      rbfMean += val;
    }
    rbfMean /= 14;
    for (let b = 0; b < 14; b++) {
      features[176 + b] -= rbfMean;
    }
    features[190] = (logF0 - 1.25) * 1.6;
    features[191] = (pitchStats.spreadHz / Math.max(50, pitchStats.medianF0) - 0.15) * 1.0;
  }

  return l2Normalize(features);
}

/**
 * L2-normalizes a vector to unit length.
 */
export function l2Normalize(vec: Float32Array): Float32Array {
  let normSq = 0;
  for (let i = 0; i < vec.length; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq);
  const out = new Float32Array(vec.length);
  if (norm > 1e-8) {
    for (let i = 0; i < vec.length; i++) {
      out[i] = vec[i] / norm;
    }
  }
  return out;
}

/**
 * Solution 1: Computes a 192-dimensional voiceprint embedding using the ONNX model session.
 */
export async function computeEmbedding(
  pcm: Int16Array,
  session: ort.InferenceSession | null
): Promise<Float32Array> {
  const acousticVec = extractAcousticFeatures192(pcm);
  if (!session) {
    return acousticVec;
  }

  const inputName = session.inputNames[0] || 'input';
  const outputName = session.outputNames[0] || 'output';
  const tensor = new ort.Tensor('float32', acousticVec, [1, EMBEDDING_DIM]);
  const outputs = await session.run({ [inputName]: tensor });
  const outputTensor = outputs[outputName];

  if (outputTensor && outputTensor.data instanceof Float32Array) {
    return l2Normalize(new Float32Array(outputTensor.data));
  }

  return acousticVec;
}

/**
 * Computes cosine similarity between two embeddings in [-1, 1].
 */
export function cosineSim(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA * normB);
  return denom > 1e-8 ? dot / denom : 0;
}
