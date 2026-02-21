---
phase: 13-job-state-worker-infra
plan: 03
subsystem: infra
tags: [worker, render-com, docker, ffmpeg, yt-dlp, polling, reaper, sigterm]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    plan: 01
    provides: JobStore interface, TursoJobStore implementation, atomic claimNextPending, markStaleJobsFailed
provides:
  - Standalone Render.com background worker with poll loop, heartbeat, graceful shutdown
  - Job processor with cancellation detection, SIGTERM->SIGKILL child process escalation, auto-retry
  - Stale job reaper that marks timed-out processing jobs as failed
  - Dockerfile with ffmpeg + yt-dlp for audio processing deployment
affects: [14-audio-prep-pipeline]

# Tech tracking
tech-stack:
  added: [dotenv]
  patterns: [poll-loop worker, SIGTERM graceful shutdown, heartbeat liveness, cancel-via-poll, transient error retry]

key-files:
  created:
    - worker/index.ts
    - worker/process-job.ts
    - worker/reaper.ts
    - worker/package.json
    - worker/tsconfig.json
    - worker/Dockerfile
  modified: []

key-decisions:
  - "skipLibCheck in worker tsconfig to avoid drizzle-orm node_modules type errors"
  - "Placeholder pipelines for Phase 13 infrastructure; actual ingest/edit/save wired in Phase 14"
  - "Single max timeout for reaper in Phase 13; per-type timeouts can be added in Phase 14"
  - "Child process ref pattern allows Phase 14 pipelines to expose spawned processes for cancellation"

patterns-established:
  - "Worker poll pattern: setInterval claim loop with shuttingDown guard"
  - "Heartbeat liveness: empty store.update() bumps updatedAt to prevent reaper false positives"
  - "Cancel detection: poll job status every 2s, kill child process with SIGTERM->SIGKILL escalation"
  - "Transient error classification: ECONNRESET/ETIMEDOUT/ECONNREFUSED/EAI_AGAIN/EPIPE + HTTP 5xx"

requirements-completed: [JOB-02, JOB-05, WORK-01]

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 13 Plan 03: Render.com Worker Summary

**Standalone background worker with Turso poll loop, heartbeat liveness, SIGTERM graceful shutdown, cancellation detection, auto-retry, stale job reaper, and Docker deployment with ffmpeg + yt-dlp**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T04:25:06Z
- **Completed:** 2026-02-21T04:29:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Worker entry point with configurable poll interval (default 3s), per-job-type timeouts, and graceful SIGTERM/SIGINT shutdown
- Job processor with heartbeat liveness, cancellation detection via status polling, SIGTERM->SIGKILL child process escalation, and auto-retry on transient errors
- Stale job reaper that marks timed-out processing jobs as failed using configurable timeout threshold
- Dockerfile with ffmpeg and yt-dlp ready for Render.com background worker deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Worker entry point with poll loop, heartbeat, and graceful shutdown** - `cb621b8` (feat)
2. **Task 2: Job processor with cancellation detection and stale job reaper** - `9dcdd2d` (feat)

## Files Created/Modified
- `worker/index.ts` - Main worker entry point with poll loop, reaper loop, and graceful shutdown
- `worker/process-job.ts` - Job processor with heartbeat, cancellation detection, auto-retry, and child process management
- `worker/reaper.ts` - Stale job reaper using markStaleJobsFailed with configurable timeout
- `worker/package.json` - Standalone package.json for Render.com worker deployment
- `worker/tsconfig.json` - TypeScript config with paths to shared job types and skipLibCheck
- `worker/Dockerfile` - Docker image with node:20-slim, ffmpeg, yt-dlp for Render.com background worker

## Decisions Made
- Added `skipLibCheck: true` to worker tsconfig.json to avoid pre-existing drizzle-orm type declaration errors in node_modules (not from our code)
- All job types use placeholder logic in Phase 13; actual pipeline dispatch will be wired in Phase 14 via the existing childRef pattern
- Reaper uses single default timeout (10 min) for simplicity; per-job-type timeouts are supported by the interface but deferred to Phase 14
- processJob accepts optional childRef parameter so Phase 14 pipelines can expose spawned child processes for proper cancellation cleanup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added skipLibCheck to worker tsconfig.json**
- **Found during:** Task 1
- **Issue:** Worker tsconfig includes `../src/lib/db/job-schema.ts` which imports drizzle-orm, pulling in type errors from drizzle-orm's declaration files for mysql, singlestore, and gel modules not installed in this project
- **Fix:** Added `skipLibCheck: true` to worker/tsconfig.json to skip type checking node_modules declaration files
- **Files modified:** worker/tsconfig.json
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** cb621b8

**2. [Rule 1 - Bug] Fixed stage clearing to use null instead of undefined**
- **Found during:** Task 2
- **Issue:** Using `stage: undefined` in JobUpdate would skip the field in the SQL update (since TursoJobStore checks `!== undefined`), leaving stale stage values on cancelled/retried jobs
- **Fix:** Changed to `stage: null` which correctly sets the column to NULL in the database
- **Files modified:** worker/process-job.ts
- **Verification:** TypeScript compiles, null is valid for `stage: string | null` in JobUpdate
- **Committed in:** 9dcdd2d

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug fix)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Worker environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) are configured at Render.com deployment time.

## Next Phase Readiness
- Worker infrastructure complete; Phase 14 wires actual ingest/edit/save pipelines into processJob dispatcher
- The childRef pattern in processJob is ready for Phase 14 to expose spawned ffmpeg/yt-dlp processes
- All three Phase 13 plans (01: JobStore adapter, 02: API routes, 03: Worker) are now complete

## Self-Check: PASSED

- worker/index.ts: FOUND
- worker/process-job.ts: FOUND
- worker/reaper.ts: FOUND
- worker/package.json: FOUND
- worker/tsconfig.json: FOUND
- worker/Dockerfile: FOUND
- Commit cb621b8 (Task 1): FOUND
- Commit 9dcdd2d (Task 2): FOUND

---
*Phase: 13-job-state-worker-infra*
*Completed: 2026-02-21*
