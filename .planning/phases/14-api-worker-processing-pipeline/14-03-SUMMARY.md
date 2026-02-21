---
phase: 14-api-worker-processing-pipeline
plan: 03
subsystem: api
tags: [webhook, security, streaming, zod, r2, audio]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    provides: "JobStore adapter (get, complete, fail) and singleton factory"
  - phase: 12-cloud-storage-migration
    provides: "StorageAdapter with getSignedUrl for local and R2"
provides:
  - "POST /api/webhooks/worker endpoint with INTERNAL_WEBHOOK_SECRET validation"
  - "Audio streaming with ?variant=original|prepared query parameter"
  - "Cache-Control headers on audio stream redirects"
affects: [14-api-worker-processing-pipeline, 15-frontend-cloud-ui, worker]

# Tech tracking
tech-stack:
  added: []
  patterns: [constant-time-secret-comparison, bearer-token-webhook-auth, variant-query-param]

key-files:
  created:
    - src/app/api/webhooks/worker/route.ts
  modified:
    - src/app/api/audio/assets/[id]/stream/route.ts

key-decisions:
  - "Bearer token auth for webhook (not custom header) -- standard HTTP pattern, easy for worker to implement"
  - "Constant-time comparison via crypto.timingSafeEqual to prevent timing-based secret enumeration"
  - "Variant query parameter (not separate routes) for original vs prepared audio -- simpler, extensible"
  - "Cache-Control 1h on redirect -- safe because signed URL handles access control"

patterns-established:
  - "Webhook auth pattern: Bearer token + INTERNAL_WEBHOOK_SECRET env var + timingSafeEqual"
  - "Audio variant selection: ?variant=original|prepared query parameter with default fallback"

requirements-completed: [API-03, API-04, SEC-01]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 14 Plan 03: Webhook Callback Endpoint and Audio Streaming Hardening Summary

**Secure webhook endpoint with INTERNAL_WEBHOOK_SECRET + timingSafeEqual validation, plus audio streaming with variant support and cache headers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T07:30:33Z
- **Completed:** 2026-02-21T07:35:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Webhook endpoint at `/api/webhooks/worker` validates Bearer token with constant-time comparison before processing job callbacks
- Audio streaming endpoint supports `?variant=prepared|original` for streaming either raw uploads or edited output
- Cache-Control headers added to stream redirects for CDN efficiency
- Both routes compile cleanly and use correct adapters (JobStore, StorageAdapter)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook endpoint with INTERNAL_WEBHOOK_SECRET validation** - `e4e7d64` (feat)
2. **Task 2: Verify and harden audio streaming endpoint for cloud readiness** - `ef7a8a0` (feat)

## Files Created/Modified
- `src/app/api/webhooks/worker/route.ts` - Webhook POST endpoint with secret validation, Zod payload schema, and JobStore integration
- `src/app/api/audio/assets/[id]/stream/route.ts` - Added variant query param, cache headers, improved error messages

## Decisions Made
- Used Bearer token auth pattern (standard HTTP) rather than custom header for webhook secret
- Constant-time comparison via `crypto.timingSafeEqual` prevents timing-based secret enumeration
- Variant selection via query parameter (`?variant=prepared`) rather than separate routes -- simpler and extensible
- Cache-Control set to 1 hour on redirects -- safe because the signed URL itself handles access control
- Zod v4 requires explicit key type in `z.record(z.string(), z.unknown())` -- adapted schema accordingly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod v4 z.record() requires two arguments**
- **Found during:** Task 1 (webhook endpoint implementation)
- **Issue:** Plan specified `z.record(z.unknown())` but project uses Zod v4 which requires explicit key type
- **Fix:** Changed to `z.record(z.string(), z.unknown())`
- **Files modified:** src/app/api/webhooks/worker/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** e4e7d64 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor syntax adaptation for Zod v4 compatibility. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The `INTERNAL_WEBHOOK_SECRET` env var will be configured as part of the deployment setup in a later phase.

## Next Phase Readiness
- Webhook endpoint ready to receive callbacks from Render.com worker and Modal
- Audio streaming endpoint ready for frontend to play both original and prepared audio
- Both endpoints use adapter patterns that work transparently in local and cloud environments

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 14-api-worker-processing-pipeline*
*Completed: 2026-02-21*
