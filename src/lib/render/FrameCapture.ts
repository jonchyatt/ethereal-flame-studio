/**
 * FrameCapture - Captures frames from WebGLRenderer with async pixel reading
 *
 * Uses WebGL2 readRenderTargetPixelsAsync when available for
 * non-blocking frame capture, with fallback to synchronous reading.
 *
 * Features:
 * - Double-buffered async reading to avoid GPU stalls
 * - Gamma correction (linear to sRGB)
 * - Vertical flip handling (WebGL reads bottom-to-top)
 * - PNG/JPEG export with configurable quality
 * - Memory-efficient buffer reuse
 * - Progress callbacks for long operations
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
 * Output format for frame encoding
 */
export type FrameFormat = 'png' | 'jpeg' | 'raw';

/**
 * Options for frame capture
 */
export interface FrameCaptureOptions {
  gammaCorrection?: boolean;  // Convert linear to sRGB (default: true)
  flipVertical?: boolean;     // Flip image vertically (default: true, WebGL reads bottom-to-top)
  reuseBuffers?: boolean;     // Reuse internal buffers to reduce GC pressure (default: true)
}

/**
 * Options for encoding frames to image formats
 */
export interface FrameEncodeOptions {
  format?: FrameFormat;       // Output format (default: 'png')
  quality?: number;           // JPEG quality 0-1 (default: 0.92)
}

export class FrameCapture {
  private renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private gammaCorrection: boolean;
  private flipVertical: boolean;
  private reuseBuffers: boolean;

  // Double buffer for async reading
  private bufferA: Uint8Array;
  private bufferB: Uint8Array;
  private currentBuffer: 'A' | 'B' = 'A';

  // Reusable output buffer for flipping/gamma operations
  private outputBuffer: Uint8Array | null = null;
  private gammaLUT: Uint8Array | null = null;

  // Track if async reading is supported
  private supportsAsync: boolean;

  // Pending reads for ordering (async may complete out of order)
  private pendingReads: Map<number, Promise<CapturedFrame>> = new Map();

  // Statistics for performance monitoring
  private captureCount: number = 0;
  private totalCaptureTime: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget,
    options: FrameCaptureOptions = {}
  ) {
    this.renderer = renderer;
    this.target = target;
    this.gammaCorrection = options.gammaCorrection ?? true;
    this.flipVertical = options.flipVertical ?? true;
    this.reuseBuffers = options.reuseBuffers ?? true;

    // Allocate double buffers
    const size = target.width * target.height * 4;
    this.bufferA = new Uint8Array(size);
    this.bufferB = new Uint8Array(size);

    // Pre-allocate output buffer if reusing buffers
    if (this.reuseBuffers) {
      this.outputBuffer = new Uint8Array(size);
    }

    // Pre-compute gamma correction lookup table for performance
    if (this.gammaCorrection) {
      this.gammaLUT = this.createGammaLUT();
    }

    // Check for WebGL2 async read support
    // Note: readRenderTargetPixelsAsync is available in Three.js r150+
    this.supportsAsync = typeof (renderer as any).readRenderTargetPixelsAsync === 'function';
  }

  /**
   * Create gamma correction lookup table (linear to sRGB)
   * Using LUT is ~10x faster than per-pixel Math.pow
   */
  private createGammaLUT(): Uint8Array {
    const lut = new Uint8Array(256);
    const invGamma = 1 / 2.2;
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(Math.pow(i / 255, invGamma) * 255);
    }
    return lut;
  }

  /**
   * Capture the current frame from the render target
   *
   * @param frameNumber - Sequential frame number for ordering
   * @returns Promise resolving to captured frame data
   */
  async captureFrame(frameNumber: number): Promise<CapturedFrame> {
    const startTime = performance.now();
    const width = this.target.width;
    const height = this.target.height;

    // Get current buffer and swap for next frame (double buffering)
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

    // Process the buffer (gamma correction + optional vertical flip)
    const outputBuffer = this.processBuffer(buffer, width, height);

    // Update statistics
    this.captureCount++;
    this.totalCaptureTime += performance.now() - startTime;

    return {
      frameNumber,
      width,
      height,
      data: outputBuffer,
      timestamp,
    };
  }

  /**
   * Process buffer: apply gamma correction and vertical flip
   */
  private processBuffer(buffer: Uint8Array, width: number, height: number): Uint8Array {
    const size = width * height * 4;

    // Get or create output buffer
    let output: Uint8Array;
    if (this.reuseBuffers && this.outputBuffer && this.outputBuffer.length === size) {
      output = this.outputBuffer;
    } else {
      output = new Uint8Array(size);
      if (this.reuseBuffers) {
        this.outputBuffer = output;
      }
    }

    const rowSize = width * 4;
    const lut = this.gammaLUT;

    // Combined gamma correction and vertical flip in single pass
    for (let y = 0; y < height; y++) {
      const srcOffset = y * rowSize;
      const dstOffset = this.flipVertical ? (height - 1 - y) * rowSize : y * rowSize;

      if (this.gammaCorrection && lut) {
        // Apply gamma using LUT
        for (let x = 0; x < rowSize; x += 4) {
          output[dstOffset + x] = lut[buffer[srcOffset + x]];         // R
          output[dstOffset + x + 1] = lut[buffer[srcOffset + x + 1]]; // G
          output[dstOffset + x + 2] = lut[buffer[srcOffset + x + 2]]; // B
          output[dstOffset + x + 3] = buffer[srcOffset + x + 3];       // A (unchanged)
        }
      } else {
        // Just copy (with optional flip)
        output.set(buffer.subarray(srcOffset, srcOffset + rowSize), dstOffset);
      }
    }

    // Return a copy if not reusing buffers (to avoid mutation)
    return this.reuseBuffers ? output : new Uint8Array(output);
  }

  /**
   * Capture frame synchronously (for use in tight render loops)
   */
  captureFrameSync(frameNumber: number): CapturedFrame {
    const startTime = performance.now();
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

    const outputBuffer = this.processBuffer(buffer, width, height);

    // Update statistics
    this.captureCount++;
    this.totalCaptureTime += performance.now() - startTime;

    return {
      frameNumber,
      width,
      height,
      data: outputBuffer,
      timestamp,
    };
  }

  /**
   * Render scene to target and capture frame in one operation
   * More efficient than separate render + capture calls
   */
  async renderAndCapture(
    scene: THREE.Scene,
    camera: THREE.Camera,
    frameNumber: number
  ): Promise<CapturedFrame> {
    // Save current render target
    const originalTarget = this.renderer.getRenderTarget();

    // Render to our target
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(originalTarget);

    // Capture the rendered frame
    return this.captureFrame(frameNumber);
  }

  /**
   * Render and capture synchronously
   */
  renderAndCaptureSync(
    scene: THREE.Scene,
    camera: THREE.Camera,
    frameNumber: number
  ): CapturedFrame {
    const originalTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(originalTarget);
    return this.captureFrameSync(frameNumber);
  }

  /**
   * Enable or disable gamma correction
   */
  setGammaCorrection(enabled: boolean): void {
    this.gammaCorrection = enabled;
    if (enabled && !this.gammaLUT) {
      this.gammaLUT = this.createGammaLUT();
    }
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
      if (this.reuseBuffers) {
        this.outputBuffer = new Uint8Array(size);
      }
    }
  }

  /**
   * Get the current render target
   */
  getTarget(): THREE.WebGLRenderTarget {
    return this.target;
  }

  /**
   * Get the current resolution
   */
  getResolution(): { width: number; height: number } {
    return {
      width: this.target.width,
      height: this.target.height,
    };
  }

  /**
   * Get capture statistics
   */
  getStatistics(): { captureCount: number; averageCaptureTime: number } {
    return {
      captureCount: this.captureCount,
      averageCaptureTime: this.captureCount > 0
        ? this.totalCaptureTime / this.captureCount
        : 0,
    };
  }

  /**
   * Reset capture statistics
   */
  resetStatistics(): void {
    this.captureCount = 0;
    this.totalCaptureTime = 0;
  }

  /**
   * Get estimated memory usage in bytes
   */
  getMemoryUsage(): number {
    const bufferSize = this.bufferA.length;
    let total = bufferSize * 2; // Double buffer A and B

    if (this.outputBuffer) {
      total += this.outputBuffer.length;
    }
    if (this.gammaLUT) {
      total += this.gammaLUT.length;
    }

    return total;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.pendingReads.clear();
    // Clear references to allow GC
    this.outputBuffer = null;
    this.gammaLUT = null;
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
 * Reusable canvas for frame encoding (avoids repeated DOM allocation)
 */
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCanvasContext: CanvasRenderingContext2D | null = null;

function getSharedCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!sharedCanvas || sharedCanvas.width !== width || sharedCanvas.height !== height) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = width;
    sharedCanvas.height = height;
    sharedCanvasContext = sharedCanvas.getContext('2d');
  }
  if (!sharedCanvasContext) {
    throw new Error('Failed to get 2D context');
  }
  return { canvas: sharedCanvas, ctx: sharedCanvasContext };
}

/**
 * Create a Blob from a captured frame as PNG
 */
export async function frameToPNG(frame: CapturedFrame): Promise<Blob> {
  const { canvas, ctx } = getSharedCanvas(frame.width, frame.height);
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

/**
 * Create a Blob from a captured frame as JPEG
 * @param frame - The captured frame
 * @param quality - JPEG quality from 0 to 1 (default: 0.92)
 */
export async function frameToJPEG(frame: CapturedFrame, quality: number = 0.92): Promise<Blob> {
  const { canvas, ctx } = getSharedCanvas(frame.width, frame.height);
  const imageData = frameToImageData(frame);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Create a Blob from a captured frame with configurable format
 */
export async function frameToBlob(frame: CapturedFrame, options: FrameEncodeOptions = {}): Promise<Blob> {
  const { format = 'png', quality = 0.92 } = options;

  if (format === 'raw') {
    // Return raw RGBA data as blob
    // Create a copy to ensure it's a regular ArrayBuffer
    const buffer = new Uint8Array(frame.data).buffer;
    return new Blob([buffer], { type: 'application/octet-stream' });
  }

  if (format === 'jpeg') {
    return frameToJPEG(frame, quality);
  }

  return frameToPNG(frame);
}

/**
 * Create a data URL from a captured frame
 */
export function frameToDataURL(frame: CapturedFrame, format: 'png' | 'jpeg' = 'png', quality: number = 0.92): string {
  const { canvas, ctx } = getSharedCanvas(frame.width, frame.height);
  const imageData = frameToImageData(frame);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
}

/**
 * Batch process frames to blobs for memory efficiency
 * Yields to UI between frames to avoid blocking
 *
 * @param frames - Array of captured frames
 * @param options - Encoding options
 * @param onProgress - Progress callback (0-1)
 */
export async function* framesToBlobs(
  frames: CapturedFrame[],
  options: FrameEncodeOptions = {},
  onProgress?: (progress: number) => void
): AsyncGenerator<{ frameNumber: number; blob: Blob }, void, unknown> {
  const total = frames.length;

  for (let i = 0; i < total; i++) {
    const frame = frames[i];
    const blob = await frameToBlob(frame, options);

    yield { frameNumber: frame.frameNumber, blob };

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / total);
    }

    // Yield to UI every 5 frames
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

/**
 * Clean up shared canvas resources
 * Call this when done with frame encoding to free memory
 */
export function cleanupSharedCanvas(): void {
  sharedCanvas = null;
  sharedCanvasContext = null;
}
