---
phase: 18-api-completeness-timeout-accuracy
plan: 02
subsystem: worker
tags: [reaper, timeout, job-store, sqlite, turso]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    provides: JobStore interface, markStaleJobsFailed method, reaper loop
provides:
  - Per-type job timeout enforcement in reaper (ingest 10m, preview 5m, save 15m)
  - Optional type filter on markStaleJobsFailed for targeted reaping
affects: [worker, job-store]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-type reaper iteration with default fallback sweep]

key-files:
  created: []
  modified:
    - src/lib/jobs/types.ts
    - src/lib/jobs/LocalJobStore.ts
    - src/lib/jobs/TursoJobStore.ts
    - worker/reaper.ts

key-decisions:
  - "Two-pass reaper: per-type timeouts first, then default sweep for unconfigured types"
  - "Optional type parameter on markStaleJobsFailed preserves backward compatibility"

patterns-established:
  - "Per-type reaper pattern: iterate Object.entries of timeouts map, skip 'default' key, call per-type then sweep"

requirements-completed: [JOB-05]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 18 Plan 02: Per-Type Reaper Timeouts Summary

**Per-type job timeout enforcement wired through markStaleJobsFailed with type-filtered SQL queries**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T22:04:37Z
- **Completed:** 2026-02-22T22:07:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- JobStore interface updated with optional type parameter on markStaleJobsFailed (backward-compatible)
- Both LocalJobStore and TursoJobStore add `AND type = ?` SQL filter when type is provided
- Reaper rewritten to iterate per-type timeouts: ingest 10min, preview 5min, save 15min
- Default fallback sweep catches unconfigured job types (e.g., render) at 10min

## Task Commits

Each task was committed atomically:

1. **Task 1: Add optional type parameter to markStaleJobsFailed interface and implementations** - `50d479d` (feat)
2. **Task 2: Rewrite reaper to iterate per-type timeouts** - `a5c34dc` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/lib/jobs/types.ts` - JobStore interface with optional type parameter on markStaleJobsFailed
- `src/lib/jobs/LocalJobStore.ts` - LocalJobStore markStaleJobsFailed with conditional type filter in WHERE clause
- `src/lib/jobs/TursoJobStore.ts` - TursoJobStore markStaleJobsFailed with conditional type filter in WHERE clause
- `worker/reaper.ts` - Reaper iterates per-type timeouts then default sweep

## Decisions Made
- Two-pass reaper approach: Pass 1 iterates per-type timeouts (ingest, preview, save), Pass 2 sweeps with default timeout for unconfigured types. Safe overlap because Pass 1 changes status from 'processing' to 'failed', so Pass 2's WHERE clause won't re-match.
- Optional type parameter (not overloaded method) on markStaleJobsFailed for simplicity and backward compatibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-type reaper timeouts fully wired; GAP-03 from v2.0 milestone audit is closed
- JOB-05 requirement satisfied: jobs stuck in processing longer than configurable timeout are automatically marked failed with per-type thresholds

## Self-Check: PASSED

- All 4 modified files verified present on disk
- Commit 50d479d (Task 1) verified in git log
- Commit a5c34dc (Task 2) verified in git log

---
*Phase: 18-api-completeness-timeout-accuracy*
*Completed: 2026-02-22*
