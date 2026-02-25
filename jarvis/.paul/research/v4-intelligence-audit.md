# v4.0 Intelligence Audit — Pre-Brain-Swap Research

**Date:** 2026-02-25
**Scope:** Jarvis, Agent Zero, ClaudeClaw
**Goal:** Find hidden gems, assess brain swap options, identify what makes a self-improving genius-level assistant

---

## Executive Summary

Jarvis has **17 hidden gems** across its intelligence stack — far more than a "simple CRUD assistant." The brain swap is not a simple SDK replacement. It requires a **surgical hybrid approach** that preserves Jarvis's unique intelligence while gaining the SDK's tool loop and MCP integration.

Agent Zero provides a **proven self-improvement loop** (critic → evaluate → evolve behavior) that Jarvis should adopt, plus vector memory, secrets masking, and sub-agent orchestration.

ClaudeClaw proves the SDK works as a black box — `query()` + `.mcp.json` + `bypassPermissions` is the entire integration. But it's intentionally simple (no custom tools, no streaming, no UI). Jarvis needs more.

---

## JARVIS INTELLIGENCE AUDIT

### Gems to Preserve (17 items — DO NOT DROP)

| # | Gem | File | Why It Matters |
|---|-----|------|----------------|
| 1 | System prompt personality + anti-patterns | `systemPrompt.ts` | The soul of Jarvis. Bans "Great!", "Sure thing!", emotional check-ins. Voice-first conciseness. |
| 2 | Memory scoring algorithm | `retrieval.ts` | Custom relevance: Recency(50) + Category(30) + Source(20) × (1-decay). No SDK provides this. |
| 3 | Proactive surfacing logic | `retrieval.ts` | Action-intent keywords ("follow up", "remind", "pending") detect what to mention unprompted. |
| 4 | Memory decay with explicit-never-decay | `decay.ts` | Exponential 30-day half-life, but user-stated facts are permanent. Trust architecture. |
| 5 | Preference inference pipeline | `preferenceInference.ts` | 3 observations in 7 days → inferred preference. 9 patterns + error tracking. Self-learning. |
| 6 | BM25 fuzzy memory search | `memoryEntries.ts` | Hand-rolled BM25 Okapi for "forget about therapy" → ranked memory matches. |
| 7 | Conversation summarization + backfill | `summarization.ts` | Summarizes at 20 messages. Backfills missed sessions on next open. No conversation lost. |
| 8 | Complex query routing to Agent Zero | `chatProcessor.ts` | Regex patterns route analysis/planning to Agent Zero, CRUD stays on Haiku. Dual-brain. |
| 9 | Scheduler with tab visibility recovery | `Scheduler.ts` | Catches up on missed events when browser tab regains focus. |
| 10 | CheckIn auto-dismiss + capture-to-Notion | `CheckInManager.ts` | 10-second timeout, captured items auto-sent to Notion inbox. Zero-friction capture. |
| 11 | LifeAreaTracker relative neglect | `LifeAreaTracker.ts` | 28-day rolling baseline. Neglect = (baseline-recent)/baseline. Adapts to actual patterns. |
| 12 | Fuzzy title resolution + reverse-contains | `recentResults.ts` | "mark the call mom task done" → matches "call mom". 4-tier priority + auto-cache-populate. |
| 13 | Recurring task auto-creation | `toolExecutor.ts` | Completing a recurring task auto-creates next instance with correct date. Invisible executive function. |
| 14 | NudgeManager programmatic chime | `NudgeManager.ts` | C5+E5 major third bell with overtones, synthesized from code. |
| 15 | Error self-healing loop | `errorTracking.ts` → `preferenceInference.ts` | 3 transient errors in 7 days → inferred infrastructure pattern → natural user warning. |
| 16 | BriefingBuilder parallel queries + Notion workarounds | `BriefingBuilder.ts` | Promise.all queries, client-side status filtering for Notion API bugs, week load analysis. |
| 17 | Notion panel tools (teach/view/show) | `tools.ts` + `ClaudeClient.ts` | Opens Notion overlay with mode context. Unique UI integration. |

### Safe to Replace/Drop

| Item | File | Reason |
|------|------|--------|
| MemoryStore (localStorage) | `MemoryStore.ts` | Superseded by Turso DB memory |
| ClaudeClient SSE parser | `ClaudeClient.ts` | SDK handles streaming natively |
| Basic Notion CRUD schemas | `tools.ts` (14 of 17 tools) | SDK defines tool schemas; Notion MCP provides these |
| withRetry basic logic | `withRetry.ts` | SDK has built-in retry (preserve error classification though) |
| Anthropic SDK instantiation | `chatProcessor.ts` | SDK manages this |

---

## AGENT ZERO PATTERNS WORTH BORROWING

### 1. Self-Improvement Loop (THE BIG ONE)

Agent Zero has a **proven, end-to-end self-improvement cycle**:

```
interaction counter → reflection loop (every 3 days) →
  evaluate-conversation (critic sub-agent, 5-dimension rubric) →
  skill-effectiveness (invocation analytics) →
  behavior-evolution (versioned rule updates with rollback) →
  updated behaviour.md
```

**Evidence it works:** `v2-20260221-041500.md` shows critic identified verbose tone (7/10), behavior-evolution added "Table-first for scheduled reports" rule. Real self-improvement.

**Jarvis Integration:** Adapt this loop for Jarvis. The preference inference pipeline (Gem #5) is a simpler version. Agent Zero's is more sophisticated with:
- 5-dimension rubric scoring (Completeness, Accuracy, Efficiency, Tone, Satisfaction)
- Evidence requirement ("A score without evidence is invalid")
- Versioned behavior with rollback capability
- Cross-project learning

### 2. Vector Memory (FAISS)

Agent Zero uses FAISS with `sentence-transformers/all-MiniLM-L6-v2` (local, no API):
- 4 memory areas: MAIN, FRAGMENTS, SOLUTIONS, INSTRUMENTS
- Auto-memorize at monologue end (fragment + solution extraction)
- Consolidation: merge/update/keep_separate decisions at 0.95 similarity
- Auto-recall every 3rd iteration with LLM reranking

**Jarvis Integration:** Jarvis currently has BM25 (keyword) search only. Adding vector/semantic search would enable "remember that time we talked about..." queries. Could run locally or via embedding API.

### 3. Secrets Masking

`{{secret(KEY_NAME)}}` syntax with tool_execute_before/after hooks:
- Before execution: placeholders → real values
- After execution: real values → placeholders
- LLM never sees raw keys in conversation history

**Jarvis Integration:** Important for v4.0 if Claude Code SDK handles tool execution. System prompt and conversation history should never contain raw API keys.

### 4. Sub-Agent Profiles

Each sub-agent has a condensed role prompt (15-20 lines) and inherits project context:
- critic, life-organizer, content-creator, trading-analyst
- Fresh context window per subordinate (no context pollution)
- Results flow back via `_process_chain` callback

**Jarvis Integration:** The dual-brain architecture (Gem #8) already does this partially. v4.0 could formalize specialist agents for different domains.

### 5. Known Bug

The interaction counter increments `count_since_last_reflection` but reflection-loop checks `count`. Volume-based trigger is inert. Time-based (cron every 3 days) still works.

---

## CLAUDECLAW SDK ANALYSIS

### How It Works (The Entire Integration)

```typescript
// agent.ts — this is literally the whole thing
import { query } from '@anthropic-ai/claude-code'

const conversation = query({
  prompt: message,
  options: {
    cwd: PROJECT_ROOT,
    allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
    permissionMode: 'bypassPermissions',
    ...(sessionId ? { resume: sessionId } : {}),
  },
})

for await (const event of conversation) {
  if (event.type === 'system' && event.subtype === 'init') {
    newSessionId = event.session_id
  } else if (event.type === 'result') {
    resultText = event.result
  }
}
```

### What the SDK Provides Free

- Tool loop (no more chatProcessor.ts tool iteration)
- MCP server connections (via `.mcp.json` — file-driven, not code-driven)
- Session resumption (JSONL transcripts on disk)
- Built-in tools (Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch)
- Permission management
- Retry logic

### What the SDK Does NOT Provide

- Custom memory scoring/retrieval
- Personality/system prompt injection (must be prepended to `prompt`)
- Streaming to UI (events exist but ClaudeClaw ignores them)
- Custom tool definitions (possible via `createSdkMcpServer()` but ClaudeClaw doesn't use it)
- Proactive surfacing logic
- Executive function (briefings, nudges, check-ins)
- Preference learning

### ClaudeClaw's Dual Memory

1. **SDK-native:** Session resumption via JSONL (full conversation context)
2. **Custom:** SQLite FTS5 memory with salience decay (0.98/day, prune at 0.1)

Memories are prepended to the prompt as `[Memory context]\n- ...` before each `query()` call.

### SDK Version

`@anthropic-ai/claude-code@1.0.128` — monolithic bundle with vendored deps.

---

## BRAIN SWAP OPTIONS ASSESSMENT

### Option A: Full SDK Replace (ClaudeClaw-style)
**Replace everything with `query()`. Notion MCP via `.mcp.json`.**

| Pro | Con |
|-----|-----|
| Simplest integration (~50 LOC) | Loses ALL 17 gems |
| SDK handles tool loop, retries, MCP | No streaming to UI (batch response only) |
| Session resumption built-in | No custom memory scoring |
| | No preference learning |
| | No executive function integration |
| | No fuzzy title resolution |

**Verdict: WORST OPTION.** You said this yourself — "choice 1 seems the worst." Correct.

### Option B: SDK Brain + Preserved Intelligence Layer
**Use `query()` for the tool loop, but inject Jarvis intelligence before/after.**

```
User message
  → Memory retrieval + scoring (Gem #2, #3)
  → Preference injection (Gem #5)
  → System prompt assembly (Gem #1)
  → Prepend everything to prompt
  → query({ prompt: enrichedMessage, ... })
  → Process result
  → Side effects (dashboard refresh, panel open, captures)
  → Memory persistence (fire-and-forget)
  → Observation tracking (Gem #5, #15)
```

| Pro | Con |
|-----|-----|
| Preserves all gems | More complex than Option A |
| SDK handles tool loop + MCP | Need to handle streaming ourselves for UI |
| Personality preserved | Session resumption + custom memory = dual system |
| Self-improvement preserved | |
| Executive function untouched | |

**Verdict: GOOD OPTION.** Keeps the soul, gains the SDK brain.

### Option C: Enhanced Custom Stack (No SDK)
**Keep chatProcessor.ts, just upgrade it.**

| Pro | Con |
|-----|-----|
| Full control | Maintaining custom tool loop forever |
| No adaptation needed | Miss out on SDK improvements |
| | Still need MCP integration work |
| | More code to maintain |

**Verdict: OK BUT STAGNANT.** You're maintaining infrastructure instead of building intelligence.

### Option D: Hybrid SDK + Agent Zero Self-Improvement (RECOMMENDED)
**Option B + Agent Zero's self-improvement loop adapted for Jarvis.**

```
┌─────────────────────────────────────────────────┐
│                JARVIS v4.0                       │
├─────────────────────────────────────────────────┤
│ PRESERVED INTELLIGENCE LAYER                     │
│ ├── System prompt (personality, anti-patterns)   │
│ ├── Memory scoring + retrieval + proactive       │
│ ├── Preference inference pipeline                │
│ ├── Executive function (briefings, nudges, etc.) │
│ ├── Fuzzy title resolution                       │
│ ├── Error self-healing                           │
│ └── Conversation summarization                   │
├─────────────────────────────────────────────────┤
│ SDK BRAIN (NEW)                                  │
│ ├── query() for tool execution                   │
│ ├── .mcp.json for Notion + Playwright            │
│ ├── Session resumption (JSONL)                   │
│ └── Built-in tools (Bash, Read, Write, etc.)     │
├─────────────────────────────────────────────────┤
│ AGENT ZERO PATTERNS (BORROWED)                   │
│ ├── Self-improvement loop (critic → evolve)      │
│ ├── Vector memory (FAISS or similar)             │
│ ├── Secrets masking                              │
│ └── Specialist sub-agent profiles                │
├─────────────────────────────────────────────────┤
│ MOBILE-FIRST UI (NEW)                            │
│ ├── Responsive chat + voice + dashboard          │
│ ├── Archived 3D orb (preserved for future)       │
│ └── Task/habit/bill/schedule management          │
└─────────────────────────────────────────────────┘
```

| Pro | Con |
|-----|-----|
| Preserves ALL gems | Most complex to implement |
| Gains SDK tool loop + MCP | Need to adapt A0 patterns to web context |
| Gains self-improvement from A0 | Vector memory needs hosting decision |
| Path to genius-level assistant | |
| Best short AND long term | |

**Verdict: RECOMMENDED.** This is the DaVinci path.

---

## What Makes a Self-Improving Genius-Level Assistant

Based on this research, the ingredients are:

1. **Personality with boundaries** (Jarvis Gem #1) — knows what NOT to do
2. **Weighted memory with decay** (Jarvis Gems #2-4) — remembers what matters, forgets what doesn't
3. **Behavioral observation → inference** (Jarvis Gem #5) — learns without being told
4. **Self-critique with evidence** (Agent Zero critic) — honest self-evaluation
5. **Versioned behavior evolution** (Agent Zero behavior-evolution) — improves with rollback safety
6. **Proactive intelligence** (Jarvis Gem #3) — surfaces what you need before you ask
7. **Executive function** (Jarvis Gems #9-11, #13) — manages your life, not just answers questions
8. **Error learning** (Jarvis Gem #15) — learns about its own infrastructure problems
9. **Fuzzy natural language understanding** (Jarvis Gem #12) — handles messy voice input gracefully
10. **Cross-session continuity** (Jarvis Gem #7) — never loses context

Jarvis already has 8 of 10. Agent Zero adds #4 and #5. The brain swap (SDK) is just plumbing to make the rest work better.

---

## Recommended Build Order for v4.0

1. **Phase A: Research & Audit** ← YOU ARE HERE
2. **Phase B: SDK Integration (Option D foundation)** — Replace chatProcessor tool loop with `query()`, preserve intelligence layer
3. **Phase C: Memory Preservation** — Ensure all 17 gems survive the swap, adapt memory prepend pattern
4. **Phase D: Self-Improvement Loop** — Port Agent Zero's critic → evaluate → evolve cycle
5. **Phase E: Mobile-First UI** — Responsive redesign, archive orb
6. **Phase F: Vector Memory** — Add semantic search alongside BM25
7. **Phase G: Polish & Integration Testing** — End-to-end verification

---

*Research complete. Main session should review before any planning decisions.*
