# Ethereal Flame Studio

## What This Is

An audio-reactive video generation engine that transforms audio files (meditation, music) into high-fidelity 360° VR and flat social media videos. Users upload audio, select a visual template, and the system renders publication-ready videos with auto-generated descriptions, then hands off to n8n for automated social media posting. Now moving to a full cloud production stack so the entire workflow runs on the web.

## Core Value

**Phone to published video without touching a computer.** A creator should be able to upload audio from their phone, pick a preset, and have a finished video posted to YouTube/social media — fully automated.

## Current Milestone: v4.0 Cinema VFX Pipeline

**Goal:** Add Blender as a second render path controlled by Claude via MCP, producing cinema-quality fire, water, VFX, and "luminous being" transformations far beyond WebGL limits.

**Target features:**
- Blender MCP integration (Claude controls Blender via blender-mcp)
- Mantaflow fire simulation driven by audio analysis
- Mantaflow water simulation with caustics, foam, reflections
- World building with Poly Haven, Sketchfab, AI-generated assets
- 8K stereoscopic equirectangular VR renders from Blender/Cycles
- Video compositing with depth-aware occlusion on real 360 footage
- EDM light show effects (volumetric lasers, LED grids, beat-synced strobes)
- Luminous Being pipeline (transform person video into glowing being of light)
- Chrome MCP visual intelligence research (analyze reference creators like UON Visuals)
- CLI-Anything integration for token-efficient repeated Blender operations

**Two render paths (new architecture):**
- **Preview:** Three.js (browser) — real-time, good quality, live tweaking
- **Cinema:** Blender/Cycles (via MCP) — minutes-hours, photorealistic, final output

**Parallel milestone:** v3.0 (Floating Widget Design System, phases 20-25) continues for UI polish

## Requirements

### Validated

- ✓ Visual engine with Flame + Mist modes — v1.0/Phase 1
- ✓ Dual-layer particle system with lifetime curves — v1.0/Phase 1
- ✓ Star Nest skybox with 20+ presets — v1.0/Phase 1
- ✓ Audio FFT analysis with frequency band separation — v1.0/Phase 1
- ✓ Template system with 6 presets + save/load — v1.0/Phase 2
- ✓ Rendering pipeline (1080p, 4K, 360 mono/stereo) — v1.0/Phase 3
- ✓ Headless CLI rendering with Puppeteer + FFmpeg — v1.0/Phase 3
- ✓ VR spatial metadata injection — v1.0/Phase 3
- ✓ Batch queue with BullMQ + Redis + SQLite — v1.0/Phase 4
- ✓ Whisper transcription microservice — v1.0/Phase 4
- ✓ Google Drive sync + Sheets export + ntfy — v1.0/Phase 4
- ✓ Cloudflare Tunnel remote access — v1.0/Phase 5
- ✓ n8n YouTube auto-upload workflow — v1.0/Phase 5
- ✓ Audio prep pipeline (ingest, edit, preview, save) — v1.0/Audio Prep MVP

### Active

**v4.0 Cinema VFX Pipeline:**
- [ ] Blender MCP integration (blender-mcp + CLI-Anything setup)
- [ ] Mantaflow fire simulation driven by audio bass channel
- [ ] Mantaflow water with caustics, foam, fire-over-water scene
- [ ] World building with Poly Haven HDRIs and Sketchfab/AI assets
- [ ] 8K stereoscopic equirectangular VR renders from Cycles
- [ ] Depth-aware video compositing on real 360 footage
- [ ] EDM volumetric lasers, LED grids, beat-synced strobes
- [ ] Luminous Being: person segmentation + volumetric glow + fire body
- [ ] Chrome MCP visual research (analyze UON Visuals and reference creators)
- [ ] Audio-to-keyframe mapping system for Blender animations
- [ ] Multi-layer Blender compositor and render pipeline

**v3.0 Floating Widget Design System (parallel, phases 20-25):**
- [ ] 9 widget content components extracted from AdvancedEditor
- [ ] Widget toolbar + localStorage persistence
- [ ] Workspace layouts, template actions, render target split
- [ ] Mobile fallback + lazy loading

### Out of Scope

- Real-time live streaming — batch rendering only
- Mobile native app — web-based, mobile-friendly
- Multi-user accounts — single creator workflow initially
- Real-time Blender rendering — batch/offline via Cycles only
- Face recognition in Luminous Being — Claude refuses, use silhouette only
- Continuous video frame polling — event-driven and on-demand only
- Custom Blender UI addon — Claude controls via MCP, no GUI addon needed
- Self-hosted ML models on Vercel — segmentation runs locally or on GPU service

## Context

**v1.0 Complete:** Phases 1-5 shipped the full local pipeline (phone → render → YouTube).

**v2.0 Complete:** Phases 12-18 shipped the full cloud production stack (Vercel + Render + Turso + R2 + Modal).

**v3.0 In Progress:** Phase 19 shipped (widget shell). Phases 20-25 queued for UI polish (parallel with v4.0).

**v4.0 Motivation:** The Three.js browser engine is beautiful for real-time preview but physically limited by WebGL. Blender's Mantaflow, Cycles, and compositor unlock cinema-quality output: volumetric fire, realistic water, depth-aware compositing, and the "Luminous Being" concept (transforming a person into a glowing being of light).

**Prior research (from v1.0 Phase 7):**
- `.planning/research/BLENDER_FIRE_ORB.md` — Mantaflow fire simulation
- `.planning/research/BLENDER_WATER.md` — Water simulation
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH.md` — Full Phase 7 research
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-EDM-EFFECTS.md` — EDM effects
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-BLENDER-360-STEREO.md` — VR rendering
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-VR-COMPOSITING.md` — Compositing
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-DEPTH-MAPS.md` — Depth extraction
- `.planning/phases/07-blender-vfx-pipeline/07-VISION-BLENDER-MCP-REVOLUTION.md` — Full vision doc

**Reference creators:**
- **UON Visuals** (youtube.com/channel/UCS1TSWgO5uh6g3lCw6Kgj4A) — Sound-reactive 4K HDR fractal visuals, 360/VR psychedelic content. Jonathan's primary reference for understanding what makes EDM visuals "spark off the screen" despite using the same pixels as a spreadsheet.

**Key tools:**
- **blender-mcp** (v1.5.5, 18K stars) — MCP bridge giving Claude direct Python access to Blender
- **CLI-Anything** (v1.0.0, 19K stars) — CLI generation framework for token-efficient repeated operations

## Constraints

- **Tech Stack**: Next.js + Three.js + Zustand + Tailwind (web app), Blender + Python (cinema pipeline)
- **Blender**: 4.x LTS required for Mantaflow, Cycles, compositor
- **blender-mcp**: Single MCP client, 180s timeout, unsandboxed exec(), base64 screenshots (use sparingly)
- **No UI libraries**: Hand-built Tailwind (no MUI, Radix, etc.)
- **Resolution**: Must support up to 8K for VR master output
- **Segmentation**: MediaPipe for fast inference, SAM for high quality — both run in Python
- **No face recognition**: Claude refuses face recognition; use silhouette/mask only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Three.js stack | Same as reference code, web-accessible, proven for 3D | ✓ Good |
| Two visual modes (Mist + Flame) | Different aesthetic needs for different content | ✓ Good |
| Vercel for web + Render for worker | Each platform's strength, no hosting migration | ✓ Good |
| Turso over Postgres | SQLite-compatible (zero migration), already set up, serverless | ✓ Good |
| R2 over Vercel Blob | Free egress, cheaper storage, S3-compatible | ✓ Good |
| Turso polling over Redis queue | Simpler, cheaper ($0 vs $10/mo), sufficient at launch volume | ✓ Good |
| Storage adapter pattern | Keep local dev working, swap to R2 in production | ✓ Good |
| react-rnd for widgets | 15KB gzipped, handles touch, bounds, edge cases | — Pending (v3.0) |
| z-[75]-z-[85] for widgets | Above panels z-50, below modals z-100 | — Pending (v3.0) |
| 18 groups → 9 widgets | Logical grouping reduces clutter while keeping discoverability | — Pending (v3.0) |
| localStorage for workspaces | Independent from visual templates, single-user sufficient | — Pending (v3.0) |
| blender-mcp for Claude→Blender | Direct Python access via MCP, 22 tools, asset integrations | — Pending (v4.0) |
| CLI-Anything for token efficiency | Wrap repetitive Blender ops as CLI commands, JSON output | — Pending (v4.0) |
| Two render paths (Preview + Cinema) | Three.js for real-time, Blender/Cycles for final output | — Pending (v4.0) |
| MediaPipe → SAM for segmentation | Fast first, high-quality later; per-frame mask export | — Pending (v4.0) |
| Chrome MCP for visual research | Analyze reference creators to decode perceptual principles | — Pending (v4.0) |

---
*Last updated: 2026-03-19 after v4.0 milestone start*
