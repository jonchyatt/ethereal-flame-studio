# Milestones: Ethereal Flame Studio

## v1.0 — Local Production Pipeline

**Period:** 2026-01-26 to 2026-02-03
**Phases:** 1-5 (plus Phase 7 research, Phase 11 partial)
**Status:** Complete (core pipeline)

**What shipped:**
- Web UI with audio-reactive visual engine (Flame + Mist modes)
- Template system with 6 curated presets + save/load
- Full rendering pipeline (1080p, 4K, 360 mono/stereo, VR metadata)
- Headless CLI rendering with Puppeteer + FFmpeg
- Batch queue with BullMQ + Redis + SQLite
- Whisper transcription microservice
- Google Drive sync, Google Sheets export, ntfy notifications
- Cloudflare Tunnel remote access
- n8n self-hosted with YouTube auto-upload workflow
- Audio prep MVP (ingest, edit, preview, save with ffmpeg filter_complex)

**Key stats:**
- 35+ plans executed across 5 phases
- 41 v1 requirements defined
- 18 Phase 7 (Blender VFX) requirements researched

**Last phase number:** 11

---

## v2.0 — Cloud Production

**Period:** 2026-02-20 to 2026-02-22
**Phases:** 12-18 (7 phases, 24 requirements)
**Status:** Complete

**What shipped:**
- Storage adapter pattern (local filesystem + Cloudflare R2)
- Turso-backed job and asset state (replaced local better-sqlite3)
- Render.com CPU worker for audio prep (ffmpeg, yt-dlp)
- GPU render dispatch to Modal via R2 signed URLs
- Async API routes with jobId polling
- Environment-driven local/production configuration
- Secure webhook callbacks for Modal render completion
- GitHub Actions CI/CD (auto-deploy Vercel + Render on push)
- Integration wiring fixes (legacy routes → getJobStore())
- Per-type reaper timeouts (ingest 10m, preview 5m, save 15m)

**Key stats:**
- 18 plans executed across 7 phases
- 24 v2 requirements defined and shipped
- Architecture: Vercel + Render.com + Turso + Cloudflare R2 + Modal

**Last phase number:** 18

---

## v3.0 — Floating Widget Design System

**Started:** 2026-03-05
**Phases:** 19-25 (7 phases, 22 requirements)
**Status:** In progress (parallel with v4.0)

**Goal:** Replace deeply nested AdvancedEditor with Photoshop-style free-floating widget panels, add template actions, and split render targets.

**Phase 19 complete:** Widget Shell + react-rnd Foundation (3/3 plans)

**Last phase number:** 25

---

## v4.0 — Cinema VFX Pipeline

**Started:** 2026-03-19
**Phases:** 26-33 (8 phases, 38 requirements)
**Status:** In progress (roadmap created, ready to plan Phase 26)

**Goal:** Add Blender as a second render path controlled by Claude via MCP, producing cinema-quality fire, water, VFX, and "luminous being" transformations far beyond WebGL limits.

**Target features:**
- Blender MCP integration (blender-mcp + CLI-Anything)
- Mantaflow fire simulation driven by audio bass channel
- Mantaflow water with caustics, foam, fire-over-water scene
- World building with Poly Haven HDRIs and Sketchfab/AI assets
- 8K stereoscopic equirectangular VR renders from Cycles
- Depth-aware video compositing on real 360 footage
- EDM volumetric lasers, LED grids, beat-synced strobes
- Luminous Being: person segmentation + volumetric glow + fire body
- Chrome MCP visual research (analyze UON Visuals)
- Audio-to-keyframe mapping with 8+ simultaneous parameters
- Multi-layer Blender compositor and render pipeline
- CLI-Anything harness for token-efficient daily use

**Architecture:** blender-mcp (TCP:9876) + librosa + SAM 2.1 + Blender Cycles + CLI-Anything

**Note:** Supersedes Phase 7 from v1.0 (same scope, updated architecture with blender-mcp)

**Last phase number:** 33

---

*Last updated: 2026-03-19 after v4.0 milestone start*
