/**
 * StereoStacker - Combines left/right eye frames into Top/Bottom format
 *
 * Creates YouTube VR-compatible Top/Bottom (Over/Under) stereo layout
 * with left eye on top and right eye on bottom.
 *
 * Phase 3, Plan 03-05
 */

import { CapturedFrame } from './FrameCapture';
import { StereoFramePair } from './StereoCapture';

/**
 * Maximum combined frame size (YouTube VR limit)
 */
export const MAX_STEREO_SIZE = 8192;

/**
 * Warning threshold for large frames
 */
export const WARN_MEMORY_THRESHOLD = 256 * 1024 * 1024; // 256MB

export class StereoStacker {
  /**
   * Stack left/right frames into Top/Bottom format
   *
   * YouTube VR specification:
   * - Top/Bottom (Over/Under) layout
   * - Left eye on TOP
   * - Right eye on BOTTOM
   * - Final height = 2 * input height
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

    // Create combined buffer
    const combinedData = new Uint8Array(width * combinedHeight * 4);

    // Copy left eye to top half
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
   * Stack frames with alternative Left/Right layout
   *
   * Creates side-by-side stereo (not commonly used for 360 but available)
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

    const combinedData = new Uint8Array(combinedWidth * height * 4);

    // Copy left eye to left half, right eye to right half
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
   * Validate stereo frame pair
   */
  static validate(stereo: StereoFramePair): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!stereo.left || !stereo.right) {
      errors.push('Both left and right frames are required');
    }

    if (stereo.left.width !== stereo.right.width) {
      errors.push(`Width mismatch: ${stereo.left.width} vs ${stereo.right.width}`);
    }

    if (stereo.left.height !== stereo.right.height) {
      errors.push(`Height mismatch: ${stereo.left.height} vs ${stereo.right.height}`);
    }

    // Check equirectangular aspect ratio (should be 2:1)
    const aspectRatio = stereo.left.width / stereo.left.height;
    if (Math.abs(aspectRatio - 2) > 0.01) {
      errors.push(
        `Unexpected aspect ratio: ${aspectRatio.toFixed(2)}:1 (expected 2:1 for equirectangular)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get memory requirements for a stereo frame at given resolution
   */
  static getMemoryRequirements(width: number, height: number): {
    perEye: number;
    combined: number;
    humanReadable: string;
  } {
    const perEye = width * height * 4;
    const combined = width * height * 2 * 4; // Top/Bottom doubles height

    return {
      perEye,
      combined,
      humanReadable: `${(combined / 1024 / 1024).toFixed(1)}MB per frame`,
    };
  }
}
