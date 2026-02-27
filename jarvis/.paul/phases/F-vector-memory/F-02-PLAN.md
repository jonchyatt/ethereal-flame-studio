---
phase: F-vector-memory
plan: 02
type: execute
wave: 1
depends_on: ["F-01"]
files_modified:
  - src/lib/jarvis/memory/consolidation.ts
  - src/lib/jarvis/memory/toolExecutor.ts
  - src/lib/jarvis/intelligence/memoryTools.ts
  - src/lib/jarvis/memory/index.ts
  - src/lib/jarvis/memory/queries/memoryEntries.ts
autonomous: true
---

<objective>
## Goal
Add memory consolidation — detect semantically similar memories using stored embeddings (zero API calls for detection), synthesize merged versions via Haiku, and expose as a two-phase tool (preview → confirm) matching the existing forget_fact pattern.

## Purpose
Over time, Jarvis accumulates redundant memories:
- "Jonathan has therapy on Thursdays" + "Jonathan goes to therapy every Thursday at 3pm"
- "Prefers bullet points" + "Likes bulleted lists for readability"

These clutter retrieval with near-duplicates, waste embedding storage, and dilute BM25 scoring. Consolidation merges them intelligently — Haiku synthesizes the best combined version, keeping all detail while eliminating redundancy.

## Output
- `consolidation.ts`: Stored-embedding candidate detection + Haiku synthesis + two-phase consolidation
- `consolidate_memories` tool: Two-phase (preview candidates → confirm merges), matching forget_fact pattern
- Updated memoryEntries.ts: `updateMemoryContent()` for post-merge content + re-embed
- Re-export wiring in index.ts
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md

## Prior Work
@.paul/phases/F-vector-memory/F-01-SUMMARY.md
- F-01 delivered: embeddings.ts, vectorSearch.ts, dual retrieval
- Key patterns: fire-and-forget, isVectorSearchAvailable() gating, raw SQL for vector ops
- memory_embeddings table: id, memory_id (UNIQUE), embedding (F32_BLOB(1536))
- vector_top_k('memory_embeddings_idx', vector, k) returns {id (rowid), distance}

## Source Files
@src/lib/jarvis/memory/embeddings.ts — ensureEmbeddingsTable, generateAndStoreEmbedding, isVectorSearchAvailable, storeEmbedding, deleteEmbedding
@src/lib/jarvis/memory/vectorSearch.ts — vectorSearch returns {memoryId, distance}
@src/lib/jarvis/memory/queries/memoryEntries.ts — storeMemoryEntry, getMemoryEntries, softDeleteMemoryEntry, getMemoryEntryById, updateLastAccessed, normalizeContent
@src/lib/jarvis/memory/toolExecutor.ts — executeMemoryTool switch, MemoryToolName union, handleForgetFact (two-phase pattern reference)
@src/lib/jarvis/intelligence/memoryTools.ts — memoryTools array
@src/lib/jarvis/memory/index.ts — re-exports
@src/lib/jarvis/memory/schema.ts — MemoryEntry type (id, content, contentHash, category, source, createdAt, lastAccessed, deletedAt)
@src/lib/jarvis/memory/summarization.ts — Haiku call pattern (Anthropic SDK, claude-haiku-4-5-20251001, short system prompt)
@src/lib/jarvis/memory/decay.ts — cleanupDecayedMemories pattern (periodic sweep, stats return)
@src/lib/jarvis/config.ts — JarvisConfig, enableVectorMemory
</context>

<acceptance_criteria>

## AC-1: Zero-API-Call Candidate Detection
```gherkin
Given vector search is available and memories have stored embeddings
When findConsolidationCandidates() is called
Then it queries stored embeddings from memory_embeddings table (no OpenAI API calls)
And uses vector_top_k to find nearest neighbors per embedding
And returns pairs where cosine distance < threshold
And each pair appears only once (deduplicated via sorted ID key)
And deleted memories are excluded
And each candidate includes both entries' content for preview
```

## AC-2: Haiku-Powered Synthesis
```gherkin
Given two semantically similar memory entries
When synthesizeMergedMemory(contentA, contentB) is called
Then it calls Claude Haiku to produce a single concise memory combining all detail from both
And the result preserves specific facts (times, names, quantities) from both entries
And the result is a single sentence or short fact, not a paragraph
```

## AC-3: Two-Phase Consolidation Tool
```gherkin
Given Claude invokes consolidate_memories without confirm_ids
Then it returns candidate pairs with preview (what would be merged into what)
And each candidate shows: groupId, entries with content, proposed merged content

Given Claude invokes consolidate_memories with confirm_ids
Then it merges the confirmed groups: updates kept entry content, soft-deletes removed entries
And the kept entry's embedding is regenerated for the new synthesized content
And the kept entry's lastAccessed is updated to the most recent of the group
And returns a summary of what was merged
```

## AC-4: Content Update + Re-embed
```gherkin
Given a memory entry has been selected as the "keep" target after merge
When its content is updated to the synthesized version
Then the content and contentHash are both updated in memory_entries
And a new embedding is generated and stored (fire-and-forget)
And the old embedding is replaced via INSERT OR REPLACE
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create consolidation engine with Haiku synthesis</name>
  <files>src/lib/jarvis/memory/consolidation.ts, src/lib/jarvis/memory/queries/memoryEntries.ts</files>
  <action>
    **memoryEntries.ts** — Add one new export:

    `updateMemoryContent(id: number, newContent: string): Promise<MemoryEntry | undefined>`
    - Updates content and contentHash (via hashContent) for the given entry
    - Updates lastAccessed to now
    - Returns updated entry via .returning()
    - Fire-and-forget: call generateAndStoreEmbedding(id, newContent) to re-embed
    - Place near updateLastAccessed for locality

    **consolidation.ts** — Create new file with four exported functions:

    **1. findConsolidationCandidates(threshold = 0.15)**
    - Gate on isVectorSearchAvailable(), return [] if unavailable
    - Call ensureEmbeddingsTable()
    - Get all active memories via getMemoryEntries(500)
    - Get all stored embeddings: raw SQL `SELECT memory_id, embedding FROM memory_embeddings`
    - Build a Map<memoryId, embedding> for lookup
    - For each stored embedding, query: `SELECT memory_id, distance FROM vector_top_k('memory_embeddings_idx', embedding_blob, 3) JOIN memory_embeddings ON memory_embeddings.rowid = id`
      - Where embedding_blob is the stored embedding for that entry (retrieve via `SELECT embedding FROM memory_embeddings WHERE memory_id = ?`)
      - Actually, simpler: iterate active memories, for each one that has an embedding, do a vector_top_k query with that embedding to get nearest neighbors
      - BUT we need to query with the actual stored blob. Use: `SELECT memory_id, distance FROM vector_top_k('memory_embeddings_idx', (SELECT embedding FROM memory_embeddings WHERE memory_id = ${entryId}), 3) JOIN memory_embeddings ON memory_embeddings.rowid = id`
    - Filter: distance > 0 (exclude self) AND distance < threshold AND partner not already deleted
    - Deduplicate pairs via Set of `${Math.min(a,b)}-${Math.max(a,b)}`
    - For each pair, determine keepId (longer content; tiebreak: more recent lastAccessed) and removeId
    - Return: Array<{ groupId: string; keepId: number; removeId: number; distance: number; keepContent: string; removeContent: string }>
    - Log: `[Consolidation] Found ${pairs.length} candidate pairs`

    **2. synthesizeMergedMemory(contentA: string, contentB: string): Promise<string>**
    - Import Anthropic from '@anthropic-ai/sdk'
    - Call claude-haiku-4-5-20251001 with:
      - system: 'You merge similar memory entries into one concise fact. Output ONLY the merged memory, nothing else. Preserve all specific details (times, names, quantities). Keep it to 1-2 sentences max.'
      - user message: `Merge these two memories into one:\n1. "${contentA}"\n2. "${contentB}"`
      - max_tokens: 128
    - Extract text content, trim, return
    - If API fails, fall back to keeping the longer of the two inputs (log warning)

    **3. executeConsolidation(candidates: Array<{keepId, removeId, keepContent, removeContent}>): Promise<{merged: number; failed: number}>**
    - For each candidate:
      - Call synthesizeMergedMemory(keepContent, removeContent)
      - Call updateMemoryContent(keepId, synthesizedContent) — this re-embeds automatically
      - Call softDeleteMemoryEntry(removeId) — this deletes old embedding automatically
      - Log: `[Consolidation] Merged #${keepId} + #${removeId} → "${synthesized.slice(0,50)}..."`
    - Return stats { merged, failed }
    - Wrap each merge in try/catch — failed merges increment `failed` counter, don't stop the sweep

    **4. runConsolidation(threshold?: number): Promise<{candidatesFound: number; merged: number; failed: number}>**
    - Convenience function combining find + execute
    - Call findConsolidationCandidates(threshold)
    - If empty, return { candidatesFound: 0, merged: 0, failed: 0 }
    - Call executeConsolidation(candidates)
    - Return combined stats

    Follow existing patterns:
    - Same JSDoc style as embeddings.ts and decay.ts
    - Console.log with [Consolidation] prefix
    - Graceful degradation when vector search unavailable
    - Haiku call pattern from summarization.ts (same SDK, same model, short system prompt)
  </action>
  <verify>npm run build passes with no TypeScript errors</verify>
  <done>AC-1, AC-2, AC-4 satisfied: stored-embedding detection, Haiku synthesis, content update with re-embed</done>
</task>

<task type="auto">
  <name>Task 2: Wire two-phase consolidation tool</name>
  <files>src/lib/jarvis/memory/toolExecutor.ts, src/lib/jarvis/intelligence/memoryTools.ts, src/lib/jarvis/memory/index.ts</files>
  <action>
    **memoryTools.ts** — Add tool definition to memoryTools array:
    ```
    {
      name: 'consolidate_memories',
      description: 'Find and merge semantically similar memories. Call without confirm_ids to preview candidates. Call with confirm_ids to execute the merges. Use periodically to keep memory clean, or when the user mentions duplicate memories.',
      input_schema: {
        type: 'object',
        properties: {
          confirm_ids: {
            type: 'string',
            description: 'Comma-separated group IDs to confirm merging (from a previous preview call). Omit for preview mode.'
          },
          threshold: {
            type: 'number',
            description: 'Cosine distance threshold (0-1). Lower = stricter. Default 0.15. Only used in preview mode.'
          }
        }
      }
    }
    ```
    No required fields.

    **toolExecutor.ts** — Wire the handler:
    - Add 'consolidate_memories' to the MemoryToolName union type
    - Import findConsolidationCandidates, executeConsolidation, synthesizeMergedMemory from ./consolidation
    - Add case: `case 'consolidate_memories': result = await handleConsolidateMemories(input); break;`

    - Add handler implementing two-phase flow (matching forget_fact pattern):

      **Phase 1 (preview):** No confirm_ids provided
      - Call findConsolidationCandidates(threshold)
      - If empty: return { success: true, message: 'No similar memories found — memory is already clean.', candidates: [] }
      - For each candidate pair, call synthesizeMergedMemory to generate proposed merge
      - Return:
        ```json
        {
          "success": true,
          "message": "Found N candidate pair(s) for consolidation. Review and confirm.",
          "candidates": [
            {
              "groupId": "12-45",
              "keep": { "id": 12, "content": "..." },
              "remove": { "id": 45, "content": "..." },
              "distance": 0.08,
              "proposedMerge": "synthesized content..."
            }
          ],
          "instruction": "To merge, call consolidate_memories with confirm_ids set to the group IDs (comma-separated)."
        }
        ```

      **Phase 2 (confirm):** confirm_ids provided (e.g., "12-45,23-67")
      - Parse confirm_ids into groupId strings
      - For each groupId, parse keepId and removeId from the "keepId-removeId" format
      - Build candidates array with content from getMemoryEntryById
      - Call executeConsolidation(candidates)
      - Return: { success: true, message: `Merged ${stats.merged} pair(s).`, stats }

    - Add to summarizeToolContext: `case 'consolidate_memories': return input.confirm_ids ? 'Executed memory consolidation' : 'Previewed consolidation candidates';`

    **index.ts** — Add re-export line:
    ```
    export { findConsolidationCandidates, executeConsolidation, synthesizeMergedMemory, runConsolidation } from './consolidation';
    ```
  </action>
  <verify>npm run build passes with no TypeScript errors</verify>
  <done>AC-3 satisfied: two-phase consolidation tool with preview → confirm flow</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/memory/embeddings.ts (F-01 stable — only import from it)
- src/lib/jarvis/memory/vectorSearch.ts (F-01 stable — only import from it)
- src/lib/jarvis/memory/schema.ts (schema is locked — no new tables/columns)
- src/lib/jarvis/memory/decay.ts (independent module)
- src/lib/jarvis/config.ts (no new config fields needed)
- src/lib/jarvis/memory/summarization.ts (reference only for Haiku pattern)
- Any UI/frontend files

## SCOPE LIMITS
- No auto-triggering consolidation (tool-invoked only for now — auto-trigger is a Phase G consideration)
- No new database tables or schema changes
- No new npm dependencies (Anthropic SDK already installed)
- No cluster detection beyond pairs (iterative runs handle transitive similarity)
- No changes to dual retrieval or search_memories logic
- memoryEntries.ts: ONLY add updateMemoryContent — do not modify existing functions

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] consolidation.ts exports: findConsolidationCandidates, synthesizeMergedMemory, executeConsolidation, runConsolidation
- [ ] updateMemoryContent exists in memoryEntries.ts and re-embeds fire-and-forget
- [ ] consolidate_memories appears in memoryTools array with two-phase schema
- [ ] consolidate_memories handled in toolExecutor switch with preview + confirm paths
- [ ] index.ts re-exports consolidation functions
- [ ] No circular dependency issues (consolidation.ts imports from embeddings + memoryEntries — same direction as vectorSearch.ts)
- [ ] Haiku call follows same pattern as summarization.ts (model, SDK import, error handling)
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- Two-phase tool flow matches forget_fact pattern for UX consistency
- Haiku synthesis preserves specific details from both memories
- Candidate detection uses stored embeddings (zero OpenAI API calls)
- Re-embed after content update ensures search accuracy
- ~200-250 lines of new code across all files
</success_criteria>

<output>
After completion, create `.paul/phases/F-vector-memory/F-02-SUMMARY.md`
</output>
