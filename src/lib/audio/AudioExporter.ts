/**
 * AudioExporter - 37-feature audio analysis engine and JSON export pipeline
 *
 * Expands PreAnalyzer's 3-band analysis into full 8-band frequency decomposition
 * with envelope followers, onset detection, spectral descriptors, stereo features,
 * musical features, and dynamics analysis.
 *
 * Output is a self-documenting JSON file consumed by the Python keyframe generator.
 *
 * Phase 27, Plan 27-01
 */

import type {
  AudioExportResult,
  ExportedAudioFrame,
  AudioBandDefinition,
  AudioFeatureDescription,
  AudioClassificationHints,
} from '@/types/index';

// ============================================================================
// Constants
// ============================================================================

const FFT_SIZE = 512;
const FREQUENCY_BIN_COUNT = FFT_SIZE / 2; // 256 bins

// 8-band frequency boundaries (bin indices for 44.1kHz sample rate, 512 FFT)
// Each bin = 44100 / 512 = 86.1Hz
const BAND_BOUNDARIES = {
  sub_bass: { start: 0, end: 0 },     // 0-86Hz (covers 20-60Hz)
  bass:     { start: 1, end: 2 },     // 86-258Hz (covers 60-250Hz)
  low_mid:  { start: 3, end: 5 },     // 258-517Hz (covers 250-500Hz)
  mid:      { start: 6, end: 23 },    // 517-2068Hz (covers 500-2kHz)
  upper_mid:{ start: 24, end: 46 },   // 2068-3962Hz (covers 2-4kHz)
  presence: { start: 47, end: 69 },   // 3962-5948Hz (covers 4-6kHz)
  brilliance:{ start: 70, end: 139 }, // 5948-11975Hz (covers 6-12kHz)
  air:      { start: 140, end: 232 }, // 12061-19987Hz (covers 12-20kHz)
} as const;

type BandKey = keyof typeof BAND_BOUNDARIES;
const BAND_KEYS: BandKey[] = ['sub_bass', 'bass', 'low_mid', 'mid', 'upper_mid', 'presence', 'brilliance', 'air'];

// Envelope follower parameters
const ENVELOPE_RELEASE_MS = 150; // Default release time in ms

// Onset detection parameters
const ONSET_COOLDOWN_FRAMES = 3;
const ONSET_THRESHOLD_MULTIPLIER = 1.5;

// BPM detection range
const MIN_BPM = 60;
const MAX_BPM = 200;

// LUFS approximation window (400ms at 30fps = 12 frames)
const LUFS_WINDOW_FRAMES = 12;

// ============================================================================
// Self-documenting Metadata
// ============================================================================

const BAND_DEFINITIONS: AudioBandDefinition[] = [
  { name: 'Sub-Bass', key: 'sub_bass', min_hz: 20, max_hz: 60, description: 'Lowest rumble, felt more than heard', typical_use: 'Global particle gravity, camera shake intensity' },
  { name: 'Bass', key: 'bass', min_hz: 60, max_hz: 250, description: 'Kick drums, bass guitar fundamentals', typical_use: 'Fire emission burst, orb scale pulse' },
  { name: 'Low Mid', key: 'low_mid', min_hz: 250, max_hz: 500, description: 'Body of instruments, warmth', typical_use: 'Flame turbulence, flow object intensity' },
  { name: 'Mid', key: 'mid', min_hz: 500, max_hz: 2000, description: 'Vocals, guitar, piano core', typical_use: 'Color temperature shift, emission color cycling' },
  { name: 'Upper Mid', key: 'upper_mid', min_hz: 2000, max_hz: 4000, description: 'Vocal presence, attack transients', typical_use: 'Particle spawn rate, detail density' },
  { name: 'Presence', key: 'presence', min_hz: 4000, max_hz: 6000, description: 'Clarity, definition of sounds', typical_use: 'Bloom intensity, glow radius' },
  { name: 'Brilliance', key: 'brilliance', min_hz: 6000, max_hz: 12000, description: 'Cymbals, sibilance, shimmer', typical_use: 'Sparkle particles, lens flare triggers' },
  { name: 'Air', key: 'air', min_hz: 12000, max_hz: 20000, description: 'Highest audible frequencies, airiness', typical_use: 'Ambient fog density, background star brightness' },
];

const FEATURE_DESCRIPTIONS: AudioFeatureDescription[] = [
  // 8 band amplitudes
  { name: 'Sub-Bass Amplitude', key: 'bands.sub_bass', range: '0-1', description: 'Average magnitude in 20-60Hz range', typical_use: 'Low-frequency rumble intensity' },
  { name: 'Bass Amplitude', key: 'bands.bass', range: '0-1', description: 'Average magnitude in 60-250Hz range', typical_use: 'Kick/bass hit intensity' },
  { name: 'Low Mid Amplitude', key: 'bands.low_mid', range: '0-1', description: 'Average magnitude in 250-500Hz range', typical_use: 'Instrument body intensity' },
  { name: 'Mid Amplitude', key: 'bands.mid', range: '0-1', description: 'Average magnitude in 500-2kHz range', typical_use: 'Vocal/melody intensity' },
  { name: 'Upper Mid Amplitude', key: 'bands.upper_mid', range: '0-1', description: 'Average magnitude in 2-4kHz range', typical_use: 'Attack/transient intensity' },
  { name: 'Presence Amplitude', key: 'bands.presence', range: '0-1', description: 'Average magnitude in 4-6kHz range', typical_use: 'Clarity/definition intensity' },
  { name: 'Brilliance Amplitude', key: 'bands.brilliance', range: '0-1', description: 'Average magnitude in 6-12kHz range', typical_use: 'Shimmer/sparkle intensity' },
  { name: 'Air Amplitude', key: 'bands.air', range: '0-1', description: 'Average magnitude in 12-20kHz range', typical_use: 'Airiness/atmosphere intensity' },
  // 8 envelopes
  { name: 'Sub-Bass Envelope', key: 'envelopes.sub_bass', range: '0-1', description: 'Smoothed sub-bass with exponential decay', typical_use: 'Sustained low rumble response' },
  { name: 'Bass Envelope', key: 'envelopes.bass', range: '0-1', description: 'Smoothed bass with exponential decay', typical_use: 'Sustained bass response' },
  { name: 'Low Mid Envelope', key: 'envelopes.low_mid', range: '0-1', description: 'Smoothed low-mid with exponential decay', typical_use: 'Sustained warmth response' },
  { name: 'Mid Envelope', key: 'envelopes.mid', range: '0-1', description: 'Smoothed mid with exponential decay', typical_use: 'Sustained vocal/melody response' },
  { name: 'Upper Mid Envelope', key: 'envelopes.upper_mid', range: '0-1', description: 'Smoothed upper-mid with exponential decay', typical_use: 'Sustained presence response' },
  { name: 'Presence Envelope', key: 'envelopes.presence', range: '0-1', description: 'Smoothed presence with exponential decay', typical_use: 'Sustained clarity response' },
  { name: 'Brilliance Envelope', key: 'envelopes.brilliance', range: '0-1', description: 'Smoothed brilliance with exponential decay', typical_use: 'Sustained shimmer response' },
  { name: 'Air Envelope', key: 'envelopes.air', range: '0-1', description: 'Smoothed air with exponential decay', typical_use: 'Sustained atmosphere response' },
  // 8 onsets
  { name: 'Sub-Bass Onset', key: 'onsets.sub_bass', range: 'boolean', description: 'Sudden increase detected in sub-bass', typical_use: 'Trigger low-frequency events' },
  { name: 'Bass Onset', key: 'onsets.bass', range: 'boolean', description: 'Sudden increase detected in bass', typical_use: 'Trigger kick/bass events' },
  { name: 'Low Mid Onset', key: 'onsets.low_mid', range: 'boolean', description: 'Sudden increase detected in low-mids', typical_use: 'Trigger warmth events' },
  { name: 'Mid Onset', key: 'onsets.mid', range: 'boolean', description: 'Sudden increase detected in mids', typical_use: 'Trigger melodic events' },
  { name: 'Upper Mid Onset', key: 'onsets.upper_mid', range: 'boolean', description: 'Sudden increase detected in upper-mids', typical_use: 'Trigger transient events' },
  { name: 'Presence Onset', key: 'onsets.presence', range: 'boolean', description: 'Sudden increase detected in presence', typical_use: 'Trigger clarity events' },
  { name: 'Brilliance Onset', key: 'onsets.brilliance', range: 'boolean', description: 'Sudden increase detected in brilliance', typical_use: 'Trigger sparkle events' },
  { name: 'Air Onset', key: 'onsets.air', range: 'boolean', description: 'Sudden increase detected in air', typical_use: 'Trigger atmosphere events' },
  // 4 spectral descriptors
  { name: 'Spectral Centroid', key: 'spectral_centroid', range: '0-1', description: 'Weighted mean frequency, normalized to Nyquist. Higher = brighter', typical_use: 'Color temperature, brightness mapping' },
  { name: 'Spectral Flatness', key: 'spectral_flatness', range: '0-1', description: 'Geometric/arithmetic mean ratio. 1 = noise-like, 0 = tonal', typical_use: 'Texture roughness, noise level' },
  { name: 'RMS Energy', key: 'rms_energy', range: '0-1', description: 'Root mean square of time-domain samples, normalized', typical_use: 'Overall visual intensity' },
  { name: 'Zero Crossing Rate', key: 'zero_crossing_rate', range: '0-1', description: 'Sign changes per sample, normalized. Higher = noisier/brighter', typical_use: 'Texture detail level' },
  // 3 stereo features
  { name: 'L/R Balance', key: 'lr_balance', range: '-1 to 1', description: 'Stereo balance. -1 = full left, 0 = center, 1 = full right', typical_use: 'Camera pan, particle drift direction' },
  { name: 'Stereo Width', key: 'stereo_width', range: '0-1', description: 'Decorrelation between channels. 0 = mono, 1 = wide stereo', typical_use: 'Scene width, particle spread' },
  { name: 'Mid/Side Energy', key: 'mid_side_energy', range: '0-1', description: 'Side energy ratio. 0 = all center, 1 = all sides', typical_use: 'Ambient vs focused effect balance' },
  // 4 musical features
  { name: 'Chromagram', key: 'chromagram', range: '0-1 each (12 elements)', description: '12-element pitch class distribution (C through B)', typical_use: 'Color palette selection per chord' },
  { name: 'BPM', key: 'bpm', range: '60-200', description: 'Estimated tempo via RMS autocorrelation', typical_use: 'Animation speed, pulse rate' },
  { name: 'Beat Phase', key: 'beat_phase', range: '0-1', description: 'Position within current beat cycle. 0 = on beat, 0.5 = off beat', typical_use: 'Cyclic animation driver' },
  { name: 'Spectral Contrast', key: 'spectral_contrast', range: '0-1', description: 'Difference between spectral peaks and valleys', typical_use: 'Visual contrast, edge sharpness' },
  // 2 dynamics
  { name: 'LUFS', key: 'lufs', range: '-70 to 0', description: 'Approximate perceptual loudness via K-weighted RMS windowing', typical_use: 'Master intensity scaling' },
  { name: 'Crest Factor', key: 'crest_factor', range: '0-1', description: 'Peak/RMS ratio, normalized. Higher = more dynamic (punchy)', typical_use: 'Transient emphasis, compression detection' },
];

// ============================================================================
// FFT Implementation (reused from PreAnalyzer pattern)
// ============================================================================

/**
 * Compute FFT magnitude spectrum using Cooley-Tukey algorithm.
 * Returns magnitude values normalized by FFT scale factor.
 */
function computeFFT(samples: Float32Array, fftSize: number): Float32Array {
  const n = fftSize;
  const magnitudes = new Float32Array(n / 2);

  // Zero-pad if needed
  const input = new Float32Array(n);
  for (let i = 0; i < Math.min(samples.length, n); i++) {
    input[i] = samples[i];
  }

  // Apply Hanning window
  for (let i = 0; i < n; i++) {
    input[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }

  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    real[i] = input[i];
  }

  // Bit-reversal permutation
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let b = 0; b < bits; b++) {
      j = (j << 1) | ((i >> b) & 1);
    }
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Cooley-Tukey FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = -2 * Math.PI / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;
        const tReal = cos * real[oddIdx] - sin * imag[oddIdx];
        const tImag = sin * real[oddIdx] + cos * imag[oddIdx];
        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;
      }
    }
  }

  // Compute magnitudes normalized by FFT scale factor
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (n / 4);
  }

  return magnitudes;
}

// ============================================================================
// Feature Computation Functions
// ============================================================================

/**
 * Extract 8-band amplitudes from FFT magnitudes.
 */
function compute8Bands(magnitudes: Float32Array): Record<BandKey, number> {
  const bands = {} as Record<BandKey, number>;

  for (const key of BAND_KEYS) {
    const { start, end } = BAND_BOUNDARIES[key];
    let sum = 0;
    const count = end - start + 1;
    for (let i = start; i <= end && i < magnitudes.length; i++) {
      sum += magnitudes[i];
    }
    bands[key] = count > 0 ? Math.min(1, sum / count) : 0;
  }

  return bands;
}

/**
 * Compute spectral centroid: weighted mean frequency normalized to 0-1 over Nyquist.
 */
function computeSpectralCentroid(magnitudes: Float32Array, sampleRate: number): number {
  let weightedSum = 0;
  let magSum = 0;
  const binWidth = sampleRate / (magnitudes.length * 2);

  for (let i = 0; i < magnitudes.length; i++) {
    const freq = i * binWidth;
    weightedSum += freq * magnitudes[i];
    magSum += magnitudes[i];
  }

  if (magSum === 0) return 0;
  const centroid = weightedSum / magSum;
  const nyquist = sampleRate / 2;
  return Math.min(1, centroid / nyquist);
}

/**
 * Compute spectral flatness: geometric mean / arithmetic mean.
 * Uses log domain for numerical stability.
 */
function computeSpectralFlatness(magnitudes: Float32Array): number {
  let logSum = 0;
  let arithmeticSum = 0;
  let count = 0;

  for (let i = 1; i < magnitudes.length; i++) { // skip DC bin
    const val = Math.max(magnitudes[i], 1e-10); // prevent log(0)
    logSum += Math.log(val);
    arithmeticSum += val;
    count++;
  }

  if (count === 0 || arithmeticSum === 0) return 0;

  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = arithmeticSum / count;

  return Math.min(1, geometricMean / arithmeticMean);
}

/**
 * Compute RMS energy from time-domain samples.
 */
function computeRMS(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Compute zero-crossing rate, normalized by frame length.
 */
function computeZeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
      crossings++;
    }
  }
  // Normalize: max possible crossings = samples.length - 1
  return crossings / (samples.length - 1);
}

/**
 * Compute stereo features from left and right channel data.
 */
function computeStereoFeatures(
  leftSamples: Float32Array,
  rightSamples: Float32Array
): { lr_balance: number; stereo_width: number; mid_side_energy: number } {
  let leftRms = 0;
  let rightRms = 0;
  let midEnergy = 0;
  let sideEnergy = 0;
  let leftSum = 0;
  let rightSum = 0;
  let crossSum = 0;
  let leftSqSum = 0;
  let rightSqSum = 0;

  const len = Math.min(leftSamples.length, rightSamples.length);

  for (let i = 0; i < len; i++) {
    const l = leftSamples[i];
    const r = rightSamples[i];

    leftRms += l * l;
    rightRms += r * r;

    const m = (l + r) / 2;
    const s = (l - r) / 2;
    midEnergy += m * m;
    sideEnergy += s * s;

    leftSum += l;
    rightSum += r;
    crossSum += l * r;
    leftSqSum += l * l;
    rightSqSum += r * r;
  }

  leftRms = Math.sqrt(leftRms / len);
  rightRms = Math.sqrt(rightRms / len);

  // L/R balance: (R_rms - L_rms) / (R_rms + L_rms)
  const rmsSum = leftRms + rightRms;
  const lr_balance = rmsSum > 0 ? (rightRms - leftRms) / rmsSum : 0;

  // Stereo width via correlation: 1 - |correlation|
  const leftMean = leftSum / len;
  const rightMean = rightSum / len;
  let covSum = 0;
  let leftVarSum = 0;
  let rightVarSum = 0;
  for (let i = 0; i < len; i++) {
    const ld = leftSamples[i] - leftMean;
    const rd = rightSamples[i] - rightMean;
    covSum += ld * rd;
    leftVarSum += ld * ld;
    rightVarSum += rd * rd;
  }
  const denom = Math.sqrt(leftVarSum * rightVarSum);
  const correlation = denom > 0 ? covSum / denom : 1;
  const stereo_width = Math.min(1, Math.max(0, 1 - Math.abs(correlation)));

  // Mid/Side energy ratio
  const totalMidSide = midEnergy + sideEnergy;
  const mid_side_energy = totalMidSide > 0 ? Math.min(1, sideEnergy / totalMidSide) : 0;

  return { lr_balance, stereo_width, mid_side_energy };
}

/**
 * Compute 12-element chromagram from FFT magnitudes.
 * Maps each bin to its nearest pitch class and sums magnitudes.
 */
function computeChromagram(magnitudes: Float32Array, sampleRate: number): number[] {
  const chroma = new Array(12).fill(0);
  const binWidth = sampleRate / (magnitudes.length * 2);

  for (let i = 1; i < magnitudes.length; i++) { // skip DC
    const freq = i * binWidth;
    if (freq < 20 || freq > 5000) continue; // musical range

    // Map frequency to pitch class: note = round(12 * log2(freq / 440)) mod 12
    const noteNum = Math.round(12 * Math.log2(freq / 440));
    const pitchClass = ((noteNum % 12) + 12) % 12; // 0=A, need to map to C=0
    // Shift so 0=C: A=0 in our calc, C is 3 semitones up
    const cBasedClass = (pitchClass + 3) % 12;
    chroma[cBasedClass] += magnitudes[i];
  }

  // Normalize so max = 1
  const maxVal = Math.max(...chroma, 1e-10);
  for (let i = 0; i < 12; i++) {
    chroma[i] = Math.min(1, chroma[i] / maxVal);
  }

  return chroma;
}

/**
 * Compute spectral contrast: difference between spectral peaks and valleys.
 */
function computeSpectralContrast(magnitudes: Float32Array): number {
  // Split spectrum into sub-bands and compute peak-valley difference
  const numSubBands = 6;
  const binsPerBand = Math.floor(magnitudes.length / numSubBands);
  let contrastSum = 0;

  for (let b = 0; b < numSubBands; b++) {
    const start = b * binsPerBand;
    const end = Math.min(start + binsPerBand, magnitudes.length);
    let peak = 0;
    let valley = Infinity;
    for (let i = start; i < end; i++) {
      if (magnitudes[i] > peak) peak = magnitudes[i];
      if (magnitudes[i] < valley) valley = magnitudes[i];
    }
    if (valley === Infinity) valley = 0;
    contrastSum += (peak - valley);
  }

  return Math.min(1, contrastSum / numSubBands);
}

/**
 * Estimate BPM via autocorrelation of RMS energy values.
 * Returns estimated BPM in range [MIN_BPM, MAX_BPM].
 */
function estimateBPM(rmsValues: number[], fps: number): number {
  if (rmsValues.length < fps * 4) {
    // Need at least 4 seconds of data for meaningful BPM estimate
    return 120; // default fallback
  }

  // Use a sliding window autocorrelation approach
  const windowSize = Math.min(rmsValues.length, Math.floor(fps * 8)); // 8 seconds max
  const minLag = Math.floor(60 * fps / MAX_BPM); // frames per beat at MAX_BPM
  const maxLag = Math.floor(60 * fps / MIN_BPM); // frames per beat at MIN_BPM

  let bestCorrelation = -Infinity;
  let bestLag = minLag;

  // Mean of the window
  let mean = 0;
  for (let i = 0; i < windowSize; i++) {
    mean += rmsValues[i];
  }
  mean /= windowSize;

  // Autocorrelation
  for (let lag = minLag; lag <= Math.min(maxLag, windowSize - 1); lag++) {
    let correlation = 0;
    let count = 0;
    for (let i = 0; i < windowSize - lag; i++) {
      correlation += (rmsValues[i] - mean) * (rmsValues[i + lag] - mean);
      count++;
    }
    if (count > 0) {
      correlation /= count;
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  const bpm = 60 * fps / bestLag;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

/**
 * Compute approximate LUFS via K-weighted RMS windowing.
 * Uses a 400ms window with high-shelf boost approximation.
 */
function computeLUFS(rmsWindow: number[]): number {
  if (rmsWindow.length === 0) return -70;

  // K-weighting approximation: boost high frequencies slightly
  // Since we only have per-frame RMS, apply a simple shelf boost factor
  const kWeightFactor = 1.1; // Approximate high-shelf boost
  let sum = 0;
  for (const rms of rmsWindow) {
    const weighted = rms * kWeightFactor;
    sum += weighted * weighted;
  }
  const meanSquare = sum / rmsWindow.length;

  if (meanSquare <= 0) return -70;

  // Convert to dB (LUFS scale)
  const lufs = 10 * Math.log10(meanSquare);
  return Math.max(-70, Math.min(0, lufs));
}

/**
 * Compute crest factor: peak / RMS, normalized to 0-1.
 */
function computeCrestFactor(samples: Float32Array): number {
  let peak = 0;
  let sumSquares = 0;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSquares += samples[i] * samples[i];
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  if (rms <= 0) return 0;

  const crest = peak / rms;
  // Normalize: typical crest factors range 1-10, map to 0-1
  return Math.min(1, crest / 10);
}

// ============================================================================
// AudioExporter Class
// ============================================================================

export class AudioExporter {
  /**
   * Analyze audio file and return full 37-feature export result.
   * Decodes audio, runs 8-band FFT per frame, computes all derived features.
   */
  async analyzeForExport(
    audioFile: File,
    options?: { fps?: number; onProgress?: (pct: number) => void; signal?: AbortSignal }
  ): Promise<AudioExportResult> {
    const fps = options?.fps ?? 30;
    const onProgress = options?.onProgress;
    const signal = options?.signal;

    // Decode audio buffer (keep stereo for L/R features)
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close();

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);
    const samplesPerFrame = Math.floor(sampleRate / fps);
    const numChannels = audioBuffer.numberOfChannels;

    // Get channel data
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = numChannels >= 2 ? audioBuffer.getChannelData(1) : leftChannel;

    // Mono mix for FFT analysis
    const monoData = new Float32Array(audioBuffer.length);
    if (numChannels === 1) {
      monoData.set(leftChannel);
    } else {
      for (let i = 0; i < audioBuffer.length; i++) {
        monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
    }

    // Per-band state for envelope followers and onset detection
    const envelopeState: Record<BandKey, number> = {} as Record<BandKey, number>;
    const prevBandAmplitudes: Record<BandKey, number> = {} as Record<BandKey, number>;
    const onsetFluxMean: Record<BandKey, number> = {} as Record<BandKey, number>;
    const onsetCooldown: Record<BandKey, number> = {} as Record<BandKey, number>;

    for (const key of BAND_KEYS) {
      envelopeState[key] = 0;
      prevBandAmplitudes[key] = 0;
      onsetFluxMean[key] = 0;
      onsetCooldown[key] = 0;
    }

    // Release factor for envelope: exp(-1 / (release_ms / 1000 * fps))
    const releaseFactor = Math.exp(-1 / (ENVELOPE_RELEASE_MS / 1000 * fps));

    // Collect per-frame data (first pass: everything except BPM/beat_phase)
    const frames: ExportedAudioFrame[] = [];
    const rmsValues: number[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Analysis aborted', 'AbortError');
      }

      const sampleStart = frame * samplesPerFrame;
      const sampleEnd = Math.min(sampleStart + FFT_SIZE, monoData.length);
      const actualSamples = sampleEnd - sampleStart;

      // Extract frame samples for mono FFT
      const monoFrameSamples = new Float32Array(FFT_SIZE);
      for (let i = 0; i < Math.min(actualSamples, FFT_SIZE); i++) {
        monoFrameSamples[i] = monoData[sampleStart + i];
      }

      // Extract stereo frame samples
      const leftFrameSamples = new Float32Array(FFT_SIZE);
      const rightFrameSamples = new Float32Array(FFT_SIZE);
      for (let i = 0; i < Math.min(actualSamples, FFT_SIZE); i++) {
        leftFrameSamples[i] = leftChannel[sampleStart + i] ?? 0;
        rightFrameSamples[i] = rightChannel[sampleStart + i] ?? 0;
      }

      // Compute FFT on mono
      const magnitudes = computeFFT(monoFrameSamples, FFT_SIZE);

      // 8-band amplitudes
      const bands = compute8Bands(magnitudes);

      // Envelope followers
      const envelopes = {} as Record<BandKey, number>;
      for (const key of BAND_KEYS) {
        envelopeState[key] = Math.max(bands[key], envelopeState[key] * releaseFactor);
        envelopes[key] = envelopeState[key];
      }

      // Onset detection (spectral flux per band)
      const onsets = {} as Record<BandKey, boolean>;
      for (const key of BAND_KEYS) {
        const flux = Math.max(0, bands[key] - prevBandAmplitudes[key]);
        // Update running mean
        onsetFluxMean[key] = onsetFluxMean[key] * 0.95 + flux * 0.05;
        const threshold = onsetFluxMean[key] * ONSET_THRESHOLD_MULTIPLIER;

        // Decrement cooldown
        if (onsetCooldown[key] > 0) onsetCooldown[key]--;

        if (flux > threshold && flux > 0.01 && onsetCooldown[key] === 0) {
          onsets[key] = true;
          onsetCooldown[key] = ONSET_COOLDOWN_FRAMES;
        } else {
          onsets[key] = false;
        }

        prevBandAmplitudes[key] = bands[key];
      }

      // Spectral descriptors
      const spectral_centroid = computeSpectralCentroid(magnitudes, sampleRate);
      const spectral_flatness = computeSpectralFlatness(magnitudes);
      const rms_energy = computeRMS(monoFrameSamples);
      const zero_crossing_rate = computeZeroCrossingRate(monoFrameSamples);

      // Stereo features
      const stereo = computeStereoFeatures(leftFrameSamples, rightFrameSamples);

      // Chromagram
      const chromagram = computeChromagram(magnitudes, sampleRate);

      // Spectral contrast
      const spectral_contrast = computeSpectralContrast(magnitudes);

      // Crest factor
      const crest_factor = computeCrestFactor(monoFrameSamples);

      // LUFS (windowed)
      rmsValues.push(rms_energy);
      const lufsWindowStart = Math.max(0, rmsValues.length - LUFS_WINDOW_FRAMES);
      const lufsWindow = rmsValues.slice(lufsWindowStart);
      const lufs = computeLUFS(lufsWindow);

      frames.push({
        frame,
        time: frame / fps,
        bands: {
          sub_bass: bands.sub_bass,
          bass: bands.bass,
          low_mid: bands.low_mid,
          mid: bands.mid,
          upper_mid: bands.upper_mid,
          presence: bands.presence,
          brilliance: bands.brilliance,
          air: bands.air,
        },
        envelopes: {
          sub_bass: envelopes.sub_bass,
          bass: envelopes.bass,
          low_mid: envelopes.low_mid,
          mid: envelopes.mid,
          upper_mid: envelopes.upper_mid,
          presence: envelopes.presence,
          brilliance: envelopes.brilliance,
          air: envelopes.air,
        },
        onsets: {
          sub_bass: onsets.sub_bass,
          bass: onsets.bass,
          low_mid: onsets.low_mid,
          mid: onsets.mid,
          upper_mid: onsets.upper_mid,
          presence: onsets.presence,
          brilliance: onsets.brilliance,
          air: onsets.air,
        },
        spectral_centroid,
        spectral_flatness,
        rms_energy,
        zero_crossing_rate,
        lr_balance: stereo.lr_balance,
        stereo_width: stereo.stereo_width,
        mid_side_energy: stereo.mid_side_energy,
        chromagram,
        bpm: 0,           // Filled in second pass
        beat_phase: 0,     // Filled in second pass
        spectral_contrast,
        lufs,
        crest_factor,
      });

      // Report progress (first pass = 0-80%)
      if (frame % 100 === 0 || frame === totalFrames - 1) {
        const pct = Math.round((frame / totalFrames) * 80);
        onProgress?.(pct);
      }

      // Yield to UI thread periodically
      if (frame % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Second pass: BPM estimation via autocorrelation
    onProgress?.(82);
    const estimatedBpm = estimateBPM(rmsValues, fps);

    // Fill BPM and beat_phase for all frames
    for (const frame of frames) {
      frame.bpm = estimatedBpm;
      frame.beat_phase = (frame.time * estimatedBpm / 60) % 1;
    }
    onProgress?.(90);

    // Compute summary statistics
    let peakRms = 0;
    let rmsSum = 0;
    let beatCount = 0;
    let centroidSum = 0;
    const bandSums: Record<string, number> = {};
    for (const key of BAND_KEYS) {
      bandSums[key] = 0;
    }

    for (const frame of frames) {
      if (frame.rms_energy > peakRms) peakRms = frame.rms_energy;
      rmsSum += frame.rms_energy;
      centroidSum += frame.spectral_centroid;
      // Count bass onsets as beat approximation for summary
      if (frame.onsets.bass) beatCount++;
      for (const key of BAND_KEYS) {
        bandSums[key] += frame.bands[key as BandKey];
      }
    }

    // Find dominant band
    let dominantBand = 'bass';
    let maxBandAvg = 0;
    for (const key of BAND_KEYS) {
      const avg = bandSums[key] / frames.length;
      if (avg > maxBandAvg) {
        maxBandAvg = avg;
        dominantBand = key;
      }
    }

    onProgress?.(95);

    // Build classification
    const classification = this.classify_internal(
      estimatedBpm,
      centroidSum / frames.length,
      frames.reduce((sum, f) => sum + f.crest_factor, 0) / frames.length
    );

    // Build complete result
    const result: AudioExportResult = {
      metadata: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        source_file: audioFile.name,
        duration_seconds: Math.round(duration * 100) / 100,
        fps,
        total_frames: totalFrames,
        sample_rate: sampleRate,
        feature_count: 37,
      },
      band_definitions: BAND_DEFINITIONS,
      feature_descriptions: FEATURE_DESCRIPTIONS,
      classification,
      frames,
      summary: {
        peak_rms: Math.round(peakRms * 1000) / 1000,
        avg_rms: Math.round((rmsSum / frames.length) * 1000) / 1000,
        beat_count: beatCount,
        estimated_bpm: estimatedBpm,
        dominant_band: dominantBand,
        spectral_centroid_mean: Math.round((centroidSum / frames.length) * 1000) / 1000,
      },
    };

    onProgress?.(100);
    return result;
  }

  /**
   * Download the export result as a JSON file.
   * Creates a Blob, triggers browser download.
   */
  downloadJSON(result: AudioExportResult, filename?: string): void {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${result.metadata.source_file.replace(/\.[^.]+$/, '')}-analysis.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Classify the audio and suggest a preset.
   */
  classify(result: AudioExportResult): AudioClassificationHints {
    return this.classify_internal(
      result.summary.estimated_bpm,
      result.summary.spectral_centroid_mean,
      result.frames.reduce((sum, f) => sum + f.crest_factor, 0) / result.frames.length
    );
  }

  /**
   * Internal classification logic.
   */
  private classify_internal(
    bpm: number,
    avgCentroid: number,
    avgCrestFactor: number
  ): AudioClassificationHints {
    let suggested_preset = 'Cinematic';
    let confidence = 0.5;

    if (bpm > 120 && avgCrestFactor > 0.6) {
      suggested_preset = 'EDM';
      confidence = 0.7 + Math.min(0.2, (bpm - 120) / 200);
    } else if (bpm < 90 && avgCentroid < 0.3) {
      suggested_preset = 'Meditation';
      confidence = 0.7 + Math.min(0.2, (90 - bpm) / 90);
    }

    return {
      estimated_bpm: bpm,
      avg_spectral_centroid: Math.round(avgCentroid * 1000) / 1000,
      avg_crest_factor: Math.round(avgCrestFactor * 1000) / 1000,
      suggested_preset,
      confidence: Math.round(confidence * 100) / 100,
    };
  }
}

export const audioExporter = new AudioExporter();
