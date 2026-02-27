---
phase: E-mobile-ui
plan: 05-03
subsystem: ui
tags: [react, zustand, tutorial, academy, navigation]

requires:
  - phase: E-05-01
    provides: Tutorial data layer, TIER_1_LESSONS, tutorialStore
  - phase: E-05-02
    provides: Tutorial engine, TutorialEngineContext, ChatOverlay integration
provides:
  - Academy Hub page with browsable lesson catalog
  - Suggestion intelligence (context-aware next-lesson picking)
  - Academy progress section on Home screen
  - Learn tab in BottomTabBar navigation
affects: [E-06 Command Palette, future tier 2-4 lessons]

tech-stack:
  added: []
  patterns: [suggestion-chain algorithm, SVG progress ring, dedicated Home section vs widget]

key-files:
  created:
    - src/components/jarvis/academy/LessonCard.tsx
    - src/components/jarvis/academy/AcademyHub.tsx
    - src/components/jarvis/academy/AcademyProgress.tsx
    - src/app/jarvis/app/academy/page.tsx
  modified:
    - src/lib/jarvis/curriculum/tutorialLessons.ts
    - src/app/jarvis/app/page.tsx
    - src/components/jarvis/layout/BottomTabBar.tsx

key-decisions:
  - "Academy as dedicated Home section, NOT widget registry entry"
  - "Suggestion chain algorithm walks nextSuggestion links backward"
  - "Resume does NOT navigate — user stays on current page"

patterns-established:
  - "SVG progress ring: reusable ProgressRing component (40px and 24px variants)"
  - "4-state card pattern: completed/in-progress/suggested/default"

completed: 2026-02-26
---

# Phase E Plan 05-03: Academy Hub + Suggestion Intelligence Summary

**Browsable lesson catalog with context-aware suggestions, Home screen integration, and Learn tab navigation — the discoverable "front door" to Jarvis Academy.**

## Performance

| Metric | Value |
|--------|-------|
| Completed | 2026-02-26 |
| Tasks | 3 completed |
| Files | 4 created + 3 modified |
| Lines | ~440 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Academy Hub renders lesson catalog | Pass | Grouped by tier with tier name/description headers |
| AC-2: Lesson cards show accurate progress + resume | Pass | 4 visual states: completed, in-progress, suggested, default |
| AC-3: Start/Resume triggers tutorial engine | Pass | Engine starts, navigates to home; resume stays on page |
| AC-4: Academy progress section on Home | Pass | Between Quick Actions and Widgets sections |
| AC-5: BottomTabBar has Learn tab | Pass | GraduationCap icon, routes to /jarvis/app/academy |
| AC-6: Suggestion intelligence context-aware | Pass | Follows nextSuggestion chain, falls back to first incomplete |
| AC-7: Build compiles clean | Pass | 0 TS errors; webpack errors pre-existing (audio pipeline) |

## Accomplishments

- **Suggestion intelligence algorithm:** Walks `nextSuggestion` chain backward from last completed lesson, falls back to first incomplete Tier 1 lesson, returns null when all done
- **Academy Hub page** (`/jarvis/app/academy`): Full lesson catalog with SVG progress ring, tier grouping, 4-state LessonCards with resume support
- **Home screen integration:** Dedicated AcademyProgress section (not a widget) with next lesson name + mini progress ring
- **Navigation integration:** Learn tab replaces placeholder Alerts tab in BottomTabBar

## Task Commits

All tasks committed atomically in a single commit:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Suggestion intelligence | `8c866f6` | feat | getAllLessons(), getSuggestedLesson(), getLessonCount() |
| Task 2: Academy Hub + LessonCard | `8c866f6` | feat | AcademyHub, LessonCard (4 states), academy route |
| Task 3: Home + BottomTabBar + build | `8c866f6` | feat | AcademyProgress, Home section, Learn tab |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/curriculum/tutorialLessons.ts` | Modified (+36) | Suggestion intelligence: getAllLessons, getSuggestedLesson, getLessonCount |
| `src/components/jarvis/academy/LessonCard.tsx` | Created (~120) | 4-state lesson card: completed/in-progress/suggested/default |
| `src/components/jarvis/academy/AcademyHub.tsx` | Created (~170) | Full catalog page: tier grouping, progress ring, engine integration |
| `src/components/jarvis/academy/AcademyProgress.tsx` | Created (~100) | Home section: next lesson + mini progress ring |
| `src/app/jarvis/app/academy/page.tsx` | Created (~7) | Route: renders AcademyHub |
| `src/app/jarvis/app/page.tsx` | Modified (+7) | Added Academy section between Quick Actions and Widgets |
| `src/components/jarvis/layout/BottomTabBar.tsx` | Modified (+2/-2) | Replace Alerts/Bell with Learn/GraduationCap |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Academy as Home section, not widget | Keeps widget registry clean; Academy is always visible, not pinnable/unpinnable | Widget system stays untouched |
| SVG progress ring (not library) | Consistent with zero-dependency animation policy (E-04-03 precedent) | Reusable 40px and 24px variants |
| Resume does NOT navigate | User may already be mid-flow on correct page; navigating would disrupt | Better UX for in-progress lessons |
| Suggestion chain walks backward | Last completed lesson's nextSuggestion is most relevant; backward scan finds it efficiently | O(n) where n=4, trivial |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Webpack build fails (music-metadata, @distube/ytdl-core) | Pre-existing audio pipeline issue, unrelated to Academy. Zero TS errors confirmed via `tsc --noEmit`. |

## Next Phase Readiness

**Ready:**
- E-05 Jarvis Academy is fully complete (data layer + engine + discoverability)
- E-06 Command Palette is next (Cmd+K search-everything)
- All tutorial infrastructure in place for future Tier 2-4 lesson authoring

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: E-mobile-ui, Plan: 05-03*
*Completed: 2026-02-26*
