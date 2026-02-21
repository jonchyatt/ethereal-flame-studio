---
phase: 14-api-worker-processing-pipeline
plan: 01
subsystem: api
tags: [nextjs, async, jobstore, turso, storage-adapter, r2]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    provides: JobStore interface (Local + Turso), job poll/cancel endpoints
  - phase: 12-cloud-storage-foundation
    provides: StorageAdapter interface (Local + R2), signed URLs
provides:
  - Async ingest endpoint creating job in JobStore (no inline processing)
  - Async preview endpoint creating job in JobStore (cache hit still instant)
  - Async save endpoint creating job in JobStore (no inline processing)
  - Poll endpoint with signed download URL for completed jobs
  - Preview audio route serving from storage adapter (not filesystem)
affects: [14-02-worker-pipelines, 14-03-frontend-polling, audio-prep-mvp]

# Tech tracking
tech-stack:
  added: []
  patterns: [async-job-dispatch, storage-key-in-metadata, signed-download-url-enrichment]

key-files:
  created: []
  modified:
    - src/app/api/audio/ingest/route.ts
    - src/app/api/audio/edit/preview/route.ts
    - src/app/api/audio/edit/save/route.ts
    - src/app/api/audio/jobs/[jobId]/route.ts
    - src/app/api/audio/edit/preview/[jobId]/audio/route.ts

key-decisions:
  - "File uploads buffered to storage before job creation so worker can access via storage key"
  - "downloadUrl generation is non-fatal -- poll still returns result if signing fails"
  - "Preview audio route returns JSON with signedUrl for R2 (consistent with existing download route pattern)"
  - "Buffer-to-Uint8Array conversion for NextResponse body compatibility"

patterns-established:
  - "Async job dispatch: validate input, create job in JobStore, return jobId immediately"
  - "Storage-first file upload: buffer file to storage adapter, pass storageKey in job metadata"
  - "Download URL enrichment: poll endpoint checks result for storage keys and generates signed URLs"

requirements-completed: [API-01, API-02]

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 14 Plan 01: API Routes to Async JobStore Dispatch Summary

**Refactored all audio API routes (ingest, preview, save) from synchronous audioPrepJobs to async JobStore dispatch with signed download URL enrichment on poll endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T07:30:47Z
- **Completed:** 2026-02-21T07:35:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All three POST endpoints (ingest, preview, save) now create a job in JobStore and return `{ jobId, status: 'pending' }` within 2 seconds -- no inline processing blocks the request
- Poll endpoint generates a signed `downloadUrl` when a completed job's result contains `previewKey` or `preparedKey`
- Preview audio route migrated from filesystem reads to storage adapter (local serves content, R2 returns signed URL)
- Removed ~450 lines of inline processing logic (ffmpeg, yt-dlp, file streaming) from API routes
- All `audioPrepJobs` references removed from the five modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor ingest/preview/save API routes to async job dispatch via JobStore** - `efe1674` (feat)
2. **Task 2: Enhance poll endpoint with download URL and update preview audio route** - `0cdd64b` (feat)

## Files Created/Modified
- `src/app/api/audio/ingest/route.ts` - Async ingest with file-to-storage buffering for uploads, URL passthrough for youtube/url sources
- `src/app/api/audio/edit/preview/route.ts` - Async preview with recipe cache check, instant-complete for cache hits
- `src/app/api/audio/edit/save/route.ts` - Async save with recipe in metadata
- `src/app/api/audio/jobs/[jobId]/route.ts` - Enhanced poll with downloadUrl from storage adapter signed URLs
- `src/app/api/audio/edit/preview/[jobId]/audio/route.ts` - Preview audio serving from storage adapter instead of filesystem

## Decisions Made
- File uploads are buffered to storage (via `getStorageAdapter().put()`) before creating the job, so the worker can access them via storage key in any environment
- `downloadUrl` generation is wrapped in try/catch and non-fatal -- the poll response still returns the result object even if URL signing fails
- Preview audio route for R2 returns JSON `{ downloadUrl }` consistent with the existing `/api/storage/download` pattern (not redirect, avoids CORS)
- Used `Uint8Array` wrapper for `Buffer` when constructing `NextResponse` body to satisfy TypeScript's `BodyInit` type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer-to-Uint8Array conversion for NextResponse**
- **Found during:** Task 2 (Preview audio route)
- **Issue:** TypeScript error -- `Buffer` is not directly assignable to `BodyInit` in NextResponse constructor
- **Fix:** Wrapped `data` in `new Uint8Array(data)` for the local-storage code path
- **Files modified:** `src/app/api/audio/edit/preview/[jobId]/audio/route.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** `0cdd64b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type compatibility fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API routes dispatch to JobStore -- ready for worker pipeline implementation (plan 14-02)
- Worker needs to implement the actual processing logic extracted from these routes (ingest pipeline, preview render, save render)
- Old `audioPrepJobs` singleton still exists in `src/lib/audio-prep/JobManager.ts` for other consumers; will be deprecated once worker is fully wired

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (`efe1674`, `0cdd64b`) confirmed in git log.

---
*Phase: 14-api-worker-processing-pipeline*
*Completed: 2026-02-21*
