---
phase: E-mobile-ui
plan: 05-01
subsystem: ui
tags: [tutorial, spotlight, curriculum, data-attributes, zustand]

requires:
  - phase: E-04-08
    provides: tutorialStore, SpotlightOverlay, OnboardingWizard
provides:
  - TutorialLesson + TutorialStep type system for interactive UI tutorials
  - 4 Tier 1 lesson definitions (21 steps) with verification specs, mistake hints, spotlight targets
  - data-tutorial-id DOM hooks on 20+ critical UI elements across 8 components
affects: [E-05-02 execution engine, E-05-03 Academy Hub]

tech-stack:
  added: []
  patterns: [tutorial data layer, data-tutorial-id DOM hooks, first-element tagging pattern]

key-files:
  created:
    - src/lib/jarvis/curriculum/tutorialLessons.ts
  modified:
    - src/components/jarvis/home/DomainHealthGrid.tsx
    - src/components/jarvis/personal/SubProgramCard.tsx
    - src/components/jarvis/personal/PersonalDashboard.tsx
    - src/components/jarvis/personal/TasksList.tsx
    - src/components/jarvis/personal/HabitsList.tsx
    - src/components/jarvis/personal/BillsList.tsx
    - src/components/jarvis/layout/BottomTabBar.tsx
    - src/components/jarvis/layout/Header.tsx
    - src/components/jarvis/layout/ChatOverlay.tsx
    - src/components/jarvis/primitives/Card.tsx
    - src/components/jarvis/primitives/Toggle.tsx

key-decisions:
  - "Card and Toggle primitives extended with data-tutorial-id prop (minimal, non-breaking)"
  - "SubProgramCard gets subProgramId prop; PersonalDashboard passes it from existing sp.id"
  - "IIFE pattern for first-element tagging (firstCheckboxTagged, firstToggleTagged, firstMarkPaidTagged)"
  - "Two curriculum systems coexist: Notion narrated lessons (existing) + interactive UI tutorials (new)"

patterns-established:
  - "First-element tagging: IIFE with boolean flag to tag only the first incomplete item's interactive element"
  - "data-tutorial-id on outermost interactive/tappable element for SpotlightOverlay discovery"
  - "Dynamic tutorial IDs via template literals: home-domain-card-${id}, bottom-tab-${id}, personal-subprogram-${id}"

duration: ~15min
completed: 2026-02-26
---

# Phase E Plan 05-01: Tutorial Data Layer + Spotlight Wiring Summary

**Type system and 4 Tier 1 interactive lesson definitions with 21 steps, plus 20+ data-tutorial-id DOM hooks across 8 component files — pure foundation for E-05-02 execution engine.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Completed | 2026-02-26 |
| Tasks | 2 completed |
| Files created | 1 |
| Files modified | 10 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Interactive Lesson Type System | Pass | TutorialLesson, TutorialStep, MistakeHint types exported; getLesson(), getTier1Lessons(), TUTORIAL_TIERS exported |
| AC-2: Tier 1 Lesson Definitions Complete and Rich | Pass | 4 lessons (6+5+6+4=21 steps), all with instruction/instructionAdvanced/verification/mistakeHints, 85.7% have spotlight, warm tone, celebratory completionMessages |
| AC-3: data-tutorial-id Attributes on Tier 1 Critical Elements | Pass | 20+ placements across 8 components; all 13 Tier 1 spotlight elementIds matched to DOM hooks |
| AC-4: Build Compiles Clean | Pass | Zero new TypeScript errors (pre-existing audio-prep errors unchanged) |

## Accomplishments

- Created complete interactive tutorial curriculum data layer separate from existing Notion narrated lessons
- All 4 Tier 1 lessons crafted with warm, mentor-like tone — beginner (click-by-click) and advanced (goal-based) instructions per step
- Every lesson step has verification spec (route/store/action), mistake hints with friendly corrections, and optional teaching points
- 20+ data-tutorial-id attributes wired across navigation, home, personal, tasks, habits, bills, and chat — SpotlightOverlay can now find every Tier 1 target

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/curriculum/tutorialLessons.ts` | Created | Types (MistakeHint, TutorialStep, TutorialLesson) + 4 Tier 1 lessons + TUTORIAL_TIERS metadata + helper functions |
| `src/components/jarvis/home/DomainHealthGrid.tsx` | Modified | Dynamic `home-domain-card-${domain.id}` on each domain card wrapper |
| `src/components/jarvis/personal/SubProgramCard.tsx` | Modified | New `subProgramId` prop → `personal-subprogram-${id}` on Link element |
| `src/components/jarvis/personal/PersonalDashboard.tsx` | Modified | Passes `subProgramId={sp.id}` to each SubProgramCard |
| `src/components/jarvis/personal/TasksList.tsx` | Modified | `tasks-summary` on hero card; `tasks-first-checkbox` on first incomplete task via IIFE flag |
| `src/components/jarvis/personal/HabitsList.tsx` | Modified | `habits-progress` on hero card; `habits-first-toggle` on first incomplete habit via IIFE flag |
| `src/components/jarvis/personal/BillsList.tsx` | Modified | `bills-summary` on hero card; `bills-first-mark-paid` on first unpaid bill via IIFE flag |
| `src/components/jarvis/layout/BottomTabBar.tsx` | Modified | Dynamic `bottom-tab-${tab.id}` on each tab button (home, chat, add, alerts, settings) |
| `src/components/jarvis/layout/Header.tsx` | Modified | `header-search`, `header-notifications`, `header-settings` on action buttons |
| `src/components/jarvis/layout/ChatOverlay.tsx` | Modified | `chat-input` on Input, `chat-send` on send Button |
| `src/components/jarvis/primitives/Card.tsx` | Modified | Added `data-tutorial-id` prop support (minimal extension) |
| `src/components/jarvis/primitives/Toggle.tsx` | Modified | Added `data-tutorial-id` prop support (minimal extension) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Extend Card/Toggle props instead of using wrapper divs | Cleaner DOM, data attribute lands on the actual interactive element SpotlightOverlay targets | Minimal primitive change, non-breaking |
| SubProgramCard subProgramId prop vs route-derived ID | Explicit prop is cleaner than parsing route strings | PersonalDashboard passes sp.id directly |
| IIFE flag pattern for first-element tagging | Prevents spotlight from targeting a specific mock data item that might not exist; targets whatever renders first | Established pattern for future Tier 2-4 lessons |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 2 | Essential — primitives needed data-tutorial-id support |

**Total impact:** Essential fixes, no scope creep.

### Additional Files Modified (Not in Plan)

1. **Card.tsx and Toggle.tsx primitive extensions**
   - **Found during:** Task 2 (data-tutorial-id wiring)
   - **Issue:** Card and Toggle had closed prop interfaces; data attributes wouldn't pass through
   - **Fix:** Added `'data-tutorial-id'?: string` prop to both, destructured and forwarded to DOM element
   - **Verification:** TypeScript compiles clean, attribute renders on correct elements

2. **PersonalDashboard.tsx passes subProgramId**
   - **Found during:** Task 2 (SubProgramCard needs an ID)
   - **Issue:** SubProgramCard had no way to receive the sub-program ID for dynamic tutorial IDs
   - **Fix:** Added `subProgramId` prop to SubProgramCard, PersonalDashboard passes `sp.id`
   - **Verification:** 7 sub-program cards all render correct `personal-subprogram-{id}` attributes

## Issues Encountered

None

## Next Phase Readiness

**Ready:**
- tutorialLessons.ts provides complete curriculum data for E-05-02 execution engine
- Every spotlight target has a matching DOM hook — SpotlightOverlay can highlight any Tier 1 element
- Verification specs (route/store/action checks) ready for engine to evaluate
- Mistake hints ready for ChatOverlay to display as friendly corrections

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: E-mobile-ui, Plan: 05-01*
*Completed: 2026-02-26*
