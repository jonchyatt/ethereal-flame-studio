/**
 * FrameCapture - Captures frames from WebGLRenderer with async pixel reading
 *
 * Uses WebGL2 readRenderTargetPixelsAsync when available for
 * non-blocking frame capture, with fallback to synchronous reading.
 *
 * Phase 3, Plan 03-02
 */

import * as THREE from 'three';

/**
 * A captured frame with pixel data and metadata
 */
export interface CapturedFrame {
  frameNumber: number;
  width: number;
  height: number;
  data: Uint8Array;
  timestamp: number;
}

/**
 * Options for frame capture
 */
export interface FrameCaptureOptions {
  gammaCorrection?: boolean;  // Convert linear to sRGB (default: true)
}

export class FrameCapture {
  private renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private gammaCorrection: boolean;

  // Double buffer for async reading
  private bufferA: Uint8Array;
  private bufferB: Uint8Array;
  private currentBuffer: 'A' | 'B' = 'A';

  // Track if async reading is supported
  private supportsAsync: boolean;

  // Pending reads for ordering (async may complete out of order)
  private pendingReads: Map<number, Promise<CapturedFrame>> = new Map();

  constructor(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget,
    options: FrameCaptureOptions = {}
  ) {
    this.renderer = renderer;
    this.target = target;
    this.gammaCorrection = options.gammaCorrection ?? true;

    // Allocate double buffers
    const size = target.width * target.height * 4;
    this.bufferA = new Uint8Array(size);
    this.bufferB = new Uint8Array(size);

    // Check for WebGL2 async read support
    // Note: readRenderTargetPixelsAsync is available in Three.js r150+
    this.supportsAsync = typeof (renderer as any).readRenderTargetPixelsAsync === 'function';
  }

  /**
   * Capture the current frame from the render target
   *
   * @param frameNumber - Sequential frame number for ordering
   * @returns Promise resolving to captured frame data
   */
  async captureFrame(frameNumber: number): Promise<CapturedFrame> {
    const width = this.target.width;
    const height = this.target.height;

    // Get current buffer and swap for next frame
    const buffer = this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
    this.currentBuffer = this.currentBuffer === 'A' ? 'B' : 'A';

    const timestamp = performance.now();

    if (this.supportsAsync) {
      // Use async read for non-blocking capture
      try {
        await (this.renderer as any).readRenderTargetPixelsAsync(
          this.target,
          0,
          0,
          width,
          height,
          buffer
        );
      } catch {
        // Fallback to sync if async fails
        this.renderer.readRenderTargetPixels(
          this.target,
          0,
          0,
          width,
          height,
          buffer
        );
      }
    } else {
      // Synchronous read
      this.renderer.readRenderTargetPixels(
        this.target,
        0,
        0,
        width,
        height,
        buffer
      );
    }

    // Apply gamma correction if needed (linear to sRGB)
    let outputBuffer = buffer;
    if (this.gammaCorrection) {
      outputBuffer = this.applyGammaCorrection(buffer);
    }

    // Flip image vertically (WebGL reads bottom-to-top)
    const flippedBuffer = this.flipVertically(outputBuffer, width, height);

    return {
      frameNumber,
      width,
      height,
      data: flippedBuffer,
      timestamp,
    };
  }

  /**
   * Capture frame synchronously (for use in tight render loops)
   */
  captureFrameSync(frameNumber: number): CapturedFrame {
    const width = this.target.width;
    const height = this.target.height;

    const buffer = this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
    this.currentBuffer = this.currentBuffer === 'A' ? 'B' : 'A';

    const timestamp = performance.now();

    this.renderer.readRenderTargetPixels(
      this.target,
      0,
      0,
      width,
      height,
      buffer
    );

    let outputBuffer = buffer;
    if (this.gammaCorrection) {
      outputBuffer = this.applyGammaCorrection(buffer);
    }

    const flippedBuffer = this.flipVertically(outputBuffer, width, height);

    return {
      frameNumber,
      width,
      height,
      data: flippedBuffer,
      timestamp,
    };
  }

  /**
   * Apply gamma correction (linear to sRGB)
   * Three.js renders in linear space, video expects sRGB
   */
  private applyGammaCorrection(buffer: Uint8Array): Uint8Array {
    const output = new Uint8Array(buffer.length);
    const invGamma = 1 / 2.2;

    for (let i = 0; i < buffer.length; i += 4) {
      // Apply gamma to RGB, preserve alpha
      output[i] = Math.round(Math.pow(buffer[i] / 255, invGamma) * 255);
      output[i + 1] = Math.round(Math.pow(buffer[i + 1] / 255, invGamma) * 255);
      output[i + 2] = Math.round(Math.pow(buffer[i + 2] / 255, invGamma) * 255);
      output[i + 3] = buffer[i + 3]; // Alpha unchanged
    }

    return output;
  }

  /**
   * Flip image vertically (WebGL reads bottom-to-top)
   */
  private flipVertically(buffer: Uint8Array, width: number, height: number): Uint8Array {
    const output = new Uint8Array(buffer.length);
    const rowSize = width * 4;

    for (let y = 0; y < height; y++) {
      const srcOffset = y * rowSize;
      const dstOffset = (height - 1 - y) * rowSize;
      output.set(buffer.subarray(srcOffset, srcOffset + rowSize), dstOffset);
    }

    return output;
  }

  /**
   * Enable or disable gamma correction
   */
  setGammaCorrection(enabled: boolean): void {
    this.gammaCorrection = enabled;
  }

  /**
   * Check if gamma correction is enabled
   */
  isGammaCorrectionEnabled(): boolean {
    return this.gammaCorrection;
  }

  /**
   * Check if async reading is supported
   */
  supportsAsyncRead(): boolean {
    return this.supportsAsync;
  }

  /**
   * Update the render target (if resolution changes)
   */
  setTarget(target: THREE.WebGLRenderTarget): void {
    this.target = target;

    // Reallocate buffers if size changed
    const size = target.width * target.height * 4;
    if (this.bufferA.length !== size) {
      this.bufferA = new Uint8Array(size);
      this.bufferB = new Uint8Array(size);
    }
  }

  /**
   * Get the current render target
   */
  getTarget(): THREE.WebGLRenderTarget {
    return this.target;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.pendingReads.clear();
    // Buffers will be garbage collected
  }
}

/**
 * Create an ImageData object from a captured frame
 * Useful for canvas operations
 */
export function frameToImageData(frame: CapturedFrame): ImageData {
  // Copy data to ensure we have a proper ArrayBuffer
  const clampedArray = new Uint8ClampedArray(frame.data.length);
  clampedArray.set(frame.data);
  return new ImageData(clampedArray, frame.width, frame.height);
}

/**
 * Create a Blob from a captured frame as PNG
 */
export async function frameToPNG(frame: CapturedFrame): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  const imageData = frameToImageData(frame);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png'
    );
  });
}
