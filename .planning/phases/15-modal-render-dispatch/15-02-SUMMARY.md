---
phase: 15-modal-render-dispatch
plan: 02
subsystem: render, api, worker
tags: [modal, r2, webhook, signed-url, video-upload, s3, render-completion]

# Dependency graph
requires:
  - phase: 15-modal-render-dispatch
    provides: "Render pipeline dispatch through JobStore/Worker/Modal, modalClient with webhook params"
  - phase: 14-api-worker-processing-pipeline
    provides: "Webhook endpoint with Bearer token auth, JobStore adapter, poll endpoint"
  - phase: 12-storage-adapter
    provides: "StorageAdapter with R2 presigned URLs, @aws-sdk/client-s3"
provides:
  - "Modal entry point downloads audio from R2 signed URL (--audio-signed-url)"
  - "Modal entry point uploads rendered video to R2 via PutObjectCommand"
  - "Modal entry point calls webhook with Bearer auth on completion/failure"
  - "Webhook logs render-specific completions with videoKey"
  - "Poll endpoint returns signed download URL for completed render jobs (videoKey)"
affects: [16-frontend-render-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone R2 upload in Modal container (not StorageAdapter -- minimal env)"
    - "Signed URL audio download to temp file for container-based rendering"
    - "Webhook callback for final render status (complete/failed) with Bearer auth"
    - "videoKey priority in poll endpoint storage key resolution"

key-files:
  created: []
  modified:
    - scripts/modal-render-entry.ts
    - src/app/api/webhooks/worker/route.ts
    - src/app/api/audio/jobs/[jobId]/route.ts

key-decisions:
  - "Standalone uploadToR2() in modal-render-entry.ts (not StorageAdapter) because Modal container is minimal env"
  - "Keep PATCH progress reporting for backward compat; webhook only for final complete/failed status"
  - "videoKey checked first in poll endpoint storage key resolution (before previewKey, preparedKey)"
  - "7-day signed URL expiry for video downloads (large files, user may return later)"
  - "Auto-derive R2 upload key as renders/{jobId}/output.mp4 when --r2-upload-key not provided"

patterns-established:
  - "Container-side R2 upload: read file, PutObjectCommand with env-based credentials"
  - "Webhook callback pattern: Bearer token auth, JSON body with jobId/status/result"
  - "Storage key priority chain in poll endpoint: videoKey > previewKey > preparedKey"

requirements-completed: [WORK-05]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 15 Plan 02: Modal Render Completion Summary

**Modal container downloads audio from R2, uploads rendered video to R2 via PutObjectCommand, and calls webhook with Bearer auth and videoKey -- poll endpoint returns signed download URL for completed render jobs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T12:48:13Z
- **Completed:** 2026-02-21T12:51:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Modal entry point now supports full R2 I/O: download audio from signed URL, upload rendered video to R2
- Webhook callback sends Bearer-authenticated POST with videoKey, format, and duration on success (or error message on failure)
- Poll endpoint resolves videoKey from render job results and generates 7-day signed download URL
- Complete end-to-end flow: API -> JobStore -> Worker -> Modal -> R2 upload -> Webhook -> Poll with download URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Modal entry point for R2 audio download, video upload, and webhook callback** - `4040860` (feat)
2. **Task 2: Enhance webhook and poll endpoints for render completion with R2 video key** - `eae2382` (feat)

## Files Created/Modified
- `scripts/modal-render-entry.ts` - Added --audio-signed-url, --webhook-url, --webhook-secret, --r2-upload-key args; standalone uploadToR2(); downloadAudioFromSignedUrl(); callWebhook() for completion/failure
- `src/app/api/webhooks/worker/route.ts` - Added render-specific logging when result contains videoKey
- `src/app/api/audio/jobs/[jobId]/route.ts` - Extended storage key resolution to check videoKey first; 7-day signed URL expiry for video downloads

## Decisions Made
- Used standalone `uploadToR2()` function in modal-render-entry.ts rather than importing StorageAdapter, because the Modal container is a minimal environment that does not load the full app. This mirrors the R2StorageAdapter pattern but is self-contained.
- Kept existing PATCH-based progress reporting for backward compatibility. Webhook is used only for final complete/failed status, not incremental progress.
- videoKey is checked first (before previewKey and preparedKey) in the poll endpoint's storage key resolution chain, since render jobs are the primary use case for large file downloads.
- R2 upload key auto-derives from jobId as `renders/{jobId}/output.mp4` when `--r2-upload-key` is not explicitly provided.
- 7-day signed URL expiry for video downloads (vs default expiry for other file types) because rendered videos are large and users may return to download later.

## Deviations from Plan

None - plan executed exactly as written. The JobPollResponse type already included 'render' from plan 15-01 (deviation fix), so Task 2 step 1 was already satisfied.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) must be set in the Modal container environment, but this is an infrastructure concern for Modal deployment configuration, not a new user setup step.

## Next Phase Readiness
- Complete render pipeline: API -> JobStore -> Worker -> Modal -> R2 upload -> Webhook -> Poll with download URL
- Phase 15 (Modal Render Dispatch) is fully complete
- Ready for Phase 16 (Frontend Render Status) which will consume the poll endpoint's downloadUrl to show render progress and provide video downloads

## Self-Check: PASSED

All files verified present. All commit hashes found in git log.

---
*Phase: 15-modal-render-dispatch*
*Completed: 2026-02-21*
