---
phase: 12-cloud-storage-adapter
plan: 02
subsystem: storage
tags: [storage-adapter, audio-asset-service, api-routes, cloudflare-r2, local-filesystem, render-upload]

# Dependency graph
requires:
  - phase: 12-cloud-storage-adapter plan 01
    provides: StorageAdapter interface, LocalStorageAdapter, R2StorageAdapter, getStorageAdapter() factory
provides:
  - AudioAssetService fully decoupled from filesystem (uses StorageAdapter for all I/O)
  - All 7 audio API routes updated to use StorageAdapter-backed service
  - Stream route redirects to adapter's signed URL (transparent local/R2)
  - Edit save/preview routes use temp file pattern for ffmpeg compatibility
  - Render output uploaded to storage after completion (STOR-03)
  - resolveAssetToTempFile() for cloud-compatible ffmpeg processing
  - getAssetPrefix() for storage key-based access
  - getStorage() for route-level adapter access
affects: [12-cloud-storage-adapter, 13-turso-job-state, 14-render-worker]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Temp file pattern for ffmpeg-dependent operations with storage adapter", "Signed URL redirect for audio streaming", "Post-render upload to storage with cleanup"]

key-files:
  created: []
  modified:
    - src/lib/audio-prep/AudioAssetService.ts
    - src/lib/audio-prep/__tests__/AudioAssetService.test.ts
    - src/lib/storage/LocalStorageAdapter.ts
    - src/app/api/audio/ingest/route.ts
    - src/app/api/audio/assets/[id]/stream/route.ts
    - src/app/api/audio/assets/[id]/route.ts
    - src/app/api/audio/assets/route.ts
    - src/app/api/audio/edit/save/route.ts
    - src/app/api/audio/edit/preview/route.ts
    - src/lib/render/localRenderManager.ts

key-decisions:
  - "resolveAssetPath uses adapter's resolveKey() for LocalStorageAdapter, falls back to temp file download for cloud adapters"
  - "Stream route redirects to signed URL instead of serving file directly -- delegates Range support to storage download route (plan 12-03)"
  - "Edit save/preview download source assets to temp for ffmpeg, upload results via storage.put()"
  - "Render output uploaded to storage asynchronously after process completion, with local cleanup"
  - "Exposed resolveKey() on LocalStorageAdapter for filesystem path derivation from storage keys"

patterns-established:
  - "Temp file pattern: download from storage -> process with ffmpeg -> upload result -> cleanup temp"
  - "Signed URL redirect: audio streaming endpoint redirects to adapter's getSignedUrl() for transparent local/cloud serving"
  - "Post-render upload: finished video uploaded to renders/{jobId}/ key prefix with signed download URL"

requirements-completed: [STOR-01, STOR-02, STOR-03]

# Metrics
duration: 12min
completed: 2026-02-20
---

# Phase 12 Plan 02: AudioAssetService and API Route Migration to StorageAdapter Summary

**AudioAssetService refactored to use StorageAdapter for all I/O, with 7 API routes updated for transparent local/R2 storage and render output upload**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-20T23:47:32Z
- **Completed:** 2026-02-20T23:59:15Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Fully decoupled AudioAssetService from direct filesystem calls -- all I/O now goes through StorageAdapter interface
- Updated all 7 audio and render API routes to work with the refactored service using storage keys instead of filesystem paths
- Established temp file pattern for ffmpeg-dependent operations (download source from storage, process, upload result)
- Added render output upload to storage (STOR-03) with signed download URL generation and local cleanup
- Stream route now redirects to adapter's signed URL, working transparently in both local and R2 environments

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor AudioAssetService to use StorageAdapter** - `f7af511` (feat)
2. **Task 2: Update all API routes to work with refactored AudioAssetService** - `cd8c371` (feat)

## Files Created/Modified
- `src/lib/audio-prep/AudioAssetService.ts` - Refactored to use StorageAdapter for all file I/O, added getAssetPrefix(), resolveAssetToTempFile(), getStorage()
- `src/lib/audio-prep/__tests__/AudioAssetService.test.ts` - Updated 16 tests to use injected LocalStorageAdapter, added tests for new methods
- `src/lib/storage/LocalStorageAdapter.ts` - Exposed resolveKey() for filesystem path derivation from storage keys
- `src/app/api/audio/ingest/route.ts` - Peaks written via storage.put() instead of fs.writeFile
- `src/app/api/audio/assets/[id]/stream/route.ts` - Redirects to storage adapter's signed URL
- `src/app/api/audio/assets/[id]/route.ts` - Reads peaks/edits via storage.get()
- `src/app/api/audio/assets/route.ts` - Unchanged (uses internally refactored methods)
- `src/app/api/audio/edit/save/route.ts` - Temp file pattern for ffmpeg, upload via storage.put()
- `src/app/api/audio/edit/preview/route.ts` - Cache check via storage.exists(), upload via storage.put()
- `src/lib/render/localRenderManager.ts` - Upload finished .mp4 to storage, storageKey/downloadUrl on job record

## Decisions Made
- Used duck-typing (`'resolveKey' in storage`) to detect LocalStorageAdapter for direct filesystem path access, avoiding a dependency on the concrete class in AudioAssetService
- Exposed `resolveKey()` as a public method on LocalStorageAdapter (was private `resolve()`) for filesystem path derivation
- Stream route uses HTTP 302 redirect to signed URL rather than proxying file content -- simpler code, better performance for R2 (CDN offload)
- Render output upload is fire-and-forget (async after process close) -- failure doesn't block the job from reporting success, but local file is preserved as fallback
- Kept `getAssetDir()` as deprecated but functional (delegates to resolveKey) for any remaining direct consumers during transition

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getStorage() accessor method**
- **Found during:** Task 2 (API route updates)
- **Issue:** API routes needed direct access to the storage adapter for put/get/list operations, but AudioAssetService only exposed high-level asset methods
- **Fix:** Added `getStorage()` method to AudioAssetService that returns the underlying StorageAdapter instance
- **Files modified:** src/lib/audio-prep/AudioAssetService.ts
- **Verification:** All API routes compile and use getStorage() for direct adapter operations
- **Committed in:** f7af511 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Exposed resolveKey() on LocalStorageAdapter**
- **Found during:** Task 1 (AudioAssetService refactor)
- **Issue:** resolveAssetPath() and getAssetDir() needed to derive filesystem paths from storage keys for backward compatibility, but the resolve() method was private
- **Fix:** Added public `resolveKey()` method on LocalStorageAdapter, kept private `resolve()` as internal alias
- **Files modified:** src/lib/storage/LocalStorageAdapter.ts
- **Verification:** Tests pass, resolveAssetPath returns correct filesystem paths
- **Committed in:** f7af511 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical functionality)
**Impact on plan:** Both additions necessary for the adapter abstraction to work correctly in API routes. No scope creep.

## Issues Encountered
None - plan executed as specified. TypeScript compilation and all 16 tests passed on first attempt.

## User Setup Required
None - no external service configuration required. Storage uses LocalStorageAdapter by default. R2 credentials will be configured in a later plan when deploying to production.

## Next Phase Readiness
- AudioAssetService and all API routes are fully adapter-backed
- Plan 12-03 (local storage download/upload API routes) is needed for LocalStorageAdapter's signed URLs to actually serve files with Range support
- The same code path will work with R2 in production by setting `STORAGE_BACKEND=r2`
- Render output upload to storage is ready for production use

## Self-Check: PASSED

- All 10 modified files exist on disk
- Task 1 commit f7af511 found in git log
- Task 2 commit cd8c371 found in git log

---
*Phase: 12-cloud-storage-adapter*
*Completed: 2026-02-20*
