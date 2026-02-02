# Roadmap: Jarvis v2.0 Memory & Production

**Milestone:** v2.0
**Status:** Active
**Phases:** 7-11 (continues from v1 phases 1-6)
**Requirements:** 22 total

## Overview

Jarvis v2.0 adds persistent cross-session memory and production deployment to the existing voice assistant. The roadmap follows a strict dependency chain: database foundation before memory loading, loading before writing, writing before guardrails, and guardrails before production. Each phase delivers a verifiable capability that unblocks the next while maintaining safety guarantees for production deployment.

---

## Phase 7: Database Foundation

**Goal:** Jarvis has a persistent storage layer that survives browser sessions and works on serverless

**Depends on:** v1 complete (Phase 6)

**Requirements:**
- MEM-01: User can have facts persist across browser sessions
- MEM-08: Jarvis logs daily session events to persistent storage

**Plans:** 3 plans

Plans:
- [ ] 07-01-PLAN.md — Install Drizzle + libsql, configure environment
- [ ] 07-02-PLAN.md — Create schema (memory_entries, sessions, daily_logs) + db client
- [ ] 07-03-PLAN.md — Query functions, API routes, verify persistence

**Success Criteria:**
1. User can close browser, reopen, and see that previous session data exists
2. Session events (start time, topics discussed) are written to database
3. Database works in both local development (SQLite file) and serverless (libsql)
4. Schema includes tables for memory_entries, daily_logs, and sessions

**Research Needed:** No - @libsql/client + Drizzle well-documented

---

## Phase 8: Memory Loading & Integration

**Goal:** Jarvis loads and references memory context at conversation start without breaking existing features

**Depends on:** Phase 7

**Requirements:**
- MEM-06: Jarvis loads relevant memory context at session start
- MEM-07: Jarvis references previous conversations naturally ("Yesterday you mentioned...")
- MEM-11: Jarvis proactively surfaces relevant memories in context

**Success Criteria:**
1. When user opens Jarvis, relevant facts from previous sessions appear in system context
2. Jarvis can reference yesterday's conversation naturally in responses
3. Jarvis proactively mentions relevant stored facts when contextually appropriate
4. Feature flag allows disabling memory loading without breaking v1 features
5. Memory injection respects context window limits (no overflow)

**Research Needed:** No - extension of existing architecture

---

## Phase 9: Memory Writing & Tools

**Goal:** User can explicitly manage what Jarvis remembers through voice commands

**Depends on:** Phase 8

**Requirements:**
- MEM-02: User can explicitly tell Jarvis to remember something
- MEM-03: User can explicitly tell Jarvis to forget something
- MEM-04: User can ask what Jarvis remembers
- MEM-05: User can delete all stored memories
- MEM-09: Jarvis learns user communication preferences over time
- MEM-10: Jarvis decays unused memories to prevent bloat

**Success Criteria:**
1. User can say "Remember I have therapy on Thursdays" and fact persists
2. User can say "Forget that preference" and targeted fact is removed
3. User can ask "What do you know about me?" and get comprehensive answer
4. User can say "Delete all memories" with confirmation and all data is cleared
5. Jarvis adapts response style based on observed preferences (brevity vs detail)
6. Old unaccessed memories have reduced retrieval priority

**Research Needed:** Minimal - tool format may need iteration

---

## Phase 10: Guardrails & Safety

**Goal:** All Jarvis actions have appropriate safety controls and audit trails

**Depends on:** Phase 9

**Requirements:**
- GUARD-01: Destructive actions require explicit confirmation
- GUARD-02: All tool invocations logged with timestamp and parameters
- GUARD-03: Memory entries tagged with source (user-explicit vs inferred)
- GUARD-04: Malicious content in memory entries detected and rejected
- GUARD-05: Context window utilization monitored to prevent instruction drift
- FIX-01: Captured items during check-ins reach Notion inbox
- FIX-02: Tomorrow preview in evening check-in shows real data

**Success Criteria:**
1. User asked to confirm before any delete/complete operation executes
2. Every tool call appears in audit log with timestamp, tool name, parameters
3. Memory entries display their provenance (user said vs Jarvis inferred)
4. Attempts to store instruction-like content in memory are rejected
5. System warns when context window utilization exceeds 80%
6. Items captured during midday/evening check-ins appear in Notion inbox
7. Evening check-in tomorrow preview shows actual calendar/task data

**Research Needed:** YES - guardrail taxonomy for all Jarvis tools

---

## Phase 11: Production Deployment

**Goal:** Jarvis is deployed to production with proper security and monitoring

**Depends on:** Phase 10

**Requirements:**
- PROD-01: Jarvis deployed to jarvis.whatareyouappreciatingnow.com
- PROD-02: All API keys stored securely (not exposed to client)
- PROD-03: Production database configured (Turso)
- PROD-04: Custom domain with HTTPS configured

**Success Criteria:**
1. User can access Jarvis at jarvis.whatareyouappreciatingnow.com
2. No API keys appear in client-side JavaScript or network requests
3. Production database (Turso) is connected and storing data
4. HTTPS certificate valid and auto-renewing
5. Cold start latency acceptable (under 3 seconds)

**Research Needed:** YES - Turso setup specifics, Vercel edge deployment

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 7 | Database Foundation | MEM-01, MEM-08 | Planned (3 plans) |
| 8 | Memory Loading & Integration | MEM-06, MEM-07, MEM-11 | Not Started |
| 9 | Memory Writing & Tools | MEM-02, MEM-03, MEM-04, MEM-05, MEM-09, MEM-10 | Not Started |
| 10 | Guardrails & Safety | GUARD-01 to GUARD-05, FIX-01, FIX-02 | Not Started |
| 11 | Production Deployment | PROD-01 to PROD-04 | Not Started |

---

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| MEM-01 | 7 | Facts persist across browser sessions |
| MEM-02 | 9 | Explicit "remember" command |
| MEM-03 | 9 | Explicit "forget" command |
| MEM-04 | 9 | Ask what Jarvis remembers |
| MEM-05 | 9 | Delete all stored memories |
| MEM-06 | 8 | Load memory context at session start |
| MEM-07 | 8 | Reference previous conversations |
| MEM-08 | 7 | Log daily session events |
| MEM-09 | 9 | Learn communication preferences |
| MEM-10 | 9 | Decay unused memories |
| MEM-11 | 8 | Proactively surface relevant memories |
| PROD-01 | 11 | Deploy to subdomain |
| PROD-02 | 11 | Secure API key storage |
| PROD-03 | 11 | Turso production database |
| PROD-04 | 11 | Custom domain with HTTPS |
| FIX-01 | 10 | Inbox capture bug |
| FIX-02 | 10 | Tomorrow preview bug |
| GUARD-01 | 10 | Confirmation for destructive actions |
| GUARD-02 | 10 | Tool invocation logging |
| GUARD-03 | 10 | Memory source tagging |
| GUARD-04 | 10 | Malicious content detection |
| GUARD-05 | 10 | Context window monitoring |

**Coverage:** 22/22 requirements mapped

---

## Key Dependencies

```
Phase 7: Database Foundation
    |
    v
Phase 8: Memory Loading & Integration
    |
    v
Phase 9: Memory Writing & Tools
    |
    v
Phase 10: Guardrails & Safety
    |
    v
Phase 11: Production Deployment
```

All phases are sequential - each builds on the previous. No parallel work possible across phases.

---

## Research Flags

| Phase | Needs Research | Notes |
|-------|----------------|-------|
| 7 | No | Drizzle + @libsql/client well-documented |
| 8 | No | Extension of existing VoicePipeline |
| 9 | Minimal | Tool format may need iteration |
| 10 | **YES** | Guardrail taxonomy, action classification |
| 11 | **YES** | Turso setup, Vercel configuration |

---

*Created: 2026-02-02*
*Milestone: v2.0 Memory & Production*
