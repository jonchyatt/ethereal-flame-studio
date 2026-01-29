# Three.js 360 Stereoscopic Rendering Guide for VR Video Export

> Comprehensive technical guide for rendering stereoscopic 360 video from Three.js scenes for YouTube VR and VR headset playback.

## Table of Contents

1. [CubeCamera Setup for Stereo](#1-cubecamera-setup-for-stereo)
2. [Interpupillary Distance (IPD) Calculations](#2-interpupillary-distance-ipd-calculations)
3. [CubemapToEquirectangular Conversion](#3-cubemaptoequirectangular-conversion)
4. [Top-Bottom Stacking for YouTube VR](#4-top-bottom-stacking-for-youtube-vr)
5. [Memory Management for 8K Stereo](#5-memory-management-for-8k-stereo)
6. [Frame-by-Frame Capture Optimization](#6-frame-by-frame-capture-optimization)
7. [Performance Tips for 30fps Video](#7-performance-tips-for-30fps-video)
8. [FFmpeg Encoding for VR Video](#8-ffmpeg-encoding-for-vr-video)
9. [Spatial Metadata Injection](#9-spatial-metadata-injection)
10. [Integration Examples](#10-integration-examples)

---

## 1. CubeCamera Setup for Stereo

### Overview

Stereoscopic 360 rendering requires two CubeCamera instances positioned at left and right eye positions. Each camera captures a complete cubemap (6 faces), which is then converted to equirectangular format.

### Basic CubeCamera Setup

```typescript
import * as THREE from 'three';

// Create cube render target with optimal settings for 360 capture
const resolution = 2048; // Cube face resolution
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
  generateMipmaps: false, // Not needed for video export
});

// Create cube camera
// Near: 0.1 (10cm) - prevents clipping nearby objects
// Far: 1000 (1km) - captures distant skybox/environment
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);

// Position at scene center
cubeCamera.position.set(0, 0, 0);
scene.add(cubeCamera);

// Capture the scene (renders all 6 faces)
cubeCamera.update(renderer, scene);

// Access the cubemap texture
const cubemapTexture = cubeRenderTarget.texture;
```

### Stereo CubeCamera Configuration

```typescript
/**
 * Stereo CubeCamera pair for left/right eye capture
 */
class StereoCubeCameras {
  private leftCamera: THREE.CubeCamera;
  private rightCamera: THREE.CubeCamera;
  private leftTarget: THREE.WebGLCubeRenderTarget;
  private rightTarget: THREE.WebGLCubeRenderTarget;
  private ipd: number;
  private centerPosition: THREE.Vector3;

  constructor(resolution: number = 2048, ipd: number = 0.064) {
    this.ipd = ipd; // Interpupillary distance in meters
    this.centerPosition = new THREE.Vector3(0, 0, 0);

    // Create render targets
    const targetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    };

    this.leftTarget = new THREE.WebGLCubeRenderTarget(resolution, targetOptions);
    this.rightTarget = new THREE.WebGLCubeRenderTarget(resolution, targetOptions);

    // Create cameras
    this.leftCamera = new THREE.CubeCamera(0.1, 1000, this.leftTarget);
    this.rightCamera = new THREE.CubeCamera(0.1, 1000, this.rightTarget);

    this.updatePositions();
  }

  private updatePositions(): void {
    // Left eye: -IPD/2 on X axis (viewer's left)
    this.leftCamera.position.copy(this.centerPosition);
    this.leftCamera.position.x -= this.ipd / 2;

    // Right eye: +IPD/2 on X axis (viewer's right)
    this.rightCamera.position.copy(this.centerPosition);
    this.rightCamera.position.x += this.ipd / 2;
  }

  capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene): {
    left: THREE.CubeTexture;
    right: THREE.CubeTexture;
  } {
    // Capture left eye
    this.leftCamera.update(renderer, scene);
    const leftTexture = this.leftTarget.texture;

    // Capture right eye
    this.rightCamera.update(renderer, scene);
    const rightTexture = this.rightTarget.texture;

    return { left: leftTexture, right: rightTexture };
  }

  setCenterPosition(position: THREE.Vector3): void {
    this.centerPosition.copy(position);
    this.updatePositions();
  }

  setIPD(ipd: number): void {
    this.ipd = ipd;
    this.updatePositions();
  }

  dispose(): void {
    this.leftTarget.dispose();
    this.rightTarget.dispose();
  }
}
```

### Resolution Mapping

| Output Resolution | Cube Face Size | VRAM per Eye | Total VRAM (Stereo) |
|-------------------|----------------|--------------|---------------------|
| 4096x2048 (4K)    | 1024           | ~25MB        | ~50MB               |
| 6144x3072 (6K)    | 1536           | ~56MB        | ~112MB              |
| 8192x4096 (8K)    | 2048           | ~100MB       | ~200MB              |

> **Formula**: Cube face size = Equirectangular width / 4

---

## 2. Interpupillary Distance (IPD) Calculations

### Human IPD Statistics

| Metric | Value | Notes |
|--------|-------|-------|
| Adult Average | 63-65mm | General population |
| Adult Range | 54-74mm | 95th percentile |
| Standard VR Default | 64mm | Meta Quest, HTC Vive |
| Children (8-12) | 54-58mm | Smaller head size |

### Scene Scale Considerations

The IPD must be scaled to match your scene's unit system:

```typescript
/**
 * IPD Calculator for different scene scales
 */
class IPDCalculator {
  // Standard human IPD in millimeters
  static readonly HUMAN_IPD_MM = 64;

  /**
   * Calculate IPD for a scene with custom unit scale
   * @param sceneUnit - What 1 unit represents (e.g., 'meter', 'centimeter', 'foot')
   * @returns IPD value to use in the scene
   */
  static getIPDForSceneScale(sceneUnit: 'meter' | 'centimeter' | 'foot' | 'inch'): number {
    const conversionFactors: Record<string, number> = {
      'meter': 0.001,      // 64mm = 0.064m
      'centimeter': 0.1,   // 64mm = 6.4cm
      'foot': 0.00328084,  // 64mm = 0.21 feet
      'inch': 0.03937,     // 64mm = 2.52 inches
    };

    return this.HUMAN_IPD_MM * conversionFactors[sceneUnit];
  }

  /**
   * Calculate IPD for miniature or giant perspective effects
   * @param realWorldScale - Scale factor (1.0 = normal, 0.1 = appear 10x larger)
   * @returns Adjusted IPD
   */
  static getIPDForScaleEffect(realWorldScale: number, baseIPD: number = 0.064): number {
    // Smaller IPD = viewer feels larger relative to scene
    // Larger IPD = viewer feels smaller relative to scene
    return baseIPD * realWorldScale;
  }
}

// Usage examples:
const ipdMeters = IPDCalculator.getIPDForSceneScale('meter');     // 0.064
const ipdCentimeters = IPDCalculator.getIPDForSceneScale('centimeter'); // 6.4

// For a "miniature world" effect where viewer feels like a giant:
const miniatureIPD = IPDCalculator.getIPDForScaleEffect(0.1);    // 0.0064

// For a "giant world" effect where viewer feels tiny:
const giantIPD = IPDCalculator.getIPDForScaleEffect(10);         // 0.64
```

### IPD and Depth Perception

```typescript
/**
 * Relationship between IPD and perceived depth
 */
interface DepthPerceptionConfig {
  /** IPD in scene units */
  ipd: number;

  /**
   * Near convergence distance - objects closer than this
   * may cause discomfort due to eye strain
   */
  nearComfortZone: number;

  /**
   * Distance at which stereo depth perception becomes negligible
   * (~20 meters for humans with 64mm IPD)
   */
  stereoFalloff: number;
}

function calculateDepthConfig(ipd: number): DepthPerceptionConfig {
  // Near comfort zone is approximately 10x IPD
  const nearComfortZone = ipd * 10;

  // Stereo depth perception falls off at approximately 300x IPD
  const stereoFalloff = ipd * 300;

  return { ipd, nearComfortZone, stereoFalloff };
}

// Example: Standard human IPD
const config = calculateDepthConfig(0.064);
// nearComfortZone: 0.64m (64cm)
// stereoFalloff: 19.2m (~20 meters)
```

---

## 3. CubemapToEquirectangular Conversion

### Shader-Based Conversion

The conversion from cubemap to equirectangular uses a fragment shader that maps UV coordinates to 3D directions:

**Vertex Shader (equirect.vert.glsl)**:
```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
```

**Fragment Shader (equirect.frag.glsl)**:
```glsl
uniform samplerCube cubemap;
varying vec2 vUv;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

void main() {
  // Convert UV (0-1) to spherical coordinates
  float longitude = vUv.x * TWO_PI - PI;        // -PI to PI (horizontal)
  float latitude = vUv.y * PI - PI * 0.5;       // -PI/2 to PI/2 (vertical)

  // Convert spherical to cartesian direction
  vec3 direction;
  direction.x = cos(latitude) * sin(longitude);
  direction.y = sin(latitude);
  direction.z = cos(latitude) * cos(longitude);

  // Sample cubemap
  gl_FragColor = textureCube(cubemap, direction);
}
```

### Complete Converter Implementation

```typescript
import * as THREE from 'three';

class EquirectangularConverter {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private renderTarget: THREE.WebGLRenderTarget | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();

    // Orthographic camera for fullscreen quad rendering
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Shader material for conversion
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube cubemap;
        varying vec2 vUv;

        #define PI 3.14159265359
        #define TWO_PI 6.28318530718

        void main() {
          float longitude = vUv.x * TWO_PI - PI;
          float latitude = vUv.y * PI - PI * 0.5;

          vec3 direction;
          direction.x = cos(latitude) * sin(longitude);
          direction.y = sin(latitude);
          direction.z = cos(latitude) * cos(longitude);

          gl_FragColor = textureCube(cubemap, direction);
        }
      `,
      uniforms: {
        cubemap: { value: null },
      },
      depthTest: false,
      depthWrite: false,
    });

    // Fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  convert(cubemap: THREE.CubeTexture, outputWidth: number): Uint8Array {
    const width = outputWidth;
    const height = outputWidth / 2; // Equirectangular is always 2:1

    // Create/resize render target
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

    // Set cubemap uniform
    this.material.uniforms.cubemap.value = cubemap;

    // Render to target
    const originalTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(originalTarget);

    // Read pixels
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(
      this.renderTarget, 0, 0, width, height, buffer
    );

    // Flip vertically (WebGL reads bottom-to-top)
    return this.flipVertically(buffer, width, height);
  }

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

  dispose(): void {
    this.renderTarget?.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
```

---

## 4. Top-Bottom Stacking for YouTube VR

### YouTube VR Format Specifications

| Specification | Value |
|---------------|-------|
| Layout | Top/Bottom (Over/Under) |
| Eye Order | Left eye on TOP, Right eye on BOTTOM |
| Aspect Ratio | 1:1 (combined frame) |
| Mono Resolution | 2:1 per eye (e.g., 4096x2048) |
| Stereo Resolution | 1:1 combined (e.g., 4096x4096) |
| Max Resolution | 8192x8192 |
| Recommended FPS | 24, 25, 30, 50, 60 |

### Stacking Implementation

```typescript
interface CapturedFrame {
  frameNumber: number;
  width: number;
  height: number;
  data: Uint8Array;
  timestamp: number;
}

interface StereoFramePair {
  left: CapturedFrame;
  right: CapturedFrame;
}

/**
 * Stack left/right frames into YouTube VR Top/Bottom format
 */
function stackTopBottom(stereo: StereoFramePair): CapturedFrame {
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

  // Create combined buffer
  const combinedData = new Uint8Array(width * combinedHeight * 4);

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
 * Alternative: Side-by-side stacking (less common for 360)
 */
function stackLeftRight(stereo: StereoFramePair): CapturedFrame {
  const { left, right } = stereo;
  const width = left.width;
  const height = left.height;
  const combinedWidth = width * 2;
  const rowSize = width * 4;

  const combinedData = new Uint8Array(combinedWidth * height * 4);

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
```

### Resolution Presets for YouTube

```typescript
const YOUTUBE_VR_PRESETS = {
  '4K_STEREO': {
    equirectWidth: 4096,
    equirectHeight: 2048,
    combinedWidth: 4096,
    combinedHeight: 4096,
    cubeFaceSize: 1024,
    bitrate: '35M',
  },
  '5K_STEREO': {
    equirectWidth: 5120,
    equirectHeight: 2560,
    combinedWidth: 5120,
    combinedHeight: 5120,
    cubeFaceSize: 1280,
    bitrate: '50M',
  },
  '6K_STEREO': {
    equirectWidth: 6144,
    equirectHeight: 3072,
    combinedWidth: 6144,
    combinedHeight: 6144,
    cubeFaceSize: 1536,
    bitrate: '60M',
  },
  '8K_STEREO': {
    equirectWidth: 8192,
    equirectHeight: 4096,
    combinedWidth: 8192,
    combinedHeight: 8192,
    cubeFaceSize: 2048,
    bitrate: '100M',
  },
};
```

---

## 5. Memory Management for 8K Stereo

### VRAM Requirements

| Resolution | Per Eye (RGBA) | Stereo Combined | 30fps Buffer (2s) |
|------------|----------------|-----------------|-------------------|
| 4096x2048  | 32MB           | 64MB            | 3.84GB           |
| 6144x3072  | 72MB           | 144MB           | 8.64GB           |
| 8192x4096  | 128MB          | 256MB           | 15.36GB          |

### GPU Texture Size Limits

```typescript
/**
 * Check GPU capabilities and determine safe resolution
 */
function getMaxSafeResolution(renderer: THREE.WebGLRenderer): {
  maxTextureSize: number;
  recommended8K: boolean;
  recommendedResolution: number;
} {
  const maxTextureSize = renderer.capabilities.maxTextureSize;

  // iOS devices may report 16K but crash at 8K
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const safeFactor = isIOS ? 0.25 : 0.5;

  const safeMaxSize = Math.floor(maxTextureSize * safeFactor);
  const recommended8K = safeMaxSize >= 8192;

  // Recommended resolution based on GPU
  const recommendedResolution = Math.min(safeMaxSize, 8192);

  return { maxTextureSize, recommended8K, recommendedResolution };
}

// Usage
const caps = getMaxSafeResolution(renderer);
console.log(`Max texture: ${caps.maxTextureSize}`);
console.log(`8K safe: ${caps.recommended8K}`);
console.log(`Recommended: ${caps.recommendedResolution}`);
```

### Memory-Efficient Frame Pipeline

```typescript
/**
 * Memory-efficient frame capture with buffer reuse
 */
class MemoryEfficientCapture {
  private outputBuffer: Uint8Array | null = null;
  private renderTarget: THREE.WebGLRenderTarget | null = null;

  /**
   * Capture frame with buffer reuse to minimize allocations
   */
  captureFrame(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number
  ): Uint8Array {
    // Reuse or create render target
    if (!this.renderTarget ||
        this.renderTarget.width !== width ||
        this.renderTarget.height !== height) {
      this.renderTarget?.dispose();
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
        depthBuffer: true,
      });
    }

    // Reuse output buffer
    const bufferSize = width * height * 4;
    if (!this.outputBuffer || this.outputBuffer.length !== bufferSize) {
      this.outputBuffer = new Uint8Array(bufferSize);
    }

    // Render
    const originalTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(originalTarget);

    // Read pixels into reusable buffer
    renderer.readRenderTargetPixels(
      this.renderTarget, 0, 0, width, height, this.outputBuffer
    );

    // Return a copy (buffer will be reused next frame)
    return new Uint8Array(this.outputBuffer);
  }

  /**
   * Properly dispose all GPU resources
   */
  dispose(): void {
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
    this.outputBuffer = null;
  }
}
```

### Render Target Disposal Best Practices

```typescript
/**
 * Proper disposal pattern for WebGLRenderTarget
 */
class RenderTargetManager {
  private targets: Map<string, THREE.WebGLRenderTarget> = new Map();

  getTarget(
    id: string,
    width: number,
    height: number
  ): THREE.WebGLRenderTarget {
    const existing = this.targets.get(id);

    if (existing && existing.width === width && existing.height === height) {
      return existing;
    }

    // Dispose old target if dimensions changed
    if (existing) {
      existing.dispose();
    }

    // Create new target
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });

    this.targets.set(id, target);
    return target;
  }

  dispose(): void {
    for (const target of this.targets.values()) {
      target.dispose();
    }
    this.targets.clear();
  }

  /**
   * Monitor VRAM usage via renderer.info
   */
  getMemoryStats(renderer: THREE.WebGLRenderer): {
    textures: number;
    geometries: number;
  } {
    return {
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
    };
  }
}
```

---

## 6. Frame-by-Frame Capture Optimization

### Deterministic Timing with CCapture.js

CCapture.js hooks into JavaScript timing functions to ensure consistent frame timing regardless of actual render speed:

```typescript
/**
 * Deterministic frame capture for video export
 * Uses CCapture.js pattern without the library dependency
 */
class DeterministicCapture {
  private frameRate: number;
  private frameTime: number;
  private frameCount: number = 0;
  private startTime: number = 0;
  private isCapturing: boolean = false;

  constructor(frameRate: number = 30) {
    this.frameRate = frameRate;
    this.frameTime = 1000 / frameRate; // ms per frame
  }

  /**
   * Get the "virtual" elapsed time for this frame
   * Used to step animations consistently
   */
  getElapsedTime(): number {
    return this.frameCount * this.frameTime;
  }

  /**
   * Get delta time (always consistent)
   */
  getDeltaTime(): number {
    return this.frameTime / 1000; // Convert to seconds
  }

  /**
   * Start capture session
   */
  start(): void {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.isCapturing = true;
  }

  /**
   * Capture current frame and advance time
   */
  capture(canvas: HTMLCanvasElement): string {
    if (!this.isCapturing) {
      throw new Error('Capture not started');
    }

    // Get frame data
    const dataUrl = canvas.toDataURL('image/png');

    // Advance to next frame
    this.frameCount++;

    return dataUrl;
  }

  /**
   * Stop capture and return statistics
   */
  stop(): { frameCount: number; actualDuration: number; targetDuration: number } {
    this.isCapturing = false;
    const actualDuration = performance.now() - this.startTime;
    const targetDuration = this.frameCount * this.frameTime;

    return {
      frameCount: this.frameCount,
      actualDuration,
      targetDuration,
    };
  }
}
```

### Animation Loop for Deterministic Rendering

```typescript
/**
 * Animation loop that uses deterministic time stepping
 */
class DeterministicAnimationLoop {
  private capture: DeterministicCapture;
  private frames: Uint8Array[] = [];
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private onFrame?: (time: number, delta: number) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    frameRate: number = 30
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.capture = new DeterministicCapture(frameRate);
  }

  /**
   * Set callback for updating scene each frame
   */
  setUpdateCallback(callback: (time: number, delta: number) => void): void {
    this.onFrame = callback;
  }

  /**
   * Render a specific number of frames
   */
  async renderFrames(
    frameCount: number,
    width: number,
    height: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<Uint8Array[]> {
    this.frames = [];
    this.capture.start();

    // Create render target
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    for (let i = 0; i < frameCount; i++) {
      const time = this.capture.getElapsedTime();
      const delta = this.capture.getDeltaTime();

      // Update scene with deterministic time
      if (this.onFrame) {
        this.onFrame(time, delta);
      }

      // Render to target
      this.renderer.setRenderTarget(renderTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);

      // Read pixels
      const buffer = new Uint8Array(width * height * 4);
      this.renderer.readRenderTargetPixels(
        renderTarget, 0, 0, width, height, buffer
      );

      this.frames.push(buffer);
      this.capture.capture(this.renderer.domElement);

      // Report progress
      if (onProgress) {
        onProgress(i + 1, frameCount);
      }

      // Yield to event loop periodically
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    renderTarget.dispose();
    this.capture.stop();

    return this.frames;
  }
}
```

### Three.js Clock Integration

```typescript
/**
 * Custom Clock that can be "stepped" for deterministic rendering
 */
class SteppableClock {
  private elapsed: number = 0;
  private delta: number = 0;
  private fixedDelta: number;

  constructor(fps: number = 30) {
    this.fixedDelta = 1 / fps;
  }

  /**
   * Step the clock by one frame
   */
  step(): void {
    this.delta = this.fixedDelta;
    this.elapsed += this.delta;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    return this.elapsed;
  }

  /**
   * Get delta time in seconds (fixed for deterministic rendering)
   */
  getDelta(): number {
    return this.delta;
  }

  /**
   * Reset clock to zero
   */
  reset(): void {
    this.elapsed = 0;
    this.delta = 0;
  }
}

// Usage with Three.js animations
const clock = new SteppableClock(30);
const mixer = new THREE.AnimationMixer(model);

function captureFrame() {
  clock.step();
  const delta = clock.getDelta();

  // Update animation mixer with fixed delta
  mixer.update(delta);

  // Render frame...
}
```

---

## 7. Performance Tips for 30fps Video

### GPU Optimization Strategies

```typescript
/**
 * Performance configuration for 360 video rendering
 */
const PERFORMANCE_CONFIG = {
  // Disable features not needed for pre-rendered video
  renderer: {
    antialias: false,        // Use higher resolution instead
    alpha: false,            // No transparency needed
    stencil: false,          // Rarely needed for 360
    preserveDrawingBuffer: true, // Required for readPixels
    powerPreference: 'high-performance',
  },

  // Texture settings
  textures: {
    anisotropy: 1,           // Disable anisotropic filtering
    generateMipmaps: false,  // Not needed for render targets
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  },

  // Render settings
  render: {
    sortObjects: false,      // Disable if order doesn't matter
    shadowMap: {
      enabled: false,        // Shadows are expensive
    },
  },
};

function createOptimizedRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });

  // Disable features
  renderer.shadowMap.enabled = false;
  renderer.sortObjects = false;

  return renderer;
}
```

### Batch Processing for Long Videos

```typescript
/**
 * Process frames in batches to prevent memory overflow
 */
async function renderInBatches(
  totalFrames: number,
  batchSize: number = 60, // 2 seconds at 30fps
  renderFrame: (frameNumber: number) => Uint8Array,
  saveFrame: (frame: Uint8Array, frameNumber: number) => Promise<void>
): Promise<void> {
  const batches = Math.ceil(totalFrames / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const startFrame = batch * batchSize;
    const endFrame = Math.min(startFrame + batchSize, totalFrames);

    console.log(`Processing batch ${batch + 1}/${batches} (frames ${startFrame}-${endFrame})`);

    // Render batch
    const frames: Array<{ data: Uint8Array; number: number }> = [];
    for (let i = startFrame; i < endFrame; i++) {
      const frameData = renderFrame(i);
      frames.push({ data: frameData, number: i });
    }

    // Save batch to disk
    for (const frame of frames) {
      await saveFrame(frame.data, frame.number);
    }

    // Clear batch from memory
    frames.length = 0;

    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### Parallel Eye Rendering (Advanced)

```typescript
/**
 * Render left and right eyes in parallel using WebGL multi-draw
 * Note: Requires instanced rendering setup
 */
class ParallelStereoRenderer {
  private instancedMesh: THREE.InstancedMesh | null = null;

  /**
   * For complex scenes, consider using instancing to render
   * both eyes in a single draw call
   */
  setupInstancedRendering(geometry: THREE.BufferGeometry, material: THREE.Material): void {
    // Create instanced mesh with 2 instances (left/right eye)
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, 2);

    // Set up instance matrices for left and right eye positions
    const matrix = new THREE.Matrix4();

    // Left eye instance
    matrix.setPosition(-0.032, 0, 0); // -IPD/2
    this.instancedMesh.setMatrixAt(0, matrix);

    // Right eye instance
    matrix.setPosition(0.032, 0, 0);  // +IPD/2
    this.instancedMesh.setMatrixAt(1, matrix);

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
```

### Monitoring and Profiling

```typescript
/**
 * Performance monitor for render pipeline
 */
class RenderProfiler {
  private frameTimes: number[] = [];
  private startTime: number = 0;

  startFrame(): void {
    this.startTime = performance.now();
  }

  endFrame(): void {
    const frameTime = performance.now() - this.startTime;
    this.frameTimes.push(frameTime);

    // Keep only last 100 frames
    if (this.frameTimes.length > 100) {
      this.frameTimes.shift();
    }
  }

  getStats(): {
    avgFrameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
    fps: number;
    estimatedTimeFor30s: number;
  } {
    if (this.frameTimes.length === 0) {
      return { avgFrameTime: 0, minFrameTime: 0, maxFrameTime: 0, fps: 0, estimatedTimeFor30s: 0 };
    }

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const min = Math.min(...this.frameTimes);
    const max = Math.max(...this.frameTimes);

    return {
      avgFrameTime: avg,
      minFrameTime: min,
      maxFrameTime: max,
      fps: 1000 / avg,
      estimatedTimeFor30s: (avg * 30 * 30) / 1000 / 60, // minutes
    };
  }
}
```

---

## 8. FFmpeg Encoding for VR Video

### Basic Encoding Commands

```bash
# H.264 encoding (best compatibility)
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p \
  output.mp4

# H.265/HEVC encoding (better compression, 50% smaller files)
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx265 -preset slow -crf 20 \
  -pix_fmt yuv420p \
  output.mp4

# NVIDIA hardware acceleration (10x faster)
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v hevc_nvenc -preset slow -cq 20 \
  -pix_fmt yuv420p \
  output.mp4
```

### VR-Optimized Encoding

```bash
# 4K stereo 360 (YouTube VR optimized)
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx264 \
  -preset veryslow \
  -crf 16 \
  -profile:v high \
  -level 5.2 \
  -b:v 35M \
  -maxrate 40M \
  -bufsize 80M \
  -pix_fmt yuv420p \
  -movflags +faststart \
  output_4k_stereo.mp4

# 8K stereo 360 (maximum quality)
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx265 \
  -preset slow \
  -crf 18 \
  -b:v 100M \
  -maxrate 120M \
  -bufsize 240M \
  -pix_fmt yuv420p \
  -tag:v hvc1 \
  output_8k_stereo.mp4
```

### Adding Audio

```bash
# Mux audio with video
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 256k \
  -pix_fmt yuv420p \
  -shortest \
  output_with_audio.mp4
```

### TypeScript FFmpeg Command Builder

```typescript
interface FFmpegOptions {
  inputPattern: string;      // "frames/%05d.png"
  outputPath: string;
  fps: number;
  codec: 'h264' | 'h265' | 'h265-nvenc';
  quality: 'fast' | 'balanced' | 'quality';
  bitrate?: string;          // "35M"
  audioPath?: string;
}

function buildFFmpegCommand(options: FFmpegOptions): string[] {
  const args: string[] = [];

  // Input frame rate
  args.push('-framerate', String(options.fps));

  // Input pattern
  args.push('-i', options.inputPattern);

  // Audio input
  if (options.audioPath) {
    args.push('-i', options.audioPath);
  }

  // Video codec
  switch (options.codec) {
    case 'h264':
      args.push('-c:v', 'libx264');
      break;
    case 'h265':
      args.push('-c:v', 'libx265');
      break;
    case 'h265-nvenc':
      args.push('-c:v', 'hevc_nvenc');
      break;
  }

  // Quality preset
  const presetMap = { fast: 'fast', balanced: 'medium', quality: 'slow' };
  args.push('-preset', presetMap[options.quality]);

  // Quality setting
  const crfMap = { fast: '23', balanced: '20', quality: '18' };
  if (options.codec === 'h265-nvenc') {
    args.push('-cq', crfMap[options.quality]);
  } else {
    args.push('-crf', crfMap[options.quality]);
  }

  // Bitrate (if specified)
  if (options.bitrate) {
    args.push('-b:v', options.bitrate);
  }

  // Pixel format (required for compatibility)
  args.push('-pix_fmt', 'yuv420p');

  // Audio codec
  if (options.audioPath) {
    args.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  }

  // Fast start for web streaming
  args.push('-movflags', '+faststart');

  // Overwrite output
  args.push('-y');

  // Output file
  args.push(options.outputPath);

  return args;
}

// Usage
const command = buildFFmpegCommand({
  inputPattern: 'frames/%05d.png',
  outputPath: 'output.mp4',
  fps: 30,
  codec: 'h264',
  quality: 'quality',
  bitrate: '35M',
});

console.log('ffmpeg ' + command.join(' '));
```

### Bitrate Recommendations

| Resolution | Mono 360 | Stereo 360 | Notes |
|------------|----------|------------|-------|
| 4096x2048  | 25-35M   | 35-50M     | Good for most VR |
| 6144x3072  | 40-60M   | 60-80M     | High quality |
| 8192x4096  | 60-100M  | 100-150M   | Maximum quality |

---

## 9. Spatial Metadata Injection

### YouTube VR Metadata Requirements

YouTube recognizes 360/VR videos through embedded metadata in the video file. For stereo videos:

- **Projection**: Equirectangular
- **Stereo Mode**: Top-Bottom (left eye on top)
- **Metadata Standard**: Google Spherical Video V2

### Using Google's Spatial Media Tool

```bash
# Install the tool
pip install spatialmedia

# Inject metadata for mono 360
spatialmedia -i input.mp4 output_360.mp4

# Inject metadata for stereo 360 (top-bottom)
spatialmedia -i --stereo=top-bottom input.mp4 output_vr.mp4
```

### ExifTool Alternative (MP4 only)

```bash
# Add spherical metadata
exiftool \
  -XMP-GSpherical:Spherical="true" \
  -XMP-GSpherical:Stitched="true" \
  -XMP-GSpherical:ProjectionType="equirectangular" \
  -XMP-GSpherical:StereoMode="top-bottom" \
  video.mp4
```

### MKVPropedit (MKV/WebM)

```bash
# Set stereo mode and projection for MKV
mkvpropedit video.mkv \
  --edit track:v1 \
  --set stereo-mode=3 \
  --set projection-type=1
```

### Spherical Video V2 Metadata Structure

```xml
<?xml version="1.0"?>
<rdf:SphericalVideo
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:GSpherical="http://ns.google.com/videos/1.0/spherical/">
  <GSpherical:Spherical>true</GSpherical:Spherical>
  <GSpherical:Stitched>true</GSpherical:Stitched>
  <GSpherical:StitchingSoftware>Ethereal Flame Studio</GSpherical:StitchingSoftware>
  <GSpherical:ProjectionType>equirectangular</GSpherical:ProjectionType>
  <GSpherical:StereoMode>top-bottom</GSpherical:StereoMode>
</rdf:SphericalVideo>
```

### TypeScript Metadata Helper

```typescript
interface SpatialMetadataOptions {
  inputPath: string;
  outputPath: string;
  isStereo: boolean;
  stereoMode?: 'top-bottom' | 'left-right';
}

function buildSpatialMediaCommand(options: SpatialMetadataOptions): string[] {
  const { inputPath, outputPath, isStereo, stereoMode = 'top-bottom' } = options;

  const args = ['spatialmedia', '-i'];

  if (isStereo) {
    args.push(`--stereo=${stereoMode}`);
  }

  args.push(inputPath, outputPath);

  return args;
}

// Platform compatibility info
const VR_PLATFORM_REQUIREMENTS = {
  youtube: {
    format: 'MP4 (H.264 or H.265)',
    metadata: 'Google Spherical Video V2',
    stereoLayout: 'Top/Bottom',
    maxResolution: '8192x8192',
  },
  metaQuest: {
    format: 'MP4 H.265 recommended',
    maxResolution: '5760x5760',
    stereoLayout: 'Top/Bottom',
  },
  appleVisionPro: {
    format: 'MP4 H.265 (HEVC Main 10)',
    maxResolution: '7680x3840',
    notes: 'Requires specific spatial metadata',
  },
};
```

---

## 10. Integration Examples

### Complete Stereo 360 Capture Pipeline

```typescript
import * as THREE from 'three';

/**
 * Complete stereo 360 video capture pipeline
 */
class Stereo360Pipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private stereoCameras: StereoCubeCameras;
  private equirectConverter: EquirectangularConverter;
  private clock: SteppableClock;

  constructor(scene: THREE.Scene, options: {
    resolution?: number;
    ipd?: number;
    fps?: number;
  } = {}) {
    const { resolution = 2048, ipd = 0.064, fps = 30 } = options;

    // Create optimized renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    this.scene = scene;
    this.stereoCameras = new StereoCubeCameras(resolution, ipd);
    this.equirectConverter = new EquirectangularConverter(this.renderer);
    this.clock = new SteppableClock(fps);
  }

  /**
   * Render a single stereo frame
   */
  renderFrame(outputWidth: number): {
    left: Uint8Array;
    right: Uint8Array;
    combined: Uint8Array;
  } {
    // Step the clock
    this.clock.step();

    // Update animations with deterministic time
    // (caller should update scene here)

    // Capture both eyes
    const { left: leftCubemap, right: rightCubemap } =
      this.stereoCameras.capture(this.renderer, this.scene);

    // Convert to equirectangular
    const leftEquirect = this.equirectConverter.convert(leftCubemap, outputWidth);
    const rightEquirect = this.equirectConverter.convert(rightCubemap, outputWidth);

    // Stack top-bottom
    const combined = this.stackTopBottom(leftEquirect, rightEquirect, outputWidth);

    return { left: leftEquirect, right: rightEquirect, combined };
  }

  private stackTopBottom(
    left: Uint8Array,
    right: Uint8Array,
    width: number
  ): Uint8Array {
    const height = width / 2;
    const combinedHeight = height * 2;
    const combined = new Uint8Array(width * combinedHeight * 4);

    combined.set(left, 0);
    combined.set(right, left.length);

    return combined;
  }

  /**
   * Render complete video
   */
  async renderVideo(
    durationSeconds: number,
    outputWidth: number,
    onFrame: (time: number, delta: number) => void,
    onProgress?: (frame: number, total: number) => void
  ): Promise<Uint8Array[]> {
    const fps = 30;
    const totalFrames = Math.ceil(durationSeconds * fps);
    const frames: Uint8Array[] = [];

    this.clock.reset();

    for (let i = 0; i < totalFrames; i++) {
      // Update scene
      onFrame(this.clock.getElapsedTime(), this.clock.getDelta());

      // Render frame
      const { combined } = this.renderFrame(outputWidth);
      frames.push(combined);

      // Progress callback
      if (onProgress) {
        onProgress(i + 1, totalFrames);
      }

      // Yield periodically
      if (i % 30 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return frames;
  }

  dispose(): void {
    this.stereoCameras.dispose();
    this.equirectConverter.dispose();
    this.renderer.dispose();
  }
}

// Usage example
async function exportVideo() {
  const scene = new THREE.Scene();
  // ... setup scene ...

  const pipeline = new Stereo360Pipeline(scene, {
    resolution: 2048,  // 8K output
    ipd: 0.064,        // 64mm
    fps: 30,
  });

  const frames = await pipeline.renderVideo(
    30,      // 30 seconds
    8192,    // 8K width
    (time, delta) => {
      // Update animations
      mixer.update(delta);
      particles.update(time);
    },
    (frame, total) => {
      console.log(`Rendering: ${frame}/${total} (${Math.round(frame/total*100)}%)`);
    }
  );

  // Save frames to disk and encode with FFmpeg
  for (let i = 0; i < frames.length; i++) {
    await saveFrameToDisk(frames[i], `frames/${String(i).padStart(5, '0')}.png`);
  }

  // Encode with FFmpeg
  // ffmpeg -framerate 30 -i frames/%05d.png -c:v libx264 -crf 18 output.mp4

  pipeline.dispose();
}
```

### Integration with Existing Ethereal Flame Studio Pipeline

The project already has implementations for these components:

| Component | File | Status |
|-----------|------|--------|
| CubemapCapture | `src/lib/render/CubemapCapture.ts` | Implemented |
| EquirectangularConverter | `src/lib/render/EquirectangularConverter.ts` | Implemented |
| StereoCapture | `src/lib/render/StereoCapture.ts` | Implemented |
| StereoStacker | `src/lib/render/StereoStacker.ts` | Implemented |
| FFmpegEncoder | `src/lib/render/FFmpegEncoder.ts` | Implemented |
| SpatialMetadata | `src/lib/render/SpatialMetadata.ts` | Implemented |

---

## References

### Libraries and Tools

- [THREE.CubemapToEquirectangular](https://github.com/spite/THREE.CubemapToEquirectangular) - Cubemap to equirectangular conversion
- [j360](https://github.com/imgntn/j360) - 360 video capture for Three.js
- [CCapture.js](https://github.com/spite/ccapture.js) - Deterministic canvas capture
- [THREEcap](https://github.com/jbaicoianu/threecap) - Three.js frame capture system
- [Google Spatial Media](https://github.com/google/spatial-media) - VR metadata tools

### Documentation

- [Three.js CubeCamera Docs](https://threejs.org/docs/pages/CubeCamera.html)
- [YouTube 360 Video Requirements](https://support.google.com/youtube/answer/6178631)
- [Google VR 360 Media Specs](https://developers.google.com/vr/discover/360-degree-media)
- [Spherical Video V2 RFC](https://github.com/google/spatial-media/blob/master/docs/spherical-video-v2-rfc.md)

### FFmpeg Resources

- [FFmpeg Cheat Sheet for 360 Video](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)
- [VR Video Encoding Best Practices](https://headjack.io/blog/best-encoding-settings-resolution-for-4k-360-3d-vr-videos/)

### Three.js Forums and Discussions

- [Three.js Stereo Rendering](https://discourse.threejs.org/t/stereo-effect-is-not-giving-the-3d-effect-inside-headset/62559)
- [360 Panorama Rendering](https://discourse.threejs.org/t/make-a-custom-pass-to-render-a-360-degree-equirectangular-panorama-image-from-a-scene/54391)
- [Video Export Methods](https://discourse.threejs.org/t/export-three-js-r3f-to-video/42612)
- [Memory Management](https://discourse.threejs.org/t/how-much-gb-of-memory-my-renderer-scene-is-holding/33139)
