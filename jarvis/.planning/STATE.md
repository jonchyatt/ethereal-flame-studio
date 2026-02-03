# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** v2.0 Memory & Production

## Current Position

Phase: 11 - Production Deployment
Plan: Context gathered, ready for planning
Status: Context complete (11-CONTEXT.md)
Last activity: 2026-02-02 - Gathered Phase 11 context, identified 6 issues to fix

Progress: [####################] 100% (15/15 v2.0 plans complete, Phase 11 pending)

## Milestone Summary

**v2.0 Memory & Production** (active):
- 5 phases (7-11), 22 requirements
- Database foundation + memory system + guardrails + production deployment
- Continues from v1 (phases 1-6)

**v1 Executive Function Partner** (shipped 2026-02-02):
- 6 phases, 18 plans, 39 requirements
- 49 files, 11,851 LOC TypeScript
- Full voice pipeline (Deepgram STT -> Claude -> ElevenLabs TTS)
- Notion integration via MCP (10 tools)
- Executive function: briefings, nudges, check-ins, weekly review

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 7 | Database Foundation | MEM-01, MEM-08 | Complete (3/3 plans) |
| 8 | Memory Loading & Integration | MEM-06, MEM-07, MEM-11 | Complete (3/3 plans) |
| 9 | Memory Writing & Tools | MEM-02, MEM-03, MEM-04, MEM-05, MEM-09, MEM-10 | Complete (4/4 plans) |
| 10 | Guardrails & Safety | GUARD-01-05, FIX-01-02 | Complete (4/4) |
| 11 | Production Deployment | PROD-01-04 | Ready |

## Archives

- `.planning/milestones/v1-ROADMAP.md` - v1 phase details
- `.planning/milestones/v1-REQUIREMENTS.md` - v1 requirements (39)
- `.planning/milestones/v1-MILESTONE-AUDIT.md` - v1 verification report

## Next Steps

1. Execute Phase 11 - Production Deployment
2. Install Turso CLI for local database testing (user action)

## Accumulated Context

### Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| @libsql/client + Drizzle | Required for Vercel serverless (better-sqlite3 won't work) | 2026-02-02 |
| Turso for production | Free tier sufficient (9GB, 1B reads/month), libsql compatible | 2026-02-02 |
| Three-layer memory | MEMORY.md (curated) + daily logs (events) + SQLite (searchable) | 2026-02-02 |
| Guardrails before production | Memory poisoning is documented attack vector | 2026-02-02 |
| Turso dialect config | Using `dialect: 'turso'` in drizzle.config.ts per latest docs | 2026-02-02 |
| Schema location | ./src/lib/jarvis/memory/schema.ts for memory system code | 2026-02-02 |
| TEXT for timestamps | ISO 8601 strings stored in TEXT columns (SQLite best practice) | 2026-02-02 |
| Singleton db client | Prevents connection exhaustion in serverless environment | 2026-02-02 |
| content_hash for dedup | Unique index enables silent updates when same fact restated | 2026-02-02 |
| Content normalization | trim, lowercase, collapse spaces, strip trailing punctuation before hashing | 2026-02-02 |
| MemoryService facade | Static methods for common operations (initSession, closeSession, remember) | 2026-02-02 |
| Session API semantics | GET gets/creates, POST forces new (closing active), PATCH ends session | 2026-02-02 |
| Scoring weights (50/30/20) | Recency most important, then category, then source | 2026-02-02 |
| Token estimation 4 chars/token | Conservative to prevent context overflow | 2026-02-02 |
| Age as relative strings | "2 weeks ago" more natural than ISO timestamps | 2026-02-02 |
| Feature flag default off | Memory loading disabled by default for safe rollout | 2026-02-02 |
| Server-side prompt building | System prompt built on server, memories never sent to client | 2026-02-02 |
| Graceful degradation | Memory loading errors logged but don't break chat | 2026-02-02 |
| Action keywords for pending | follow up, remind, pending, waiting, need to, should, want to, deadline | 2026-02-02 |
| Proactive surfacing limits | Max 5 pending items, max 3 contextual facts | 2026-02-02 |
| Recency filter for surfacing | Only items from last 3 days considered pending | 2026-02-02 |
| No emotional check-ins | System prompt explicitly prohibits "How did X go?" style questions | 2026-02-02 |
| Soft delete via deletedAt | TEXT column with ISO timestamp, null = active | 2026-02-02 |
| 30-day restoration window | getDeletedMemories only returns entries deleted within 30 days | 2026-02-02 |
| Word overlap fuzzy matching | Simple scoring: count query words found in content, boost exact matches | 2026-02-02 |
| 30-day decay half-life | At 30 days without access, memory has 50% decay | 2026-02-02 |
| 0.5x explicit decay multiplier | User-stated facts decay 50% slower than inferred | 2026-02-02 |
| 0.9 decay threshold | Memories 90% decayed are soft-deleted during cleanup | 2026-02-02 |
| Conditional prompt section | MEMORY MANAGEMENT only added when memoryContext exists | 2026-02-02 |
| Category mapping | Tool categories (schedule, work, health) map to DB categories (fact, preference, pattern) | 2026-02-02 |
| Two-phase forget | forget_fact first searches, then requires confirm_ids to delete | 2026-02-02 |
| delete_all safety | Requires explicit confirm="true" parameter to execute full wipe | 2026-02-02 |
| OBSERVATION_THRESHOLD = 3 | Require 3 consistent observations within 7 days to infer preference | 2026-02-02 |
| jarvis_inferred source tag | Inferred preferences tagged differently from user_explicit | 2026-02-02 |
| Pattern enum | Limited set of patterns prevents arbitrary creation and enables consistent mapping | 2026-02-02 |
| LEARNED PREFERENCES section | Added to system prompt after MEMORY MANAGEMENT section | 2026-02-02 |
| Tool executor logging wrapper | Inner function for logic, outer for logging - separates concerns | 2026-02-02 |
| Human-readable audit context | summarizeToolContext helpers produce readable logs, not raw JSON | 2026-02-02 |
| Explicit memories exempt from decay | Return 0 decay (not reduced multiplier) - permanent until user deletes | 2026-02-02 |
| Conservative 100K token limit | Safety margin vs 200K actual Claude 3.5 Haiku context | 2026-02-02 |
| 80% context utilization warning | Log warning at high utilization for conversation summarization | 2026-02-02 |
| Jest for unit testing | Added jest, ts-jest, @types/jest for memory module tests | 2026-02-02 |
| Audit log query limit cap at 50 | Prevents excessive response sizes while allowing reasonable history | 2026-02-02 |
| Voice-friendly timestamps | toLocaleTimeString with en-US locale for natural speech output | 2026-02-02 |
| Direct Notion SDK over MCP | MCP requires persistent process, incompatible with Vercel serverless | 2026-02-02 |
| Park MCP code for MacBook | NotionClient.mcp.ts preserved for future always-on daemon | 2026-02-02 |
| Single-user API secret | X-Jarvis-Secret header for API auth, simplest solution | 2026-02-02 |
| Subdomain-only access | jarvis.whatamiappreciatingnow.com is sole entry point | 2026-02-02 |
| MacBook for full agent | Browser automation, Telegram, MCP require persistent process | 2026-02-02 |

### Pending Todos

- None

### Blockers/Concerns

- Turso CLI not installed locally (user setup required for local db testing)

### Known Bugs (from v1)

- ~~FIX-01: Captured items during check-ins not reaching Notion inbox~~ (Fixed in 10-03)
- ~~FIX-02: Tomorrow preview shows placeholder data~~ (Fixed in 10-03)

## Session Continuity

Last session: 2026-02-02
Stopped at: Phase 11 context gathering complete
Resume file: `.planning/phases/11-production-deployment/11-CONTEXT.md`

Phase 10 (Guardrails & Safety) complete:
- 10-01: Audit logging wire-up (complete)
- 10-02: Audit log query tool (complete)
- 10-03: Bug fixes FIX-01, FIX-02 (complete)
- 10-04: Decay exemption & context monitoring (complete)

### Phase 11 Context Summary

**Current Production State:**
- Domain `jarvis.whatamiappreciatingnow.com` is LIVE (old deployment)
- New deployments FAIL due to `child_process` module error in NotionClient.ts
- Notion integration BROKEN - dashboard shows no data

**6 Issues to Fix:**
1. **Notion MCP in serverless** (CRITICAL) - Replace MCP with Direct Notion SDK
2. **Tomorrow preview placeholder** - Already fixed in 10-03, verify in prod
3. **Unauthenticated API routes** - Add single-user secret header
4. **Session API leaks env/stack** - Gate behind NODE_ENV
5. **Memory dedup race condition** - Catch unique-constraint errors
6. **UTC date filters** - Use user's local timezone

**Key Decision: Direct Notion SDK (not MCP)**
- MCP requires persistent process (incompatible with Vercel serverless)
- Direct SDK does everything MCP does
- Park MCP code for future MacBook integration
- Migration back to MCP is easy (~2 hours)

**Long-Term Architecture:**
- Phase 11: Vercel-only deployment with Direct SDK
- Phase 12+: MacBook daemon for browser automation, Telegram, full MCP
- MacBook required for "book flights", "pay bills" agent capabilities

**Next Step:** `/gsd:plan-phase 11` to create execution plans
