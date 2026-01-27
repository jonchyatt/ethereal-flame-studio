/**
 * PreAnalyzer - Offline audio analysis for frame-accurate rendering
 *
 * Analyzes an entire audio file and generates per-frame audio data
 * for deterministic offline rendering. Uses the same frequency band
 * calculations as AudioAnalyzer for consistency.
 *
 * Phase 3, Plan 03-01
 */

import { FrameAudioData, PreAnalysisResult, PreAnalyzeOptions } from '@/types/index';

// Simple hash function for cache keys
function simpleHash(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hash = 0;
  const step = Math.max(1, Math.floor(view.length / 1000)); // Sample ~1000 bytes for speed
  for (let i = 0; i < view.length; i += step) {
    hash = ((hash << 5) - hash) + view[i];
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// IndexedDB cache for analysis results
const DB_NAME = 'ethereal-flame-preanalysis';
const DB_VERSION = 1;
const STORE_NAME = 'analysis-cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function openDB(): Promise<IDBDatabase> {
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
    // Cache failure is non-fatal
    console.warn('PreAnalyzer: Failed to cache analysis result');
  }
}

/**
 * Analyze audio band from frequency data
 * Reuses the same frequency calculations as AudioAnalyzer for consistency
 */
function analyzeBands(dataArray: Float32Array): {
  amplitude: number;
  bass: number;
  mid: number;
  high: number;
} {
  const len = dataArray.length;

  // Frequency band boundaries (same as AudioAnalyzer)
  // With 44.1kHz sample rate and 512 FFT: each bin = 86.1Hz
  const subBassEnd = 1;
  const bassEnd = 3;
  const midEnd = 23;
  const highMidEnd = 70;

  let subBassSum = 0;
  let bassSum = 0;
  let midSum = 0;
  let highSum = 0;
  let totalSum = 0;

  for (let i = 0; i < len; i++) {
    // Convert from dB to linear (getFloatFrequencyData returns dB)
    // Values typically range from -100 to 0 dB
    const db = dataArray[i];
    const linear = Math.pow(10, db / 20);
    const value = Math.min(1, Math.max(0, linear));

    totalSum += value;

    if (i <= subBassEnd) {
      subBassSum += value;
    } else if (i <= bassEnd) {
      bassSum += value;
    } else if (i <= midEnd) {
      midSum += value;
    } else if (i <= highMidEnd) {
      highSum += value;
    } else {
      highSum += value;
    }
  }

  const subBassCount = subBassEnd + 1;
  const bassCount = bassEnd - subBassEnd;
  const midCount = midEnd - bassEnd;
  const highCount = len - midEnd;

  const subBass = subBassCount > 0 ? subBassSum / subBassCount : 0;
  const bassLevel = bassCount > 0 ? bassSum / bassCount : 0;
  const midLevel = midCount > 0 ? midSum / midCount : 0;
  const highLevel = highCount > 0 ? highSum / highCount : 0;

  return {
    amplitude: len > 0 ? totalSum / len : 0,
    bass: Math.max(subBass, bassLevel),
    mid: midLevel,
    high: highLevel,
  };
}

export class PreAnalyzer {
  private audioContext: OfflineAudioContext | null = null;
  private cancelled = false;

  /**
   * Analyze an audio file and generate per-frame audio data
   *
   * @param audioBuffer - Audio data as ArrayBuffer
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

    // Check cache first
    if (useCache) {
      const cacheKey = `preanalysis_${simpleHash(audioBuffer)}_${fps}`;
      const cached = await getCached(cacheKey);
      if (cached) {
        onProgress?.(100);
        return cached;
      }
    }

    // Reset state
    this.cancelled = false;

    // Create a regular AudioContext to decode the audio
    const decodeContext = new AudioContext();
    const decodedBuffer = await decodeContext.decodeAudioData(audioBuffer.slice(0));
    await decodeContext.close();

    const duration = decodedBuffer.duration;
    const sampleRate = decodedBuffer.sampleRate;
    const totalFrames = Math.ceil(duration * fps);
    const frameDuration = 1 / fps;

    // We'll process in chunks using the decoded buffer directly
    // instead of trying to use OfflineAudioContext (which doesn't work with AnalyserNode properly)
    const frames: FrameAudioData[] = [];

    // Parameters from AudioAnalyzer for beat detection
    const beatThreshold = 0.05;
    const beatCooldownMs = 80;
    const beatCooldownFrames = Math.ceil(beatCooldownMs / 1000 * fps);

    let framesSinceLastBeat = beatCooldownFrames; // Start ready for beat
    let previousBass = 0;

    // Use a temporary AudioContext with AnalyserNode for each chunk
    // This is more accurate than trying to manually compute FFT
    const chunkSize = 100; // Process 100 frames at a time
    const tempContext = new AudioContext();
    const analyser = tempContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0;

    const frequencyData = new Float32Array(analyser.frequencyBinCount);

    // Calculate samples per frame
    const samplesPerFrame = Math.floor(sampleRate / fps);

    // Create mono channel data for analysis
    const channelData = decodedBuffer.getChannelData(0);
    const monoData = channelData;

    // Process each frame
    for (let frame = 0; frame < totalFrames; frame++) {
      // Check for abort
      if (signal?.aborted || this.cancelled) {
        await tempContext.close();
        throw new DOMException('Analysis aborted', 'AbortError');
      }

      // Calculate the sample index for this frame
      const sampleStart = Math.floor(frame * samplesPerFrame);
      const sampleEnd = Math.min(sampleStart + analyser.fftSize, monoData.length);
      const actualSamples = sampleEnd - sampleStart;

      if (actualSamples <= 0) {
        // Past end of audio, add silent frame
        frames.push({
          frame,
          time: frame * frameDuration,
          amplitude: 0,
          bass: 0,
          mid: 0,
          high: 0,
          isBeat: false,
        });
        continue;
      }

      // Create a small buffer for this frame's audio
      const frameBuffer = tempContext.createBuffer(1, analyser.fftSize, sampleRate);
      const frameData = frameBuffer.getChannelData(0);

      // Copy samples, zero-pad if needed
      for (let i = 0; i < analyser.fftSize; i++) {
        if (i < actualSamples) {
          frameData[i] = monoData[sampleStart + i];
        } else {
          frameData[i] = 0;
        }
      }

      // Create a source and connect to analyser
      const source = tempContext.createBufferSource();
      source.buffer = frameBuffer;
      source.connect(analyser);
      source.start();

      // Small delay to let analyser process
      await new Promise(resolve => setTimeout(resolve, 1));

      // Get frequency data
      analyser.getFloatFrequencyData(frequencyData);

      source.stop();
      source.disconnect();

      // Analyze bands
      const bands = analyzeBands(frequencyData);

      // Beat detection
      framesSinceLastBeat++;
      const isRisingEdge = bands.bass > beatThreshold && previousBass <= beatThreshold;
      const cooldownExpired = framesSinceLastBeat >= beatCooldownFrames;
      const isBeat = isRisingEdge && cooldownExpired;

      if (isBeat) {
        framesSinceLastBeat = 0;
      }

      previousBass = bands.bass;

      frames.push({
        frame,
        time: frame * frameDuration,
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

    await tempContext.close();

    const result: PreAnalysisResult = {
      frames,
      totalFrames,
      duration,
      fps,
    };

    // Cache the result
    if (useCache) {
      const cacheKey = `preanalysis_${simpleHash(audioBuffer)}_${fps}`;
      await setCache(cacheKey, result);
    }

    onProgress?.(100);
    return result;
  }

  /**
   * Analyze audio from a URL
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
   * Cancel ongoing analysis
   */
  cancel(): void {
    this.cancelled = true;
  }
}
