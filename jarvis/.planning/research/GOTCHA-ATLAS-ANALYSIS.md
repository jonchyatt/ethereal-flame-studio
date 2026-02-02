# GOTCHA/ATLAS Framework Analysis for Jarvis v2

## Executive Summary

The GOTCHA/ATLAS framework from the YouTube video presents a **separation-of-concerns architecture** for AI agent systems that addresses the probabilistic nature of LLMs by pushing reliability into deterministic components. The most valuable component for Jarvis v2 is the **persistent memory system**, which provides cross-session conversational memory, semantic search, and self-healing loops.

---

## The GOTCHA Framework

A 6-layer architecture that bridges probabilistic AI with deterministic execution.

### GOT (The Engine)

| Layer | Location | Purpose |
|-------|----------|---------|
| **G**oals | `goals/` | Task definitions, SOPs, process instructions |
| **O**rchestration | AI (Claude) | Coordinates execution, makes judgment calls |
| **T**ools | `tools/` | Deterministic scripts that execute reliably |

### CHA (The Context)

| Layer | Location | Purpose |
|-------|----------|---------|
| **C**ontext | `context/` | Domain knowledge, examples, reference material |
| **H**ard prompts | `hardprompts/` | Reusable instruction templates for LLM sub-tasks |
| **A**rgs | `args/` | Runtime behavior settings (YAML/JSON) |

### Why This Matters

> "90% accuracy per step sounds good until you realize that's ~59% accuracy over 5 steps."

The core insight: **LLMs are probabilistic, business logic is deterministic**. By separating concerns:
- AI handles flexibility/reasoning
- Tools handle reliable execution
- Goals define clear processes
- Args modify behavior without code changes

---

## The ATLAS Framework (App Building)

A 5-step process for building production-ready applications.

| Step | Phase | What It Does |
|------|-------|--------------|
| **A** | Architect | Define problem, users, success metrics, constraints |
| **T** | Trace | Data schema, integrations map, stack proposal, edge cases |
| **L** | Link | Validate ALL connections before building |
| **A** | Assemble | Build with layered architecture (DB → API → UI) |
| **S** | Stress-test | Functional, integration, edge case, user acceptance testing |

For production builds, add:
- **V** - Validate (security, input sanitization, edge cases)
- **M** - Monitor (logging, observability, alerts)

### Key Anti-Patterns Identified

1. Building before designing
2. Skipping connection validation
3. No data modeling upfront
4. No testing
5. Hardcoding everything

---

## The Memory System (Most Valuable for Jarvis)

This is what Moltbot/OpenClaw has that the framework adds. **This is the high-priority gap for Jarvis v2.**

### Architecture

```
memory/
├── MEMORY.md          # Long-term facts/preferences (always loaded)
├── logs/
│   ├── 2026-02-01.md  # Daily append-only logs
│   └── 2026-02-02.md
└── index.json         # Fast lookup index

data/
└── memory.db          # SQLite with embeddings
```

### Three-Layer Memory

1. **MEMORY.md** - Human-readable, curated facts that persist forever
   - User preferences
   - Key facts about work/projects
   - Learned behaviors
   - Technical context

2. **Daily Logs** - Session-level activity tracking
   - Timestamped events
   - Append-only (no edits)
   - Human-readable markdown

3. **SQLite Database** - Structured storage with search
   - Content deduplication (hash-based)
   - Importance scoring (1-10)
   - Memory types: fact, preference, event, insight, task, relationship
   - Embedding storage for semantic search
   - Access tracking analytics

### Memory Protocol

**Session Start:**
```python
# Load memory context
python tools/memory/memory_read.py --format markdown
# Reads: MEMORY.md + today's log + yesterday's log
```

**During Session:**
```python
# Append event to daily log
python tools/memory/memory_write.py --content "event" --type event

# Add searchable fact to database
python tools/memory/memory_write.py --content "fact" --type fact --importance 7

# Update persistent memory (sparingly)
python tools/memory/memory_write.py --update-memory --content "New preference" --section user_preferences
```

**Search Memory:**
```python
# Keyword search
python tools/memory/memory_db.py --action search --query "keyword"

# Semantic search (embeddings)
python tools/memory/semantic_search.py --query "related concept"

# Hybrid search (BM25 + vector - best results)
python tools/memory/hybrid_search.py --query "what does user prefer"
```

### Database Schema

```sql
CREATE TABLE memory_entries (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,           -- fact, preference, event, insight, task, relationship
    content TEXT NOT NULL,
    content_hash TEXT UNIQUE,     -- Deduplication
    source TEXT,                  -- user, inferred, session, external, system
    confidence REAL DEFAULT 1.0,
    importance INTEGER DEFAULT 5, -- 1-10
    created_at DATETIME,
    updated_at DATETIME,
    last_accessed DATETIME,
    access_count INTEGER DEFAULT 0,
    embedding BLOB,               -- Vector for semantic search
    embedding_model TEXT,
    tags TEXT,                    -- JSON array
    context TEXT,
    expires_at DATETIME,
    is_active INTEGER DEFAULT 1   -- Soft delete
);

CREATE TABLE daily_logs (
    id INTEGER PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    summary TEXT,
    raw_log TEXT,
    key_events TEXT,              -- JSON array
    entry_count INTEGER DEFAULT 0
);

CREATE TABLE memory_access_log (
    id INTEGER PRIMARY KEY,
    memory_id INTEGER,
    access_type TEXT,             -- read, search, update, reference
    query TEXT,
    accessed_at DATETIME
);
```

### Embedding System

Uses OpenAI's `text-embedding-3-small` model:
- 1536 dimensions
- ~$0.02 per 1M tokens
- Stored as BLOBs in SQLite
- Cosine similarity for search

Hybrid search combines:
- **BM25** (0.7 weight) - Exact token matching
- **Semantic** (0.3 weight) - Meaning similarity

---

## Moltbot Gap Analysis

The video's gap analysis revealed what Moltbot has vs. a basic GOTCHA setup:

| Feature | Moltbot | GOTCHA Baseline | Gap Level |
|---------|---------|-----------------|-----------|
| Persistent memory | memory.md + daily logs + vector search | Task-specific SQLite | **HIGH** |
| Semantic search | SQLite-VEC + BM25 hybrid | None | **HIGH** |
| Proactive notifications | Heartbeat cron + scheduled briefings | None | MEDIUM |
| Messaging gateway | Slack + Telegram | Slack only | LOW |
| Always-on agent | Background NodeJS service | None | MEDIUM |
| Community skills | 700+ (but 26% have vulnerabilities) | Custom tools only | N/A (better) |
| Security | YOLO mode, no guardrails | Separation of concerns | Better |

### Critical Moltbot Security Issues

1. **No guardrails by default** - Executes any command with unlimited permissions
2. **Credential exposure** - Leaks plain text API keys via prompt injection
3. **Skill poisoning** - 26% of community skills contain vulnerabilities
4. **Data exfiltration** - Skills can silently curl data to external servers
5. **Supply chain risk** - Local file installation from community skills

---

## What Jarvis v2 Can Learn

### High Value: Persistent Memory

Jarvis currently has no cross-session memory. Adding this would enable:

1. **Conversation continuity** - "Continue from where we left off"
2. **Learned preferences** - "User prefers brief morning briefings"
3. **Pattern detection** - "User frequently forgets evening check-ins"
4. **Context compression** - Save key facts before context window fills

**Implementation for Jarvis:**
```typescript
// JarvisMemory.ts
interface MemoryEntry {
  type: 'fact' | 'preference' | 'event' | 'insight' | 'task' | 'relationship';
  content: string;
  importance: number; // 1-10
  source: 'user' | 'inferred' | 'session' | 'system';
  embedding?: number[]; // For semantic search
}

// Session start
const memory = await loadMemory(); // MEMORY.md + recent logs + DB
claudeContext.push({ role: 'system', content: memory.asPrompt() });

// During conversation
await writeMemory({
  type: 'preference',
  content: 'User prefers time nudges every 30 minutes during deep work',
  importance: 8,
  source: 'inferred'
});
```

### Medium Value: Self-Healing Loops

The framework includes error recovery patterns:

```
When tool fails:
1. Read the error and stack trace
2. Update the tool to handle the issue
3. Document what you learned in the goal
4. Retry
```

For Jarvis, this could mean:
- Auto-retry failed Notion API calls with backoff
- Learn which operations frequently fail
- Adapt prompts based on past failures

### Medium Value: Guardrails Layer

```yaml
# args/security_guardrails.yaml
dangerous_operations:
  - pattern: "rm -rf"
    action: block
  - pattern: "DELETE FROM"
    action: confirm_3x
  - pattern: "notion.blocks.delete"
    action: confirm
```

For Jarvis:
- Never delete tasks without confirmation
- Rate limit expensive API calls
- Confirm destructive operations

### Lower Value: Goals/Tools Separation

Jarvis already has good separation with:
- `src/lib/jarvis/skills/` - Tool implementations
- `src/lib/jarvis/intelligence/` - AI reasoning
- `src/lib/jarvis/flows/` - Orchestration

The GOTCHA pattern of `goals/*.md` → manifest lookup → tool execution could formalize this further.

---

## Recommended v2 Enhancements

### Priority 1: Persistent Memory System

Add to Jarvis:
1. `JARVIS_MEMORY.md` - Long-term facts (loaded every session)
2. Session logs table in local SQLite or Notion
3. Key facts extraction at end of each conversation
4. Semantic search via embeddings (optional - adds latency/cost)

### Priority 2: Daily Log Protocol

1. Append notable events during each session
2. Sync logs to Notion "Jarvis Sessions" database
3. Reference yesterday's log in morning briefing context

### Priority 3: Self-Healing Patterns

1. Structured error logging with context
2. Retry logic with exponential backoff
3. "What went wrong" field in session logs
4. Periodic review of failure patterns

### Priority 4: Guardrails Configuration

1. `jarvis-guardrails.yaml` for safety rules
2. Confirmation flows for destructive actions
3. Rate limiting on expensive operations
4. Audit log for all tool invocations

---

## Integration with Existing Jarvis

### Current Jarvis Architecture

```
src/lib/jarvis/
├── core/                  # Core infrastructure
├── intelligence/          # Claude integration
├── voice/                 # Deepgram STT + ElevenLabs TTS
├── skills/                # Tool implementations (10 Notion tools)
├── flows/                 # Briefing, check-in, review flows
└── data/                  # Notion integration
```

### Proposed Memory Addition

```
src/lib/jarvis/
├── memory/
│   ├── MemoryStore.ts     # SQLite/Notion storage
│   ├── MemoryLoader.ts    # Session start loading
│   ├── MemoryWriter.ts    # Event/fact recording
│   ├── SemanticSearch.ts  # Optional embedding search
│   └── SessionLog.ts      # Daily log management
└── JARVIS_MEMORY.md       # Long-term facts (git-tracked)
```

### Memory Protocol for Jarvis

**Session Start:**
```typescript
// In JarvisIntelligence.constructor()
const memoryContext = await MemoryLoader.loadForSession();
// Includes: JARVIS_MEMORY.md + today's log + yesterday's log + recent high-importance facts

this.systemPrompt += `\n\n## Persistent Memory\n${memoryContext}`;
```

**During Conversation:**
```typescript
// After each meaningful exchange
await MemoryWriter.append({
  type: 'event',
  content: 'User completed morning briefing, marked 3 tasks done',
  importance: 5
});

// When learning a preference
await MemoryWriter.append({
  type: 'preference',
  content: 'User prefers bill reminders 3 days before due, not day-of',
  importance: 8,
  updatePersistent: true // Also add to JARVIS_MEMORY.md
});
```

**Session End:**
```typescript
// Summarize session, extract key facts
const sessionSummary = await MemoryWriter.closeSession();
// Creates daily log entry with key events
```

---

## Conclusion

The GOTCHA/ATLAS framework provides a solid architectural pattern, but the **memory system** is the highest-value component for Jarvis v2. It directly addresses the gap of "Jarvis doesn't remember anything between sessions" and would enable:

1. **Personalization over time** - Learn user patterns and preferences
2. **Context continuity** - "Remember what we discussed yesterday"
3. **Pattern recognition** - Identify neglected areas, recurring issues
4. **Audit trail** - Full history of all interactions

The framework's separation of concerns is already largely present in Jarvis's architecture. The memory system fills a genuine gap.

---

*Research compiled: 2026-02-01*
*Source: YouTube transcript + atlas_framework files*
