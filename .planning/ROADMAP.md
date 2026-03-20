# Roadmap: Ethereal Flame Studio

**Created:** 2026-01-26
**Updated:** 2026-03-19
**Depth:** Comprehensive
**Coverage:** 57 v1.0 requirements (Phases 1-7) + 24 v2.0 requirements (Phases 12-18) + 22 v3.0 requirements (Phases 19-25) + 38 v4.0 requirements (Phases 26-33)

---

## Milestones

- ✅ **v1.0 Local Production Pipeline** - Phases 1-7 (shipped 2026-02-03, Phase 7 research only)
- ✅ **v2.0 Cloud Production** - Phases 12-18 (shipped 2026-02-22)
- 🚧 **v3.0 Floating Widget Design System** - Phases 19-25 (in progress)
- 🚧 **v4.0 Cinema VFX Pipeline** - Phases 26-33 (in progress)

---

<details>
<summary>v1.0 Local Production Pipeline (Phases 1-7) - SHIPPED 2026-02-03</summary>

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

---

### Phase 3: Rendering Pipeline

**Goal:** User can export publication-quality videos optimized for YouTube and social platforms

**Dependencies:** Phase 1 (visual engine), Phase 2 (templates define what to render)

**Plans:** 12 plans in 7 waves

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
- [x] 03-12-PLAN.md — Local Render CLI (portable, no Redis, config file export) — MOSTLY COMPLETE

**Requirements:**
- AUD-03, RND-01 through RND-12

**Success Criteria:**
1. User clicks "Render 1080p" and receives downloadable MP4 matching preview
2. User renders 8K 360 stereoscopic video playable in VR headset
3. Rendered 360 video uploads to YouTube and displays in VR mode correctly
4. User queues multiple renders, closes browser, returns to find completed jobs
5. Render server processes jobs via CLI without GUI dependencies
6. YouTube accepts rendered video without re-encoding warnings
7. User can select "YouTube Shorts" and get properly formatted vertical video

**Status:** NEARLY COMPLETE (10/12 plans done, UI integration remaining)

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

**Requirements:**
- AUD-05, AUT-01 through AUT-04, INF-03, FARM-01 through FARM-05, META-01 through META-03

**Success Criteria:**
1. User uploads 5 audio files, selects template, all render overnight with proper names
2. Completed videos appear in Google Drive folder automatically
3. Each video has Whisper-generated description in metadata spreadsheet
4. User receives notification when batch completes
5. User can select "Desktop" or "Laptop" as render target
6. Render job goes to correct machine based on selection
7. If selected machine is offline, user sees error before submitting

**Status:** MOSTLY COMPLETE (9/14 plans done, multi-machine remaining)

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

**Requirements:**
- AUT-05, AUT-06, INF-02, N8N-01 through N8N-03, WEBAPP-01 through WEBAPP-04

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

**Requirements:**
- YT-01 through YT-05, MULTI-01 through MULTI-03, ANALYTICS-01, ANALYTICS-02

**Success Criteria:**
1. Every video gets auto-generated thumbnail matching channel branding
2. Titles and descriptions follow SEO best practices
3. Videos publish at scheduled times without manual intervention
4. Same content posts to YouTube, TikTok, Instagram with platform-specific formatting
5. User can see performance metrics in a single dashboard

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
- [ ] 07-07-PLAN.md — Depth map extraction from 360 footage
- [ ] 07-08-PLAN.md — Shadow catcher and VR compositing
- [ ] 07-09-PLAN.md — Video masking and chroma keying
- [ ] 07-10-PLAN.md — EDM volumetric laser effects
- [ ] 07-11-PLAN.md — EDM LED grid and strobe effects
- [ ] 07-12-PLAN.md — Multi-layer compositor and render pipeline

**Requirements:**
- BLND-01 through BLND-18

**Success Criteria:**
1. Claude can create/modify Blender scenes via MCP commands
2. Fire/water simulations respond meaningfully to audio
3. Real 360 footage composites with virtual fire/water/effects
4. Depth maps enable realistic shadow casting
5. EDM effects (lasers, grids, strobes) sync to beats
6. Complete pipeline from audio upload to VR video output
7. Quality visibly superior to current Three.js particle system

**Status:** SUPERSEDED by v4.0 (Phases 26-33)

---

</details>

---

<details>
<summary>v2.0 Cloud Production (Phases 12-18) - SHIPPED 2026-02-22</summary>

## Milestone v2.0: Cloud Production

**Milestone Goal:** Move the entire pipeline to production cloud infrastructure so the app works from any device with no local machine dependencies.

**Architecture:** Vercel (web/API) + Render.com (CPU worker) + Turso (state) + Cloudflare R2 (storage) + Modal (GPU render)

**Phases:** 12-18 (7 phases, 24 requirements)

## Phases

- [x] **Phase 12: Cloud Storage Adapter** - Unified storage interface with R2 for production and local filesystem for development (completed 2026-02-21)
- [x] **Phase 13: Job State + Worker Infrastructure** - Turso-backed job queue with Render.com CPU worker service (completed 2026-02-21)
- [x] **Phase 14: API + Worker Processing Pipeline** - Async API routes wired to worker for ingest, edit, and save operations (completed 2026-02-21)
- [x] **Phase 15: Modal Render Dispatch** - GPU render jobs dispatched to Modal via R2, with webhook completion (completed 2026-02-21)
- [x] **Phase 16: Production Deploy + CI/CD** - Environment config, deploy checklist, and automated deployment pipeline (completed 2026-02-21)
- [x] **Phase 17: Integration Wiring Fixes** - Rewire legacy poll routes and worker to use getJobStore() factory (gap closure) (completed 2026-02-22)
- [x] **Phase 18: API Completeness + Timeout Accuracy** - Ingest downloadUrl, per-type timeouts, render job list (gap closure) (completed 2026-02-22)

## Phase Details

### Phase 12: Cloud Storage Adapter
**Goal**: User's audio assets and rendered videos are stored in the cloud and accessible from any device
**Depends on**: Nothing (v2.0 foundational phase; builds on existing audio-prep code)
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04
**Success Criteria** (what must be TRUE):
  1. User uploads an audio file and it is persisted in R2 (production) or local filesystem (development) via the same code path
  2. All asset artifacts (original, metadata JSON, waveform peaks, preview MP3, prepared WAV) survive a worker restart because they live in R2
  3. User can download any asset or rendered video via a time-limited signed URL without exposing the raw R2 bucket
  4. Existing local development workflow continues to work unchanged (npm run dev still uses filesystem)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 12-01-PLAN.md -- StorageAdapter interface + LocalStorageAdapter + R2StorageAdapter implementations
- [x] 12-02-PLAN.md -- Refactor AudioAssetService and API routes to use StorageAdapter
- [x] 12-03-PLAN.md -- Presigned upload/download API routes and R2 CORS configuration

**Wave Structure:**
- Wave 1: 12-01 (storage adapter foundation)
- Wave 2: 12-02, 12-03 (wiring + URL routes, parallel)

---

### Phase 13: Job State + Worker Infrastructure
**Goal**: All job tracking lives in Turso and a Render.com worker can pick up and process jobs independently of the web server
**Depends on**: Phase 12 (worker reads/writes assets via storage adapter)
**Requirements**: JOB-01, JOB-02, JOB-03, JOB-04, JOB-05, WORK-01
**Success Criteria** (what must be TRUE):
  1. Job and asset metadata rows exist in Turso cloud database, not local SQLite, and are readable from both the Vercel app and the Render worker
  2. The Render.com worker process starts, connects to Turso, and polls for pending jobs every 3-5 seconds
  3. User can see job progress (percentage, current stage like "downloading" or "normalizing") by hitting the poll endpoint
  4. User cancels a job and the worker stops processing it within one poll cycle (no orphaned ffmpeg processes)
  5. A job stuck in "processing" for longer than the configured timeout is automatically marked as failed
**Plans**: 3 plans in 2 waves

Plans:
- [x] 13-01-PLAN.md -- Drizzle schema + JobStore interface + LocalJobStore + TursoJobStore adapters
- [x] 13-02-PLAN.md -- Job poll and cancel API endpoints
- [x] 13-03-PLAN.md -- Render.com worker entry point + heartbeat/reaper + Dockerfile

**Wave Structure:**
- Wave 1: 13-01 (JobStore foundation)
- Wave 2: 13-02, 13-03 (API routes + worker, parallel)

---

### Phase 14: API + Worker Processing Pipeline
**Goal**: User can ingest, edit, preview, and save audio entirely through async API calls processed by the cloud worker
**Depends on**: Phase 13 (job queue and worker must exist)
**Requirements**: API-01, API-02, API-03, API-04, WORK-02, WORK-03, SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. All ingest/edit/save API routes return a jobId immediately (no request blocks longer than 2 seconds)
  2. Poll endpoint returns job status, progress percentage, and on completion an R2 download URL for the result
  3. Audio streaming endpoint serves audio from R2 in production and from local filesystem in development, transparently
  4. Worker successfully ingests audio from YouTube URLs, direct URLs, and file uploads (via R2 presigned upload)
  5. Worker executes edit recipes (trim, split, join, fade, volume, normalize) using the existing filter_complex pipeline and writes results to R2
  6. Cloud ingest rejects files over 100MB and audio over 30 minutes duration
  7. Webhook endpoint rejects requests missing a valid INTERNAL_WEBHOOK_SECRET header
**Plans**: 3 plans in 2 waves

Plans:
- [x] 14-01-PLAN.md -- Refactor API routes to async job dispatch via JobStore, enhance poll with download URL
- [x] 14-02-PLAN.md -- Wire worker processing pipelines (ingest, preview, save) with storage adapter I/O
- [x] 14-03-PLAN.md -- Webhook endpoint with INTERNAL_WEBHOOK_SECRET validation, streaming endpoint hardening

**Wave Structure:**
- Wave 1: 14-01, 14-03 (API routes + webhook, parallel)
- Wave 2: 14-02 (worker pipelines, depends on 14-01)

---

### Phase 15: Modal Render Dispatch
**Goal**: User can trigger a GPU video render that runs on Modal and delivers the finished video to R2
**Depends on**: Phase 14 (API routes and worker infrastructure must handle job dispatch)
**Requirements**: WORK-04, WORK-05
**Success Criteria** (what must be TRUE):
  1. Worker uploads the prepared audio to R2, generates a signed URL, and dispatches a render job to Modal with that URL
  2. Modal calls the secure webhook on render completion, providing the R2 key of the output video
  3. User polls the render job and receives a download URL for the finished video once Modal reports completion
**Plans**: 2 plans in 1 wave

Plans:
- [x] 15-01-PLAN.md -- Worker render pipeline: add render job type, refactor API route to JobStore dispatch, create worker render pipeline that uploads audio to R2 and dispatches to Modal
- [x] 15-02-PLAN.md -- Modal entry point R2 I/O: download audio from signed URL, upload rendered video to R2, call webhook with video key, enhance poll endpoint for render download URL

**Wave Structure:**
- Wave 1: 15-01, 15-02 (parallel -- no file overlap)

---

### Phase 16: Production Deploy + CI/CD
**Goal**: The full cloud stack is deployed, documented, and automatically updated on push
**Depends on**: Phase 15 (all application functionality must work before go-live)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. Application runs in production mode when DEPLOY_ENV=production is set, using R2 + Turso + Render worker, with no code changes
  2. .env.example lists every required production variable with descriptions
  3. docs/DEPLOY_PROD_CHECKLIST.md walks through provisioning R2 bucket, Turso database, Render worker, Modal endpoint, and Vercel project from scratch
  4. Pushing to main triggers GitHub Actions that deploy web to Vercel and worker to Render automatically
**Plans**: 3 plans in 2 waves

Plans:
- [x] 16-01-PLAN.md -- Environment config (DEPLOY_ENV) + .env.example rewrite
- [x] 16-02-PLAN.md -- Production deployment checklist (docs/DEPLOY_PROD_CHECKLIST.md)
- [x] 16-03-PLAN.md -- GitHub Actions CI/CD workflow (Vercel + Render auto-deploy)

**Wave Structure:**
- Wave 1: 16-01, 16-02 (env config + checklist, parallel)
- Wave 2: 16-03 (CI/CD workflow, depends on 16-01)

---

### Phase 17: Integration Wiring Fixes
**Goal**: All job poll and cancel paths in the API and worker use the getJobStore() factory so job state is consistent between web and worker in all environments
**Depends on**: Phase 13 (getJobStore factory), Phase 16 (all phases complete)
**Requirements**: JOB-01, JOB-03, JOB-04, DEPLOY-01
**Gap Closure**: Closes CRIT-01 and CRIT-02 from v2.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. Polling `/api/audio/ingest/<jobId>` returns the job status (not 404) for jobs created by the async POST route
  2. Polling `/api/audio/edit/save/<jobId>` and `/api/audio/edit/preview/<jobId>` return correct job status
  3. Cancelling via legacy DELETE paths reaches the worker via the shared JobStore (not in-memory)
  4. Running `npm run worker` locally (without TURSO_DATABASE_URL) uses LocalJobStore and works without Turso credentials
  5. FLOW-01 (Audio Ingest) and FLOW-02 (Audio Edit+Save) E2E flows complete without 404 errors
**Plans**: 2 plans in 1 wave

Plans:
- [x] 17-01-PLAN.md -- Rewire 3 legacy poll/cancel routes to getJobStore() (ingest, edit/save, edit/preview)
- [x] 17-02-PLAN.md -- Fix worker/index.ts to use getJobStore() factory instead of hardcoded TursoJobStore

**Wave Structure:**
- Wave 1: 17-01, 17-02 (parallel -- no file overlap)

---

### Phase 18: API Completeness + Timeout Accuracy
**Goal**: Poll responses include download URLs for all job types, per-type timeouts are enforced, and the render job list reflects actual jobs
**Depends on**: Phase 17 (wiring must be correct before API polish)
**Requirements**: API-02, JOB-05
**Gap Closure**: Closes GAP-01, GAP-02, GAP-03 from v2.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. Poll response for a completed ingest job includes a `downloadUrl` pointing to `/api/audio/assets/<assetId>/stream`
  2. Ingest jobs timeout after 10min, preview jobs after 5min, save jobs after 15min (per JOB_TIMEOUTS config)
  3. `GET /api/render` returns the actual render job list from getJobStore() (not always empty)
**Plans**: 2 plans in 1 wave

Plans:
- [x] 18-01-PLAN.md -- Add assetId->downloadUrl branch in poll endpoint; fix GET /api/render to use getJobStore()
- [x] 18-02-PLAN.md -- Fix reaper to pass per-type timeout from JOB_TIMEOUTS map instead of scalar default

**Wave Structure:**
- Wave 1: 18-01, 18-02 (parallel -- no file overlap)

---

</details>

---

<details>
<summary>v3.0 Floating Widget Design System (Phases 19-25) - In Progress</summary>

## Milestone v3.0: Floating Widget Design System

**Milestone Goal:** Replace the deeply nested AdvancedEditor (2,293 lines) with Photoshop-style free-floating widget panels, giving users a spatial, non-linear parameter editing experience on the Design screen.

**Architecture:** react-rnd (drag/resize) + Zustand widget store + localStorage persistence + lazy-loaded widget content components

**Phases:** 19-25 (7 phases, 22 requirements)

## Phases

- [x] **Phase 19: Widget Shell + react-rnd Foundation** - WidgetContainer component with drag, resize, minimize, close, and z-order; WidgetLayer mounted on Design screen (completed 2026-03-05)
- [ ] **Phase 20: Widget Content Extraction** - 9 standalone widget components extracted from AdvancedEditor, each reading useVisualStore with individual selectors
- [ ] **Phase 21: Widget Toolbar + Persistence** - Toolbar in ControlPanel with open/close toggles for all widgets; localStorage persistence for positions, sizes, and open state
- [ ] **Phase 22: Workspace Layouts** - Save, load, and delete named workspace arrangements stored in localStorage
- [ ] **Phase 23: Template Actions** - "Use in Render" and "Use in Experience" buttons on template cards
- [ ] **Phase 24: Render Target Split** - Separate processing target (cloud/local-agent) from save destination (download/cloud/agent-path) in render UI
- [ ] **Phase 25: Mobile Fallback + Polish** - Scrollable sheet fallback on mobile, lazy loading for closed widgets, final integration verification

## Phase Details

### Phase 19: Widget Shell + react-rnd Foundation
**Goal**: User can open parameter groups as draggable, resizable floating panels on the Design screen
**Depends on**: Nothing (v3.0 foundational phase; builds on existing Design screen)
**Requirements**: WIDG-01, WIDG-02, WIDG-03, WIDG-04, WIDG-07
**Success Criteria** (what must be TRUE):
  1. User sees a floating widget panel on the Design screen that can be grabbed by its title bar and dragged to any position
  2. User drags the bottom-right corner of a widget and it resizes smoothly without clipping its content
  3. User clicks the minimize button on a widget and it collapses to just the title bar; clicking again restores it
  4. User clicks on a widget that is partially behind another widget and it comes to the front
  5. Widget panels stay within the viewport bounds (cannot be dragged off-screen)
**Plans**: TBD

Plans:
- [ ] 19-01-PLAN.md -- Install react-rnd, create WidgetContainer component (drag, resize, minimize, close, z-order)
- [ ] 19-02-PLAN.md -- Create Zustand widgetStore (open/close, position, size, z-index state)
- [ ] 19-03-PLAN.md -- Mount WidgetLayer on Design screen in page.tsx, wire to widgetStore

**Wave Structure:**
- Wave 1: 19-01 (WidgetContainer component)
- Wave 2: 19-02, 19-03 (store + page mount, parallel)

---

### Phase 20: Widget Content Extraction
**Goal**: Each parameter group lives in its own standalone widget component that reads directly from the visual store
**Depends on**: Phase 19 (widget shell must exist to host content)
**Requirements**: WCNT-01, WCNT-02
**Success Criteria** (what must be TRUE):
  1. User opens the "Audio Dynamics" widget and sees all 4 presets and 16 sliders, working identically to the old AdvancedEditor section
  2. User adjusts a slider in any widget and the 3D preview updates in real-time (no regression from AdvancedEditor behavior)
  3. All 9 widgets (Global, Audio, Particles, Placement, Skybox, Video Skybox, Masking, Patches, Water) render their content correctly
  4. Changing a parameter in one widget does not cause other open widgets to re-render (individual selectors, not full-store subscription)
**Plans**: TBD

Plans:
- [ ] 20-01-PLAN.md -- Extract Global, Audio, Particles widget components from AdvancedEditor
- [ ] 20-02-PLAN.md -- Extract Placement, Skybox, Video Skybox widget components from AdvancedEditor
- [ ] 20-03-PLAN.md -- Extract Masking, Patches, Water widget components from AdvancedEditor
- [ ] 20-04-PLAN.md -- Wire all 9 widgets into WidgetLayer registry, verify store selector isolation

**Wave Structure:**
- Wave 1: 20-01, 20-02, 20-03 (widget extraction, parallel -- no file overlap per batch)
- Wave 2: 20-04 (integration + verification)

---

### Phase 21: Widget Toolbar + Persistence
**Goal**: User can discover, open, and close all widgets from a central toolbar, and their layout survives page refreshes
**Depends on**: Phase 20 (all widget content must exist for toolbar to toggle)
**Requirements**: WIDG-05, WIDG-06, WIDG-08
**Success Criteria** (what must be TRUE):
  1. User sees a toolbar showing all 9 available widgets with visual indicators for which are currently open
  2. User clicks a closed widget name in the toolbar and it appears on screen; clicking an open widget name closes it
  3. User arranges widgets, refreshes the page, and all widgets reappear in the same positions and sizes with the same open/closed state
**Plans**: TBD

Plans:
- [ ] 21-01-PLAN.md -- Widget toolbar component in ControlPanel with open/close toggles for all 9 widgets
- [ ] 21-02-PLAN.md -- localStorage persistence for widgetStore (positions, sizes, open state, z-order)

**Wave Structure:**
- Wave 1: 21-01, 21-02 (toolbar + persistence, parallel -- no file overlap)

---

### Phase 22: Workspace Layouts
**Goal**: User can save and restore named widget arrangements so they can switch between different editing workflows
**Depends on**: Phase 21 (persistence layer must exist; toolbar provides save/load UI entry point)
**Requirements**: WKSP-01, WKSP-02, WKSP-03, WKSP-04
**Success Criteria** (what must be TRUE):
  1. User arranges widgets for mixing, clicks "Save Workspace", types "Mixing Layout", and it persists
  2. User loads "Mixing Layout" and all widgets snap to the saved positions, sizes, and open/closed states
  3. User deletes a workspace and it no longer appears in the workspace list
  4. Workspace layouts survive browser restarts (localStorage) and are independent from visual template saves
**Plans**: TBD

Plans:
- [ ] 22-01-PLAN.md -- Workspace save/load/delete logic in widgetStore with localStorage
- [ ] 22-02-PLAN.md -- Workspace management UI (save dialog, load picker, delete confirmation)

**Wave Structure:**
- Wave 1: 22-01 (store logic)
- Wave 2: 22-02 (UI, depends on 22-01)

---

### Phase 23: Template Actions
**Goal**: User can go from browsing templates to using them in one click, without manual view switching
**Depends on**: Nothing (independent feature; uses existing templateStore and view routing)
**Requirements**: TMPL-01, TMPL-02
**Success Criteria** (what must be TRUE):
  1. User clicks "Use in Render" on a template card and the app loads that template's settings and switches to the Create/Render view
  2. User clicks "Use in Experience" on a template card and the app loads that template's settings and switches to the Experience/Preview view
**Plans**: TBD

Plans:
- [ ] 23-01-PLAN.md -- Add "Use in Render" and "Use in Experience" action buttons to TemplateCard component

**Wave Structure:**
- Wave 1: 23-01 (single plan)

---

### Phase 24: Render Target Split
**Goal**: User can independently choose where to process a render and where to save the result
**Depends on**: Nothing (independent feature; modifies existing RenderDialog/CreateOverlay)
**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04
**Success Criteria** (what must be TRUE):
  1. User sees separate dropdowns for "Process on" (cloud / local-agent) and "Save to" (local download / cloud storage / agent path) in the render dialog
  2. When user selects "agent path" as save destination, a file path input appears for specifying the target directory
  3. When user selects "cloud" as processing target, the "agent path" save option is disabled (greyed out with explanation)
  4. Selecting different processing targets does not reset the save destination choice (independent controls)
**Plans**: TBD

Plans:
- [ ] 24-01-PLAN.md -- Split render target into processing target + save destination in RenderDialog/CreateOverlay
- [ ] 24-02-PLAN.md -- Context-aware save destination options (disable agent path on cloud, file path input for agent)

**Wave Structure:**
- Wave 1: 24-01 (render target split)
- Wave 2: 24-02 (context-aware behavior, depends on 24-01)

---

### Phase 25: Mobile Fallback + Polish
**Goal**: The widget system works gracefully on small screens and closed widgets cost nothing at runtime
**Depends on**: Phase 20 (widget content must exist), Phase 21 (toolbar must exist for mobile entry)
**Requirements**: WIDG-09, WCNT-03
**Success Criteria** (what must be TRUE):
  1. User opens the Design screen on a phone and sees a scrollable sheet of parameter sections instead of floating panels
  2. User on mobile can expand/collapse individual parameter sections within the sheet
  3. On desktop, widgets that are closed contribute zero JavaScript to the bundle (verified by checking that lazy component chunks are not loaded until widget opens)
**Plans**: TBD

Plans:
- [ ] 25-01-PLAN.md -- Mobile detection + scrollable sheet fallback for widget content on small screens
- [ ] 25-02-PLAN.md -- React.lazy wrapper for widget content components, verify bundle splitting
- [ ] 25-03-PLAN.md -- Integration verification: full widget system E2E on desktop and mobile

**Wave Structure:**
- Wave 1: 25-01, 25-02 (mobile fallback + lazy loading, parallel)
- Wave 2: 25-03 (integration verification)

---

## Phase Dependencies (v3.0)

```
Phase 19 (Widget Shell + react-rnd)
    |
    v
Phase 20 (Widget Content Extraction)
    |
    v
Phase 21 (Widget Toolbar + Persistence)
    |
    +---> Phase 22 (Workspace Layouts)
    |
    +---> Phase 25 (Mobile Fallback + Polish)

Phase 23 (Template Actions) --- independent, can run anytime
Phase 24 (Render Target Split) --- independent, can run anytime
```

---

## Key Architecture Decisions (v3.0)

### react-rnd for Drag + Resize
- `react-rnd` (15KB gzipped) provides both drag and resize in a single component
- Touch support built-in for tablet users
- Bounds constraints prevent widgets from leaving viewport
- No custom pointer event handling needed

### Z-Index Strategy
- Widget panels: z-[75] to z-[85] (dynamic per focus order)
- Existing panels (ControlPanel, etc.): z-50
- Modals (RenderDialog, etc.): z-100
- Widgets never obscure modals; always float above static panels

### Widget Store (Zustand)
- Dedicated `widgetStore` separate from `visualStore` and `templateStore`
- Tracks per-widget: open/closed, position {x,y}, size {w,h}, z-index, minimized
- localStorage persistence via Zustand middleware
- Individual selectors prevent cross-widget re-renders

### Widget Content Architecture
- 9 widget components extracted from AdvancedEditor's 18 parameter groups (consolidated pairs)
- Each widget imports only its slice of `useVisualStore` via individual selectors
- `React.lazy()` wrapping ensures closed widgets cost zero bundle
- AdvancedEditor.tsx can be deleted once all 9 widgets are verified

### Workspace Layouts vs Templates
- Workspace layouts (widget positions/sizes) stored in localStorage under a separate key
- Visual templates (parameter values) stored in existing templateStore
- The two are independent: loading a template does not change widget layout, and loading a workspace does not change visual parameters

---

</details>

---

## Milestone v4.0: Cinema VFX Pipeline

**Milestone Goal:** Add Blender as a second render path controlled by Claude via MCP, producing cinema-quality fire, water, VFX, and "luminous being" transformations far beyond WebGL limits.

**Architecture:** blender-mcp (Claude-to-Blender bridge via TCP) + librosa (Python audio analysis) + keyframe_generator.py (audio JSON to Blender keyframes) + SAM 2.1 (person segmentation) + Blender Cycles (cinema-quality raytracing) + CLI-Anything (token-efficient Blender scaffolding)

**Constraint:** Existing Three.js orb system (Flame, Mist, Solar Breath) remains completely untouched. Blender is an additive second render path, not a replacement.

**Phases:** 26-33 (8 phases, 38 requirements)

**Note:** Phase 7 (v1.0 Blender VFX) is superseded by this milestone. v4.0 incorporates Phase 7's scope with updated research, refined requirements, and the blender-mcp architecture that did not exist when Phase 7 was planned.

## Phases

- [x] **Phase 26: MCP Bridge + Tool Discipline** - blender-mcp installation, async patterns for long operations, screenshot token discipline, proof-of-concept Mantaflow fire orb (completed 2026-03-20)
- [x] **Phase 27: Audio Bridge** - Browser audio analysis JSON export with 8+ bands, onset detection, envelope followers; keyframe_generator.py for Blender keyframe insertion with mapping presets (completed 2026-03-20)
- [x] **Phase 28: Fire Simulation** - Mantaflow fire with Principled Volume + Blackbody, audio-driven intensity and color temperature, Cycles cinema render with compositor bloom (completed 2026-03-20)
- [x] **Phase 29: Water + World Building** - Ocean Modifier water surface, fire-over-water scene with caustics, foam/spray particles, Poly Haven HDRIs, Sketchfab/AI asset placement (completed 2026-03-20)
- [x] **Phase 30: VR Cinema + Compositing** - 8K stereoscopic equirectangular Blender output, VR metadata injection, multi-layer compositor, depth maps from video, depth-aware compositing on real 360 footage (completed 2026-03-20)
- [x] **Phase 31: EDM Light Show** - Volumetric laser beams with beat-synced scanning, LED grid with per-column frequency mapping, dynamic range principle (10% breakdown, 100% drop) (completed 2026-03-20)
- [x] **Phase 32: Luminous Being** - SAM 2.1 person segmentation, volumetric body fill, particle emission from silhouette, Mantaflow fire wisps from body mesh, corona edge glow, full audio-reactive per-layer mapping (completed 2026-03-20)
- [x] **Phase 33: Integration + Visual Intelligence** - CLI-Anything custom harness for EFS workflows, batch render overnight queuing, end-to-end pipeline demo, Chrome MCP visual research of reference creators with documented principles applied to templates (completed 2026-03-20)

## Phase Details

### Phase 26: MCP Bridge + Tool Discipline
**Goal**: Claude can reliably control Blender via MCP without session-killing timeouts, token hemorrhage, or disk explosions
**Depends on**: Nothing (v4.0 foundational phase)
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. Claude sends a `execute_blender_code` command and a cube appears in the Blender viewport (basic MCP round-trip works)
  2. A Mantaflow fire simulation bakes to completion without hitting the 180-second MCP timeout (async timer pattern validated)
  3. A Cycles render of the proof-of-concept fire orb completes and saves a PNG to disk without blocking the MCP connection
  4. A full Claude-controlled session (create scene, bake sim, render) runs without exceeding $2 in screenshot tokens (discipline validated)
**Plans:** 3/3 plans complete

Plans:
- [ ] 26-01-PLAN.md — Directory structure, scene utilities, connection test, setup docs (TOOL-01)
- [ ] 26-02-PLAN.md — Async bake and render scripts for 180s timeout avoidance (TOOL-02)
- [ ] 26-03-PLAN.md — Proof-of-concept Mantaflow fire orb scene (TOOL-03)

**Wave Structure:**
- Wave 1: 26-01, 26-02 (directory setup + async scripts, parallel)
- Wave 2: 26-03 (fire orb POC, depends on 26-01 + 26-02)

---

### Phase 27: Audio Bridge
**Goal**: Audio analysis flows from the browser to Blender keyframes as a validated, reusable pipeline
**Depends on**: Phase 26 (MCP bridge must be stable for keyframe insertion testing)
**Requirements**: AUD4-01, AUD4-02, AUD4-03, AUD4-04, AUD4-05
**Success Criteria** (what must be TRUE):
  1. User clicks "Export Audio Analysis" on the Design page and downloads a JSON file containing 8+ frequency bands with per-frame amplitude data
  2. The exported JSON includes onset detection timestamps and envelope follower curves for each band
  3. Running `keyframe_generator.py` against the exported JSON inserts keyframes into an open Blender scene that visibly animate a test object (e.g., cube scale pulsing to bass)
  4. Switching the mapping preset from "Meditation" to "EDM" produces noticeably different animation behavior from the same audio file (slower/smoother vs. aggressive/punchy)
  5. At least 8 audio features drive 8 independent visual parameters simultaneously in a test scene (emergent complexity, not single-parameter mapping)
**Plans:** 2/2 plans complete

Plans:
- [ ] 27-01-PLAN.md — 37-feature audio analysis engine + JSON export from browser
- [ ] 27-02-PLAN.md — Keyframe generator + 3 mapping presets (Meditation/EDM/Cinematic)

**Wave Structure:**
- Wave 1: 27-01 (browser-side analysis + export)
- Wave 2: 27-02 (Python keyframe generator + presets, depends on 27-01 JSON schema)

---

### Phase 28: Fire Simulation
**Goal**: Mantaflow fire renders at cinema quality that visibly exceeds the Three.js Solar Breath mode
**Depends on**: Phase 27 (keyframe_generator.py must exist for audio-driven fire)
**Requirements**: FIRE-01, FIRE-02, FIRE-03, FIRE-04, FIRE-05
**Success Criteria** (what must be TRUE):
  1. A Mantaflow fire simulation shows multi-scale detail: large billowing flames, mid-scale turbulence, and fine wisps at the edges (not a uniform blob)
  2. Playing back the rendered fire video with audio shows fire intensity rising and falling in sync with bass hits
  3. Fire color shifts from deep red/orange during quiet passages to bright yellow-white during high-energy sections (spectral centroid driving Blackbody temperature)
  4. The Cycles-rendered output with compositor bloom and motion blur looks like a cinema VFX shot, not a game engine effect
  5. A side-by-side screenshot of Blender fire vs. Three.js Solar Breath shows the Blender output is in a different quality class (justifying the second render path)
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 28-01-PLAN.md  --  Multi-scale fire scene template with quality presets (Draft/Preview/Production/Ultra)
- [ ] 28-02-PLAN.md  --  Compositor effects (bloom, color grading) + audio-reactive fire mapping preset

**Wave Structure:**
- Wave 1: 28-01 (scene template + quality presets)
- Wave 2: 28-02 (compositor + audio mapping + human verify)

---

### Phase 29: Water + World Building
**Goal**: Photorealistic water surfaces and rich environmental context elevate scenes beyond bare-background VFX demos
**Depends on**: Phase 28 (fire template needed for fire-over-water combo scene)
**Requirements**: WATR-01, WATR-02, WATR-03, WRLD-01, WRLD-02
**Success Criteria** (what must be TRUE):
  1. A water surface responds to audio treble with visible ripple and wave activity (calm during low passages, choppy during high-frequency content)
  2. The fire-over-water scene renders with the fire's light visibly reflected and refracted in the water surface (caustic reflections)
  3. Water includes foam accumulation on wave crests and spray particles that sell physical realism
  4. A scene rendered with a Poly Haven HDRI shows photorealistic environment lighting (sky, ground reflections, ambient light) instead of a black void
  5. A 3D asset from Sketchfab or AI generation is placed in a scene and renders correctly with proper lighting and shadows
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 29-01-PLAN.md -- Water template (Ocean Modifier + foam particles + glass material + audio preset)
- [ ] 29-02-PLAN.md -- World template (HDRI environment setup + 3D asset placement utilities)
- [ ] 29-03-PLAN.md -- Fire-over-water combo scene (fire + water + world + caustics + merged audio preset)

**Wave Structure:**
- Wave 1: 29-01, 29-02 (water template + world template, parallel)
- Wave 2: 29-03 (fire-over-water combo, depends on 29-01 + 29-02)

---

### Phase 30: VR Cinema + Compositing
**Goal**: 8K stereoscopic VR output from Blender plays correctly in VR headsets, and the multi-layer compositor enables depth-aware effects on real footage
**Depends on**: Phase 28 (fire template validates Cycles rendering pipeline used by VR output)
**Requirements**: VR-01, VR-02, VR-03, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. An 8K stereoscopic equirectangular render from Blender's panoramic camera opens in a VR headset and displays correct 3D depth (left/right eye images are properly separated)
  2. The VR output uploaded to YouTube appears in VR mode (not flat) without any manual metadata editing
  3. A user wearing a VR headset watches the fire simulation in VR for 60 seconds without discomfort (safe IPD, no nausea-inducing camera motion)
  4. The multi-layer compositor combines fire + water + effects as separate render passes, each independently controllable
  5. Depth maps extracted from a real 360 video allow virtual fire or effects to appear behind foreground objects in the footage (depth-aware occlusion works)
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 30-01-PLAN.md — VR camera template (8K stereo equirectangular + metadata injection)
- [ ] 30-02-PLAN.md — Multi-layer compositor (View Layer isolation + Alpha Over compositing)
- [ ] 30-03-PLAN.md — Depth-aware compositing (depth maps + real footage overlay)

**Wave Structure:**
- Wave 1: 30-01 (VR camera), 30-02 (multi-layer compositor) — parallel
- Wave 2: 30-03 (depth compositing, depends on 30-02)

---

### Phase 31: EDM Light Show
**Goal**: Concert-quality laser and LED effects that sync to EDM beats and demonstrate the darkness/contrast principle
**Depends on**: Phase 27 (keyframe_generator.py needed for beat-synced animation)
**Requirements**: EDM-01, EDM-02, EDM-03
**Success Criteria** (what must be TRUE):
  1. Volumetric laser beams scan across the scene in sync with beat onsets, with sweep speed and direction changing on detected beats
  2. An LED grid displays per-column frequency response where each column's brightness maps to a different frequency band (bass on left, treble on right, or similar mapping)
  3. During a breakdown section of an EDM track, overall scene emission drops to roughly 10% intensity, then snaps back to 100% on the drop (dynamic range principle demonstrated)
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 31-01-PLAN.md -- EDM light show template (lasers, LED grid, concert scene)
- [ ] 31-02-PLAN.md -- Audio preset and keyframe wiring (sweep, frequency mapping, dynamic range)

**Wave Structure:**
- Wave 1: 31-01 (scene template)
- Wave 2: 31-02 (audio wiring, depends on 31-01)

---

### Phase 32: Luminous Being
**Goal**: A person in video is transformed into a glowing being of light with audio-reactive fire, particles, and corona -- the crown jewel effect
**Depends on**: Phase 27 (keyframe system), Phase 28 (fire template for wisps), Phase 30 (compositor infrastructure)
**Requirements**: LUMI-01, LUMI-02, LUMI-03, LUMI-04, LUMI-05, LUMI-06
**Success Criteria** (what must be TRUE):
  1. A person is cleanly segmented from video with consistent masks across 100+ consecutive frames (no flickering or lost limbs)
  2. The person silhouette is filled with an audio-reactive volumetric glow that breathes with the music (brighter on beats, dimmer in quiet passages)
  3. Particles emit from the body silhouette in patterns matching the Three.js orb modes (Flame upward drift, Mist soft dispersion, Solar Breath radial pulse)
  4. Mantaflow fire wisps emanate from the body mesh, creating the appearance of a person made of flame
  5. A corona edge glow surrounds the body that intensifies with treble frequency content
  6. The complete Luminous Being effect plays back with audio and all layers (volumetric fill, particles, fire wisps, corona) respond to different frequency bands simultaneously
**Plans**: 3 plans

Plans:
- [ ] 32-01-PLAN.md -- SAM 2.1 segmentation + mask-to-mesh pipeline
- [ ] 32-02-PLAN.md -- Luminous being scene template (volumetric fill, particles, fire wisps, corona)
- [ ] 32-03-PLAN.md -- Audio mapping preset with per-layer frequency wiring

---

### Phase 33: Integration + Visual Intelligence
**Goal**: The entire cinema pipeline is token-efficient for daily use, can batch-render overnight, and is informed by decoded perceptual principles from reference creators
**Depends on**: Phase 28 (fire template), Phase 31 (EDM template), Phase 32 (luminous being) -- all templates must exist for CLI wrapping and batch queuing
**Requirements**: INTG-01, INTG-02, INTG-03, VRES-01, VRES-02
**Success Criteria** (what must be TRUE):
  1. A CLI-Anything custom harness wraps 5+ validated EFS-specific Blender workflows (e.g., "create fire scene", "bake simulation", "render VR output") as structured commands that Claude can call without writing raw Python
  2. A batch render script queues 3+ scenes and renders them sequentially overnight, with completed renders saved to disk and errors logged
  3. The full pipeline is demonstrated end-to-end: audio file goes in, cinema-quality rendered video comes out, with no manual intermediate steps beyond Claude orchestration
  4. Chrome MCP analysis of UON Visuals (or equivalent reference creator) produces a documented set of perceptual principles with specific parameter recommendations applied to at least one fire/water/EDM template
**Plans**: 3 plans in 1 wave

Plans:
- [ ] 33-01-PLAN.md — CLI harness wrapping all EFS Blender workflows (13 commands)
- [ ] 33-02-PLAN.md — Batch render queue + end-to-end pipeline orchestrator
- [ ] 33-03-PLAN.md — Visual intelligence principles with concrete parameter values

---

## Progress

**Execution Order:** 26 -> 27 -> 28 -> 29 (sequential core) | 30, 31 (parallel after 27/28) | 32 (after 27+28+30) | 3/3 | Complete    | 2026-03-20 | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 8/8 | Complete | 2026-01-28 |
| 2. Templates | v1.0 | 6/6 | Complete | 2026-01-29 |
| 3. Rendering | v1.0 | 10/12 | Nearly Complete | - |
| 4. Automation | v1.0 | 9/14 | Mostly Complete | - |
| 5. n8n Integration | v1.0 | 4/8 | Half Complete | - |
| 6. YouTube + Multi-Platform | v1.0 | 0/6 | Planned | - |
| 7. Blender VFX | v1.0 | 0/12 | Superseded by v4.0 | - |
| 12. Cloud Storage Adapter | v2.0 | 3/3 | Complete | 2026-02-21 |
| 13. Job State + Worker Infra | v2.0 | 3/3 | Complete | 2026-02-21 |
| 14. API + Worker Processing | v2.0 | 3/3 | Complete | 2026-02-21 |
| 15. Modal Render Dispatch | v2.0 | 2/2 | Complete | 2026-02-21 |
| 16. Production Deploy + CI/CD | v2.0 | 3/3 | Complete | 2026-02-21 |
| 17. Integration Wiring Fixes | v2.0 | 2/2 | Complete | 2026-02-22 |
| 18. API Completeness + Timeout Accuracy | v2.0 | 2/2 | Complete | 2026-02-22 |
| 19. Widget Shell + react-rnd | v3.0 | 3/3 | Complete | 2026-03-05 |
| 20. Widget Content Extraction | v3.0 | 0/4 | Not started | - |
| 21. Widget Toolbar + Persistence | v3.0 | 0/2 | Not started | - |
| 22. Workspace Layouts | v3.0 | 0/2 | Not started | - |
| 23. Template Actions | v3.0 | 0/1 | Not started | - |
| 24. Render Target Split | v3.0 | 0/2 | Not started | - |
| 25. Mobile Fallback + Polish | v3.0 | 0/3 | Not started | - |
| 26. MCP Bridge + Tool Discipline | 3/3 | Complete    | 2026-03-20 | - |
| 27. Audio Bridge | 2/2 | Complete    | 2026-03-20 | - |
| 28. Fire Simulation | 2/2 | Complete    | 2026-03-20 | - |
| 29. Water + World Building | 3/3 | Complete    | 2026-03-20 | - |
| 30. VR Cinema + Compositing | 3/3 | Complete    | 2026-03-20 | - |
| 31. EDM Light Show | 2/2 | Complete    | 2026-03-20 | - |
| 32. Luminous Being | v4.0 | 0/3 | Planned | - |
| 33. Integration + Visual Intelligence | 3/3 | Complete    | 2026-03-20 | - |

---

## Phase Dependencies (v4.0)

```
Phase 26 (MCP Bridge + Tool Discipline)
    |
    v
Phase 27 (Audio Bridge)
    |
    +---> Phase 28 (Fire Simulation)
    |         |
    |         +---> Phase 29 (Water + World Building)
    |         |
    |         +---> Phase 30 (VR Cinema + Compositing) *
    |         |
    |         +---> Phase 32 (Luminous Being) **
    |
    +---> Phase 31 (EDM Light Show) *

* Phase 30 and 31 can run in parallel (independent tracks after Phase 27/28)
** Phase 32 depends on Phase 27 + Phase 28 + Phase 30

Phase 33 (Integration + Visual Intelligence) --- after all capability phases complete
```

---

## Key Architecture Decisions (v4.0)

### Two Render Paths (Preview + Cinema)
- **Preview:** Three.js (browser) -- real-time, good quality, live tweaking. Completely untouched.
- **Cinema:** Blender/Cycles (via MCP) -- minutes-hours, photorealistic, final output. New additive path.
- Connected by a single JSON file (audio analysis export). No other integration points.

### blender-mcp as Claude-to-Blender Bridge
- `execute_blender_code` provides unlimited Python access inside Blender
- 180-second timeout per MCP call -- all long operations (bakes, renders) must use async patterns
- One client at a time (Claude Code). No concurrent sessions.
- `get_scene_info` and `get_object_info` (text) for primary feedback; screenshots only at validation checkpoints

### Audio JSON Bridge (Single Source of Truth)
- Browser `PreAnalyzer.ts` extended with onset detection, spectral centroid, spectral flux, envelope followers
- Exported as `audio-analysis.json` -- the one artifact shared between Three.js and Blender worlds
- `keyframe_generator.py` reads this JSON and drives Blender keyframes via `bpy.keyframe_insert()`
- Never re-analyze audio independently in Python (prevents FFT mismatch between the two paths)

### Async Patterns for Long Operations
- Mantaflow bakes: `bpy.app.timers.register()` for fire-and-forget
- Cycles renders: `bpy.ops.render.render('INVOKE_DEFAULT')` (non-blocking)
- Poll output directory for completed frames
- Established in Phase 26 before any simulation work

### Scene Template System
- Pre-configured `.blend` files: fire, water, fire-over-water, EDM, luminous-being, compositor
- Claude opens template and customizes for the specific audio track
- Templates include Mantaflow domains, Cycles settings, compositor node trees

### Mantaflow Keyframing Workaround
- Domain parameter keyframing is broken (Blender T72812)
- Keyframe Flow object parameters instead: `fuel_amount`, `temperature`, emission strength
- This constraint is built into `keyframe_generator.py` from the start

### Resolution Ladder
- 64: Prototyping (seconds to bake)
- 128: Test renders (minutes)
- 256: Production (tens of minutes)
- 512+: Only if hardware allows (calibrated in Phase 26)

---

*Last updated: 2026-03-19 (v4.0 Cinema VFX Pipeline roadmap added)*
