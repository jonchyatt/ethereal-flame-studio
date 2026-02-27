---
phase: F-vector-memory
plan: 02
subsystem: memory
tags: [consolidation, haiku, embeddings, vector-search, deduplication]

requires:
  - phase: F-01
    provides: embeddings.ts, vectorSearch.ts, memory_embeddings table, vector_top_k queries
provides:
  - Memory consolidation engine (detect + synthesize + merge similar memories)
  - Two-phase consolidate_memories tool (preview → confirm)
  - updateMemoryContent with fire-and-forget re-embed
affects: [G-integration-polish]

tech-stack:
  added: []
  patterns: [stored-embedding neighbor detection, Haiku synthesis, two-phase tool pattern]

key-files:
  created:
    - src/lib/jarvis/memory/consolidation.ts
  modified:
    - src/lib/jarvis/memory/queries/memoryEntries.ts
    - src/lib/jarvis/memory/toolExecutor.ts
    - src/lib/jarvis/intelligence/memoryTools.ts
    - src/lib/jarvis/memory/index.ts

key-decisions:
  - "Stored-embedding subquery for candidate detection — zero OpenAI API calls"
  - "groupId format keepId-removeId for tool confirm flow parsing"
  - "k=4 in vector_top_k to get 3 neighbors after self-exclusion"
  - "Longer content wins keep, tiebreak on more recent lastAccessed"

patterns-established:
  - "Two-phase tool pattern reused from forget_fact (preview → confirm_ids)"
  - "Haiku synthesis with graceful fallback to longer content on API failure"
  - "updateMemoryContent with fire-and-forget re-embed for post-merge accuracy"

duration: ~15min
completed: 2026-02-27
---

# Phase F Plan 02: Memory Consolidation Summary

**Stored-embedding candidate detection + Haiku synthesis + two-phase consolidation tool for merging semantically similar memories.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Completed | 2026-02-27 |
| Tasks | 2 completed |
| Files modified | 5 (1 created, 4 modified) |
| Lines added | ~210 new (consolidation.ts) + ~130 across modified files |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Zero-API-Call Candidate Detection | Pass | Uses vector_top_k with stored-embedding subquery — no OpenAI calls for detection |
| AC-2: Haiku-Powered Synthesis | Pass | claude-haiku-4-5-20251001, same pattern as summarization.ts, fallback to longer content |
| AC-3: Two-Phase Consolidation Tool | Pass | Preview returns candidates with proposedMerge; confirm parses groupIds and executes |
| AC-4: Content Update + Re-embed | Pass | updateMemoryContent updates content + contentHash, fire-and-forget generateAndStoreEmbedding |

## Accomplishments

- Consolidation engine with 4 exported functions: findConsolidationCandidates, synthesizeMergedMemory, executeConsolidation, runConsolidation
- Two-phase consolidate_memories tool matching forget_fact UX pattern (preview → confirm_ids)
- updateMemoryContent in memoryEntries.ts with automatic re-embedding after content change
- Zero circular dependencies — consolidation.ts imports flow same direction as vectorSearch.ts

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/memory/consolidation.ts` | Created (211 lines) | Consolidation engine: candidate detection, Haiku synthesis, merge execution |
| `src/lib/jarvis/memory/queries/memoryEntries.ts` | Modified (+25 lines) | Added updateMemoryContent with content + hash + re-embed |
| `src/lib/jarvis/memory/toolExecutor.ts` | Modified (+85 lines) | handleConsolidateMemories handler, switch case, summarizeToolContext |
| `src/lib/jarvis/intelligence/memoryTools.ts` | Modified (+16 lines) | consolidate_memories tool definition with threshold + confirm_ids schema |
| `src/lib/jarvis/memory/index.ts` | Modified (+3 lines) | Re-export consolidation functions |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Stored-embedding subquery instead of loading blobs to JS | Avoids memory overhead, lets SQLite handle vector data natively | Efficient even with hundreds of memories |
| k=4 in vector_top_k | Self-match consumes one slot; k=4 gives 3 actual neighbors | Sufficient coverage without excessive queries |
| groupId = keepId-removeId format | Tool handler Phase 2 can parse directly without lookup table | Simple, deterministic confirm flow |
| Longer content determines keep target | More detailed memory is better base for synthesis | Preserves maximum information |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Phase F complete: vector search (F-01) + consolidation (F-02) both shipped
- All memory tools operational: remember, forget, search, consolidate
- Foundation ready for Phase G integration & polish

**Concerns:**
- OPENAI_API_KEY needs to be added to Vercel environment for vector features to work in production
- Consolidation is tool-invoked only (no auto-trigger) — Phase G may add periodic scheduling

**Blockers:**
- None

---
*Phase: F-vector-memory, Plan: 02*
*Completed: 2026-02-27*
