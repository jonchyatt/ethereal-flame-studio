---
phase: 13-job-state-worker-infra
plan: 01
subsystem: database
tags: [drizzle, sqlite, turso, libsql, better-sqlite3, adapter-pattern]

# Dependency graph
requires:
  - phase: 12-cloud-storage-adapter
    provides: StorageAdapter pattern (singleton factory, dynamic require, resetX())
provides:
  - Drizzle ORM schema for audio_prep_jobs table with stage and retryCount columns
  - JobStore interface with CRUD + worker-specific methods (claimNextPending, markStaleJobsFailed, getQueuePosition)
  - LocalJobStore (better-sqlite3) for local development
  - TursoJobStore (@libsql/client) for production
  - Singleton factory at src/lib/jobs/index.ts with JOB_STORE_BACKEND env switch
affects: [13-02, 13-03, 14-audio-prep-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [JobStore adapter pattern mirroring StorageAdapter, atomic job claim via RETURNING/transaction]

key-files:
  created:
    - src/lib/db/job-schema.ts
    - src/lib/jobs/types.ts
    - src/lib/jobs/LocalJobStore.ts
    - src/lib/jobs/TursoJobStore.ts
    - src/lib/jobs/index.ts
    - src/lib/jobs/__tests__/JobStore.test.ts
  modified: []

key-decisions:
  - "Raw SQL for TursoJobStore queries (not Drizzle ORM) for simplicity and async compatibility"
  - "Drizzle schema file serves as column definition source of truth, not for query building"
  - "getQueuePosition returns -1 for non-pending jobs (clear signal vs 0-ambiguity)"
  - "LocalJobStore uses RETURNING * for atomic claim; TursoJobStore uses transaction"

patterns-established:
  - "JobStore adapter pattern: interface + Local/Turso impl + singleton factory + resetJobStore()"
  - "Worker claim pattern: atomic UPDATE...RETURNING for SQLite, transaction for Turso"

requirements-completed: [JOB-01]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 13 Plan 01: JobStore Adapter Summary

**Drizzle schema for audio_prep_jobs with stage/retryCount columns, JobStore interface with atomic claim/reaper methods, Local and Turso implementations via singleton factory**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T04:17:18Z
- **Completed:** 2026-02-21T04:22:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Drizzle ORM schema for audio_prep_jobs table with stage, retryCount, and 3 indexes
- JobStore interface with full CRUD plus worker-specific claimNextPending, markStaleJobsFailed, and getQueuePosition
- LocalJobStore (better-sqlite3) with atomic RETURNING-based job claim
- TursoJobStore (@libsql/client) with transactional claim for production
- Singleton factory mirroring StorageAdapter pattern (dynamic require, JOB_STORE_BACKEND env var)
- 16 comprehensive tests covering all operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Drizzle schema and JobStore interface with types** - `9f92419` (feat)
2. **Task 2: LocalJobStore, TursoJobStore, singleton factory, and tests** - `90df365` (feat)

## Files Created/Modified
- `src/lib/db/job-schema.ts` - Drizzle ORM schema for audio_prep_jobs table with indexes
- `src/lib/jobs/types.ts` - AudioPrepJob type, JobStore interface, JobUpdate, ListOptions
- `src/lib/jobs/LocalJobStore.ts` - better-sqlite3 backed JobStore for local development
- `src/lib/jobs/TursoJobStore.ts` - @libsql/client backed JobStore for Turso cloud production
- `src/lib/jobs/index.ts` - Singleton factory with getJobStore() and resetJobStore()
- `src/lib/jobs/__tests__/JobStore.test.ts` - 16 tests for LocalJobStore contract verification

## Decisions Made
- Used raw SQL in TursoJobStore instead of Drizzle ORM query builder for simplicity and to avoid async compatibility issues with libsql
- Drizzle schema file (job-schema.ts) serves as source-of-truth for column definitions; both adapters create tables via raw SQL matching it
- getQueuePosition returns -1 for non-pending jobs rather than 0, providing clearer semantics
- LocalJobStore uses SQLite's UPDATE...RETURNING for atomic claim (single statement); TursoJobStore uses explicit transaction (SELECT + UPDATE) since libsql RETURNING support varies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timestamp collision in queue position test**
- **Found during:** Task 2
- **Issue:** Jobs created in rapid succession shared identical createdAt timestamps, causing getQueuePosition to return incorrect positions
- **Fix:** Test sets explicit distinct createdAt values via raw SQL to ensure deterministic ordering
- **Files modified:** src/lib/jobs/__tests__/JobStore.test.ts
- **Verification:** All 16 tests pass
- **Committed in:** 90df365

---

**Total deviations:** 1 auto-fixed (1 bug fix in tests)
**Impact on plan:** Minor test fix for deterministic behavior. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- JobStore interface and both adapters are ready for consumption by API routes (plan 13-02) and worker (plan 13-03)
- No blockers identified

## Self-Check: PASSED

- All 7 created files verified on disk
- Commit 9f92419 (Task 1) verified in git log
- Commit 90df365 (Task 2) verified in git log

---
*Phase: 13-job-state-worker-infra*
*Completed: 2026-02-21*
