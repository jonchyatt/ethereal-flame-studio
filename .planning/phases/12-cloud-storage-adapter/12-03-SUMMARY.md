---
phase: 12-cloud-storage-adapter
plan: 03
subsystem: storage
tags: [cloudflare-r2, presigned-url, upload-progress, xhr, api-routes, range-requests, cors]

# Dependency graph
requires:
  - phase: 12-cloud-storage-adapter plan 01
    provides: StorageAdapter interface, LocalStorageAdapter, R2StorageAdapter, getStorageAdapter() factory
provides:
  - POST /api/storage/upload route for presigned upload URL generation
  - PUT /api/storage/upload route for local dev direct file upload
  - GET /api/storage/download route with signed URLs (R2) and direct serving with Range support (local)
  - useStorageUpload React hook with XHR progress tracking
  - Upload progress bar in AudioPrepEditor
affects: [12-cloud-storage-adapter, 14-render-worker, audio-prep]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Two-step presigned upload flow (POST for URL, PUT for file)", "XHR upload progress tracking (fetch lacks upload progress)", "Range request support for audio streaming"]

key-files:
  created:
    - src/app/api/storage/upload/route.ts
    - src/app/api/storage/download/route.ts
    - src/lib/hooks/useStorageUpload.ts
  modified:
    - src/lib/storage/R2StorageAdapter.ts
    - src/components/ui/AudioPrepEditor.tsx

key-decisions:
  - "XHR over fetch for upload step 2 because fetch does not support upload progress events"
  - "JSON response (not redirect) for download route in R2 mode for client flexibility"
  - "Backward-compatible fallback to FormData ingest if storageKey not yet supported by ingest endpoint"
  - "Separate visual indicators for upload progress vs ingest/processing progress"

patterns-established:
  - "Two-step upload: POST /api/storage/upload for URL, then PUT file to that URL"
  - "Download route serves files directly in local dev with Range support (206 Partial Content)"
  - "useStorageUpload hook pattern for progress-tracked uploads across the app"

requirements-completed: [STOR-04]

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 12 Plan 03: Upload/Download API Routes and Progress-Tracked Upload Hook Summary

**Presigned upload/download API routes with XHR progress bar, Range request support for audio streaming, and R2 CORS documentation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T23:47:17Z
- **Completed:** 2026-02-20T23:52:52Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created upload API route that generates presigned URLs (R2) or handles direct file upload (local dev) with zod validation enforcing 500MB limit, key prefix restrictions, and path traversal prevention
- Created download API route with signed 7-day URLs (R2) or direct file serving with Range request support and content-type detection for audio streaming (local dev)
- Built useStorageUpload React hook using XHR for real-time upload progress tracking (0-100%), with status state machine and abort support
- Wired upload progress bar into AudioPrepEditor with separate visual indicators for upload vs processing phases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create presigned upload API route** - `faa5265` (feat)
2. **Task 2: Create signed download API route and document R2 CORS** - `60a7d0b` (feat)
3. **Task 3: Create useStorageUpload hook with progress bar and wire into AudioPrepEditor** - `11e6f4b` (feat)

## Files Created/Modified
- `src/app/api/storage/upload/route.ts` - POST for presigned URL generation, PUT for local direct upload with zod validation
- `src/app/api/storage/download/route.ts` - GET for signed download URL (R2) or direct file serving with Range support (local)
- `src/lib/hooks/useStorageUpload.ts` - React hook with XHR progress, status state machine, abort support
- `src/lib/storage/R2StorageAdapter.ts` - Added CORS configuration documentation block
- `src/components/ui/AudioPrepEditor.tsx` - Integrated useStorageUpload hook, added progress bar UI, backward-compatible fallback

## Decisions Made
- Used XHR instead of fetch for the upload step because the Fetch API does not support upload progress events (ReadableStream upload progress is not widely supported in browsers)
- Chose JSON response format for download route in R2 mode (not 302 redirect) for better client flexibility and avoiding CORS issues with redirects
- Added backward-compatible fallback in AudioPrepEditor: if the ingest endpoint doesn't recognize storageKey, it retries with the original FormData approach
- Separated upload progress (blue bar) from processing/ingest progress (purple bar) for clear user feedback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Buffer to Uint8Array conversion for NextResponse**
- **Found during:** Task 2
- **Issue:** TypeScript rejected `Buffer` as body for `NextResponse` (not assignable to `BodyInit`)
- **Fix:** Wrapped Buffer in `new Uint8Array()` for both full response and range response bodies
- **Files modified:** src/app/api/storage/download/route.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 60a7d0b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor TypeScript compatibility fix. No scope creep.

## Issues Encountered
None beyond the Buffer/Uint8Array type mismatch documented above.

## User Setup Required
R2 bucket configuration required for production deployment. See plan frontmatter `user_setup` section for:
- Cloudflare R2 bucket creation
- R2 API token with read/write permissions
- CORS policy configuration (documented in R2StorageAdapter.ts header)
- Environment variables: STORAGE_BACKEND, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

## Next Phase Readiness
- Upload/download API routes are live and ready for consumption
- LocalStorageAdapter URLs now resolve to working endpoints
- useStorageUpload hook available for any component needing file uploads
- AudioPrepEditor has progress-tracked uploads
- R2 CORS configuration documented for production deployment

## Self-Check: PASSED

- All 6 files (3 created, 2 modified, 1 summary) exist on disk
- All 3 task commits (faa5265, 60a7d0b, 11e6f4b) found in git log

---
*Phase: 12-cloud-storage-adapter*
*Completed: 2026-02-20*
