# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Phone to published video without touching a computer
**Current focus:** Milestone v2.0 Cloud Production -- Phase 14: API + Worker Processing Pipeline

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/MILESTONES.md` - Milestone history
- `.planning/REQUIREMENTS.md` - v2.0 requirements (24 mapped)
- `.planning/ROADMAP.md` - Phase structure (v1.0 phases 1-7, v2.0 phases 12-16)

---

## Current Position

Phase: 14 of 16 (API + Worker Processing Pipeline)
Plan: 1 of 3 in current phase
Status: In Progress
Last activity: 2026-02-21 -- Completed 14-01 (API routes to async JobStore dispatch)

Progress: [######..............] 33% (v2.0 phase 14: 1/3 plans complete)

---

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 35+
- Phases completed: 5 (core pipeline)
- Audio Prep MVP shipped on feature branch

**v2.0:**
- Plans completed: 7
- Phases remaining: 3 (14-16)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 12    | 01   | 7min     | 2     | 6     |
| 12    | 02   | 12min    | 2     | 10    |
| 12    | 03   | 6min     | 3     | 5     |
| 13    | 01   | 5min     | 2     | 6     |
| 13    | 02   | 3min     | 2     | 2     |
| 13    | 03   | 4min     | 2     | 6     |
| 14    | 01   | 4min     | 2     | 5     |

---

## Accumulated Context

### Key Decisions

- Vercel + Render worker (not all-on-Render) -- keep existing Vercel deployment
- Turso for all state (not Postgres) -- SQLite-compatible, zero migration
- Turso polling (not Redis/BullMQ) -- simpler, $0 cost, sufficient at launch
- Cloudflare R2 for storage -- free egress, S3-compatible
- Storage adapter pattern -- local dev continues unchanged
- Dynamic require() for conditional SDK loading -- keeps @aws-sdk out of local dev bundle
- Singleton factory with resetStorageAdapter() for test isolation
- R2 presigned URLs: 7-day download, 1-hour upload defaults
- XHR for upload progress (fetch lacks upload progress events)
- JSON response for download route in R2 mode (not redirect, avoids CORS)
- Backward-compatible fallback to FormData ingest in AudioPrepEditor
- resolveAssetPath uses adapter's resolveKey() for local, temp file download for cloud
- Stream route redirects to signed URL instead of proxying content (CDN offload for R2)
- Temp file pattern for ffmpeg: download from storage -> process -> upload result -> cleanup
- Render output upload to storage async after process completion
- JobStore adapter pattern mirroring StorageAdapter (interface + Local/Turso + singleton factory)
- Raw SQL for TursoJobStore (not Drizzle ORM query builder) for simplicity
- Atomic job claim: RETURNING for SQLite, transaction for Turso
- JobPollResponse exported from poll route for frontend type reuse
- Cancel endpoint is state mutation only -- worker handles SIGTERM (separation of concerns)
- skipLibCheck in worker tsconfig to avoid drizzle-orm node_modules type errors
- Placeholder pipelines for Phase 13 worker; actual dispatch wired in Phase 14
- Single default timeout for reaper (10 min); per-type timeouts deferred to Phase 14
- childRef pattern in processJob for Phase 14 pipeline child process exposure
- File uploads buffered to storage before job creation so worker can access via storage key
- downloadUrl generation in poll endpoint is non-fatal -- still returns result if signing fails
- Preview audio route returns JSON with signedUrl for R2 (consistent with download route pattern)

### Technical Context

- StorageAdapter interface implemented at `src/lib/storage/` with Local + R2 backends
- Upload/download API routes at `/api/storage/upload` and `/api/storage/download`
- useStorageUpload hook at `src/lib/hooks/useStorageUpload.ts` for progress-tracked uploads
- AudioAssetService fully migrated to StorageAdapter (plan 12-02 complete) -- all API routes use adapter-backed service
- JobStore adapter at `src/lib/jobs/` with Local (better-sqlite3) + Turso (@libsql/client) backends
- Drizzle schema at `src/lib/db/job-schema.ts` with stage, retryCount, and 3 indexes
- Job poll endpoint at `/api/audio/jobs/[jobId]` returns stage, progress, queue position, result/error
- Job cancel endpoint at `/api/audio/jobs/[jobId]/cancel` transitions non-terminal jobs to cancelled (409 for terminal)
- Standalone worker at `worker/` with poll loop, heartbeat, graceful shutdown, cancellation detection, and reaper
- Worker Dockerfile includes ffmpeg + yt-dlp for Render.com deployment
- Original JobManager at `src/lib/audio-prep/JobManager.ts` still exists -- API routes now use JobStore, JobManager deprecated
- All audio API POST routes (ingest, preview, save) dispatch to JobStore and return immediately (no inline processing)
- Poll endpoint at `/api/audio/jobs/[jobId]` enriches completed jobs with signed downloadUrl from storage adapter
- Preview audio route at `/api/audio/edit/preview/[jobId]/audio` serves from storage adapter (not filesystem)
- Render pipeline partially wired to Modal (gated behind env var)
- Drizzle ORM already in project for Turso/libsql
- Audio prep MVP on `feature/audio-prep-mvp` branch

### Blockers

(None identified)

---

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 14-01-PLAN.md (API routes to async JobStore dispatch)
Resume file: .planning/phases/14-api-worker-processing-pipeline/14-01-SUMMARY.md

---

*Last updated: 2026-02-21 -- Phase 14 in progress (1/3 plans done)*
