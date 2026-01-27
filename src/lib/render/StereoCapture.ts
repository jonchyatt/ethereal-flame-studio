/**
 * StereoCapture - Captures stereoscopic 360 content with IPD offset
 *
 * Uses two CubeCamera instances offset by interpupillary distance (IPD)
 * to create left/right eye views for VR headset playback.
 *
 * Phase 3, Plan 03-05
 */

import * as THREE from 'three';
import { CubemapCapture, CubemapResolution } from './CubemapCapture';
import { EquirectangularConverter } from './EquirectangularConverter';
import { CapturedFrame } from './FrameCapture';

/**
 * Stereo frame pair containing left and right eye views
 */
export interface StereoFramePair {
  left: CapturedFrame;
  right: CapturedFrame;
}

/**
 * Options for stereo capture
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
   */
  resolution?: CubemapResolution;
}

/**
 * Default IPD in meters (64mm)
 */
export const DEFAULT_IPD = 0.064;

export class StereoCapture {
  private renderer: THREE.WebGLRenderer;
  private leftCapture: CubemapCapture;
  private rightCapture: CubemapCapture;
  private equirectConverter: EquirectangularConverter;
  private ipd: number;
  private centerPosition: THREE.Vector3;

  constructor(
    renderer: THREE.WebGLRenderer,
    equirectConverter: EquirectangularConverter,
    options: StereoCaptureOptions = {}
  ) {
    this.renderer = renderer;
    this.equirectConverter = equirectConverter;
    this.ipd = options.ipd ?? DEFAULT_IPD;
    this.centerPosition = new THREE.Vector3(0, 0, 0);

    const resolution = options.resolution ?? 2048;

    // Create left and right eye capture systems
    this.leftCapture = new CubemapCapture(renderer, resolution);
    this.rightCapture = new CubemapCapture(renderer, resolution);

    // Update positions with IPD offset
    this.updateCameraPositions();
  }

  /**
   * Update camera positions based on center position and IPD
   */
  private updateCameraPositions(): void {
    // Left eye: -IPD/2 on X axis
    const leftPos = this.centerPosition.clone();
    leftPos.x -= this.ipd / 2;
    this.leftCapture.setPosition(leftPos);

    // Right eye: +IPD/2 on X axis
    const rightPos = this.centerPosition.clone();
    rightPos.x += this.ipd / 2;
    this.rightCapture.setPosition(rightPos);
  }

  /**
   * Capture a stereo frame pair
   *
   * @param scene - The scene to capture
   * @param outputWidth - Width of each equirectangular output
   * @param frameNumber - Frame number for tracking
   * @returns Promise resolving to stereo frame pair
   */
  async captureStereoFrame(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): Promise<StereoFramePair> {
    // Capture left eye cubemap
    const leftCubemap = this.leftCapture.captureFrame(scene);

    // Convert left to equirectangular
    const leftEquirect = await this.equirectConverter.convert(leftCubemap, outputWidth);
    leftEquirect.frameNumber = frameNumber;

    // Capture right eye cubemap
    const rightCubemap = this.rightCapture.captureFrame(scene);

    // Convert right to equirectangular
    const rightEquirect = await this.equirectConverter.convert(rightCubemap, outputWidth);
    rightEquirect.frameNumber = frameNumber;

    return {
      left: leftEquirect,
      right: rightEquirect,
    };
  }

  /**
   * Capture stereo frame pair synchronously
   */
  captureStereoFrameSync(
    scene: THREE.Scene,
    outputWidth: number,
    frameNumber: number = 0
  ): StereoFramePair {
    // Capture left eye
    const leftCubemap = this.leftCapture.captureFrame(scene);
    const leftEquirect = this.equirectConverter.convertSync(leftCubemap, outputWidth, frameNumber);

    // Capture right eye
    const rightCubemap = this.rightCapture.captureFrame(scene);
    const rightEquirect = this.equirectConverter.convertSync(rightCubemap, outputWidth, frameNumber);

    return {
      left: leftEquirect,
      right: rightEquirect,
    };
  }

  /**
   * Set the interpupillary distance
   */
  setIPD(ipd: number): void {
    this.ipd = ipd;
    this.updateCameraPositions();
  }

  /**
   * Get current IPD
   */
  getIPD(): number {
    return this.ipd;
  }

  /**
   * Set the center position (both cameras offset from here)
   */
  setCenterPosition(position: THREE.Vector3): void {
    this.centerPosition.copy(position);
    this.updateCameraPositions();
  }

  /**
   * Get center position
   */
  getCenterPosition(): THREE.Vector3 {
    return this.centerPosition.clone();
  }

  /**
   * Set resolution for both cameras
   */
  setResolution(resolution: CubemapResolution): void {
    this.leftCapture.setResolution(resolution);
    this.rightCapture.setResolution(resolution);
  }

  /**
   * Get current resolution
   */
  getResolution(): CubemapResolution {
    return this.leftCapture.getResolution();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.leftCapture.dispose();
    this.rightCapture.dispose();
    // Note: equirectConverter is shared, don't dispose here
  }
}
