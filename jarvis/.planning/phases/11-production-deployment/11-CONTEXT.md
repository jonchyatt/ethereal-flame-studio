# Phase 11: Production Deployment - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy Jarvis to production at `jarvis.whatamiappreciatingnow.com` with working Notion integration, secure API key storage, and proper database connectivity. This phase fixes the current broken deployment and establishes the foundation for future MacBook-based agent capabilities.

**Current State (as of 2026-02-02):**
- Domain `jarvis.whatamiappreciatingnow.com` is LIVE with old deployment
- New deployments FAIL due to `child_process` module error
- Notion integration is BROKEN (can't read tasks, calendar, etc.)
- Turso database is CONFIGURED in Vercel env vars
- All API keys are SET in Vercel (Anthropic, Deepgram, Notion, AWS)

</domain>

<decisions>
## Implementation Decisions

### Issue #1: Notion MCP in Serverless (CRITICAL - Build Breaking)

**Root Cause:**
- `NotionClient.ts` uses `child_process.spawn()` to run MCP server
- Import chain: `page.tsx (client)` → `CheckInManager` → `toolExecutor` → `NotionClient` → `child_process`
- Webpack cannot bundle `child_process` for browser/edge environments
- MCP stdio transport requires persistent process - fundamentally incompatible with Vercel serverless

**Decision: Replace MCP with Direct Notion SDK**
- Install `@notionhq/client`
- Rewrite `NotionClient.ts` to use direct API calls
- Keep same `toolExecutor.ts` interface - Claude's tools don't change
- Park existing MCP code as `NotionClient.mcp.ts` for future MacBook integration

**Why Direct SDK (not hybrid):**
- Single code path - simpler maintenance
- Works everywhere (Vercel, local, edge)
- Notion SDK does everything MCP does (MCP is just a wrapper)
- Migration back to MCP is easy (~2 hours) when MacBook available

### Issue #2: Check-in "tomorrow preview" placeholder

**Decision:** Already fixed in Phase 10-03 (commit `dced0a4`)
- Verify the fix works in production after Notion connectivity restored

### Issue #3: Unauthenticated /api/jarvis/* routes

**Decision: Single-user secret header**
- Add `X-Jarvis-Secret` header validation to API routes
- Secret stored in Vercel env var `JARVIS_API_SECRET`
- Fastest solution for single-user deployment
- Can upgrade to proper auth later if multi-user needed

### Issue #4: Session API logs env details + stack traces

**Decision: Gate behind NODE_ENV**
- Remove env logging in production
- Sanitize stack traces in error responses
- Keep detailed logging for local development only

### Issue #5: Memory dedup race condition

**Decision: Catch unique-constraint errors**
- Wrap insert in try/catch
- On conflict, re-fetch existing entry
- Minimal change, handles edge case gracefully

### Issue #6: Date filters use UTC "today/tomorrow"

**Decision: Use user's local timezone**
- Pass timezone from client (or use `America/New_York` default)
- Server-side date calculations respect timezone
- Matches human expectations for "today's tasks"

### Domain Configuration

**Decision: Subdomain only access**
- `jarvis.whatamiappreciatingnow.com` is the only entry point
- `/jarvis` route on main domain should redirect or return 404
- DNS managed in Cloudflare (already configured)
- SSL via Vercel (already working)

### Monitoring

**Decision: Use existing Vercel analytics**
- Basic monitoring already configured
- No additional services needed for v2.0
- Can add Sentry later if error tracking becomes necessary

### Claude's Discretion

- Exact error message wording for API authentication failures
- Order of fixing the 6 issues (recommend: #1 first as it blocks deployment)
- Whether to add redirect from `/jarvis` or just 404

</decisions>

<specifics>
## Specific Implementation Details

### Files to Modify for Issue #1 (MCP → Direct SDK)

```
src/lib/jarvis/notion/NotionClient.ts     → Complete rewrite
src/lib/jarvis/notion/toolExecutor.ts     → Update imports, same interface
package.json                               → Add @notionhq/client dependency
```

### Notion SDK Equivalent Operations

| Current MCP Tool | Direct SDK Method |
|-----------------|-------------------|
| `API-query-data-source` | `notion.databases.query()` |
| `API-post-page` | `notion.pages.create()` |
| `API-patch-page` | `notion.pages.update()` |
| `API-retrieve-a-page` | `notion.pages.retrieve()` |
| `API-post-search` | `notion.search()` |

### Environment Variables (Already Set in Vercel)

```
NOTION_TOKEN                    ✅ Set
NOTION_TASKS_DATABASE_ID        ✅ Set
NOTION_TASKS_DATA_SOURCE_ID     ✅ Set
NOTION_BILLS_DATA_SOURCE_ID     ✅ Set
NOTION_PROJECTS_DATA_SOURCE_ID  ✅ Set
NOTION_GOALS_DATA_SOURCE_ID     ✅ Set
NOTION_HABITS_DATA_SOURCE_ID    ✅ Set
DATABASE_URL                    ✅ Set (Turso)
DATABASE_AUTH_TOKEN             ✅ Set (Turso)
ANTHROPIC_API_KEY               ✅ Set
DEEPGRAM_API_KEY                ✅ Set
AWS_ACCESS_KEY_ID               ✅ Set
AWS_SECRET_ACCESS_KEY           ✅ Set
AWS_REGION                      ✅ Set
```

**To Add:**
```
JARVIS_API_SECRET               ❌ Need to add (for API auth)
```

### Build Error (Current)

```
./src/lib/jarvis/notion/NotionClient.ts
Module not found: Can't resolve 'child_process'

Import trace:
./src/lib/jarvis/notion/toolExecutor.ts
./src/lib/jarvis/executive/CheckInManager.ts
./src/app/jarvis/page.tsx
```

</specifics>

<architecture>
## Long-Term Architecture: Vercel + MacBook Daemon

### Phase 11 (Now - Vercel Only)

```
┌─────────────────────────────────────────┐
│              VERCEL                     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │         Jarvis Web App            │ │
│  │                                   │ │
│  │  Voice UI → Claude → Memory       │ │
│  │            ↓                      │ │
│  │  Direct Notion SDK (not MCP)      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘

✅ Voice conversation
✅ Memory persistence (Turso)
✅ Reading/writing Notion (direct SDK)
✅ Briefings and check-ins
❌ Browser automation (book flights, pay bills)
❌ Remote Telegram triggers
❌ MCP ecosystem
```

### Phase 12+ (With MacBook - Future)

```
┌─────────────────────────────────────────┐
│            MACBOOK DAEMON               │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Telegram   │  │     Browser     │  │
│  │  Listener   │  │  Automation     │  │
│  └──────┬──────┘  └────────┬────────┘  │
│         │                  │           │
│         └────────┬─────────┘           │
│                  │                     │
│           ┌──────┴──────┐              │
│           │ MCP Servers │              │
│           │ (Notion,    │              │
│           │  Browser,   │              │
│           │  etc.)      │              │
│           └──────┬──────┘              │
│                  │                     │
│           ┌──────┴──────┐              │
│           │   Claude    │              │
│           │   Session   │              │
│           └──────┬──────┘              │
│                  │                     │
│           ┌──────┴──────┐              │
│           │  HTTP API   │              │
│           └──────┬──────┘              │
└──────────────────┼──────────────────────┘
                   │
┌──────────────────┼──────────────────────┐
│              VERCEL                     │
│                  │                      │
│  Jarvis Web App ─┘                      │
│  Routes agent tasks to MacBook          │
└─────────────────────────────────────────┘

✅ Everything from Phase 11
✅ "Book me a flight to LA" → MacBook browser
✅ "Pay my electric bill" → MacBook bank login
✅ Telegram messages trigger Claude sessions
✅ Full MCP ecosystem (Notion, Browser, Files, etc.)
```

### Migration Path: SDK → MCP (When MacBook Available)

1. Keep `NotionClient.mcp.ts` (parked MCP code)
2. MacBook runs MCP server, exposes HTTP proxy at `http://macbook.local:3001`
3. Add env var: `NOTION_BACKEND=sdk|mcp`
4. `toolExecutor.ts` checks backend setting, routes accordingly
5. ~2 hours of work, no functionality lost

### Why MacBook is Required for Full Agent

| Capability | Vercel | MacBook |
|-----------|--------|---------|
| Voice chat | ✅ | ✅ |
| Memory | ✅ | ✅ |
| Notion read/write | ✅ (SDK) | ✅ (MCP) |
| Execution time | 60s max | Unlimited |
| Browser automation | ❌ | ✅ |
| Spawn processes | ❌ | ✅ |
| MCP servers | ❌ | ✅ |
| Telegram listener | ❌ | ✅ |
| Book flights | ❌ | ✅ |
| Pay bills | ❌ | ✅ |

**Bottom line:** Vercel is for the web UI. MacBook is for agent actions that require a real computer.

</architecture>

<atlas_framework>
## Learnings from Atlas/Gotcha Framework

Analyzed `jarvis/atlas_framework/` - the Moltbot-equivalent architecture from YouTube video.

### What Atlas/Gotcha Provides

| Layer | Purpose | Jarvis Equivalent |
|-------|---------|-------------------|
| **Goals** | Process definitions (what to achieve) | ROADMAP.md + PLAN.md files |
| **Orchestration** | AI manager coordinates execution | Claude via VoicePipeline |
| **Tools** | Deterministic scripts that execute | Notion tools, memory tools |
| **Context** | Domain knowledge | System prompt, MEMORY.md |
| **Hard Prompts** | Reusable instruction templates | Check-in prompts, briefing prompts |
| **Args** | Behavior settings | Feature flags, config |

### Gap Analysis: Jarvis vs Moltbot

| Feature | Moltbot | Jarvis | Priority |
|---------|---------|--------|----------|
| Persistent memory | ✅ MEMORY.md + SQLite + vectors | ✅ memory_entries + Turso | Done |
| Hybrid search | ✅ BM25 + cosine similarity | ❌ Basic LIKE query | Medium |
| Messaging gateway | ✅ Telegram/Slack | ❌ Web only | Future (MacBook) |
| Always-on daemon | ✅ Persistent Node process | ❌ Serverless | Future (MacBook) |
| Browser automation | ✅ Full control | ❌ Can't run browser | Future (MacBook) |
| Voice interface | ❌ Text only | ✅ Deepgram + ElevenLabs | Done |
| Notion integration | ❌ Not built-in | ✅ 10 tools | Done |

### Key Insight

The Atlas framework's power comes from the **always-on daemon** that can:
- Listen for Telegram messages
- Spawn Claude sessions
- Run browser automation
- Execute indefinitely

This requires a persistent computer (MacBook), not serverless. Phase 11 gets production working; Phase 12+ adds full agent capabilities.

</atlas_framework>

<deferred>
## Deferred Ideas

### For Phase 12+ (MacBook Integration)
- Telegram messaging gateway for remote triggering
- Browser automation (Playwright) for booking, payments
- MCP server restoration for richer tool ecosystem
- Hybrid search (BM25 + vector) for better memory retrieval

### For Backlog
- Multi-user support with proper authentication
- Sentry error tracking integration
- Mobile app (React Native) for push-to-talk on phone

</deferred>

<verification>
## Verification Checklist (After Implementation)

1. **Build passes:** `npm run build` succeeds without child_process error
2. **Deploy succeeds:** `vercel --prod` completes
3. **Notion reads work:** Dashboard shows real tasks, calendar, habits, bills
4. **Notion writes work:** Check-in captures items to Notion inbox
5. **Memory persists:** Close browser, reopen, memories still there
6. **Voice works:** Push-to-talk → transcription → response → speech
7. **Briefing works:** "Start Briefing" button delivers morning briefing
8. **API secured:** Unauthenticated requests to /api/jarvis/* return 401
9. **No env leaks:** Production logs don't show API keys or stack traces

</verification>

---

*Phase: 11-production-deployment*
*Context gathered: 2026-02-02*
*Session note: Comprehensive context for handoff to new session*
