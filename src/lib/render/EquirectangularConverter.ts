/**
 * EquirectangularConverter - Converts cubemap to equirectangular projection
 *
 * Uses a fullscreen quad with a custom shader to convert a CubeCamera's
 * output into a 2:1 equirectangular image for 360 video.
 *
 * Phase 3, Plan 03-04
 */

import * as THREE from 'three';
import { CapturedFrame } from './FrameCapture';

// Import shaders
import equirectVertexShader from '@/lib/shaders/equirect.vert.glsl';
import equirectFragmentShader from '@/lib/shaders/equirect.frag.glsl';

export class EquirectangularConverter {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private outputBuffer: Uint8Array | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    // Create a simple scene with a fullscreen quad
    this.scene = new THREE.Scene();

    // Orthographic camera for fullscreen rendering
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create shader material for cubemap to equirect conversion
    this.material = new THREE.ShaderMaterial({
      vertexShader: equirectVertexShader,
      fragmentShader: equirectFragmentShader,
      uniforms: {
        cubemap: { value: null },
      },
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
    });

    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  /**
   * Convert a cubemap to equirectangular format
   *
   * @param cubemap - CubeTexture from CubemapCapture
   * @param outputWidth - Width of output (height will be width/2)
   * @returns Promise resolving to captured frame data
   */
  async convert(
    cubemap: THREE.CubeTexture,
    outputWidth: number
  ): Promise<CapturedFrame> {
    const width = outputWidth;
    const height = outputWidth / 2; // Equirectangular is always 2:1

    // Create or resize render target
    if (!this.renderTarget || this.renderTarget.width !== width) {
      this.renderTarget?.dispose();
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });
    }

    // Allocate output buffer
    const bufferSize = width * height * 4;
    if (!this.outputBuffer || this.outputBuffer.length !== bufferSize) {
      this.outputBuffer = new Uint8Array(bufferSize);
    }

    // Update cubemap uniform
    this.material.uniforms.cubemap.value = cubemap;

    // Render to target
    const originalTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(originalTarget);

    // Read pixels
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      width,
      height,
      this.outputBuffer
    );

    // Flip vertically (WebGL reads bottom-to-top)
    const flippedBuffer = this.flipVertically(this.outputBuffer, width, height);

    return {
      frameNumber: 0, // Will be set by caller
      width,
      height,
      data: flippedBuffer,
      timestamp: performance.now(),
    };
  }

  /**
   * Convert synchronously (for tight render loops)
   */
  convertSync(
    cubemap: THREE.CubeTexture,
    outputWidth: number,
    frameNumber: number
  ): CapturedFrame {
    const width = outputWidth;
    const height = outputWidth / 2;

    // Create or resize render target
    if (!this.renderTarget || this.renderTarget.width !== width) {
      this.renderTarget?.dispose();
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });
    }

    // Allocate output buffer
    const bufferSize = width * height * 4;
    if (!this.outputBuffer || this.outputBuffer.length !== bufferSize) {
      this.outputBuffer = new Uint8Array(bufferSize);
    }

    // Update cubemap uniform
    this.material.uniforms.cubemap.value = cubemap;

    // Render to target
    const originalTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(originalTarget);

    // Read pixels
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      width,
      height,
      this.outputBuffer
    );

    // Flip vertically
    const flippedBuffer = this.flipVertically(this.outputBuffer, width, height);

    return {
      frameNumber,
      width,
      height,
      data: flippedBuffer,
      timestamp: performance.now(),
    };
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
   * Check if a resolution is valid (equirect must be 2:1 ratio)
   */
  static validateResolution(width: number, height: number): boolean {
    return Math.abs(width / height - 2) < 0.001;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.renderTarget?.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
