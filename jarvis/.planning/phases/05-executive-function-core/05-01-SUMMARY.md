---
phase: 05-executive-function-core
plan: 01
subsystem: executive
tags: [scheduling, briefing, date-fns, state-machine, tts]

# Dependency graph
requires:
  - phase: 04-data-integration
    provides: Notion MCP tools (query_tasks, query_bills, etc.)
provides:
  - Scheduler class for time-based events
  - BriefingBuilder for Notion data aggregation
  - BriefingFlow state machine for section-by-section walkthrough
  - Tappable orb for voice activation
  - VoicePipeline speak() method for proactive speech
affects:
  - 05-02 (check-ins and nudges)
  - 05-03 (dashboard UI)
  - Phase 6 (reviews)

# Tech tracking
tech-stack:
  added: [date-fns]
  patterns: [client-side-scheduler, briefing-state-machine, singleton-factory]

key-files:
  created:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/executive/Scheduler.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/executive/BriefingFlow.ts
  modified:
    - src/lib/jarvis/types.ts
    - src/lib/jarvis/stores/jarvisStore.ts
    - src/lib/jarvis/voice/VoicePipeline.ts
    - src/components/jarvis/JarvisOrb.tsx
    - src/app/jarvis/page.tsx

key-decisions:
  - "date-fns for date manipulation (lightweight, tree-shakeable)"
  - "Client-side scheduler with localStorage persistence"
  - "Background tab visibility handling for missed events"
  - "Calendar events derived from tasks with due times (no separate calendar tool)"
  - "BriefingFlow uses Promise-returning speak() for await support"
  - "Orb is primary tap target per CONTEXT.md"

patterns-established:
  - "Singleton factory pattern: getScheduler()"
  - "State machine pattern: BriefingFlow with sections"
  - "Speak promise pattern: pipeline.speak() returns Promise<void>"

# Metrics
duration: 12min
completed: 2026-02-01
---

# Phase 5 Plan 1: Morning Briefing Infrastructure Summary

**Client-side scheduler with localStorage persistence, Notion data aggregation via BriefingBuilder, and BriefingFlow state machine for section-by-section spoken walkthrough**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Scheduler class for time-based events (morning briefing at 08:00)
- BriefingBuilder aggregates tasks, bills, habits, goals in parallel from Notion
- BriefingFlow presents outline-first structure with skip/continue support
- VoicePipeline.speak() enables proactive speech with Promise return
- Orb is tappable for voice activation per CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Create executive function types and Scheduler** - `00449b5` (feat)
2. **Task 2: Create BriefingBuilder and BriefingFlow** - `3328fe3` (feat)
3. **Task 3: Wire briefing to JarvisOrb and add speak method** - `506ccf9` (feat)

## Files Created/Modified

- `src/lib/jarvis/executive/types.ts` - ScheduledEvent, BriefingData, TaskSummary types
- `src/lib/jarvis/executive/Scheduler.ts` - Client-side scheduler with localStorage
- `src/lib/jarvis/executive/BriefingBuilder.ts` - Parallel Notion queries, streak summary
- `src/lib/jarvis/executive/BriefingFlow.ts` - State machine for briefing walkthrough
- `src/lib/jarvis/types.ts` - Added briefing state types
- `src/lib/jarvis/stores/jarvisStore.ts` - Added isBriefingActive, currentBriefingSection, briefingData
- `src/lib/jarvis/voice/VoicePipeline.ts` - Added speak() and setOnSpeechComplete()
- `src/components/jarvis/JarvisOrb.tsx` - Added onTap prop for voice activation
- `src/app/jarvis/page.tsx` - Scheduler init, Start Briefing button, orb tap handling

## Decisions Made

1. **date-fns for dates** - Lightweight (tree-shakeable), immutable, well-supported
2. **Client-side scheduler** - Works in serverless environments, localStorage persistence
3. **Visibility change handler** - Catches up on missed events when tab regains focus
4. **Calendar from tasks** - No separate query_calendar tool, derive from tasks with due times
5. **Promise-returning speak()** - BriefingFlow can await speech completion
6. **Orb as tap target** - Per CONTEXT.md, removes need for separate mic button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scheduler infrastructure ready for check-ins and nudges (Plan 02)
- BriefingData structure ready for dashboard display (Plan 03)
- VoicePipeline.speak() ready for proactive speech in nudges

---
*Phase: 05-executive-function-core*
*Completed: 2026-02-01*
