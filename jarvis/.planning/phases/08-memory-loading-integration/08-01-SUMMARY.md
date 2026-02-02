---
phase: 08-memory-loading-integration
plan: 01
subsystem: memory
tags: [retrieval, scoring, token-budgeting]
dependency-graph:
  requires: [07-database-foundation]
  provides: [memory-retrieval, scored-memories, prompt-formatting]
  affects: [08-02, 08-03]
tech-stack:
  added: []
  patterns: [scoring-algorithm, token-estimation]
key-files:
  created:
    - src/lib/jarvis/memory/retrieval.ts
    - src/lib/jarvis/memory/__tests__/retrieval.test.ts
  modified:
    - src/lib/jarvis/memory/index.ts
decisions:
  - scoring-weights: "Recency (0-50), Category (0-30), Source (0-20) = max 100"
  - token-estimation: "~4 chars per token conservative heuristic"
  - age-formatting: "Human-readable relative time (today, yesterday, N days ago, etc.)"
metrics:
  duration: 4m
  completed: 2026-02-02
---

# Phase 08 Plan 01: Memory Retrieval Module Summary

Memory retrieval with time-aware scoring and ~1000 token budget for context injection.

## What Was Built

### Core Retrieval Module (`src/lib/jarvis/memory/retrieval.ts`)

Provides selective memory loading for session context without overwhelming the context window.

**Exports:**
- `retrieveMemories(options?)` - Main function to fetch, score, and budget memories
- `formatMemoriesForPrompt(context)` - Format memories for system prompt injection
- `MemoryContext` type - Result container with entries, token count, truncation flag
- `ScoredMemory` type - Memory with score and human-readable age

**Scoring Algorithm:**
| Factor | Score Range | Values |
|--------|-------------|--------|
| Recency | 0-50 | Today: 50, Yesterday: 40, This week: 30, This month: 15, Older: 5 |
| Category | 0-30 | preference: 30, fact: 20, pattern: 10 |
| Source | 0-20 | user_explicit: 20, jarvis_inferred: 10 |

Max score: 100 points (today + preference + user_explicit)

**Age Formatting:**
Converts timestamps to human-readable strings:
- "today", "yesterday"
- "3 days ago", "5 days ago"
- "1 week ago", "2 weeks ago"
- "1 month ago", "3 months ago"
- "1 year ago", "2 years ago"

**Token Budgeting:**
- Default: 1000 tokens max, 10 entries max
- Conservative estimate: ~4 characters per token
- Returns `truncated: true` when budget limits reached

### Prompt Format

Per CONTEXT.md decisions, memories format as:
```
User context:
- Preference: Therapy Thursdays 3pm with Dr. Chen (2 weeks ago, you told me)
- Fact: Works at Acme Corp (yesterday, you told me)
- Pattern: Prefers brief responses (3 days ago, inferred)
```

Source mapping:
- `user_explicit` -> "you told me"
- `jarvis_inferred` -> "inferred"

## Integration

Module exported from main memory facade:
```typescript
import { retrieveMemories, formatMemoriesForPrompt } from '@/lib/jarvis/memory';
```

## Tests

Unit tests verify:
- Age formatting for all time ranges
- Token estimation accuracy
- Individual scoring functions (recency, category, source)
- Combined scoring produces correct rankings
- Prompt formatting with source mapping
- Token budget math logic

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Scoring weights (50/30/20) | Prioritizes recency while respecting user-explicit preferences |
| 4 chars/token estimate | Conservative estimate prevents context overflow |
| Age as relative string | More natural for system prompt than ISO timestamps |
| Category capitalized in output | Cleaner formatting: "Preference:" not "preference:" |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/jarvis/memory/retrieval.ts` | Created (301 lines) |
| `src/lib/jarvis/memory/index.ts` | Added re-export |
| `src/lib/jarvis/memory/__tests__/retrieval.test.ts` | Created (441 lines) |

## Commits

| Hash | Message |
|------|---------|
| 74676c1 | feat(08-01): create memory retrieval module with scoring and token budgeting |
| 4b02945 | feat(08-01): export retrieval functions from memory module |
| 36515c0 | test(08-01): add unit tests for retrieval scoring and formatting |

## Next Steps

Plan 08-02 will inject memory context into Claude's system prompt at session start, using `retrieveMemories()` and `formatMemoriesForPrompt()` built here.
