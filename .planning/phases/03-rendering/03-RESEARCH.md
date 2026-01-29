# Phase 3 Research: Rendering Pipeline

**Researched:** 2026-01-27
**Overall Confidence:** MEDIUM
**Mode:** Ecosystem

---

## Executive Summary

Phase 3 transforms the live preview into a production rendering pipeline capable of exporting publication-quality videos from 1080p to 8K 360 stereoscopic. The research covers eight requirement areas: flat exports (RND-01/02/03), 360 monoscopic (RND-04), 360 stereoscopic (RND-05), VR metadata (RND-06), headless rendering (RND-07), and render queue persistence (RND-08).

**Key finding:** The rendering pipeline has two viable architecture paths with different tradeoffs:

1. **Browser-based (CCapture.js + WebCodecs)** - Lower complexity, works with existing Three.js shaders, but limited to ~4K resolution reliably and Chrome-only for video encoding.

2. **Headless server (Puppeteer + FFmpeg)** - Higher complexity, supports 8K resolution, better for batch processing, requires careful memory management.

The recommended approach is a **hybrid architecture**: browser-based for preview/1080p exports (immediate user feedback) and headless server for 4K+ and 360 stereoscopic exports (quality and reliability).

---

## Technology Landscape

### Frame Capture Options

| Technology | Resolution Limit | Speed | Browser Support | Confidence |
|------------|------------------|-------|-----------------|------------|
| CCapture.js | ~4K practical | Non-realtime (good) | Chrome primarily | HIGH |
| MediaRecorder | ~1080p reliable | Realtime (drops frames) | All modern | MEDIUM |
| WebCodecs API | Hardware-dependent | Near-realtime | Chrome, Edge | MEDIUM |
| Puppeteer + readPixels | 8K+ | Slow but reliable | N/A (headless) | HIGH |

**Recommendation:** Use CCapture.js for browser exports up to 4K. Use Puppeteer-based headless rendering for 8K and production batches.

### Video Encoding Options

| Technology | Codec Support | Performance | Use Case | Confidence |
|------------|---------------|-------------|----------|------------|
| CCapture.js WebM encoder | VP8/VP9 | CPU-only | Quick exports | HIGH |
| WebCodecs + VideoEncoder | H.264, VP9 | Hardware accel | Modern browsers | MEDIUM |
| FFmpeg (server-side) | H.264, H.265, VP9 | Hardware accel | Production | HIGH |
| FFmpeg + NVENC | H.265/HEVC | GPU accel | 8K encoding | HIGH |

**Recommendation:** FFmpeg for all production exports. WebCodecs as future optimization for browser-only workflow.

### Headless Rendering Options

| Technology | WebGL Support | GPU Support | 8K Capable | Confidence |
|------------|---------------|-------------|------------|------------|
| Puppeteer + Chrome | WebGL2, WebGPU | SwiftShader or native | Yes | HIGH |
| headless-gl | WebGL1 only | CPU only | Limited | LOW |
| Blender headless | OSL (not GLSL) | Native GPU | Yes | MEDIUM |
| xvfb + Chrome | WebGL2 | Native GPU (Linux) | Yes | MEDIUM |

**Recommendation:** Puppeteer with native GPU passthrough on Linux (xvfb-run). headless-gl is deprecated for Three.js (WebGL2 required since r163).

---

## Requirement-Specific Research

### RND-01/02/03: Flat Exports (1080p/4K, 16:9/9:16)

**Approach:** Standard WebGLRenderTarget capture with configurable aspect ratio.

**Resolution Matrix:**
| Format | Resolution | Pixels | VRAM Estimate |
|--------|------------|--------|---------------|
| 1080p 16:9 | 1920x1080 | 2.07M | ~25MB |
| 1080p 9:16 | 1080x1920 | 2.07M | ~25MB |
| 4K 16:9 | 3840x2160 | 8.29M | ~100MB |
| 4K 9:16 | 2160x3840 | 8.29M | ~100MB |

**Implementation:**
```typescript
// Configurable render target for different aspect ratios
const renderTarget = new THREE.WebGLRenderTarget(width, height, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType
});
```

**Confidence:** HIGH - Standard Three.js patterns, well-documented.

**Sources:**
- [Three.js WebGLRenderTarget docs](https://threejs.org/docs/#api/en/renderers/WebGLRenderTarget)
- [Three.js readRenderTargetPixels](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.readRenderTargetPixels)

---

### RND-04: 360 Monoscopic Equirectangular (up to 8K)

**Approach:** Use CubeCamera to capture six faces, then convert cubemap to equirectangular projection.

**Resolution Matrix:**
| Output | Cube Face | Total Pixels | VRAM Estimate |
|--------|-----------|--------------|---------------|
| 4K (4096x2048) | 1024x1024 | 8.4M | ~100MB |
| 6K (6144x3072) | 1536x1536 | 18.9M | ~230MB |
| 8K (8192x4096) | 2048x2048 | 33.6M | ~400MB |

**Key Library:** [THREE.CubemapToEquirectangular](https://github.com/spite/THREE.CubemapToEquirectangular)

**Implementation Flow:**
1. Create CubeCamera with WebGLCubeRenderTarget
2. Position camera at scene center
3. Call cubeCamera.update(renderer, scene) each frame
4. Convert cubemap to equirectangular using shader or library
5. Export equirectangular image/frame

**8K Considerations:**
- 8K equirectangular requires 2048x2048 cube faces (6 faces x 4M pixels = 24M pixels per capture)
- Consumer GPUs (RTX 4090, 24GB VRAM) can handle this
- For GPUs with less VRAM, consider tiled rendering (capture in quadrants, stitch)

**Confidence:** MEDIUM - CubemapToEquirectangular library exists but may need updates for latest Three.js.

**Sources:**
- [THREE.CubemapToEquirectangular GitHub](https://github.com/spite/THREE.CubemapToEquirectangular)
- [j360 - 360 Video Capture for Three.js](https://github.com/imgntn/j360)
- [Three.js CubeCamera docs](https://threejs.org/docs/pages/CubeCamera.html)

---

### RND-05: 360 Stereoscopic (Top/Bottom, 8K)

**Approach:** Render two equirectangular images (left eye, right eye) with interpupillary distance offset, stack vertically.

**Format:** Top/Bottom (Over/Under) with Left Eye on Top - YouTube VR standard.

**Resolution:**
| Output | Per-Eye | Cube Face | Total VRAM |
|--------|---------|-----------|------------|
| 7680x7680 stereo | 7680x3840 | 2048x2048 | ~800MB |
| 8192x8192 stereo | 8192x4096 | 2048x2048 | ~900MB |

**Implementation Flow:**
1. Create two CubeCameras with horizontal offset (IPD, typically 64mm scaled to scene)
2. For each frame:
   - Render left eye cubemap, convert to equirectangular
   - Render right eye cubemap, convert to equirectangular
   - Stack vertically (left on top per YouTube spec)
3. Encode stacked frame

**IPD (Interpupillary Distance):**
```typescript
const IPD = 0.064; // 64mm in meters, scale to your scene units
leftCamera.position.x = -IPD / 2;
rightCamera.position.x = IPD / 2;
```

**Confidence:** MEDIUM - Pattern is established but memory-intensive. Requires careful VRAM management.

**Sources:**
- [YouTube 360/VR video specs](https://support.google.com/youtube/answer/6178631)
- [A-Frame stereo component](https://github.com/c-frame/aframe-stereo-component)
- [VR Video Formats Explained](https://360labs.net/blog/vr-video-formats-explained/)

---

### RND-06: VR Spatial Metadata Injection

**Approach:** Use Google's Spatial Media Metadata Injector after video encoding.

**Required Metadata (Spherical Video V2):**
- `Spherical`: true
- `Stitched`: true
- `StitchingSoftware`: "Ethereal Flame Studio"
- `ProjectionType`: equirectangular
- `StereoMode`: top-bottom (for stereoscopic)

**Tools:**
| Tool | Platform | Automation | Confidence |
|------|----------|------------|------------|
| Spatial Media Metadata Injector | Python | CLI available | HIGH |
| spatialmedia Python package | Python | Full CLI | HIGH |
| FFmpeg side_data | FFmpeg | Limited | LOW |

**Implementation:**
```bash
# Python CLI approach
python spatialmedia -i input.mp4 -o output_vr.mp4 \
  --spherical \
  --stereo-mode top-bottom
```

**Note:** FFmpeg cannot reliably inject XMP-GSpherical tags. Use Google's tool.

**Confidence:** HIGH - Google's tool is the standard, well-maintained.

**Sources:**
- [google/spatial-media GitHub](https://github.com/google/spatial-media)
- [Spatial Media Metadata Injector releases](https://github.com/google/spatial-media/releases)
- [Vargol/spatial-media VR180 fork](https://github.com/Vargol/spatial-media)

---

### RND-07: Headless Rendering Mode

**Approach:** Puppeteer-controlled headless Chrome with GPU passthrough.

**Architecture Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Puppeteer + SwiftShader | Works everywhere, no GPU needed | Slow, CPU-only rendering | Development only |
| Puppeteer + xvfb (Linux) | Native GPU, fast | Linux only | Production on Linux |
| Docker + GPU passthrough | Containerized, reproducible | Complex setup | Cloud deployment |
| headless-gl | Simple Node.js | WebGL1 only, deprecated for Three.js | Not viable |

**Recommended Stack:**
```
Linux server (Ubuntu 22.04+)
  -> xvfb-run for virtual framebuffer
  -> Puppeteer controlling Chrome
  -> Native GPU access (NVIDIA driver)
  -> FFmpeg for encoding
```

**Implementation:**
```bash
# Start headless render on Linux
xvfb-run -s "-ac -screen 0 1920x1080x24" node render-server.js
```

**Puppeteer Setup:**
```typescript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=desktop',  // Use native GPU
    '--enable-webgl',
    '--enable-webgpu'
  ]
});
```

**Key Challenge:** headless-gl is no longer viable since Three.js dropped WebGL1 support in r163. Must use Puppeteer + real browser.

**Confidence:** MEDIUM - Pattern works but requires Linux server with GPU for production quality.

**Sources:**
- [Three.js forum: Headless rendering](https://discourse.threejs.org/t/headless-rendering/14401)
- [Serverless 3D WebGL rendering](https://rainer.im/blog/serverless-3d-rendering)
- [xvfb for headless Linux](https://caretdashcaret.com/2015/05/19/how-to-run-blender-headless-from-the-command-line-without-the-gui/)

---

### RND-08: Render Queue with Job Persistence

**Approach:** Use established job queue library with database-backed persistence.

**Options:**

| Library | Backend | Features | Recommendation |
|---------|---------|----------|----------------|
| BullMQ | Redis | Fast, scalable, retries | Best for production |
| Agenda | MongoDB | Scheduling, persistence | Good if using MongoDB |
| node-persistent-queue | SQLite | Simple, no external deps | Good for single-server |
| Custom + SQLite | SQLite | Full control | If specific needs |

**Recommended:** BullMQ with Redis for production, node-persistent-queue for simpler deployments.

**Job Schema:**
```typescript
interface RenderJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioFile: string;
  templateId: string;
  outputFormat: '1080p' | '4k' | '360mono' | '360stereo';
  aspectRatio: '16:9' | '9:16';
  progress: number;  // 0-100
  outputPath?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

**Features Required:**
- Job persistence across server restarts
- Progress tracking (frame count / total frames)
- Retry on failure with backoff
- Priority queue (user-initiated vs batch)
- Concurrent job limiting (based on GPU memory)

**Confidence:** HIGH - BullMQ and Agenda are battle-tested in production.

**Sources:**
- [BullMQ documentation](https://bullmq.io/)
- [Agenda GitHub](https://github.com/agenda/agenda)
- [node-persistent-queue](https://github.com/damoclark/node-persistent-queue)

---

## 8K Rendering Strategy

### VRAM Requirements

| Operation | VRAM Needed | Notes |
|-----------|-------------|-------|
| 360 mono 8K single frame | ~400MB | Single cubemap + equirect |
| 360 stereo 8K single frame | ~900MB | Two cubemaps + two equirect + stack |
| Frame buffer (8192x8192) | ~270MB | Output buffer |
| Scene + textures | Variable | Particles, skybox |
| **Total estimate** | 2-4GB | For stereo 8K |

**Conclusion:** 8K stereoscopic is achievable on consumer GPUs (RTX 3080+ with 10GB+ VRAM).

### Tiled Rendering for Low-VRAM Systems

If VRAM is limited, render in tiles and stitch:

1. Render scene at 1/4 resolution in 4 quadrants
2. Each quadrant rendered to separate buffer
3. Stitch on CPU or during encoding

**Implementation consideration:** This adds complexity. Recommend requiring 8GB+ VRAM for 8K exports rather than implementing tiled rendering in v1.

**Confidence:** LOW - Tiled rendering is complex and error-prone. Skip for v1.

---

## FFmpeg Integration

### Encoding Presets

**H.264 (compatibility):**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p output.mp4
```

**H.265/HEVC (quality + size):**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v libx265 -preset slow -crf 20 \
  -pix_fmt yuv420p output.mp4
```

**H.265 with NVIDIA hardware acceleration:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -c:v hevc_nvenc -preset slow -rc vbr_hq -cq 20 \
  -pix_fmt yuv420p output.mp4
```

### YouTube Recommended Settings

| Resolution | Codec | Bitrate | Frame Rate |
|------------|-------|---------|------------|
| 1080p | H.264 | 8-12 Mbps | 24-60 |
| 4K | H.265 | 35-45 Mbps | 24-60 |
| 8K 360 | H.265 | 80-120 Mbps | 24-60 |

**Confidence:** HIGH - FFmpeg is industry standard.

**Sources:**
- [FFmpeg HEVC/NVENC guide](https://ntown.at/knowledgebase/cuda-gpu-accelerated-h264-h265-hevc-video-encoding-with-ffmpeg/)
- [YouTube recommended upload encoding settings](https://support.google.com/youtube/answer/1722171)

---

## Alternative: Blender Renderer

### Viability Assessment

**Pros:**
- Native GPU support, proven 8K rendering
- OSL shaders for complex effects
- Headless mode works well
- Industry-standard output quality

**Cons:**
- Shader portability: Three.js GLSL != Blender OSL
- Would require recreating visual effects in Blender
- Different rendering paradigm (raytracing vs rasterization)
- Longer render times for particle effects

**Shader Portability:**

| Three.js | Blender | Portable? |
|----------|---------|-----------|
| GLSL fragment shader | OSL shader | Manual rewrite |
| ShaderMaterial | Cycles nodes | Manual rewrite |
| Particle system | Geometry nodes | Conceptual similarity |

**Conclusion:** Blender is NOT recommended for Phase 3. The effort to port shaders outweighs benefits. Use Puppeteer + native GPU instead.

**Confidence:** MEDIUM - Blender works but shader porting is significant effort.

**Sources:**
- [Blender headless Python API](https://docs.blender.org/api/current/info_tips_and_tricks.html)
- [blenderless PyPI package](https://pypi.org/project/blenderless/)
- [OSL vs GLSL differences](https://docs.blender.org/manual/en/2.90/render/shader_nodes/osl.html)

---

## Recommended Architecture

```
                    +-------------------+
                    |   Web UI (Next.js)|
                    |   Preview Mode    |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+         +----------v---------+
     | Browser Export  |         | Server Render Queue|
     | (CCapture.js)   |         | (BullMQ + Redis)   |
     +-----------------+         +----------+---------+
              |                             |
              v                             v
     +--------+--------+         +----------+---------+
     | Up to 4K flat   |         | Headless Renderer  |
     | Quick preview   |         | (Puppeteer + xvfb) |
     +-----------------+         +----------+---------+
                                            |
                                            v
                                 +----------+---------+
                                 | FFmpeg Encoder     |
                                 | (NVENC for 8K)     |
                                 +----------+---------+
                                            |
                                            v
                                 +----------+---------+
                                 | Spatial Media      |
                                 | Metadata Injector  |
                                 +----------+---------+
                                            |
                                            v
                                 +----------+---------+
                                 | Output: VR-ready   |
                                 | MP4 files          |
                                 +--------------------+
```

---

## Plan Breakdown Recommendation

Based on research, suggest these plans for Phase 3:

| Plan | Scope | Dependencies | Complexity |
|------|-------|--------------|------------|
| 03-01 | Pre-analysis for offline rendering (amplitude-per-frame) | Phase 1 audio | Low |
| 03-02 | Frame capture system (WebGLRenderTarget + async readPixels) | Phase 1 visual | Medium |
| 03-03 | Flat export pipeline (1080p/4K, 16:9/9:16) | 03-01, 03-02 | Medium |
| 03-04 | 360 monoscopic pipeline (CubeCamera + equirectangular) | 03-02 | High |
| 03-05 | 360 stereoscopic pipeline (dual CubeCamera + stack) | 03-04 | High |
| 03-06 | FFmpeg integration + VR metadata injection | 03-03/04/05 | Medium |
| 03-07 | Headless rendering mode (Puppeteer + xvfb) | 03-02 | High |
| 03-08 | Render queue with persistence (BullMQ) | 03-07 | Medium |

**Suggested Waves:**
- Wave 1: 03-01 (pre-analysis)
- Wave 2: 03-02 (frame capture)
- Wave 3: 03-03, 03-04 (flat + 360 mono - parallel)
- Wave 4: 03-05 (stereoscopic)
- Wave 5: 03-06 (encoding + metadata)
- Wave 6: 03-07, 03-08 (headless + queue - parallel)

---

## Pitfalls and Warnings

### Critical Pitfalls

1. **Memory leaks in CCapture.js** - Accumulated frames may not be freed. Use Chrome with `--js-flags="--expose-gc"` and call gc() between frames for long renders.

2. **MediaRecorder drops frames** - Never use MediaRecorder for production exports. It drops frames when encoding can't keep up. Always use non-realtime capture (CCapture.js or manual frame capture).

3. **headless-gl is deprecated** - Since Three.js r163, WebGL1 is deprecated. headless-gl only supports WebGL1. Must use Puppeteer with real browser.

4. **YouTube metadata rejection** - If spatial metadata is missing or malformed, YouTube won't recognize 360 video. Always use Google's official Spatial Media tool, not FFmpeg.

### Moderate Pitfalls

5. **Async readPixels ordering** - When using async readRenderTargetPixels, ensure frames are written in correct order. Use frame counter, not callback order.

6. **IPD scaling** - Interpupillary distance (64mm) must be scaled to match scene units. Wrong IPD = uncomfortable VR viewing.

7. **Color space mismatch** - Three.js uses linear color space; video expects sRGB. Apply gamma correction during export or configure renderer.

### Minor Pitfalls

8. **Chrome-only WebCodecs** - WebCodecs API has limited browser support. Fallback needed for Firefox/Safari users.

9. **VRAM exhaustion** - 8K stereo can use 2-4GB VRAM. Implement VRAM monitoring and graceful degradation.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Flat exports (1080p/4K) | HIGH | Standard Three.js patterns, well-documented |
| 360 monoscopic | MEDIUM | Libraries exist but may need updates |
| 360 stereoscopic | MEDIUM | Pattern established, memory-intensive |
| VR metadata | HIGH | Google's tool is authoritative |
| Headless rendering | MEDIUM | Works on Linux with xvfb, complex setup |
| Render queue | HIGH | BullMQ/Agenda are battle-tested |
| 8K resolution | MEDIUM | Hardware-dependent, VRAM limits |
| Blender alternative | LOW | Shader porting effort too high |

---

## Open Questions

1. **WebGPU for rendering?** Three.js now supports WebGPU. Should Phase 3 target WebGPU for better headless performance? (Research needed if pursuing)

2. **Cloud rendering fallback?** If user's home GPU is insufficient, should there be a cloud rendering option? (Cost/architecture implications)

3. **Streaming export?** Could frames be encoded as they're captured (streaming to FFmpeg pipe) rather than saving all frames first? (Memory optimization)

4. **Electron wrapper?** Would an Electron app simplify headless rendering by bundling Chromium? (Distribution consideration)

---

## Key Sources

### Frame Capture
- [CCapture.js GitHub](https://github.com/spite/ccapture.js)
- [Three.js readRenderTargetPixels](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.readRenderTargetPixels)
- [WebCodecs API MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)

### 360 Video
- [THREE.CubemapToEquirectangular](https://github.com/spite/THREE.CubemapToEquirectangular)
- [j360 - 360 Video Capture](https://github.com/imgntn/j360)
- [YouTube 360 video help](https://support.google.com/youtube/answer/6178631)

### VR Metadata
- [google/spatial-media](https://github.com/google/spatial-media)
- [YouTube VR specifications](https://support.google.com/youtube/answer/6395969)

### Headless Rendering
- [Three.js forum: Headless rendering](https://discourse.threejs.org/t/headless-rendering/14401)
- [Puppeteer documentation](https://pptr.dev/)
- [Serverless 3D rendering](https://rainer.im/blog/serverless-3d-rendering)

### Job Queue
- [BullMQ](https://bullmq.io/)
- [Agenda](https://github.com/agenda/agenda)

### FFmpeg
- [FFmpeg HEVC encoding](https://ntown.at/knowledgebase/cuda-gpu-accelerated-h264-h265-hevc-video-encoding-with-ffmpeg/)
- [FFmpeg 360 video cheat sheet](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)

---

*Last updated: 2026-01-27*
