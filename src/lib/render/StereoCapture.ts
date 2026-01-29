/**
 * StereoCapture - Captures stereoscopic 360 content for VR video export
 *
 * Uses StereoCubeCameras for left/right eye capture with IPD offset,
 * converts each to equirectangular, and stacks for YouTube VR format.
 *
 * Phase 3, Plan 03-05
 */

import * as THREE from 'three';
import { StereoCubeCameras, StereoCubeResolution, STEREO_RESOLUTION_MAP, IPD_REFERENCE } from './StereoCubeCameras';
import { EquirectangularConverter } from './EquirectangularConverter';
import { CapturedFrame } from './FrameCapture';
import { CubemapResolution } from './CubemapCapture';

/**
 * Stereo frame pair containing left and right eye views
 */
export interface StereoFramePair {
  left: CapturedFrame;
  right: CapturedFrame;
}

/**
 * Stereo output resolution presets
 */
export const STEREO_PRESETS = {
  /**
   * 4K Stereo (4096x4096 combined)
   * Good for most VR headsets, 35-50Mbps recommended
   */
  '4K': {
    equirectWidth: 4096,
    equirectHeight: 2048,
    combinedWidth: 4096,
    combinedHeight: 4096,
    cubeResolution: 1024 as StereoCubeResolution,
    bitrateRecommended: '35M',
  },
  /**
   * 5K Stereo (5120x5120 combined)
   * Higher quality, 50-60Mbps recommended
   */
  '5K': {
    equirectWidth: 5120,
    equirectHeight: 2560,
    combinedWidth: 5120,
    combinedHeight: 5120,
    cubeResolution: 1280 as StereoCubeResolution,
    bitrateRecommended: '50M',
  },
  /**
   * 6K Stereo (6144x6144 combined)
   * High quality, 60-80Mbps recommended
   */
  '6K': {
    equirectWidth: 6144,
    equirectHeight: 3072,
    combinedWidth: 6144,
    combinedHeight: 6144,
    cubeResolution: 1536 as StereoCubeResolution,
    bitrateRecommended: '60M',
  },
  /**
   * 8K Stereo (8192x8192 combined)
   * Maximum quality for YouTube VR, 100-150Mbps recommended
   */
  '8K': {
    equirectWidth: 8192,
    equirectHeight: 4096,
    combinedWidth: 8192,
    combinedHeight: 8192,
    cubeResolution: 2048 as StereoCubeResolution,
    bitrateRecommended: '100M',
  },
};

export type StereoPreset = keyof typeof STEREO_PRESETS;

/**
 * Options for stereo capture initialization
 */
export interface StereoCaptureOptions {
  /**
   * Interpupillary distance in scene units
   * Default: 0.064 (64mm, standard human IPD)
   * Assumes 1 unit = 1 meter
   */
  ipd?: number;

  /**
   * Cube face resolution (affects quality and VRAM)
   * Will be auto-selected based on output resolution if not specified
   * Accepts both StereoCubeResolution and legacy CubemapResolution
   */
  resolution?: StereoCubeResolution | CubemapResolution;

  /**
   * Preset for common output resolutions
   * If provided, overrides resolution
   */
  preset?: StereoPreset;

  /**
   * Near clipping plane for cube cameras
   * Default: 0.1 (10cm)
   */
  near?: number;

  /**
   * Far clipping plane for cube cameras
   * Default: 1000 (1km)
   */
  far?: number;
}

/**
 * Default IPD in meters (64mm)
 */
export const DEFAULT_IPD = IPD_REFERENCE.VR_DEFAULT_METERS;

/**
 * StereoCapture - Main class for stereoscopic 360 video capture
 */
export class StereoCapture {
  private renderer: THREE.WebGLRenderer;
  private stereoCameras: StereoCubeCameras;
  private equirectConverter: EquirectangularConverter;
  private centerPosition: THREE.Vector3;

  // Cache for output dimensions
  private lastOutputWidth: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    equirectConverter: EquirectangularConverter,
    options: StereoCaptureOptions = {}
  ) {
    this.renderer = renderer;
    this.equirectConverter = equirectConverter;
    this.centerPosition = new THREE.Vector3(0, 0, 0);

    // Determine resolution from preset or options
    let resolution: StereoCubeResolution = options.resolution ?? 2048;
    if (options.preset) {
      resolution = STEREO_PRESETS[options.preset].cubeResolution;
    }

    // Create stereo cube cameras
    this.stereoCameras = new StereoCubeCameras({
      resolution,
      ipd: options.ipd ?? DEFAULT_IPD,
      near: options.near,
      far: options.far,
    });
  }

  /**
   * Capture a stereo frame pair asynchronously
   *
   * @param scene - The scene to capture
   * @param outputWidth - Width of each equirectangular output (height = width/2)
   * @param frameNumber - Frame number for tracking
   * @returns Promise resolving to stereo frame pair
   */
  async captureStereoFrame(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): Promise<StereoFramePair> {
    // Auto-adjust cube resolution if output size changed significantly
    this.autoAdjustResolution(outputWidth);

    // Capture both eye cubemaps
    const { left: leftCubemap, right: rightCubemap } = this.stereoCameras.capture(
      this.renderer,
      scene
    );

    // Convert left eye to equirectangular
    const leftEquirect = await this.equirectConverter.convert(leftCubemap, outputWidth);
    leftEquirect.frameNumber = frameNumber;

    // Convert right eye to equirectangular
    const rightEquirect = await this.equirectConverter.convert(rightCubemap, outputWidth);
    rightEquirect.frameNumber = frameNumber;

    return {
      left: leftEquirect,
      right: rightEquirect,
    };
  }

  /**
   * Capture stereo frame pair synchronously (for tight render loops)
   *
   * @param scene - The scene to capture
   * @param outputWidth - Width of each equirectangular output
   * @param frameNumber - Frame number for tracking
   * @returns Stereo frame pair
   */
  captureStereoFrameSync(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): StereoFramePair {
    // Auto-adjust cube resolution if output size changed
    this.autoAdjustResolution(outputWidth);

    // Capture both eye cubemaps
    const { left: leftCubemap, right: rightCubemap } = this.stereoCameras.capture(
      this.renderer,
      scene
    );

    // Convert to equirectangular synchronously
    const leftEquirect = this.equirectConverter.convertSync(leftCubemap, outputWidth, frameNumber);
    const rightEquirect = this.equirectConverter.convertSync(rightCubemap, outputWidth, frameNumber);

    return {
      left: leftEquirect,
      right: rightEquirect,
    };
  }

  /**
   * Capture only left eye (for preview or debugging)
   */
  captureLeftEye(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): CapturedFrame {
    const leftCubemap = this.stereoCameras.captureLeft(this.renderer, scene);
    return this.equirectConverter.convertSync(leftCubemap, outputWidth, frameNumber);
  }

  /**
   * Capture only right eye (for preview or debugging)
   */
  captureRightEye(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): CapturedFrame {
    const rightCubemap = this.stereoCameras.captureRight(this.renderer, scene);
    return this.equirectConverter.convertSync(rightCubemap, outputWidth, frameNumber);
  }

  /**
   * Auto-adjust cube resolution based on output width
   */
  private autoAdjustResolution(outputWidth: number): void {
    if (outputWidth === this.lastOutputWidth) return;

    this.lastOutputWidth = outputWidth;

    // Find optimal cube resolution for this output width
    const optimalResolution = STEREO_RESOLUTION_MAP[outputWidth];
    if (optimalResolution && optimalResolution !== this.stereoCameras.getResolution()) {
      this.stereoCameras.setResolution(optimalResolution);
    }
  }

  /**
   * Set the interpupillary distance
   * @param ipd - IPD in scene units (typically meters)
   */
  setIPD(ipd: number): void {
    this.stereoCameras.setIPD(ipd);
  }

  /**
   * Get current IPD
   */
  getIPD(): number {
    return this.stereoCameras.getIPD();
  }

  /**
   * Set IPD for scale effects
   * @param scale - Scale factor (1.0 = normal, 0.1 = miniature world)
   */
  setIPDScale(scale: number): void {
    const scaledIPD = DEFAULT_IPD * scale;
    this.stereoCameras.setIPD(scaledIPD);
  }

  /**
   * Set the center position (both cameras offset from here)
   */
  setCenterPosition(position: THREE.Vector3): void {
    this.centerPosition.copy(position);
    this.stereoCameras.setCenterPosition(position);
  }

  /**
   * Get center position
   */
  getCenterPosition(): THREE.Vector3 {
    return this.centerPosition.clone();
  }

  /**
   * Get left eye position
   */
  getLeftEyePosition(): THREE.Vector3 {
    return this.stereoCameras.getLeftPosition();
  }

  /**
   * Get right eye position
   */
  getRightEyePosition(): THREE.Vector3 {
    return this.stereoCameras.getRightPosition();
  }

  /**
   * Set resolution for cube cameras
   * Accepts both StereoCubeResolution and legacy CubemapResolution types
   */
  setResolution(resolution: StereoCubeResolution | CubemapResolution): void {
    // Cast to StereoCubeResolution - both types share 1024, 1536, 2048
    this.stereoCameras.setResolution(resolution as StereoCubeResolution);
  }

  /**
   * Get current resolution
   */
  getResolution(): StereoCubeResolution {
    return this.stereoCameras.getResolution();
  }

  /**
   * Apply a preset configuration
   */
  applyPreset(preset: StereoPreset): void {
    const config = STEREO_PRESETS[preset];
    this.stereoCameras.setResolution(config.cubeResolution);
  }

  /**
   * Get recommended preset for a given output width
   */
  static getRecommendedPreset(outputWidth: number): StereoPreset {
    if (outputWidth >= 8192) return '8K';
    if (outputWidth >= 6144) return '6K';
    if (outputWidth >= 5120) return '5K';
    return '4K';
  }

  /**
   * Get VRAM usage for current configuration
   */
  getVRAMUsage(): {
    cubeTargets: { perEye: number; total: number; humanReadable: string };
    perFrame: { perEye: number; combined: number; humanReadable: string };
  } {
    const cubeUsage = this.stereoCameras.getVRAMUsage();

    // Calculate equirectangular frame size
    const equirectWidth = this.lastOutputWidth || 8192;
    const equirectHeight = equirectWidth / 2;
    const perEyeFrame = equirectWidth * equirectHeight * 4;
    const combinedFrame = perEyeFrame * 2;

    return {
      cubeTargets: cubeUsage,
      perFrame: {
        perEye: perEyeFrame,
        combined: combinedFrame,
        humanReadable: `${(combinedFrame / 1024 / 1024).toFixed(1)}MB per stacked frame`,
      },
    };
  }

  /**
   * Get the underlying StereoCubeCameras instance (for advanced use)
   */
  getStereoCameras(): StereoCubeCameras {
    return this.stereoCameras;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stereoCameras.dispose();
    // Note: equirectConverter is shared, don't dispose here
  }
}

/**
 * Helper to get cube resolution for output width
 */
export function getCubeResolutionForOutput(outputWidth: number): StereoCubeResolution {
  return STEREO_RESOLUTION_MAP[outputWidth] ?? 2048;
}

/**
 * Calculate memory requirements for stereo export
 */
export function calculateStereoMemoryRequirements(
  outputWidth: number,
  durationSeconds: number,
  fps: number = 30
): {
  perFrame: number;
  totalFrames: number;
  totalMemory: number;
  humanReadable: string;
  bufferSeconds: number;
  bufferSize: string;
} {
  const outputHeight = outputWidth / 2;
  const combinedHeight = outputHeight * 2; // Top-bottom stacked
  const perFrame = outputWidth * combinedHeight * 4; // RGBA
  const totalFrames = Math.ceil(durationSeconds * fps);
  const totalMemory = perFrame * totalFrames;

  // Calculate a 2-second buffer size
  const bufferFrames = fps * 2;
  const bufferMemory = perFrame * bufferFrames;

  return {
    perFrame,
    totalFrames,
    totalMemory,
    humanReadable: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB total`,
    bufferSeconds: 2,
    bufferSize: `${(bufferMemory / 1024 / 1024).toFixed(1)}MB for ${bufferFrames} frames`,
  };
}
