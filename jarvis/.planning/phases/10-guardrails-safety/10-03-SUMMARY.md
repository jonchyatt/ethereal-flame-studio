---
phase: 10-guardrails-safety
plan: 03
subsystem: executive
tags: [notion, check-in, tomorrow-preview, task-capture]

# Dependency graph
requires:
  - phase: 05-executive-core
    provides: CheckInManager, BriefingBuilder
  - phase: 04-notion-tools
    provides: executeNotionTool, create_task
provides:
  - Captured items during check-ins create Notion tasks
  - Evening check-in shows real tomorrow task data
affects: [phase-10-guardrails]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - executeNotionTool for task creation in check-in flows
    - tomorrow data passed through check-in data pipeline

key-files:
  created: []
  modified:
    - src/lib/jarvis/executive/CheckInManager.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/executive/BriefingClient.ts

key-decisions:
  - "Parallel task creation with Promise.allSettled for resilience"
  - "Tomorrow data fetched only for evening check-ins (not midday)"

patterns-established:
  - "Check-in captured items -> Notion tasks via executeNotionTool"
  - "Type-specific data in buildCheckInData (tomorrow only for evening)"

# Metrics
duration: 12min
completed: 2026-02-02
---

# Phase 10 Plan 03: Bug Fixes - FIX-01 and FIX-02 Summary

**Captured items now create Notion tasks; evening check-in shows real tomorrow task titles instead of placeholder text**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-02T23:45:00Z
- **Completed:** 2026-02-02T23:57:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Check-in captured items now create tasks in Notion inbox via executeNotionTool
- Evening check-in buildCheckInData now fetches tomorrow's pending tasks
- Tomorrow preview script shows real task names, counts, and high priority indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix FIX-01 - Send captured items to Notion** - `b4f1a14` (fix)
2. **Task 2: Add tomorrow data to check-in builder** - `5f1f6ed` (feat)
3. **Task 3: Fix FIX-02 - Use real tomorrow data in CheckInManager** - `dced0a4` (fix)

## Files Created/Modified

- `src/lib/jarvis/executive/CheckInManager.ts` - Added executeNotionTool import, tomorrow state field, async complete() with task creation, real buildTomorrowScript()
- `src/lib/jarvis/executive/BriefingBuilder.ts` - buildCheckInData now returns tomorrow tasks for evening type
- `src/lib/jarvis/executive/BriefingClient.ts` - Updated return type to include optional tomorrow field

## Decisions Made

- **Parallel task creation:** Used Promise.allSettled to create tasks in parallel, allowing partial success if some fail
- **Evening-only tomorrow data:** Only fetch tomorrow tasks for evening check-ins (midday doesn't need it)
- **Graceful empty handling:** If no tomorrow tasks, displays "Tomorrow's clear. No tasks scheduled."

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all changes compiled and integrated cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-01 and FIX-02 bugs resolved
- Check-in flow now fully functional with Notion integration
- Ready for remaining Phase 10 plans (10-04)

---
*Phase: 10-guardrails-safety*
*Completed: 2026-02-02*
