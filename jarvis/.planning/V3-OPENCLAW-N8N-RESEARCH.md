# V3 Research: OpenClaw + N8N Integration Patterns

> Research document analyzing the OpenClaw + N8N architecture for potential Jarvis v3 improvements
> Date: 2026-02-03
> Sources: YouTube video by Barty Bart, GitHub repo `Barty-Bart/openclaw-n8n-starter`

---

## Executive Summary

The OpenClaw + N8N integration demonstrates a **bi-directional agent ↔ workflow automation** pattern that addresses several limitations in pure LLM-based agents:

1. **Token efficiency** - Offload deterministic work to workflows
2. **Reliability** - Deterministic pipelines for repeatable tasks
3. **Scalability** - Batch operations without LLM overhead per item
4. **Extensibility** - 1000+ pre-built N8N integrations
5. **Security** - Layered architecture with workflow as buffer

**Key Insight**: The agent remains the *orchestrator* (smart decisions) while N8N becomes the *executor* (deterministic operations). This aligns with GOTCHA's "LLMs are probabilistic, business logic is deterministic" principle.

---

## Current Jarvis Architecture (v1.0/v2.0)

### What We Have

```
┌─────────────────────────────────────────────────────────────┐
│                        JARVIS v2                            │
├─────────────────────────────────────────────────────────────┤
│  Voice Pipeline                                             │
│  ├── Deepgram STT                                          │
│  ├── ElevenLabs TTS                                        │
│  └── Push-to-talk activation                               │
├─────────────────────────────────────────────────────────────┤
│  Intelligence Layer                                         │
│  ├── Claude API (streaming)                                │
│  ├── 10 Notion tools (5 read, 5 write)                     │
│  ├── 5 Memory tools                                        │
│  └── Context management (sliding window)                    │
├─────────────────────────────────────────────────────────────┤
│  Executive Function Layer                                   │
│  ├── BriefingFlow (morning/evening/weekly)                 │
│  ├── CheckInManager                                        │
│  ├── NudgeManager (time-based reminders)                   │
│  └── LifeAreaTracker (28-day rolling baseline)             │
├─────────────────────────────────────────────────────────────┤
│  Memory Layer (v2 in progress)                             │
│  ├── MEMORY.md (curated facts)                             │
│  ├── Daily logs (session events)                           │
│  └── SQLite/Turso (searchable facts + embeddings)          │
├─────────────────────────────────────────────────────────────┤
│  Data Integration                                           │
│  └── Notion API via MCP (Life OS databases)                │
└─────────────────────────────────────────────────────────────┘
```

### Current Limitations

| Limitation | Impact | Example |
|------------|--------|---------|
| **Every tool call = LLM tokens** | Cost adds up for repeated tasks | Daily briefing queries same Notion DBs |
| **Sequential processing** | Can't batch operations efficiently | Marking 5 tasks complete = 5 tool calls |
| **Limited integrations** | Only Notion + Memory | No email, calendar write, external APIs |
| **No background processing** | All work in request/response | Can't run scheduled cleanup jobs |
| **Fragile pipelines** | LLM decides each step | Multi-step workflows can drift |

---

## OpenClaw + N8N Architecture Analysis

### The Pattern

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   User      │────▶│  OpenClaw   │────▶│        N8N          │
│  (Telegram) │     │  (Agent)    │     │  (Workflow Engine)  │
└─────────────┘     └─────────────┘     └─────────────────────┘
                           │                      │
                           │  Webhook Request     │
                           │  "call 20 applicants"│
                           ├─────────────────────▶│
                           │                      │
                           │                      ├─ Loop: Google Sheet
                           │                      ├─ For each: RetellAI call
                           │                      ├─ Aggregate results
                           │                      ├─ Summarize best
                           │                      │
                           │◀─────────────────────┤
                           │  Session Event       │
                           │  "Best: Bart, resume │
                           │   in folder X"       │
                           │                      │
                    ┌──────▼──────┐               │
                    │ Agent sees  │               │
                    │ background  │               │
                    │ context,    │               │
                    │ decides if  │               │
                    │ to surface  │               │
                    └─────────────┘               │
```

### Key Components

#### 1. Agent → N8N (Webhook Skill)
```yaml
# OpenClaw skill definition (markdown)
Skill: n8n-webhook
Description: Send request to n8n workflow
Endpoint: http://n8n:5678/webhook/{UUID}
Headers:
  - X-Webhook-Secret: {SECRET}
Body: { message: "{user_message}" }
```

#### 2. N8N → Agent (Session Event API)
```json
// HTTP Request node in N8N
POST http://openclaw-gateway:18789/tools/invoke
Headers:
  Authorization: Bearer {GATEWAY_TOKEN}
  Content-Type: application/json
Body: {
  "tool": "sessions_send",
  "arguments": {
    "session_key": "main",
    "message": "Result: Bart is the best candidate",
    "timeout_seconds": 0  // Critical: 0 = no echo
  }
}
```

### What's Good

| Feature | Why It's Good | Jarvis Relevance |
|---------|---------------|------------------|
| **Bi-directional communication** | Agent can delegate AND receive results | Morning briefing could be N8N workflow |
| **Background context injection** | N8N results don't clutter conversation | Async notifications without interrupting |
| **Deterministic pipelines** | Same input = same output every time | Notion queries, habit tracking |
| **Token savings** | Batch 20 items in one N8N workflow vs 20 LLM calls | Daily bill checks, task aggregation |
| **Pre-built integrations** | 1000+ nodes (Gmail, Slack, Google Sheets, etc.) | Calendar WRITE, email reading |
| **Visual workflow builder** | Non-technical users can modify | User can customize their briefing |
| **Isolated security** | N8N acts as security buffer | Protect Jarvis from direct internet exposure |

### What's Not Great

| Issue | Concern | Mitigation |
|-------|---------|------------|
| **Extra infrastructure** | N8N is another service to deploy/maintain | Could use Vercel Edge + Temporal as alternative |
| **Complexity** | Two systems to debug when things break | Clear separation of concerns helps |
| **Latency** | Extra hop for webhook → workflow → callback | Pre-compute and cache where possible |
| **State sync** | N8N and Jarvis have separate states | Use shared database (Turso) |
| **Overkill for simple tasks** | Not every operation needs a workflow | Only use for batch/scheduled/complex |

---

## Integration Strategy for Jarvis v3

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JARVIS v3                                │
├─────────────────────────────────────────────────────────────────┤
│  Voice Interface (unchanged)                                    │
│  ├── Deepgram STT                                              │
│  ├── ElevenLabs TTS                                            │
│  └── Push-to-talk / Wake word (future)                         │
├─────────────────────────────────────────────────────────────────┤
│  Intelligence Layer                                             │
│  ├── Claude API (reasoning, conversation)                      │
│  ├── Tool Router (decides: inline vs workflow)                 │
│  └── Context + Memory integration                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐   ┌────────────────────────────────┐  │
│  │  Inline Tools       │   │  Workflow Engine               │  │
│  │  (simple, 1-shot)   │   │  (complex, batch, scheduled)   │  │
│  ├─────────────────────┤   ├────────────────────────────────┤  │
│  │ • Memory CRUD       │   │ • Morning briefing pipeline    │  │
│  │ • Single task update│   │ • Batch task operations        │  │
│  │ • Quick queries     │   │ • Scheduled checks (bills,     │  │
│  │ • Conversational    │   │   deadlines, habits)           │  │
│  └─────────────────────┘   │ • Email digest                 │  │
│           ▲                │ • Calendar sync                │  │
│           │ Simple path    │ • External API aggregation     │  │
│           │                └────────────────────────────────┘  │
│           │                           │                        │
│           │                           ▼ Async callback         │
│           │                ┌────────────────────────────────┐  │
│           └────────────────│  Session Context Injector      │  │
│                           │  (background results → context) │  │
│                           └────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (Turso)                                            │
│  ├── Memory entries                                            │
│  ├── Sessions + daily logs                                     │
│  ├── Cached briefing data                                      │
│  └── Workflow results                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Options

#### Option A: N8N Self-Hosted (Like OpenClaw)
```
Pros:
- Visual workflow builder
- 1000+ integrations out of box
- Community workflows to import
- Proven at scale

Cons:
- Another service to deploy
- Docker/VPS requirements
- Not serverless-native

Deployment:
- Could run on same Digital Ocean droplet
- Or use N8N Cloud ($20/month)
```

#### Option B: Vercel Edge Functions + Trigger.dev
```
Pros:
- Serverless, scales to zero
- Already on Vercel
- TypeScript native
- Better debugging

Cons:
- More code to write
- Fewer pre-built integrations
- Need to build visual builder

Deployment:
- Runs on existing Vercel infra
- Uses same Turso database
```

#### Option C: Hybrid (Recommended for v3)
```
Phase 1: Build workflow primitives in TypeScript
- BatchProcessor class for array operations
- ScheduledJob class for cron-like tasks
- WorkflowResult type for async results

Phase 2: Add session context injection
- /api/jarvis/inject endpoint
- Background results → conversation context
- Agent awareness of pending/completed workflows

Phase 3: Evaluate N8N for v4
- If visual builder needed, add N8N
- If not, keep TypeScript workflows
```

---

## Specific V3 Improvements

### 1. Morning Briefing as Workflow

**Current (v2):**
```typescript
// Every briefing = multiple Notion API calls via Claude
// Each call consumes LLM tokens for tool invocation
const briefing = await BriefingBuilder.build();
// 5-6 Notion queries, each via tool_use
```

**Proposed (v3):**
```typescript
// Workflow runs on schedule, caches result
// /api/workflows/morning-briefing
export async function runMorningBriefing() {
  const [tasks, bills, calendar, habits] = await Promise.all([
    notion.queryTasks({ dueToday: true }),
    notion.queryBills({ dueSoon: true }),
    notion.queryCalendar({ today: true }),
    notion.queryHabits({ active: true })
  ]);

  const briefingData = aggregateBriefing(tasks, bills, calendar, habits);

  // Cache in Turso for instant retrieval
  await db.insert(cachedBriefings).values({
    date: today(),
    data: JSON.stringify(briefingData),
    generatedAt: new Date()
  });

  return briefingData;
}

// Jarvis just reads cached data - no LLM tool calls
const briefing = await fetch('/api/jarvis/cached-briefing');
```

**Token savings:** ~1000-2000 tokens per briefing (5+ tool calls eliminated)

### 2. Batch Task Operations

**Current:**
```
User: "Mark all my morning routine tasks as done"
Jarvis: [tool_use: query_tasks] → [tool_use: update_task x 5]
// 6 LLM calls, ~500 tokens each = 3000 tokens
```

**Proposed:**
```
User: "Mark all my morning routine tasks as done"
Jarvis: [tool_use: batch_update_tasks]
// 1 workflow call, workflow handles the loop
// ~500 tokens total
```

### 3. Background Notifications

**Pattern from OpenClaw:**
```typescript
// N8N workflow detects: bill due tomorrow
// Sends session event to OpenClaw
// Agent sees it in background, decides to surface

// Jarvis equivalent:
export async function injectBackgroundContext(
  sessionId: string,
  message: string,
  priority: 'low' | 'medium' | 'high'
) {
  await db.insert(sessionEvents).values({
    sessionId,
    type: 'background_notification',
    message,
    priority,
    surfaced: false,
    createdAt: new Date()
  });
}

// In conversation, Jarvis checks for pending notifications
const pending = await db.select()
  .from(sessionEvents)
  .where(and(
    eq(sessionEvents.sessionId, currentSession),
    eq(sessionEvents.surfaced, false),
    gte(sessionEvents.priority, 'medium')
  ));

// Inject into system prompt context
```

### 4. Scheduled Health Checks

**New capability:**
```typescript
// Cron job (Vercel Cron or external)
// Runs daily at 6 AM

export async function dailyHealthCheck() {
  const checks = await Promise.all([
    checkOverdueTasks(),
    checkUnpaidBills(),
    checkNeglectedLifeAreas(),
    checkBrokenHabits()
  ]);

  const alerts = checks.filter(c => c.needsAttention);

  if (alerts.length > 0) {
    await injectBackgroundContext(
      'default',
      formatAlerts(alerts),
      'high'
    );
  }
}
```

---

## Security Considerations

### From OpenClaw Pattern

| Measure | OpenClaw Approach | Jarvis Equivalent |
|---------|-------------------|-------------------|
| No direct internet exposure | OpenClaw only via Telegram | Jarvis only via authenticated web app |
| Webhook authentication | X-Webhook-Secret header | API key + session token |
| Internal network only | Docker internal network | Vercel Edge + same-origin |
| Rate limiting | Caddy as reverse proxy | Vercel built-in rate limits |
| Secret management | Environment variables | Vercel env vars + encrypted |

### Recommended Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  Internet                                                   │
│      │                                                      │
│      ▼                                                      │
│  ┌──────────────────┐                                       │
│  │  Vercel Edge     │ ← Authentication, rate limiting       │
│  │  (Caddy equiv)   │                                       │
│  └────────┬─────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                       │
│  │  Jarvis API      │ ← Session validation                  │
│  │  (Next.js)       │                                       │
│  └────────┬─────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │  Claude API      │     │  Workflow Engine │              │
│  │  (external)      │     │  (internal only) │              │
│  └──────────────────┘     └──────────────────┘              │
│                                   │                         │
│                                   ▼                         │
│                          ┌──────────────────┐               │
│                          │  Notion / Turso  │               │
│                          │  (credentialed)  │               │
│                          └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 7 (Current): Database Foundation
- ✅ Continue as planned
- Add `workflow_results` table for caching

### Phase 8-10: Memory + Guardrails
- ✅ Continue as planned
- Add `session_events` table for background context

### Phase 11: Production Deployment
- ✅ Continue as planned
- Add Vercel Cron for scheduled workflows

### Phase 12 (v3 NEW): Workflow Engine
```
12.1: Core workflow primitives
     - BatchProcessor class
     - ScheduledJob class
     - WorkflowResult type

12.2: Background context injection
     - /api/jarvis/inject endpoint
     - session_events table integration
     - System prompt awareness

12.3: Briefing workflow migration
     - Morning briefing as workflow
     - Evening wrap as workflow
     - Weekly review as workflow

12.4: Batch operations
     - batch_update_tasks tool
     - batch_mark_complete tool
     - Multi-item queries
```

### Phase 13 (v3 NEW): Extended Integrations
```
13.1: Calendar WRITE access
     - Google Calendar OAuth
     - Create/update events

13.2: Email integration
     - Gmail read (daily digest)
     - Important email surfacing

13.3: External notifications
     - Push notifications (PWA)
     - Optional Telegram/SMS alerts
```

---

## Atlas Framework Alignment

The OpenClaw + N8N pattern aligns well with GOTCHA:

| GOTCHA Layer | OpenClaw Implementation | Jarvis v3 Equivalent |
|--------------|-------------------------|----------------------|
| **Goals** | Skills (markdown) | Tool definitions + workflow configs |
| **Orchestration** | OpenClaw agent | Claude + tool router |
| **Tools** | N8N workflows | TypeScript workflow engine |
| **Context** | Session history | Memory system + cached data |
| **Hard prompts** | N/A | System prompt templates |
| **Args** | Environment vars | Jarvis settings store |

### Key Insight from Atlas

> "90% accuracy per step sounds good until you realize that's ~59% accuracy over 5 steps."

This is why workflows matter: a 5-step briefing pipeline should be deterministic code, not 5 LLM decisions.

---

## Decision Matrix

| Approach | Complexity | Token Savings | New Capabilities | Recommendation |
|----------|------------|---------------|------------------|----------------|
| Keep current | Low | 0% | None | ❌ Limits growth |
| Add N8N | High | 50-70% | Many | ⚠️ Consider for v4 |
| TypeScript workflows | Medium | 40-60% | Good | ✅ v3 target |
| Full agent framework | Very High | 30-50% | Most | ❌ Over-engineering |

**Recommendation**: Build TypeScript workflow engine in v3. If visual workflow builder needed later, add N8N in v4.

---

## Open Questions for v3 Planning

1. **Workflow persistence**: Use Turso tables or separate workflow state store?
2. **Retry logic**: How to handle failed workflow steps?
3. **User visibility**: Should users see workflow execution status?
4. **Mobile notifications**: PWA push vs external service (Telegram/Pushover)?
5. **Calendar OAuth**: Worth the complexity for write access?

---

## References

- [Barty-Bart/openclaw-n8n-starter](https://github.com/Barty-Bart/openclaw-n8n-starter)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [N8N Workflow Automation](https://n8n.io)
- [Atlas/GOTCHA Framework](./atlas_framework/)
- [Jarvis v2 Architecture](./PROJECT.md)

---

*This document serves as research input for v3 planning. Not a commitment to implement all features.*
