# Phase 17: Integration Wiring Fixes - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewire 3 legacy poll/cancel API routes and the worker entry point to use `getJobStore()` factory instead of direct JobManager/TursoJobStore imports. Closes CRIT-01 (routes still use deprecated JobManager) and CRIT-02 (worker hardcodes TursoJobStore). No new API capabilities — purely fixing the wiring so job state is consistent between web and worker in all environments.

</domain>

<decisions>
## Implementation Decisions

### Legacy route cleanup
- Remove all imports of the old `JobManager` from the 3 legacy poll/cancel routes (ingest, edit/save, edit/preview)
- Replace with `getJobStore()` factory calls — same pattern already used by the newer routes (render, main poll endpoint)
- Do NOT delete `JobManager.ts` itself yet — it may still be imported elsewhere. Only remove imports from the routes being fixed
- If a route has inline job processing logic (not dispatched via JobStore), that logic stays — we're only fixing the state query path

### Error responses
- Keep existing HTTP status patterns: 404 for job not found, 200 with JSON body for found jobs
- Cancelled jobs return 200 with `{ status: "cancelled" }` — same as other terminal states
- Match the response shape of `/api/audio/jobs/[jobId]` (the already-correct poll endpoint) for consistency
- No new response fields — downstream consumers (AudioPrepEditor) already parse these shapes

### Worker env detection
- Worker uses `getJobStore()` factory which reads `JOB_STORE_BACKEND` env var (or falls back to `DEPLOY_ENV`)
- No new env vars needed — the factory already handles Local vs Turso switching
- `npm run worker` locally without `TURSO_DATABASE_URL` uses LocalJobStore automatically
- Remove the hardcoded `new TursoJobStore()` import in `worker/index.ts`

### Testing approach
- Verify via FLOW-01 (Audio Ingest) and FLOW-02 (Audio Edit+Save) E2E flows after wiring
- Success = polling routes return real job status (not 404) for jobs created by async POST routes
- Local dev verification: start worker + dev server, submit a job, poll until complete

### Claude's Discretion
- Import style and factory call placement within each route handler
- Whether to extract shared poll response formatting into a helper (only if 3+ routes duplicate it)
- Error logging verbosity in the worker factory switch

</decisions>

<specifics>
## Specific Ideas

- The correct pattern is already established in `/api/audio/jobs/[jobId]` and `/api/render` — follow those exactly
- Worker's `processJob` function signature stays the same; only the job acquisition layer changes
- The `getJobStore()` singleton at `src/lib/jobs/index.ts` is the single source of truth

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-integration-wiring-fixes*
*Context gathered: 2026-02-22*
