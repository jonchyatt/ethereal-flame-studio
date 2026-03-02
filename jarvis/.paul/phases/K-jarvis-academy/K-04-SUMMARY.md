---
phase: K-jarvis-academy
plan: 04
subsystem: academy, ui, api, database
tags: [zustand, drizzle, curriculum, teaching, progress-tracking]

requires:
  - phase: K-03
    provides: Registry-driven multi-domain curriculum, dynamic tool descriptions
provides:
  - DB-backed academy progress tracking (academy_progress table)
  - Academy progress API (GET/POST /api/jarvis/academy/progress)
  - Zustand academyStore with demotion guard
  - academy_update_progress tool (7th academy tool)
  - Tabbed Academy UI with curriculum topic cards
  - Teaching-enriched system prompt (student progress, verification, session flow)
  - Teaching-enriched evaluation context
affects: [intelligence-evolution, domain-expansion]

tech-stack:
  added: [drizzle migration 0002]
  patterns: [demotion guard (client+server), DB-backed progress with fire-and-forget sync, cross-project priority sorting]

key-files:
  created:
    - src/lib/jarvis/academy/queries.ts
    - src/lib/jarvis/academy/curriculum.ts
    - src/app/api/jarvis/academy/progress/route.ts
    - src/lib/jarvis/stores/academyStore.ts
    - src/components/jarvis/academy/CurriculumTopicCard.tsx
    - drizzle/0002_whole_blue_blade.sql
    - drizzle/meta/0002_snapshot.json
  modified:
    - src/lib/jarvis/memory/schema.ts
    - src/lib/jarvis/academy/academyTools.ts
    - src/lib/jarvis/academy/toolExecutor.ts
    - src/lib/jarvis/academy/index.ts
    - src/lib/jarvis/academy/githubReader.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/lib/jarvis/intelligence/evaluator.ts
    - src/lib/jarvis/telegram/context.ts
    - src/components/jarvis/academy/AcademyHub.tsx
    - src/components/jarvis/academy/AcademyProgress.tsx

key-decisions:
  - "Demotion guard: both client (markExplored) and server (upsertAcademyProgress) reject backward status transitions"
  - "DB-backed, not persisted Zustand: academyStore has no persist middleware — DB is source of truth"
  - "Cross-project priority: getNextSuggested sorts in_progress first, then by startedAt across all projects"
  - "Teaching notes capped at 2000 chars with correct truncation arithmetic (separator subtracted before halving)"

patterns-established:
  - "Demotion guard pattern: STATUS_ORDER lookup, both client and server reject lower ordinal"
  - "Cross-project next-suggested: shared getNextSuggested() in curriculum.ts used by UI, tools, and prompt"
  - "Always-refetch on mount: no isLoaded guard — server-side tool calls may update progress between navigations"

duration: ~8h (across 6 sessions including 5 audit passes)
started: 2026-03-02
completed: 2026-03-02
---

# Phase K Plan 04: Academy UI + Intelligence Summary

**DB-backed academy progress tracking with tabbed UI, demotion-guarded tool, and teaching-enriched intelligence — hardened across 5 audit passes (21 fixes).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~8h across 6 sessions |
| Started | 2026-03-02 |
| Completed | 2026-03-02 |
| Tasks | 13 planned, 13 completed + 21 audit fixes |
| Files modified | 16 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: academy_progress table with unique index | Pass | Drizzle schema + migration 0002 |
| AC-2: GET/POST /api/jarvis/academy/progress API | Pass | Protected by middleware, runtime status validation |
| AC-3: academyStore Zustand store | Pass | DB-backed, demotion guard in markExplored |
| AC-4: academy_update_progress tool | Pass | 7th tool, curriculum validation, demotion guard |
| AC-5: Tabbed Academy UI | Pass | AcademyHub rewritten with ProjectCurriculumTab |
| AC-6: CurriculumTopicCard (4 states) | Pass | not_started/explored/in_progress/completed |
| AC-7: Teaching context in system prompt | Pass | STUDENT PROGRESS + TEACHING VERIFICATION + SESSION FLOW |
| AC-8: Teaching-enriched evaluation | Pass | Academy progress injected into evaluator context |
| AC-9: Progress persists across sessions | Pass | DB-backed, refetches on mount |
| AC-10: No backward status transitions | Pass | Client + server demotion guard |

## Accomplishments

- Complete academy progress pipeline: DB schema → queries → API → tool → store → UI → intelligence
- Demotion guard prevents "Review" from resetting completed topics (CRITICAL bug caught in audit session 2)
- Cross-project priority ensures "Continue Learning" surfaces in-progress topics from any project
- 5 audit passes caught progressively subtler bugs: implementation → logic → temporal → cross-component → data flow

## Task Commits

Work accumulated across 6 sessions (initial implementation + 5 audit passes), not committed yet. Will be committed as single feature commit with unify.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/memory/schema.ts` | Modified | `academy_progress` table + unique index |
| `src/lib/jarvis/academy/queries.ts` | Created | getAllAcademyProgress, getProgressByProject, upsertAcademyProgress |
| `src/lib/jarvis/academy/curriculum.ts` | Created | Shared `getNextSuggested` algorithm |
| `src/app/api/jarvis/academy/progress/route.ts` | Created | GET + POST API (middleware-protected) + runtime validation |
| `src/lib/jarvis/stores/academyStore.ts` | Created | Zustand store (no persist, DB-backed) with demotion guard |
| `src/lib/jarvis/academy/academyTools.ts` | Modified | 7th tool: `academy_update_progress` |
| `src/lib/jarvis/academy/toolExecutor.ts` | Modified | `handleUpdateProgress` with curriculum validation |
| `src/lib/jarvis/academy/index.ts` | Modified | New exports |
| `src/lib/jarvis/academy/githubReader.ts` | Modified | Large file guard in readFile() |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | STUDENT PROGRESS + TEACHING VERIFICATION + SESSION FLOW + conditional CAPABILITIES |
| `src/lib/jarvis/intelligence/evaluator.ts` | Modified | Teaching-enriched evaluation context |
| `src/lib/jarvis/telegram/context.ts` | Modified | Loads academy progress into prompt context |
| `src/components/jarvis/academy/CurriculumTopicCard.tsx` | Created | 4-state topic card (locked/available/in-progress/completed) |
| `src/components/jarvis/academy/AcademyHub.tsx` | Rewritten | Tabbed layout + curriculum + cross-project priority |
| `src/components/jarvis/academy/AcademyProgress.tsx` | Rewritten | Combined progress briefing card |
| `drizzle/0002_whole_blue_blade.sql` | Created | Migration SQL |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| DB-backed store (no Zustand persist) | Server-side tool calls update progress — localStorage would be stale | Always-fresh data from DB |
| Demotion guard on both client and server | Client can't trust client-only guard; tool executor runs server-side | Prevents "Review" from resetting completed topics |
| Cross-project getNextSuggested | Users may have multiple projects in progress | Consistent priority across Academy UI and system prompt |
| Always-refetch on mount (no isLoaded guard) | Tool calls update DB between navigations | Fixed stale progress bug (audit session 5) |
| Teaching notes capped at 2000 chars | Unbounded growth breaks system prompt budget | Truncation arithmetic corrected (audit session 5) |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 21 | Essential quality hardening |
| Scope additions | 0 | None |
| Deferred | 4 | Logged as known issues |

**Total impact:** 21 audit fixes across 5 sessions caught bugs from CRITICAL to MEDIUM. Severity decreasing with each pass — converging on production quality.

### Audit Fix Summary (5 sessions)

**Session 1 (7 fixes):** Unique index, typed updates, teaching notes cap, selector naming, negative count guard, inline type, prerequisite names
**Session 2 (5 fixes):** CRITICAL client+server demotion bug, notes truncation direction, curriculum validation, system prompt remaining count
**Session 3 (3 fixes):** completedAt overwrite on re-completion, unconditional Academy capability, readFile large file guard
**Session 4 (3 fixes):** Cross-project priority (x2), runtime status validation
**Session 5 (3 fixes):** Stale progress on re-mount, startedAt data integrity, perpetual truncation arithmetic

### Deferred Items

- Inline `<style>` keyframes — systemic pre-existing pattern (not K-04 specific)
- Teaching evaluation is free-text only — no structured teaching score dimension
- `selectProjectProgress` creates new array on every call (unused, footgun for future)
- Fire-and-forget fetches don't check HTTP status (next loadProgress reconciles)

## Next Phase Readiness

**Ready:**
- Phase K complete (4/4 plans) — Academy Engine fully built
- 7 tools, 28+ curriculum topics, DB-backed progress, teaching intelligence
- v4.3 milestone ready for completion

**Concerns:**
- GitHub PAT blocker still exists — academy tools won't work until GITHUB_TOKEN set
- Migration 0002 will auto-apply on first deploy (drizzle-kit push)

**Blockers:**
- None for milestone completion

---
*Phase: K-jarvis-academy, Plan: 04*
*Completed: 2026-03-02*
