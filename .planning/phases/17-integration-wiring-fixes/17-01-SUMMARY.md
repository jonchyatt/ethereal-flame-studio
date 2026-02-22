---
phase: 17-integration-wiring-fixes
plan: 01
subsystem: api
tags: [jobstore, polling, backward-compat, audio-prep, next-api-routes]

# Dependency graph
requires:
  - phase: 13-job-system
    provides: "JobStore adapter pattern (getJobStore factory, Local + Turso backends)"
provides:
  - "3 legacy poll/cancel routes wired to persistent JobStore"
  - "Backward-compatible { success, data } response wrapper preserved"
  - "No remaining audioPrepJobs/JobManager imports in poll routes"
affects: [17-02-PLAN, audio-prep-editor, job-polling]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Legacy route migration to JobStore factory pattern"]

key-files:
  created: []
  modified:
    - "src/app/api/audio/ingest/[jobId]/route.ts"
    - "src/app/api/audio/edit/save/[jobId]/route.ts"
    - "src/app/api/audio/edit/preview/[jobId]/route.ts"

key-decisions:
  - "Preserved { success: true/false, data: {...} } GET response wrapper for AudioPrepEditor backward compatibility"
  - "DELETE handler uses flat response shape (AudioPrepEditor does not parse DELETE responses)"
  - "Added terminal state check (409) to DELETE handlers matching canonical cancel endpoint pattern"

patterns-established:
  - "Legacy poll route pattern: getJobStore().get(jobId) with { success, data } wrapper for GET, flat shape for DELETE"

requirements-completed: [JOB-01, JOB-03, JOB-04]

# Metrics
duration: 6min
completed: 2026-02-22
---

# Phase 17 Plan 01: Legacy Poll Route Rewiring Summary

**3 legacy poll/cancel API routes rewired from in-memory audioPrepJobs Map to persistent getJobStore() factory with backward-compatible response wrappers**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-22T16:18:20Z
- **Completed:** 2026-02-22T16:23:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Rewired `/api/audio/ingest/[jobId]` from deprecated audioPrepJobs to getJobStore()
- Rewired `/api/audio/edit/save/[jobId]` from deprecated audioPrepJobs to getJobStore()
- Rewired `/api/audio/edit/preview/[jobId]` from deprecated audioPrepJobs to getJobStore()
- Preserved `{ success: true/false, data: {...} }` GET response wrapper for AudioPrepEditor.tsx polling loops
- Added proper error handling (try/catch with 500) and terminal state checks (409 on DELETE) to all 3 routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire ingest poll/cancel route to getJobStore()** - `2598869` (feat)
2. **Task 2: Rewire edit/save and edit/preview poll/cancel routes to getJobStore()** - `3c1c0a6` (feat)

## Files Created/Modified
- `src/app/api/audio/ingest/[jobId]/route.ts` - Ingest job poll (GET) and cancel (DELETE) using getJobStore()
- `src/app/api/audio/edit/save/[jobId]/route.ts` - Save job poll (GET) and cancel (DELETE) using getJobStore()
- `src/app/api/audio/edit/preview/[jobId]/route.ts` - Preview job poll (GET) and cancel (DELETE) using getJobStore()

## Decisions Made
- Preserved `{ success: true/false, data: {...} }` response wrapper on GET handlers -- AudioPrepEditor.tsx parses `data.success` and `data.data.*` fields directly, so dropping the wrapper would break all polling loops
- DELETE handlers use flat response shape `{ jobId, status, message }` matching the canonical `/api/audio/jobs/[jobId]/cancel` endpoint -- AudioPrepEditor does not parse DELETE responses
- Added terminal state check returning 409 on DELETE to match canonical cancel endpoint behavior (prevents re-cancelling completed/failed/cancelled jobs)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 3 legacy poll routes now query the persistent JobStore, closing CRIT-01
- Plan 17-02 (response wrapper normalization or further wiring fixes) can proceed
- AudioPrepEditor.tsx polling loops work without modification due to preserved response shape

## Self-Check: PASSED

- [x] `src/app/api/audio/ingest/[jobId]/route.ts` - FOUND
- [x] `src/app/api/audio/edit/save/[jobId]/route.ts` - FOUND
- [x] `src/app/api/audio/edit/preview/[jobId]/route.ts` - FOUND
- [x] Commit `2598869` - FOUND
- [x] Commit `3c1c0a6` - FOUND
- [x] SUMMARY.md - FOUND

---
*Phase: 17-integration-wiring-fixes*
*Completed: 2026-02-22*
