---
phase: F-vector-memory
plan: 01
subsystem: memory
tags: [openai, embeddings, vector-search, bm25, rrf, turso, libsql]

requires:
  - phase: C-memory-preservation
    provides: Memory system with BM25 search, store/retrieve/delete operations
provides:
  - Embedding generation via OpenAI text-embedding-3-small
  - Vector search with Turso F32_BLOB + DiskANN index
  - Dual retrieval (BM25 + vector) with Reciprocal Rank Fusion
  - search_memories tool for Claude conversations
  - Lazy backfill for pre-existing memories
  - Graceful degradation when OPENAI_API_KEY not set
affects: [F-02-memory-consolidation, G-integration-polish]

tech-stack:
  added: [openai SDK]
  patterns: [fire-and-forget async, lazy singleton, raw SQL for vector ops, RRF fusion]

key-files:
  created:
    - src/lib/jarvis/memory/embeddings.ts
    - src/lib/jarvis/memory/vectorSearch.ts
  modified:
    - src/lib/jarvis/config.ts
    - src/lib/jarvis/memory/queries/memoryEntries.ts
    - src/lib/jarvis/memory/toolExecutor.ts
    - src/lib/jarvis/memory/index.ts
    - src/lib/jarvis/intelligence/memoryTools.ts
    - package.json

key-decisions:
  - "Separate bm25FindMemories export to break circular dependency between memoryEntries.ts and vectorSearch.ts"
  - "Raw SQL for vector table — Drizzle ORM cannot manage F32_BLOB columns"
  - "Lazy require() for dualSearch import in findMemoriesMatching to avoid circular imports"
  - "INSERT OR REPLACE for storeEmbedding to handle re-embeds gracefully"

patterns-established:
  - "Fire-and-forget for all embedding operations — never block tool responses"
  - "Raw SQL via sql.raw() for Turso vector operations (CREATE TABLE, vector_top_k, vector32)"
  - "Lazy backfill triggered when vector search returns fewer results than expected"
  - "isVectorSearchAvailable() as gatekeeper — all vector paths check this first"

duration: ~15min
completed: 2026-02-27
---

# Phase F Plan 01: Vector Search + Dual Retrieval Summary

**Semantic memory search via OpenAI embeddings + Turso vector index, with BM25/vector RRF fusion and graceful fallback.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Completed | 2026-02-27 |
| Tasks | 2 completed |
| Files created | 2 |
| Files modified | 6 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Embedding on store | Pass | storeMemoryEntry() fires-and-forgets generateAndStoreEmbedding() |
| AC-2: Semantic vector search | Pass | vectorSearch() uses vector_top_k with DiskANN index |
| AC-3: Dual retrieval via RRF | Pass | dualSearch() runs BM25 + vector in parallel, fuses with k=60 RRF |
| AC-4: search_memories tool | Pass | Tool definition in memoryTools.ts, handler in toolExecutor.ts |
| AC-5: Graceful degradation | Pass | isVectorSearchAvailable() gates all paths; returns null/empty/skips |
| AC-6: Lazy backfill | Pass | backfillEmbeddings() triggered when vector returns fewer results |

## Accomplishments

- Embedding infrastructure with lazy OpenAI singleton, table auto-creation, and fire-and-forget pattern
- Dual retrieval system combining BM25 keyword ranking with vector semantic ranking via Reciprocal Rank Fusion
- `search_memories` tool enabling Claude to semantically search memories during conversations
- Full graceful degradation — system works identically without OPENAI_API_KEY

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/memory/embeddings.ts` | Created | Embedding generation, table management, store/delete/backfill (~140 lines) |
| `src/lib/jarvis/memory/vectorSearch.ts` | Created | Vector search + dual retrieval with RRF fusion (~120 lines) |
| `src/lib/jarvis/config.ts` | Modified | Added enableVectorMemory + openaiApiKey config fields |
| `src/lib/jarvis/memory/queries/memoryEntries.ts` | Modified | Fire-and-forget embedding on store/delete, split BM25 into bm25FindMemories, findMemoriesMatching now delegates to dualSearch |
| `src/lib/jarvis/memory/toolExecutor.ts` | Modified | Added search_memories handler + MemoryToolName union type |
| `src/lib/jarvis/memory/index.ts` | Modified | Re-exports for embeddings and vectorSearch modules |
| `src/lib/jarvis/intelligence/memoryTools.ts` | Modified | Added search_memories tool definition |
| `package.json` | Modified | Added openai dependency |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Split findMemoriesMatching into bm25FindMemories + wrapper | Avoid circular dependency: vectorSearch.ts imports BM25, memoryEntries.ts imports dualSearch | bm25FindMemories is now the raw BM25 export; findMemoriesMatching delegates to dual when available |
| Lazy require() for dualSearch in findMemoriesMatching | Static circular import would fail at module load time | Slight runtime overhead on first call, but safe |
| Raw SQL via sql.raw() for all vector operations | Turso vector types (F32_BLOB, vector32, vector_top_k) not supported by Drizzle ORM | Vector table managed separately from Drizzle schema migrations |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — prevented circular import crash |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One structural deviation to handle circular dependency. No scope creep.

### Auto-fixed Issues

**1. Circular dependency: memoryEntries.ts <-> vectorSearch.ts**
- **Found during:** Task 2 (integrating dualSearch into findMemoriesMatching)
- **Issue:** vectorSearch.ts imports findMemoriesMatching for BM25 component; plan called for findMemoriesMatching to import dualSearch — creates circular import
- **Fix:** Extracted `bm25FindMemories()` as separate export; vectorSearch.ts imports that; findMemoriesMatching uses lazy `require()` for dualSearch
- **Files:** memoryEntries.ts, vectorSearch.ts
- **Verification:** npm run build succeeds, no circular dependency errors

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Vector search infrastructure fully operational
- All existing memory operations upgraded to dual retrieval transparently
- search_memories tool available for Claude conversations
- Backfill mechanism ready to embed pre-existing memories on first use

**Concerns:**
- OPENAI_API_KEY must be set in Vercel environment for vector search to activate in production
- Memory consolidation (F-02) not yet implemented — duplicate/similar memories not merged

**Blockers:**
- None for F-02

**Remaining Phase F work:**
- F-02: Memory Consolidation (merge similar memories) — not yet planned

---
*Phase: F-vector-memory, Plan: 01*
*Completed: 2026-02-27*
