---
phase: 08-memory-loading-integration
plan: 03
subsystem: intelligence
tags: [memory, proactive-surfacing, system-prompt, jarvis]

# Dependency graph
requires:
  - phase: 08-02
    provides: Memory loading into system prompt via buildSystemPrompt()
provides:
  - Proactive surfacing detection (getProactiveSurfacing function)
  - ProactiveSurfacing interface and formatProactiveSurfacing function
  - System prompt guidance for proactive surfacing behavior
  - Chat API integration passing proactive surfacing to prompt builder
affects: [09-memory-writing, jarvis-behavior]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Proactive surfacing pattern: detect action-oriented memories for session start
    - Contextual facts pattern: high-relevance items for topic-based surfacing
    - Behavior guidelines in system prompt: brief, task-focused, no emotional check-ins

key-files:
  created: []
  modified:
    - src/lib/jarvis/memory/retrieval.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/app/api/jarvis/chat/route.ts

key-decisions:
  - "Action keywords for pending items: follow up, remind, pending, waiting, need to, should, want to, deadline"
  - "Limit pending items to 5 max, contextual facts to 3 max for brevity"
  - "Only surface recent items (3 days) and high-relevance (score >= 50)"
  - "Explicit DO NOT guidelines: no emotional check-ins, no unsolicited advice"
  - "Batch format for multiple items: 'Quick hits: X, and Y'"

patterns-established:
  - "Proactive surfacing via system prompt injection (not string concatenation)"
  - "Empty surfacing text converted to undefined to avoid empty prompt sections"
  - "All prompt building through buildSystemPrompt() consistently"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 8 Plan 03: Proactive Memory Surfacing Summary

**Proactive surfacing detection with action-oriented keyword filtering and system prompt guidance for brief, task-focused memory mentions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02T19:49:43Z
- **Completed:** 2026-02-02T19:57:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added getProactiveSurfacing() to categorize memories into pending items and contextual facts
- Enhanced system prompt with PROACTIVE SURFACING section including specific behavior guidelines
- Integrated proactive surfacing into chat API via buildSystemPrompt() consistently with 08-02 approach
- Explicit prohibitions on emotional check-ins and unsolicited advice per CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Add proactive surfacing detection to retrieval** - `a699d00` (feat)
2. **Task 2: Add proactive surfacing guidance to system prompt** - `dbf97d3` (feat)
3. **Task 3: Integrate proactive surfacing into chat API via buildSystemPrompt** - `68f6584` (feat)

## Files Created/Modified

- `src/lib/jarvis/memory/retrieval.ts` - Added ProactiveSurfacing interface, getProactiveSurfacing() and formatProactiveSurfacing() functions
- `src/lib/jarvis/intelligence/systemPrompt.ts` - Added proactiveSurfacing field to context, PROACTIVE SURFACING section with behavior guidelines
- `src/app/api/jarvis/chat/route.ts` - Integrated proactive surfacing generation and passing to buildSystemPrompt()

## Decisions Made

- **Action-oriented keywords**: Used specific keywords (follow up, remind, pending, waiting, need to, should, want to, deadline) to identify pending items rather than category-based filtering
- **Brevity limits**: Capped pending items at 5 and contextual facts at 3 to keep prompt injection concise
- **Recency filter**: Only items from last 3 days considered for pending surfacing
- **Relevance threshold**: Contextual facts require score >= 50 (high-relevance only)
- **Empty handling**: Convert empty surfacing text to undefined to avoid adding empty sections to prompt

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MEM-11 (proactively surface relevant memories) satisfied
- Jarvis now has concrete guidance on WHAT to surface and WHEN
- Ready for Phase 9 (memory writing/persistence) when defined
- No blockers

---
*Phase: 08-memory-loading-integration*
*Plan: 03*
*Completed: 2026-02-02*
