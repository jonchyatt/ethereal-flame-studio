# Project State

## Current Position

Milestone: v4.4 Guided Onboarding — Academy-Driven
Phase: L-02 of 4 (Live Walkthrough Pass 1) — In Progress
Plan: L-02-05-01 CREATED (tutorial curriculum fix), L-02-05-02 CREATED (chat/TTS bugs)
Status: PLAN created, ready for APPLY
Last activity: 2026-03-05 — Calendar confirmed working (7 events, "Jarvis test" picked up). L-02-05 plans written.

Progress:
- v4.4/L: [███░░░░░░░] ~30% (1 of 4 phases complete)
- Phase L-02: [██████░░░░] ~60% (bugs documented, fix plan ready)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [L-02-05-01 plan created, awaiting apply]
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

Last session: 2026-03-05 (fifth pause — context limit)
Stopped at: L-02-05-01 and L-02-05-02 plans written, ready to execute
Next action: /paul:apply jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-05-01-PLAN.md
Resume file: jarvis/.paul/HANDOFF-2026-03-05.md
Resume context:
- Calendar CONFIRMED WORKING — 7 events found, "Jarvis test" for tomorrow picked up ✓
- Root cause of tutorial stall found: bills-4-mark-paid verification impossible with static bills
- L-02-05-01-PLAN.md: fix bills lesson + 45s timeout + floating Continue chip
- L-02-05-02-PLAN.md: close chat on spotlight + scroll fix + shared TTS audio manager
- L-02-05-03 NOT yet written: safe-area + voice touch-and-talk (write before or after executing 01+02)
