/**
 * SceneStepper - Deterministic scene state advancement for offline rendering
 *
 * Advances the scene to any frame with reproducible results.
 * Uses fixed-seed random for particle positions and deterministic time stepping.
 *
 * Key features:
 * - Fixed time delta (1/fps) instead of real clock for determinism
 * - Seeded random number generator for reproducible particle behavior
 * - Audio data injection per frame
 * - State snapshot/restore for seeking
 * - Progress callbacks for long renders
 *
 * Phase 3, Plan 03-02/03-03
 */

import { FrameAudioData } from '@/types/index';

/**
 * Seeded random number generator for reproducible particle behavior
 * Uses a simple LCG (Linear Congruential Generator)
 *
 * This is essential for deterministic rendering - particles will spawn
 * at the same positions and with the same velocities given the same seed.
 */
export class SeededRandom {
  private seed: number;
  private initialSeed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  constructor(seed: number = 42) {
    this.initialSeed = seed >>> 0;
    this.seed = this.initialSeed;
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
   * Get random integer in range [min, max] inclusive
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Get random item from array
   */
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Reset to initial seed
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.initialSeed = seed >>> 0;
    }
    this.seed = this.initialSeed;
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

  /**
   * Create a copy with current state
   */
  clone(): SeededRandom {
    const copy = new SeededRandom(this.initialSeed);
    copy.seed = this.seed;
    return copy;
  }
}

/**
 * Interface for components that can be stepped deterministically
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
 * Snapshot of SceneStepper state for seeking
 */
export interface SceneStepperSnapshot {
  frameNumber: number;
  rngState: number;
  time: number;
}

/**
 * Configuration for SceneStepper
 */
export interface SceneStepperConfig {
  fps: number;
  seed?: number;
  onFrameStep?: (frame: number, audioData: FrameAudioData, deltaTime: number) => void;
}

/**
 * SceneStepper coordinates deterministic scene advancement for offline rendering.
 *
 * The key insight is that we use fixed time deltas (1/fps) instead of real clock time.
 * This ensures that the same frame number always produces the same visual output.
 */
export class SceneStepper {
  private fps: number;
  private frameDuration: number;
  private rng: SeededRandom;
  private initialSeed: number;
  private currentFrame: number = 0;

  // Checkpoints for faster seeking (every N frames)
  private checkpoints: Map<number, SceneStepperSnapshot> = new Map();
  private checkpointInterval: number = 300; // Checkpoint every 300 frames (10s at 30fps)

  // Callbacks for updating visual state
  private onUpdateVisualState?: (audioData: FrameAudioData) => void;
  private onFrameStep?: (frame: number, audioData: FrameAudioData, deltaTime: number) => void;

  constructor(fps: number, seed: number = 42) {
    this.fps = fps;
    this.frameDuration = 1 / fps;
    this.initialSeed = seed;
    this.rng = new SeededRandom(seed);
  }

  /**
   * Create from config object
   */
  static fromConfig(config: SceneStepperConfig): SceneStepper {
    const stepper = new SceneStepper(config.fps, config.seed ?? 42);
    if (config.onFrameStep) {
      stepper.setFrameStepCallback(config.onFrameStep);
    }
    return stepper;
  }

  /**
   * Set callback for updating visual store state
   */
  setVisualStateUpdater(callback: (audioData: FrameAudioData) => void): void {
    this.onUpdateVisualState = callback;
  }

  /**
   * Set callback for each frame step
   */
  setFrameStepCallback(callback: (frame: number, audioData: FrameAudioData, deltaTime: number) => void): void {
    this.onFrameStep = callback;
  }

  /**
   * Step scene to a specific frame with audio data from pre-analysis
   *
   * @param targetFrame - Frame number to step to
   * @param audioData - Audio data for this frame
   */
  stepToFrame(targetFrame: number, audioData: FrameAudioData): void {
    // If going backwards, find nearest checkpoint or reset
    if (targetFrame < this.currentFrame) {
      const checkpoint = this.findNearestCheckpoint(targetFrame);
      if (checkpoint) {
        this.restoreFromSnapshot(checkpoint);
      } else {
        this.reset();
      }
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
   * Step through multiple frames with corresponding audio data array
   * More efficient for sequential rendering
   */
  stepSequence(
    audioDataArray: FrameAudioData[],
    startFrame: number = 0,
    endFrame?: number
  ): void {
    const end = endFrame ?? audioDataArray.length;

    // Reset if needed
    if (startFrame !== this.currentFrame) {
      this.stepToFrame(startFrame, audioDataArray[startFrame]);
      return; // stepToFrame already stepped the first frame
    }

    // Step through remaining frames
    for (let frame = startFrame; frame < end; frame++) {
      this.stepSingleFrame(audioDataArray[frame]);
    }
  }

  /**
   * Step forward by one frame
   */
  private stepSingleFrame(audioData: FrameAudioData): void {
    // Create checkpoint if at interval
    if (this.currentFrame > 0 && this.currentFrame % this.checkpointInterval === 0) {
      this.checkpoints.set(this.currentFrame, this.createSnapshot());
    }

    // Update visual state with audio data
    if (this.onUpdateVisualState) {
      this.onUpdateVisualState(audioData);
    }

    // Call frame step callback
    if (this.onFrameStep) {
      this.onFrameStep(this.currentFrame, audioData, this.frameDuration);
    }

    this.currentFrame++;
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot(): SceneStepperSnapshot {
    return {
      frameNumber: this.currentFrame,
      rngState: this.rng.getState(),
      time: this.currentFrame * this.frameDuration,
    };
  }

  /**
   * Restore from a snapshot
   */
  restoreFromSnapshot(snapshot: SceneStepperSnapshot): void {
    this.currentFrame = snapshot.frameNumber;
    this.rng.setState(snapshot.rngState);
  }

  /**
   * Find the nearest checkpoint at or before the target frame
   */
  private findNearestCheckpoint(targetFrame: number): SceneStepperSnapshot | null {
    let best: SceneStepperSnapshot | null = null;
    let bestFrame = -1;

    this.checkpoints.forEach((snapshot, frame) => {
      if (frame <= targetFrame && frame > bestFrame) {
        best = snapshot;
        bestFrame = frame;
      }
    });

    return best;
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
   * Set checkpoint interval (frames between checkpoints)
   */
  setCheckpointInterval(frames: number): void {
    this.checkpointInterval = frames;
  }

  /**
   * Clear all checkpoints (free memory)
   */
  clearCheckpoints(): void {
    this.checkpoints.clear();
  }

  /**
   * Reset stepper to initial state
   */
  reset(): void {
    this.currentFrame = 0;
    this.rng.reset(this.initialSeed);
    // Keep checkpoints for potential re-seeking
  }

  /**
   * Full reset including checkpoints
   */
  hardReset(): void {
    this.reset();
    this.clearCheckpoints();
  }

  /**
   * Convert frame number to time
   */
  frameToTime(frame: number): number {
    return frame * this.frameDuration;
  }

  /**
   * Convert time to frame number
   */
  timeToFrame(time: number): number {
    return Math.floor(time * this.fps);
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

/**
 * Create array of silent audio data for N frames
 */
export function createSilentAudioSequence(totalFrames: number, fps: number): FrameAudioData[] {
  const frames: FrameAudioData[] = [];
  for (let i = 0; i < totalFrames; i++) {
    frames.push(createSilentAudioData(i, fps));
  }
  return frames;
}

/**
 * Deterministic clock that provides consistent time values for Three.js
 * Can be used with useFrame to override the real clock
 */
export class DeterministicClock {
  private time: number = 0;
  private deltaTime: number;
  private elapsedTimeSinceStart: number = 0;

  constructor(fps: number) {
    this.deltaTime = 1 / fps;
  }

  /**
   * Advance the clock by one frame
   */
  tick(): void {
    this.time += this.deltaTime;
    this.elapsedTimeSinceStart += this.deltaTime;
  }

  /**
   * Get current time (same as getElapsedTime for Three.js compatibility)
   */
  getElapsedTime(): number {
    return this.time;
  }

  /**
   * Get delta time (fixed for determinism)
   */
  getDelta(): number {
    return this.deltaTime;
  }

  /**
   * Set time directly (for seeking)
   */
  setTime(time: number): void {
    this.time = time;
  }

  /**
   * Reset clock to zero
   */
  reset(): void {
    this.time = 0;
    this.elapsedTimeSinceStart = 0;
  }

  /**
   * Get time for a specific frame
   */
  getTimeAtFrame(frame: number): number {
    return frame * this.deltaTime;
  }
}

/**
 * Integration helper for R3F useFrame
 * Provides a mock clock state that matches useFrame's expected interface
 */
export interface MockClockState {
  clock: {
    getElapsedTime: () => number;
    getDelta: () => number;
  };
  delta: number;
}

/**
 * Create mock clock state for a specific frame
 */
export function createMockClockState(frame: number, fps: number): MockClockState {
  const time = frame / fps;
  const delta = 1 / fps;

  return {
    clock: {
      getElapsedTime: () => time,
      getDelta: () => delta,
    },
    delta,
  };
}
