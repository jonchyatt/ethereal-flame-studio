# Project State

## Current Position

Milestone: v4.4 Guided Onboarding — Academy-Driven
Phase: L-02 of 4 (Live Walkthrough Pass 1)
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-02 — Phase L-01 complete, transitioned to Phase L-02

Progress:
- v4.4/L: [███░░░░░░░] ~25% (1 of 4 phases complete)
- Phase L-02: [░░░░░░░░░░] not started

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready for next PLAN]
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

### Concerns
- Dual-render querySelector: both mobile/desktop DomainRail get same data-tutorial-id; querySelector finds first (mobile, hidden on desktop) → zero-dimension rect. L-02 will test.
- PriorityStack has dual IDs (empty Card + populated ul) — only one renders at a time, should be fine

### Git State
Last commit: 07a4730
Branch: master
Feature branches merged: none

## Session Continuity

Last session: 2026-03-02
Stopped at: Phase L-01 complete, ready to plan Phase L-02
Next action: /paul:plan for Phase L-02
Resume file: .paul/ROADMAP.md
Resume context:
- L-01 Foundation complete: redirect, curriculum, spotlight bridge, teaching prompt, tour initiation
- L-02 is Live Walkthrough Pass 1: Jonathan clears localStorage and walks through fresh
- Known concerns to test: dual-render querySelector, 500ms setTimeout timing
