/**
 * PreAnalyzer - Offline audio analysis for frame-accurate rendering
 *
 * Analyzes an entire audio file and generates per-frame audio data
 * for deterministic offline rendering. Uses the same frequency band
 * calculations as AudioAnalyzer for consistency.
 *
 * Works in both browser (Web Audio API) and Node.js (pure FFT).
 *
 * Phase 3, Plan 03-01
 */

import { FrameAudioData, PreAnalysisResult, PreAnalyzeOptions } from '@/types/index';

// FFT Size - matches AudioAnalyzer
const FFT_SIZE = 512;
const FREQUENCY_BIN_COUNT = FFT_SIZE / 2; // 256 bins

// Frequency band boundaries (same as AudioAnalyzer.ts)
// With 44.1kHz sample rate and 512 FFT: each bin = 44100/512 = 86.1Hz
// Bass: 20-300Hz → bins 0-3 (0-344Hz)
const BASS_END = 3;
// Mids: 300Hz-4kHz → bins 4-46 (344-3962Hz)
const MID_END = 46;
// Highs: 4kHz-12kHz → bins 47-139 (4048-11975Hz)
const HIGH_END = 139;

// Beat detection parameters (from AudioAnalyzer)
const BEAT_THRESHOLD = 0.05;
const BEAT_COOLDOWN_MS = 80;

// Cache configuration
const DB_NAME = 'ethereal-flame-preanalysis';
const DB_VERSION = 1;
const STORE_NAME = 'analysis-cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Simple hash function for cache keys
 * Samples ~1000 bytes from the buffer for speed
 */
function hashBuffer(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hash = 0;
  const step = Math.max(1, Math.floor(view.length / 1000));
  for (let i = 0; i < view.length; i += step) {
    hash = ((hash << 5) - hash) + view[i];
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// ============================================================================
// IndexedDB Cache (Browser Only)
// ============================================================================

async function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getCached(key: string): Promise<PreAnalysisResult | null> {
  if (!isIndexedDBAvailable()) return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.timestamp && Date.now() - result.timestamp < CACHE_EXPIRY_MS) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch {
    return null;
  }
}

async function setCache(key: string, data: PreAnalysisResult): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ data, timestamp: Date.now() }, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    console.warn('PreAnalyzer: Failed to cache analysis result');
  }
}

// ============================================================================
// Pure FFT Implementation (for Node.js and fallback)
// ============================================================================

/**
 * Compute FFT magnitude spectrum using Cooley-Tukey algorithm
 * Returns magnitude values in linear scale (0-1 range)
 */
function computeFFT(samples: Float32Array, fftSize: number): Float32Array {
  const n = fftSize;
  const magnitudes = new Float32Array(n / 2);

  // Zero-pad if needed
  const input = new Float32Array(n);
  for (let i = 0; i < Math.min(samples.length, n); i++) {
    input[i] = samples[i];
  }

  // Apply Hanning window to reduce spectral leakage
  for (let i = 0; i < n; i++) {
    input[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }

  // Real and imaginary parts
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  // Copy input to real part
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

  // Compute magnitudes (normalized to 0-1)
  let maxMag = 0;
  for (let i = 0; i < n / 2; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    magnitudes[i] = mag;
    if (mag > maxMag) maxMag = mag;
  }

  // Normalize
  if (maxMag > 0) {
    for (let i = 0; i < n / 2; i++) {
      magnitudes[i] = Math.min(1, magnitudes[i] / (n / 4)); // Normalize with FFT scale factor
    }
  }

  return magnitudes;
}

/**
 * Analyze frequency bands from magnitude spectrum
 * Uses same band boundaries as AudioAnalyzer for consistency
 */
function analyzeBands(magnitudes: Float32Array, binCount: number): {
  amplitude: number;
  bass: number;
  mid: number;
  high: number;
} {
  const len = Math.min(magnitudes.length, binCount);

  let bassSum = 0;
  let midSum = 0;
  let highSum = 0;
  let totalSum = 0;

  for (let i = 0; i < len; i++) {
    const value = magnitudes[i];
    totalSum += value;

    if (i <= BASS_END) {
      bassSum += value;
    } else if (i <= MID_END) {
      midSum += value;
    } else if (i <= HIGH_END) {
      highSum += value;
    }
    // Ignore bins above HIGH_END (>12kHz)
  }

  // Count bins in each band
  const bassCount = BASS_END + 1;                  // 4 bins (0-3)
  const midCount = MID_END - BASS_END;             // 43 bins (4-46)
  const highCount = HIGH_END - MID_END;            // 93 bins (47-139)

  return {
    amplitude: len > 0 ? totalSum / len : 0,
    bass: bassCount > 0 ? bassSum / bassCount : 0,
    mid: midCount > 0 ? midSum / midCount : 0,
    high: highCount > 0 ? highSum / highCount : 0,
  };
}

// ============================================================================
// Web Audio API Implementation (Browser)
// ============================================================================

/**
 * Decode audio using Web Audio API (browser only)
 */
async function decodeAudioBrowser(buffer: ArrayBuffer): Promise<{
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
}> {
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
  await audioContext.close();

  // Get mono channel data (average of all channels)
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const channelData = new Float32Array(length);

  if (channels === 1) {
    channelData.set(audioBuffer.getChannelData(0));
  } else {
    // Mix down to mono
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] += data[i] / channels;
      }
    }
  }

  return {
    channelData,
    sampleRate: audioBuffer.sampleRate,
    duration: audioBuffer.duration,
  };
}

/**
 * Analyze audio using Web Audio API OfflineAudioContext for better performance
 * This processes the entire file through an AnalyserNode in one pass
 */
async function analyzeWithWebAudio(
  buffer: ArrayBuffer,
  fps: number,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<PreAnalysisResult> {
  // Decode audio
  const { channelData, sampleRate, duration } = await decodeAudioBrowser(buffer);

  const totalFrames = Math.ceil(duration * fps);
  const samplesPerFrame = Math.floor(sampleRate / fps);
  const frames: FrameAudioData[] = [];

  // Beat detection state
  const beatCooldownFrames = Math.ceil(BEAT_COOLDOWN_MS / 1000 * fps);
  let framesSinceLastBeat = beatCooldownFrames;
  let previousBass = 0;

  // Process each frame using pure FFT
  for (let frame = 0; frame < totalFrames; frame++) {
    // Check for abort
    if (signal?.aborted) {
      throw new DOMException('Analysis aborted', 'AbortError');
    }

    const sampleStart = frame * samplesPerFrame;
    const sampleEnd = Math.min(sampleStart + FFT_SIZE, channelData.length);
    const actualSamples = sampleEnd - sampleStart;

    if (actualSamples <= 0) {
      // Past end of audio, add silent frame
      frames.push({
        frame,
        time: frame / fps,
        amplitude: 0,
        bass: 0,
        mid: 0,
        high: 0,
        isBeat: false,
      });
      continue;
    }

    // Extract samples for this frame
    const frameSamples = new Float32Array(FFT_SIZE);
    for (let i = 0; i < actualSamples; i++) {
      frameSamples[i] = channelData[sampleStart + i];
    }

    // Compute FFT
    const magnitudes = computeFFT(frameSamples, FFT_SIZE);

    // Analyze bands
    const bands = analyzeBands(magnitudes, FREQUENCY_BIN_COUNT);

    // Beat detection (same algorithm as real-time analyzer)
    framesSinceLastBeat++;
    const isRisingEdge = bands.bass > BEAT_THRESHOLD && previousBass <= BEAT_THRESHOLD;
    const cooldownExpired = framesSinceLastBeat >= beatCooldownFrames;
    const isBeat = isRisingEdge && cooldownExpired;

    if (isBeat) {
      framesSinceLastBeat = 0;
    }

    previousBass = bands.bass;

    frames.push({
      frame,
      time: frame / fps,
      amplitude: bands.amplitude,
      bass: bands.bass,
      mid: bands.mid,
      high: bands.high,
      isBeat,
    });

    // Report progress every 100 frames
    if (frame % 100 === 0 || frame === totalFrames - 1) {
      const percent = Math.round((frame / totalFrames) * 100);
      onProgress?.(percent);

      // Yield to UI thread occasionally
      if (frame % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  return {
    frames,
    totalFrames,
    duration,
    fps,
  };
}

// ============================================================================
// Node.js Implementation
// ============================================================================

/**
 * Parse WAV file header and extract audio data
 * Simple implementation for common WAV formats
 */
function parseWAV(buffer: ArrayBuffer): {
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
} | null {
  const view = new DataView(buffer);

  // Check RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') return null;

  // Check WAVE format
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') return null;

  // Find fmt chunk
  let offset = 12;
  let fmtFound = false;
  let audioFormat = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;

  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
      fmtFound = true;
    }

    if (chunkId === 'data' && fmtFound) {
      // Found data chunk
      const dataOffset = offset + 8;
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = chunkSize / bytesPerSample / numChannels;

      // Convert to mono Float32Array
      const channelData = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        let sample = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          const sampleOffset = dataOffset + (i * numChannels + ch) * bytesPerSample;

          if (bitsPerSample === 16) {
            sample += view.getInt16(sampleOffset, true) / 32768;
          } else if (bitsPerSample === 24) {
            const b0 = view.getUint8(sampleOffset);
            const b1 = view.getUint8(sampleOffset + 1);
            const b2 = view.getInt8(sampleOffset + 2);
            sample += ((b2 << 16) | (b1 << 8) | b0) / 8388608;
          } else if (bitsPerSample === 32 && audioFormat === 3) {
            // Float32
            sample += view.getFloat32(sampleOffset, true);
          } else if (bitsPerSample === 8) {
            sample += (view.getUint8(sampleOffset) - 128) / 128;
          }
        }
        channelData[i] = sample / numChannels;
      }

      return {
        channelData,
        sampleRate,
        duration: numSamples / sampleRate,
      };
    }

    offset += 8 + chunkSize;
    // Ensure even byte alignment
    if (chunkSize % 2 !== 0) offset++;
  }

  return null;
}

/**
 * Analyze audio in Node.js environment using pure FFT
 */
async function analyzeInNode(
  buffer: ArrayBuffer,
  fps: number,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<PreAnalysisResult> {
  // Try to parse as WAV first
  const wavData = parseWAV(buffer);

  if (!wavData) {
    throw new Error(
      'PreAnalyzer: Cannot decode audio in Node.js. ' +
      'Only WAV files are supported server-side. ' +
      'For MP3/other formats, pre-analyze in browser or convert to WAV first.'
    );
  }

  const { channelData, sampleRate, duration } = wavData;
  const totalFrames = Math.ceil(duration * fps);
  const samplesPerFrame = Math.floor(sampleRate / fps);
  const frames: FrameAudioData[] = [];

  // Beat detection state
  const beatCooldownFrames = Math.ceil(BEAT_COOLDOWN_MS / 1000 * fps);
  let framesSinceLastBeat = beatCooldownFrames;
  let previousBass = 0;

  // Process each frame
  for (let frame = 0; frame < totalFrames; frame++) {
    // Check for abort
    if (signal?.aborted) {
      throw new DOMException('Analysis aborted', 'AbortError');
    }

    const sampleStart = frame * samplesPerFrame;
    const sampleEnd = Math.min(sampleStart + FFT_SIZE, channelData.length);
    const actualSamples = sampleEnd - sampleStart;

    if (actualSamples <= 0) {
      frames.push({
        frame,
        time: frame / fps,
        amplitude: 0,
        bass: 0,
        mid: 0,
        high: 0,
        isBeat: false,
      });
      continue;
    }

    // Extract samples
    const frameSamples = new Float32Array(FFT_SIZE);
    for (let i = 0; i < actualSamples; i++) {
      frameSamples[i] = channelData[sampleStart + i];
    }

    // Compute FFT
    const magnitudes = computeFFT(frameSamples, FFT_SIZE);

    // Analyze bands
    const bands = analyzeBands(magnitudes, FREQUENCY_BIN_COUNT);

    // Beat detection
    framesSinceLastBeat++;
    const isRisingEdge = bands.bass > BEAT_THRESHOLD && previousBass <= BEAT_THRESHOLD;
    const cooldownExpired = framesSinceLastBeat >= beatCooldownFrames;
    const isBeat = isRisingEdge && cooldownExpired;

    if (isBeat) {
      framesSinceLastBeat = 0;
    }

    previousBass = bands.bass;

    frames.push({
      frame,
      time: frame / fps,
      amplitude: bands.amplitude,
      bass: bands.bass,
      mid: bands.mid,
      high: bands.high,
      isBeat,
    });

    // Report progress every 100 frames
    if (frame % 100 === 0 || frame === totalFrames - 1) {
      const percent = Math.round((frame / totalFrames) * 100);
      onProgress?.(percent);
    }
  }

  return {
    frames,
    totalFrames,
    duration,
    fps,
  };
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize pre-analyzed frames so audio levels use the full 0-1 range.
 * Finds the peak value of each band and scales all frames proportionally.
 * This ensures consistent visual reactivity regardless of source loudness.
 */
function normalizeFrames(frames: FrameAudioData[]): void {
  if (frames.length === 0) return;

  // Find peak values for each band
  let peakAmplitude = 0;
  let peakBass = 0;
  let peakMid = 0;
  let peakHigh = 0;

  for (const frame of frames) {
    if (frame.amplitude > peakAmplitude) peakAmplitude = frame.amplitude;
    if (frame.bass > peakBass) peakBass = frame.bass;
    if (frame.mid > peakMid) peakMid = frame.mid;
    if (frame.high > peakHigh) peakHigh = frame.high;
  }

  // Only normalize if peaks are significantly below 1.0
  // Use 0.95 as target peak to leave headroom
  const targetPeak = 0.95;
  const minPeakForNorm = 0.01; // Don't normalize near-silence

  const ampScale = peakAmplitude > minPeakForNorm ? targetPeak / peakAmplitude : 1;
  const bassScale = peakBass > minPeakForNorm ? targetPeak / peakBass : 1;
  const midScale = peakMid > minPeakForNorm ? targetPeak / peakMid : 1;
  const highScale = peakHigh > minPeakForNorm ? targetPeak / peakHigh : 1;

  // Apply scaling
  for (const frame of frames) {
    frame.amplitude = Math.min(1, frame.amplitude * ampScale);
    frame.bass = Math.min(1, frame.bass * bassScale);
    frame.mid = Math.min(1, frame.mid * midScale);
    frame.high = Math.min(1, frame.high * highScale);
  }
}

// ============================================================================
// PreAnalyzer Class
// ============================================================================

export class PreAnalyzer {
  private cancelled = false;

  /**
   * Analyze an audio file and generate per-frame audio data
   *
   * @param audioBuffer - Audio data as ArrayBuffer (MP3/WAV in browser, WAV only in Node.js)
   * @param options - Analysis options (fps, callbacks, caching)
   * @returns Promise resolving to PreAnalysisResult with frame-by-frame audio data
   */
  async analyze(
    audioBuffer: ArrayBuffer,
    options: PreAnalyzeOptions = {}
  ): Promise<PreAnalysisResult> {
    const { fps = 30, onProgress, signal, useCache = true } = options;

    // Check for abort
    if (signal?.aborted) {
      throw new DOMException('Analysis aborted', 'AbortError');
    }

    // Reset state
    this.cancelled = false;

    // Generate cache key
    const cacheKey = `preanalysis_${hashBuffer(audioBuffer)}_${fps}`;

    // Check cache first (browser only)
    if (useCache && isIndexedDBAvailable()) {
      const cached = await getCached(cacheKey);
      if (cached) {
        onProgress?.(100);
        return cached;
      }
    }

    // Create abort handler
    const checkAbort = () => {
      if (signal?.aborted || this.cancelled) {
        throw new DOMException('Analysis aborted', 'AbortError');
      }
    };

    let result: PreAnalysisResult;

    // Use appropriate implementation based on environment
    if (isBrowser()) {
      result = await analyzeWithWebAudio(audioBuffer, fps, onProgress, signal);
    } else {
      result = await analyzeInNode(audioBuffer, fps, onProgress, signal);
    }

    checkAbort();

    // Normalize audio levels so the peak amplitude reaches ~1.0
    // This ensures consistent visual reactivity regardless of audio loudness
    normalizeFrames(result.frames);

    // Cache result (browser only)
    if (useCache && isIndexedDBAvailable()) {
      await setCache(cacheKey, result);
    }

    onProgress?.(100);
    return result;
  }

  /**
   * Analyze audio from a URL (browser only)
   */
  async analyzeFromUrl(
    url: string,
    options: PreAnalyzeOptions = {}
  ): Promise<PreAnalysisResult> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return this.analyze(buffer, options);
  }

  /**
   * Analyze audio from a File object (browser only)
   */
  async analyzeFromFile(
    file: File,
    options: PreAnalyzeOptions = {}
  ): Promise<PreAnalysisResult> {
    const buffer = await file.arrayBuffer();
    return this.analyze(buffer, options);
  }

  /**
   * Cancel ongoing analysis
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Get frame audio data for a specific frame
   * Useful for seeking/previewing specific points in the audio
   */
  getFrameData(result: PreAnalysisResult, frame: number): FrameAudioData | null {
    if (frame < 0 || frame >= result.totalFrames) {
      return null;
    }
    return result.frames[frame];
  }

  /**
   * Get frame audio data for a specific time
   */
  getFrameDataAtTime(result: PreAnalysisResult, time: number): FrameAudioData | null {
    const frame = Math.floor(time * result.fps);
    return this.getFrameData(result, frame);
  }

  /**
   * Extract a range of frames (useful for preview segments)
   */
  getFrameRange(
    result: PreAnalysisResult,
    startFrame: number,
    endFrame: number
  ): FrameAudioData[] {
    const start = Math.max(0, startFrame);
    const end = Math.min(result.totalFrames, endFrame);
    return result.frames.slice(start, end);
  }

  /**
   * Get beat frames only (useful for visualization/debugging)
   */
  getBeatFrames(result: PreAnalysisResult): FrameAudioData[] {
    return result.frames.filter(f => f.isBeat);
  }

  /**
   * Calculate average levels over the entire audio
   */
  getAverageLevels(result: PreAnalysisResult): {
    amplitude: number;
    bass: number;
    mid: number;
    high: number;
    beatCount: number;
    beatsPerMinute: number;
  } {
    if (result.frames.length === 0) {
      return { amplitude: 0, bass: 0, mid: 0, high: 0, beatCount: 0, beatsPerMinute: 0 };
    }

    let amplitudeSum = 0;
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let beatCount = 0;

    for (const frame of result.frames) {
      amplitudeSum += frame.amplitude;
      bassSum += frame.bass;
      midSum += frame.mid;
      highSum += frame.high;
      if (frame.isBeat) beatCount++;
    }

    const count = result.frames.length;

    return {
      amplitude: amplitudeSum / count,
      bass: bassSum / count,
      mid: midSum / count,
      high: highSum / count,
      beatCount,
      beatsPerMinute: result.duration > 0 ? (beatCount / result.duration) * 60 : 0,
    };
  }
}

// Export singleton for convenience (matches AudioAnalyzer pattern)
export const preAnalyzer = new PreAnalyzer();
