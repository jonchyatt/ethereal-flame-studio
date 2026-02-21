---
phase: 15-modal-render-dispatch
plan: 01
subsystem: api, worker, render
tags: [modal, r2, signed-url, render, worker-pipeline, jobstore]

# Dependency graph
requires:
  - phase: 14-api-worker-processing-pipeline
    provides: "JobStore adapter, worker poll loop, pipeline dispatch pattern, webhook endpoint"
  - phase: 12-storage-adapter
    provides: "StorageAdapter with R2 presigned URLs, getStorageAdapter singleton"
provides:
  - "Render job type in JobStore (type: 'render')"
  - "Worker render pipeline (worker/pipelines/render.ts) that uploads audio to R2 and dispatches to Modal"
  - "Updated modalClient accepting audioSignedUrl, webhookUrl, webhookSecret"
  - "POST /api/render dispatches through JobStore instead of direct Modal/BullMQ"
affects: [15-02-webhook-completion, 16-frontend-render-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render pipeline dispatch-only pattern (pipeline returns at 30% progress, webhook completes)"
    - "R2 signed URL handoff to Modal (no file streaming between services)"

key-files:
  created:
    - worker/pipelines/render.ts
  modified:
    - src/lib/jobs/types.ts
    - src/app/api/render/route.ts
    - src/lib/render/modalClient.ts
    - worker/process-job.ts
    - worker/tsconfig.json
    - src/app/api/audio/jobs/[jobId]/route.ts

key-decisions:
  - "Audio uploaded to storage before job creation in API route (not by worker) for immediate availability"
  - "Render pipeline returns after Modal dispatch at 30% progress -- webhook callback completes the job"
  - "Early return in processJob for render case skips implicit completion path"
  - "Worker tsconfig extended to include src/lib/render/modalClient.ts for direct import"

patterns-established:
  - "Dispatch-only pipeline: pipeline dispatches to external service and returns without calling store.complete()"
  - "R2 signed URL as audio handoff mechanism to Modal (1-hour expiry)"
  - "Render storage key pattern: renders/{jobId}/audio.{ext}"

requirements-completed: [WORK-04]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 15 Plan 01: Modal Render Dispatch Summary

**Worker render pipeline uploads audio to R2, generates signed URL, and dispatches GPU render jobs to Modal via JobStore -- replacing direct API-to-Modal dispatch pattern**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T12:40:14Z
- **Completed:** 2026-02-21T12:45:12Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Refactored POST /api/render from direct Modal/BullMQ dispatch to JobStore-based dispatch
- Created worker/pipelines/render.ts following the established pipeline pattern (ingest, preview, save)
- Extended modalClient.ts to support R2 presigned URL audio handoff and webhook parameters
- Wired render pipeline into process-job.ts dispatcher with dispatch-only semantics

## Task Commits

Each task was committed atomically:

1. **Task 1: Add render job type and create render API route with JobStore dispatch** - `0b5de84` (feat)
2. **Task 2: Create worker render pipeline and wire into process-job dispatcher** - `598d07b` (feat)

## Files Created/Modified
- `worker/pipelines/render.ts` - Render pipeline: resolves audio, uploads to R2, generates signed URL, dispatches to Modal
- `src/lib/jobs/types.ts` - Added 'render' to AudioPrepJob.type union
- `src/app/api/render/route.ts` - Refactored POST to create render jobs in JobStore with audio uploaded to storage
- `src/lib/render/modalClient.ts` - Added audioSignedUrl, webhookUrl, webhookSecret to submitToModal
- `worker/process-job.ts` - Added case 'render' dispatch with early return (no implicit completion)
- `worker/tsconfig.json` - Added src/lib/render/modalClient.ts to includes
- `src/app/api/audio/jobs/[jobId]/route.ts` - Updated JobPollResponse type to include 'render'

## Decisions Made
- Audio is uploaded to storage in the API route (before job creation) rather than deferring to worker. This ensures the audio is immediately accessible when the worker picks up the job, avoiding race conditions.
- The render pipeline returns after dispatching to Modal at 30% progress. The job remains in 'processing' status with stage 'dispatched-to-modal'. The webhook endpoint (built in Phase 14) will handle job completion when Modal calls back.
- Used early `return` in processJob for render case to skip any implicit completion logic that other pipelines rely on.
- Extended worker tsconfig to include modalClient.ts directly rather than creating a separate worker-specific wrapper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated JobPollResponse type in poll endpoint**
- **Found during:** Task 1 (Adding 'render' to type union)
- **Issue:** TypeScript compilation failed because `JobPollResponse.type` in `src/app/api/audio/jobs/[jobId]/route.ts` was still `'ingest' | 'preview' | 'save'` and couldn't accept the new 'render' type from the updated AudioPrepJob
- **Fix:** Added 'render' to the JobPollResponse.type union
- **Files modified:** src/app/api/audio/jobs/[jobId]/route.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 0b5de84 (Task 1 commit)

**2. [Rule 3 - Blocking] Added worker tsconfig include for modalClient**
- **Found during:** Task 2 (Creating render pipeline)
- **Issue:** Worker tsconfig did not include `src/lib/render/` in its `include` array, so the render pipeline's import of modalClient.ts would not compile
- **Fix:** Added `"../src/lib/render/modalClient.ts"` to worker/tsconfig.json includes
- **Files modified:** worker/tsconfig.json
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 598d07b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Render jobs now flow through JobStore -> Worker -> Modal pipeline
- Next: Plan 15-02 will handle webhook completion callback when Modal finishes rendering
- The webhook endpoint at `/api/webhooks/worker` (from Phase 14) needs to handle render completion events

---
*Phase: 15-modal-render-dispatch*
*Completed: 2026-02-21*
