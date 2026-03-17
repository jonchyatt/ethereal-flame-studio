---
phase: 12-foundation-migration
plan: 02
subsystem: scheduler
tags: [croner, cron, sqlite, drizzle, pm2, scheduler]

# Dependency graph
requires:
  - phase: 12-01
    provides: "standalone jarvis repo with Drizzle schema and PM2 deployment"
provides:
  - "scheduled_tasks table in Turso DB"
  - "taskStore.ts CRUD for scheduled task management"
  - "DB-driven cronRunner v2 with 60-second hot-reload"
  - "start-cron.js PM2 launcher with .env.local loading"
affects: [13-mcp-tools, 17-agent-zero-absorption]

# Tech tracking
tech-stack:
  added: [croner]
  removed: [node-cron, "@types/node-cron"]
  patterns: [handler-registry, db-driven-scheduling, hot-reload-polling]

key-files:
  created:
    - src/lib/jarvis/scheduler/taskStore.ts
    - scripts/start-cron.js
  modified:
    - src/lib/jarvis/scheduler/cronRunner.ts
    - src/lib/jarvis/data/schema.ts
    - ecosystem.config.js
    - package.json

key-decisions:
  - "croner over node-cron: zero deps, native timezone, ESM-compatible"
  - "Handler registry pattern: named handlers mapped to async functions for extensibility"
  - "60-second poll interval for hot-reload: balance between responsiveness and DB load"
  - "System task protection: isSystem flag prevents accidental deletion of core tasks"
  - "start-cron.js launcher: mirrors start-web.js pattern for .env.local loading on Windows PM2"

patterns-established:
  - "Handler registry: HANDLERS record maps string names to async functions"
  - "PM2 launcher scripts: load .env.local, strip CLAUDECODE, spawn child process"
  - "System vs user tasks: isSystem boolean for deletion protection"

requirements-completed: [FOUND-03]

# Metrics
duration: 7min
completed: 2026-03-17
---

# Phase 12 Plan 02: DB-Driven Flexible Scheduler Summary

**DB-driven cron scheduler with croner, scheduled_tasks table, full CRUD taskStore, and 60-second hot-reload replacing hardcoded node-cron**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-17T12:29:13Z
- **Completed:** 2026-03-17T12:36:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced hardcoded node-cron with DB-driven croner scheduler
- Created taskStore.ts with full CRUD (list/add/edit/remove/toggle/seed)
- Daily reflection migrated as system task, seeded automatically on first run
- Hot-reload polls DB every 60 seconds for task changes without process restart

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scheduled_tasks schema and create taskStore CRUD** - `d14353a` (feat)
2. **Task 2: Rewrite cronRunner.ts with croner and DB-driven hot-reload** - `b5533e6` (feat)

## Files Created/Modified
- `src/lib/jarvis/scheduler/taskStore.ts` - CRUD operations for scheduled_tasks table
- `src/lib/jarvis/scheduler/cronRunner.ts` - DB-driven scheduler with croner and hot-reload
- `src/lib/jarvis/data/schema.ts` - scheduledTasks table definition (already present from prior work)
- `scripts/start-cron.js` - PM2 launcher that loads .env.local
- `ecosystem.config.js` - Updated cron process to use launcher pattern
- `package.json` - Swapped node-cron for croner

## Decisions Made
- Used croner over node-cron: zero dependencies, native timezone support, ESM-compatible
- Handler registry pattern: named string handlers mapped to async functions, easily extensible for Phase 17 Agent Zero absorption
- Created start-cron.js launcher to match existing start-web.js pattern (PM2 on Windows does not reliably pass env vars)
- System task protection via isSystem flag prevents accidental deletion of core scheduled jobs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PM2 process failed to start without env vars**
- **Found during:** Task 2 (cronRunner rewrite)
- **Issue:** PM2 ecosystem config used `cmd /c npx tsx` interpreter which failed on Windows. Also, DATABASE_URL not available to cron process (only in .env.local, not PM2 env)
- **Fix:** Created `scripts/start-cron.js` launcher (mirrors existing start-web.js pattern) that loads .env.local via dotenv before spawning tsx. Updated ecosystem.config.js to use node interpreter with launcher script.
- **Files modified:** scripts/start-cron.js (created), ecosystem.config.js (modified)
- **Verification:** `pm2 logs jarvis-cron` shows "cron runner v2 starting" and "1 task(s) active"
- **Committed in:** b5533e6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for process to start. No scope creep.

## Issues Encountered
- `drizzle-kit push` requires TTY for interactive prompts, which is unavailable in non-interactive shells. Worked around by executing CREATE TABLE SQL directly via libsql client.
- scheduledTasks schema was already present in HEAD from a prior 12-03 commit (out-of-order execution). Schema edit was effectively a no-op.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scheduler infrastructure complete, ready for MCP tool integration (Phase 13)
- Handler registry ready for Agent Zero task absorption (Phase 17)
- Any new scheduled task just needs: DB row + handler function in HANDLERS record

---
*Phase: 12-foundation-migration*
*Completed: 2026-03-17*
