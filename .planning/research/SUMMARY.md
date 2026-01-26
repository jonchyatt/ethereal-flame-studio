# Research Summary: Ethereal Flame Studio

**Domain:** Audio-reactive video generation for VR/360 content
**Researched:** January 26, 2026
**Overall confidence:** HIGH

---

## Executive Summary

Building a phone-to-published-video pipeline for 8K stereoscopic 360 content requires a **hybrid architecture** that separates the control interface from the rendering engine. The core insight from this research is that **browser-based WebGL rendering cannot exceed 4K resolution** due to hard-coded Chromium texture limits, making a dedicated GPU renderer (Blender or headless Three.js with native GPU) mandatory for 8K output.

The recommended architecture uses Next.js with React Three Fiber for the mobile-accessible control UI and real-time preview, while offloading production rendering to a Blender-based pipeline that runs on either a home server (exposed via Cloudflare Tunnel) or cloud GPU instances (Vast.ai/RunPod). BullMQ provides the job queue that bridges these components.

Three.js has achieved production-ready WebGPU support as of r171 (September 2025), with ~70% browser coverage. This enables high-performance previews in-browser while the heavy lifting happens server-side.

For video encoding, H.265 (HEVC) remains the universal choice for VR headset compatibility, while AV1 offers 20-30% better compression for streaming delivery. Google's Spatial Media tools are required to inject the sv3d/st3d metadata that makes YouTube and VR players recognize stereoscopic 360 content.

---

## Key Findings

**Stack:** Next.js 15 + React Three Fiber (preview) + Blender 4.5 LTS (8K render) + BullMQ (queue) + FFmpeg/NVENC (encode)

**Architecture:** Hybrid browser UI + dedicated GPU worker, connected via Cloudflare Tunnel for remote access

**Critical pitfall:** WebGL has a **4096x4096 texture limit** in headless Chromium. Cannot render 8K (7680x4320) in browser.

**VR Metadata:** FFmpeg alone cannot inject proper 360/stereoscopic metadata. Must use Google Spatial Media tools (Python) for sv3d/st3d boxes.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### 1. **Foundation Phase** - Web UI + Preview Engine
**Rationale:** Leverage existing Three.js/R3F codebase for immediate value delivery.
- Addresses: Mobile-accessible control interface, real-time audio visualization preview
- Avoids: Over-engineering the UI before rendering pipeline works

### 2. **Rendering Pipeline Phase** - Blender Integration
**Rationale:** 8K requirement eliminates browser-only approach. Blender has mature Python API and proven headless rendering.
- Addresses: 8K 360 stereoscopic output, GPU utilization
- Avoids: Attempting browser-based 8K (will fail at WebGL limits)

### 3. **Encoding Phase** - FFmpeg + Metadata Injection
**Rationale:** Video encoding is a distinct concern from rendering. NVENC hardware acceleration is essential for practical 8K workflows.
- Addresses: H.265/AV1 encoding, VR metadata for YouTube/headsets
- Avoids: Relying on Blender's built-in encoder (slower, less flexible)

### 4. **Remote Access Phase** - Cloudflare Tunnel + Mobile Polish
**Rationale:** Only after core pipeline works should we expose it remotely.
- Addresses: Phone-to-home-server workflow
- Avoids: Security exposure before system is stable

### 5. **Scale Phase** - Cloud GPU Overflow
**Rationale:** Cloud GPU is cost-effective for batch jobs but adds complexity.
- Addresses: Burst capacity, users without home GPU
- Avoids: Cloud lock-in for primary workflow

**Phase ordering rationale:**
- Preview must work before rendering (user needs to see what they're creating)
- Rendering must work before encoding (nothing to encode otherwise)
- Local must work before remote (debug locally first)
- Home server must work before cloud (simpler, cheaper to iterate)

**Research flags for phases:**
- Phase 2: **Likely needs deeper research** - Converting Three.js GLSL shaders to Blender shader nodes is non-trivial. May need to run Three.js headless with GPU instead of Blender for shader compatibility.
- Phase 3: Standard patterns, unlikely to need research
- Phase 5: Cloud GPU availability fluctuates; may need real-time pricing checks

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (frameworks) | HIGH | Verified via official docs and 2025-2026 releases |
| Features (what to build) | HIGH | Requirements are clear and technically feasible |
| Architecture | HIGH | Hybrid approach is well-established pattern |
| Rendering limits | HIGH | WebGL 4K limit confirmed in Chromium source |
| VR metadata | HIGH | Google Spatial Media is the standard |
| Cloud GPU pricing | MEDIUM | Prices fluctuate; specific quotes may change |
| Shader conversion | LOW | Three.js GLSL to Blender is uncharted territory for this project |

---

## Gaps to Address

1. **Shader Portability:** Existing Three.js shaders (Star Nest skybox, particle systems) may not translate directly to Blender. Options:
   - Run Three.js headless with native GPU (Puppeteer + NVIDIA Docker)
   - Rewrite shaders in Blender's node system
   - Use Blender's EEVEE with custom GLSL (experimental)

2. **Audio Sync in Offline Render:** Real-time FFT analysis doesn't apply to frame-by-frame rendering. Need to pre-analyze audio and pass amplitude data per frame.

3. **Tiled Rendering for 8K:** Even Blender may need tile rendering for 8K on consumer GPUs with 24GB VRAM. CamSplitter addon or custom Python script needed.

4. **Mobile Upload Limits:** Uploading 8K video (potentially 10GB+) from mobile is impractical. Final files should be cloud-hosted with shareable links.

---

## Files Created

| File | Purpose |
|------|---------|
| `.planning/research/SUMMARY.md` | This file - executive summary with roadmap implications |
| `.planning/research/STACK.md` | Detailed technology recommendations with versions and rationale |
| `.planning/research/FEATURES.md` | Feature landscape (table stakes, differentiators) |
| `.planning/research/ARCHITECTURE.md` | System design patterns and component boundaries |
| `.planning/research/PITFALLS.md` | Domain-specific mistakes to avoid |
