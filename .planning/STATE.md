# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Phone to published video without touching a computer
**Current focus:** Milestone v2.0 Cloud Production -- Phase 18: API Completeness & Timeout Accuracy (plan 02 complete)

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/MILESTONES.md` - Milestone history
- `.planning/REQUIREMENTS.md` - v2.0 requirements (24 mapped)
- `.planning/ROADMAP.md` - Phase structure (v1.0 phases 1-7, v2.0 phases 12-16)

---

## Current Position

Phase: 18 of 18 (API Completeness & Timeout Accuracy)
Plan: 2 of 2 in current phase
Status: In Progress
Last activity: 2026-02-22 -- Completed 18-02 (Per-type reaper timeouts)

Progress: [####################] 100% (phase 18: 2/2 plans complete)

---

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 35+
- Phases completed: 5 (core pipeline)
- Audio Prep MVP shipped on feature branch

**v2.0:**
- Plans completed: 15
- Phases remaining: 0 (all v2.0 phases complete)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 12    | 01   | 7min     | 2     | 6     |
| 12    | 02   | 12min    | 2     | 10    |
| 12    | 03   | 6min     | 3     | 5     |
| 13    | 01   | 5min     | 2     | 6     |
| 13    | 02   | 3min     | 2     | 2     |
| 13    | 03   | 4min     | 2     | 6     |
| 14    | 01   | 4min     | 2     | 5     |
| 14    | 02   | 4min     | 2     | 5     |
| 14    | 03   | 5min     | 2     | 2     |
| 15    | 01   | 5min     | 2     | 7     |
| 15    | 02   | 3min     | 2     | 3     |
| 16    | 01   | 7min     | 2     | 3     |
| 16    | 02   | 2min     | 1     | 1     |
| 16    | 03   | 2min     | 2     | 2     |
| 17    | 01   | 6min     | 2     | 3     |
| 17    | 02   | 3min     | 1     | 1     |
| 18    | 02   | 3min     | 2     | 4     |

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
- Bearer token auth for webhook (not custom header) -- standard HTTP pattern
- Constant-time comparison via crypto.timingSafeEqual to prevent timing-based secret enumeration
- Variant query parameter (not separate routes) for original vs prepared audio streaming
- Cache-Control 1h on stream redirect -- safe because signed URL handles access control
- Pipeline modules export single async function (store, job, childRef) -> Promise<void> for consistent dispatch
- Source assets downloaded to OS temp dir, processed, uploaded to storage, temp cleaned in finally block
- Preview pipeline checks storage cache before rendering (same cache key pattern as API route)
- Save pipeline removes previous prepared.* files before writing new output
- Audio uploaded to storage in API route (before job creation) for immediate worker access
- Render pipeline returns after Modal dispatch at 30% -- webhook callback completes the job
- Early return in processJob for render case skips implicit completion path
- Worker tsconfig extended to include modalClient.ts for direct import from render pipeline
- R2 signed URL (1-hour expiry) as audio handoff mechanism to Modal
- Standalone uploadToR2() in Modal entry (not StorageAdapter) -- minimal container env
- PATCH for progress, webhook only for final complete/failed status (backward compat)
- videoKey checked first in poll endpoint storage key resolution (before previewKey, preparedKey)
- 7-day signed URL expiry for video downloads (large files, users return later)
- Auto-derive R2 upload key as renders/{jobId}/output.mp4 when not explicit
- Deployment checklist sections ordered by dependency: R2 -> Turso -> Modal -> webhook -> Vercel -> Render
- Worker needs explicit STORAGE_BACKEND=r2 (not DEPLOY_ENV) since it's standalone Node.js
- DEPLOY_ENV=production as convenience fallback -- explicit STORAGE_BACKEND/JOB_STORE_BACKEND always takes precedence
- Legacy v1.0 variables preserved in .env.example under separate section
- Parallel CI/CD deploy jobs (no dependency between web and worker deploys)
- Concurrency group with cancel-in-progress: false (let deploys finish, don't cancel mid-deploy)
- Render deploy via curl to deploy hook URL (simplest integration, no Render API needed)
- Generic close() check via 'in' operator in worker shutdown -- works for both backends without importing either class
- Preserved { success, data } GET response wrapper on legacy poll routes for AudioPrepEditor backward compatibility
- DELETE handlers on legacy routes use flat response shape (AudioPrepEditor does not parse DELETE responses)
- Terminal state check (409) added to legacy DELETE handlers matching canonical cancel endpoint pattern
- Two-pass reaper: per-type timeouts first (ingest 10m, preview 5m, save 15m), then default sweep for unconfigured types
- Optional type parameter on markStaleJobsFailed preserves backward compatibility with existing callers

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
- Original JobManager at `src/lib/audio-prep/JobManager.ts` still exists -- all API routes now use JobStore, JobManager fully deprecated
- Legacy poll/cancel routes (ingest, edit/save, edit/preview) rewired to getJobStore() with backward-compatible { success, data } response wrapper
- All audio API POST routes (ingest, preview, save) dispatch to JobStore and return immediately (no inline processing)
- Poll endpoint at `/api/audio/jobs/[jobId]` enriches completed jobs with signed downloadUrl from storage adapter
- Preview audio route at `/api/audio/edit/preview/[jobId]/audio` serves from storage adapter (not filesystem)
- Webhook endpoint at `/api/webhooks/worker` validates INTERNAL_WEBHOOK_SECRET via Bearer token before processing job callbacks
- Audio streaming endpoint at `/api/audio/assets/[id]/stream` supports ?variant=original|prepared query parameter
- Render pipeline fully wired: POST /api/render -> JobStore -> Worker -> Modal (via R2 signed URL)
- Drizzle ORM already in project for Turso/libsql
- Worker pipeline modules at `worker/pipelines/` (ingest, preview, save, render) wired into processJob dispatcher
- All pipelines download source from storage, process with ffmpeg/yt-dlp, upload result, cleanup temp
- Ingest pipeline enforces SEC-02: 100MB file size, 30-min duration limits
- Audio prep MVP on `feature/audio-prep-mvp` branch
- Render job type added to AudioPrepJob union; render jobs flow through JobStore -> Worker -> Modal
- modalClient.ts supports audioSignedUrl, webhookUrl, webhookSecret for v2.0 dispatch
- Render storage key pattern: `renders/{jobId}/audio.{ext}`
- Modal entry point supports R2 I/O: download audio from signed URL, upload video to R2, webhook callback
- Webhook logs render-specific completions with videoKey
- Poll endpoint resolves videoKey -> signed download URL (7-day expiry) for completed render jobs
- Complete render flow: API -> JobStore -> Worker -> Modal -> R2 upload -> Webhook -> Poll with download URL
- Production deployment checklist at docs/DEPLOY_PROD_CHECKLIST.md covers all 5 cloud services
- DEPLOY_ENV=production activates R2 storage + Turso job store without individual backend vars
- .env.example fully rewritten with 7 sections covering all v2.0 production variables
- GitHub Actions CI/CD at .github/workflows/deploy.yml: push to main triggers parallel Vercel + Render deploys
- Deploy checklist section 8 documents 4 required GitHub Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, RENDER_DEPLOY_HOOK_URL)
- Worker entry point uses getJobStore() factory (not hardcoded TursoJobStore) -- local dev works without Turso credentials
- Reaper enforces per-type timeouts: ingest 10min, preview 5min, save 15min via markStaleJobsFailed type filter
- markStaleJobsFailed accepts optional type parameter for per-type SQL filtering (AND type = ?)

### Blockers

(None identified)

---

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 18-02-PLAN.md (Per-type reaper timeouts)
Resume file: .planning/phases/18-api-completeness-timeout-accuracy/18-02-SUMMARY.md

---

*Last updated: 2026-02-22 -- Phase 18 plan 02 complete*
