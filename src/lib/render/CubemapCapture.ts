/**
 * CubemapCapture - Captures 360 scenes using CubeCamera
 *
 * Uses THREE.CubeCamera to capture all six faces of a cubemap
 * for later conversion to equirectangular format.
 *
 * Phase 3, Plan 03-04
 */

import * as THREE from 'three';

/**
 * Cubemap resolution options
 * Higher resolution = better quality but more VRAM
 */
export type CubemapResolution = 1024 | 1536 | 2048;

/**
 * Resolution mapping for different output formats
 * Equirect width / 4 = optimal cube face size
 */
export const EQUIRECT_TO_CUBE: Record<number, CubemapResolution> = {
  4096: 1024,  // 4K equirect
  6144: 1536,  // 6K equirect
  8192: 2048,  // 8K equirect
};

export class CubemapCapture {
  private renderer: THREE.WebGLRenderer;
  private cubeCamera: THREE.CubeCamera;
  private cubeRenderTarget: THREE.WebGLCubeRenderTarget;
  private resolution: CubemapResolution;
  private position: THREE.Vector3;

  constructor(
    renderer: THREE.WebGLRenderer,
    resolution: CubemapResolution = 1024
  ) {
    this.renderer = renderer;
    this.resolution = resolution;
    this.position = new THREE.Vector3(0, 0, 0);

    // Create cube render target with optimal settings
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    // Create cube camera
    // Near/far planes set for typical scene dimensions
    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
    this.cubeCamera.position.copy(this.position);
  }

  /**
   * Capture the scene to a cubemap texture
   *
   * @param scene - The scene to capture
   * @returns The cubemap texture
   */
  captureFrame(scene: THREE.Scene): THREE.CubeTexture {
    // Update camera position before capture
    this.cubeCamera.position.copy(this.position);

    // Capture all 6 faces
    this.cubeCamera.update(this.renderer, scene);

    return this.cubeRenderTarget.texture;
  }

  /**
   * Set the capture position (usually scene center)
   */
  setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.cubeCamera.position.copy(position);
  }

  /**
   * Get current position
   */
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get the cube render target (for direct access if needed)
   */
  getRenderTarget(): THREE.WebGLCubeRenderTarget {
    return this.cubeRenderTarget;
  }

  /**
   * Get the cube camera (for adding to scene if needed)
   */
  getCubeCamera(): THREE.CubeCamera {
    return this.cubeCamera;
  }

  /**
   * Get current resolution
   */
  getResolution(): CubemapResolution {
    return this.resolution;
  }

  /**
   * Update resolution (recreates render target)
   */
  setResolution(resolution: CubemapResolution): void {
    if (resolution === this.resolution) return;

    this.resolution = resolution;

    // Dispose old render target
    this.cubeRenderTarget.dispose();

    // Create new render target
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    // Recreate cube camera with new target
    const pos = this.cubeCamera.position.clone();
    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
    this.cubeCamera.position.copy(pos);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cubeRenderTarget.dispose();
  }
}
