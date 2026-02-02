# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** v2.0 Memory & Production

## Current Position

Phase: 8 - Memory Loading & Integration
Plan: 03 of 03 complete
Status: Phase 8 COMPLETE
Last activity: 2026-02-02 - Completed 08-03-PLAN.md (proactive memory surfacing)

Progress: [########            ] 40% (6/15 plans complete)

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
| 9 | Memory Writing & Tools | MEM-02, MEM-03, MEM-04, MEM-05, MEM-09, MEM-10 | Blocked |
| 10 | Guardrails & Safety | GUARD-01-05, FIX-01-02 | Blocked |
| 11 | Production Deployment | PROD-01-04 | Blocked |

## Archives

- `.planning/milestones/v1-ROADMAP.md` - v1 phase details
- `.planning/milestones/v1-REQUIREMENTS.md` - v1 requirements (39)
- `.planning/milestones/v1-MILESTONE-AUDIT.md` - v1 verification report

## Next Steps

1. Begin Phase 9 (Memory Writing & Tools) - MEM-02, MEM-03, MEM-04, MEM-05, MEM-09, MEM-10
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

### Pending Todos

- None

### Blockers/Concerns

- Turso CLI not installed locally (user setup required for local db testing)

### Known Bugs (from v1)

- FIX-01: Captured items during check-ins not reaching Notion inbox
- FIX-02: Tomorrow preview shows placeholder data

## Session Continuity

Last session: 2026-02-02T19:57:30Z
Stopped at: Completed 08-03-PLAN.md (proactive memory surfacing) - Phase 8 complete
Resume file: None
