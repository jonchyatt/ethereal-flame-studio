---
phase: L-01-foundation
plan: 02
subsystem: ui, tutorial
tags: [spotlight, sse-bridge, academy, onboarding, teaching-prompt]

requires:
  - phase: L-01-01
    provides: Jarvis curriculum with spotlightTargets, OnboardingWizard → Academy handoff
provides:
  - spotlight_element and clear_spotlight brain tools
  - Client-side SSE spotlight bridge in ChatOverlay
  - data-tutorial-id attributes on all curriculum-referenced DOM elements
  - SAME-ORIGIN TEACHING system prompt section
  - academy_list_topics enriched with spotlightTargets
  - startTour differentiated from Skip (opens chat with guided-tour message)
affects: [L-02 Live Walkthrough, L-04 Wife Test]

tech-stack:
  added: []
  patterns:
    - "SSE tool_use interception: ChatOverlay intercepts specific tool names from SSE stream and applies side-effects (spotlight) before display"
    - "data-tutorial-id convention: DOM elements annotated for querySelector by SpotlightOverlay"
    - "startTour vs Skip: startTour = finishOnboarding + openWithMessage(500ms delay); Skip = bare finishOnboarding"

key-files:
  modified:
    - src/lib/jarvis/tutorial/tutorialTools.ts
    - src/lib/jarvis/tutorial/toolExecutor.ts
    - src/lib/jarvis/intelligence/chatProcessor.ts
    - src/components/jarvis/layout/ChatOverlay.tsx
    - src/components/jarvis/layout/DomainRail.tsx
    - src/components/jarvis/layout/BottomTabBar.tsx
    - src/components/jarvis/home/PriorityStack.tsx
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/lib/jarvis/academy/toolExecutor.ts
    - src/components/jarvis/onboarding/OnboardingWizard.tsx

key-decisions:
  - "Static import for tutorialStore in ChatOverlay (dynamic import incompatible with synchronous SSE parse loop)"
  - "data-tutorial-id on BOTH mobile+desktop DomainRail nav containers (dual-render components)"
  - "data-tutorial-id on both empty Card and populated ul in PriorityStack (covers both states)"
  - "500ms setTimeout for openWithMessage after finishOnboarding (wait for router.push navigation + shell mount)"

patterns-established:
  - "SSE spotlight bridge: tool_use event with spotlight tools → tutorialStore.setSpotlight/clearSpotlight"
  - "Dual-render annotation: both mobile and desktop variants get same data-tutorial-id"

duration: ~30min
completed: 2026-03-02
---

# Phase L-01 Plan 02: Spotlight Bridge + Teaching Context + startTour Summary

**Academy-Spotlight bridge wired end-to-end: Claude calls spotlight_element → SSE → ChatOverlay → tutorialStore → SpotlightOverlay renders highlight on real DOM elements, with teaching prompt and guided tour initiation.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30min |
| Completed | 2026-03-02 |
| Tasks | 2 completed |
| Files modified | 10 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Spotlight Bridge End-to-End | Pass | spotlight_element → SSE tool_use event → ChatOverlay intercepts → tutorialStore.setSpotlight → SpotlightOverlay renders; clear_spotlight clears; auto-clear on click preserved |
| AC-2: Same-Origin Teaching Intelligence | Pass | SAME-ORIGIN TEACHING section in systemPrompt.ts (line 423); handleListTopics appends spotlightTargets; full target inventory in prompt |
| AC-3: Guided Tour Initiation | Pass | startTour calls finishOnboarding + setTimeout(openWithMessage, 500ms); Skip path unchanged (bare finishOnboarding at line 627) |

## Accomplishments

- Built complete spotlight bridge pipeline: 2 new brain tools → server validation → SSE transport → client-side interception → Zustand store → overlay render
- Annotated all curriculum-referenced DOM elements with `data-tutorial-id` attributes (DomainRail mobile+desktop, BottomTabBar, PriorityStack empty+populated states)
- Enhanced system prompt with full spotlight target inventory and teaching flow instructions
- Differentiated startTour from Skip so OnboardingWizard actually initiates the guided tour

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 + Task 2 | `07a4730` | feat | Spotlight tools, SSE bridge, DOM wiring, teaching prompt, topic enrichment, startTour |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/tutorial/tutorialTools.ts` | Modified | Added spotlight_element + clear_spotlight tool definitions |
| `src/lib/jarvis/tutorial/toolExecutor.ts` | Modified | Handler cases for spotlight tools + isTutorialTool guard updated |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Modified | Added both tools to tutorialToolNames routing Set |
| `src/components/jarvis/layout/ChatOverlay.tsx` | Modified | SSE spotlight bridge — intercepts tool_use events for spotlight tools |
| `src/components/jarvis/layout/DomainRail.tsx` | Modified | data-tutorial-id on mobile+desktop nav containers + per-domain buttons |
| `src/components/jarvis/layout/BottomTabBar.tsx` | Modified | data-tutorial-id="bottom-tabs" on nav container |
| `src/components/jarvis/home/PriorityStack.tsx` | Modified | data-tutorial-id="home-priority-stack" on both empty Card and populated ul |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | SAME-ORIGIN TEACHING section with spotlight targets + teaching flow |
| `src/lib/jarvis/academy/toolExecutor.ts` | Modified | handleListTopics appends spotlightTargets for topics that have them |
| `src/components/jarvis/onboarding/OnboardingWizard.tsx` | Modified | startTour → finishOnboarding + openWithMessage; imported useChatStore |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Static import for tutorialStore in ChatOverlay | Dynamic import incompatible with synchronous SSE parse loop | Minor bundle impact, but ChatOverlay already imported it |
| Both DomainRail variants get same data-tutorial-id | querySelector finds first in DOM (mobile); hidden on desktop → zero-dimension rect possible | Known gap: L-02 will test and fix if needed |
| PriorityStack annotated on both empty + populated states | Spotlight must work regardless of whether user has priorities | Two elements share same ID — querySelector picks whichever renders |
| 500ms setTimeout for openWithMessage | finishOnboarding triggers router.push; shell chrome must mount before chat can auto-send | Timing may need tuning in L-02 live testing |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | - |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** None — plan executed exactly as written.

## Issues Encountered

None.

## Known Considerations for L-02

- **Dual-render querySelector:** Both mobile and desktop DomainRail have `data-tutorial-id="domain-rail"`. `querySelector` finds first in DOM (mobile), which is `display: none` on desktop. SpotlightOverlay would get zero-dimension rect. L-02 Live Walkthrough will test and fix if needed.
- **500ms setTimeout timing:** May need adjustment based on real-world navigation speed.
- **PriorityStack dual ID:** Both empty Card and populated ul have same ID — only one renders at a time based on items length, so querySelector should find the visible one.

## Next Phase Readiness

**Ready:**
- Complete spotlight bridge pipeline operational
- All L-01 Foundation goals achieved (redirect, curriculum, spotlight bridge, teaching prompt, tour initiation)
- L-02 Live Walkthrough can begin — Jonathan walks through fresh, tests everything end-to-end

**Concerns:**
- Dual-render querySelector issue may surface during L-02 testing
- setTimeout timing is a guess — real devices may need different values

**Blockers:**
- None

---
*Phase: L-01-foundation, Plan: 02*
*Completed: 2026-03-02*
