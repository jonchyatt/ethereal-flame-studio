---
phase: 17-integration-wiring-fixes
verified: 2026-02-22T00:00:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "FLOW-01 and FLOW-02 E2E smoke test"
    expected: "Audio ingest and audio edit/save flows complete without 404 errors when polling legacy routes"
    why_human: "Requires a live server with a running worker and a submitted job — cannot verify runtime round-trip from static analysis"
---

# Phase 17: Integration Wiring Fixes — Verification Report

**Phase Goal:** All job poll and cancel paths in the API and worker use the getJobStore() factory so job state is consistent between web and worker in all environments
**Verified:** 2026-02-22
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Polling `/api/audio/ingest/<jobId>` returns job status (not 404) for async POST-created jobs | VERIFIED | Route calls `getJobStore().get(jobId)`, returns `{ success: true, data: {...} }` on hit, 404 on miss |
| 2 | Polling `/api/audio/edit/save/<jobId>` and `/api/audio/edit/preview/<jobId>` return correct job status | VERIFIED | Both routes identical to ingest: `getJobStore().get(jobId)` with `{ success, data }` wrapper |
| 3 | Cancelling via legacy DELETE paths reaches worker via shared JobStore (not in-memory) | VERIFIED | DELETE handlers call `store.cancel(jobId)` on the persistent store; no in-memory Map involved |
| 4 | Running `npm run worker` locally without TURSO_DATABASE_URL uses LocalJobStore and starts without error | VERIFIED | worker/index.ts has no TURSO_DATABASE_URL guard; `getJobStore()` factory defaults to LocalJobStore when DEPLOY_ENV != 'production' |
| 5 | FLOW-01 (Audio Ingest) and FLOW-02 (Audio Edit+Save) E2E flows complete without 404 errors | ? HUMAN NEEDED | Requires live server + worker + submitted job; static analysis confirms the route wiring but cannot verify runtime round-trip |

**Score (automated):** 4/5 success criteria verified by static analysis. 1 requires human runtime test.

### Plan 01 Must-Have Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Polling `/api/audio/ingest/<jobId>` returns 200 with job status | VERIFIED | GET handler: `store.get(jobId)` -> 200 `{ success: true, data: {...} }` |
| 2 | Polling `/api/audio/edit/save/<jobId>` returns 200 with job status | VERIFIED | Identical implementation verified |
| 3 | Polling `/api/audio/edit/preview/<jobId>` returns 200 with job status | VERIFIED | Identical implementation verified |
| 4 | DELETE on any of the 3 legacy routes transitions job to cancelled via shared JobStore | VERIFIED | All 3 DELETE handlers call `store.cancel(jobId)` via `getJobStore()` factory |
| 5 | Polling a non-existent jobId returns 404 | VERIFIED | All 3 GET handlers: `if (!job) return NextResponse.json({...}, { status: 404 })` |
| 6 | AudioPrepEditor.tsx polling loops work without modification (backward-compatible `{ success, data }` wrapper) | VERIFIED | GET handlers return `{ success: true/false, data: {...} }`; AudioPrepEditor.tsx reads `data.success`, `data.data.progress`, `data.data.status`, `data.data.result` — shapes match exactly (lines 337-370, 484-509) |

### Plan 02 Must-Have Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running `npm run worker` locally without TURSO_DATABASE_URL uses LocalJobStore | VERIFIED | worker/index.ts line 47: `const store: JobStore = getJobStore()`. Factory defaults to `local` backend when DEPLOY_ENV != 'production'. No TURSO_DATABASE_URL guard in worker. |
| 2 | Running worker with TURSO_DATABASE_URL set uses TursoJobStore | VERIFIED | `getJobStore()` in `src/lib/jobs/index.ts` selects `turso` backend when `JOB_STORE_BACKEND=turso` or `DEPLOY_ENV=production` |
| 3 | Setting `JOB_STORE_BACKEND=local` explicitly forces LocalJobStore | VERIFIED | Factory reads `process.env.JOB_STORE_BACKEND` first (line 22 of index.ts); `local` -> `LocalJobStore` |
| 4 | Worker shutdown closes database connection for both backends | VERIFIED | Shutdown handler uses generic `'close' in store && typeof store.close === 'function'` check (line 123-125), compatible with both backends |

**Score (automated):** 9/10 must-have truths verified. 1 requires human runtime verification.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/audio/ingest/[jobId]/route.ts` | Ingest poll/cancel route using getJobStore() | VERIFIED | 81 lines. Imports `getJobStore` from `@/lib/jobs`. No JobManager import. GET + DELETE handlers fully implemented with error handling. |
| `src/app/api/audio/edit/save/[jobId]/route.ts` | Save poll/cancel route using getJobStore() | VERIFIED | 81 lines. Identical structure to ingest route. getJobStore() wired. |
| `src/app/api/audio/edit/preview/[jobId]/route.ts` | Preview poll/cancel route using getJobStore() | VERIFIED | 81 lines. Identical structure to ingest route. getJobStore() wired. |
| `worker/index.ts` | Worker entry point using getJobStore() factory | VERIFIED | Line 10: `import { getJobStore } from '../src/lib/jobs'`. Line 47: `const store: JobStore = getJobStore()`. No TursoJobStore import. No TURSO_DATABASE_URL guard. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/audio/ingest/[jobId]/route.ts` | `src/lib/jobs/index.ts` | `getJobStore()` factory import | WIRED | Line 2: `import { getJobStore } from '@/lib/jobs'`; used at lines 10, 50 |
| `src/app/api/audio/edit/save/[jobId]/route.ts` | `src/lib/jobs/index.ts` | `getJobStore()` factory import | WIRED | Line 2: `import { getJobStore } from '@/lib/jobs'`; used at lines 10, 50 |
| `src/app/api/audio/edit/preview/[jobId]/route.ts` | `src/lib/jobs/index.ts` | `getJobStore()` factory import | WIRED | Line 2: `import { getJobStore } from '@/lib/jobs'`; used at lines 10, 50 |
| `worker/index.ts` | `src/lib/jobs/index.ts` | `getJobStore()` factory import | WIRED | Line 10: `import { getJobStore } from '../src/lib/jobs'`; used at line 47 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| JOB-01 | 17-01-PLAN | All job and asset metadata persisted in Turso cloud database (replacing local better-sqlite3) | SATISFIED | All 3 routes now use `getJobStore()` which selects TursoJobStore in production. In-memory Map completely removed from poll routes. |
| JOB-03 | 17-01-PLAN | User can see job progress (percentage, stage) by polling the API | SATISFIED | GET handlers return `progress`, `stage`, `status` fields from persistent store. AudioPrepEditor reads `data.data.progress` from these routes. |
| JOB-04 | 17-01-PLAN | User can cancel a running job, and worker stops processing within one poll cycle | SATISFIED | DELETE handlers call `store.cancel(jobId)` on the shared persistent store — the same store the worker polls. Terminal state check (409) prevents re-cancellation. |
| DEPLOY-01 | 17-02-PLAN | Application switches between local and production mode based on environment variables (no code changes) | SATISFIED | `getJobStore()` factory selects backend via `JOB_STORE_BACKEND` or `DEPLOY_ENV`. Worker and all API routes now use the same factory. No hardcoded backends remain in poll/cancel paths. |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps JOB-01, JOB-03, JOB-04, DEPLOY-01 to Phase 17 — all four are claimed by plans 17-01 and 17-02. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `worker/index.ts` | 122 | `// Close database connection (works for both LocalJobStore and TursoJobStore)` | Info | Comment only — references TursoJobStore by name but no import. Non-issue. |

No TODO/FIXME/HACK/PLACEHOLDER comments found in any of the 4 modified files. No empty implementations, no stub return values, no console-only handlers.

---

## Human Verification Required

### 1. E2E Flow Smoke Test (FLOW-01 and FLOW-02)

**Test:** Start the dev server and worker. Submit an audio ingest job via the UI. While the job is processing, observe the AudioPrepEditor progress bar. After completion, verify the asset appears. Then submit an audio edit preview and save job, verify progress updates.

**Expected:** Progress percentage updates every ~1 second while job is running. Ingest completes and the new asset appears in the asset list. Edit save completes and the prepared asset is marked ready. No 404 errors in browser network tab during polling.

**Why human:** Requires a live Next.js server, a running worker process, actual audio input, and observation of the real-time polling loop completing. Static analysis confirms the routing and response shapes are correct, but runtime integration (job created by POST route, polled by GET route, processed by worker — all hitting the same JobStore instance) can only be confirmed by running the full stack.

---

## Commit Verification

| Commit | Description | Status |
|--------|-------------|--------|
| `bb6896c` | feat(17-01): rewire ingest poll/cancel route | FOUND |
| `3c1c0a6` | feat(17-01): rewire edit/save and edit/preview routes | FOUND |
| `2598869` | fix(17-02): replace hardcoded TursoJobStore with getJobStore() factory in worker | FOUND |

---

## Gaps Summary

No gaps found in automated verification. All 4 artifacts exist, are substantive (not stubs), and are fully wired to `getJobStore()`. No legacy `audioPrepJobs` or `JobManager` imports remain in any of the 3 API routes. No `import { TursoJobStore }` remains in `worker/index.ts`. TypeScript compiles with zero errors.

The single item requiring human verification is the E2E runtime integration test (Success Criterion 5 from ROADMAP.md). This is expected and appropriate — static analysis cannot substitute for observing a live polling loop complete across the web/worker boundary.

---

_Verified: 2026-02-22_
_Verifier: Claude (gsd-verifier)_
