/**
 * StereoCubeCameras - Manages stereoscopic CubeCamera pair for VR 360 capture
 *
 * Two CubeCamera instances positioned at left/right eye positions
 * with configurable interpupillary distance (IPD) for stereoscopic 3D.
 *
 * Phase 3, Plan 03-05
 */

import * as THREE from 'three';

/**
 * Cube face resolution options
 * Higher resolution = better quality but more VRAM
 */
export type StereoCubeResolution = 1024 | 1280 | 1536 | 2048;

/**
 * Resolution mapping for different output formats
 * Equirect width / 4 = optimal cube face size
 */
export const STEREO_RESOLUTION_MAP: Record<number, StereoCubeResolution> = {
  4096: 1024,  // 4K stereo (4096x4096 combined)
  5120: 1280,  // 5K stereo (5120x5120 combined)
  6144: 1536,  // 6K stereo (6144x6144 combined)
  8192: 2048,  // 8K stereo (8192x8192 combined)
};

/**
 * Human IPD statistics for reference
 */
export const IPD_REFERENCE = {
  HUMAN_AVERAGE_MM: 64,      // Average adult IPD
  HUMAN_MIN_MM: 54,          // 5th percentile
  HUMAN_MAX_MM: 74,          // 95th percentile
  VR_DEFAULT_METERS: 0.064,  // Standard VR headset default (64mm)
  CHILDREN_AVG_MM: 56,       // Children 8-12 years
};

/**
 * Options for StereoCubeCameras initialization
 */
export interface StereoCubeCamerasOptions {
  /**
   * Cube face resolution for each eye
   * Default: 2048 (suitable for 8K output)
   */
  resolution?: StereoCubeResolution;

  /**
   * Interpupillary distance in scene units (typically meters)
   * Default: 0.064 (64mm, standard human IPD)
   */
  ipd?: number;

  /**
   * Near clipping plane
   * Default: 0.1 (10cm)
   */
  near?: number;

  /**
   * Far clipping plane
   * Default: 1000 (1km)
   */
  far?: number;
}

/**
 * Stereo cubemap pair result
 */
export interface StereoCubemapPair {
  left: THREE.CubeTexture;
  right: THREE.CubeTexture;
}

/**
 * StereoCubeCameras - Manages two CubeCamera instances for stereo 360 capture
 *
 * Uses left/right eye offset for proper stereoscopic depth perception
 * compatible with YouTube VR and VR headsets.
 */
export class StereoCubeCameras {
  private leftCamera: THREE.CubeCamera;
  private rightCamera: THREE.CubeCamera;
  private leftTarget: THREE.WebGLCubeRenderTarget;
  private rightTarget: THREE.WebGLCubeRenderTarget;

  private _ipd: number;
  private _resolution: StereoCubeResolution;
  private _near: number;
  private _far: number;
  private _centerPosition: THREE.Vector3;

  // Temporary vectors for position calculations (avoid allocations)
  private tempLeft: THREE.Vector3;
  private tempRight: THREE.Vector3;

  constructor(options: StereoCubeCamerasOptions = {}) {
    const {
      resolution = 2048,
      ipd = 0.064,
      near = 0.1,
      far = 1000,
    } = options;

    this._resolution = resolution;
    this._ipd = ipd;
    this._near = near;
    this._far = far;
    this._centerPosition = new THREE.Vector3(0, 0, 0);

    // Pre-allocate temporary vectors
    this.tempLeft = new THREE.Vector3();
    this.tempRight = new THREE.Vector3();

    // Create cube render targets with optimal settings
    this.leftTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false, // Not needed for video export
    });

    this.rightTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    // Create cube cameras
    this.leftCamera = new THREE.CubeCamera(near, far, this.leftTarget);
    this.rightCamera = new THREE.CubeCamera(near, far, this.rightTarget);

    // Position cameras at initial positions
    this.updateCameraPositions();
  }

  /**
   * Update camera positions based on center position and IPD
   *
   * Left eye: center - IPD/2 on X axis
   * Right eye: center + IPD/2 on X axis
   */
  private updateCameraPositions(): void {
    const halfIPD = this._ipd / 2;

    // Left eye position
    this.tempLeft.copy(this._centerPosition);
    this.tempLeft.x -= halfIPD;
    this.leftCamera.position.copy(this.tempLeft);

    // Right eye position
    this.tempRight.copy(this._centerPosition);
    this.tempRight.x += halfIPD;
    this.rightCamera.position.copy(this.tempRight);
  }

  /**
   * Capture both eyes in a single call
   *
   * @param renderer - WebGL renderer to use
   * @param scene - Scene to capture
   * @returns Stereo cubemap pair with left and right textures
   */
  capture(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ): StereoCubemapPair {
    // Update positions before capture (in case they changed)
    this.updateCameraPositions();

    // Capture left eye (renders all 6 faces)
    this.leftCamera.update(renderer, scene);

    // Capture right eye (renders all 6 faces)
    this.rightCamera.update(renderer, scene);

    return {
      left: this.leftTarget.texture,
      right: this.rightTarget.texture,
    };
  }

  /**
   * Capture left eye only
   */
  captureLeft(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ): THREE.CubeTexture {
    this.updateCameraPositions();
    this.leftCamera.update(renderer, scene);
    return this.leftTarget.texture;
  }

  /**
   * Capture right eye only
   */
  captureRight(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ): THREE.CubeTexture {
    this.updateCameraPositions();
    this.rightCamera.update(renderer, scene);
    return this.rightTarget.texture;
  }

  /**
   * Set the center position (both cameras offset from here)
   */
  setCenterPosition(position: THREE.Vector3): void {
    this._centerPosition.copy(position);
    this.updateCameraPositions();
  }

  /**
   * Get current center position
   */
  getCenterPosition(): THREE.Vector3 {
    return this._centerPosition.clone();
  }

  /**
   * Set interpupillary distance
   * @param ipd - IPD in scene units (typically meters)
   */
  setIPD(ipd: number): void {
    if (ipd <= 0) {
      throw new Error('IPD must be positive');
    }
    this._ipd = ipd;
    this.updateCameraPositions();
  }

  /**
   * Get current IPD
   */
  getIPD(): number {
    return this._ipd;
  }

  /**
   * Get left camera position
   */
  getLeftPosition(): THREE.Vector3 {
    return this.leftCamera.position.clone();
  }

  /**
   * Get right camera position
   */
  getRightPosition(): THREE.Vector3 {
    return this.rightCamera.position.clone();
  }

  /**
   * Set resolution for both render targets
   * Note: This recreates the render targets
   */
  setResolution(resolution: StereoCubeResolution): void {
    if (resolution === this._resolution) return;

    this._resolution = resolution;

    // Dispose old render targets
    this.leftTarget.dispose();
    this.rightTarget.dispose();

    // Create new render targets
    this.leftTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    this.rightTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    // Recreate cameras with new targets
    const leftPos = this.leftCamera.position.clone();
    const rightPos = this.rightCamera.position.clone();

    this.leftCamera = new THREE.CubeCamera(this._near, this._far, this.leftTarget);
    this.rightCamera = new THREE.CubeCamera(this._near, this._far, this.rightTarget);

    this.leftCamera.position.copy(leftPos);
    this.rightCamera.position.copy(rightPos);
  }

  /**
   * Get current resolution
   */
  getResolution(): StereoCubeResolution {
    return this._resolution;
  }

  /**
   * Update near/far clipping planes
   */
  setClippingPlanes(near: number, far: number): void {
    this._near = near;
    this._far = far;

    // Need to recreate cameras for clipping plane changes
    const leftPos = this.leftCamera.position.clone();
    const rightPos = this.rightCamera.position.clone();

    this.leftCamera = new THREE.CubeCamera(near, far, this.leftTarget);
    this.rightCamera = new THREE.CubeCamera(near, far, this.rightTarget);

    this.leftCamera.position.copy(leftPos);
    this.rightCamera.position.copy(rightPos);
  }

  /**
   * Get left render target (for advanced use)
   */
  getLeftRenderTarget(): THREE.WebGLCubeRenderTarget {
    return this.leftTarget;
  }

  /**
   * Get right render target (for advanced use)
   */
  getRightRenderTarget(): THREE.WebGLCubeRenderTarget {
    return this.rightTarget;
  }

  /**
   * Get left camera (for adding to scene if needed)
   */
  getLeftCamera(): THREE.CubeCamera {
    return this.leftCamera;
  }

  /**
   * Get right camera (for adding to scene if needed)
   */
  getRightCamera(): THREE.CubeCamera {
    return this.rightCamera;
  }

  /**
   * Calculate VRAM usage for current resolution
   */
  getVRAMUsage(): {
    perEye: number;
    total: number;
    humanReadable: string;
  } {
    // Each cube face: resolution^2 * 4 bytes (RGBA)
    // 6 faces per eye
    const faceSizeBytes = this._resolution * this._resolution * 4;
    const perEyeBytes = faceSizeBytes * 6;
    const totalBytes = perEyeBytes * 2;

    return {
      perEye: perEyeBytes,
      total: totalBytes,
      humanReadable: `${(totalBytes / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    this.leftTarget.dispose();
    this.rightTarget.dispose();
  }
}

/**
 * IPD Calculator for different scene scales
 */
export class IPDCalculator {
  /**
   * Get IPD for a scene with custom unit scale
   * @param sceneUnit - What 1 unit represents
   * @returns IPD value to use in the scene
   */
  static getIPDForSceneScale(
    sceneUnit: 'meter' | 'centimeter' | 'foot' | 'inch'
  ): number {
    const conversionFactors: Record<string, number> = {
      meter: 0.001,      // 64mm = 0.064m
      centimeter: 0.1,   // 64mm = 6.4cm
      foot: 0.00328084,  // 64mm = 0.21 feet
      inch: 0.03937,     // 64mm = 2.52 inches
    };

    return IPD_REFERENCE.HUMAN_AVERAGE_MM * conversionFactors[sceneUnit];
  }

  /**
   * Calculate IPD for miniature or giant perspective effects
   * @param realWorldScale - Scale factor (1.0 = normal, 0.1 = appear 10x larger)
   * @param baseIPD - Base IPD in scene units
   * @returns Adjusted IPD
   */
  static getIPDForScaleEffect(
    realWorldScale: number,
    baseIPD: number = IPD_REFERENCE.VR_DEFAULT_METERS
  ): number {
    // Smaller IPD = viewer feels larger relative to scene
    // Larger IPD = viewer feels smaller relative to scene
    return baseIPD * realWorldScale;
  }

  /**
   * Calculate depth perception zones based on IPD
   */
  static getDepthZones(ipd: number): {
    nearComfortZone: number;
    stereoFalloff: number;
  } {
    // Near comfort zone is approximately 10x IPD
    const nearComfortZone = ipd * 10;

    // Stereo depth perception falls off at approximately 300x IPD
    const stereoFalloff = ipd * 300;

    return { nearComfortZone, stereoFalloff };
  }
}
