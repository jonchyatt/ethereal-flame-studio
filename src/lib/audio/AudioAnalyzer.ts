/**
 * AudioAnalyzer - Singleton audio analyzer with FFT and beat detection
 *
 * Provides real-time audio analysis with:
 * - FFT-based frequency band separation (bass, mids, treble)
 * - Beat detection using threshold crossing algorithm
 * - Smoothed amplitude values for visual effects
 *
 * Ported from reset-biology-website breathing orb reference code
 */

export class AudioAnalyzerSingleton {
  private static instance: AudioAnalyzerSingleton;

  // Web Audio API components
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private connectedElement: HTMLAudioElement | null = null;

  // Public audio levels (0-1 range)
  public amplitude: number = 0;
  public bass: number = 0;
  public mid: number = 0;
  public high: number = 0;

  // Beat detection parameters (from reference code)
  private readonly bias: number = 0.5; // threshold multiplier
  private readonly timeStep: number = 0.08; // min cooldown between beats (80ms)
  private readonly timeToBeat: number = 0.08; // beat registration time
  private readonly restSmoothTime: number = 0.5; // return to rest time
  private readonly beatScale: number = 1.8; // scale on beat
  private readonly restScale: number = 1.0; // normal scale

  // Beat detection state
  private previousBass: number = 0;
  private lastBeatTime: number = 0;
  public isBeat: boolean = false;
  public currentScale: number = 1.0;
  private timeSinceLastBeat: number = 0;

  private constructor() {}

  public static getInstance(): AudioAnalyzerSingleton {
    if (!AudioAnalyzerSingleton.instance) {
      AudioAnalyzerSingleton.instance = new AudioAnalyzerSingleton();
    }
    return AudioAnalyzerSingleton.instance;
  }

  /**
   * Connect analyzer to an HTML audio element
   * @param audioElement - The audio element to analyze
   */
  public async connect(audioElement: HTMLAudioElement): Promise<void> {
    // Guard against reconnecting to same element
    if (this.connectedElement === audioElement && this.audioContext) {
      console.log('AudioAnalyzer: Already connected to this element');
      return;
    }

    // Disconnect previous connection if exists
    if (this.source) {
      this.disconnect();
    }

    try {
      // Create AudioContext with optimized settings
      this.audioContext = new AudioContext();

      // Create analyser node with 512 FFT size for performance
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6; // Higher = smoother, less jittery

      // Create source from audio element
      this.source = this.audioContext.createMediaElementSource(audioElement);

      // Connect: source -> analyser -> destination
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Allocate data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      const buffer = new ArrayBuffer(bufferLength);
      this.dataArray = new Uint8Array(buffer);

      this.connectedElement = audioElement;

      console.log('AudioAnalyzer: Connected successfully', {
        fftSize: this.analyser.fftSize,
        bufferLength,
        sampleRate: this.audioContext.sampleRate
      });
    } catch (error) {
      console.error('AudioAnalyzer: Failed to connect', error);
      throw error;
    }
  }

  /**
   * Update audio analysis - call this every frame
   * @param deltaTime - Time elapsed since last frame (seconds)
   */
  public update(deltaTime: number): void {
    if (!this.analyser || !this.dataArray) {
      return;
    }

    // Get frequency data from analyser
    this.analyser.getByteFrequencyData(this.dataArray);

    const len = this.dataArray.length; // 256 bins for fftSize=512

    // CORRECT frequency band calculations
    // With 44.1kHz sample rate and 512 FFT: each bin = 44100/512 = 86.1Hz
    // Bin 0 = 0Hz, Bin 1 = 86Hz, Bin 2 = 172Hz, etc.
    const binHz = 86.1; // approximate Hz per bin

    // Sub-bass: 20-60Hz → bins 0-1
    const subBassEnd = 1;
    // Bass: 60-250Hz → bins 1-3
    const bassEnd = 3;
    // Low-mids: 250-500Hz → bins 3-6
    const lowMidEnd = 6;
    // Mids: 500Hz-2kHz → bins 6-23
    const midEnd = 23;
    // High-mids: 2kHz-6kHz → bins 23-70
    const highMidEnd = 70;
    // Highs: 6kHz+ → bins 70+

    // Calculate average amplitude for each band
    let subBassSum = 0;
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;

    for (let i = 0; i < len; i++) {
      const value = this.dataArray[i];
      totalSum += value;

      if (i <= subBassEnd) {
        subBassSum += value;
      } else if (i <= bassEnd) {
        bassSum += value;
      } else if (i <= midEnd) {
        // Combine low-mids and mids
        midSum += value;
      } else if (i <= highMidEnd) {
        // High-mids go to highs
        highSum += value;
      } else {
        highSum += value;
      }
    }

    // Normalize to 0-1 range (255 is max value for Uint8Array)
    const subBassCount = subBassEnd + 1;
    const bassCount = bassEnd - subBassEnd;
    const midCount = midEnd - bassEnd;
    const highCount = len - midEnd;

    const subBass = subBassCount > 0 ? (subBassSum / subBassCount) / 255 : 0;
    const bassLevel = bassCount > 0 ? (bassSum / bassCount) / 255 : 0;
    const midLevel = midCount > 0 ? (midSum / midCount) / 255 : 0;
    const highLevel = highCount > 0 ? (highSum / highCount) / 255 : 0;

    this.amplitude = totalSum / len / 255;
    this.bass = Math.max(subBass, bassLevel); // Combine sub-bass and bass
    this.mid = midLevel;
    this.high = highLevel;

    // Beat detection using threshold crossing algorithm
    this.timeSinceLastBeat += deltaTime;

    // Beat signal uses actual bass frequencies (sub-bass + bass)
    const beatSignal = Math.max(subBass, bassLevel);

    // Low threshold for sensitive beat detection
    const threshold = 0.05;

    // Detect rising edge (beatSignal crosses threshold)
    const isRisingEdge = beatSignal > threshold && this.previousBass <= threshold;

    // Beat cooldown check (prevent double-triggering)
    const cooldownExpired = this.timeSinceLastBeat >= this.timeStep;

    if (isRisingEdge && cooldownExpired) {
      this.isBeat = true;
      this.lastBeatTime = 0;
      this.timeSinceLastBeat = 0;
      this.currentScale = this.beatScale;
    } else {
      // Decay beat flag after timeToBeat
      this.lastBeatTime += deltaTime;
      if (this.lastBeatTime > this.timeToBeat) {
        this.isBeat = false;
      }
    }

    // Smooth scale back to rest using amplitude-based lerp
    const targetScale = this.isBeat ? this.beatScale : this.restScale;
    const smoothFactor = this.amplitude > 0.1
      ? Math.min(1.0, deltaTime / this.restSmoothTime)
      : Math.min(1.0, deltaTime / (this.restSmoothTime * 2)); // Slower decay when quiet

    this.currentScale += (targetScale - this.currentScale) * smoothFactor;

    // Store bass for next frame's rising edge detection
    this.previousBass = beatSignal;
  }

  /**
   * Disconnect and cleanup audio analyzer
   */
  public disconnect(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.connectedElement = null;
    this.dataArray = null;

    // Reset state
    this.amplitude = 0;
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.isBeat = false;
    this.currentScale = 1.0;
    this.previousBass = 0;
    this.lastBeatTime = 0;
    this.timeSinceLastBeat = 0;

    console.log('AudioAnalyzer: Disconnected');
  }

  /**
   * Resume AudioContext if suspended (handles browser autoplay policy)
   */
  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioAnalyzer: AudioContext resumed');
    }
  }

  /**
   * Get current audio levels
   */
  public getLevels() {
    return {
      amplitude: this.amplitude,
      bass: this.bass,
      mid: this.mid,
      high: this.high,
      isBeat: this.isBeat,
      currentScale: this.currentScale
    };
  }
}

// Export singleton instance
export const audioAnalyzer = AudioAnalyzerSingleton.getInstance();
