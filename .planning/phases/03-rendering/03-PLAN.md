---
phase: 03-rendering
plans: 8
type: execute
waves: 6
total_tasks: 19

plan_structure:
  - id: "03-01"
    name: "Pre-analysis for Offline Rendering"
    wave: 1
    depends_on: []
    files_modified: [src/lib/audio/PreAnalyzer.ts, src/types/index.ts]
    autonomous: true
    tasks: 2

  - id: "03-02"
    name: "Frame Capture System"
    wave: 2
    depends_on: ["03-01"]
    files_modified: [src/lib/render/FrameCapture.ts, src/lib/render/RenderTarget.ts]
    autonomous: true
    tasks: 2

  - id: "03-03"
    name: "Flat Export Pipeline (1080p/4K)"
    wave: 3
    depends_on: ["03-02"]
    files_modified: [src/lib/render/FlatExporter.ts, src/components/ui/ExportPanel.tsx]
    autonomous: true
    tasks: 3

  - id: "03-04"
    name: "360 Monoscopic Pipeline"
    wave: 3
    depends_on: ["03-02"]
    files_modified: [src/lib/render/CubemapCapture.ts, src/lib/render/EquirectangularConverter.ts]
    autonomous: true
    tasks: 2

  - id: "03-05"
    name: "360 Stereoscopic Pipeline"
    wave: 4
    depends_on: ["03-04"]
    files_modified: [src/lib/render/StereoCapture.ts, src/lib/render/StereoStacker.ts]
    autonomous: true
    tasks: 2

  - id: "03-06"
    name: "FFmpeg Integration + VR Metadata"
    wave: 5
    depends_on: ["03-03", "03-04", "03-05"]
    files_modified: [src/lib/render/FFmpegEncoder.ts, src/lib/render/SpatialMetadata.ts, scripts/inject-metadata.py]
    autonomous: true
    tasks: 3

  - id: "03-07"
    name: "Headless Rendering Mode"
    wave: 6
    depends_on: ["03-06"]
    files_modified: [scripts/render-server.ts, scripts/headless-render.ts, Dockerfile]
    autonomous: true
    tasks: 3

  - id: "03-08"
    name: "Render Queue with Persistence"
    wave: 6
    depends_on: ["03-06"]
    files_modified: [src/lib/queue/RenderQueue.ts, src/lib/queue/JobStore.ts, src/app/api/render/route.ts]
    autonomous: true
    tasks: 2

must_haves:
  truths:
    - "User can export 1080p video in both 16:9 and 9:16 aspect ratios"
    - "User can export 4K video in both aspect ratios"
    - "User can export 360 monoscopic equirectangular video up to 8K"
    - "User can export 360 stereoscopic (Top/Bottom) video at 8K"
    - "Exported 360 videos upload to YouTube and display in VR mode"
    - "User can queue multiple renders and retrieve completed jobs after browser close"
    - "Render server can process jobs via CLI without GUI"

  artifacts:
    - path: "src/lib/audio/PreAnalyzer.ts"
      provides: "Amplitude-per-frame data generation for offline rendering"
      exports: ["PreAnalyzer", "FrameAudioData"]
    - path: "src/lib/render/FrameCapture.ts"
      provides: "WebGLRenderTarget frame capture with async readPixels"
      exports: ["FrameCapture"]
    - path: "src/lib/render/FlatExporter.ts"
      provides: "1080p/4K flat video export"
      exports: ["FlatExporter"]
    - path: "src/lib/render/CubemapCapture.ts"
      provides: "CubeCamera capture for 360 rendering"
      exports: ["CubemapCapture"]
    - path: "src/lib/render/EquirectangularConverter.ts"
      provides: "Cubemap to equirectangular projection"
      exports: ["EquirectangularConverter"]
    - path: "src/lib/render/StereoCapture.ts"
      provides: "Dual CubeCamera capture with IPD offset"
      exports: ["StereoCapture"]
    - path: "src/lib/render/FFmpegEncoder.ts"
      provides: "Frame sequence to video encoding"
      exports: ["FFmpegEncoder"]
    - path: "src/lib/render/SpatialMetadata.ts"
      provides: "VR spatial metadata injection"
      exports: ["injectSpatialMetadata"]
    - path: "src/lib/queue/RenderQueue.ts"
      provides: "Job queue with persistence"
      exports: ["RenderQueue", "RenderJob"]
    - path: "scripts/render-server.ts"
      provides: "Headless rendering entry point"

  key_links:
    - from: "src/lib/audio/PreAnalyzer.ts"
      to: "src/lib/audio/AudioAnalyzer.ts"
      via: "Reuses FFT analysis logic for offline processing"
      pattern: "analyzeBuffer.*getFrequencyData"
    - from: "src/lib/render/FrameCapture.ts"
      to: "THREE.WebGLRenderTarget"
      via: "Captures rendered frames"
      pattern: "readRenderTargetPixels"
    - from: "src/lib/render/EquirectangularConverter.ts"
      to: "src/lib/render/CubemapCapture.ts"
      via: "Converts cubemap to equirectangular"
      pattern: "cubemapToEquirectangular"
    - from: "src/lib/render/FFmpegEncoder.ts"
      to: "FFmpeg CLI"
      via: "Spawns FFmpeg process"
      pattern: "spawn.*ffmpeg"
    - from: "src/lib/render/SpatialMetadata.ts"
      to: "scripts/inject-metadata.py"
      via: "Calls Python spatial media tool"
      pattern: "spatialmedia.*inject"
---

# Phase 3: Rendering Pipeline - Execution Plan

## Overview

This phase transforms the live preview into a production rendering pipeline capable of exporting publication-quality videos from 1080p to 8K 360 stereoscopic. The architecture uses a hybrid approach: browser-based for preview/quick exports and server-side headless rendering for 4K+ and batch processing.

**Dependencies:** Phase 1 (visual engine), Phase 2 (templates define what to render)

**Total Plans:** 8 plans in 6 waves
**Total Tasks:** 19 tasks

---

## Wave Structure

```
Wave 1: 03-01 (Pre-analysis)
         |
Wave 2: 03-02 (Frame capture)
         |
         +---------------------+
         |                     |
Wave 3: 03-03 (Flat export)  03-04 (360 mono)
         |                     |
         |              Wave 4: 03-05 (360 stereo)
         |                     |
         +---------------------+
                   |
Wave 5: 03-06 (FFmpeg + VR metadata)
                   |
         +-------------------+
         |                   |
Wave 6: 03-07 (Headless)   03-08 (Queue)
```

---

## Plan 03-01: Pre-analysis for Offline Rendering

**Wave:** 1
**Depends on:** None (builds on Phase 1 audio foundation)
**Requirement:** AUD-03

### Objective

Create amplitude-per-frame data generation for offline (non-realtime) rendering. Instead of analyzing audio in real-time, pre-compute all frequency data for every frame before rendering begins.

### Tasks

<task type="auto">
  <name>Task 1: Create PreAnalyzer with full audio decoding</name>
  <files>src/lib/audio/PreAnalyzer.ts, src/types/index.ts</files>
  <action>
Create PreAnalyzer class that:
1. Accepts audio file (ArrayBuffer or URL)
2. Decodes entire audio using Web Audio API's decodeAudioData()
3. Creates OfflineAudioContext at target frame rate (30fps or 60fps)
4. Processes audio buffer through AnalyserNode in offline mode
5. Generates FrameAudioData[] array with amplitude, bass, mid, high, isBeat for each frame
6. Stores frame count and duration

Key implementation details:
- Use OfflineAudioContext for deterministic analysis
- Sample at exact frame boundaries (e.g., at 30fps: every 33.33ms)
- Reuse frequency band calculations from AudioAnalyzer.ts
- Beat detection should use same threshold (0.05) and cooldown (80ms)
- Export FrameAudioData type to src/types/index.ts

```typescript
export interface FrameAudioData {
  frame: number;
  time: number;
  amplitude: number;
  bass: number;
  mid: number;
  high: number;
  isBeat: boolean;
}

export interface PreAnalysisResult {
  frames: FrameAudioData[];
  totalFrames: number;
  duration: number;
  fps: number;
}
```
  </action>
  <verify>
- TypeScript compiles with `npm run build`
- Import PreAnalyzer in a test script and verify it exports PreAnalysisResult
  </verify>
  <done>PreAnalyzer can decode audio and return frame-by-frame audio data array</done>
</task>

<task type="auto">
  <name>Task 2: Add progress callback and caching</name>
  <files>src/lib/audio/PreAnalyzer.ts</files>
  <action>
Extend PreAnalyzer with:
1. Progress callback: `onProgress?: (percent: number) => void`
2. Cancel token support for aborting long analysis
3. Cache mechanism using audio file hash (MD5 or simple hash)
4. Store/retrieve cached analysis from IndexedDB

Implementation:
- Progress reports every 100 frames analyzed
- Cancel via AbortController pattern
- Cache key: `preanalysis_${hash}_${fps}`
- Use idb-keyval or raw IndexedDB for storage
- Cache expiry: 7 days

```typescript
interface PreAnalyzeOptions {
  fps: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}
```
  </action>
  <verify>
- Analyze same file twice, second time should return cached result
- Progress callback fires during analysis
  </verify>
  <done>PreAnalyzer supports progress tracking, cancellation, and caching</done>
</task>

---

## Plan 03-02: Frame Capture System

**Wave:** 2
**Depends on:** 03-01
**Foundation for:** All export pipelines

### Objective

Create the core frame capture infrastructure using WebGLRenderTarget with async pixel reading. This is the foundation for all export types.

### Tasks

<task type="auto">
  <name>Task 1: Create RenderTarget manager</name>
  <files>src/lib/render/RenderTarget.ts</files>
  <action>
Create RenderTargetManager class that:
1. Creates and manages WebGLRenderTarget instances at various resolutions
2. Handles VRAM-conscious allocation/deallocation
3. Provides resolution presets:
   - 1080p: 1920x1080 (16:9), 1080x1920 (9:16)
   - 4K: 3840x2160 (16:9), 2160x3840 (9:16)
   - 8K: 7680x4320 (only for server-side)
   - 360 mono: 4096x2048, 6144x3072, 8192x4096
   - 360 stereo: 8192x8192 (stacked)

```typescript
export type RenderPreset =
  | '1080p-landscape' | '1080p-portrait'
  | '4k-landscape' | '4k-portrait'
  | '360-4k' | '360-6k' | '360-8k'
  | '360-stereo-8k';

export interface RenderTargetConfig {
  width: number;
  height: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
}
```

Key details:
- Use THREE.RGBAFormat and THREE.UnsignedByteType for export
- Create getter for resolution by preset name
- Track allocated targets for cleanup
  </action>
  <verify>
- TypeScript compiles
- RenderTargetManager exports resolution presets
  </verify>
  <done>RenderTargetManager provides resolution-aware render targets</done>
</task>

<task type="auto">
  <name>Task 2: Create FrameCapture with async readPixels</name>
  <files>src/lib/render/FrameCapture.ts</files>
  <action>
Create FrameCapture class that:
1. Captures frames from WebGLRenderer to RenderTarget
2. Uses renderer.readRenderTargetPixelsAsync() when available (WebGL2)
3. Falls back to synchronous readRenderTargetPixels for WebGL1
4. Manages frame buffer (Uint8Array) allocation
5. Provides frame data as ImageData or raw Uint8Array

Key implementation:
- Detect WebGL2 support and use async path when possible
- Maintain frame ordering with sequence numbers (async readPixels may complete out of order)
- Implement double-buffering to avoid stalls
- Add gamma correction option (Three.js renders linear, video expects sRGB)

```typescript
export interface CapturedFrame {
  frameNumber: number;
  width: number;
  height: number;
  data: Uint8Array;
  timestamp: number;
}

export class FrameCapture {
  constructor(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget);
  async captureFrame(frameNumber: number): Promise<CapturedFrame>;
  setGammaCorrection(enabled: boolean): void;
  dispose(): void;
}
```
  </action>
  <verify>
- Create test that captures 10 frames and verifies frame numbers are sequential
- Verify Uint8Array length matches width * height * 4
  </verify>
  <done>FrameCapture reliably captures frames with correct ordering</done>
</task>

---

## Plan 03-03: Flat Export Pipeline (1080p/4K)

**Wave:** 3
**Depends on:** 03-02
**Requirements:** RND-01, RND-02, RND-03

### Objective

Implement flat video export for standard social media formats (1080p and 4K in both landscape and portrait orientations).

### Tasks

<task type="auto">
  <name>Task 1: Create FlatExporter orchestrator</name>
  <files>src/lib/render/FlatExporter.ts</files>
  <action>
Create FlatExporter class that orchestrates the flat export pipeline:

1. Accept export configuration:
```typescript
export interface FlatExportConfig {
  preset: '1080p-landscape' | '1080p-portrait' | '4k-landscape' | '4k-portrait';
  fps: 30 | 60;
  audioFile: File | ArrayBuffer;
  onProgress?: (percent: number, stage: string) => void;
}
```

2. Implement export workflow:
   - Stage 1: Pre-analyze audio (call PreAnalyzer)
   - Stage 2: Set up render target at correct resolution
   - Stage 3: Render each frame using pre-analyzed audio data
   - Stage 4: Store frames (initially as PNG sequence)
   - Stage 5: Hand off to FFmpeg encoder (implemented in 03-06)

3. Frame rendering loop:
   - For each frame 0 to totalFrames:
     - Get audio data for frame from PreAnalysisResult
     - Update visual state (particle positions, audio reactivity)
     - Render scene to target
     - Capture frame
     - Report progress

4. Use requestAnimationFrame for browser exports (yield to UI)
5. Use tight loop for headless rendering

Key concern: Camera setup. For flat export, use the same perspective camera as preview. Capture what user sees.
  </action>
  <verify>
- FlatExporter.export() returns Promise that resolves with frame sequence path
- Progress callback fires with increasing percentages
  </verify>
  <done>FlatExporter orchestrates complete flat video export workflow</done>
</task>

<task type="auto">
  <name>Task 2: Implement frame-accurate scene stepping</name>
  <files>src/lib/render/SceneStepper.ts</files>
  <action>
Create SceneStepper that deterministically advances the scene state:

1. Accept scene components (ParticleSystem, Skybox) and audio data
2. Implement stepToFrame(frameNumber, audioData):
   - Calculate exact time for frame (frameNumber / fps)
   - Update particle positions based on elapsed time
   - Apply audio reactivity values from pre-analyzed data
   - Update skybox rotation

3. Make particle system deterministic:
   - Seed random number generator with fixed seed
   - Particle positions must be reproducible given same inputs
   - Export seedRandom() utility

4. Handle time accumulation correctly:
   - Don't use real deltaTime
   - Use fixed frame duration (1/fps)
   - Avoid floating point drift (use frame count, not accumulated time)

```typescript
export class SceneStepper {
  constructor(
    particleSystem: ParticleSystemRef,
    skybox: StarNestSkyboxRef,
    fps: number
  );

  stepToFrame(frame: number, audioData: FrameAudioData): void;
  reset(): void;
}
```
  </action>
  <verify>
- Render frame 100 twice with same audio data, pixel output is identical
- Particle positions at frame N are deterministic
  </verify>
  <done>Scene can be deterministically stepped to any frame</done>
</task>

<task type="auto">
  <name>Task 3: Create ExportPanel UI component</name>
  <files>src/components/ui/ExportPanel.tsx, src/app/page.tsx</files>
  <action>
Create ExportPanel React component for browser-based exports:

1. UI elements:
   - Preset selector dropdown (1080p 16:9, 1080p 9:16, 4K 16:9, 4K 9:16)
   - FPS selector (30fps, 60fps)
   - Export button
   - Progress bar with stage indicator
   - Cancel button (active during export)
   - Download button (after completion)

2. State management:
   - exportState: 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'complete' | 'error'
   - progress: number (0-100)
   - currentStage: string
   - outputUrl: string | null (blob URL for download)

3. Styling:
   - Match existing ControlPanel aesthetic (bg-black/70 backdrop-blur-md)
   - Collapsible like ControlPanel
   - Touch-friendly 44px minimum targets

4. Add to page.tsx alongside ControlPanel (bottom-right corner)

Note: Actual encoding happens in 03-06. This task focuses on capture and UI. Initially export frame sequence as ZIP.
  </action>
  <verify>
- ExportPanel renders with preset dropdown and export button
- Export button triggers FlatExporter workflow
- Progress bar updates during export
  </verify>
  <done>User can initiate flat exports from browser UI</done>
</task>

---

## Plan 03-04: 360 Monoscopic Pipeline

**Wave:** 3 (parallel with 03-03)
**Depends on:** 03-02
**Requirement:** RND-04

### Objective

Implement 360 monoscopic equirectangular video export using CubeCamera capture and cubemap-to-equirectangular conversion.

### Tasks

<task type="auto">
  <name>Task 1: Create CubemapCapture using CubeCamera</name>
  <files>src/lib/render/CubemapCapture.ts</files>
  <action>
Create CubemapCapture class for 360 scene capture:

1. Set up THREE.CubeCamera:
   - Near/far planes appropriate for scene (0.1, 1000)
   - Resolution based on output (1024 for 4K, 2048 for 8K)
   - Use WebGLCubeRenderTarget

2. Position camera at scene center (origin by default)
3. Implement captureFrame():
   - cubeCamera.update(renderer, scene)
   - Return cubemap texture reference

4. Resolution mapping:
   - 4K equirect (4096x2048) -> 1024x1024 cube faces
   - 6K equirect (6144x3072) -> 1536x1536 cube faces
   - 8K equirect (8192x4096) -> 2048x2048 cube faces

```typescript
export type CubemapResolution = 1024 | 1536 | 2048;

export class CubemapCapture {
  constructor(
    renderer: THREE.WebGLRenderer,
    resolution: CubemapResolution
  );

  captureFrame(scene: THREE.Scene): THREE.CubeTexture;
  setPosition(position: THREE.Vector3): void;
  dispose(): void;
}
```

Key concern: Exclude UI elements from 360 capture. Scene should only contain visuals (particles, skybox).
  </action>
  <verify>
- CubemapCapture.captureFrame() returns valid CubeTexture
- Cube faces have correct resolution
  </verify>
  <done>CubemapCapture produces cubemap textures from scene</done>
</task>

<task type="auto">
  <name>Task 2: Create EquirectangularConverter</name>
  <files>src/lib/render/EquirectangularConverter.ts, src/lib/shaders/equirect.frag.glsl</files>
  <action>
Create EquirectangularConverter that transforms cubemap to equirectangular:

1. Implement cubemap-to-equirectangular shader:
```glsl
// equirect.frag.glsl
uniform samplerCube cubemap;
varying vec2 vUv;

void main() {
  float theta = vUv.x * 2.0 * PI;  // 0 to 2PI (longitude)
  float phi = vUv.y * PI;           // 0 to PI (latitude)

  vec3 dir;
  dir.x = sin(phi) * sin(theta);
  dir.y = cos(phi);
  dir.z = sin(phi) * cos(theta);

  gl_FragColor = textureCube(cubemap, dir);
}
```

2. Create conversion pipeline:
   - Create full-screen quad with equirect shader
   - Render to WebGLRenderTarget at equirect resolution
   - Read pixels to get equirectangular image

3. Handle resolution:
   - Output aspect ratio is always 2:1
   - Width = 2 * height

```typescript
export class EquirectangularConverter {
  constructor(renderer: THREE.WebGLRenderer);

  convert(
    cubemap: THREE.CubeTexture,
    outputWidth: number
  ): Promise<CapturedFrame>;

  dispose(): void;
}
```

Library alternative: If THREE.CubemapToEquirectangular library works with current Three.js version, use it instead of custom shader. Verify compatibility first.
  </action>
  <verify>
- Convert cubemap to equirectangular, verify output is 2:1 aspect ratio
- Visual inspection: horizon should appear straight in center of image
  </verify>
  <done>EquirectangularConverter produces correct 2:1 equirectangular frames</done>
</task>

---

## Plan 03-05: 360 Stereoscopic Pipeline

**Wave:** 4
**Depends on:** 03-04
**Requirement:** RND-05

### Objective

Implement 360 stereoscopic export using dual CubeCamera capture with interpupillary distance offset, producing Top/Bottom format for VR headsets.

### Tasks

<task type="auto">
  <name>Task 1: Create StereoCapture with IPD offset</name>
  <files>src/lib/render/StereoCapture.ts</files>
  <action>
Create StereoCapture class for stereoscopic 360 capture:

1. Create TWO CubeCamera instances:
   - Left eye: position.x = -IPD/2
   - Right eye: position.x = +IPD/2
   - IPD (interpupillary distance) = 0.064 meters (64mm standard)

2. Scale IPD to scene units:
   - If scene uses different units, provide IPD multiplier
   - Default assumes 1 unit = 1 meter

3. Implement captureStereoFrame():
   - Capture left eye cubemap
   - Convert to equirectangular (left)
   - Capture right eye cubemap
   - Convert to equirectangular (right)
   - Return both frames

```typescript
export interface StereoFramePair {
  left: CapturedFrame;
  right: CapturedFrame;
}

export class StereoCapture {
  constructor(
    renderer: THREE.WebGLRenderer,
    equirectConverter: EquirectangularConverter,
    options?: { ipd?: number; resolution?: CubemapResolution }
  );

  captureStereoFrame(scene: THREE.Scene): Promise<StereoFramePair>;
  setIPD(ipd: number): void;
  dispose(): void;
}
```

Note: For particle effects centered at origin, IPD creates proper depth perception. Camera positions offset horizontally, both looking at same scene.
  </action>
  <verify>
- StereoCapture produces two distinct equirectangular frames
- Left and right frames have visible parallax difference
  </verify>
  <done>StereoCapture produces left/right eye equirectangular frames</done>
</task>

<task type="auto">
  <name>Task 2: Create StereoStacker for Top/Bottom format</name>
  <files>src/lib/render/StereoStacker.ts</files>
  <action>
Create StereoStacker that combines left/right frames into Top/Bottom format:

1. YouTube VR specification:
   - Top/Bottom (Over/Under) layout
   - Left eye on TOP
   - Right eye on BOTTOM
   - Final resolution: width x (height * 2)

2. For 8K stereo:
   - Each eye: 8192x4096
   - Combined: 8192x8192

3. Implementation:
   - Create output buffer of combined size
   - Copy left frame data to top half
   - Copy right frame data to bottom half
   - Return combined frame

```typescript
export class StereoStacker {
  stackTopBottom(stereo: StereoFramePair): CapturedFrame;
}
```

4. Add validation:
   - Left and right frames must have same dimensions
   - Warn if combined exceeds 8192x8192 (YouTube limit)

Memory consideration: 8K stereo frame is 8192 * 8192 * 4 = 268MB per frame. Ensure proper buffer management.
  </action>
  <verify>
- StereoStacker produces frame with height = 2 * input height
- Left frame data appears in top half of output
  </verify>
  <done>StereoStacker produces YouTube-compatible Top/Bottom stereo frames</done>
</task>

---

## Plan 03-06: FFmpeg Integration + VR Metadata

**Wave:** 5
**Depends on:** 03-03, 03-04, 03-05
**Requirements:** RND-06

### Objective

Implement video encoding using FFmpeg and inject VR spatial metadata for YouTube/headset compatibility.

### Tasks

<task type="auto">
  <name>Task 1: Create FFmpegEncoder for frame-to-video</name>
  <files>src/lib/render/FFmpegEncoder.ts</files>
  <action>
Create FFmpegEncoder class for server-side video encoding:

1. Accept frame sequence and encode to video:
   - Input: Frame data stream or directory of PNG files
   - Output: MP4 file (H.264 or H.265)

2. Encoding presets based on research:
```typescript
export type EncodingPreset =
  | 'h264-web'      // H.264, CRF 18, good compatibility
  | 'h265-quality'  // H.265, CRF 20, better compression
  | 'h265-nvenc';   // H.265 with NVIDIA hardware acceleration

export interface EncodeOptions {
  inputPattern: string;        // e.g., "frames/%05d.png"
  outputPath: string;
  fps: number;
  preset: EncodingPreset;
  audioPath?: string;          // Mux audio track
  bitrate?: string;            // e.g., "35M" for 4K
  onProgress?: (percent: number) => void;
}
```

3. FFmpeg command construction:
```bash
# H.264 Web
ffmpeg -framerate {fps} -i {inputPattern} -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p {output}

# H.265 Quality
ffmpeg -framerate {fps} -i {inputPattern} -c:v libx265 -preset slow -crf 20 -pix_fmt yuv420p {output}

# With audio
ffmpeg -framerate {fps} -i {inputPattern} -i {audioPath} -c:v libx264 -c:a aac -shortest {output}
```

4. Use Node.js child_process.spawn() for FFmpeg
5. Parse FFmpeg stderr for progress (frame count)
6. Return Promise that resolves with output path
  </action>
  <verify>
- FFmpegEncoder.encode() produces valid MP4 file
- Progress callback fires with frame count
  </verify>
  <done>FFmpegEncoder produces encoded video from frame sequences</done>
</task>

<task type="auto">
  <name>Task 2: Create SpatialMetadata injector</name>
  <files>src/lib/render/SpatialMetadata.ts, scripts/inject-metadata.py</files>
  <action>
Create SpatialMetadata module for VR video metadata injection:

1. Create Python script using Google's spatial-media library:
```python
# scripts/inject-metadata.py
import sys
from spatialmedia import metadata_utils

def inject_vr_metadata(input_path, output_path, stereo=False):
    metadata = metadata_utils.Metadata()
    metadata.video = metadata_utils.generate_spherical_xml(
        stereo_mode="top-bottom" if stereo else None
    )
    metadata_utils.inject_metadata(input_path, output_path, metadata)

if __name__ == "__main__":
    inject_vr_metadata(sys.argv[1], sys.argv[2], sys.argv[3] == "stereo")
```

2. Create TypeScript wrapper:
```typescript
export interface SpatialMetadataOptions {
  inputPath: string;
  outputPath: string;
  isStereo: boolean;
}

export async function injectSpatialMetadata(
  options: SpatialMetadataOptions
): Promise<string>;
```

3. Implementation:
   - Call Python script via child_process
   - Handle Python environment (venv or system)
   - Verify output file exists after injection

4. Add package.json script for Python deps:
```json
"scripts": {
  "install:spatial": "pip install spatial-media"
}
```

Important: This is required for YouTube to recognize 360 videos. Without proper metadata, YouTube will play video flat.
  </action>
  <verify>
- Inject metadata into test video
- Upload to YouTube and verify it shows 360 controls
  </verify>
  <done>SpatialMetadata injection produces YouTube-compatible VR videos</done>
</task>

<task type="auto">
  <name>Task 3: Create unified export API</name>
  <files>src/lib/render/ExportPipeline.ts</files>
  <action>
Create ExportPipeline that unifies all export types:

```typescript
export type ExportType =
  | 'flat-1080p-landscape' | 'flat-1080p-portrait'
  | 'flat-4k-landscape' | 'flat-4k-portrait'
  | '360-mono-4k' | '360-mono-6k' | '360-mono-8k'
  | '360-stereo-8k';

export interface ExportConfig {
  type: ExportType;
  fps: 30 | 60;
  audioFile: File | ArrayBuffer;
  templateId?: string;  // From Phase 2
  outputName: string;
  onProgress?: (percent: number, stage: string) => void;
}

export interface ExportResult {
  success: boolean;
  outputPath: string;
  duration: number;
  error?: string;
}

export class ExportPipeline {
  async export(config: ExportConfig): Promise<ExportResult>;
}
```

Implementation:
1. Route to correct pipeline based on type
2. Coordinate stages: analyze -> render -> encode -> metadata
3. Calculate total progress across stages (analyze: 10%, render: 70%, encode: 15%, metadata: 5%)
4. Clean up temporary files after completion
5. Handle errors gracefully with rollback

Stage weighting for progress:
- Pre-analysis: 10%
- Frame rendering: 70%
- FFmpeg encoding: 15%
- Metadata injection: 5%
  </action>
  <verify>
- ExportPipeline.export({ type: '360-mono-4k', ... }) completes full workflow
- Progress callback reports smoothly across all stages
  </verify>
  <done>Unified ExportPipeline handles all export types with consistent API</done>
</task>

---

## Plan 03-07: Headless Rendering Mode

**Wave:** 6
**Depends on:** 03-06
**Requirement:** RND-07

### Objective

Enable command-line rendering without GUI using Puppeteer with GPU passthrough for server-side batch processing.

### Tasks

<task type="auto">
  <name>Task 1: Create headless render script</name>
  <files>scripts/headless-render.ts, scripts/render-config.ts</files>
  <action>
Create headless rendering entry point:

1. CLI interface:
```bash
npx ts-node scripts/headless-render.ts \
  --audio input.mp3 \
  --template "etherealFlame" \
  --output output.mp4 \
  --type flat-1080p-landscape \
  --fps 30
```

2. Parse arguments with yargs or commander:
```typescript
// scripts/render-config.ts
export interface RenderConfig {
  audioPath: string;
  templateId: string;
  outputPath: string;
  exportType: ExportType;
  fps: 30 | 60;
}
```

3. Headless render flow:
   - Load Puppeteer with GPU flags
   - Navigate to app URL (localhost or file://)
   - Inject render configuration
   - Execute ExportPipeline in browser context
   - Retrieve output file

4. Puppeteer configuration:
```typescript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=desktop',     // Native GPU
    '--enable-webgl',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist'
  ]
});
```

5. For Linux servers, document xvfb-run requirement:
```bash
xvfb-run -s "-ac -screen 0 1920x1080x24" npx ts-node scripts/headless-render.ts ...
```
  </action>
  <verify>
- Run headless-render.ts with test audio file
- Verify output video is created
  </verify>
  <done>Headless rendering works via CLI</done>
</task>

<task type="auto">
  <name>Task 2: Create render server process</name>
  <files>scripts/render-server.ts</files>
  <action>
Create persistent render server that processes jobs:

1. Server responsibilities:
   - Listen for render job requests
   - Manage Puppeteer browser instance (reuse for performance)
   - Process jobs sequentially (GPU memory limitation)
   - Report status via stdout/file

2. Communication protocol (simple file-based for v1):
```typescript
// Job file format: jobs/pending/{jobId}.json
interface RenderJobFile {
  id: string;
  config: RenderConfig;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress?: number;
  output?: string;
  error?: string;
}
```

3. Server loop:
   - Watch jobs/pending/ directory
   - Pick up new job files
   - Move to jobs/processing/
   - Execute render
   - Move to jobs/complete/ or jobs/failed/

4. Graceful shutdown:
   - Handle SIGTERM/SIGINT
   - Complete current job before exit
   - Don't lose progress

```typescript
// Start server
npx ts-node scripts/render-server.ts --jobs-dir ./jobs

// Submit job (from another process)
cp job.json jobs/pending/
```
  </action>
  <verify>
- Start render-server.ts
- Drop job file in pending/ directory
- Verify job completes and output appears
  </verify>
  <done>Render server processes jobs from file system queue</done>
</task>

<task type="auto">
  <name>Task 3: Create Dockerfile for containerized rendering</name>
  <files>Dockerfile, docker-compose.yml, .dockerignore</files>
  <action>
Create Docker setup for reproducible rendering environment:

1. Dockerfile:
```dockerfile
FROM node:20-slim

# Install dependencies for headless Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install spatial-media for VR metadata
RUN pip3 install spatial-media

# Set up app
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose job directories as volumes
VOLUME ["/app/jobs", "/app/output"]

# Start render server
CMD ["xvfb-run", "-s", "-ac -screen 0 1920x1080x24", "node", "scripts/render-server.js"]
```

2. docker-compose.yml for GPU passthrough:
```yaml
version: '3.8'
services:
  render-server:
    build: .
    volumes:
      - ./jobs:/app/jobs
      - ./output:/app/output
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

3. .dockerignore:
```
node_modules
.git
test-*
*.md
```

4. Add npm scripts:
```json
"scripts": {
  "docker:build": "docker build -t ethereal-render .",
  "docker:run": "docker-compose up"
}
```
  </action>
  <verify>
- docker build completes without errors
- docker run starts render server
- Job submission works through volume mounts
  </verify>
  <done>Containerized rendering environment is ready</done>
</task>

---

## Plan 03-08: Render Queue with Persistence

**Wave:** 6 (parallel with 03-07)
**Depends on:** 03-06
**Requirement:** RND-08

### Objective

Implement a persistent render queue that survives browser close and server restarts, enabling users to submit jobs and retrieve results later.

### Tasks

<task type="auto">
  <name>Task 1: Create RenderQueue and JobStore</name>
  <files>src/lib/queue/RenderQueue.ts, src/lib/queue/JobStore.ts</files>
  <action>
Create persistent job queue system:

1. JobStore for persistence (IndexedDB for browser, SQLite for server):
```typescript
export interface RenderJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: ExportConfig;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputPath?: string;
  error?: string;
}

export class JobStore {
  async create(job: Omit<RenderJob, 'id' | 'createdAt'>): Promise<RenderJob>;
  async update(id: string, updates: Partial<RenderJob>): Promise<RenderJob>;
  async get(id: string): Promise<RenderJob | null>;
  async list(status?: RenderJob['status']): Promise<RenderJob[]>;
  async delete(id: string): Promise<void>;
}
```

2. RenderQueue for job management:
```typescript
export class RenderQueue {
  constructor(store: JobStore, pipeline: ExportPipeline);

  async submit(config: ExportConfig): Promise<string>;  // Returns job ID
  async cancel(jobId: string): Promise<void>;
  async getStatus(jobId: string): Promise<RenderJob | null>;
  async listJobs(): Promise<RenderJob[]>;

  // For server: process next pending job
  async processNext(): Promise<void>;
}
```

3. Browser implementation:
   - Use idb-keyval or Dexie for IndexedDB
   - Jobs persist across page refreshes
   - Processing happens in browser (for small exports)

4. Server implementation:
   - Use better-sqlite3 for SQLite
   - Jobs persist across server restarts
   - Worker picks up jobs and processes
  </action>
  <verify>
- Submit job, close browser, reopen, job is still in queue
- List jobs returns all submitted jobs
  </verify>
  <done>JobStore and RenderQueue provide persistent job management</done>
</task>

<task type="auto">
  <name>Task 2: Create render API endpoints</name>
  <files>src/app/api/render/route.ts, src/app/api/render/[id]/route.ts</files>
  <action>
Create Next.js API routes for render queue:

1. POST /api/render - Submit new job:
```typescript
// src/app/api/render/route.ts
export async function POST(request: Request) {
  const config = await request.json();
  const jobId = await queue.submit(config);
  return Response.json({ jobId });
}

export async function GET() {
  const jobs = await queue.listJobs();
  return Response.json({ jobs });
}
```

2. GET /api/render/[id] - Get job status:
```typescript
// src/app/api/render/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const job = await queue.getStatus(params.id);
  if (!job) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(job);
}
```

3. DELETE /api/render/[id] - Cancel job:
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await queue.cancel(params.id);
  return Response.json({ success: true });
}
```

4. GET /api/render/[id]/download - Download completed video:
   - Return video file as stream
   - Set appropriate Content-Type and Content-Disposition headers

5. Add queue status endpoint for monitoring:
   - GET /api/render/status - Returns queue stats (pending, processing, completed counts)
  </action>
  <verify>
- POST /api/render with config returns jobId
- GET /api/render/[id] returns job status
- Polling /api/render/[id] shows progress updates
  </verify>
  <done>API endpoints enable remote job submission and monitoring</done>
</task>

---

## Verification Checklist

After all plans complete, verify:

### Flat Exports (RND-01, RND-02, RND-03)
- [ ] 1080p 16:9 export produces 1920x1080 video
- [ ] 1080p 9:16 export produces 1080x1920 video
- [ ] 4K 16:9 export produces 3840x2160 video
- [ ] 4K 9:16 export produces 2160x3840 video
- [ ] Audio is synced with visuals
- [ ] Particle effects match preview

### 360 Monoscopic (RND-04)
- [ ] 4K 360 export produces 4096x2048 equirectangular video
- [ ] 8K 360 export produces 8192x4096 equirectangular video
- [ ] Video plays correctly in VLC with 360 mode
- [ ] Skybox renders correctly at all angles

### 360 Stereoscopic (RND-05)
- [ ] 8K stereo export produces 8192x8192 Top/Bottom video
- [ ] Left eye is on top, right eye on bottom
- [ ] Visible depth effect when viewed in VR headset

### VR Metadata (RND-06)
- [ ] 360 mono video uploads to YouTube as 360
- [ ] 360 stereo video uploads to YouTube as VR180/360
- [ ] YouTube shows 360 viewer controls

### Headless Mode (RND-07)
- [ ] CLI render works without GUI: `npx ts-node scripts/headless-render.ts`
- [ ] Docker container starts and processes jobs
- [ ] xvfb-run enables GPU rendering on Linux

### Render Queue (RND-08)
- [ ] Jobs persist after browser close
- [ ] Jobs persist after server restart
- [ ] Progress updates in real-time
- [ ] Completed videos downloadable

---

## Success Criteria

Phase 3 is complete when:

1. **User can export publication-quality videos** - All format options (1080p, 4K, 360, stereo) produce correct output
2. **Rendered videos play in target platforms** - YouTube 360, VR headsets, social media
3. **Headless rendering enables automation** - CLI and Docker support for batch processing
4. **Queue survives interruptions** - Users can submit, leave, and return to completed jobs

---

*Phase 3 Plan created: 2026-01-27*
*Requirements covered: AUD-03, RND-01, RND-02, RND-03, RND-04, RND-05, RND-06, RND-07, RND-08*
