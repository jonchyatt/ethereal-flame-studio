# Project State

## Current Position

Milestone: v4.4 Guided Onboarding — Academy-Driven
Phase: L-02 of 4 (Live Walkthrough Pass 1) — In Progress
Plan: L-02-01 COMPLETE, ready for next plan
Status: L-02-01 applied and unified
Last activity: 2026-03-02 — L-02-01 Pre-Walkthrough Diagnostic Fixes applied (commit 7065ff9)

Progress:
- v4.4/L: [███░░░░░░░] ~25% (1 of 4 phases complete)
- Phase L-02: [███░░░░░░░] ~25% (1 plan complete, live walkthrough next)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [L-02-01 complete, ready for L-02-02]
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
- 500ms setTimeout timing: still untested — will surface during live walkthrough (L-02-02)

### Git State
Last commit: 7065ff9
Branch: master
Feature branches merged: none

## Session Continuity

Last session: 2026-03-02
Stopped at: L-02-01 loop complete, session paused
Next action: /paul:plan for L-02-02 (live walkthrough checkpoint — Jonathan walks through fresh)
Resume file: .paul/HANDOFF-2026-03-02.md
Resume context:
- L-02-01 COMPLETE: SpotlightOverlay hardened (querySelectorAll + visible-filter), ID mismatches fixed (2), AcademyHub tab wired
- Deployed to production (commit 7065ff9)
- Next is L-02-02: Jonathan clears localStorage, walks through onboarding fresh, we fix what breaks in real-time
- 500ms setTimeout timing still untested — will surface during live walkthrough
