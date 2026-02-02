# Research Summary: Jarvis v2.0 Memory & Production

**Project:** Jarvis - Voice-Enabled AI Personal Assistant
**Milestone:** v2.0 Memory & Production
**Synthesized:** 2026-02-02
**Research Files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, GOTCHA-ATLAS-ANALYSIS.md
**Overall Confidence:** HIGH

---

## Executive Summary

Jarvis v2.0 adds persistent cross-session memory and production deployment to an existing working voice assistant. Research confirms this is a well-documented pattern with clear implementation paths, but introduces significant security considerations that v1 (local-only) did not face.

The recommended approach follows the **Mem0 pattern**: a hybrid memory system using `@libsql/client` + Drizzle ORM for structured storage, with Turso as the production database. The existing `better-sqlite3` driver **will not work on Vercel serverless** - this is the most critical technical finding. Memory should be treated as an untrusted input surface (memory poisoning is a documented attack vector), and guardrails are non-negotiable for production deployment.

Key risks center on (1) memory poisoning via indirect prompt injection, (2) context window overflow as memory grows, and (3) environment variable exposure in production. All three have documented prevention strategies. The technology stack is stable with high confidence - all recommended packages have recent releases and production usage.

---

## Key Findings

### From STACK.md

**Core Decision:** Use `@libsql/client` + Drizzle ORM for database access.

| Technology | Version | Rationale |
|------------|---------|-----------|
| `@libsql/client` | ^0.17.0 | Unified API for local SQLite AND Turso cloud. **Required for Vercel.** |
| `drizzle-orm` | ^0.45.1 | Zero-dep, excellent TypeScript, tree-shakeable |
| Turso (production) | Free tier | 9GB storage, 1B reads/month - sufficient for single-user |
| `grammy` | ^1.39.2 | Telegram bot framework (optional, for mobile access) |

**Critical Finding:** `better-sqlite3` (currently installed) is synchronous and requires filesystem access. Vercel serverless functions are stateless and ephemeral - each invocation may run on a different container with no shared storage. Must migrate to `@libsql/client`.

**What NOT to Add:** sqlite-vec (overkill for <100k entries), Prisma (worse TypeScript inference), Redis for memory (SQLite simpler for single-user).

### From FEATURES.md

**Table Stakes (Must Ship):**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Session Logging | Low | Foundation - must log before memory works |
| Basic Fact Retention | Medium | "Remember I prefer morning meetings" |
| Memory Transparency | Low | User must see what Jarvis remembers |
| Explicit Commands | Low | "Remember this" / "Forget that" |
| Cross-Session Continuity | Medium | "What were we discussing yesterday?" |
| Privacy Controls | Low | Delete all, incognito mode |

**Differentiators (Ship to Stand Out):**

| Feature | Value | Notes |
|---------|-------|-------|
| Preference Learning | Adapts to communication style | Brevity vs detail, timing preferences |
| Intelligent Forgetting | Prevents memory bloat | Decay unaccessed memories |
| Proactive Memory Surfacing | "Last time we discussed X..." | Context-aware recall |

**Anti-Features (Explicitly Avoid):**

- Total Recall ("remember everything") - causes performance decline
- Cross-session emotional profiling - invasive, often wrong
- Permanent memory without decay - outdated facts pollute context
- Inference without facts - dangerous assumptions

### From ARCHITECTURE.md

**Recommended Structure:**

```
src/lib/jarvis/memory/
+-- MemoryService.ts          # Main facade for all memory operations
+-- storage/
|   +-- MemoryDatabase.ts     # SQLite operations via @libsql/client
|   +-- schema.ts             # Drizzle schema
+-- retrieval/
|   +-- MemoryLoader.ts       # Session start context loading
|   +-- HybridRetrieval.ts    # BM25 + optional semantic search
+-- extraction/
|   +-- FactExtractor.ts      # Extract facts from conversations
|   +-- SessionSummarizer.ts  # Summarize sessions on close

data/
+-- jarvis.db                 # Local SQLite (development)
+-- JARVIS_MEMORY.md          # Human-readable long-term facts
```

**Key Integration Points:**

1. **VoicePipeline** - Load memory context at session start
2. **systemPrompt.ts** - Inject memory context into Claude prompts
3. **tools.ts** - Add `remember_fact`, `recall_memory`, `update_long_term` tools
4. **API routes** - `/api/jarvis/memory/` for server-side operations

**Build Order (Critical Dependencies):**

1. Storage Foundation (schema, CRUD) - depends on nothing
2. Memory Loading (session start) - depends on storage
3. Memory Writing (during conversation) - depends on loading
4. Memory Search (hybrid retrieval) - depends on data existing
5. Session Management (summarization) - depends on all above
6. Migration (from localStorage) - depends on new system complete

### From PITFALLS.md

**Critical Pitfalls (Cause Rewrites/Security Incidents):**

| Pitfall | Risk | Prevention |
|---------|------|------------|
| Memory Poisoning | Malicious content stored, executes later | Tag provenance, validate at retrieval, never store instructions |
| Context Window Overflow | System prompt pushed out, guardrails lost | Monitor utilization, sliding window, memory relevance scoring |
| No Guardrails | Destructive actions without confirmation | Action classification, confirmation tiers, audit logging |
| Secret Exposure | API keys leaked to client | Never use `NEXT_PUBLIC_` for secrets, Vercel sensitive env vars |

**Moderate Pitfalls:**

| Pitfall | Risk | Prevention |
|---------|------|------------|
| SQLite Concurrency | "Database is locked" on serverless | Use Turso for production |
| Notion Rate Limits | 429 errors during briefings | Request queue (3 req/sec), aggressive caching |
| Voice Latency Spikes | Awkward pauses break flow | Keep WebSocket warm, streaming TTS |
| Memory Breaks Existing | v1 features regress | Feature flags, incremental rollout |

### From GOTCHA-ATLAS-ANALYSIS.md

**Highest Value Pattern:** Three-layer memory system

1. **JARVIS_MEMORY.md** - Curated long-term facts (always loaded, human-readable)
2. **Daily Logs** - Append-only session events (timestamped, reviewable)
3. **SQLite Database** - Structured storage with search (deduplication, importance scoring)

**Key Protocol:**
- Session Start: Load MEMORY.md + today's log + yesterday's log + high-importance facts
- During Session: Append events, store facts with importance scoring
- Session End: Generate summary, extract key facts for future reference

---

## Stack Recommendations

### Required for v2

```bash
npm install @libsql/client drizzle-orm
npm install -D drizzle-kit
```

### Optional

```bash
npm install grammy        # Telegram gateway
npm install voyageai      # Semantic search (defer until needed)
```

### Environment Variables

**Development (`.env.local`):**
```env
DATABASE_URL=file:./jarvis.db
```

**Production (Vercel):**
```env
DATABASE_URL=libsql://jarvis-[account].turso.io
DATABASE_AUTH_TOKEN=eyJ...
# Optional: TELEGRAM_BOT_TOKEN, VOYAGE_API_KEY
```

---

## Implications for Roadmap

Based on combined research, I recommend **5 phases** for v2.0:

### Phase 1: Database Foundation

**Rationale:** Everything depends on storage. Must establish before any memory features.

**Delivers:**
- Drizzle schema for memory_entries, daily_logs, sessions
- @libsql/client setup (local SQLite for dev)
- Basic CRUD operations with hash deduplication
- JARVIS_MEMORY.md template

**Features from FEATURES.md:** Session Logging (foundation)

**Pitfalls to Avoid:** SQLite concurrency (design for Turso from start)

**Research Needed:** None - patterns well-documented

### Phase 2: Memory Loading & Integration

**Rationale:** Before writing memory, must integrate loading into existing voice pipeline without breaking v1 features.

**Delivers:**
- MemoryLoader.ts for session start
- systemPrompt.ts modification to include memory context
- VoicePipeline.ts integration
- Feature flag to disable memory system

**Features from FEATURES.md:** Basic Fact Retention, Memory Transparency, Cross-Session Continuity

**Pitfalls to Avoid:** Memory Breaks Existing (use feature flags), Context Window Overflow (limit loaded memory)

**Research Needed:** None - extension of existing architecture

### Phase 3: Memory Writing & Tools

**Rationale:** With loading working, add write capabilities so Claude can actively store facts.

**Delivers:**
- Memory tools: `remember_fact`, `recall_memory`, `update_long_term`
- Tool implementations in toolExecutor.ts
- Explicit memory commands ("Remember this", "Forget that")
- Daily log append logic

**Features from FEATURES.md:** Explicit Memory Commands, Privacy Controls, Error Acknowledgment

**Pitfalls to Avoid:** Memory Poisoning (provenance tagging), Deduplication (hash-based)

**Research Needed:** Tool response format optimization (may need iteration)

### Phase 4: Guardrails & Self-Healing

**Rationale:** Before production, must add safety layer. Research shows this is non-negotiable.

**Delivers:**
- Action classification (read/write/delete/expensive)
- Confirmation tiers for destructive operations
- Audit logging for all tool invocations
- Kill switch capability
- Self-healing retry logic with exponential backoff

**Features from FEATURES.md:** Privacy Controls (expanded), Preference Learning (guardrail-aware)

**Pitfalls to Avoid:** No Guardrails (primary target), Notion Content Injection

**Research Needed:** `/gsd:research-phase` - guardrail taxonomy for all Jarvis tools

### Phase 5: Production Deployment

**Rationale:** Final phase - put it all together with production infrastructure.

**Delivers:**
- Turso database setup (migrate from local SQLite)
- Custom domain: jarvis.whatareyouappreciatingnow.com
- Environment variable audit (no NEXT_PUBLIC_ secrets)
- Monitoring & observability (Sentry, cost alerts)
- Warm-up pings for cold start mitigation

**Features from FEATURES.md:** All v2 features available in production

**Pitfalls to Avoid:** Secret Exposure, Cold Starts, Missing Monitoring, Voice Latency

**Research Needed:** `/gsd:research-phase` - Turso setup specifics, Vercel edge deployment

---

## Research Flags

| Phase | Needs Research | Standard Patterns |
|-------|----------------|-------------------|
| Phase 1: Database Foundation | No | Drizzle + libsql well-documented |
| Phase 2: Memory Loading | No | Extension of existing architecture |
| Phase 3: Memory Writing | Minimal | Tool format may need iteration |
| Phase 4: Guardrails | **YES** | Needs tool classification taxonomy |
| Phase 5: Production | **YES** | Turso setup, edge deployment specifics |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | @libsql/client v0.17.0 (2 days old), Drizzle v0.45.1 active |
| Features | HIGH | Table stakes validated against Claude/ChatGPT patterns |
| Architecture | MEDIUM-HIGH | Mem0 pattern documented, but Jarvis-specific integration needs validation |
| Pitfalls | HIGH | Multiple authoritative sources cross-referenced |

### Gaps to Address During Planning

1. **Embedding strategy:** Start with BM25 only, add semantic search if retrieval proves insufficient
2. **Memory expiration:** Implement `expires_at` but defer decay algorithm to v2.1
3. **Memory UI:** Defer user-facing memory viewer to v2.1 (CLI/API sufficient for v2.0)
4. **Multi-device sync:** Out of scope for v2.0 (single-user assumption)

---

## Sources Summary

### High Confidence (Official Documentation)
- [@libsql/client npm](https://www.npmjs.com/package/@libsql/client)
- [Turso + Next.js Guide](https://docs.turso.tech/sdk/ts/guides/nextjs)
- [Drizzle ORM SQLite](https://orm.drizzle.team/docs/get-started-sqlite)
- [Vercel: Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)

### High Confidence (Security Research)
- [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Palo Alto Unit42: Memory Poisoning](https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/)
- [Building Production-Ready Guardrails (Medium)](https://ssahuupgrad-93226.medium.com/building-production-ready-guardrails-for-agentic-ai/)

### Medium Confidence (Industry Patterns)
- [Mem0: Building Production-Ready AI Agents](https://arxiv.org/abs/2504.19413)
- [Redis: AI Agents with Memory](https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/)
- [Claude Memory Features](https://www.anthropic.com/news/memory)

### Local Research
- GOTCHA-ATLAS-ANALYSIS.md (framework patterns)
- Existing Jarvis v1 codebase analysis

---

## Ready for Requirements

Research synthesis complete. Key decisions:

1. **Database:** @libsql/client + Drizzle + Turso (not better-sqlite3)
2. **Memory Model:** Three-layer (MEMORY.md + daily logs + SQLite)
3. **Security:** Guardrails phase is mandatory before production
4. **Rollout:** Feature flags for incremental deployment

Roadmapper can proceed with 5-phase structure outlined in Implications section.

---

*Previous version (v1 research): 2026-01-31*
*v2.0 synthesis: 2026-02-02*
