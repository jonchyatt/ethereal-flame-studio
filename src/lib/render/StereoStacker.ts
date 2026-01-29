/**
 * StereoStacker - Combines left/right eye frames into Top/Bottom format
 *
 * Creates YouTube VR-compatible Top/Bottom (Over/Under) stereo layout
 * with left eye on top and right eye on bottom.
 *
 * Supports 4K and 8K stereo output for VR video export.
 *
 * Phase 3, Plan 03-05
 */

import { CapturedFrame } from './FrameCapture';
import { StereoFramePair } from './StereoCapture';

/**
 * YouTube VR maximum frame size
 */
export const MAX_STEREO_SIZE = 8192;

/**
 * Memory warning threshold (256MB)
 */
export const WARN_MEMORY_THRESHOLD = 256 * 1024 * 1024;

/**
 * Standard stereo resolution configurations
 */
export const STEREO_RESOLUTIONS = {
  /**
   * 4K Stereo (4096x4096 combined)
   * Per-eye: 4096x2048
   */
  '4K': {
    perEyeWidth: 4096,
    perEyeHeight: 2048,
    combinedWidth: 4096,
    combinedHeight: 4096,
    memoryPerFrame: 4096 * 4096 * 4, // ~67MB
  },
  /**
   * 5K Stereo (5120x5120 combined)
   * Per-eye: 5120x2560
   */
  '5K': {
    perEyeWidth: 5120,
    perEyeHeight: 2560,
    combinedWidth: 5120,
    combinedHeight: 5120,
    memoryPerFrame: 5120 * 5120 * 4, // ~105MB
  },
  /**
   * 6K Stereo (6144x6144 combined)
   * Per-eye: 6144x3072
   */
  '6K': {
    perEyeWidth: 6144,
    perEyeHeight: 3072,
    combinedWidth: 6144,
    combinedHeight: 6144,
    memoryPerFrame: 6144 * 6144 * 4, // ~151MB
  },
  /**
   * 8K Stereo (8192x8192 combined)
   * Per-eye: 8192x4096
   * Maximum YouTube VR resolution
   */
  '8K': {
    perEyeWidth: 8192,
    perEyeHeight: 4096,
    combinedWidth: 8192,
    combinedHeight: 8192,
    memoryPerFrame: 8192 * 8192 * 4, // ~268MB
  },
};

export type StereoResolutionPreset = keyof typeof STEREO_RESOLUTIONS;

/**
 * Stacking layout options
 */
export type StackingLayout = 'top-bottom' | 'left-right';

/**
 * Validation result for stereo frame pairs
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Memory requirements for stereo processing
 */
export interface MemoryRequirements {
  perEye: number;
  combined: number;
  humanReadable: string;
  exceedsWarningThreshold: boolean;
}

/**
 * StereoStacker - Combines stereo frame pairs into VR-compatible formats
 */
export class StereoStacker {
  // Reusable buffer for stacking operations (avoid allocations)
  private combinedBuffer: Uint8Array | null = null;
  private lastCombinedSize: number = 0;

  /**
   * Stack left/right frames into Top/Bottom format
   *
   * YouTube VR specification:
   * - Top/Bottom (Over/Under) layout
   * - Left eye on TOP
   * - Right eye on BOTTOM
   * - Final aspect ratio: 1:1 (width x 2*height)
   *
   * @param stereo - Stereo frame pair with left and right views
   * @returns Combined frame with left on top, right on bottom
   */
  stackTopBottom(stereo: StereoFramePair): CapturedFrame {
    const { left, right } = stereo;

    // Validate dimensions match
    if (left.width !== right.width || left.height !== right.height) {
      throw new Error(
        `Stereo frame dimensions must match. ` +
        `Left: ${left.width}x${left.height}, Right: ${right.width}x${right.height}`
      );
    }

    const width = left.width;
    const height = left.height;
    const combinedHeight = height * 2;

    // Check for YouTube limit
    if (width > MAX_STEREO_SIZE || combinedHeight > MAX_STEREO_SIZE) {
      console.warn(
        `Stereo frame exceeds YouTube VR limit of ${MAX_STEREO_SIZE}x${MAX_STEREO_SIZE}. ` +
        `Combined size: ${width}x${combinedHeight}`
      );
    }

    // Calculate memory usage
    const memoryUsage = width * combinedHeight * 4;
    if (memoryUsage > WARN_MEMORY_THRESHOLD) {
      console.warn(
        `Large stereo frame: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB per frame. ` +
        `Ensure sufficient memory available.`
      );
    }

    // Reuse or create combined buffer
    const combinedData = this.getCombinedBuffer(width * combinedHeight * 4);

    // Copy left eye to top half (YouTube expects left eye on top)
    combinedData.set(left.data, 0);

    // Copy right eye to bottom half
    combinedData.set(right.data, left.data.length);

    return {
      frameNumber: left.frameNumber,
      width,
      height: combinedHeight,
      data: combinedData,
      timestamp: performance.now(),
    };
  }

  /**
   * Stack frames with Left/Right (Side-by-Side) layout
   *
   * Creates side-by-side stereo (less common for 360 but available)
   * Left eye on LEFT, Right eye on RIGHT
   */
  stackLeftRight(stereo: StereoFramePair): CapturedFrame {
    const { left, right } = stereo;

    if (left.width !== right.width || left.height !== right.height) {
      throw new Error('Stereo frame dimensions must match');
    }

    const width = left.width;
    const height = left.height;
    const combinedWidth = width * 2;
    const rowSize = width * 4;

    const combinedData = this.getCombinedBuffer(combinedWidth * height * 4);

    // Interleave rows: left pixels | right pixels
    for (let y = 0; y < height; y++) {
      const srcOffset = y * rowSize;
      const dstOffset = y * combinedWidth * 4;

      // Left eye to left half
      combinedData.set(
        left.data.subarray(srcOffset, srcOffset + rowSize),
        dstOffset
      );

      // Right eye to right half
      combinedData.set(
        right.data.subarray(srcOffset, srcOffset + rowSize),
        dstOffset + rowSize
      );
    }

    return {
      frameNumber: left.frameNumber,
      width: combinedWidth,
      height,
      data: combinedData,
      timestamp: performance.now(),
    };
  }

  /**
   * Stack frames using specified layout
   */
  stack(stereo: StereoFramePair, layout: StackingLayout = 'top-bottom'): CapturedFrame {
    switch (layout) {
      case 'top-bottom':
        return this.stackTopBottom(stereo);
      case 'left-right':
        return this.stackLeftRight(stereo);
      default:
        throw new Error(`Unknown stacking layout: ${layout}`);
    }
  }

  /**
   * Get or create a reusable buffer for stacking
   * Returns a NEW array each time to avoid data corruption
   */
  private getCombinedBuffer(size: number): Uint8Array {
    // Always return a new buffer to avoid sharing between frames
    return new Uint8Array(size);
  }

  /**
   * Pre-allocate buffer for known size (performance optimization)
   */
  preallocateBuffer(preset: StereoResolutionPreset): void {
    const config = STEREO_RESOLUTIONS[preset];
    this.lastCombinedSize = config.memoryPerFrame;
    this.combinedBuffer = new Uint8Array(this.lastCombinedSize);
  }

  /**
   * Validate stereo frame pair
   */
  static validate(stereo: StereoFramePair): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check frames exist
    if (!stereo.left) {
      errors.push('Left frame is missing');
    }
    if (!stereo.right) {
      errors.push('Right frame is missing');
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Check dimensions match
    if (stereo.left.width !== stereo.right.width) {
      errors.push(`Width mismatch: ${stereo.left.width} vs ${stereo.right.width}`);
    }

    if (stereo.left.height !== stereo.right.height) {
      errors.push(`Height mismatch: ${stereo.left.height} vs ${stereo.right.height}`);
    }

    // Check equirectangular aspect ratio (should be 2:1)
    const aspectRatio = stereo.left.width / stereo.left.height;
    if (Math.abs(aspectRatio - 2) > 0.01) {
      warnings.push(
        `Unexpected aspect ratio: ${aspectRatio.toFixed(2)}:1 (expected 2:1 for equirectangular)`
      );
    }

    // Check for known resolution presets
    const isKnownPreset = Object.values(STEREO_RESOLUTIONS).some(
      preset => preset.perEyeWidth === stereo.left.width && preset.perEyeHeight === stereo.left.height
    );
    if (!isKnownPreset) {
      warnings.push(
        `Non-standard resolution: ${stereo.left.width}x${stereo.left.height}. ` +
        `Consider using 4K (4096x2048) or 8K (8192x4096) for best VR compatibility.`
      );
    }

    // Check frame numbers match
    if (stereo.left.frameNumber !== stereo.right.frameNumber) {
      warnings.push(
        `Frame number mismatch: left=${stereo.left.frameNumber}, right=${stereo.right.frameNumber}`
      );
    }

    // Check data buffers are valid
    const expectedSize = stereo.left.width * stereo.left.height * 4;
    if (stereo.left.data.length !== expectedSize) {
      errors.push(
        `Left frame data size mismatch: ${stereo.left.data.length} vs expected ${expectedSize}`
      );
    }
    if (stereo.right.data.length !== expectedSize) {
      errors.push(
        `Right frame data size mismatch: ${stereo.right.data.length} vs expected ${expectedSize}`
      );
    }

    // Check for YouTube VR limits
    const combinedHeight = stereo.left.height * 2;
    if (stereo.left.width > MAX_STEREO_SIZE || combinedHeight > MAX_STEREO_SIZE) {
      warnings.push(
        `Combined resolution ${stereo.left.width}x${combinedHeight} exceeds YouTube VR limit of ${MAX_STEREO_SIZE}x${MAX_STEREO_SIZE}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get memory requirements for a stereo frame at given resolution
   */
  static getMemoryRequirements(width: number, height: number): MemoryRequirements {
    const perEye = width * height * 4;
    const combined = width * height * 2 * 4; // Top/Bottom doubles height

    return {
      perEye,
      combined,
      humanReadable: `${(combined / 1024 / 1024).toFixed(1)}MB per frame`,
      exceedsWarningThreshold: combined > WARN_MEMORY_THRESHOLD,
    };
  }

  /**
   * Get memory requirements for a preset
   */
  static getPresetMemoryRequirements(preset: StereoResolutionPreset): MemoryRequirements {
    const config = STEREO_RESOLUTIONS[preset];
    return this.getMemoryRequirements(config.perEyeWidth, config.perEyeHeight);
  }

  /**
   * Calculate total memory for video export
   */
  static calculateExportMemory(
    preset: StereoResolutionPreset,
    durationSeconds: number,
    fps: number = 30,
    bufferFrames: number = 60
  ): {
    perFrame: number;
    bufferMemory: number;
    totalFrames: number;
    totalMemory: number;
    humanReadable: {
      buffer: string;
      total: string;
    };
  } {
    const config = STEREO_RESOLUTIONS[preset];
    const perFrame = config.memoryPerFrame;
    const totalFrames = Math.ceil(durationSeconds * fps);
    const totalMemory = perFrame * totalFrames;
    const bufferMemory = perFrame * bufferFrames;

    return {
      perFrame,
      bufferMemory,
      totalFrames,
      totalMemory,
      humanReadable: {
        buffer: `${(bufferMemory / 1024 / 1024).toFixed(1)}MB (${bufferFrames} frames)`,
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB (${totalFrames} frames)`,
      },
    };
  }

  /**
   * Get the recommended resolution preset based on available memory
   */
  static getRecommendedPreset(availableMemoryMB: number): StereoResolutionPreset {
    // Need at least 2 seconds of buffer (60 frames at 30fps)
    const bufferFrames = 60;

    // Check each preset from highest to lowest
    const presets: StereoResolutionPreset[] = ['8K', '6K', '5K', '4K'];

    for (const preset of presets) {
      const config = STEREO_RESOLUTIONS[preset];
      const bufferMemoryMB = (config.memoryPerFrame * bufferFrames) / 1024 / 1024;

      // Use 80% of available memory as threshold
      if (bufferMemoryMB <= availableMemoryMB * 0.8) {
        return preset;
      }
    }

    return '4K'; // Fallback to lowest
  }

  /**
   * Clean up internal buffers
   */
  dispose(): void {
    this.combinedBuffer = null;
    this.lastCombinedSize = 0;
  }
}

/**
 * Quick validation function
 */
export function validateStereoFrame(stereo: StereoFramePair): boolean {
  return StereoStacker.validate(stereo).valid;
}

/**
 * Get resolution name from dimensions
 */
export function getResolutionName(width: number, height: number): string {
  for (const [name, config] of Object.entries(STEREO_RESOLUTIONS)) {
    if (config.perEyeWidth === width && config.perEyeHeight === height) {
      return name;
    }
  }
  return `${width}x${height}`;
}
