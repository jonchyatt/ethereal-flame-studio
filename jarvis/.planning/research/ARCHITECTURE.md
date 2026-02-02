# Architecture Patterns: Memory System Integration

**Domain:** Persistent Memory for Voice AI Assistant
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (patterns verified via research and existing codebase analysis)

## Executive Summary

Jarvis v1 has a functional voice pipeline with limited in-session memory via `MemoryStore` (localStorage) and `ConversationManager` (sliding window). The v2 milestone adds **persistent cross-session memory** that survives page refreshes and enables true conversational continuity.

The recommended architecture follows the **Mem0 pattern**: a hybrid memory system with file-based long-term facts (MEMORY.md), structured SQLite storage with embeddings for searchable memory, and daily session logs for event tracking. This integrates cleanly with the existing architecture by:

1. Adding a new `memory/` module under `src/lib/jarvis/`
2. Extending `systemPrompt.ts` to include loaded memory context
3. Adding memory write operations as Claude tool calls
4. Using server-side SQLite (better-sqlite3 via Prisma) for structured storage

## Existing Architecture (v1)

```
src/lib/jarvis/
+-- audio/                  # Microphone capture, VAD
+-- voice/
|   +-- VoicePipeline.ts    # Orchestrates full voice flow
|   +-- DeepgramClient.ts   # STT via WebSocket
|   +-- SpeechClient.ts     # ElevenLabs TTS
|
+-- intelligence/
|   +-- ClaudeClient.ts     # Browser-side streaming client
|   +-- ConversationManager.ts  # Sliding window (10 messages)
|   +-- MemoryStore.ts      # localStorage persistence (summary + 20 facts)
|   +-- systemPrompt.ts     # Personality + context builder
|   +-- tools.ts            # 10 Notion tool definitions
|
+-- notion/
|   +-- NotionClient.ts     # MCP connection
|   +-- toolExecutor.ts     # Tool implementation
|   +-- schemas.ts          # Query builders
|
+-- executive/
|   +-- BriefingFlow.ts     # Morning briefing state machine
|   +-- CheckInManager.ts   # Periodic check-ins
|   +-- WeeklyReviewFlow.ts # Weekly review workflow
|
+-- stores/
|   +-- jarvisStore.ts      # Zustand UI state
```

### Current Memory Limitations

| Component | What It Does | Limitation |
|-----------|--------------|------------|
| `MemoryStore.ts` | localStorage with summary + 20 key facts | Browser-only, no search, manual fact extraction |
| `ConversationManager.ts` | Sliding window of 10 recent messages | Loses context in long sessions |
| `systemPrompt.ts` | Injects keyFacts into Claude context | No structured retrieval, no temporal awareness |

**Key Gap:** No server-side persistence, no semantic search, no automatic memory extraction.

## Proposed Architecture (v2)

```
src/lib/jarvis/
+-- memory/                           # NEW: Memory system
|   +-- MemoryService.ts              # Main facade for all memory operations
|   +-- storage/
|   |   +-- MemoryDatabase.ts         # SQLite operations (Prisma + better-sqlite3)
|   |   +-- schema.prisma             # Database schema
|   +-- retrieval/
|   |   +-- MemoryLoader.ts           # Session start context loading
|   |   +-- SemanticSearch.ts         # Vector similarity search
|   |   +-- HybridRetrieval.ts        # BM25 + embeddings fusion
|   +-- extraction/
|   |   +-- FactExtractor.ts          # Extract facts from conversations
|   |   +-- SessionSummarizer.ts      # Summarize sessions on close
|   +-- types.ts                      # Memory entry interfaces
|
+-- intelligence/
|   +-- MemoryStore.ts                # DEPRECATED: migrate to MemoryService
|   +-- ConversationManager.ts        # MODIFY: integrate MemoryService
|   +-- systemPrompt.ts               # MODIFY: include memory context
|   +-- tools.ts                      # ADD: memory tools (recall, remember)
|
data/
+-- jarvis_memory.db                  # SQLite database file
+-- JARVIS_MEMORY.md                  # Human-readable long-term facts
```

## Component Design

### 1. MemoryService (Main Facade)

Central orchestrator for all memory operations. Provides clean interface for VoicePipeline and flows.

```typescript
// src/lib/jarvis/memory/MemoryService.ts
export interface MemoryService {
  // Session lifecycle
  loadSessionContext(): Promise<MemoryContext>;
  closeSession(summary: string): Promise<void>;

  // During conversation
  recordEvent(event: MemoryEvent): Promise<void>;
  recordFact(fact: MemoryFact): Promise<void>;

  // Retrieval
  search(query: string): Promise<MemoryEntry[]>;
  getRecentEvents(days: number): Promise<MemoryEvent[]>;

  // Management
  updateLongTermMemory(fact: string, section: string): Promise<void>;
}

export interface MemoryContext {
  longTermFacts: string;      // From JARVIS_MEMORY.md
  recentEvents: MemoryEvent[];// Last 2 days of daily logs
  relevantFacts: MemoryFact[];// High-importance stored facts
  sessionSummary: string;     // Yesterday's session summary
}
```

### 2. MemoryDatabase (Storage Layer)

SQLite with Prisma for structured storage. Uses better-sqlite3 for synchronous operations on server.

```prisma
// src/lib/jarvis/memory/storage/schema.prisma
model MemoryEntry {
  id            String   @id @default(uuid())
  type          String   // fact, preference, event, insight, relationship
  content       String
  contentHash   String   @unique // For deduplication
  source        String   // user, inferred, session, system
  importance    Int      @default(5) // 1-10
  confidence    Float    @default(1.0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastAccessed  DateTime?
  accessCount   Int      @default(0)

  embedding     Bytes?   // Vector for semantic search (optional)
  tags          String?  // JSON array
  context       String?  // Where this was learned
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
}

model DailyLog {
  id          String   @id @default(uuid())
  date        DateTime @unique
  summary     String?
  rawLog      String   // Append-only event log
  keyEvents   String?  // JSON array of highlights
  entryCount  Int      @default(0)
}

model SessionSummary {
  id          String   @id @default(uuid())
  startTime   DateTime
  endTime     DateTime
  summary     String
  factCount   Int
  eventCount  Int
  topics      String?  // JSON array
}
```

### 3. MemoryLoader (Session Start)

Loads relevant memory context at session initialization.

```typescript
// src/lib/jarvis/memory/retrieval/MemoryLoader.ts
export class MemoryLoader {
  constructor(
    private db: MemoryDatabase,
    private memoryMdPath: string
  ) {}

  async loadForSession(): Promise<MemoryContext> {
    const [longTermFacts, recentEvents, importantFacts, lastSummary] =
      await Promise.all([
        this.loadLongTermFacts(),
        this.loadRecentEvents(2), // Last 2 days
        this.loadHighImportanceFacts(10), // Top 10 by importance
        this.getLastSessionSummary(),
      ]);

    return {
      longTermFacts,
      recentEvents,
      relevantFacts: importantFacts,
      sessionSummary: lastSummary,
    };
  }

  private async loadLongTermFacts(): Promise<string> {
    // Read JARVIS_MEMORY.md file
    // This contains curated, human-readable facts
  }

  private async loadRecentEvents(days: number): Promise<MemoryEvent[]> {
    // Query daily_logs table for recent days
  }

  private async loadHighImportanceFacts(limit: number): Promise<MemoryFact[]> {
    // Query memory_entries WHERE importance >= 7 ORDER BY lastAccessed DESC
  }
}
```

### 4. HybridRetrieval (Search)

Combines BM25 keyword search with semantic vector search for optimal recall.

```typescript
// src/lib/jarvis/memory/retrieval/HybridRetrieval.ts
export class HybridRetrieval {
  private bm25Weight = 0.7;
  private semanticWeight = 0.3;

  async search(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    const [keywordResults, semanticResults] = await Promise.all([
      this.bm25Search(query, limit * 2),
      this.semanticSearch(query, limit * 2),
    ]);

    // Reciprocal Rank Fusion
    return this.fuseResults(keywordResults, semanticResults, limit);
  }

  private async bm25Search(query: string, limit: number): Promise<RankedResult[]> {
    // SQLite FTS5 full-text search
    // Uses built-in BM25 ranking
  }

  private async semanticSearch(query: string, limit: number): Promise<RankedResult[]> {
    // Generate query embedding
    // Cosine similarity against stored embeddings
    // Can use sqlite-vec extension or in-memory comparison
  }

  private fuseResults(
    kw: RankedResult[],
    sem: RankedResult[],
    limit: number
  ): MemoryEntry[] {
    // RRF: score = sum(1 / (k + rank)) for each result list
    // Return top `limit` by fused score
  }
}
```

### 5. FactExtractor (Automatic Extraction)

Extracts memorable facts from conversations using Claude.

```typescript
// src/lib/jarvis/memory/extraction/FactExtractor.ts
export class FactExtractor {
  async extractFromConversation(
    messages: Message[],
    existingFacts: string[]
  ): Promise<ExtractedFact[]> {
    const prompt = `Analyze this conversation and extract facts worth remembering.

Rules:
- Only extract NOVEL information not already known
- Focus on: preferences, patterns, important events, relationships
- Assign importance 1-10 (10 = critical to remember)
- Be conservative - better to miss facts than store noise

Already known facts:
${existingFacts.join('\n')}

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond in JSON:
{
  "facts": [
    {"content": "...", "type": "preference|event|insight|relationship", "importance": 7}
  ]
}`;

    // Call Claude for extraction
    // Return structured facts
  }
}
```

## Integration Points

### 1. VoicePipeline Integration

Modify `VoicePipeline.ts` to use MemoryService for session management.

```typescript
// Changes to src/lib/jarvis/voice/VoicePipeline.ts

export class VoicePipeline {
  private memoryService: MemoryService;

  constructor(config: VoicePipelineConfig = {}) {
    // ... existing code ...

    // Initialize memory service
    this.memoryService = new MemoryService();
  }

  async initialize(): Promise<boolean> {
    // ... existing permission check ...

    // Load memory context at session start
    const memoryContext = await this.memoryService.loadSessionContext();
    this.conversationManager.setMemoryContext(memoryContext);

    return true;
  }

  private async generateIntelligentResponse(transcript: string): Promise<string> {
    // ... existing code ...

    // Build system prompt WITH memory context
    const systemPrompt = buildSystemPrompt({
      currentTime: new Date(),
      keyFacts: this.conversationManager.getKeyFacts(),
      memoryContext: this.conversationManager.getMemoryContext(), // NEW
    });

    // ... rest of method ...
  }
}
```

### 2. SystemPrompt Integration

Extend `systemPrompt.ts` to include memory context.

```typescript
// Changes to src/lib/jarvis/intelligence/systemPrompt.ts

export interface SystemPromptContext {
  currentTime: Date;
  userName?: string;
  keyFacts?: string[];
  memoryContext?: MemoryContext;  // NEW
}

export function buildSystemPrompt(context: SystemPromptContext): string {
  const sections: string[] = [];

  // ... existing personality section ...

  // NEW: Long-term memory section
  if (context.memoryContext?.longTermFacts) {
    sections.push(`PERSISTENT MEMORY (always relevant):
${context.memoryContext.longTermFacts}`);
  }

  // NEW: Recent events section
  if (context.memoryContext?.recentEvents?.length) {
    const recentSummary = context.memoryContext.recentEvents
      .slice(0, 5)
      .map(e => `- ${e.summary}`)
      .join('\n');
    sections.push(`RECENT ACTIVITY:
${recentSummary}`);
  }

  // NEW: Yesterday's summary
  if (context.memoryContext?.sessionSummary) {
    sections.push(`YESTERDAY'S SESSION:
${context.memoryContext.sessionSummary}`);
  }

  // ... existing sections ...

  return sections.join('\n\n');
}
```

### 3. Memory Tools for Claude

Add memory tools so Claude can explicitly store/recall information.

```typescript
// Additions to src/lib/jarvis/intelligence/tools.ts

export const memoryTools: ToolDefinition[] = [
  {
    name: 'remember_fact',
    description: 'Store an important fact for future reference. Use when user shares preferences, important information, or patterns worth remembering.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The fact to remember'
        },
        type: {
          type: 'string',
          description: 'Category of information',
          enum: ['preference', 'fact', 'relationship', 'pattern']
        },
        importance: {
          type: 'number',
          description: 'How important (1-10, default 5)'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'recall_memory',
    description: 'Search past conversations and stored facts. Use when user asks about something discussed before or when context would help.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for in memory'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'update_long_term',
    description: 'Update permanent memory file with a new fact. Use sparingly for truly persistent information.',
    input_schema: {
      type: 'object',
      properties: {
        fact: {
          type: 'string',
          description: 'The fact to permanently store'
        },
        section: {
          type: 'string',
          description: 'Memory section',
          enum: ['preferences', 'work', 'personal', 'patterns', 'system']
        }
      },
      required: ['fact', 'section']
    }
  }
];
```

### 4. API Route Changes

Add memory endpoints for server-side operations.

```
src/app/api/jarvis/
+-- chat/route.ts           # MODIFY: add memory tools
+-- memory/
    +-- route.ts            # NEW: GET session context, POST events
    +-- search/route.ts     # NEW: Memory search endpoint
```

## Data Flow: Memory-Enhanced Conversation

### Session Start Flow

```
1. User opens Jarvis page
2. VoicePipeline.initialize() called
3. MemoryService.loadSessionContext() executes:
   a. Read JARVIS_MEMORY.md (long-term facts)
   b. Query SQLite for last 2 days of events
   c. Query SQLite for top 10 high-importance facts
   d. Get last session summary
4. Memory context injected into ConversationManager
5. System prompt built with memory context
6. Ready for conversation
```

### During Conversation Flow

```
1. User says something memorable ("I prefer meetings before noon")
2. Claude recognizes this as a preference
3. Claude calls remember_fact tool:
   { "content": "Prefers meetings scheduled before noon", "type": "preference", "importance": 8 }
4. ToolExecutor routes to MemoryService.recordFact()
5. MemoryDatabase stores with hash deduplication
6. If importance >= 8, also appends to JARVIS_MEMORY.md
7. Fact available for future sessions
```

### Memory Recall Flow

```
1. User asks "What did we discuss about the Johnson project?"
2. Claude calls recall_memory tool:
   { "query": "Johnson project discussion" }
3. HybridRetrieval executes:
   a. BM25 search on "Johnson project discussion"
   b. Semantic search with query embedding
   c. RRF fusion of results
4. Top 5 results returned to Claude
5. Claude synthesizes answer from memory + context
```

### Session End Flow

```
1. User closes Jarvis or inactivity timeout
2. MemoryService.closeSession() called
3. SessionSummarizer generates summary using Claude:
   - Key topics discussed
   - Decisions made
   - Facts learned
4. Summary stored in session_summaries table
5. Daily log entry created/updated
```

## JARVIS_MEMORY.md Structure

Human-readable, curated facts file. Lives in project root.

```markdown
# Jarvis Memory

Last updated: 2026-02-02

## User Preferences

- Prefers brief morning briefings, detailed evening reviews
- Likes time reminders every 30 minutes during deep work
- Prefers bill reminders 3 days before due date
- Morning person - most productive before noon

## Work Context

- Current main project: Ethereal Flame Studio
- Uses Notion for task management (PARA method)
- Workday typically 9am-6pm

## Personal Patterns

- Tends to forget evening check-ins
- Gets overwhelmed by long task lists
- Responds well to gentle nudges, not aggressive reminders

## Technical Context

- Development environment: Windows, VS Code
- Primary languages: TypeScript, React
- Hosts on Vercel

## Relationships

- Reports to: [Manager name]
- Key collaborators: [Names]
```

## Build Order (Phased Implementation)

### Phase 1: Storage Foundation

**What:** Set up SQLite database with Prisma, basic CRUD operations.

**Depends on:** Nothing (clean start)

**Deliverables:**
- `schema.prisma` with MemoryEntry, DailyLog, SessionSummary
- `MemoryDatabase.ts` with basic operations
- Database migrations
- Unit tests for CRUD

**Estimated complexity:** LOW

### Phase 2: Memory Loading

**What:** Session start context loading, system prompt integration.

**Depends on:** Phase 1 (storage exists)

**Deliverables:**
- `MemoryLoader.ts` implementation
- `JARVIS_MEMORY.md` template
- Modified `systemPrompt.ts` with memory context
- Modified `VoicePipeline.ts` initialize()

**Estimated complexity:** MEDIUM

### Phase 3: Memory Writing

**What:** Automatic and explicit memory recording during conversations.

**Depends on:** Phase 2 (loading works)

**Deliverables:**
- Memory tools in `tools.ts`
- `remember_fact` and `update_long_term` tool implementations
- Event recording integration
- Daily log append logic

**Estimated complexity:** MEDIUM

### Phase 4: Memory Search

**What:** Hybrid retrieval for recall_memory tool.

**Depends on:** Phase 3 (data exists to search)

**Deliverables:**
- FTS5 full-text index setup
- `HybridRetrieval.ts` with BM25 search
- `recall_memory` tool implementation
- Optional: embedding generation for semantic search

**Estimated complexity:** MEDIUM-HIGH

### Phase 5: Session Management

**What:** Session summarization and cleanup.

**Depends on:** Phase 3 & 4 (full memory operations)

**Deliverables:**
- `SessionSummarizer.ts` using Claude
- Session close flow
- `FactExtractor.ts` for automatic fact extraction
- Memory cleanup/expiration logic

**Estimated complexity:** MEDIUM

### Phase 6: Migration

**What:** Migrate existing localStorage memory to new system.

**Depends on:** Phase 5 (new system complete)

**Deliverables:**
- Migration script for existing keyFacts
- Deprecation of old `MemoryStore.ts`
- Documentation updates

**Estimated complexity:** LOW

## Technology Choices

| Component | Technology | Why |
|-----------|------------|-----|
| Database | SQLite via Prisma + better-sqlite3 | Server-side, zero-config, Prisma adapter available, fast for single-user |
| Full-text search | SQLite FTS5 | Built-in, BM25 ranking, no external dependency |
| Vector storage | sqlite-vec OR in-memory | Optional - FTS5 may be sufficient for single user |
| Embeddings | OpenAI text-embedding-3-small | If semantic search needed, $0.02/1M tokens |
| Long-term facts | Markdown file | Human-readable, git-tracked, easy to edit manually |

## Scalability (Not a Concern)

For single-user Jarvis, memory operations will be fast:
- SQLite handles millions of rows easily
- FTS5 indexing is automatic
- No concurrent access concerns
- Local database = zero latency

## Anti-Patterns to Avoid

### Anti-Pattern: Storing Everything

**Bad:** Recording every utterance as a memory entry.

**Why:** Noise drowns signal. Memory search becomes useless.

**Instead:** Use importance scoring. Only store facts with importance >= 5 automatically. Let Claude judge what's worth remembering.

### Anti-Pattern: Synchronous Embedding Generation

**Bad:** Generating embeddings during conversation flow.

**Why:** Embedding API calls add 100-500ms latency per memory operation.

**Instead:** Queue embedding generation as background task. Start with BM25-only search which is instant.

### Anti-Pattern: Loading All Memory at Session Start

**Bad:** Loading entire memory database into context.

**Why:** Token limits, slow startup, unnecessary cost.

**Instead:** Load curated subset (MEMORY.md + recent + high-importance). Use search for specific recall.

### Anti-Pattern: Browser-Side SQLite

**Bad:** Running SQLite in the browser via WASM.

**Why:** Complex setup, limited query capabilities, storage limits.

**Instead:** All SQLite operations via API routes. Browser uses fetch().

## Open Questions (Needs Phase-Specific Research)

1. **Embedding Model Choice:** If semantic search is needed, should we use local model (Xenova/transformers.js) or OpenAI API?

2. **Memory Expiration:** Should old, low-importance, never-accessed memories be auto-deleted?

3. **Cross-Device Sync:** If user accesses from multiple devices, how to sync JARVIS_MEMORY.md changes?

4. **Privacy:** Should sensitive memories (financial, health) have additional protection?

## Sources

### HIGH Confidence
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413) - Memory architecture patterns
- [Prisma better-sqlite3 Adapter](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) - Database setup
- [SQLite FTS5](https://www.sqlite.org/fts5.html) - Full-text search
- Existing Jarvis codebase analysis

### MEDIUM Confidence
- [sqlite-vec Extension](https://github.com/asg017/sqlite-vec) - Vector search in SQLite
- [Hybrid Search Patterns](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking) - BM25 + vector fusion
- [Design Patterns for Long-Term Memory in LLM-Powered Architectures](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures) - Architecture patterns

### LOW Confidence (Needs Validation)
- Optimal importance threshold for auto-storage
- Best embedding model for conversational memory
- Memory retention periods
