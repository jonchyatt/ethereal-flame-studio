# Phase 3: Rendering Pipeline - Implementation Checklist

**Created:** 2026-01-28
**Purpose:** Step-by-step actionable checklist for implementing Phase 3
**Status:** Ready for implementation

---

## Table of Contents

1. [Pre-requisites Checklist](#1-pre-requisites-checklist)
2. [Plan 03-01: Pre-analysis for Offline Rendering](#2-plan-03-01-pre-analysis-for-offline-rendering)
3. [Plan 03-02: Frame Capture System](#3-plan-03-02-frame-capture-system)
4. [Plan 03-03: Flat Export Pipeline](#4-plan-03-03-flat-export-pipeline)
5. [Plan 03-04: 360 Monoscopic Pipeline](#5-plan-03-04-360-monoscopic-pipeline)
6. [Plan 03-05: 360 Stereoscopic Pipeline](#6-plan-03-05-360-stereoscopic-pipeline)
7. [Plan 03-06: FFmpeg Integration + VR Metadata](#7-plan-03-06-ffmpeg-integration--vr-metadata)
8. [Plan 03-07: Headless Rendering Mode](#8-plan-03-07-headless-rendering-mode)
9. [Plan 03-08: Render Queue with Persistence](#9-plan-03-08-render-queue-with-persistence)
10. [Plan 03-09: YouTube-Optimized Encoding Presets](#10-plan-03-09-youtube-optimized-encoding-presets)
11. [Plan 03-10: Platform-Specific Output Formats](#11-plan-03-10-platform-specific-output-formats)
12. [Plan 03-11: Render Settings UI](#12-plan-03-11-render-settings-ui)
13. [Integration Testing Checklist](#13-integration-testing-checklist)
14. [End-to-End Verification](#14-end-to-end-verification)
15. [Performance Benchmarks](#15-performance-benchmarks)

---

## 1. Pre-requisites Checklist

### Development Environment

- [ ] Node.js 20+ installed
  ```bash
  node --version  # Should be v20.x or higher
  ```

- [ ] npm or yarn available
  ```bash
  npm --version
  ```

- [ ] Python 3.8+ installed (for spatial-media)
  ```bash
  python --version  # or python3 --version
  ```

- [ ] FFmpeg installed and in PATH
  ```bash
  ffmpeg -version
  # Should show version with libx264, libx265 support
  ```

- [ ] GPU drivers installed (NVIDIA recommended for NVENC)
  ```bash
  nvidia-smi  # Check NVIDIA GPU availability
  ```

### Project Dependencies

- [ ] Phase 1 complete (visual engine working)
- [ ] Phase 2 complete (template system working)
- [ ] Install additional npm packages:
  ```bash
  npm install idb-keyval puppeteer yargs uuid
  npm install --save-dev @types/uuid
  ```

- [ ] Install Python spatial-media:
  ```bash
  pip install spatial-media
  # OR
  pip3 install spatial-media
  ```

### Directory Structure

- [ ] Create required directories:
  ```bash
  mkdir -p src/lib/audio
  mkdir -p src/lib/render
  mkdir -p src/lib/queue
  mkdir -p src/lib/shaders
  mkdir -p src/app/api/render
  mkdir -p scripts
  mkdir -p jobs/pending jobs/processing jobs/complete jobs/failed
  mkdir -p output
  ```

### Verification Commands

```bash
# Verify FFmpeg codecs
ffmpeg -encoders | grep libx264
ffmpeg -encoders | grep libx265
ffmpeg -encoders | grep nvenc

# Verify Python spatial-media
python -c "from spatialmedia import metadata_utils; print('OK')"

# Verify project builds
npm run build
```

---

## 2. Plan 03-01: Pre-analysis for Offline Rendering

**Wave:** 1 | **Depends on:** Phase 1 audio foundation | **Requirement:** AUD-03

### Key Implementation Steps

- [x] **Step 1: Create FrameAudioData type**
  - File: `src/types/index.ts`
  - Add interface for per-frame audio data

- [x] **Step 2: Create PreAnalyzer class**
  - File: `src/lib/audio/PreAnalyzer.ts`
  - Implement full audio decoding using Web Audio API
  - Pure FFT implementation for Node.js (WAV files)
  - Generate amplitude data for each frame at target FPS

- [x] **Step 3: Add progress callback support**
  - Report progress every 100 frames
  - Support AbortSignal for cancellation

- [x] **Step 4: Implement IndexedDB caching**
  - Cache key: `preanalysis_${hash}_${fps}`
  - 7-day cache expiry
  - Native IndexedDB implementation (no external dependencies)

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add FrameAudioData, PreAnalysisResult types |
| `src/lib/audio/PreAnalyzer.ts` | Create | Main pre-analysis class |

### Testing Criteria

- [x] PreAnalyzer accepts audio file and returns FrameAudioData[]
- [x] Frame count matches audio duration * fps
- [x] Same audio file returns cached result on second call
- [x] Progress callback fires during analysis
- [x] Cancellation via AbortSignal works

### Verification Commands

```bash
# TypeScript compilation
npm run build

# Unit test (create test file)
npx ts-node -e "
import { PreAnalyzer } from './src/lib/audio/PreAnalyzer';
const analyzer = new PreAnalyzer();
console.log('PreAnalyzer imported successfully');
"
```

### Common Pitfalls to Avoid

1. **Floating point drift** - Use frame count, not accumulated time
2. **Memory leaks** - Clean up OfflineAudioContext after use
3. **Wrong sample rate** - Match audio file sample rate, not hardcoded value
4. **Beat detection mismatch** - Use same threshold (0.05) and cooldown (80ms) as real-time analyzer

---

## 3. Plan 03-02: Frame Capture System

**Wave:** 2 | **Depends on:** 03-01 | **Foundation for:** All export pipelines
**Status:** COMPLETE (2026-01-29)

### Key Implementation Steps

- [x] **Step 1: Create RenderTargetManager**
  - File: `src/lib/render/RenderTarget.ts`
  - Define resolution presets (1080p, 4K, 8K, 360)
  - Manage WebGLRenderTarget allocation/deallocation

- [x] **Step 2: Create FrameCapture class**
  - File: `src/lib/render/FrameCapture.ts`
  - Implement async pixel reading (WebGL2)
  - Add synchronous fallback for WebGL1
  - Handle frame ordering with sequence numbers

- [x] **Step 3: Add gamma correction**
  - Convert linear color space to sRGB
  - Apply during pixel readback
  - Uses LUT for 10x performance improvement

- [x] **Step 4: Implement double-buffering**
  - Avoid GPU stalls during async reads
  - Alternate between two render targets

- [x] **Step 5: Add PNG/JPEG export utilities**
  - frameToPNG, frameToJPEG, frameToBlob functions
  - Configurable quality settings
  - Batch processing with async generator

- [x] **Step 6: Create SceneStepper for deterministic timing**
  - File: `src/lib/render/SceneStepper.ts`
  - Fixed delta time (1/fps) for reproducibility
  - Seeded random number generator (LCG)
  - Checkpoint system for seeking
  - DeterministicClock for Three.js integration

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/RenderTarget.ts` | Create | Resolution presets, target management |
| `src/lib/render/FrameCapture.ts` | Create | Frame capture with async reading |
| `src/lib/render/SceneStepper.ts` | Create | Deterministic time stepping |

### Testing Criteria

- [x] RenderTargetManager returns correct resolutions for each preset
- [x] FrameCapture produces CapturedFrame with correct dimensions
- [x] Frames capture in sequential order (no out-of-order async issues)
- [x] Uint8Array length = width * height * 4

### Verification Commands

```bash
# Test resolution mapping
npx ts-node -e "
import { RenderTargetManager, RenderPreset } from './src/lib/render/RenderTarget';
const presets: RenderPreset[] = ['1080p-landscape', '4k-portrait', '360-8k'];
presets.forEach(p => console.log(p, RenderTargetManager.getResolution(p)));
"
```

### Common Pitfalls to Avoid

1. **Async readPixels ordering** - Always use frame numbers, not callback order
2. **VRAM exhaustion** - Dispose unused render targets immediately
3. **Vertical flip** - WebGL reads bottom-to-top; flip if needed
4. **Color space mismatch** - Three.js renders linear; video expects sRGB

---

## 4. Plan 03-03: Flat Export Pipeline

**Wave:** 3 | **Depends on:** 03-02 | **Requirements:** RND-01, RND-02, RND-03

### Key Implementation Steps

- [x] **Step 1: Create SceneStepper class**
  - File: `src/lib/render/SceneStepper.ts`
  - Deterministic scene advancement
  - Seeded random number generator
  - (Completed as part of 03-02)

- [x] **Step 2: Create FlatExporter class**
  - File: `src/lib/render/FlatExporter.ts`
  - Orchestrate: analyze -> render -> encode
  - Support all flat presets (1080p/4K, landscape/portrait)

- [ ] **Step 3: Create ExportPanel UI component**
  - File: `src/components/ui/ExportPanel.tsx`
  - Preset selector dropdown
  - FPS selector (30/60)
  - Progress bar with stage indicator
  - Cancel and download buttons

- [ ] **Step 4: Wire ExportPanel to page**
  - File: `src/app/page.tsx`
  - Add ExportPanel alongside ControlPanel

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/SceneStepper.ts` | Create | Deterministic scene stepping |
| `src/lib/render/FlatExporter.ts` | Create | Flat video export orchestration |
| `src/components/ui/ExportPanel.tsx` | Create | Export UI component |
| `src/app/page.tsx` | Modify | Add ExportPanel to layout |

### Testing Criteria

- [ ] SceneStepper produces identical particle positions given same frame + seed
- [ ] FlatExporter produces frame sequence matching preview visuals
- [ ] ExportPanel renders with all controls
- [ ] Progress updates smoothly during export
- [ ] Cancel button stops export in progress

### Verification Commands

```bash
# Test deterministic rendering
npx ts-node -e "
// Render frame 100 twice, compare pixel data
// Expect identical output
"

# Verify UI renders
npm run dev
# Navigate to app, check ExportPanel appears
```

### Common Pitfalls to Avoid

1. **Non-deterministic particles** - Must seed RNG for reproducibility
2. **Using real deltaTime** - Use fixed frame duration (1/fps)
3. **Blocking UI** - Use requestAnimationFrame for browser exports
4. **Missing audio sync** - Ensure frame timing matches audio position

---

## 5. Plan 03-04: 360 Monoscopic Pipeline

**Wave:** 3 (parallel with 03-03) | **Depends on:** 03-02 | **Requirement:** RND-04

### Key Implementation Steps

- [ ] **Step 1: Create CubemapCapture class**
  - File: `src/lib/render/CubemapCapture.ts`
  - Set up THREE.CubeCamera
  - Resolution mapping: 4K->1024 faces, 8K->2048 faces

- [ ] **Step 2: Create equirectangular shader**
  - File: `src/lib/shaders/equirect.frag.glsl`
  - Cubemap to latlong projection
  - Handle spherical coordinates correctly

- [ ] **Step 3: Create EquirectangularConverter**
  - File: `src/lib/render/EquirectangularConverter.ts`
  - Full-screen quad with shader
  - Render to equirect resolution (2:1 aspect)

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/CubemapCapture.ts` | Create | CubeCamera 360 capture |
| `src/lib/shaders/equirect.vert.glsl` | Create | Vertex shader |
| `src/lib/shaders/equirect.frag.glsl` | Create | Equirectangular conversion shader |
| `src/lib/render/EquirectangularConverter.ts` | Create | Cubemap to equirect conversion |

### Testing Criteria

- [ ] CubeCamera captures all 6 faces correctly
- [ ] Equirectangular output has 2:1 aspect ratio
- [ ] Horizon appears straight in center of image
- [ ] No visible seams between cube faces
- [ ] Skybox renders correctly at all angles

### Verification Commands

```bash
# Export single 360 frame and inspect
# Horizon should be straight horizontal line in middle of image

# Test with VLC 360 player
vlc --video-on-top test-360.png
```

### Common Pitfalls to Avoid

1. **UI in 360 capture** - Exclude overlay elements from scene during capture
2. **Seam artifacts** - Ensure cube faces have no gaps
3. **Wrong projection** - theta goes 0-2PI (longitude), phi goes 0-PI (latitude)
4. **Camera clipping** - Set appropriate near/far planes (0.1, 1000)

---

## 6. Plan 03-05: 360 Stereoscopic Pipeline

**Wave:** 4 | **Depends on:** 03-04 | **Requirement:** RND-05

### Key Implementation Steps

- [ ] **Step 1: Create StereoCapture class**
  - File: `src/lib/render/StereoCapture.ts`
  - Dual CubeCamera with IPD offset (64mm)
  - Capture left and right eye frames

- [ ] **Step 2: Create StereoStacker class**
  - File: `src/lib/render/StereoStacker.ts`
  - Top/Bottom layout (YouTube VR spec)
  - Left eye on TOP, right eye on BOTTOM

- [ ] **Step 3: Add IPD configuration**
  - Default 64mm (standard human IPD)
  - Scalable to scene units

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/StereoCapture.ts` | Create | Dual eye capture with IPD |
| `src/lib/render/StereoStacker.ts` | Create | Top/Bottom stereo layout |

### Testing Criteria

- [ ] Left and right frames have visible parallax difference
- [ ] Stacked output has height = 2 * input height
- [ ] Left eye data in top half of output
- [ ] 8K stereo produces 8192x8192 output
- [ ] Visible depth effect in VR headset

### Verification Commands

```bash
# Verify stereo layout
# Left eye should be on top half
# Right eye should be on bottom half

# Test in YouTube VR or SteamVR
```

### Common Pitfalls to Avoid

1. **Wrong eye order** - YouTube spec: left on TOP, right on BOTTOM
2. **IPD scaling** - Scale 64mm to match scene units
3. **Memory exhaustion** - 8K stereo = 268MB per frame
4. **Incorrect stacking** - Ensure no overlap or gap between eyes

---

## 7. Plan 03-06: FFmpeg Integration + VR Metadata

**Wave:** 5 | **Depends on:** 03-03, 03-04, 03-05 | **Requirement:** RND-06

### Key Implementation Steps

- [x] **Step 1: Create FFmpegEncoder class**
  - File: `src/lib/render/FFmpegEncoder.ts`
  - Build FFmpeg command for H.264/H.265
  - Parse progress from stderr
  - Support audio muxing
  - **IMPLEMENTED:** Full production-ready encoder with NVENC support

- [x] **Step 2: Create VR metadata injection script**
  - File: `scripts/inject-metadata.py`
  - Use Google spatial-media library
  - Support mono and stereo modes
  - **IMPLEMENTED:** Script exists and is functional

- [x] **Step 3: Create SpatialMetadata TypeScript wrapper**
  - File: `src/lib/render/SpatialMetadataInjector.ts`
  - Call Python script via child_process
  - Verify output file after injection
  - **IMPLEMENTED:** Full class with progress reporting

- [x] **Step 4: Create unified ExportPipeline**
  - File: `src/lib/render/ExportPipeline.ts`
  - Route to correct pipeline by type
  - Coordinate all stages with progress
  - **IMPLEMENTED:** Existing, updated to use new encoder

### Files to Create/Modify

| File | Action | Status | Purpose |
|------|--------|--------|---------|
| `src/lib/render/FFmpegEncoder.ts` | Update | DONE | Frame to video encoding with NVENC |
| `scripts/inject-metadata.py` | Exists | DONE | VR metadata injection |
| `src/lib/render/SpatialMetadataInjector.ts` | Create | DONE | Python script wrapper |
| `src/lib/render/SpatialMetadata.ts` | Update | DONE | Re-exports for backward compat |
| `src/lib/render/ExportPipeline.ts` | Exists | DONE | Unified export API |

### Testing Criteria

- [ ] FFmpegEncoder produces valid MP4
- [ ] Audio syncs with video
- [ ] Progress callback reports frame count
- [ ] VR metadata injected correctly
- [ ] YouTube recognizes 360 video after upload

### Verification Commands

```bash
# Test FFmpeg encoding
ffmpeg -framerate 30 -i frames/%05d.png -c:v libx264 -preset fast -crf 23 test.mp4

# Verify VR metadata
python scripts/inject-metadata.py input.mp4 output_vr.mp4 mono
# Upload output_vr.mp4 to YouTube, check for 360 controls

# Check metadata with exiftool
exiftool output_vr.mp4 | grep -i spherical
```

### Common Pitfalls to Avoid

1. **FFmpeg not in PATH** - Ensure FFmpeg is installed and accessible
2. **Missing VR metadata** - YouTube won't recognize 360 without proper atoms
3. **Wrong stereo mode** - Use "top-bottom" for T/B layout
4. **Python environment issues** - Use virtual env or system Python consistently

---

## 8. Plan 03-07: Headless Rendering Mode

**Wave:** 6 | **Depends on:** 03-06 | **Requirement:** RND-07

### Key Implementation Steps

- [ ] **Step 1: Create headless render CLI**
  - File: `scripts/headless-render.ts`
  - Parse CLI arguments with yargs
  - Configure Puppeteer with GPU flags

- [ ] **Step 2: Create render server**
  - File: `scripts/render-server.ts`
  - Watch jobs directory for new jobs
  - Process jobs sequentially
  - Graceful shutdown handling

- [ ] **Step 3: Create Dockerfile**
  - File: `Dockerfile`
  - Include Chromium, xvfb, FFmpeg, Python
  - Configure Puppeteer for system Chromium

- [ ] **Step 4: Create docker-compose.yml**
  - File: `docker-compose.yml`
  - Volume mounts for jobs and output
  - Optional NVIDIA GPU support

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/headless-render.ts` | Create | CLI render entry point |
| `scripts/render-server.ts` | Create | Persistent render server |
| `scripts/render-config.ts` | Create | Shared config types |
| `Dockerfile` | Create | Container build definition |
| `docker-compose.yml` | Create | Container orchestration |
| `.dockerignore` | Create | Exclude unnecessary files |

### Testing Criteria

- [ ] CLI render produces output without GUI
- [ ] Render server processes jobs from directory
- [ ] Docker build completes without errors
- [ ] Docker container starts render server
- [ ] xvfb enables GPU rendering on Linux

### Verification Commands

```bash
# Test CLI render
npx ts-node scripts/headless-render.ts \
  --audio test.mp3 \
  --template "etherealFlame" \
  --output test-output.mp4 \
  --type flat-1080p-landscape

# Test render server
npx ts-node scripts/render-server.ts --jobs-dir ./jobs &
cp test-job.json jobs/pending/
# Wait for job to complete
ls jobs/complete/

# Test Docker build
docker build -t ethereal-render .

# Test Docker run
docker-compose up -d
docker logs ethereal-render -f
```

### Common Pitfalls to Avoid

1. **SwiftShader fallback** - Ensure native GPU is used, not software renderer
2. **Missing xvfb on Linux** - Required for headless GPU rendering
3. **Puppeteer Chromium mismatch** - Use system Chromium in Docker
4. **Permission issues** - Ensure job directories are writable

---

## 9. Plan 03-08: Render Queue with Persistence

**Wave:** 6 (parallel with 03-07) | **Depends on:** 03-06 | **Requirement:** RND-08

### Key Implementation Steps

- [ ] **Step 1: Create JobStore class**
  - File: `src/lib/queue/JobStore.ts`
  - IndexedDB for browser persistence
  - CRUD operations for jobs

- [ ] **Step 2: Create RenderQueue class**
  - File: `src/lib/queue/RenderQueue.ts`
  - Job lifecycle management
  - Progress tracking and events

- [ ] **Step 3: Create API routes**
  - File: `src/app/api/render/route.ts`
  - POST: Submit new job
  - GET: List all jobs

- [ ] **Step 4: Create job-specific routes**
  - File: `src/app/api/render/[id]/route.ts`
  - GET: Job status
  - DELETE: Cancel job

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/queue/JobStore.ts` | Create | IndexedDB persistence |
| `src/lib/queue/RenderQueue.ts` | Create | Queue management |
| `src/app/api/render/route.ts` | Create | Queue API endpoints |
| `src/app/api/render/[id]/route.ts` | Create | Job-specific endpoints |

### Testing Criteria

- [ ] Jobs persist after browser close
- [ ] Jobs persist after server restart
- [ ] Progress updates in real-time
- [ ] Cancel stops in-progress job
- [ ] Completed videos downloadable

### Verification Commands

```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{"type":"flat-1080p-landscape","fps":30}'

curl http://localhost:3000/api/render

curl http://localhost:3000/api/render/[job-id]

# Test persistence
# Submit job, close browser, reopen
# Job should still be in queue
```

### Common Pitfalls to Avoid

1. **IndexedDB transaction limits** - Keep transactions short
2. **Stale job recovery** - Handle "processing" jobs that were interrupted
3. **Missing cleanup** - Delete old completed jobs periodically
4. **Concurrent processing** - Limit to 1 job per GPU

---

## 10. Plan 03-09: YouTube-Optimized Encoding Presets

**Wave:** 7 | **Depends on:** 03-06 | **Requirement:** RND-09

### Key Implementation Steps

- [ ] **Step 1: Create YouTube encoding presets**
  - File: `src/lib/render/YoutubePresets.ts`
  - Define bitrates per resolution
  - Configure codec settings

- [ ] **Step 2: Add NVENC hardware acceleration**
  - Detect NVIDIA GPU availability
  - Fall back to CPU encoding if unavailable

- [ ] **Step 3: Add movflags for streaming**
  - Use `-movflags +faststart`
  - Enable progressive playback

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/YoutubePresets.ts` | Create | YouTube-optimized settings |
| `src/lib/render/FFmpegEncoder.ts` | Modify | Add NVENC support |

### YouTube Recommended Bitrates

| Resolution | Codec | Bitrate | Frame Rate |
|------------|-------|---------|------------|
| 1080p | H.264 | 12-15 Mbps | 60 FPS |
| 4K | H.265/VP9 | 35-45 Mbps | 60 FPS |
| 8K 360 | H.265 | 80-120 Mbps | 30-60 FPS |
| 8K 360 Stereo | H.265 | 100-150 Mbps | 30 FPS |

### Testing Criteria

- [ ] YouTube accepts video without re-encoding warnings
- [ ] Video plays immediately (no buffering required)
- [ ] Quality matches preview visuals
- [ ] File sizes within expected ranges

### Verification Commands

```bash
# Check encoding parameters
ffprobe -v error -show_format -show_streams output.mp4

# Verify bitrate
ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate output.mp4

# Test upload to YouTube (check for processing warnings)
```

### Common Pitfalls to Avoid

1. **Bitrate too low** - YouTube will re-encode, losing quality
2. **Missing faststart** - Video won't stream progressively
3. **Wrong pixel format** - Use yuv420p for compatibility
4. **Audio codec mismatch** - Use AAC for audio

---

## 11. Plan 03-10: Platform-Specific Output Formats

**Wave:** 7 (parallel with 03-09) | **Depends on:** 03-03 | **Requirements:** RND-10, RND-11, RND-12

### Key Implementation Steps

- [ ] **Step 1: Create platform format definitions**
  - File: `src/lib/render/PlatformFormats.ts`
  - YouTube Shorts: 9:16, 1080x1920, max 60s
  - Instagram Reels: 9:16, 1080x1920, max 90s
  - TikTok: 9:16, 1080x1920, max 10min

- [ ] **Step 2: Add duration limits**
  - Enforce max duration per platform
  - Warn user if audio exceeds limit

- [ ] **Step 3: Platform-specific encoding**
  - Optimize bitrates for each platform
  - Handle platform-specific requirements

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/render/PlatformFormats.ts` | Create | Platform format specs |
| `src/lib/render/FlatExporter.ts` | Modify | Add platform support |

### Platform Specifications

| Platform | Aspect | Resolution | Max Duration | Frame Rate |
|----------|--------|------------|--------------|------------|
| YouTube | 16:9 | Up to 8K | Unlimited | 24-60 |
| YouTube Shorts | 9:16 | 1080x1920 | 60 sec | 30-60 |
| Instagram Reels | 9:16 | 1080x1920 | 90 sec | 30 |
| TikTok | 9:16 | 1080x1920 | 10 min | 30-60 |

### Testing Criteria

- [ ] YouTube Shorts output is exactly 9:16, max 60s
- [ ] Instagram Reels output is exactly 9:16, max 90s
- [ ] TikTok output is exactly 9:16
- [ ] Duration warnings appear for long audio

### Common Pitfalls to Avoid

1. **Wrong aspect ratio** - Platforms may crop or reject
2. **Exceeding duration** - Shorts limited to 60s
3. **Missing vertical format** - All short-form must be 9:16
4. **Audio cutoff** - Fade out at limit if exceeding

---

## 12. Plan 03-11: Render Settings UI

**Wave:** 7 (parallel with 03-09, 03-10) | **Depends on:** 03-03 | **Requirement:** None (enhancement)

### Key Implementation Steps

- [ ] **Step 1: Expand ExportPanel**
  - File: `src/components/ui/ExportPanel.tsx`
  - Add format category selector (Flat, 360, Shorts)
  - Add platform-specific options

- [ ] **Step 2: Add quality selector**
  - Options: Fast, Balanced, Quality
  - Map to FFmpeg presets

- [ ] **Step 3: Add output preview**
  - Show estimated file size
  - Show render time estimate

- [ ] **Step 4: Add advanced options panel**
  - Collapsible section
  - Custom bitrate override
  - Custom resolution

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/ExportPanel.tsx` | Modify | Expand render settings |
| `src/components/ui/FormatSelector.tsx` | Create | Format selection component |
| `src/components/ui/QualitySelector.tsx` | Create | Quality preset selector |

### Testing Criteria

- [ ] All format options visible in UI
- [ ] Quality selector changes encoding speed
- [ ] Estimates update when options change
- [ ] Advanced options accessible but hidden by default

### Common Pitfalls to Avoid

1. **Option overload** - Keep defaults simple
2. **Confusing terminology** - Use user-friendly labels
3. **Missing validation** - Prevent invalid combinations
4. **UI not responsive** - Ensure mobile-friendly

---

## 13. Integration Testing Checklist

### Pre-Integration Verification

- [ ] All 11 plans implemented individually
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No console errors in browser
- [ ] All unit tests pass

### End-to-End Flow Tests

#### Test A: Browser Flat Export
1. [ ] Upload audio file in preview mode
2. [ ] Select 1080p landscape preset
3. [ ] Click Export
4. [ ] Verify progress updates
5. [ ] Download completed video
6. [ ] Play video, verify audio sync

#### Test B: Browser 360 Export
1. [ ] Upload audio file
2. [ ] Select 360 mono 4K preset
3. [ ] Export and download
4. [ ] Open in VLC with 360 mode
5. [ ] Verify skybox visible at all angles

#### Test C: Headless CLI Render
1. [ ] Run: `npx ts-node scripts/headless-render.ts --audio test.mp3 --type flat-1080p-landscape`
2. [ ] Verify output file created
3. [ ] Play output, verify correct visuals

#### Test D: Render Queue Persistence
1. [ ] Submit job via API
2. [ ] Close browser
3. [ ] Reopen and check job status
4. [ ] Wait for completion
5. [ ] Download result

#### Test E: Docker Render
1. [ ] Build: `docker build -t ethereal-render .`
2. [ ] Run: `docker-compose up`
3. [ ] Submit job to container
4. [ ] Retrieve output from volume

### Cross-Platform Tests

- [ ] Test on Windows (native)
- [ ] Test on macOS (if available)
- [ ] Test on Linux (Docker or native)
- [ ] Test on mobile (preview + export trigger)

### YouTube Upload Verification

- [ ] Upload flat 1080p - plays correctly
- [ ] Upload flat 4K - plays correctly
- [ ] Upload 360 mono - shows 360 controls
- [ ] Upload 360 stereo - shows VR mode option
- [ ] Upload YouTube Shorts format - appears in Shorts tab

---

## 14. End-to-End Verification

### Flat Export Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| 1080p 16:9 resolution | 1920x1080 | [ ] |
| 1080p 9:16 resolution | 1080x1920 | [ ] |
| 4K 16:9 resolution | 3840x2160 | [ ] |
| 4K 9:16 resolution | 2160x3840 | [ ] |
| Audio sync | Visuals match audio perfectly | [ ] |
| Particle effects | Match preview exactly | [ ] |
| FPS consistency | Smooth 30/60 fps throughout | [ ] |

### 360 Monoscopic Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| 4K resolution | 4096x2048 | [ ] |
| 8K resolution | 8192x4096 | [ ] |
| Aspect ratio | 2:1 exactly | [ ] |
| VLC 360 playback | Correct projection | [ ] |
| No seams | Seamless sphere | [ ] |
| Skybox at all angles | Visible everywhere | [ ] |

### 360 Stereoscopic Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| Output resolution | 8192x8192 | [ ] |
| Eye layout | Left on top, right on bottom | [ ] |
| Parallax visible | Distinct left/right images | [ ] |
| VR headset playback | Proper depth perception | [ ] |

### VR Metadata Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| 360 mono YouTube | Shows 360 controls | [ ] |
| 360 stereo YouTube | Shows VR mode | [ ] |
| Metadata present | exiftool shows spherical tags | [ ] |

### Headless Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| CLI without GUI | No window opens | [ ] |
| Output identical | Same as browser render | [ ] |
| Docker works | Container processes jobs | [ ] |

### Queue Verification

| Test | Expected Result | Status |
|------|-----------------|--------|
| Browser persistence | Jobs survive refresh | [ ] |
| Server persistence | Jobs survive restart | [ ] |
| Progress tracking | Updates in real-time | [ ] |
| Download works | Video downloadable | [ ] |

---

## 15. Performance Benchmarks

### Target Benchmarks

| Export Type | Target Time | Target VRAM | Notes |
|-------------|-------------|-------------|-------|
| 1080p 30s @ 30fps | < 2 min | < 500MB | Browser export |
| 4K 30s @ 30fps | < 5 min | < 1GB | Browser/server |
| 360 mono 4K 30s | < 8 min | < 1.5GB | Server recommended |
| 360 mono 8K 30s | < 15 min | < 4GB | Server only |
| 360 stereo 8K 30s | < 25 min | < 6GB | Server only |

### Hardware Requirements

| Export Type | Minimum GPU | Recommended GPU |
|-------------|-------------|-----------------|
| 1080p | Integrated | GTX 1060 |
| 4K | GTX 1060 | RTX 3060 |
| 360 4K | RTX 2060 | RTX 3070 |
| 360 8K | RTX 3070 | RTX 3080+ |
| 360 stereo 8K | RTX 3080 | RTX 4090 |

### Benchmark Commands

```bash
# Benchmark flat export
time npx ts-node scripts/headless-render.ts \
  --audio test-30s.mp3 \
  --type flat-1080p-landscape

# Benchmark 360 export
time npx ts-node scripts/headless-render.ts \
  --audio test-30s.mp3 \
  --type 360-mono-4k

# Monitor VRAM during render
nvidia-smi -l 1

# Profile FFmpeg encoding
ffmpeg -benchmark -i frames/%05d.png -c:v libx264 -preset slow test.mp4
```

### Optimization Targets

If benchmarks not met, investigate:

1. **Frame capture too slow** - Enable double-buffering, use async readPixels
2. **FFmpeg encoding slow** - Enable NVENC, reduce preset quality
3. **Memory exhaustion** - Reduce resolution, enable streaming frames to disk
4. **Progress stalls** - Check for blocking operations, add yielding

---

## Quick Reference: Common Commands

### Development

```bash
npm run dev                  # Start dev server
npm run build               # Build for production
npm run lint                # Check for issues
```

### Testing

```bash
npx ts-node scripts/headless-render.ts --help
npx ts-node scripts/render-server.ts --jobs-dir ./jobs
```

### Docker

```bash
docker build -t ethereal-render .
docker-compose up -d
docker logs ethereal-render -f
```

### FFmpeg

```bash
# H.264 encoding
ffmpeg -framerate 30 -i frames/%05d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p output.mp4

# H.265 with NVENC
ffmpeg -framerate 30 -i frames/%05d.png -c:v hevc_nvenc -preset slow -cq 20 output.mp4

# With audio
ffmpeg -framerate 30 -i frames/%05d.png -i audio.mp3 -c:v libx264 -c:a aac -shortest output.mp4
```

### VR Metadata

```bash
python scripts/inject-metadata.py input.mp4 output_vr.mp4 mono
python scripts/inject-metadata.py input.mp4 output_vr.mp4 stereo
```

---

*Checklist created: 2026-01-28*
*Based on: 03-RESEARCH.md, 03-PLAN.md, ROADMAP.md, COMPREHENSIVE_AUTOMATION_RESEARCH.md*
