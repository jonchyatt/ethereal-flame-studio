/**
 * SceneStepper - Deterministic scene state advancement for offline rendering
 *
 * Advances the scene to any frame with reproducible results.
 * Uses fixed-seed random for particle positions and deterministic time stepping.
 *
 * Phase 3, Plan 03-03
 */

import { FrameAudioData } from '@/types/index';

/**
 * Seeded random number generator for reproducible particle behavior
 * Uses a simple LCG (Linear Congruential Generator)
 */
export class SeededRandom {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  constructor(seed: number = 42) {
    this.seed = seed >>> 0; // Ensure unsigned 32-bit
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Get random number in range [min, max]
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Reset to initial seed
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed >>> 0;
    }
  }

  /**
   * Get current seed state (for saving/restoring)
   */
  getState(): number {
    return this.seed;
  }

  /**
   * Restore seed state
   */
  setState(state: number): void {
    this.seed = state >>> 0;
  }
}

/**
 * Interface for components that can be stepped
 */
export interface Steppable {
  step(deltaTime: number, audioData: FrameAudioData, rng: SeededRandom): void;
  reset(): void;
}

/**
 * Interface for visual store state needed by SceneStepper
 */
export interface VisualStoreState {
  amplitude: number;
  bass: number;
  mid: number;
  high: number;
  isBeat: boolean;
}

/**
 * SceneStepper coordinates deterministic scene advancement
 */
export class SceneStepper {
  private fps: number;
  private frameDuration: number;
  private rng: SeededRandom;
  private initialSeed: number;
  private currentFrame: number = 0;

  // Callbacks for updating visual state
  private onUpdateVisualState?: (audioData: FrameAudioData) => void;

  constructor(fps: number, seed: number = 42) {
    this.fps = fps;
    this.frameDuration = 1 / fps;
    this.initialSeed = seed;
    this.rng = new SeededRandom(seed);
  }

  /**
   * Set callback for updating visual store state
   */
  setVisualStateUpdater(callback: (audioData: FrameAudioData) => void): void {
    this.onUpdateVisualState = callback;
  }

  /**
   * Step scene to a specific frame
   *
   * @param targetFrame - Frame number to step to
   * @param audioData - Audio data for this frame
   */
  stepToFrame(targetFrame: number, audioData: FrameAudioData): void {
    // If going backwards or to a different frame, reset and step forward
    if (targetFrame < this.currentFrame) {
      this.reset();
    }

    // Step frame by frame to maintain determinism
    while (this.currentFrame < targetFrame) {
      // Intermediate frames get silent audio data
      const intermediateAudio: FrameAudioData = {
        frame: this.currentFrame,
        time: this.currentFrame * this.frameDuration,
        amplitude: 0,
        bass: 0,
        mid: 0,
        high: 0,
        isBeat: false,
      };
      this.stepSingleFrame(intermediateAudio);
    }

    // Step the target frame with actual audio data
    this.stepSingleFrame(audioData);
  }

  /**
   * Step forward by one frame
   */
  private stepSingleFrame(audioData: FrameAudioData): void {
    // Update visual state with audio data
    if (this.onUpdateVisualState) {
      this.onUpdateVisualState(audioData);
    }

    this.currentFrame++;
  }

  /**
   * Get the fixed frame duration (for particle updates)
   */
  getFrameDuration(): number {
    return this.frameDuration;
  }

  /**
   * Get current frame number
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get current time in seconds
   */
  getCurrentTime(): number {
    return this.currentFrame * this.frameDuration;
  }

  /**
   * Get the seeded RNG (for particle systems)
   */
  getRNG(): SeededRandom {
    return this.rng;
  }

  /**
   * Get FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Reset stepper to initial state
   */
  reset(): void {
    this.currentFrame = 0;
    this.rng.reset(this.initialSeed);
  }
}

/**
 * Create audio data for a silent frame
 */
export function createSilentAudioData(frame: number, fps: number): FrameAudioData {
  return {
    frame,
    time: frame / fps,
    amplitude: 0,
    bass: 0,
    mid: 0,
    high: 0,
    isBeat: false,
  };
}
