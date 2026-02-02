# Phase 9: Memory Writing & Tools - Research

**Researched:** 2026-02-02
**Domain:** Voice-driven memory management, intent detection, soft delete, memory decay
**Confidence:** MEDIUM-HIGH

## Summary

Phase 9 enables explicit user control over Jarvis's memory: adding facts via "remember" commands, removing facts via "forget" commands, querying stored memories, bulk deletion, automatic preference learning, and intelligent memory decay. The existing codebase already has the storage foundation (schema, MemoryService, retrieval) from Phase 7-8. This phase adds the write/delete operations and the Claude tools that trigger them.

The architecture follows the existing pattern: Claude detects intent from user speech, calls memory tools, and the chat API executes those tools server-side. No new external libraries are required. The main technical challenges are:
1. Intent detection for remember/forget commands (handled by Claude with system prompt guidance)
2. Fuzzy matching for forget requests (use existing content normalization + substring/relevance matching)
3. Soft delete with 30-day recovery (add `deleted_at` column, exclude in queries)
4. Memory decay algorithm (recency-weighted scoring, already partially implemented)

**Primary recommendation:** Extend the existing MemoryService with `forget()`, `restore()`, `listMemories()`, and `deleteAll()` methods. Add Claude tools (`remember_fact`, `forget_fact`, `list_memories`, `delete_all_memories`) that map to these methods. Use Claude's natural language understanding for intent detection rather than regex patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @libsql/client | existing | SQLite client for Turso | Already in codebase, required for serverless |
| drizzle-orm | existing | Type-safe SQL queries | Already in codebase, handles soft delete pattern |
| @anthropic-ai/sdk | existing | Claude API with tools | Already in codebase, handles tool execution |
| crypto (Node.js) | built-in | Content hashing for dedup | Already used in memoryEntries.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries | - | - | Existing stack is sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite FTS5 | Vector search (sqlite-vec) | FTS5 sufficient for text matching; vectors add complexity |
| Manual decay | Automated cron job | Manual decay at retrieval time is simpler, no infrastructure |
| Regex intent detection | Claude NLU | Claude is already processing the input; let it handle intent |

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/jarvis/
├── memory/
│   ├── schema.ts              # Add deleted_at column
│   ├── queries/
│   │   └── memoryEntries.ts   # Add softDelete, restore, search
│   ├── index.ts               # Add forget(), restore(), listByCategory()
│   ├── retrieval.ts           # Existing scoring (extend for decay)
│   └── decay.ts               # NEW: Decay calculation and cleanup
├── intelligence/
│   ├── tools.ts               # Add memory tools
│   └── systemPrompt.ts        # Add intent detection guidance
└── config.ts                  # Add decay/preference learning flags
```

### Pattern 1: Claude Tool-Based Memory Operations

**What:** Define Claude tools for memory CRUD, Claude decides when to call them
**When to use:** All explicit memory commands ("remember X", "forget Y", "what do you know")
**Example:**
```typescript
// Source: Existing notionTools pattern in tools.ts
export const memoryTools: ToolDefinition[] = [
  {
    name: 'remember_fact',
    description: 'Store a fact that the user wants Jarvis to remember. Use when the user explicitly says "remember", "don\'t forget", or states a persistent fact about themselves.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The fact to remember, normalized (e.g., "therapy Thursdays at 3pm")'
        },
        category: {
          type: 'string',
          description: 'Category of the fact',
          enum: ['schedule', 'preference', 'person', 'work', 'health', 'other']
        },
        source: {
          type: 'string',
          description: 'How the fact was learned',
          enum: ['user_explicit', 'jarvis_inferred']
        }
      },
      required: ['content', 'category']
    }
  },
  {
    name: 'forget_fact',
    description: 'Mark a stored memory for deletion. Use when user says "forget X" or "don\'t remember Y".',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language description of what to forget (e.g., "therapy appointments")'
        },
        confirm_ids: {
          type: 'array',
          description: 'If confirming a previous forget request, the specific memory IDs to delete',
          items: { type: 'number' }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'list_memories',
    description: 'List stored memories for the user. Use when user asks "what do you know" or "what do you remember".',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (optional)',
          enum: ['schedule', 'preference', 'person', 'work', 'health', 'other', 'all']
        },
        include_deleted: {
          type: 'boolean',
          description: 'Include recently deleted memories (for undo)'
        }
      }
    }
  },
  {
    name: 'delete_all_memories',
    description: 'Delete ALL stored memories. Use ONLY when user explicitly requests full memory wipe.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Must be true to execute'
        }
      },
      required: ['confirm']
    }
  }
];
```

### Pattern 2: Soft Delete with Recovery Window

**What:** Add `deleted_at` timestamp instead of hard deleting; filter in queries
**When to use:** All delete operations (except bulk delete_all which can hard delete)
**Example:**
```typescript
// Source: Drizzle ORM soft delete pattern (verified via web search)
// Schema extension
export const memoryEntries = sqliteTable('memory_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(),
  category: text('category').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastAccessed: text('last_accessed'),
  deletedAt: text('deleted_at'),  // NEW: null = active, ISO string = soft deleted
});

// Soft delete function
export async function softDeleteMemoryEntry(id: number): Promise<void> {
  await db
    .update(memoryEntries)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(memoryEntries.id, id));
}

// Restore function
export async function restoreMemoryEntry(id: number): Promise<void> {
  await db
    .update(memoryEntries)
    .set({ deletedAt: null })
    .where(eq(memoryEntries.id, id));
}

// Query with soft delete filter (modify existing getMemoryEntries)
export async function getMemoryEntries(limit = 100, includeDeleted = false): Promise<MemoryEntry[]> {
  const query = db
    .select()
    .from(memoryEntries)
    .orderBy(desc(memoryEntries.lastAccessed))
    .limit(limit);

  if (!includeDeleted) {
    return query.where(isNull(memoryEntries.deletedAt));
  }
  return query;
}
```

### Pattern 3: Memory Decay Algorithm

**What:** Score memories by recency, access frequency, and source; decay unused memories
**When to use:** Memory retrieval and periodic cleanup
**Example:**
```typescript
// Source: Memoripy patterns + existing retrieval.ts scoring
// Decay calculation per research findings

/**
 * Calculate decay score (0-1, where 1 = fully decayed/forgotten)
 *
 * Factors:
 * - Days since last access (exponential decay)
 * - Source weight (explicit > inferred)
 * - Access count (more accesses = slower decay)
 */
export function calculateDecay(entry: MemoryEntry, now: Date): number {
  const lastAccessDate = new Date(entry.lastAccessed || entry.createdAt);
  const daysSinceAccess = Math.floor((now.getTime() - lastAccessDate.getTime()) / (24 * 60 * 60 * 1000));

  // Base decay: halve relevance every 30 days (configurable)
  const HALF_LIFE_DAYS = 30;
  const baseDecay = 1 - Math.pow(0.5, daysSinceAccess / HALF_LIFE_DAYS);

  // Source modifier: explicit memories decay 50% slower
  const sourceModifier = entry.source === 'user_explicit' ? 0.5 : 1.0;

  return Math.min(1, baseDecay * sourceModifier);
}

/**
 * Auto-archive (soft delete) highly decayed memories
 * Run periodically or at session start
 */
export async function decayUnusedMemories(threshold = 0.9): Promise<number> {
  const entries = await getMemoryEntries(1000);
  const now = new Date();
  let decayedCount = 0;

  for (const entry of entries) {
    const decay = calculateDecay(entry, now);
    if (decay >= threshold) {
      await softDeleteMemoryEntry(entry.id);
      decayedCount++;
    }
  }

  return decayedCount;
}
```

### Pattern 4: Fuzzy Matching for Forget Requests

**What:** Match user's natural language forget request to stored memories
**When to use:** "Forget what I said about therapy" -> find therapy-related memories
**Example:**
```typescript
// Source: Existing normalizeContent + substring matching
/**
 * Find memories matching a forget query
 * Returns candidates for user confirmation
 */
export async function findMemoriesMatching(query: string, limit = 5): Promise<MemoryEntry[]> {
  const normalizedQuery = normalizeContent(query);
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);

  const allEntries = await getMemoryEntries(500);

  // Score each entry by word overlap
  const scored = allEntries.map(entry => {
    const normalizedContent = normalizeContent(entry.content);
    let score = 0;

    for (const word of queryWords) {
      if (normalizedContent.includes(word)) {
        score += 1;
      }
    }

    // Boost exact substring match
    if (normalizedContent.includes(normalizedQuery)) {
      score += queryWords.length;
    }

    return { entry, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}
```

### Anti-Patterns to Avoid
- **Regex-based intent detection:** Don't parse "remember" commands with regex; Claude handles this naturally
- **Hard deletes by default:** Always soft delete; users expect undo capability
- **Silent operations:** Always confirm what was stored/forgotten; user trust depends on transparency
- **Exposing memory IDs in voice:** Say "that preference about email" not "memory ID 47"
- **Over-eager inference:** Don't infer preferences from single observations; require 2-3 consistent signals

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Intent detection | Regex parsing | Claude NLU via tools | Claude already processing input, better at nuance |
| Text similarity | Levenshtein implementation | Substring + word overlap | Good enough for small memory sets (<1000) |
| Decay scheduling | Cron job infrastructure | On-access decay check | Simpler, no external infrastructure |
| Category taxonomy | Complex ontology | Flat enum list | 6-8 categories sufficient for personal assistant |

**Key insight:** The memory set is small (hundreds, not millions). Simple algorithms outperform complex ones because they're easier to debug and explain to users.

## Common Pitfalls

### Pitfall 1: Ambiguous Forget Targets
**What goes wrong:** User says "forget that" but there are 5 things it could mean
**Why it happens:** Natural language is imprecise; context gets lost
**How to avoid:** Always list candidates and ask for confirmation: "I found 3 items about therapy. Which should I forget?"
**Warning signs:** User frustration when wrong item deleted; support requests for "undo"

### Pitfall 2: Silent Memory Updates
**What goes wrong:** User doesn't know what Jarvis remembers; loses trust
**Why it happens:** Developer optimizes for "seamless" experience
**How to avoid:** Always verbally confirm: "Got it, I'll remember you have therapy Thursdays."
**Warning signs:** Users repeatedly telling Jarvis the same facts; confusion about what's stored

### Pitfall 3: Inference Overreach
**What goes wrong:** Jarvis stores preference from one-off behavior; user feels surveilled
**Why it happens:** Eager preference learning without threshold
**How to avoid:** Require 2-3 consistent observations before storing inferred preference
**Warning signs:** Memory list full of inaccurate inferences; users mass-deleting preferences

### Pitfall 4: Decay Too Aggressive
**What goes wrong:** Important but rarely-accessed facts disappear
**Why it happens:** Decay algorithm treats all memories equally
**How to avoid:** Explicit facts decay slower than inferred; core identity facts exempt
**Warning signs:** Users re-adding facts they already told Jarvis; loss of important context

### Pitfall 5: Category Sprawl
**What goes wrong:** Too many categories makes recall format cluttered
**Why it happens:** Trying to capture every nuance
**How to avoid:** Keep categories to 6-8 max; use "other" for edge cases
**Warning signs:** Category list longer than memory list in some categories

## Code Examples

Verified patterns from official sources and existing codebase:

### Tool Execution in Chat Route
```typescript
// Source: Existing chat/route.ts pattern
// Add memory tools to the tools array
import { memoryTools } from '@/lib/jarvis/intelligence/memoryTools';

// In the API route:
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  system: serverSystemPrompt,
  messages: claudeMessages,
  tools: [...notionTools, ...memoryTools],  // Add memory tools
});

// Handle memory tool execution
if (toolUse.name.startsWith('remember') || toolUse.name.startsWith('forget') ||
    toolUse.name.startsWith('list') || toolUse.name.startsWith('delete_all')) {
  result = await executeMemoryTool(toolUse.name, toolUse.input);
}
```

### System Prompt Intent Guidance
```typescript
// Source: Existing systemPrompt.ts buildSystemPrompt pattern
// Add to MEMORY CONTEXT section when memory is enabled

sections.push(`MEMORY MANAGEMENT:
When users want you to remember something:
- Explicit triggers: "remember", "don't forget", "keep in mind"
- Soft hints: "I always...", "Every Thursday I...", "I prefer..."
- Extract the core fact, normalize it for searchability
- Use remember_fact tool with appropriate category
- ALWAYS confirm: "Got it, I'll remember..."

When users want you to forget something:
- Triggers: "forget", "don't remember", "remove", "delete"
- Use forget_fact tool with their description
- ALWAYS show matches and confirm before deleting
- If multiple matches: "I found 3 items about health. Which should I forget?"

When users ask what you remember:
- Triggers: "what do you know", "what do you remember", "show memories"
- Use list_memories tool
- Speak brief highlights, show full list visually
- Group by category: Schedule, Preferences, People, etc.

Categories for organizing memories:
- schedule: recurring events, appointments, deadlines
- preference: communication style, workflow habits, likes/dislikes
- person: facts about people the user knows
- work: projects, colleagues, work patterns
- health: medical, wellness, fitness info
- other: anything that doesn't fit above`);
```

### Memory Service Extension
```typescript
// Source: Existing MemoryService pattern in index.ts
export class MemoryService {
  // ... existing methods ...

  /**
   * Soft delete a memory with confirmation
   */
  static async forget(id: number): Promise<MemoryEntry | null> {
    const entry = await getMemoryEntryById(id);
    if (!entry) return null;

    await softDeleteMemoryEntry(id);
    return entry;
  }

  /**
   * Restore a soft-deleted memory
   */
  static async restore(id: number): Promise<MemoryEntry | null> {
    const entry = await getMemoryEntryById(id); // include deleted
    if (!entry || !entry.deletedAt) return null;

    await restoreMemoryEntry(id);
    return { ...entry, deletedAt: null };
  }

  /**
   * Find memories matching a query for forget confirmation
   */
  static async findForForget(query: string): Promise<MemoryEntry[]> {
    return findMemoriesMatching(query);
  }

  /**
   * List memories by category for recall UI
   */
  static async listByCategory(category?: string): Promise<Record<string, MemoryEntry[]>> {
    const entries = await getMemoryEntries(500);
    const grouped: Record<string, MemoryEntry[]> = {};

    for (const entry of entries) {
      const cat = entry.category;
      if (category && category !== 'all' && cat !== category) continue;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(entry);
    }

    return grouped;
  }

  /**
   * Hard delete all memories (with double confirmation)
   */
  static async deleteAll(): Promise<number> {
    const count = await db.delete(memoryEntries).returning();
    return count.length;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vector embeddings for all search | Hybrid: keywords + vectors | 2025 | Simpler for small datasets |
| Complex decay formulas | Simple exponential half-life | 2025 | More explainable, easier to tune |
| Silent memory operations | Explicit user confirmation | 2025 | User trust and control |
| Hard deletes | Soft delete with recovery | 2025 | Undo capability expected |

**Deprecated/outdated:**
- Complex RAG pipelines for small personal memory sets (overkill)
- Semantic search without keyword fallback (misses exact matches)
- Training custom intent classifiers (LLMs handle this now)

## Open Questions

Things that couldn't be fully resolved:

1. **Preference learning threshold**
   - What we know: Research suggests 2-3 consistent observations before storing
   - What's unclear: Exact heuristics for "consistent" (same session? same week?)
   - Recommendation: Start with 3 observations within 7 days; tune based on user feedback

2. **Memory decay half-life**
   - What we know: 30 days is common; explicit memories should decay slower
   - What's unclear: Optimal values for this specific use case
   - Recommendation: Start with 30 days (inferred) / 60 days (explicit); make configurable

3. **UI for memory list**
   - What we know: User wants visual list organized by category
   - What's unclear: Exact component design (modal? side panel? dedicated page?)
   - Recommendation: Start with simple modal; iterate based on usage

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/jarvis/memory/*` - Schema, queries, retrieval patterns
- Existing codebase: `src/lib/jarvis/intelligence/tools.ts` - Tool definition pattern
- Existing codebase: `src/app/api/jarvis/chat/route.ts` - Tool execution pattern
- [Anthropic Memory Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) - Official memory tool operations

### Secondary (MEDIUM confidence)
- [Drizzle ORM Soft Delete Discussion](https://github.com/drizzle-team/drizzle-orm/discussions/4031) - Soft delete pattern
- [Memoripy GitHub](https://github.com/caspianmoon/memoripy) - Decay and reinforcement patterns
- [Knowledge Base Taxonomy Best Practices](https://www.matrixflows.com/blog/knowledge-base-taxonomy-best-practices) - Category design

### Tertiary (LOW confidence)
- WebSearch results on memory decay algorithms - General patterns, not verified implementations
- WebSearch results on intent detection - General LLM patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase patterns
- Architecture: HIGH - Extends proven patterns from Phase 7-8
- Pitfalls: MEDIUM - Based on research and general UX principles
- Decay algorithm: LOW - Needs tuning based on real usage

**Research date:** 2026-02-02
**Valid until:** 60 days (stable domain, existing patterns)
