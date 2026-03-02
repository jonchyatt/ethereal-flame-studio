# PAUL Handoff

**Date:** 2026-03-02
**Status:** context-limit

---

## READ THIS FIRST

You have no prior context. This document tells you everything.

**Project:** Jarvis — Self-Improving Life Manager
**Core value:** One system that knows everything, surfaces what matters, keeps you on track, and gets smarter over time.

---

## Current State

**Version:** v4.3 Academy Engine (Phase K)
**Phase:** K-04 of 4 — Academy UI + Intelligence
**Plan:** K-04 — APPLIED + 2 rounds of audit fixes, needs UNIFY

**Loop Position:**
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [K-04 applied + 2 audit passes, needs unify]
```

---

## What Was Done

### Session 1 (prior session — from previous handoff)
- Full K-04 implementation: 13 files built (DB schema, queries, API route, tool, store, system prompt, evaluator, 3 UI components)
- Self-audit: 20 issues found, 7 fixed (all CRITICALs + key HIGHs)
- Migration generated (`drizzle/0002_whole_blue_blade.sql`)

### Session 2 (this session — DaVinci audit)
- **5 additional fixes across 2 audit passes**, all verified with clean builds:

**Pass 1 — 3 fixes:**

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | CRITICAL | `stores/academyStore.ts` | `markExplored` was demoting completed topics back to explored. Now early-returns for completed topics, only incrementing interaction count |
| 2 | HIGH | `academy/queries.ts` | Teaching notes `.slice(-2000)` dropped the oldest foundational notes. Now keeps first 1000 + `[...]` + last 1000 chars |
| 3 | HIGH | `academy/toolExecutor.ts` | Non-curriculum projects silently accepted arbitrary topic IDs. Now rejects with clear error |

**Pass 2 — 2 fixes:**

| # | Severity | File | Fix |
|---|----------|------|-----|
| 4 | HIGH | `academy/queries.ts` | `upsertAcademyProgress` also allowed completed→explored demotion SERVER-SIDE (Claude tool calls bypass the store). Now guards: `completed` is a terminal state |
| 5 | HIGH | `intelligence/systemPrompt.ts` | `remaining` count was `total - completed` instead of `total - completed - explored`. Explored topics were double-counted in both "in progress" AND "remaining" |

**Key insight:** The demotion bug (#1 + #4) existed in TWO layers. Fix #1 guarded the client store, but Claude's `academy_update_progress` tool calls the server directly, bypassing the store. Without #4, the DB would be corrupted and the next `loadProgress` would overwrite the client-side guard.

---

## What's In Progress

- **Nothing partially done** — all 5 fixes are complete and build-passing

---

## What's Next

**Immediate:** `/paul:unify` K-04 — reconcile plan vs actual, update STATE.md + ROADMAP.md, commit all K-04 work, push to master

**After that:**
- Push triggers auto-deploy to https://jarvis.whatamiappreciatingnow.com/
- Migration auto-applies on Vercel build (`drizzle-kit push`)
- Verify: `/jarvis/app/academy` shows tabs, curriculum topics, locked prerequisites
- Verify: "Learn" opens chat with teaching context
- Verify: Jarvis calls `academy_update_progress` during teaching sessions
- Verify: Progress persists after refresh (DB-backed)
- Verify: Clicking "Review" on completed topics does NOT demote progress

---

## Remaining Known Issues (acceptable for v1)

- Inline `<style>` keyframes — systemic pre-existing pattern across all components (not K-04 specific)
- Teaching evaluation is free-text only — no structured teaching score dimension in evaluator
- `selectProjectProgress` selector creates new array on every call (unused currently, footgun for future)

---

## Key Files Changed (complete K-04 file list)

| File | What |
|------|------|
| `src/lib/jarvis/memory/schema.ts` | `academy_progress` table + unique index |
| `src/lib/jarvis/academy/queries.ts` | getAllAcademyProgress, getProgressByProject, upsertAcademyProgress (with demotion guard + notes truncation fix) |
| `src/lib/jarvis/academy/curriculum.ts` | Shared `getNextSuggested` algorithm |
| `src/app/api/jarvis/academy/progress/route.ts` | GET + POST API (protected by middleware) |
| `src/lib/jarvis/stores/academyStore.ts` | Zustand store with demotion guard in markExplored |
| `src/lib/jarvis/academy/academyTools.ts` | 7th tool: `academy_update_progress` |
| `src/lib/jarvis/academy/toolExecutor.ts` | `handleUpdateProgress` with curriculum validation |
| `src/lib/jarvis/academy/index.ts` | New exports |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | STUDENT PROGRESS (remaining count fix) + TEACHING VERIFICATION + SESSION FLOW |
| `src/lib/jarvis/telegram/context.ts` | Loads academy progress into prompt context |
| `src/lib/jarvis/intelligence/evaluator.ts` | Teaching-enriched evaluation context |
| `src/components/jarvis/academy/CurriculumTopicCard.tsx` | 4-state topic card |
| `src/components/jarvis/academy/AcademyHub.tsx` | Tabbed layout + curriculum |
| `src/components/jarvis/academy/AcademyProgress.tsx` | Combined progress briefing card |
| `drizzle/0002_whole_blue_blade.sql` | Migration SQL |

---

## Resume Instructions

1. Read `.paul/STATE.md` for latest position
2. K-04 is APPLIED with 2 audit passes complete — run `/paul:unify` to close the loop
3. Then commit all K-04 files and push to master

---

*Handoff created: 2026-03-02 K-04 audit session 2*
