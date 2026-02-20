# Ethereal Flame Studio

## What This Is

An audio-reactive video generation engine that transforms audio files (meditation, music) into high-fidelity 360° VR and flat social media videos. Users upload audio, select a visual template, and the system renders publication-ready videos with auto-generated descriptions, then hands off to n8n for automated social media posting. Now moving to a full cloud production stack so the entire workflow runs on the web.

## Core Value

**Phone to published video without touching a computer.** A creator should be able to upload audio from their phone, pick a preset, and have a finished video posted to YouTube/social media — fully automated.

## Current Milestone: v2.0 Cloud Production

**Goal:** Move the entire app to production cloud infrastructure — no local machine dependencies for end users.

**Target features:**
- Storage adapter abstraction (local dev + Cloudflare R2 production)
- All audio assets and rendered videos stored in R2
- All job/asset state in Turso (cloud SQLite, zero migration from existing better-sqlite3)
- CPU worker service on Render.com for audio prep (ffmpeg, yt-dlp)
- GPU render dispatch to Modal with R2-based input/output
- All API routes async: enqueue work, return jobId, poll for status
- Environment-driven config switching local vs production
- Secure webhook callbacks for Modal render completion

**Architecture (approved):**
- Vercel for web/API (existing deployment)
- Render.com worker ($7/mo) for CPU-intensive audio jobs
- Turso for all state (existing, SQLite-compatible)
- Cloudflare R2 for object storage (free egress)
- Modal for GPU rendering (existing integration)
- No Redis — Turso polling for job dispatch

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

- [ ] Cloud storage adapter (local + R2) for all audio/video assets
- [ ] Turso-backed job and asset state (replace local SQLite)
- [ ] Render.com CPU worker for audio prep processing
- [ ] R2-integrated render dispatch to Modal GPU
- [ ] Async API routes with consistent jobId polling
- [ ] Environment-driven local/production configuration
- [ ] Secure Modal webhook callbacks
- [ ] Production deployment on Vercel + Render + R2

### Out of Scope

- Real-time live streaming — batch rendering only
- Mobile native app — web-based, mobile-friendly
- Multi-user accounts — single creator workflow initially
- Redis/BullMQ for audio prep — Turso polling is sufficient at current volume
- Full Postgres migration — Turso is SQLite-compatible, no query rewrites needed
- Render.com web service — Vercel handles web/API, Render only for worker

## Context

**v1.0 Complete:** Phases 1-5 shipped the full local pipeline (phone → render → YouTube). The visual engine, template system, rendering pipeline, batch automation, and n8n workflows all work locally.

**Audio Prep MVP:** Feature branch `feature/audio-prep-mvp` has ingest (YouTube, URL, file upload), edit (trim/split/join/fade/volume/normalize), preview, and save — all working locally with SQLite + filesystem.

**Current infrastructure:**
- Vercel deployment for web UI
- Local SQLite for audio-prep job tracking (better-sqlite3)
- Local filesystem for audio assets (`./audio-assets/{assetId}/`)
- Modal partially integrated (gated behind `MODAL_ENDPOINT_URL`)
- Turso already set up for Jarvis memory (libsql)
- Drizzle ORM already in use

**Cost target:** $7-10/mo fixed (Render worker only) + variable R2/Modal usage.

## Constraints

- **Tech Stack**: Next.js + Three.js — consistent with existing code
- **Budget**: Minimize fixed monthly cost (target $7-10/mo base)
- **Zero breaking changes**: Local dev workflow must continue to work
- **SQLite compatibility**: Turso uses libsql (SQLite wire-compatible)
- **No Redis for audio-prep**: Polling pattern is sufficient at launch volume
- **Resolution**: Must support up to 8K for VR master output

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Three.js stack | Same as reference code, web-accessible, proven for 3D | ✓ Good |
| Two visual modes (Mist + Flame) | Different aesthetic needs for different content | ✓ Good |
| Vercel for web + Render for worker | Each platform's strength, no hosting migration | — Pending |
| Turso over Postgres | SQLite-compatible (zero migration), already set up, serverless | — Pending |
| R2 over Vercel Blob | Free egress, cheaper storage, S3-compatible | — Pending |
| Turso polling over Redis queue | Simpler, cheaper ($0 vs $10/mo), sufficient at launch volume | — Pending |
| Storage adapter pattern | Keep local dev working, swap to R2 in production | — Pending |

---
*Last updated: 2026-02-20 after v2.0 milestone start*
