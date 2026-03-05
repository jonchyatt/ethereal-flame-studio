# Project State

## Current Position

Milestone: v4.4 Guided Onboarding — Academy-Driven
Phase: L-03 of 4 (Live Walkthrough Pass 2) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-05 — Phase L-02 complete (5/5 plans), transitioned to L-03

Progress:
- v4.4/L: [█████░░░░░] ~50% (2 of 4 phases complete)
- Phase L-03: [░░░░░░░░░░] 0% (not started)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [L-03 — ready to plan]
```

## Completed Phases (v4.4)

### Phase L-02: Live Walkthrough Pass 1 — COMPLETE (2026-03-05)

- L-02-01: SpotlightOverlay dual-render fix (querySelectorAll + visible-element filter), spotlight target ID fixes (21/21 verified), AcademyHub tab auto-selection
- L-02-03: 7 walkthrough bugs fixed (chat height, iOS audio, friendly error, green flash, lesson routing, curriculum routing, pointer-events scrim fix)
- L-02-05-01: Bills lesson stall fixed + 45s timeout + TutorialContinueButton floated to shell
- L-02-05-02: Chat closes on spotlight, rAF scroll, shared TTS audio singleton
- L-02-05-03: Conditional <main> pb (10rem when Continue button visible, 5rem otherwise)

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
- Voice pipeline absent from new shell (PushToTalk exists but not wired into ChatOverlay — deferred to L-03 or later)
- Old shell (/jarvis) now redirects to /jarvis/app — full removal deferred
- Intelligence Evolution concepts documented but not executed
- Vision input framework deferred to v4.5+

## Accumulated Context

### Decisions (L-01)
- Academy-as-onboarding: same curriculum framework for codebase teaching AND user onboarding
- SSE spotlight bridge: tool_use interception in ChatOverlay, no new API routes
- Same-origin vs cross-origin: spotlights only for Jarvis project
- shellMounted polling replaces 500ms blind timeout (L-02-03)

### Decisions (L-02)
- querySelectorAll + visible-element filter: handles dual-render layouts globally, not per-component
- Chat scrim pointer-events-none during spotlight: root cause of all tap-blocking during tutorials
- TutorialContinueButton at shell level: above BottomTabBar, chat can close independently
- Shared TTS audio singleton (activeTTSAudio): exported from SpotlightOverlay, both systems cancel each other
- Conditional <main> pb: 10rem when Continue button visible, 5rem otherwise (desktop md:pb-4 unchanged)

### Concerns (Carry into L-03)
- iOS audio unlock: needs live device verification on iPhone (pattern correct, edge case if audio fires before user gesture)
- Dual render performance: mobile+desktop rendered simultaneously — functional but redundant
- SpotlightOverlay click listener uses capture:true — if spotlighted button has own handler, both fire (acceptable)
- Voice touch-and-hold: PushToTalk component exists but NOT wired into ChatOverlay — deferred, own plan needed

### Git State
Last commit: 429e476
Branch: master
Feature branches merged: none

## Session Continuity

Last session: 2026-03-05
Stopped at: L-02 complete, transition executed, ready to plan L-03.
Next action: /paul:plan for Phase L-03 (Live Walkthrough Pass 2)
Resume file: jarvis/.paul/ROADMAP.md
Resume context:
- L-03 focus: Calendar → Meals → Morning Briefing → Chat Mastery walkthrough
- Verify all L-02 fixes hold on device
- Document new issues, fix in real-time
- Jenny demo checklist item 6 (voice) may land here or be deferred to L-04
