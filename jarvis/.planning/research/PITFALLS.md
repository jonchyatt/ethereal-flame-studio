# Domain Pitfalls: Jarvis v2 Memory & Production

**Project:** Jarvis v2.0 - Memory & Production Milestone
**Domain:** AI voice assistant with persistent memory, production deployment
**Researched:** 2026-02-02
**Confidence:** HIGH (multiple authoritative sources cross-referenced)

---

## Overview

This document covers pitfalls specific to the v2 milestone: **adding persistent memory and production deployment to an existing working system**. For v1 pitfalls (latency, browser compatibility, conversation flow), see the git history of this file.

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or major system failures.

---

### Pitfall 1: Memory Poisoning via Indirect Prompt Injection

**What goes wrong:**
Persistent memory creates a new attack surface absent in v1. Adversaries can inject malicious instructions through seemingly benign content (documents, web pages, API responses) that get stored in memory and execute later. Unlike session-scoped prompt injection, memory poisoning is temporally decoupled: poison planted today executes weeks later when semantically triggered.

**Why it happens:**
- Memory systems store content without sufficient provenance tracking
- No distinction between user-provided facts vs. inferred facts vs. external content
- Summarization processes can be manipulated to store attacker-controlled instructions
- The agent trusts its own memory as authoritative

**Consequences:**
- Silent data exfiltration in future sessions
- Agent develops "persistent false beliefs" that it defends as correct
- Cascading effects: one compromised memory entry poisons downstream decisions
- Difficult to detect because the agent's behavior appears internally consistent

**Warning signs:**
- Memory entries with no clear provenance ("where did this come from?")
- Agent behavior suddenly changes without obvious trigger
- Memory entries that reference external actions (e.g., "always send copies to...")
- Summarization producing content not in original conversation

**Prevention:**
1. **Tag all memory entries with source provenance** (user explicit, user implicit, system inferred, external)
2. **Validate memory at retrieval time**, not just insertion
3. **Implement belief drift detection**: alert when agent's "beliefs" shift significantly
4. **Never store instructions in memory** - only facts/preferences
5. **Regular memory audits**: human review of high-importance entries
6. **Sanitize all external content** before it enters memory pipeline

**Which phase should address it:** Memory System (Phase 1 or 2)

**Sources:**
- [Agent Memory Poisoning - The Attack That Waits](https://medium.com/@michael.hannecke/agent-memory-poisoning-the-attack-that-waits-9400f806fbd7)
- [Palo Alto Unit42: Persistent Behaviors in Agents' Memory](https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/)
- [OWASP ASI06: Agentic Memory Poisoning (2026)](https://neuraltrust.ai/blog/memory-context-poisoning)

---

### Pitfall 2: Context Window Overflow Causing Instruction Drift

**What goes wrong:**
As conversation history + memory context + system prompts grow, the context window fills. When it overflows, the original system prompt (your carefully crafted guardrails and behavior rules) gets pushed out of the window. The model is now "flying blind," guided only by recent messages.

**Why it happens:**
- Memory grows unbounded over time
- No monitoring of context utilization
- Aggressive memory loading without prioritization
- Long conversations compound the problem

**Consequences:**
- **Instruction drift**: Agent "forgets" its core behaviors and safety rules
- **Performance collapse**: Confused, lower-quality responses before outright failure
- **API errors**: Best case is a clean `context_length_exceeded` error
- **Silent degradation**: Worst case is the model silently dropping important context

**Warning signs:**
- Agent personality/tone shifts during long conversations
- Agent violates established rules it was following earlier
- Responses become slower and lower quality
- Agent asks questions it should already know from context

**Prevention:**
1. **Monitor context utilization**: Track percentage of context window used
2. **Implement sliding window for conversation history**: Keep recent + important, drop middle
3. **Prioritize system prompts**: Pin critical instructions at start AND end of context
4. **Implement memory relevance scoring**: Only load memories relevant to current conversation
5. **Set hard limits**: Max conversation turns, max memory entries per session
6. **Compress/summarize older context** rather than dropping entirely

**Which phase should address it:** Memory System + Intelligence Layer

**Sources:**
- [Context Window Overflow: Breaking the Barrier (AWS)](https://aws.amazon.com/blogs/security/context-window-overflow-breaking-the-barrier/)
- [Preventing Context Window Overflows (AIQ.hu)](https://aiq.hu/en/preventing-context-window-overflows-memory-protection-strategies-for-llms/)
- [Understanding LLM Performance Degradation (Demiliani)](https://demiliani.com/2025/11/02/understanding-llm-performance-degradation-a-deep-dive-into-context-window-limits/)

---

### Pitfall 3: No Guardrails by Default (The Moltbot Lesson)

**What goes wrong:**
Jarvis v1 runs locally with implicit trust. Moving to production without explicit guardrails means the agent can execute any action without confirmation. Combined with memory + tools, this creates significant risk of unintended destructive actions.

**Why it happens:**
- Local development assumes trusted user
- Guardrails are "friction" that gets skipped for MVP
- Difficult to anticipate all dangerous action patterns
- LLMs are probabilistic - edge cases happen

**Consequences:**
- **Destructive actions without confirmation** (delete all tasks, clear calendar)
- **Credential exposure** via prompt injection leaking API keys
- **Cost runaway** from expensive operations (voice API, LLM calls)
- **Data exfiltration** if agent can be tricked into sending data externally

**Warning signs (from GOTCHA analysis):**
- No confirmation flow for destructive operations
- Tools have unbounded permissions
- No rate limiting on expensive operations
- No audit log of tool invocations

**Prevention:**
1. **Action classification**: Label each tool as read/write/delete/expensive
2. **Confirmation tiers**:
   - Read: no confirmation
   - Write: optional confirmation based on scope
   - Delete: always confirm
   - Expensive: rate limit + budget caps
3. **Guardrails configuration file**: Externalize rules for easy auditing
4. **Audit logging**: Every tool invocation logged with context
5. **Kill switch**: Ability to immediately halt all agent actions
6. **Least privilege**: Each tool gets minimum required permissions

**Which phase should address it:** Guardrails System (dedicated phase)

**Sources:**
- [GOTCHA-ATLAS-ANALYSIS.md](/.planning/research/GOTCHA-ATLAS-ANALYSIS.md) (local research)
- [Building Production-Ready Guardrails for Agentic AI (Medium)](https://ssahuupgrad-93226.medium.com/building-production-ready-guardrails-for-agentic-ai-a-defense-in-depth-framework-4ab7151be1fe)
- [AI Guardrails: Enforcing Safety (Obsidian Security)](https://www.obsidiansecurity.com/blog/ai-guardrails)

---

### Pitfall 4: Environment Variable Exposure in Production

**What goes wrong:**
Secrets (API keys for ElevenLabs, Deepgram, Claude, Notion) get exposed through various vectors: error messages, client-side code, git commits, or log files. Once exposed, attackers can run up bills, access user data, or impersonate the service.

**Why it happens:**
- `NEXT_PUBLIC_` prefix accidentally used for server-only secrets
- Error messages containing full environment in stack traces
- Secrets committed to git history (even if removed later)
- Logs capturing request headers with auth tokens
- Different configs for dev/preview/prod not maintained correctly

**Consequences:**
- **Financial damage**: API costs run up by attackers
- **Data breach**: Access to user Notion data, conversation history
- **Service disruption**: Rate limits exhausted, keys revoked
- **Reputational harm**: User trust lost

**Warning signs:**
- Any `NEXT_PUBLIC_` variable containing "KEY", "SECRET", "TOKEN"
- API keys appearing in browser Network tab
- `.env` files in git history
- Error responses containing environment details

**Prevention:**
1. **Never use `NEXT_PUBLIC_` for secrets** - audit all env vars
2. **Use Vercel Sensitive Environment Variables** for all secrets
3. **Implement secrets scanning in CI/CD** (GitHub secret scanning, git-secrets)
4. **Sanitize error responses** - never expose stack traces in production
5. **Rotate keys** if any exposure suspected
6. **Separate concerns**: Different keys for dev/preview/prod
7. **Log scrubbing**: Filter sensitive values from logs

**Which phase should address it:** Production Deployment (first item)

**Sources:**
- [Vercel: Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Do Not Use Secrets in Environment Variables (nodejs-security.com)](https://www.nodejs-security.com/blog/do-not-use-secrets-in-environment-variables-and-here-is-how-to-do-it-better)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 5: SQLite Concurrency Under Serverless

**What goes wrong:**
SQLite is an excellent local database but struggles with concurrent writes. In a serverless environment (Vercel), multiple function instances can try to write simultaneously, causing "database is locked" errors or even corruption.

**Why it happens:**
- SQLite uses database-level locks (only one writer at a time)
- Serverless functions run in parallel, uncoordinated instances
- File-based storage doesn't work with serverless ephemerality
- Network file systems (if used) have unreliable locking

**Consequences:**
- "Database is locked" errors during normal operation
- Lost writes when timeouts occur
- Potential database corruption
- Unpredictable behavior under load

**Warning signs:**
- Intermittent 500 errors on write operations
- "SQLITE_BUSY" in logs
- Data inconsistencies between reads
- Errors correlating with traffic spikes

**Prevention:**
1. **For serverless: Use a managed database** (Turso, PlanetScale, Supabase, Neon)
2. **If SQLite required**: Use single-instance deployment only
3. **Enable WAL mode**: Better concurrency for read-heavy workloads
4. **Set busy_timeout**: At least 5-10 seconds
5. **Avoid upgrading read transactions to write** (causes immediate locks)
6. **Consider hybrid**: SQLite for local/dev, managed DB for production

**Which phase should address it:** Memory System + Production Deployment

**Sources:**
- [SQLite: File Locking and Concurrency](https://sqlite.org/lockingv3.html)
- [SQLite Concurrent Writes and "Database is Locked"](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)
- [How to Corrupt an SQLite Database](https://www.sqlite.org/howtocorrupt.html)

---

### Pitfall 6: Notion API Rate Limits and Silent Truncation

**What goes wrong:**
Jarvis v1 integrates heavily with Notion. At production scale, you'll hit the 3 requests/second rate limit. Additionally, Notion silently truncates relation properties at 25 references - no error, just missing data.

**Why it happens:**
- No rate limiting in client code
- Burst operations during briefings (fetch tasks + calendar + projects)
- Relation properties with >25 links return incomplete data silently
- MCP has additional tool-specific limits (35 searches/minute)

**Consequences:**
- `429 Too Many Requests` errors during briefings
- Missing data from truncated relations (user confusion)
- Failed operations with unclear errors
- Poor UX during high-activity periods

**Warning signs:**
- Briefings taking longer than expected
- Tasks or relations mysteriously missing
- Intermittent 429 responses in logs
- User reports of incomplete data

**Prevention:**
1. **Implement request queue** with max 3 req/sec throughput
2. **Respect Retry-After header** when 429 occurs
3. **Paginate relation property fetches** (don't assume completeness)
4. **Cache aggressively**: Notion data doesn't change that often
5. **Batch operations where possible** (reduce request count)
6. **Consider webhooks** instead of polling for changes

**Which phase should address it:** Production Deployment + Notion integration hardening

**Sources:**
- [Notion API: Request Limits](https://developers.notion.com/reference/request-limits)
- [Solving the Notion 25-Reference Limit](https://www.mymcpshelf.com/blog/solving-notion-25-reference-limit-mcp/)
- [Understanding Notion API Rate Limits in 2025](https://www.oreateai.com/blog/understanding-notion-api-rate-limits-in-2025-what-you-need-to-know/)

---

### Pitfall 7: Voice API Latency Spikes Under Load

**What goes wrong:**
Voice interaction feels natural under 300ms round-trip. Under production load, ElevenLabs and Deepgram latency can spike, creating awkward pauses that break conversational flow.

**Why it happens:**
- API cold starts when traffic is bursty
- Network jitter compounds across multiple services
- Concurrent session limits can cause queueing
- WebSocket connection management issues

**Consequences:**
- Awkward conversational pauses (>500ms feels unnatural)
- User talks over the agent (assumes it's done)
- Perception of "broken" or "slow" assistant
- Users abandon voice for text

**Warning signs:**
- Time-to-first-audio > 300ms regularly
- High variance in latency (sometimes fast, sometimes slow)
- Users repeating themselves
- WebSocket reconnection events in logs

**Prevention:**
1. **Measure P95 latency**, not just average
2. **Keep WebSocket connections warm** (persistent connections)
3. **Implement streaming for TTS** (start playing before full response ready)
4. **Have graceful degradation** (e.g., "Processing..." acknowledgment)
5. **Consider edge deployment** for voice endpoints
6. **Monitor concurrent session limits** vs actual usage

**Which phase should address it:** Production Deployment + Voice optimization

**Sources:**
- [Voice AI Infrastructure: Building Real-Time Speech Agents (Introl)](https://introl.com/blog/voice-ai-infrastructure-real-time-speech-agents-asr-tts-guide-2025)
- [ElevenLabs: Latency Optimization](https://elevenlabs.io/docs/developers/best-practices/latency-optimization)
- [Deepgram vs ElevenLabs Comparison](https://deepgram.com/learn/deepgram-vs-elevenlabs)

---

### Pitfall 8: Memory System Integration Breaking Existing Flows

**What goes wrong:**
Adding memory to an existing working system introduces integration complexity. Memory loading adds latency to every conversation start. Memory context competes with conversation history for context space.

**Why it happens:**
- Memory added as afterthought, not designed in
- No clear boundary between conversation context and memory context
- Memory queries add latency on the critical path
- Tightly coupled architecture makes changes ripple

**Consequences:**
- Briefings now take 2x longer to start
- Agent behavior changes unpredictably with memory additions
- Hard to debug whether issue is memory, context, or LLM
- Regression in features that previously worked

**Warning signs:**
- Features that worked in v1 now fail intermittently
- Conversation quality degrades after memory system added
- Startup time noticeably slower
- Context-related errors increase

**Prevention:**
1. **Define clear boundaries**: Memory is *additive* to system prompt, not replacing
2. **Make memory loading async where possible** (prefetch during audio processing)
3. **Measure baseline latency** before adding memory, track regression
4. **Feature flags**: Ability to disable memory system for debugging
5. **Incremental rollout**: Memory for specific features first, not all at once
6. **Test memory system in isolation** before integration

**Which phase should address it:** Memory System (core design)

**Sources:**
- [Technical Debt: How Adding Features Creates Complexity (Qt)](https://www.qt.io/quality-assurance/blog/how-to-tackle-technical-debt)
- [When to Prioritize Refactoring Over New Features (Revelo)](https://www.revelo.com/blog/rethinking-technical-debt-prioritizing-refactoring-vs-new-features)

---

### Pitfall 9: Prompt Injection Through Notion Content

**What goes wrong:**
Malicious content in Notion pages (task descriptions, project notes) gets fetched and included in context, executing prompt injection attacks via the user's own data.

**Why it happens:**
- Notion content treated as trusted because it's "user data"
- Shared workspaces mean others can edit content
- No sanitization of fetched Notion content
- Content goes directly into LLM context

**Consequences:**
- Unauthorized actions taken by the agent
- Data from other contexts leaked
- Agent behavior manipulation
- Trust violations

**Warning signs:**
- Agent doing unexpected things after fetching specific pages
- Behavior changes correlated with specific Notion content
- Agent "leaking" information from other contexts

**Prevention:**
1. **Treat Notion content as untrusted input**
2. **Sanitize before including in context** (remove suspicious patterns)
3. **Separate data from instructions** in prompt structure
4. **Log which Notion content was accessed** for audit
5. **Consider content isolation**: Limit what can be fetched per request

**Which phase should address it:** Guardrails System

**Sources:**
- [LLM Security Risks in 2026 (Sombra)](https://sombrainc.com/blog/llm-security-risks-2026)
- [OWASP: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major rework.

---

### Pitfall 10: Memory Deduplication Failures

**What goes wrong:**
The same fact gets stored multiple times with slightly different wording, cluttering memory and wasting context space.

**Why it happens:**
- Hash-based deduplication fails on paraphrased content
- No semantic deduplication
- Summarization produces multiple versions of same fact
- User states same thing different ways

**Consequences:**
- Memory bloat over time
- Redundant information in context
- Wasted tokens on duplicates
- Confusing when reviewing memory

**Prevention:**
1. **Semantic deduplication** using embeddings (cosine similarity threshold)
2. **Merge similar entries** rather than keeping all versions
3. **Periodic memory compaction** job
4. **Track entry lineage** (this fact derived from that conversation)

**Which phase should address it:** Memory System (data layer)

---

### Pitfall 11: Missing Memory Expiration/Decay

**What goes wrong:**
Stale facts persist forever. "User is on vacation next week" remains true months later.

**Why it happens:**
- No temporal awareness in memory entries
- No decay mechanism for time-sensitive facts
- No review/refresh process

**Consequences:**
- Agent acts on outdated information
- Memory grows unbounded
- Contradictions between old and new facts

**Prevention:**
1. **Add `expires_at` field** for time-sensitive entries
2. **Implement importance decay** over time (access_count tracking)
3. **Periodic memory review** surfacing stale high-importance entries
4. **User can mark facts as "outdated"**

**Which phase should address it:** Memory System (data model)

---

### Pitfall 12: Vercel Cold Start Affecting Voice Experience

**What goes wrong:**
First request after idle period hits serverless cold start, adding 1-3 seconds latency. For voice, this is jarring.

**Why it happens:**
- Serverless functions spin down when idle
- Voice interactions expect instant response
- No warm-up mechanism

**Consequences:**
- First interaction of session feels broken
- User uncertainty ("is it working?")
- May retry, causing confusion

**Prevention:**
1. **Warm-up pings** from client on page load
2. **Keep-alive requests** during active session
3. **Edge functions** for latency-critical paths
4. **Graceful loading states** ("Jarvis is waking up...")

**Which phase should address it:** Production Deployment

---

### Pitfall 13: Missing Monitoring and Observability

**What goes wrong:**
Production issues go undetected because there's no visibility into system health, costs, or errors.

**Why it happens:**
- Monitoring is "post-MVP" work that never happens
- Local development doesn't need monitoring
- Unclear what metrics matter for voice AI

**Consequences:**
- Cost overruns discovered only when invoiced
- User-reported bugs are first sign of issues
- No data for debugging production problems
- Can't measure performance improvements

**Prevention:**
1. **Set up error tracking** (Sentry) from day one
2. **Track key metrics**: Latency P50/P95, error rate, API costs
3. **Set up cost alerts** on Vercel, ElevenLabs, Deepgram, Claude
4. **Implement health checks** for all external services
5. **Create dashboards** for daily review

**Which phase should address it:** Production Deployment (first item after secrets)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Risk Level | Mitigation |
|-------------|---------------|------------|------------|
| Memory System | Memory poisoning (Pitfall 1) | CRITICAL | Provenance tracking, sanitization |
| Memory System | Context overflow (Pitfall 2) | CRITICAL | Utilization monitoring, sliding window |
| Memory System | Integration breaks existing (Pitfall 8) | MODERATE | Feature flags, incremental rollout |
| Memory System | SQLite concurrency (Pitfall 5) | MODERATE | Use managed DB for prod |
| Memory System | Deduplication (Pitfall 10) | MINOR | Semantic dedup |
| Memory System | Expiration (Pitfall 11) | MINOR | expires_at field |
| Guardrails | No guardrails by default (Pitfall 3) | CRITICAL | Action classification, confirmation tiers |
| Guardrails | Notion content injection (Pitfall 9) | MODERATE | Sanitization, isolation |
| Production Deployment | Secret exposure (Pitfall 4) | CRITICAL | Audit env vars, use sensitive vars |
| Production Deployment | Notion rate limits (Pitfall 6) | MODERATE | Request queue, caching |
| Production Deployment | Voice latency (Pitfall 7) | MODERATE | Warm connections, streaming |
| Production Deployment | Cold starts (Pitfall 12) | MINOR | Warm-up pings, edge functions |
| Production Deployment | No monitoring (Pitfall 13) | MODERATE | Set up from day one |

---

## Pitfalls Requiring Phase-Specific Research

These pitfalls need deeper investigation during implementation:

1. **Memory schema design**: Exact fields needed, embedding dimensions, search strategy (hybrid vs pure semantic)
2. **Guardrails taxonomy**: Complete classification of all Jarvis tools by risk level
3. **Production monitoring**: Which metrics matter for voice AI in production (specific thresholds)
4. **Memory UI**: How users view/edit/delete their memories (if at all)
5. **Database selection**: Turso vs Neon vs Supabase for serverless memory storage

---

## Key Takeaways for v2 Roadmap

1. **Memory is a security surface** - Treat it as untrusted data flowing into the system
2. **Context is finite** - Memory competes with conversation history; design for this
3. **Guardrails are not optional** - Production deployment without them is negligent
4. **Secrets exposure is likely** - Audit everything before first production deploy
5. **SQLite won't scale** - Plan for managed database from the start
6. **Measure before optimizing** - Set up monitoring before adding features
7. **Incremental rollout** - Don't break v1 while adding v2 features

---

## Sources Summary

### Memory & Context
- [Memory for AI Agents: A New Paradigm (The New Stack)](https://thenewstack.io/memory-for-ai-agents-a-new-paradigm-of-context-engineering/)
- [Why Personal AI Memory is Difficult (Kin)](https://mykin.ai/resources/why-personal-ai-memory-difficult)
- [OpenAI Cookbook: Session Memory](https://cookbook.openai.com/examples/agents_sdk/session_memory)
- [arXiv: AI Agents Need Memory Control Over More Context](https://arxiv.org/html/2601.11653)

### Security & Guardrails
- [LLM Security Risks in 2026 (Sombra)](https://sombrainc.com/blog/llm-security-risks-2026)
- [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [15 Threats to Security of AI Agents in 2026](https://research.aimultiple.com/security-of-ai-agents/)
- [Top 10 Predictions for AI Security in 2026 (PointGuard)](https://www.pointguardai.com/blog/top-10-predictions-for-ai-security-in-2026)
- [Prompt Injection Attacks: A Comprehensive Review (MDPI)](https://www.mdpi.com/2078-2489/17/1/54)

### Production Deployment
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Top Mistakes When Deploying Next.js Apps](https://dev.to/kuberns_cloud/top-mistakes-when-deploying-nextjs-apps-170f)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel: Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

### Voice AI
- [Voice AI Infrastructure Guide (Introl)](https://introl.com/blog/voice-ai-infrastructure-real-time-speech-agents-asr-tts-guide-2025)
- [ElevenLabs: Latency Optimization](https://elevenlabs.io/docs/developers/best-practices/latency-optimization)
- [Handling ElevenLabs API Rate Limits](https://prosperasoft.com/blog/voice-synthesis/elevenlabs/elevenlabs-api-rate-limits/)

### Database & Concurrency
- [SQLite: File Locking and Concurrency](https://sqlite.org/lockingv3.html)
- [SQLite Concurrent Writes](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)
- [Notion API: Request Limits](https://developers.notion.com/reference/request-limits)

---

*Research compiled: 2026-02-02*
*Previous version (v1 pitfalls): 2026-01-31*
*Confidence: HIGH - Multiple authoritative sources verified*
