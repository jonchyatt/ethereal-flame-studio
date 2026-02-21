# Requirements: Ethereal Flame Studio

**Defined:** 2026-01-26 (v1.0), Updated: 2026-02-20 (v2.0)
**Core Value:** Phone to published video without touching a computer

## v1.0 Requirements (Validated)

All v1.0 requirements shipped in Phases 1-5. See MILESTONES.md for details.

- ✓ VIS-01 through VIS-12: Visual engine (Phase 1)
- ✓ TPL-01 through TPL-06: Template system (Phase 2)
- ✓ AUD-01 through AUD-05: Audio processing (Phases 1, 3, 4)
- ✓ RND-01 through RND-08: Rendering pipeline (Phase 3)
- ✓ AUT-01 through AUT-06: Automation (Phases 4, 5)
- ✓ INF-01 through INF-03: Infrastructure (Phases 1, 4, 5)

## v2.0 Requirements

Requirements for cloud production deployment. Each maps to roadmap phases 12-16.

### Storage

- [x] **STOR-01**: User can upload/download audio assets via cloud storage (R2) in production and local filesystem in development, using a unified adapter interface
- [x] **STOR-02**: Audio assets (originals, metadata, peaks, previews, prepared audio) are persisted in R2 and survive worker restarts
- [x] **STOR-03**: Rendered videos are uploaded to R2 after Modal GPU completion and accessible via download
- [x] **STOR-04**: User can download assets and videos via time-limited signed URLs served through Cloudflare CDN

### Jobs

- [x] **JOB-01**: All job and asset metadata is persisted in Turso cloud database (replacing local better-sqlite3)
- [x] **JOB-02**: CPU worker polls Turso for pending jobs at 3-5 second intervals
- [x] **JOB-03**: User can see job progress (percentage, stage) by polling the API
- [x] **JOB-04**: User can cancel a running job, and the worker stops processing within one poll cycle
- [x] **JOB-05**: Jobs stuck in "processing" for longer than a configurable timeout are automatically marked failed

### Workers

- [x] **WORK-01**: A Render.com background worker runs Node.js with ffmpeg and yt-dlp for CPU-intensive audio jobs
- [x] **WORK-02**: Worker can ingest audio from YouTube URLs, direct URLs, and file uploads (via R2 presigned upload)
- [x] **WORK-03**: Worker can execute audio edit previews and save operations using the existing recipe/filter_complex pipeline
- [ ] **WORK-04**: Worker dispatches GPU render jobs to Modal by uploading audio to R2 and passing signed URL
- [ ] **WORK-05**: Modal calls a secure webhook on render completion with the R2 key of the output video

### API

- [x] **API-01**: All ingest/edit/save/render API routes return a jobId immediately without blocking
- [x] **API-02**: Poll endpoint returns current job status, progress percentage, and result (including R2 download URL on completion)
- [x] **API-03**: Asset streaming endpoint serves audio from R2 in production and local filesystem in development
- [x] **API-04**: Webhook endpoint validates INTERNAL_WEBHOOK_SECRET header before processing callbacks

### Config & Deploy

- [ ] **DEPLOY-01**: Application switches between local and production mode based on environment variables (no code changes)
- [ ] **DEPLOY-02**: .env.example documents all required production environment variables
- [ ] **DEPLOY-03**: Deploy checklist (docs/DEPLOY_PROD_CHECKLIST.md) covers provisioning R2, Turso, Render, Modal, and Vercel
- [ ] **DEPLOY-04**: GitHub Actions workflow auto-deploys web to Vercel and worker to Render on push

### Security

- [x] **SEC-01**: Modal webhook callback requires valid INTERNAL_WEBHOOK_SECRET in request header
- [x] **SEC-02**: Cloud ingest path enforces file size (100MB) and duration (30min) limits

## v2.1 Requirements (Deferred)

- **SEC-03**: SSRF protection on URL ingest (block private IPs)
- **SEC-04**: TTL cleanup job for R2 assets older than configurable threshold
- **SEC-05**: Per-user storage quota enforcement
- **MON-01**: Error tracking via Sentry
- **MON-02**: Uptime monitoring and alerting

## Out of Scope

| Feature | Reason |
|---------|--------|
| Redis/BullMQ for audio-prep queue | Turso polling sufficient at current volume |
| Postgres migration | Turso is SQLite-compatible, no rewrites needed |
| Multi-user auth system | Single creator workflow for v2.0 |
| Render.com web service | Vercel handles web/API natively |
| SSRF protection | Single-user, low risk -- deferred to v2.1 |
| TTL asset cleanup | Manual cleanup sufficient at launch -- deferred to v2.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | Phase 12 | Complete |
| STOR-02 | Phase 12 | Complete |
| STOR-03 | Phase 12 | Complete |
| STOR-04 | Phase 12 | Complete |
| JOB-01 | Phase 13 | Complete |
| JOB-02 | Phase 13 | Complete |
| JOB-03 | Phase 13 | Complete |
| JOB-04 | Phase 13 | Complete |
| JOB-05 | Phase 13 | Complete |
| WORK-01 | Phase 13 | Complete |
| WORK-02 | Phase 14 | Complete |
| WORK-03 | Phase 14 | Complete |
| WORK-04 | Phase 15 | Pending |
| WORK-05 | Phase 15 | Pending |
| API-01 | Phase 14 | Complete |
| API-02 | Phase 14 | Complete |
| API-03 | Phase 14 | Complete |
| API-04 | Phase 14 | Complete |
| DEPLOY-01 | Phase 16 | Pending |
| DEPLOY-02 | Phase 16 | Pending |
| DEPLOY-03 | Phase 16 | Pending |
| DEPLOY-04 | Phase 16 | Pending |
| SEC-01 | Phase 14 | Complete |
| SEC-02 | Phase 14 | Complete |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 -- traceability updated with phase assignments*
