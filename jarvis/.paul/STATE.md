# Project State

## Current Position

Milestone: v4.4 Guided Onboarding — Academy-Driven
Phase: L-02 of 4 (Live Walkthrough Pass 1) — In Progress
Plan: L-02-04 APPLIED (commits 62160b7, 2e3b9b2) — 9 bugs fixed + Tier 1 vision, UNIFY pending
Status: Awaiting UNIFY — do a full walkthrough on device to verify all 9 bugs resolved
Last activity: 2026-03-04 — L-02-04 applied and deployed

Progress:
- v4.4/L: [███░░░░░░░] ~30% (1 of 4 phases complete)
- Phase L-02: [██████░░░░] ~60% (bugs documented, fix plan ready)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [L-02-04 applied, awaiting device walkthrough then UNIFY]
```

## Completed Phases (v4.4)

### Phase L-01: Foundation — COMPLETE (2026-03-02)

- L-01-01: Redirect /jarvis → /jarvis/app, 8-topic Jarvis curriculum, OnboardingWizard → Academy handoff
- L-01-02: Spotlight bridge (spotlight_element + clear_spotlight tools, SSE bridge, DOM wiring), SAME-ORIGIN TEACHING prompt, topic enrichment, startTour differentiation

## Completed Milestones

### v4.3 Academy Engine — COMPLETE (2026-03-02)

- Phase K: Jarvis Academy — COMPLETE (K-01 through K-04)
  - K-01: 6 tools deployed, GitHub reader/writer, project registry
  - K-02: 16 structured Visopscreen topics, list_topics tool, explore hints
  - K-03: 12 Creator Workflow topics, dynamic multi-domain, registry-driven
  - K-04: DB-backed progress tracking, tabbed UI, demotion guards, teaching intelligence (21 audit fixes)

### v4.2 Meal Planning & Kitchen Intelligence — COMPLETE (2026-03-01)

- Phase J: Meal Planning Pipeline — COMPLETE (J-01 through J-04)

### v4.1 Bill Payment & Beyond — COMPLETE (2026-02-28)

- Phase H: Google Calendar Integration — COMPLETE (H-01)
- Phase I: Bill Payment Pipeline — COMPLETE (I-01)

### v4.0 Brain Swap & Personal Domain — COMPLETE (2026-02-27)

- Phases A through G — COMPLETE

## Honest Gaps (Future milestones)

- 6 empty domains (only Personal has content)
- Journal + Health sub-pages: no API data, show empty
- Write-back mutations: local-only (Notion doesn't update)
- Voice pipeline absent from new shell
- Old shell (/jarvis) now redirects to /jarvis/app — full removal deferred
- Intelligence Evolution concepts documented but not executed
- Vision input framework deferred to v4.5+

## Accumulated Context

### Decisions (L-01)
- Academy-as-onboarding: same curriculum framework for codebase teaching AND user onboarding
- SSE spotlight bridge: tool_use interception in ChatOverlay, no new API routes
- Same-origin vs cross-origin: spotlights only for Jarvis project
- 500ms setTimeout for startTour → openWithMessage (wait for router.push + shell mount)

### Decisions (L-02 Planning)
- Fix SpotlightOverlay globally (querySelectorAll + visible-filter) rather than per-component unique IDs
- Fix ID references in curriculum/prompt to match DOM, not the other way around
- Wire academyStore.activeProject into AcademyHub for onboarding → Academy flow

### Concerns
- Dual-render querySelector: RESOLVED in L-02-01 (querySelectorAll + visible-element filter)
- PriorityStack has dual IDs (empty Card + populated ul) — only one renders at a time, handled by new querySelectorAll approach
- `bottom-tab-academy` mismatch: RESOLVED in L-02-01 (fixed to `bottom-tab-learn`)
- `tasks-first-checkbox-0` mismatch: RESOLVED in L-02-01 (fixed to `tasks-first-checkbox`)
- 500ms setTimeout timing: RESOLVED in L-02-02 (shellMounted polling replaces blind timeout)

### Git State
Last commit: 038e210
Branch: master
Feature branches merged: none

## Session Continuity

Last session: 2026-03-04 (fourth pause — context limit)
Stopped at: Bills static fallback deployed, calendar diagnostic deployed, L-02-05 bug list documented
Next action: Check health endpoint for calendar error, then plan L-02-05 (curriculum + bug fixes)
Resume file: jarvis/.paul/HANDOFF-2026-03-04-d.md
Resume context:
- Bills NOW show via static fallback (28 bills, day-of-month logic) — commit d914f2a
- Calendar still broken — diagnostic at /api/jarvis/health will show actual error — commit 3677814
- Jonathan's walkthrough found 8 new/remaining bugs — need L-02-05
- BIG issue: tutorial needs deterministic curriculum, not AI-improvised
- Agent capabilities concept doc saved: jarvis/.paul/concepts/jarvis-agent-capabilities.md
- DO NOT repeat calendar/bills env var setup instructions — already done, Jonathan is frustrated
