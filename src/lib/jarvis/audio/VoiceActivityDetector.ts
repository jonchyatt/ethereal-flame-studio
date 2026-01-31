/**
 * VoiceActivityDetector - Simple VAD using amplitude threshold
 *
 * Detects when speech/voice is present in the audio stream based on
 * amplitude exceeding a threshold. More sophisticated VAD (using
 * spectral analysis or ML) can replace this in the future.
 *
 * Features:
 * - Configurable amplitude threshold
 * - Hysteresis to prevent rapid on/off toggling
 * - Callback for activity state changes
 */

export interface VADConfig {
  /** Amplitude threshold for voice detection (0-1, default: 0.05) */
  threshold?: number;
  /** Time in ms to stay active after falling below threshold (default: 300) */
  holdTime?: number;
  /** Callback when voice activity state changes */
  onActivityChange?: (isActive: boolean) => void;
}

export class VoiceActivityDetector {
  private threshold: number;
  private holdTime: number;
  private onActivityChange?: (isActive: boolean) => void;

  private isActive: boolean = false;
  private lastAboveThreshold: number = 0;

  constructor(config: VADConfig = {}) {
    this.threshold = config.threshold ?? 0.05;
    this.holdTime = config.holdTime ?? 300;
    this.onActivityChange = config.onActivityChange;
  }

  /**
   * Update threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Process an audio level sample
   * Call this every frame with the current RMS amplitude
   * @param level - Normalized amplitude (0-1)
   * @returns true if voice activity is detected
   */
  process(level: number): boolean {
    const now = performance.now();

    if (level >= this.threshold) {
      this.lastAboveThreshold = now;

      if (!this.isActive) {
        this.isActive = true;
        this.onActivityChange?.(true);
      }
    } else {
      // Check if we're past the hold time
      if (this.isActive && now - this.lastAboveThreshold > this.holdTime) {
        this.isActive = false;
        this.onActivityChange?.(false);
      }
    }

    return this.isActive;
  }

  /**
   * Get current activity state
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.isActive = false;
    this.lastAboveThreshold = 0;
  }
}
