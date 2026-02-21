---
phase: 16-production-deploy-ci-cd
plan: 02
subsystem: infra
tags: [deployment, cloudflare-r2, turso, modal, vercel, render, checklist, ops]

# Dependency graph
requires:
  - phase: 12-cloud-storage
    provides: R2 storage adapter and env var patterns
  - phase: 13-job-persistence
    provides: Turso job store adapter and env var patterns
  - phase: 14-worker-pipelines
    provides: Worker pipelines and Render.com Dockerfile
  - phase: 15-modal-render-dispatch
    provides: Modal client, webhook, and render pipeline
provides:
  - Step-by-step production deployment checklist for all 5 cloud services
  - Environment variable reference for Vercel, Render.com, and Modal
  - End-to-end verification procedure
  - Troubleshooting guide for common provisioning issues
affects: [16-production-deploy-ci-cd]

# Tech tracking
tech-stack:
  added: []
  patterns: [deployment-checklist, env-var-tracking-table]

key-files:
  created:
    - docs/DEPLOY_PROD_CHECKLIST.md
  modified: []

key-decisions:
  - "Ordered sections by dependency (R2 first, then Turso, Modal, webhook secret, Vercel, Render) so each section builds on previous"
  - "Included env var tracking table at top for operators to fill in as they go"
  - "Documented STORAGE_BACKEND=r2 explicit setting for worker (not DEPLOY_ENV) since worker is standalone Node.js"
  - "Added Modal secrets section for R2 credentials needed by GPU container"

patterns-established:
  - "Deployment checklist pattern: prerequisites -> per-service sections -> e2e verification -> troubleshooting"

requirements-completed: [DEPLOY-03]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 16 Plan 02: Production Deployment Checklist Summary

**Comprehensive ops checklist covering R2, Turso, Modal, Vercel, and Render provisioning with env var tracking, verification steps, and troubleshooting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T16:44:21Z
- **Completed:** 2026-02-21T16:46:44Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created docs/DEPLOY_PROD_CHECKLIST.md with 8 major sections covering full stack provisioning
- Every cloud service (R2, Turso, Modal, Vercel, Render) has dedicated section with step-by-step instructions
- Each section documents env vars produced, with an up-front tracking table for operators
- End-to-end verification smoke test covers upload, worker processing, audio playback, and render pipeline
- Troubleshooting section covers the most common failure modes (credential mismatch, missing vars, schema issues)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create production deployment checklist** - `48aad87` (docs)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `docs/DEPLOY_PROD_CHECKLIST.md` - Step-by-step production deployment guide for all 5 cloud services

## Decisions Made

- Ordered sections by dependency chain (R2 -> Turso -> Modal -> webhook -> Vercel -> Render) so operators provision services in the order they are needed
- Included a fill-in-the-blank env var tracking table at the top for operators to record values as they go
- Documented that the worker needs explicit `STORAGE_BACKEND=r2` (not just `DEPLOY_ENV`) since it is standalone Node.js, not Next.js
- Added Modal secrets section for R2 credentials that the GPU container needs for video upload

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - this plan creates documentation only. Actual provisioning is performed by the operator following the checklist.

## Next Phase Readiness

- Deployment checklist complete; an operator can now provision the full stack from scratch
- Ready for plan 16-03 (CI/CD pipeline setup) which will reference this checklist

## Self-Check: PASSED

- [x] `docs/DEPLOY_PROD_CHECKLIST.md` exists
- [x] Commit `48aad87` exists in git history

---
*Phase: 16-production-deploy-ci-cd*
*Completed: 2026-02-21*
