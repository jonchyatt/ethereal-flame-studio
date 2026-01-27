/**
 * RenderTargetManager - Manages WebGLRenderTarget instances at various resolutions
 *
 * Provides resolution presets for flat and 360 video export,
 * handles VRAM-conscious allocation and cleanup.
 *
 * Phase 3, Plan 03-02
 */

import * as THREE from 'three';

/**
 * Available render presets for different export types
 */
export type RenderPreset =
  | '1080p-landscape'   // 1920x1080
  | '1080p-portrait'    // 1080x1920
  | '4k-landscape'      // 3840x2160
  | '4k-portrait'       // 2160x3840
  | '360-4k'            // 4096x2048 (equirectangular)
  | '360-6k'            // 6144x3072 (equirectangular)
  | '360-8k'            // 8192x4096 (equirectangular)
  | '360-stereo-8k';    // 8192x8192 (top/bottom stereo)

/**
 * Configuration for a render target
 */
export interface RenderTargetConfig {
  width: number;
  height: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
}

/**
 * Resolution definitions for each preset
 */
export const PRESET_RESOLUTIONS: Record<RenderPreset, { width: number; height: number }> = {
  '1080p-landscape': { width: 1920, height: 1080 },
  '1080p-portrait': { width: 1080, height: 1920 },
  '4k-landscape': { width: 3840, height: 2160 },
  '4k-portrait': { width: 2160, height: 3840 },
  '360-4k': { width: 4096, height: 2048 },
  '360-6k': { width: 6144, height: 3072 },
  '360-8k': { width: 8192, height: 4096 },
  '360-stereo-8k': { width: 8192, height: 8192 },
};

/**
 * Cubemap resolutions that map to equirectangular output resolutions
 *
 * Equirect width / 4 = cube face size for good quality
 * 4K equirect (4096) -> 1024 cube faces
 * 6K equirect (6144) -> 1536 cube faces
 * 8K equirect (8192) -> 2048 cube faces
 */
export const CUBEMAP_RESOLUTIONS: Record<'360-4k' | '360-6k' | '360-8k' | '360-stereo-8k', number> = {
  '360-4k': 1024,
  '360-6k': 1536,
  '360-8k': 2048,
  '360-stereo-8k': 2048,
};

export class RenderTargetManager {
  private targets: Map<string, THREE.WebGLRenderTarget> = new Map();
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  /**
   * Get resolution for a preset
   */
  getResolution(preset: RenderPreset): { width: number; height: number } {
    return PRESET_RESOLUTIONS[preset];
  }

  /**
   * Get cubemap resolution for 360 presets
   */
  getCubemapResolution(preset: '360-4k' | '360-6k' | '360-8k' | '360-stereo-8k'): number {
    return CUBEMAP_RESOLUTIONS[preset];
  }

  /**
   * Create or retrieve a render target for the given preset
   */
  getTarget(preset: RenderPreset): THREE.WebGLRenderTarget {
    const key = preset;

    if (this.targets.has(key)) {
      return this.targets.get(key)!;
    }

    const { width, height } = this.getResolution(preset);
    const target = this.createTarget(width, height);
    this.targets.set(key, target);
    return target;
  }

  /**
   * Create a render target at custom resolution
   */
  createTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
    });

    return target;
  }

  /**
   * Release a specific target
   */
  releaseTarget(preset: RenderPreset): void {
    const target = this.targets.get(preset);
    if (target) {
      target.dispose();
      this.targets.delete(preset);
    }
  }

  /**
   * Release all managed targets
   */
  dispose(): void {
    for (const target of this.targets.values()) {
      target.dispose();
    }
    this.targets.clear();
  }

  /**
   * Get current VRAM usage estimate (bytes)
   */
  getVRAMUsage(): number {
    let total = 0;
    for (const target of this.targets.values()) {
      // RGBA format = 4 bytes per pixel
      total += target.width * target.height * 4;
    }
    return total;
  }

  /**
   * Check if a resolution is within WebGL limits
   */
  static isResolutionSupported(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ): boolean {
    const maxTextureSize = renderer.capabilities.maxTextureSize;
    return width <= maxTextureSize && height <= maxTextureSize;
  }

  /**
   * Get maximum supported texture size
   */
  static getMaxTextureSize(renderer: THREE.WebGLRenderer): number {
    return renderer.capabilities.maxTextureSize;
  }
}
