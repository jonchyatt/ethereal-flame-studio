---
phase: 14-api-worker-processing-pipeline
plan: 02
subsystem: worker
tags: [ffmpeg, yt-dlp, worker, pipeline, audio-processing, r2]

# Dependency graph
requires:
  - phase: 13-job-state-worker-infra
    provides: "Worker poll loop, heartbeat, cancellation detection, processJob shell"
  - phase: 14-01
    provides: "JobStore API routes dispatching ingest/preview/save jobs to storage"
provides:
  - "runIngestPipeline: YouTube, URL, and file upload audio ingestion"
  - "runPreviewPipeline: ffmpeg filter_complex preview render with cache"
  - "runSavePipeline: ffmpeg filter_complex save render with 2-pass loudnorm"
  - "processJob dispatcher routing all job types to pipeline modules"
affects: [15-frontend-cloud-migration, 16-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [temp-file-pipeline, storage-download-process-upload, pipeline-module-per-job-type]

key-files:
  created:
    - worker/pipelines/ingest.ts
    - worker/pipelines/preview.ts
    - worker/pipelines/save.ts
  modified:
    - worker/process-job.ts
    - worker/tsconfig.json

key-decisions:
  - "Pipeline modules export single async function matching processJob signature (store, job, childRef)"
  - "Source assets downloaded to temp dir, processed, uploaded to storage, temp cleaned in finally block"
  - "Preview pipeline checks storage cache before rendering (same key pattern as API route)"
  - "Save pipeline removes previous prepared.* files before writing new output"

patterns-established:
  - "Temp file pattern: download from storage -> process with ffmpeg/yt-dlp -> upload result -> cleanup"
  - "Pipeline function signature: (store, job, childRef) -> Promise<void> with granular progress reporting"
  - "Source asset resolution: list storage keys, find original.*, download to temp"

requirements-completed: [WORK-02, WORK-03, SEC-02]

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 14 Plan 02: Worker Processing Pipelines Summary

**Three pipeline modules (ingest, preview, save) wired into worker dispatcher with ffmpeg/yt-dlp processing, storage adapter I/O, and SEC-02 size/duration enforcement**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T07:38:52Z
- **Completed:** 2026-02-21T07:43:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Worker ingest pipeline handles YouTube (yt-dlp), direct URL (fetch + SSRF), and file upload (storage download) sources
- Preview pipeline renders 128k MP3 via ffmpeg filter_complex with storage-backed cache check
- Save pipeline renders high-quality output with 2-pass loudnorm and persists recipe JSON
- SEC-02 enforcement: 100MB file size limit, 30-minute duration limit on all ingests
- All placeholder code removed from processJob, replaced with actual pipeline dispatch

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ingest pipeline module for the worker** - `ef152cc` (feat)
2. **Task 2: Create preview and save pipeline modules, wire all pipelines into process-job dispatcher** - `9f34984` (feat)

## Files Created/Modified
- `worker/pipelines/ingest.ts` - Ingest pipeline: YouTube, URL, file upload audio ingestion with SEC-02 enforcement
- `worker/pipelines/preview.ts` - Preview pipeline: ffmpeg filter_complex render with storage cache
- `worker/pipelines/save.ts` - Save pipeline: ffmpeg filter_complex render with 2-pass loudnorm
- `worker/process-job.ts` - Updated dispatcher routing to pipeline modules, removed placeholders
- `worker/tsconfig.json` - Added storage and audio-prep module paths to include

## Decisions Made
- Pipeline modules export a single async function matching processJob signature (store, job, childRef) for consistent dispatch
- Source assets downloaded to OS temp dir, processed, uploaded to storage, temp cleaned in finally block -- prevents disk leak
- Preview pipeline checks storage cache before rendering (same cache key pattern the API route uses for instant-complete jobs)
- Save pipeline removes previous prepared.* files before writing new output to prevent stale files in storage
- Video file ingest extracts audio via ffmpeg to pcm_s16le WAV before probing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three pipeline modules compiled and wired into worker dispatcher
- Worker can process ingest, preview, and save jobs end-to-end
- Ready for Phase 15 frontend cloud migration and Phase 16 deployment

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 14-api-worker-processing-pipeline*
*Completed: 2026-02-21*
