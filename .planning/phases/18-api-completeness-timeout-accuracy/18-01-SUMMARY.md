---
phase: 18-api-completeness-timeout-accuracy
plan: 01
subsystem: api
tags: [poll-endpoint, render-api, jobstore, downloadUrl, asset-streaming]

# Dependency graph
requires:
  - phase: 17-integration-wiring-fixes
    provides: "getJobStore() factory wired in worker and legacy routes"
  - phase: 14-worker-pipeline-dispatch
    provides: "Worker pipelines storing result.assetId for ingest jobs"
provides:
  - "Poll endpoint downloadUrl coverage for all job types (ingest, preview, save, render)"
  - "GET /api/render reading from shared JobStore instead of empty legacy store"
affects: [api-completeness, milestone-audit, frontend-render-list]

# Tech tracking
tech-stack:
  added: []
  patterns: ["AudioPrepJob-to-RenderJobSummary status mapping", "in-memory pagination over JobStore results"]

key-files:
  created: []
  modified:
    - "src/app/api/audio/jobs/[jobId]/route.ts"
    - "src/app/api/render/route.ts"

key-decisions:
  - "Ingest downloadUrl is a relative URL (/api/audio/assets/{assetId}/stream) not a signed R2 URL -- asset streaming endpoint handles auth/caching"
  - "GET /api/render uses in-memory pagination and sorting over full JobStore list -- sufficient at current scale"
  - "Status mapping: AudioPrepJob processing->rendering, complete->completed for RenderJobSummary compatibility"
  - "Removed ServerJobStore import entirely -- POST already used getJobStore(), no remaining references"

patterns-established:
  - "AudioPrepJob-to-JobStatus mapping function for legacy type compatibility"

requirements-completed: [API-02]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 18 Plan 01: API Completeness Summary

**Poll endpoint downloadUrl for ingest jobs via assetId branch, and GET /api/render rewritten to read from getJobStore()**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T22:04:37Z
- **Completed:** 2026-02-22T22:07:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Completed ingest jobs now return downloadUrl pointing to `/api/audio/assets/{assetId}/stream` in poll response
- GET /api/render returns real render jobs from the shared JobStore instead of the always-empty legacy ServerJobStore
- Removed dead ServerJobStore import from render route
- All existing downloadUrl behavior for preview/save/render jobs unchanged (no regression)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add assetId downloadUrl branch to poll endpoint** - `a5d07b3` (feat)
2. **Task 2: Rewrite GET /api/render to use getJobStore()** - `8222633` (feat)

## Files Created/Modified
- `src/app/api/audio/jobs/[jobId]/route.ts` - Added else-if branch for result.assetId -> downloadUrl synthesis
- `src/app/api/render/route.ts` - Rewrote GET handler to use getJobStore().list({ type: 'render' }), removed ServerJobStore import, added status mapping and in-memory pagination

## Decisions Made
- Ingest downloadUrl uses relative URL path (not signed R2 URL) since the streaming endpoint handles access control and caching
- In-memory pagination over JobStore results is sufficient at current render job volumes
- AudioPrepJob statuses mapped to RenderJobSummary JobStatus: processing->rendering, complete->completed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API poll responses now include downloadUrl for every job type on completion
- Render list endpoint returns real data from the shared JobStore
- Ready for plan 18-02 (timeout accuracy improvements)

## Self-Check: PASSED

- [x] `src/app/api/audio/jobs/[jobId]/route.ts` exists
- [x] `src/app/api/render/route.ts` exists
- [x] `.planning/phases/18-api-completeness-timeout-accuracy/18-01-SUMMARY.md` exists
- [x] Commit `a5d07b3` found in git log
- [x] Commit `8222633` found in git log

---
*Phase: 18-api-completeness-timeout-accuracy*
*Completed: 2026-02-22*
