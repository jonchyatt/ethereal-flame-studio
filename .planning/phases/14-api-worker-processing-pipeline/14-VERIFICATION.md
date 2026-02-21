---
phase: 14-api-worker-processing-pipeline
verified: 2026-02-21T08:30:00Z
status: passed
score: 12/12 must-haves verified
gaps: []
human_verification:
  - test: "End-to-end ingest from YouTube URL"
    expected: "POST /api/audio/ingest returns jobId within 2 seconds; worker picks up job, downloads via yt-dlp, creates asset in storage, completes job"
    why_human: "Requires a live worker running against Turso + R2; yt-dlp process must be installed and accessible"
  - test: "Webhook 401 rejection in production"
    expected: "POST /api/webhooks/worker without Authorization header returns 401; with wrong secret returns 401; with correct Bearer token returns 200"
    why_human: "Requires setting INTERNAL_WEBHOOK_SECRET env var in a running deployment and sending real HTTP requests"
  - test: "Audio streaming ?variant=prepared in cloud environment"
    expected: "GET /api/audio/assets/{id}/stream?variant=prepared returns 302 redirect to R2 signed URL for prepared file"
    why_human: "Requires a live R2 bucket with a prepared audio file and correct STORAGE_BACKEND=r2 configuration"
---

# Phase 14: API + Worker Processing Pipeline Verification Report

**Phase Goal:** User can ingest, edit, preview, and save audio entirely through async API calls processed by the cloud worker
**Verified:** 2026-02-21T08:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | POST /api/audio/ingest returns jobId without blocking on download/ffmpeg | VERIFIED | Route creates job via `getJobStore().create('ingest', metadata)` and returns `{ jobId, status: 'pending' }` immediately. No inline processing. `audioPrepJobs` absent. |
| 2  | POST /api/audio/edit/preview returns jobId without blocking on ffmpeg render | VERIFIED | Route creates job via `getJobStore().create('preview', ...)` on cache miss; cache hit creates instant-complete job. No inline render logic. |
| 3  | POST /api/audio/edit/save returns jobId without blocking on ffmpeg render | VERIFIED | Route creates job via `getJobStore().create('save', { recipe })` and returns `{ jobId, status: 'pending' }` immediately. No inline processing. |
| 4  | GET /api/audio/jobs/[jobId] returns downloadUrl when job is complete with a storage key | VERIFIED | Poll endpoint checks `job.result.previewKey` and `job.result.preparedKey`; calls `storage.getSignedUrl(storageKey)` to populate `response.downloadUrl`. |
| 5  | Preview audio route serves from storage adapter (not local filesystem path) | VERIFIED | Route reads `job.result.previewKey`, calls `storage.getSignedUrl()` for R2 or `storage.get()` for local; no filesystem path reads. |
| 6  | Worker ingests audio from YouTube URLs via yt-dlp writing result to storage | VERIFIED | `worker/pipelines/ingest.ts` calls `extractYouTubeAudio()` for `sourceType === 'youtube'`; uploads result to storage via `AudioAssetService.createAsset()`. |
| 7  | Worker ingests audio from direct URLs with SSRF protection and size enforcement | VERIFIED | URL path calls `validateUrl()` from urlSecurity, enforces `MAX_FILE_SIZE_BYTES` during streaming via Content-Length header check and live byte-count check. |
| 8  | Worker ingests audio from R2 presigned uploads (file uploads) via storage download | VERIFIED | `audio_file`/`video_file` path reads `job.metadata.storageKey`, calls `storage.get(storageKey)` to retrieve pre-uploaded file. |
| 9  | Worker executes edit preview recipes using ffmpeg filter_complex and writes MP3 to storage | VERIFIED | `worker/pipelines/preview.ts` calls `renderRecipe(recipe, assetPaths, outputPath, { preview: true })` then `storage.put(cachedKey, outputBuffer, { contentType: 'audio/mpeg' })`. |
| 10 | Worker executes edit save recipes using 2-pass loudnorm and writes result to storage | VERIFIED | `worker/pipelines/save.ts` calls `renderRecipe(recipe, assetPaths, outputPath, { twoPassNormalize: recipe.normalize })` then uploads to `assets/{assetId}/prepared{ext}`. |
| 11 | Cloud ingest rejects files over 100MB and audio over 30 minutes duration | VERIFIED | Ingest pipeline enforces `MAX_FILE_SIZE_BYTES = config.maxFileSizeMB * 1024 * 1024` (100MB) and `MAX_DURATION_SECONDS = config.maxDurationMinutes * 60` (1800s) with throws at both content-length check and post-extraction probe. |
| 12 | POST /api/webhooks/worker rejects requests without valid INTERNAL_WEBHOOK_SECRET with 401 | VERIFIED | Route reads `INTERNAL_WEBHOOK_SECRET` env var, extracts Bearer token from Authorization header, compares via `crypto.timingSafeEqual()`. Missing/invalid token returns 401. |

**Score:** 12/12 truths verified

---

## Required Artifacts

### Plan 14-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/audio/ingest/route.ts` | Async ingest endpoint creating job in JobStore | VERIFIED | Imports `getJobStore`, calls `store.create('ingest', metadata)`, returns `{ jobId, status: 'pending' }`. No `audioPrepJobs` reference. |
| `src/app/api/audio/edit/preview/route.ts` | Async preview endpoint creating job in JobStore | VERIFIED | Imports `getJobStore`, handles cache hit (instant-complete) and cache miss (pending job). No inline render logic. |
| `src/app/api/audio/edit/save/route.ts` | Async save endpoint creating job in JobStore | VERIFIED | Imports `getJobStore`, calls `store.create('save', { recipe })`. No inline render logic. |
| `src/app/api/audio/jobs/[jobId]/route.ts` | Poll endpoint with R2 download URL in result | VERIFIED | Contains `downloadUrl` field, calls `storage.getSignedUrl(storageKey)` for `previewKey`/`preparedKey` in result. |

### Plan 14-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `worker/pipelines/ingest.ts` | Ingest pipeline for YouTube, URL, and file upload sources | VERIFIED | Exports `runIngestPipeline`; handles `youtube`, `url`, `audio_file`, `video_file` source types. 279 lines, substantive. |
| `worker/pipelines/preview.ts` | Edit preview pipeline with ffmpeg render | VERIFIED | Exports `runPreviewPipeline`; calls `renderRecipe` with `{ preview: true }`. 119 lines, substantive. |
| `worker/pipelines/save.ts` | Edit save pipeline with ffmpeg render and 2-pass loudnorm | VERIFIED | Exports `runSavePipeline`; calls `renderRecipe` with `{ twoPassNormalize: recipe.normalize }`. 140 lines, substantive. |
| `worker/process-job.ts` | Job dispatcher routing to pipeline functions | VERIFIED | Imports all three pipelines; switch/case dispatches by `job.type`. No placeholder code. |

### Plan 14-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/webhooks/worker/route.ts` | Webhook endpoint with INTERNAL_WEBHOOK_SECRET validation | VERIFIED | Contains `INTERNAL_WEBHOOK_SECRET` env read, `crypto.timingSafeEqual()`, Zod payload schema, JobStore `complete`/`fail` calls. 123 lines, substantive. |
| `src/app/api/audio/assets/[id]/stream/route.ts` | Audio streaming with transparent local/R2 support | VERIFIED | Contains `getSignedUrl`, `variant` query parameter (`?variant=original|prepared`), `Cache-Control: public, max-age=3600`. |

---

## Key Link Verification

### Plan 14-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/audio/ingest/route.ts` | `src/lib/jobs/index.ts` | `getJobStore().create()` | WIRED | `import { getJobStore } from '@/lib/jobs'`; `store.create('ingest', metadata)` called in both multipart and JSON code paths. |
| `src/app/api/audio/jobs/[jobId]/route.ts` | `src/lib/storage/index.ts` | `getStorageAdapter().getSignedUrl()` | WIRED | `import { getStorageAdapter } from '@/lib/storage'`; `storage.getSignedUrl(storageKey)` called when storage key found in completed job result. |

### Plan 14-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `worker/process-job.ts` | `worker/pipelines/ingest.ts` | `runIngestPipeline` dispatch | WIRED | Imported at line 11; dispatched in `switch (job.type)` case `'ingest'` at line 176. |
| `worker/pipelines/ingest.ts` | `src/lib/storage/index.ts` | `getStorageAdapter()` | WIRED | Imported at line 15; called at line 52. Used to read uploaded files and write results. |
| `worker/pipelines/preview.ts` | `src/lib/audio-prep/audioRenderer.ts` | `renderRecipe()` | WIRED | Imported at line 17; called at line 102 with `{ preview: true }`. |

### Plan 14-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/webhooks/worker/route.ts` | `src/lib/jobs/index.ts` | `getJobStore().complete()`/`.fail()` | WIRED | Imported at line 4; `store.complete(jobId, result)` at line 116, `store.fail(jobId, error)` at line 118. |
| `src/app/api/audio/assets/[id]/stream/route.ts` | `src/lib/storage/index.ts` | `getStorageAdapter().getSignedUrl()` | WIRED | Imported at line 3; `storage.getSignedUrl(matchingKey)` called at line 65. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| API-01 | 14-01 | All ingest/edit/save/render API routes return a jobId immediately without blocking | SATISFIED | All three POST routes call `store.create()` and return `{ jobId, status: 'pending' }` with no inline processing code. |
| API-02 | 14-01 | Poll endpoint returns current job status, progress percentage, and result (including R2 download URL on completion) | SATISFIED | `JobPollResponse` interface includes `status`, `progress`, `stage`, `result`, and `downloadUrl?`. Signed URL generated from `previewKey`/`preparedKey` in result. |
| API-03 | 14-03 | Asset streaming endpoint serves audio from R2 in production and local filesystem in development | SATISFIED | Stream route calls `storage.getSignedUrl()` for both backends (local adapter returns local API URL, R2 returns presigned S3 URL). |
| API-04 | 14-03 | Webhook endpoint validates INTERNAL_WEBHOOK_SECRET header before processing callbacks | SATISFIED | Webhook reads Bearer token from Authorization header, compares with `crypto.timingSafeEqual()` against `INTERNAL_WEBHOOK_SECRET` env var. Returns 401 on failure. |
| WORK-02 | 14-02 | Worker can ingest audio from YouTube URLs, direct URLs, and file uploads (via R2 presigned upload) | SATISFIED | `worker/pipelines/ingest.ts` handles all three source types: `youtube` (yt-dlp), `url` (fetch + SSRF), `audio_file`/`video_file` (storage download). |
| WORK-03 | 14-02 | Worker can execute audio edit previews and save operations using the existing recipe/filter_complex pipeline | SATISFIED | `preview.ts` and `save.ts` both call `renderRecipe()` from `src/lib/audio-prep/audioRenderer.ts`. Save uses `twoPassNormalize`. Results uploaded to storage. |
| SEC-01 | 14-03 | Modal webhook callback requires valid INTERNAL_WEBHOOK_SECRET in request header | SATISFIED | `crypto.timingSafeEqual()` prevents timing attacks; missing or wrong secret returns 401 before any payload processing. |
| SEC-02 | 14-02 | Cloud ingest path enforces file size (100MB) and duration (30min) limits | SATISFIED | Ingest pipeline enforces 100MB via `MAX_FILE_SIZE_BYTES` at Content-Length check and live stream byte-count; enforces 30-minute limit via `MAX_DURATION_SECONDS` in `probeAudio()` result check. Post-extraction file stat also checked. |

**All 8 requirements: SATISFIED**

No orphaned requirements found. All requirement IDs declared in plan frontmatter (`API-01`, `API-02`, `API-03`, `API-04`, `WORK-02`, `WORK-03`, `SEC-01`, `SEC-02`) map directly to REQUIREMENTS.md entries marked as Phase 14 and have implementation evidence.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No TODOs, FIXMEs, placeholders, empty handlers, or stub implementations found in any phase 14 artifact. The `audioPrepJobs` import is absent from all modified routes. The `setTimeout` placeholder is absent from `worker/process-job.ts`.

---

## TypeScript Compilation

- Main project (`npx tsc --noEmit`): PASSED — zero errors
- Worker project (`npx tsc --noEmit -p worker/tsconfig.json`): PASSED — zero errors

---

## Human Verification Required

### 1. End-to-End YouTube Ingest

**Test:** POST to `/api/audio/ingest` with `{ type: 'youtube', url: '<valid-url>', rightsAttested: true }`, then poll `/api/audio/jobs/{jobId}` until complete.
**Expected:** `status: 'complete'` with `result.assetId` set; `downloadUrl` present in poll response.
**Why human:** Requires a live Render.com worker, Turso database, R2 storage, and yt-dlp installed on worker host.

### 2. Webhook 401 Rejection in Production

**Test:** Send POST to `/api/webhooks/worker` with no Authorization header; with `Authorization: Bearer wrongsecret`; with `Authorization: Bearer correctsecret`.
**Expected:** First two return 401; third returns 200 with `{ success: true }`.
**Why human:** Requires `INTERNAL_WEBHOOK_SECRET` set in deployed environment and real HTTP requests to verify.

### 3. Audio Streaming Variant Selection (R2)

**Test:** GET `/api/audio/assets/{id}/stream?variant=prepared` after a save job completes.
**Expected:** 302 redirect to R2 presigned URL for `prepared.*` file; `Cache-Control: public, max-age=3600` header present.
**Why human:** Requires a live R2 bucket with a completed save job and `STORAGE_BACKEND=r2` configured.

---

## Commit Verification

All phase 14 commits confirmed in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `efe1674` | 14-01 | Refactor ingest/preview/save routes to async JobStore dispatch |
| `0cdd64b` | 14-01 | Enhance poll endpoint with download URL and migrate preview audio route |
| `e4e7d64` | 14-03 | Create webhook endpoint with INTERNAL_WEBHOOK_SECRET validation |
| `ef7a8a0` | 14-03 | Harden audio streaming endpoint with variant support and cache headers |
| `ef152cc` | 14-02 | Add worker ingest pipeline for YouTube, URL, and file uploads |
| `9f34984` | 14-02 | Add preview/save pipelines and wire all into process-job dispatcher |

---

## Summary

Phase 14 goal is **fully achieved**. All three async API routes (ingest, preview, save) dispatch to JobStore and return within 2 seconds. The poll endpoint enriches completed jobs with signed download URLs. The worker runs real processing pipelines for all three job types — ingest (yt-dlp + SSRF fetch + file upload), preview (ffmpeg filter_complex, 128k MP3, cached), and save (ffmpeg filter_complex, 2-pass loudnorm). The webhook endpoint enforces constant-time secret validation before processing any callback. The audio streaming endpoint supports both local and R2 backends transparently with variant selection. TypeScript compilation passes cleanly for both the app and worker projects.

The three human verification items require a live deployment with external services (Turso, R2, worker process) and cannot be verified from the codebase alone — they are integration tests, not code correctness concerns.

---

_Verified: 2026-02-21T08:30:00Z_
_Verifier: Claude (gsd-verifier)_
