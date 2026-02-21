# Phase 13: Job State + Worker Infrastructure - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

All job tracking migrated from local better-sqlite3 to Turso cloud database. A Render.com background worker independently polls for and processes jobs. User can see job progress, cancel running jobs, and stuck jobs are automatically cleaned up. This phase delivers the infrastructure — actual processing pipelines (ingest/edit/save) are wired in Phase 14.

</domain>

<decisions>
## Implementation Decisions

### Job Progress Reporting
- Add a `stage` column alongside existing `progress` percentage — descriptive strings like `"downloading"`, `"analyzing"`, `"normalizing"`, `"encoding"`
- Poll endpoint returns both stage name and percentage within that stage (e.g., `{stage: "normalizing", progress: 65}`)
- Stage list is job-type-specific: ingest has different stages than edit or render
- No fake progress bars — if a stage can't report granular progress, show stage name with indeterminate state

### Failure & Retry Behavior
- Auto-retry once on transient failures (network errors, timeouts); fail immediately on permanent errors (bad input, unsupported format)
- Configurable timeout per job type (ingest jobs for large files need more time than quick edits)
- Worker heartbeats: updates `updatedAt` every poll cycle; reaper query marks jobs failed if `updatedAt` hasn't changed beyond timeout threshold
- Failed jobs show clear reason; user retries from UI by creating a new job (not retry-in-place)
- Cancellation sends SIGTERM to child process, confirmed dead before releasing the job — no orphaned ffmpeg

### Local-to-Cloud Migration
- Clean start for Turso — existing local SQLite is dev/test data, not worth migrating
- Adapter pattern matching StorageAdapter: `JobStore` interface with `LocalJobStore` (better-sqlite3) and `TursoJobStore` (libsql) implementations
- Drizzle ORM schema shared between both — identical queries, different connection string
- Local dev continues working exactly as today (`npm run dev` uses local SQLite, no Turso dependency)

### Queue & Concurrency
- Single worker, one job at a time, FIFO by `createdAt`
- Scalable by design: additional workers poll same Turso DB, claim jobs with atomic `UPDATE ... WHERE status = 'pending' LIMIT 1` (prevents double-pickup)
- No priority system for v2.0 — single creator workflow, FIFO is sufficient
- Multiple submitted jobs queue up and process sequentially; user sees queue position via poll endpoint

### Claude's Discretion
- Drizzle schema design (column types, indexes, migration approach)
- Worker process structure (single entry point, graceful shutdown handling)
- Heartbeat interval and timeout thresholds
- Poll endpoint response shape
- Error categorization (which errors are transient vs permanent)

</decisions>

<specifics>
## Specific Ideas

- Adapter pattern should mirror the StorageAdapter pattern from Phase 12 — same factory/singleton approach with `resetJobStore()` for test isolation
- Existing `AudioPrepJobManager` interface (create/get/update/complete/fail/cancel/list) is the starting point — Turso adapter should expose the same API
- AbortController pattern for cancellation should carry over to the cloud implementation (runtime-only, not persisted)
- Worker should be a standalone Node.js script deployable to Render.com as a background worker ($7/mo tier)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-job-state-worker-infra*
*Context gathered: 2026-02-20*
