---
phase: 13-job-state-worker-infra
plan: 02
subsystem: api
tags: [nextjs, api-routes, job-polling, cancellation, rest]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    plan: 01
    provides: JobStore interface with get(), getQueuePosition(), and cancel() methods
provides:
  - GET /api/audio/jobs/[jobId] endpoint returning job status, progress, stage, queue position, and result
  - POST /api/audio/jobs/[jobId]/cancel endpoint to cancel non-terminal jobs
affects: [13-03, 14-audio-prep-pipeline, frontend-polling-hook]

# Tech tracking
tech-stack:
  added: []
  patterns: [JobPollResponse interface for typed poll results, terminal state guard for cancel idempotency]

key-files:
  created:
    - src/app/api/audio/jobs/[jobId]/route.ts
    - src/app/api/audio/jobs/[jobId]/cancel/route.ts
  modified: []

key-decisions:
  - "JobPollResponse interface exported from poll route for frontend type reuse"
  - "Queue position only populated for pending jobs (null otherwise) to avoid unnecessary DB queries"
  - "Terminal state set (complete/failed/cancelled) checked before cancel to return 409 Conflict"

patterns-established:
  - "Job poll pattern: stage + progress for granular tracking, null progress = indeterminate"
  - "Cancel as state mutation only: API sets status, worker handles process cleanup"

requirements-completed: [JOB-03, JOB-04]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 13 Plan 02: Job Poll & Cancel API Summary

**GET and POST endpoints for job progress polling (stage + percentage + queue position) and cancellation with terminal-state guard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T04:25:01Z
- **Completed:** 2026-02-21T04:27:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GET /api/audio/jobs/[jobId] returns typed JobPollResponse with stage name, progress percentage, queue position for pending jobs, and conditional result/error fields
- POST /api/audio/jobs/[jobId]/cancel transitions non-terminal jobs to cancelled status with 409 guard for already-terminal jobs
- Both endpoints compile cleanly and use getJobStore() for adapter-agnostic persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Job poll endpoint (GET /api/audio/jobs/[jobId])** - `d2208ee` (feat)
2. **Task 2: Job cancel endpoint (POST /api/audio/jobs/[jobId]/cancel)** - `99327e8` (feat)

## Files Created/Modified
- `src/app/api/audio/jobs/[jobId]/route.ts` - GET handler returning JobPollResponse with status, progress, stage, queuePosition, result, and error
- `src/app/api/audio/jobs/[jobId]/cancel/route.ts` - POST handler setting job status to cancelled with terminal-state 409 guard

## Decisions Made
- Exported `JobPollResponse` interface from the poll route so the frontend polling hook can reuse the type directly
- Queue position is only fetched (via `getQueuePosition()`) when `status === 'pending'` to avoid unnecessary database queries for non-queued jobs
- Terminal states defined as a Set (`complete`, `failed`, `cancelled`) for O(1) lookup in the cancel guard
- Cancel endpoint performs state mutation only -- actual SIGTERM to child process is the worker's responsibility (plan 13-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both poll and cancel endpoints are ready for consumption by the frontend polling hook and worker (plan 13-03)
- Worker will detect `status === 'cancelled'` on its poll cycle and handle SIGTERM to child processes
- No blockers identified

## Self-Check: PASSED

- All 2 created files verified on disk
- Commit d2208ee (Task 1) verified in git log
- Commit 99327e8 (Task 2) verified in git log

---
*Phase: 13-job-state-worker-infra*
*Completed: 2026-02-21*
