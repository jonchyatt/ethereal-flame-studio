# Technology Stack

**Project:** Ethereal Flame Studio - Audio-Reactive Video Generation Engine
**Researched:** January 26, 2026
**Overall Confidence:** HIGH (verified with current documentation and 2025-2026 sources)

---

## Executive Summary

Building an 8K 360-degree stereoscopic video generation engine accessible from mobile requires a **hybrid architecture**: a lightweight Next.js web UI for control, combined with a dedicated GPU rendering backend that can run locally or in the cloud. The critical insight is that **browser-based rendering hits hard limits at 4K** due to WebGL texture constraints, making a dedicated renderer (Blender or Three.js headless with GPU) essential for 8K output.

---

## Recommended Stack

### Core Framework (Web UI + Control Plane)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Next.js** | 15.x | Web application framework | Already in use, excellent for hybrid SSR/client apps. Server Actions enable easy job triggering. |
| **React Three Fiber** | 8.x | 3D preview in browser | Keeps existing codebase. Real-time preview at 1080p-4K; final render offloaded. |
| **Three.js** | r172+ | 3D rendering engine | Production-ready WebGPU support since r171 (Sept 2025). Use WebGPU primary with WebGL fallback. |
| **Tailwind CSS** | 4.x | Styling | Rapid mobile-first UI development. |

**Confidence:** HIGH - Verified via [Three.js releases](https://github.com/mrdoob/three.js/releases) and [WebGPU browser support data](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/).

### Rendering Engine (8K Production)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Blender** | 4.5 LTS | Primary 8K renderer | Headless rendering, Python scripting, Cycles/EEVEE. Handles 8K+ natively. Released July 2025, supported through 2027. |
| **Three.js + Puppeteer** | - | Secondary/Fallback | For simpler renders or when Blender unavailable. Limited to 4K due to WebGL texture limits. |
| **headless-gl** | 6.x | Node.js WebGL | CPU-based fallback when no GPU available. Slow but works anywhere. |

**Confidence:** HIGH - Blender Python API verified via [official docs](https://docs.blender.org/api/current/bpy.ops.render.html). WebGL 4K limit verified via [Puppeteer issues](https://github.com/puppeteer/puppeteer/issues/9555).

**Why Blender over browser-based for 8K:**
- WebGL has a **hard-coded 4096x4096 texture limit** in Chromium headless
- 8K (7680x4320) requires tiled rendering or native GPU renderer
- Blender Cycles supports true GPU path tracing with NVIDIA CUDA/OptiX
- Python scripting allows full automation from Node.js

### Video Encoding Pipeline

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **FFmpeg** | 7.x | Video encoding/muxing | Industry standard. Hardware NVENC support for H.265/AV1. |
| **NVIDIA NVENC** | - | Hardware encoding | RTX 30/40/50 series: 3 encoders per GPU, 10-bit 8K60 AV1 support on Ada+. |
| **H.265 (HEVC)** | - | Primary codec | Mature, universal VR headset support. Use for maximum compatibility. |
| **AV1** | - | Secondary codec | 20-30% better compression. Use for YouTube/streaming delivery. |
| **Google Spatial Media** | 2.1 | VR metadata injection | Injects sv3d/st3d boxes for 360/stereoscopic playback. |

**Confidence:** HIGH - Verified via [FFmpeg 360 cheatsheet](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049), [NVIDIA AV1 blog](https://developer.nvidia.com/blog/improving-video-quality-and-performance-with-av1-and-nvidia-ada-lovelace-architecture/), [Google Spatial Media](https://github.com/google/spatial-media).

**Encoding Command Template (8K Stereo 360):**
```bash
# Render frames to PNG sequence, then encode
ffmpeg -framerate 60 -i frame_%04d.png \
  -c:v hevc_nvenc -preset p7 -tune hq \
  -b:v 150M -maxrate 200M -bufsize 400M \
  -pix_fmt yuv420p10le \
  -metadata:s:v:0 stereo_mode=top_bottom \
  output_8k_stereo.mp4

# Then inject spatial metadata
python spatialmedia -i output_8k_stereo.mp4 \
  --stereo=top-bottom output_8k_stereo_spatial.mp4
```

### Job Queue & Background Processing

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **BullMQ** | 5.x | Job queue | Redis-based, battle-tested for video transcoding workloads. Supports retries, progress tracking, priorities. |
| **Redis** | 7.x / Dragonfly | Queue backend | BullMQ requires Redis. Dragonfly is a drop-in replacement with better multi-core performance. |
| **Node.js Worker** | 22 LTS | Job processor | Runs on home server or cloud. Spawns Blender/FFmpeg processes. |

**Confidence:** HIGH - Verified via [BullMQ docs](https://docs.bullmq.io) and [usage at Microsoft, Vendure](https://bullmq.io/).

### Remote Access (Phone to Home Server)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Cloudflare Tunnel** | - | Primary: Public web access | Zero-config HTTPS, works behind CGNAT/restrictive NAT. 15-45ms latency acceptable for control UI. |
| **Tailscale** | - | Secondary: Private access | WireGuard mesh for admin/debugging. Not for public UI. |

**Confidence:** HIGH - Verified via [2025 benchmarks](https://onidel.com/blog/tailscale-cloudflare-nginx-vps-2025).

**Architecture:**
```
Mobile Phone (anywhere)
    |
    v
Cloudflare Edge (HTTPS)
    |
    v
Cloudflare Tunnel (outbound from home)
    |
    v
Home Server (Next.js + BullMQ Worker + GPU)
```

### Cloud GPU (Alternative to Home Server)

| Provider | GPU | Price/hr | Best For |
|----------|-----|----------|----------|
| **Vast.ai** | RTX 4090 | ~$0.30-0.50 | Cost-effective, spot instances for batch rendering |
| **RunPod** | RTX 4090 | ~$0.34 | On-demand reliability, pay-per-second |
| **RunPod** | A100 80GB | ~$1.74 | Large VRAM for complex scenes |
| **Lambda Labs** | H100 | ~$2.49 | Enterprise, managed infrastructure |

**Confidence:** MEDIUM - Prices fluctuate. Verified via [RunPod pricing](https://www.runpod.io/pricing) and [Vast.ai](https://vast.ai/).

**Recommendation:** Start with home RTX GPU. Use Vast.ai spot instances for overflow/batch jobs.

### Browser Video Recording (Preview/Low-Res Export)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Mediabunny** | 1.x | Video muxing in browser | Successor to mp4-muxer. Pure TypeScript, WebCodecs-native. |
| **WebCodecs API** | - | Hardware-accelerated encoding | Supported in all major browsers as of 2025. |
| **r3f-video-recorder** | - | R3F integration | Frame-accurate recording for React Three Fiber scenes. |

**Confidence:** HIGH - Verified via [Mediabunny docs](https://mediabunny.dev/guide/introduction) and [r3f-video-recorder](https://github.com/malerba118/r3f-video-recorder).

**Note:** Browser recording is **preview only** (up to 4K). 8K requires server-side rendering.

### 360 Stereoscopic Rendering

| Technology | Purpose | Implementation |
|------------|---------|----------------|
| **CubeCamera (6-face)** | Capture 360 view | Render 6 faces per eye = 12 renders per frame |
| **Equirectangular conversion** | YouTube/VR format | Use THREE.CubemapToEquirectangular or Blender compositor |
| **Top-Bottom stacking** | Stereoscopic format | Left eye top half, right eye bottom half |

**Confidence:** HIGH - Verified via [THREE.CubemapToEquirectangular](https://github.com/spite/THREE.CubemapToEquirectangular) and [Google Spherical Video V2 RFC](https://github.com/google/spatial-media/blob/master/docs/spherical-video-v2-rfc.md).

**Stereoscopic 360 Pipeline:**
```
1. Position cameras at IPD offset (6.4cm apart)
2. Render 6 cubemap faces per eye (12 total)
3. Convert each cubemap to equirectangular
4. Stack: left eye (top), right eye (bottom)
5. Final resolution: 8192x8192 (4096x4096 per eye)
6. Encode with stereo_mode=top_bottom metadata
```

---

## Database & Storage

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **SQLite** | 3.x | Job metadata, user projects | Simple, no server. Use Turso for cloud sync if needed. |
| **Local filesystem** | - | Rendered frames, videos | Fast NVMe for intermediate files. |
| **Cloudflare R2** | - | Cloud storage for exports | S3-compatible, no egress fees. Mobile download target. |

**Confidence:** HIGH

---

## Alternatives Considered (And Why Not)

| Category | Rejected | Why Not |
|----------|----------|---------|
| Rendering | Electron app | Adds complexity. Browser + dedicated worker is cleaner. |
| Rendering | Pure WebGL headless | 4096x4096 hard limit. Cannot do 8K. |
| Rendering | Unity headless | Overkill licensing, not optimized for this workflow. |
| Encoding | AV1-only | Poor VR headset support. HEVC is universal. |
| Queue | Trigger.dev | Adds external dependency. BullMQ is self-contained. |
| Queue | Inngest | Cloud-only pricing model. Home server needs local control. |
| Remote | ngrok | Paid tiers for custom domains. Cloudflare Tunnel is free. |
| Remote | Port forwarding | Security risk, doesn't work behind CGNAT. |

---

## GPU Hardware Recommendations

### Minimum (1080p-4K renders):
- **NVIDIA RTX 3060 12GB** - Sufficient for 4K, NVENC encoding
- ~$250-300 used

### Recommended (4K-8K renders):
- **NVIDIA RTX 4090 24GB** - Fast 8K, 3 NVENC encoders, AV1 support
- ~$1,600-2,000

### Future-proof (8K+ with large scenes):
- **NVIDIA RTX 5090 32GB** (Jan 2025) - Blackwell architecture, fastest consumer GPU
- ~$2,000+

**Confidence:** HIGH - Verified via [2026 GPU guide](https://acecloud.ai/blog/best-gpus-for-rendering-video-editing/).

---

## Installation Commands

```bash
# Core Next.js dependencies
npm install next@15 react@19 react-dom@19
npm install @react-three/fiber@8 @react-three/drei three@0.172

# Video recording (browser preview)
npm install mediabunny
# Copy r3f-video-recorder.tsx from https://github.com/malerba118/r3f-video-recorder

# Job queue
npm install bullmq ioredis

# Utility
npm install zod nanoid

# Dev dependencies
npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer
```

```bash
# System dependencies (home server)

# FFmpeg with NVENC (Windows)
choco install ffmpeg-full

# FFmpeg with NVENC (Linux)
sudo apt install ffmpeg

# Blender (headless rendering)
# Download from https://www.blender.org/download/
# Or: sudo snap install blender --classic

# Google Spatial Media tools
pip install spatial-media

# Redis (for BullMQ)
# Windows: Use Docker or Memurai
# Linux: sudo apt install redis-server
```

---

## Architecture Diagram

```
+------------------+       +---------------------+
|   Mobile Phone   |       |    Desktop Browser  |
|   (Control UI)   |       |    (Control UI)     |
+--------+---------+       +----------+----------+
         |                            |
         v                            v
+------------------------------------------+
|           Cloudflare Tunnel              |
|         (HTTPS, Zero-Config)             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|            Next.js 15 App                |
|  +-------------+  +------------------+   |
|  | Web UI      |  | API Routes       |   |
|  | (R3F Prev.) |  | (Job Submission) |   |
|  +-------------+  +--------+---------+   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|              BullMQ + Redis              |
|           (Job Queue)                    |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|           GPU Worker Process             |
|  +-------------+  +------------------+   |
|  | Blender     |  | FFmpeg NVENC     |   |
|  | (8K Render) |  | (Encode + Mux)   |   |
|  +-------------+  +------------------+   |
|                                          |
|  +-----------------------------------+   |
|  | Spatial Media Metadata Injector   |   |
|  +-----------------------------------+   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|     Cloudflare R2 / Local Storage        |
|        (Final Video Delivery)            |
+------------------------------------------+
```

---

## Key Technical Constraints

### WebGL/WebGPU Limits (Browser Rendering)
- Maximum texture size: **4096x4096** in Chromium headless
- Maximum canvas size: **16384x16384** (theoretical, memory-limited)
- **Implication:** Browser can preview, cannot export 8K directly

### Stereoscopic 360 Frame Budget
- Per frame at 8K stereo: 12 cubemap renders (6 per eye)
- At 60fps: **720 renders per second**
- **Implication:** Real-time impossible. Offline rendering only.

### VR Metadata Requirements
- YouTube requires: `XMP-GSpherical:Spherical = true`
- Stereoscopic requires: `st3d` box with stereo_mode
- **Implication:** FFmpeg alone insufficient. Use Google Spatial Media tools.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Chromium 4K limit blocks 8K | HIGH (confirmed) | Use Blender for production renders |
| GPU driver issues on cloud | MEDIUM | Test Vast.ai/RunPod templates before committing |
| VR metadata not recognized | LOW | Use official Google Spatial Media tools |
| Cloudflare Tunnel latency | LOW | Acceptable for control UI, not for streaming |
| WebGPU breaking changes | LOW | r171+ is stable; keep Three.js pinned |

---

## Sources

### High Confidence (Official Documentation)
- [Three.js WebGPURenderer Docs](https://threejs.org/docs/pages/WebGPURenderer.html)
- [Blender Python API](https://docs.blender.org/api/current/bpy.ops.render.html)
- [Google Spatial Media Specs](https://github.com/google/spatial-media/blob/master/docs/spherical-video-v2-rfc.md)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Mediabunny Guide](https://mediabunny.dev/guide/introduction)
- [NVIDIA NVENC AV1](https://developer.nvidia.com/blog/improving-video-quality-and-performance-with-av1-and-nvidia-ada-lovelace-architecture/)

### Medium Confidence (Verified Community Sources)
- [FFmpeg 360 Video Cheatsheet](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)
- [WebGPU 2026 Browser Support](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)
- [Cloudflare vs Tailscale 2025](https://onidel.com/blog/tailscale-cloudflare-nginx-vps-2025)
- [RunPod Pricing](https://www.runpod.io/pricing)
- [Vast.ai GPU Cloud](https://vast.ai/)

### Low Confidence (Single Source / Needs Validation)
- Specific cloud GPU availability may vary by region
- Exact render times depend on scene complexity

---

## Next Steps for Roadmap

1. **Phase 1:** Build web UI with R3F preview (existing code base)
2. **Phase 2:** Implement BullMQ job queue + Blender worker
3. **Phase 3:** Add FFmpeg encoding pipeline with VR metadata
4. **Phase 4:** Cloudflare Tunnel deployment for mobile access
5. **Phase 5:** Cloud GPU overflow (Vast.ai integration)

**Suggested deeper research before Phase 2:**
- Blender Python API for dynamic scene generation from Three.js shader code
- Conversion of GLSL shaders to Blender shader nodes (may require manual porting)
