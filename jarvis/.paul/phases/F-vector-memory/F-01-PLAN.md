---
phase: F-vector-memory
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/memory/embeddings.ts
  - src/lib/jarvis/memory/vectorSearch.ts
  - src/lib/jarvis/memory/queries/memoryEntries.ts
  - src/lib/jarvis/memory/toolExecutor.ts
  - src/lib/jarvis/memory/schema.ts
  - src/lib/jarvis/memory/index.ts
  - src/lib/jarvis/config.ts
  - src/lib/jarvis/intelligence/tools.ts
  - package.json
autonomous: true
---

<objective>
## Goal
Add embedding-based semantic search to Jarvis's memory system with dual retrieval (BM25 + vector), enabling queries like "remember when we talked about..." to find semantically related memories even when exact keywords don't match.

## Purpose
Current memory retrieval uses BM25 keyword search — great for exact term matches but fails on semantic similarity. "What restaurant did we discuss?" won't find "Le Bernardin recommended by coworker" unless the word "restaurant" appears. Vector embeddings close this gap, making Jarvis's memory genuinely intelligent.

## Output
- `embeddings.ts` — Embedding generation via OpenAI text-embedding-3-small
- `vectorSearch.ts` — Vector search + dual retrieval with RRF fusion
- `memory_embeddings` table — Separate table with F32_BLOB column + vector index
- `search_memories` tool — Semantic search available to Claude during conversations
- Upgraded `findMemoriesMatching()` — Dual retrieval replaces BM25-only
- Config flags for graceful degradation when OPENAI_API_KEY not set
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Source Files
@src/lib/jarvis/memory/schema.ts
@src/lib/jarvis/memory/db.ts
@src/lib/jarvis/memory/retrieval.ts
@src/lib/jarvis/memory/queries/memoryEntries.ts
@src/lib/jarvis/memory/toolExecutor.ts
@src/lib/jarvis/memory/index.ts
@src/lib/jarvis/config.ts
@src/lib/jarvis/intelligence/tools.ts

## Technical Decisions

### Embedding Provider: OpenAI text-embedding-3-small
- 1536 dimensions, $0.02/1M tokens — practically free at Jarvis's scale (~100 memories)
- Battle-tested, simple API, no complex setup
- Alternative considered: Voyage AI (Anthropic-recommended) — rejected for simplicity
- Anthropic doesn't offer an embedding model, so a second provider is necessary

### Vector Storage: Separate `memory_embeddings` table with F32_BLOB
- Turso/libsql has native vector support: F32_BLOB(1536) column type, vector indexes, `vector_top_k()` search
- Separate table avoids conflicts with Drizzle ORM's `drizzle-kit push` (which manages schema.ts tables only)
- Created via raw SQL with IF NOT EXISTS (idempotent)
- Vector index uses DiskANN algorithm (cosine metric) for fast approximate nearest neighbor search
- At ~100 memories, even brute-force cosine would be <1ms, but the index is free insurance for growth

### Turso Vector SQL Reference
```sql
-- Table
CREATE TABLE memory_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL UNIQUE,
  embedding F32_BLOB(1536) NOT NULL
);
-- Index
CREATE INDEX memory_embeddings_idx ON memory_embeddings(libsql_vector_idx(embedding));
-- Insert
INSERT INTO memory_embeddings (memory_id, embedding) VALUES (?, vector32(?));
-- Search
SELECT memory_id FROM vector_top_k('memory_embeddings_idx', vector32(?), 10)
JOIN memory_embeddings ON memory_embeddings.rowid = id;
```

### Dual Retrieval: Reciprocal Rank Fusion (RRF)
- Combines BM25 keyword ranking + vector semantic ranking
- RRF formula: score = Σ 1/(k + rank_i) where k=60 (standard constant)
- Results from both systems merged, re-ranked by fused score
- Existing recency/category/source scoring applied as a final boost on the fused results
</context>

<skills>
No specialized flows configured.
</skills>

<acceptance_criteria>

## AC-1: Embedding Generation on Memory Store
```gherkin
Given a new memory is stored via storeMemoryEntry()
When the memory is successfully inserted into memory_entries
Then an embedding is generated via OpenAI text-embedding-3-small
And stored in the memory_embeddings table linked by memory_id
And the embedding generation does not block the tool response (fire-and-forget)
```

## AC-2: Semantic Vector Search
```gherkin
Given memories exist with embeddings in memory_embeddings
When vectorSearch("food preferences") is called
Then memories semantically related to food are returned
And results are ordered by cosine similarity (ascending distance)
And the search uses vector_top_k with the DiskANN index
```

## AC-3: Dual Retrieval via RRF Fusion
```gherkin
Given a search query is provided
When findMemoriesMatching(query) is called
Then both BM25 keyword search and vector search execute
And results are combined using Reciprocal Rank Fusion
And the fused ranking outperforms either method alone for mixed queries
```

## AC-4: search_memories Tool
```gherkin
Given Claude is in a conversation and the user asks about past context
When Claude calls the search_memories tool with a natural language query
Then semantically similar memories are returned with relevance scores
And Claude can reference these in its response
```

## AC-5: Graceful Degradation
```gherkin
Given OPENAI_API_KEY is not set or enableVectorMemory is false
When any memory operation occurs
Then the system falls back to BM25-only search (existing behavior)
And no errors are thrown
And embedding generation is silently skipped
```

## AC-6: Lazy Backfill
```gherkin
Given existing memories were stored before vector search was enabled
When vector search is first triggered
Then memories without embeddings are backfilled in the background
And backfill progress does not block the current search (uses BM25 fallback for unembedded entries)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Embedding Infrastructure</name>
  <files>
    src/lib/jarvis/memory/embeddings.ts (new),
    src/lib/jarvis/memory/queries/memoryEntries.ts,
    src/lib/jarvis/memory/index.ts,
    src/lib/jarvis/config.ts,
    package.json
  </files>
  <action>
    **1a. Install OpenAI SDK:**
    - `npm install openai`
    - This is only used for embeddings — Anthropic SDK remains the primary AI provider

    **1b. Create `src/lib/jarvis/memory/embeddings.ts`:**
    - Lazy singleton OpenAI client (same pattern as db.ts)
    - `generateEmbedding(text: string): Promise<number[] | null>`
      - Calls `openai.embeddings.create({ model: 'text-embedding-3-small', input: text })`
      - Returns `response.data[0].embedding` (number[] of 1536 floats)
      - Returns null if OPENAI_API_KEY not set or API error (graceful degradation)
      - Normalize input: trim, collapse whitespace (same as normalizeContent in memoryEntries.ts)
    - `ensureEmbeddingsTable(): Promise<void>`
      - Uses raw SQL via `getDb()` client to create table + index (idempotent with IF NOT EXISTS)
      - SQL: CREATE TABLE memory_embeddings (id INTEGER PRIMARY KEY AUTOINCREMENT, memory_id INTEGER NOT NULL UNIQUE, embedding F32_BLOB(1536) NOT NULL)
      - SQL: CREATE INDEX IF NOT EXISTS memory_embeddings_idx ON memory_embeddings(libsql_vector_idx(embedding))
      - Cache a module-level boolean to avoid repeated CREATE TABLE calls
    - `storeEmbedding(memoryId: number, embedding: number[]): Promise<void>`
      - Raw SQL: INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding) VALUES (?, vector32(?))
      - Pass embedding as JSON string: `JSON.stringify(embedding)`
    - `getEmbedding(memoryId: number): Promise<number[] | null>`
      - Raw SQL: SELECT vector_extract(embedding) as embedding FROM memory_embeddings WHERE memory_id = ?
      - Parse result
    - `deleteEmbedding(memoryId: number): Promise<void>`
      - Raw SQL: DELETE FROM memory_embeddings WHERE memory_id = ?
    - `backfillEmbeddings(): Promise<{ total: number; processed: number; failed: number }>`
      - Get all active memory_entries
      - Find which ones lack embeddings (LEFT JOIN or subquery)
      - Generate + store embeddings for missing entries
      - Batch: process up to 50 at a time to avoid API rate limits
      - Return stats for logging
    - `isVectorSearchAvailable(): boolean`
      - Returns true only if OPENAI_API_KEY is set AND enableVectorMemory config is true

    **1c. Update `src/lib/jarvis/memory/queries/memoryEntries.ts`:**
    - In `storeMemoryEntry()`: after successful insert, fire-and-forget embedding generation
      ```typescript
      // Fire-and-forget: generate embedding (don't block response)
      if (isVectorSearchAvailable()) {
        generateAndStoreEmbedding(result[0].id, content).catch(err =>
          console.error('[Memory] Embedding generation failed:', err)
        );
      }
      ```
    - Create helper `generateAndStoreEmbedding(memoryId: number, content: string)`:
      - Call ensureEmbeddingsTable()
      - Call generateEmbedding(content)
      - If embedding returned, call storeEmbedding(memoryId, embedding)
    - In `softDeleteMemoryEntry()`: fire-and-forget delete embedding
    - In the delete-all flow: fire-and-forget drop all embeddings

    **1d. Update `src/lib/jarvis/config.ts`:**
    - Add `enableVectorMemory: boolean` — reads JARVIS_ENABLE_VECTOR_MEMORY env var (default: true when OPENAI_API_KEY is set)
    - Add `openaiApiKey: string` — reads OPENAI_API_KEY (empty string if not set)
    - Update JarvisConfig interface and getJarvisConfig()

    **1e. Update `src/lib/jarvis/memory/index.ts`:**
    - Re-export relevant functions from embeddings.ts

    **Avoid:**
    - Do NOT modify the Drizzle schema for the vector table — it's managed via raw SQL
    - Do NOT make embedding generation synchronous — it must be fire-and-forget
    - Do NOT import OpenAI at module level — use lazy initialization to prevent build-time failures on Vercel
  </action>
  <verify>
    npm run build succeeds with no type errors.
    embeddings.ts exports all listed functions.
    config.ts includes enableVectorMemory and openaiApiKey fields.
    storeMemoryEntry() has fire-and-forget embedding generation.
  </verify>
  <done>AC-1 satisfied (embedding on store), AC-5 satisfied (graceful degradation), AC-6 partially satisfied (backfill function exists)</done>
</task>

<task type="auto">
  <name>Task 2: Vector Search + Dual Retrieval + Tool Integration</name>
  <files>
    src/lib/jarvis/memory/vectorSearch.ts (new),
    src/lib/jarvis/memory/queries/memoryEntries.ts,
    src/lib/jarvis/memory/toolExecutor.ts,
    src/lib/jarvis/memory/index.ts,
    src/lib/jarvis/intelligence/tools.ts
  </files>
  <action>
    **2a. Create `src/lib/jarvis/memory/vectorSearch.ts`:**
    - `vectorSearch(query: string, limit?: number): Promise<Array<{ memoryId: number; distance: number }>>`
      - Call ensureEmbeddingsTable()
      - Generate embedding for query via generateEmbedding(query)
      - If embedding generation fails, return empty array (graceful degradation)
      - Raw SQL using vector_top_k:
        ```sql
        SELECT memory_id FROM vector_top_k('memory_embeddings_idx', vector32(?), ?)
        JOIN memory_embeddings ON memory_embeddings.rowid = id
        ```
      - Pass: [JSON.stringify(queryEmbedding), limit || 10]
      - Return array of { memoryId, distance }
      - Wrap in try/catch — if vector table doesn't exist or index fails, return empty array

    - `dualSearch(query: string, limit?: number): Promise<MemoryEntry[]>`
      - Run BM25 and vector search in parallel: `Promise.all([findMemoriesMatching(query, limit * 2), vectorSearch(query, limit * 2)])`
      - Reciprocal Rank Fusion:
        - For each result set, assign rank (1-based, by position)
        - RRF score = Σ 1/(k + rank) where k = 60
        - Merge both sets by memory ID, summing RRF scores
        - Sort by fused RRF score descending
      - Fetch full MemoryEntry for each fused result (batch query by IDs)
      - Return top `limit` entries (default 5)
      - If vector search returns empty (no API key, no embeddings): fall back to BM25-only results
      - Trigger lazy backfill if vector search available but returned fewer results than expected

    **2b. Upgrade `findMemoriesMatching()` in memoryEntries.ts:**
    - Import dualSearch from vectorSearch.ts
    - Change findMemoriesMatching() to use dualSearch() when vector search is available
    - If isVectorSearchAvailable() returns false, keep existing BM25-only behavior
    - This upgrades the forget_fact tool's search automatically

    **2c. Add `search_memories` tool to `src/lib/jarvis/intelligence/tools.ts`:**
    - Tool definition:
      ```typescript
      {
        name: 'search_memories',
        description: 'Search your memories using natural language. Finds semantically similar memories even when exact keywords don\'t match. Use this when the user asks about past conversations, stored facts, or "remember when..."',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query (e.g., "food preferences", "work schedule", "what we discussed about health")'
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default 5, max 10)'
            }
          },
          required: ['query']
        }
      }
      ```
    - Add to the memory tools array (alongside remember_fact, forget_fact, etc.)

    **2d. Add search_memories handler in `toolExecutor.ts`:**
    - Add 'search_memories' to MemoryToolName union type
    - Add case in executeMemoryTool switch
    - Handler `handleSearchMemories(input)`:
      - Extract query and limit from input
      - Call dualSearch(query, Math.min(limit || 5, 10))
      - Format results with id, content, category, age, relevance indicator
      - Return JSON with success, message, results array
    - Add to summarizeToolContext for audit logging

    **2e. Update `src/lib/jarvis/memory/index.ts`:**
    - Re-export vectorSearch and dualSearch from vectorSearch.ts

    **Avoid:**
    - Do NOT remove or change the existing BM25 implementation — it remains the fallback
    - Do NOT make vector search a hard dependency — everything must work without OPENAI_API_KEY
    - Do NOT call backfill synchronously during search — trigger it fire-and-forget, return BM25 results immediately
    - Do NOT add search_memories to the Notion or tutorial tool routing — it's a memory tool
  </action>
  <verify>
    npm run build succeeds with no type errors.
    vectorSearch.ts exports vectorSearch() and dualSearch().
    findMemoriesMatching() uses dual search when available.
    tools.ts includes search_memories definition.
    toolExecutor.ts handles search_memories tool calls.
    MemoryToolName includes 'search_memories'.
  </verify>
  <done>AC-2 satisfied (vector search), AC-3 satisfied (dual retrieval), AC-4 satisfied (search_memories tool), AC-6 fully satisfied (lazy backfill triggered)</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/memory/retrieval.ts — Existing scoring system (recency/category/source/decay) is untouched; dual retrieval is additive
- src/lib/jarvis/memory/decay.ts — Decay system unchanged
- src/lib/jarvis/memory/summarization.ts — Session summarization unchanged
- src/lib/jarvis/memory/preferenceInference.ts — Preference inference unchanged
- src/lib/jarvis/intelligence/chatProcessor.ts — Chat processing flow unchanged
- src/lib/jarvis/intelligence/sdkBrain.ts — Brain architecture unchanged
- src/lib/jarvis/memory/schema.ts — DO NOT add vector columns to Drizzle schema (managed via raw SQL)
- All Phase E UI code (jarvis/app/*) — UI is independent of backend memory changes

## SCOPE LIMITS
- This plan does NOT implement memory consolidation (merging similar memories) — that's F-02
- This plan does NOT change how memories are loaded at session start (retrieveMemories without query) — existing score-based ranking continues
- This plan does NOT add embeddings to messages, sessions, or other tables — only memory_entries
- Do NOT add a new npm dependency besides `openai`

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` succeeds with zero errors
- [ ] embeddings.ts compiles and exports: generateEmbedding, ensureEmbeddingsTable, storeEmbedding, backfillEmbeddings, isVectorSearchAvailable
- [ ] vectorSearch.ts compiles and exports: vectorSearch, dualSearch
- [ ] config.ts has enableVectorMemory and openaiApiKey fields
- [ ] storeMemoryEntry() fires-and-forgets embedding generation
- [ ] findMemoriesMatching() uses dualSearch when vector search available
- [ ] tools.ts has search_memories tool definition
- [ ] toolExecutor.ts handles search_memories with proper response format
- [ ] No existing tests broken (if any exist)
- [ ] Graceful degradation: removing OPENAI_API_KEY should not cause errors
</verification>

<success_criteria>
- All tasks completed with zero build errors
- All acceptance criteria (AC-1 through AC-6) satisfied
- Existing BM25 search continues working unchanged as fallback
- No new runtime dependencies beyond `openai` package
- Fire-and-forget pattern maintained — embedding generation never blocks tool responses
</success_criteria>

<output>
After completion, create `.paul/phases/F-vector-memory/F-01-SUMMARY.md`
</output>
