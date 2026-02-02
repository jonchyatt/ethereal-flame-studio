---
phase: 09-memory-writing
plan: 03
subsystem: memory
tags: [memory, decay, system-prompt, jarvis, exponential-decay]

# Dependency graph
requires:
  - phase: 09-01
    provides: Soft delete infrastructure for memory entries
provides:
  - Memory management guidance in system prompt
  - Memory decay calculation with configurable half-life
  - Decay-aware retrieval scoring
  - Automatic cleanup of heavily decayed memories
affects: [09-04, memory-tools, retrieval]

# Tech tracking
tech-stack:
  added: []
  patterns: [exponential-decay-scoring, prompt-intent-detection]

key-files:
  created:
    - src/lib/jarvis/memory/decay.ts
  modified:
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/lib/jarvis/config.ts
    - src/lib/jarvis/memory/retrieval.ts
    - src/lib/jarvis/memory/index.ts

key-decisions:
  - "30-day half-life for memory decay by default (configurable)"
  - "Explicit memories decay 50% slower than inferred"
  - "Decay threshold of 0.9 triggers soft-delete cleanup"
  - "Memory management guidance only added when memory is enabled"

patterns-established:
  - "Intent detection via explicit triggers and soft hints"
  - "Exponential decay with source-based modifiers"
  - "Score penalty application for retrieval prioritization"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 09 Plan 03: System Prompt Guidance and Memory Decay Summary

**Memory intent detection via prompt guidance and MEM-10 intelligent forgetting via exponential decay algorithm**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02T16:20:00Z
- **Completed:** 2026-02-02T16:28:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- System prompt teaches Claude when to use remember/forget/list tools based on natural language triggers
- Memory decay algorithm with configurable half-life (default 30 days)
- Explicit memories decay slower than inferred (0.5x multiplier)
- Old unaccessed memories get lower retrieval scores
- Automatic cleanup soft-deletes memories above decay threshold

## Task Commits

Each task was committed atomically:

1. **Task 1: Add memory management guidance to system prompt** - `4ab0c2a` (feat)
2. **Task 2: Create memory decay module** - `197c79c` (feat)
3. **Task 3: Integrate decay into retrieval scoring** - `6a4e01b` (feat)

## Files Created/Modified

- `src/lib/jarvis/memory/decay.ts` - Decay calculation and cleanup functions
- `src/lib/jarvis/intelligence/systemPrompt.ts` - Memory management guidance section
- `src/lib/jarvis/config.ts` - Decay configuration (half-life, multiplier, threshold)
- `src/lib/jarvis/memory/retrieval.ts` - Decay penalty in scoreMemory function
- `src/lib/jarvis/memory/index.ts` - Re-export decay functions

## Decisions Made

- **30-day half-life:** At 30 days without access, memory has 50% decay - reasonable balance between freshness and retention
- **0.5x explicit multiplier:** User-stated facts are more important, decay 50% slower
- **0.9 decay threshold:** Memories must be 90% decayed before cleanup - conservative to avoid premature deletion
- **Conditional prompt section:** MEMORY MANAGEMENT only added when memoryContext exists, preserving v1 behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

Environment variables (optional, have sensible defaults):
- `JARVIS_DECAY_HALF_LIFE` - Days for 50% decay (default: 30)
- `JARVIS_EXPLICIT_DECAY_MULT` - Multiplier for explicit memories (default: 0.5)
- `JARVIS_DECAY_THRESHOLD` - Threshold for cleanup (default: 0.9)

## Next Phase Readiness

- Memory management guidance complete for Claude intent detection
- Decay algorithm ready for retrieval integration
- Ready for 09-04: Delete All tool and MCP integration

---
*Phase: 09-memory-writing*
*Completed: 2026-02-02*
