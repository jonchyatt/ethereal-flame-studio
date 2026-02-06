# Roadmap: Ethereal Flame Studio

**Created:** 2026-01-26
**Updated:** 2026-01-28
**Depth:** Comprehensive
**Coverage:** 57 requirements across 6 phases

---

## Overview

This roadmap transforms audio files into publication-ready 360 VR and social media videos through six phases: (1) Web UI with visual engine and audio reactivity, (2) template system for preset management, (3) high-fidelity rendering pipeline with YouTube-optimized encoding, (4) batch automation with multi-machine render farm and Whisper transcription, (5) n8n workflow automation with Claude Code integration, and (6) YouTube channel optimization with multi-platform expansion.

---

## Phases

### Phase 1: Foundation - Web UI + Visual Engine

**Goal:** User can preview audio-reactive visuals in browser on any device

**Dependencies:** None (foundational phase)

**Plans:** 8 plans in 5 waves

Plans:
- [x] 01-01-PLAN.md — Project scaffolding (Next.js + R3F setup)
- [x] 01-02-PLAN.md — Audio analyzer (FFT, frequency bands, beat detection)
- [x] 01-03-PLAN.md — Particle system core (lifetime, size curve, dual-layer)
- [x] 01-04-PLAN.md — Star Nest skybox (procedural background)
- [x] 01-05-PLAN.md — Ethereal Mist mode (soft clouds)
- [x] 01-06-PLAN.md — Ethereal Flame mode (warm upward drift)
- [x] 01-07-PLAN.md — Mobile-friendly UI (control panels)
- [x] 01-08-PLAN.md — Integration (wire audio to visuals)

**Wave Structure:**
- Wave 1: 01-01 (scaffolding)
- Wave 2: 01-02, 01-03, 01-04 (audio, particles, skybox - parallel)
- Wave 3: 01-05, 01-06 (visual modes - parallel)
- Wave 4: 01-07 (UI)
- Wave 5: 01-08 (integration + verification)

**Requirements:**
- VIS-01: Real-time WebGL preview of visuals in browser
- VIS-02: Ethereal Mist mode - soft cloud-like particle effect
- VIS-03: Ethereal Flame mode - organic upward drift, warm colors
- VIS-04: Particle lifetime system - spawn/live/die cycle
- VIS-05: Dual-layer particle system - inner glow + outer halo
- VIS-05b: Scalable particle count (2000 default, up to 50,000+)
- VIS-06: Star Nest skybox - procedural volumetric background
- VIS-07: Automatic skybox rotation during playback
- VIS-08: Audio FFT analysis driving particle behavior
- VIS-09: Frequency band separation (bass, mids, treble)
- VIS-10: Size-over-lifetime curve (Unity reference implementation)
- VIS-11: Threshold-crossing beat detection with minimum interval
- VIS-12: Smooth lerp transitions for all reactive properties
- AUD-01: Audio file upload (MP3, WAV, OGG)
- AUD-02: Real-time FFT analysis for preview
- AUD-04: Beat detection for pulse effects
- INF-01: Mobile-friendly web UI

**Success Criteria:**
1. User uploads audio file from phone and sees particles react to the beat
2. User switches between Ethereal Mist and Ethereal Flame modes with visible difference
3. Particles exhibit organic bloom/fade lifecycle (not static sprites)
4. Star Nest skybox rotates subtly during playback
5. Bass/mids/treble independently influence different visual properties

**Status:** COMPLETE

---

### Phase 2: Template System

**Goal:** User can save, load, and switch between visual presets

**Dependencies:** Phase 1 (visual engine must exist to configure)

**Plans:** 6 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — Template types and store with persistence (TPL-01/TPL-05 foundation)
- [x] 02-02-PLAN.md — Built-in curated presets (TPL-03)
- [x] 02-03-PLAN.md — Template gallery UI with thumbnails (TPL-02/TPL-06)
- [x] 02-04-PLAN.md — Save template with screenshot capture (TPL-01 complete)
- [x] 02-05-PLAN.md — Advanced parameter editor (TPL-04)
- [x] 02-06-PLAN.md — Phase 2 verification checkpoint

**Wave Structure:**
- Wave 1: 02-01, 02-02 (foundation + presets - parallel)
- Wave 2: 02-03 (gallery UI)
- Wave 3: 02-04, 02-05 (save dialog + advanced editor - parallel)
- Wave 4: 02-06 (verification checkpoint)

**Requirements:**
- TPL-01: Save all visual settings as named template (JSON)
- TPL-02: Load templates from library
- TPL-03: 4-6 built-in curated presets
- TPL-04: Advanced parameter editor with full slider access
- TPL-05: Template persistence across browser sessions
- TPL-06: Template selection UI (thumbnail previews)

**Success Criteria:**
1. User selects "Deep Space" preset and visuals update immediately
2. User tweaks particle color, saves as "My Custom", finds it in library next session
3. User sees thumbnail previews distinguishing different presets
4. Advanced users access full slider panel for fine-grained control

**Status:** COMPLETE

#### Visual Engine Upgrades (January 31 - February 1, 2026)

**Status:** COMPLETE (documented in `docs/CHANGELOG_VISUALS.md`)

These upgrades extended the visual engine beyond the original Phase 1-2 scope:

**Video Skybox System:**
- Video file import as 360 background with luma/chroma key masking
- 4 patch masks (A-D) with click-to-pick center positioning
- Rect mask with preview modes (split/invert)
- Pole fade, hole fix, and seam blend shaders
- Video alignment (yaw/pitch offsets)
- Pole Logo Overlay for brand coverage

**Camera & Placement:**
- Orb placement system (viewer-space vs world-space anchoring)
- Camera Rig with look-at, orbit, and render-only orbit modes
- Drag-to-look camera for world-anchored mode

**VR & UX:**
- VR Comfort Mode (freeze skybox rotation)
- VR debug overlay toggle
- Docked left/right control panels with hide buttons
- Template import/export controls
- Batch render quick link in render dialog

**Multi-pick Patch System:**
- Multi-pick and cursor tracking for patch selection
- Crosshair overlay for patch positioning

---

### Phase 3: Rendering Pipeline

**Goal:** User can export publication-quality videos optimized for YouTube and social platforms

**Dependencies:** Phase 1 (visual engine), Phase 2 (templates define what to render)

**Plans:** 11 plans in 7 waves

Plans:
- [x] 03-01-PLAN.md — Pre-analysis for offline rendering (amplitude-per-frame)
- [x] 03-02-PLAN.md — Frame capture system (WebGLRenderTarget + async readPixels)
- [x] 03-03-PLAN.md — Flat export pipeline (1080p/4K, 16:9/9:16)
- [x] 03-04-PLAN.md — 360 monoscopic pipeline (CubeCamera + equirectangular)
- [x] 03-05-PLAN.md — 360 stereoscopic pipeline (dual CubeCamera + stack)
- [x] 03-06-PLAN.md — FFmpeg integration + VR metadata injection
- [x] 03-07-PLAN.md — Headless rendering mode (Puppeteer + real GPU)
- [x] 03-08-PLAN.md — Render queue with persistence (BullMQ + Redis)
- [x] 03-09-PLAN.md — YouTube-optimized encoding presets (codec, bitrate, HDR)
- [ ] 03-10-PLAN.md — Platform-specific output formats (Shorts, Reels, TikTok) — UI integration pending
- [ ] 03-11-PLAN.md — Render settings UI (format selector, quality options) — needs verification
- [x] 03-12-PLAN.md — **Local Render CLI** (portable, no Redis, config file export) — MOSTLY COMPLETE

**Wave Structure:**
- Wave 1: 03-01 (pre-analysis)
- Wave 2: 03-02 (frame capture)
- Wave 3: 03-03, 03-04 (flat + 360 mono - parallel)
- Wave 4: 03-05 (stereoscopic)
- Wave 5: 03-06 (encoding + metadata)
- Wave 6: 03-07, 03-08 (headless + queue - parallel)
- Wave 7: 03-09, 03-10, 03-11 (YouTube optimization + platform formats - parallel)

**Requirements:**
- AUD-03: Pre-analysis for offline rendering (amplitude-per-frame data)
- RND-01: 1080p flat export (16:9 landscape)
- RND-02: 1080p flat export (9:16 vertical)
- RND-03: 4K flat export (16:9 and 9:16)
- RND-04: 360 monoscopic equirectangular export (up to 8K)
- RND-05: 360 stereoscopic export (Top/Bottom, 8K)
- RND-06: VR spatial metadata injection (Spherical Video V2)
- RND-07: Headless rendering mode (command line, no GUI)
- RND-08: Render queue with job persistence (survives browser close)
- RND-09: YouTube-optimized H.264/VP9 encoding (12-45 Mbps based on resolution)
- RND-10: YouTube Shorts format (9:16, 1080x1920, max 60s)
- RND-11: Instagram Reels format (9:16, 1080x1920, max 90s)
- RND-12: TikTok format (9:16, 1080x1920, max 10min)

**Success Criteria:**
1. User clicks "Render 1080p" and receives downloadable MP4 matching preview
2. User renders 8K 360 stereoscopic video playable in VR headset
3. Rendered 360 video uploads to YouTube and displays in VR mode correctly
4. User queues multiple renders, closes browser, returns to find completed jobs
5. Render server processes jobs via CLI without GUI dependencies
6. YouTube accepts rendered video without re-encoding warnings
7. User can select "YouTube Shorts" and get properly formatted vertical video

**Status:** NEARLY COMPLETE (10/12 plans done, UI integration remaining)

**Implementation Notes (verified 2026-01-30):**
- `src/lib/render/` contains full pipeline: FrameCapture, FFmpegEncoder, PuppeteerRenderer
- 360 pipeline: CubemapCapture → EquirectangularConverter → StereoStacker
- VR metadata: SpatialMetadataInjector (Python spatial-media wrapper)
- Queue: BullMQ + Redis in renderWorker.ts
- API: /api/render routes for job submission
- Deterministic rendering: SceneStepper with seeded RNG and checkpoints

---

### Phase 4: Automation + Multi-Machine Render Farm

**Goal:** User can batch-process audio files across multiple home machines with auto-organization

**Dependencies:** Phase 3 (rendering pipeline must work for batch processing)

**Plans:** 14 plans in 6 waves

Plans:
- [x] 04-01-PLAN.md — SQLite metadata database and file naming conventions
- [x] 04-02-PLAN.md — BullMQ batch queue infrastructure
- [x] 04-03-PLAN.md — Render worker with post-processing
- [x] 04-04-PLAN.md — Whisper transcription microservice (faster-whisper)
- [x] 04-05-PLAN.md — Transcription queue integration
- [x] 04-06-PLAN.md — Google Drive sync via rclone
- [x] 04-07-PLAN.md — Push notifications via ntfy/email
- [x] 04-08-PLAN.md — Google Sheets metadata export
- [x] 04-09-PLAN.md — Batch upload web UI
- [ ] 04-10-PLAN.md — Multi-machine render farm configuration
- [ ] 04-11-PLAN.md — Machine registry and health monitoring
- [ ] 04-12-PLAN.md — Video metadata templates (titles, descriptions, tags)
- [ ] 04-13-PLAN.md — Machine selector UI component
- [ ] 04-14-PLAN.md — Render job routing to selected machine

**Wave Structure:**
- Wave 1: 04-01, 04-02 (database + queue foundation - parallel)
- Wave 2: 04-03, 04-04 (workers - parallel)
- Wave 3: 04-05, 04-06, 04-07 (integrations - parallel)
- Wave 4: 04-08, 04-09 (UI + export - parallel)
- Wave 5: 04-10, 04-11 (multi-machine infrastructure - parallel)
- Wave 6: 04-12, 04-13, 04-14 (metadata + routing - parallel)

**Requirements:**
- AUD-05: Whisper transcription for auto-generating video descriptions
- AUT-01: Batch queue for processing multiple audio files
- AUT-02: Google Drive output folder integration
- AUT-03: Naming convention enforcement ([Date]_[AudioName]_[Format].mp4)
- AUT-04: Metadata database (Google Sheets or local CSV)
- INF-03: Job status notifications (push or polling)
- FARM-01: Machine registry (list of render machines with specs)
- FARM-02: Per-machine Cloudflare Tunnel configuration
- FARM-03: Health check endpoint on each render machine
- FARM-04: Machine selector dropdown in web UI
- FARM-05: Render job routing to user-selected machine
- META-01: Title template with variable substitution
- META-02: Description template with Whisper transcript insertion
- META-03: Tag suggestions based on audio content/filename

**Success Criteria:**
1. User uploads 5 audio files, selects template, all render overnight with proper names
2. Completed videos appear in Google Drive folder automatically
3. Each video has Whisper-generated description in metadata spreadsheet
4. User receives notification when batch completes
5. User can select "Desktop" or "Laptop" as render target
6. Render job goes to correct machine based on selection
7. If selected machine is offline, user sees error before submitting

**Status:** MOSTLY COMPLETE (9/14 plans done, multi-machine remaining)

**Implementation Notes (verified 2026-01-30):**
- `src/lib/db/schema.ts` - SQLite schema with renders table
- `src/lib/queue/` - BullMQ queue, renderWorker, transcriptionWorker
- `src/lib/services/whisperClient.ts` - Whisper transcription client
- `src/lib/services/googleDrive.ts` - rclone-based Google Drive sync
- `src/lib/services/googleSheets.ts` - Google Sheets export
- `src/lib/services/notifications.ts` - Push notifications
- `src/app/batch/page.tsx` - Batch upload UI
- Multi-machine render farm (04-10 through 04-14) still needs implementation

---

### Phase 5: n8n Integration + Claude Code Workflow Generation

**Goal:** User can trigger renders from phone with n8n workflows auto-generated by Claude Code

**Dependencies:** Phase 4 (automation infrastructure must exist)

**Plans:** 8 plans in 4 waves

Plans:
- [x] 05-01-PLAN.md — Cloudflare Tunnel setup (secure remote access per machine)
- [x] 05-02-PLAN.md — n8n self-hosted deployment (YouTube OAuth)
- [x] 05-03-PLAN.md — Render complete webhook (server to n8n integration)
- [x] 05-04-PLAN.md — YouTube upload workflow (auto-publish with Whisper descriptions)
- [ ] 05-05-PLAN.md — n8n MCP + Skills setup for Claude Code workflow generation
- [ ] 05-06-PLAN.md — Web app "Render" button with n8n job submission
- [ ] 05-07-PLAN.md — Render job status polling and progress display
- [ ] 05-08-PLAN.md — Multi-platform posting workflow (Blotato integration)

**Wave Structure:**
- Wave 1: 05-01, 05-02 (infrastructure - parallel)
- Wave 2: 05-03, 05-05 (webhook + n8n MCP - parallel)
- Wave 3: 05-04, 05-06 (YouTube workflow + web app - parallel)
- Wave 4: 05-07, 05-08 (status + multi-platform - parallel)

**Requirements:**
- AUT-05: n8n webhook trigger on render complete
- AUT-06: n8n workflow for auto-posting to YouTube, social platforms
- INF-02: Remote access to home render server (Cloudflare Tunnel)
- N8N-01: n8n MCP server connected to Claude Code project
- N8N-02: n8n Skills installed for workflow generation
- N8N-03: Claude Code can create/edit/deploy n8n workflows
- WEBAPP-01: "Render" button in preview UI sends job to n8n
- WEBAPP-02: Machine selector dropdown in render dialog
- WEBAPP-03: Format selector (YouTube 1080p, 4K, Shorts, VR, etc.)
- WEBAPP-04: Job progress indicator (submitted → rendering → encoding → uploading)

**Success Criteria:**
1. User triggers render from phone while away from home
2. Completed video auto-posts to YouTube with Whisper-generated description
3. User's home render server is securely accessible via Cloudflare Tunnel
4. Complete phone-to-published flow works without touching a computer
5. Claude Code can generate new n8n workflows from natural language requests
6. User sees render progress in web app (not just notification at end)

---

### Phase 6: YouTube Channel Optimization + Multi-Platform Expansion

**Goal:** Optimize video SEO, automate thumbnails, expand to TikTok/Instagram/other platforms

**Dependencies:** Phase 5 (n8n workflows must exist for automation)

**Plans:** 6 plans in 3 waves

Plans:
- [ ] 06-01-PLAN.md — Thumbnail auto-generation (extract key frame, add branding)
- [ ] 06-02-PLAN.md — YouTube SEO optimization (titles, descriptions, tags research)
- [ ] 06-03-PLAN.md — Video scheduling workflow (publish at optimal times)
- [ ] 06-04-PLAN.md — TikTok posting workflow (via Blotato or direct API)
- [ ] 06-05-PLAN.md — Instagram Reels posting workflow
- [ ] 06-06-PLAN.md — Analytics dashboard (track views, engagement across platforms)

**Wave Structure:**
- Wave 1: 06-01, 06-02 (thumbnail + SEO - parallel)
- Wave 2: 06-03 (scheduling)
- Wave 3: 06-04, 06-05, 06-06 (multi-platform + analytics - parallel)

**Requirements:**
- YT-01: Auto-generate thumbnail from video frame with text overlay
- YT-02: Title templates with SEO keywords
- YT-03: Description templates with timestamps, links, hashtags
- YT-04: Tag generation based on content category
- YT-05: Scheduled publishing (upload private, publish at set time)
- MULTI-01: TikTok posting (9:16 format, captions, sounds)
- MULTI-02: Instagram Reels posting (9:16, hashtags)
- MULTI-03: Cross-platform status tracking in Google Sheets
- ANALYTICS-01: View count tracking per platform
- ANALYTICS-02: Engagement metrics (likes, comments, shares)

**Success Criteria:**
1. Every video gets auto-generated thumbnail matching channel branding
2. Titles and descriptions follow SEO best practices
3. Videos publish at scheduled times without manual intervention
4. Same content posts to YouTube, TikTok, Instagram with platform-specific formatting
5. User can see performance metrics in a single dashboard

---

## Progress

| Phase | Name | Status | Requirements | Plans |
|-------|------|--------|--------------|-------|
| 1 | Foundation - Web UI + Visual Engine | Complete | 17 | 8 |
| 2 | Template System | Complete | 6 | 6 |
| 3 | Rendering Pipeline | **Nearly Complete** | 13 | 10/12 done |
| 4 | Automation + Multi-Machine | **Mostly Complete** | 14 | 9/14 done |
| 5 | n8n + Claude Code Integration | **Half Complete** | 10 | 4/8 done |
| 6 | YouTube + Multi-Platform | Planned | 10 | 6 |

**Total:** 57 requirements across 6 phases (70 total requirements including Phase 1-2)

---

## Phase Dependencies

```
Phase 1 (Foundation) ✅
    |
    v
Phase 2 (Templates) ✅
    |
    v
Phase 3 (Rendering) ✅ (10/12 plans - UI remaining)
    |
    v
Phase 4 (Automation) ✅ (9/14 plans - multi-machine remaining)
    |
    v
Phase 5 (n8n + Remote) 🔄 (4/8 plans - tunnel, n8n, webhook, YouTube done)
    |
    v
Phase 6 (YouTube + Multi-Platform)
```

---

## Research Flags

| Phase | Flag | Notes |
|-------|------|-------|
| Phase 3 | UI INTEGRATION | Platform format UI and render settings UI remaining |
| Phase 4 | NEEDS RESEARCH | Multi-machine render farm architecture |
| Phase 5 | NEEDS RESEARCH | n8n MCP + Skills integration for Claude Code |
| Phase 6 | NEEDS RESEARCH | Thumbnail generation, SEO, multi-platform APIs |

---

## Key Architecture Decisions

### Multi-Machine Render Farm
- Each machine runs render server + Cloudflare Tunnel
- Machine registry stored in config file or database
- Health check API on each machine
- User selects machine from dropdown before rendering
- n8n routes job to selected machine's tunnel URL

### n8n + Claude Code Integration
- n8n MCP server connects Claude Code to n8n instance
- n8n Skills teach Claude Code how to build workflows
- Claude Code can CREATE, EDIT, DEPLOY workflows from conversation
- Eliminates manual n8n workflow building

### YouTube Optimization
- FFmpeg encoding presets match YouTube recommendations
- Avoid re-encoding on upload (proper codec, bitrate, container)
- Auto-generate thumbnails from key frames
- SEO templates for titles, descriptions, tags

---

### Phase 7: Blender VFX Production Pipeline

**Goal:** Full VFX production capability with physics simulations, VR compositing, depth-aware rendering, and EDM visual effects

**Dependencies:** Phase 3 (rendering pipeline), existing BLENDER_FIRE_ORB.md and BLENDER_WATER.md research

**Plans:** 12 plans in 5 waves

Plans:
- [ ] 07-01-PLAN.md — Blender + MCP installation and configuration
- [ ] 07-02-PLAN.md — Audio analysis expansion (envelope, onset, BPM, spectral)
- [ ] 07-03-PLAN.md — Mantaflow fire simulation template
- [ ] 07-04-PLAN.md — Mantaflow water simulation template
- [ ] 07-05-PLAN.md — Audio-to-keyframe parameter mapping system
- [ ] 07-06-PLAN.md — VR video import and equirectangular setup
- [ ] 07-07-PLAN.md — Depth map extraction from 360° footage
- [ ] 07-08-PLAN.md — Shadow catcher and VR compositing
- [ ] 07-09-PLAN.md — Video masking and chroma keying
- [ ] 07-10-PLAN.md — EDM volumetric laser effects
- [ ] 07-11-PLAN.md — EDM LED grid and strobe effects
- [ ] 07-12-PLAN.md — Multi-layer compositor and render pipeline

**Wave Structure:**
- Wave 1: 07-01, 07-02 (infrastructure + audio analysis)
- Wave 2: 07-03, 07-04, 07-05 (physics simulations + audio mapping)
- Wave 3: 07-06, 07-07, 07-08, 07-09 (VR compositing suite)
- Wave 4: 07-10, 07-11 (EDM effects)
- Wave 5: 07-12 (integration + final pipeline)

**Requirements:**

*Infrastructure*
- BLND-01: Blender MCP server connected to Claude Desktop
- BLND-02: Headless Blender render pipeline
- BLND-03: Audio analysis JSON export with extended features

*Physics Simulations*
- BLND-04: Mantaflow fire simulation with audio-driven parameters
- BLND-05: Mantaflow water simulation with audio-driven parameters
- BLND-06: Fire-over-water combined scene template

*VR Compositing*
- BLND-07: 360° video import as equirectangular background
- BLND-08: Monocular depth map extraction from VR footage
- BLND-09: Shadow catcher for realistic ground shadows
- BLND-10: Depth-aware occlusion compositing
- BLND-11: Video masking and chroma keying

*EDM Effects*
- BLND-12: Volumetric laser beams with audio-reactive rotation
- BLND-13: LED grid with ripple propagation
- BLND-14: Beat-synced strobe effects
- BLND-15: Imported EDM footage integration

*Output*
- BLND-16: Stereo equirectangular VR output
- BLND-17: Multi-layer compositor with all effects
- BLND-18: Quality comparison: Three.js vs Blender

**Success Criteria:**
1. Claude can create/modify Blender scenes via MCP commands
2. Fire/water simulations respond meaningfully to audio
3. Real 360° footage composites with virtual fire/water/effects
4. Depth maps enable realistic shadow casting
5. EDM effects (lasers, grids, strobes) sync to beats
6. Complete pipeline from audio upload to VR video output
7. Quality visibly superior to current Three.js particle system

**Status:** NOT STARTED

**Research Documents:**
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH.md` - Master research
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-AUDIO-STYLES.md` - Audio analysis expansion
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-VR-COMPOSITING.md` - VR compositing techniques
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-DEPTH-MAPS.md` - Depth extraction methods
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-EDM-EFFECTS.md` - Light show visual styles
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH-BLENDER-360-STEREO.md` - Blender 360/stereo rendering

**Existing Research (Reused):**
- `.planning/research/BLENDER_FIRE_ORB.md` - Mantaflow fire, Principled Volume
- `.planning/research/BLENDER_WATER.md` - Mantaflow fluid, Ocean modifier
- `.planning/research/THREEJS_360_STEREO_GUIDE.md` - Reference for comparison

---

## Progress

| Phase | Name | Status | Requirements | Plans |
|-------|------|--------|--------------|-------|
| 1 | Foundation - Web UI + Visual Engine | Complete | 17 | 8 |
| 2 | Template System | Complete | 6 | 6 |
| 3 | Rendering Pipeline | **Nearly Complete** | 13 | 10/12 done |
| 4 | Automation + Multi-Machine | **Mostly Complete** | 14 | 9/14 done |
| 5 | n8n + Claude Code Integration | **Half Complete** | 10 | 4/8 done |
| 6 | YouTube + Multi-Platform | Planned | 10 | 6 |
| 7 | Blender VFX Pipeline | **Not Started** | 18 | 12 |

**Total:** 75 requirements across 7 phases

---

## Phase Dependencies

```
Phase 1 (Foundation) ✅
    |
    v
Phase 2 (Templates) ✅
    |
    v
Phase 3 (Rendering) ✅ (10/12 plans - UI remaining)
    |
    +--------------------+
    |                    |
    v                    v
Phase 4 (Automation)    Phase 7 (Blender VFX) ← NEW
    |
    v
Phase 5 (n8n + Remote)
    |
    v
Phase 6 (YouTube + Multi-Platform)
```

---

## Research Flags

| Phase | Flag | Notes |
|-------|------|-------|
| Phase 3 | UI INTEGRATION | Platform format UI and render settings UI remaining |
| Phase 4 | NEEDS RESEARCH | Multi-machine render farm architecture |
| Phase 5 | NEEDS RESEARCH | n8n MCP + Skills integration for Claude Code |
| Phase 6 | NEEDS RESEARCH | Thumbnail generation, SEO, multi-platform APIs |
| Phase 7 | RESEARCH COMPLETE | All research documents created 2026-01-30 |

---

## Key Architecture Decisions

### Multi-Machine Render Farm
- Each machine runs render server + Cloudflare Tunnel
- Machine registry stored in config file or database
- Health check API on each machine
- User selects machine from dropdown before rendering
- n8n routes job to selected machine's tunnel URL

### n8n + Claude Code Integration
- n8n MCP server connects Claude Code to n8n instance
- n8n Skills teach Claude Code how to build workflows
- Claude Code can CREATE, EDIT, DEPLOY workflows from conversation
- Eliminates manual n8n workflow building

### YouTube Optimization
- FFmpeg encoding presets match YouTube recommendations
- Avoid re-encoding on upload (proper codec, bitrate, container)
- Auto-generate thumbnails from key frames
- SEO templates for titles, descriptions, tags

### Blender VFX Pipeline (Phase 7) - NEW
- Hybrid approach: Three.js for preview, Blender for cinema quality
- Blender MCP for Claude-controlled scene setup
- Audio-to-keyframe system for physics simulation parameters
- Multi-layer compositor for VR effects
- Depth map integration for realistic compositing

---

*Last updated: 2026-01-30 (Phase 7 added)*
