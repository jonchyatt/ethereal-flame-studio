# Roadmap: Ethereal Flame Studio

**Created:** 2026-01-26
**Updated:** 2026-02-20
**Depth:** Comprehensive
**Coverage:** 57 v1.0 requirements (Phases 1-7) + 24 v2.0 requirements (Phases 12-16)

---

## Milestones

- ✅ **v1.0 Local Production Pipeline** - Phases 1-7 (shipped 2026-02-03, Phase 7 research only)
- 🚧 **v2.0 Cloud Production** - Phases 12-16 (in progress)

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

**Status:** NOT STARTED

---

</details>

---

## Milestone v2.0: Cloud Production

**Milestone Goal:** Move the entire pipeline to production cloud infrastructure so the app works from any device with no local machine dependencies.

**Architecture:** Vercel (web/API) + Render.com (CPU worker) + Turso (state) + Cloudflare R2 (storage) + Modal (GPU render)

**Phases:** 12-16 (5 phases, 24 requirements)

## Phases

- [x] **Phase 12: Cloud Storage Adapter** - Unified storage interface with R2 for production and local filesystem for development (completed 2026-02-21)
- [x] **Phase 13: Job State + Worker Infrastructure** - Turso-backed job queue with Render.com CPU worker service (completed 2026-02-21)
- [x] **Phase 14: API + Worker Processing Pipeline** - Async API routes wired to worker for ingest, edit, and save operations (completed 2026-02-21)
- [ ] **Phase 15: Modal Render Dispatch** - GPU render jobs dispatched to Modal via R2, with webhook completion
- [ ] **Phase 16: Production Deploy + CI/CD** - Environment config, deploy checklist, and automated deployment pipeline

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
- [ ] 12-01-PLAN.md -- StorageAdapter interface + LocalStorageAdapter + R2StorageAdapter implementations
- [ ] 12-02-PLAN.md -- Refactor AudioAssetService and API routes to use StorageAdapter
- [ ] 12-03-PLAN.md -- Presigned upload/download API routes and R2 CORS configuration

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
- [ ] 13-01-PLAN.md -- Drizzle schema + JobStore interface + LocalJobStore + TursoJobStore adapters
- [ ] 13-02-PLAN.md -- Job poll and cancel API endpoints
- [ ] 13-03-PLAN.md -- Render.com worker entry point + heartbeat/reaper + Dockerfile

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
- [ ] 14-01-PLAN.md -- Refactor API routes to async job dispatch via JobStore, enhance poll with download URL
- [ ] 14-02-PLAN.md -- Wire worker processing pipelines (ingest, preview, save) with storage adapter I/O
- [ ] 14-03-PLAN.md -- Webhook endpoint with INTERNAL_WEBHOOK_SECRET validation, streaming endpoint hardening

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
- [ ] 15-01-PLAN.md -- Worker render pipeline: add render job type, refactor API route to JobStore dispatch, create worker render pipeline that uploads audio to R2 and dispatches to Modal
- [ ] 15-02-PLAN.md -- Modal entry point R2 I/O: download audio from signed URL, upload rendered video to R2, call webhook with video key, enhance poll endpoint for render download URL

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
**Plans**: TBD

---

## Progress

**Execution Order:** 12 -> 13 -> 14 -> 15 -> 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 8/8 | Complete | 2026-01-28 |
| 2. Templates | v1.0 | 6/6 | Complete | 2026-01-29 |
| 3. Rendering | v1.0 | 10/12 | Nearly Complete | - |
| 4. Automation | v1.0 | 9/14 | Mostly Complete | - |
| 5. n8n Integration | v1.0 | 4/8 | Half Complete | - |
| 6. YouTube + Multi-Platform | v1.0 | 0/6 | Planned | - |
| 7. Blender VFX | v1.0 | 0/12 | Not Started | - |
| 12. Cloud Storage Adapter | 3/3 | Complete    | 2026-02-21 | - |
| 13. Job State + Worker Infra | 3/3 | Complete    | 2026-02-21 | - |
| 14. API + Worker Processing | 3/3 | Complete    | 2026-02-21 | - |
| 15. Modal Render Dispatch | v2.0 | 0/2 | Planned | - |
| 16. Production Deploy + CI/CD | v2.0 | 0/? | Not started | - |

---

## Phase Dependencies (v2.0)

```
Phase 12 (Cloud Storage Adapter)
    |
    v
Phase 13 (Job State + Worker Infra)
    |
    v
Phase 14 (API + Worker Processing)
    |
    v
Phase 15 (Modal Render Dispatch)
    |
    v
Phase 16 (Production Deploy + CI/CD)
```

---

## Key Architecture Decisions (v2.0)

### Storage Adapter Pattern
- `StorageAdapter` interface with `LocalStorageAdapter` and `R2StorageAdapter` implementations
- Environment variable switches between them (no code changes)
- R2 uses S3-compatible SDK (@aws-sdk/client-s3)
- Signed URLs for all downloads (no public bucket)

### Turso Job Queue (No Redis)
- Turso replaces local better-sqlite3 for all job/asset state
- Worker polls Turso every 3-5 seconds for pending jobs
- libsql client works identically to better-sqlite3 queries
- Drizzle ORM already in project, reuse for schema

### Render.com CPU Worker
- Background worker ($7/mo) with Node.js + ffmpeg + yt-dlp
- No web service on Render (Vercel handles all HTTP)
- Worker pulls jobs from Turso, not pushed via HTTP
- Health monitored via Turso heartbeat row

### Modal GPU Dispatch via R2
- Worker uploads audio to R2, passes signed URL to Modal
- Modal writes rendered video to R2, calls webhook with key
- Webhook validates INTERNAL_WEBHOOK_SECRET before processing
- Decoupled: worker and Modal never talk directly

---

*Last updated: 2026-02-20 (v2.0 Cloud Production roadmap added)*
