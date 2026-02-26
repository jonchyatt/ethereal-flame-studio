---
phase: E-mobile-ui
plan: 04-06
subsystem: ui
tags: [react, tailwind, zustand, personal-domain, tasks, habits, bills, glassmorphism, micro-interactions]

requires:
  - phase: E-04-05
    provides: personalStore with types + mock data, EmptyState primitive, sub-route placeholders
  - phase: E-04-05.5
    provides: glass-interactive vocabulary, fadeInUp entrance animations, polish patterns
provides:
  - TasksList: Grouped task view with summary hero, custom checkbox, priority triage
  - HabitsList: Progress hero with animated bar, Toggle habits, streak flames
  - BillsList: Financial summary hero, status-grouped bills, Mark Paid interactions
  - Store mutations: toggleTask, toggleHabit, markBillPaid with todayStats recomputation
affects: [E-04-07, E-04-08, all-personal-sub-views]

tech-stack:
  added: []
  patterns:
    - "Section grouping with conditional rendering (only non-empty sections shown)"
    - "useMemo for group computation to prevent unnecessary re-renders"
    - "Internal sub-components (TaskRow, BillRow) for row encapsulation"
    - "Status-tinted section containers (red for overdue, amber for due_soon)"
    - "Spring-eased checkbox animation (scale 0→1 on Check icon)"
    - "formatCurrency/formatDate as component-local helpers"

key-files:
  created:
    - src/components/jarvis/personal/TasksList.tsx
    - src/components/jarvis/personal/HabitsList.tsx
    - src/components/jarvis/personal/BillsList.tsx
  modified:
    - src/lib/jarvis/stores/personalStore.ts
    - src/app/jarvis/app/personal/tasks/page.tsx
    - src/app/jarvis/app/personal/habits/page.tsx
    - src/app/jarvis/app/personal/bills/page.tsx

key-decisions:
  - "Custom checkbox via button + Check icon, not HTML checkbox — enables spring scaling"
  - "Sections computed via useMemo with conditional inclusion — empty groups auto-hide"
  - "SECTION_CONFIG object for bills — maps status to container/header styling declaratively"
  - "Priority dot (w-2 h-2 colored circle) instead of text label — cleaner at compact row size"
  - "Overdue/due_soon sections use raw divs with tinted bg; upcoming/paid use Card glass — matches plan spec"
  - "Wrap habits Card in animation div — Card primitive doesn't accept style prop"

patterns-established:
  - "TaskRow: checkbox + title/project + priority dot + date — compact row layout"
  - "BillRow: name/category + amount/date + Badge + optional Mark Paid button"
  - "Summary hero pill pattern: rounded-full bg-{color}/10 text-{color} border border-{color}/20"
  - "Progress bar pattern: h-2 bg-white/10 track, inner fill with spring-eased width transition"
  - "Status-tinted section: bg-{color}/5 border border-{color}/10 for overdue/warning sections"

duration: ~10min
completed: 2026-02-26
---

# Phase E Plan 04-06: Personal Sub-Views Wave 1 Summary

**Replaced 3 EmptyState placeholders with polished, data-driven sub-views — Tasks (priority triage), Habits (momentum tracker), Bills (financial awareness) — with summary heroes, grouped sections, micro-interactions, and consistent glassmorphism.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10min |
| Completed | 2026-02-26 |
| Tasks | 3 completed |
| Files created | 3 |
| Files modified | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tasks Grouped & Interactive | Pass | Hero with stat pills, 4 section groups (overdue/today/upcoming/completed), custom checkbox with spring animation, priority dots, overdue red tint |
| AC-2: Habits Progress & Streaks | Pass | "2 of 4" hero with spring-eased progress bar, Toggle per habit, amber Flame streaks, green "All done today" state |
| AC-3: Bills Financial Summary & Groups | Pass | Total Due / Paid hero, 4 status groups with tinted containers, Badge per bill, Mark Paid ghost button |
| AC-4: Store Mutations Recompute | Pass | toggleTask/toggleHabit/markBillPaid all recompute todayStats, TodaySnapshot reflects changes on navigate back |
| AC-5: Micro-Interactions | Pass | Checkbox spring scale, progress bar spring width, strikethrough fade, no layout shift, pure CSS |
| AC-6: Build Compiles Clean | Pass | tsc --noEmit: 0 new errors (pre-existing audio-prep only) |
| AC-7: Polish Consistency | Pass | All containers use glass variant, staggered fadeInUp on all sections, spring easing on transforms |

## Accomplishments

- Built TasksList with summary hero (overdue/today/upcoming pills), 4 grouped sections with conditional rendering, custom spring-animated checkbox, priority dots, and completed-section muting
- Built HabitsList with progress hero featuring spring-eased animated bar (violet → green), Toggle-driven habits, amber Flame streak counters, and "All done today" completion state
- Built BillsList with financial summary hero (Total Due / Paid amounts), 4 status-grouped sections with color-tinted containers, Badge status indicators, and Mark Paid interaction
- Extended personalStore with 3 mutation actions (toggleTask, toggleHabit, markBillPaid) that all recompute todayStats for dashboard consistency
- Every component follows the E-04-05.5 polish vocabulary: glass Cards, fadeInUp entrance animations, spring easing, no flat surfaces

## Files Created/Modified

| File | Change | Lines | Purpose |
|------|--------|-------|---------|
| `personal/TasksList.tsx` | Created | 152 | Grouped task view with hero, sections, checkbox interactions |
| `personal/HabitsList.tsx` | Created | 89 | Progress hero + toggle habits with streak display |
| `personal/BillsList.tsx` | Created | 157 | Financial summary + status-grouped bills with Mark Paid |
| `stores/personalStore.ts` | Modified | +28 | toggleTask, toggleHabit, markBillPaid mutations |
| `personal/tasks/page.tsx` | Replaced | 17 | TasksList integration replacing EmptyState |
| `personal/habits/page.tsx` | Replaced | 17 | HabitsList integration replacing EmptyState |
| `personal/bills/page.tsx` | Replaced | 17 | BillsList integration replacing EmptyState |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Custom checkbox via button + Check icon | HTML checkboxes can't spring-scale; button wrapping enables CSS transform transitions | Matches ChatOverlay animation quality bar |
| useMemo for all group computations | Prevents O(n) filtering on every render from Toggle/checkbox interactions | Performance stays smooth with rapid toggling |
| SECTION_CONFIG as declarative mapping | Bills has 4 section types with different containers — config object avoids nested ternaries | Clean, extensible pattern for future status types |
| Wrap habits Card in animation div | Card primitive correctly doesn't expose style prop; wrapper div handles animation delay | Zero primitive modifications per plan boundaries |
| Priority dot instead of text label | At compact row size, a 2px colored circle communicates priority faster than "High"/"Low" text | Visual density matches premium aesthetic |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Card style prop workaround via wrapper div |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One pattern adjustment — Card doesn't accept `style` prop, so habits Card wrapped in animation div. No functional difference.

## Issues Encountered

None — all three tasks executed cleanly.

## Next Phase Readiness

**Ready:**
- TasksList/HabitsList/BillsList patterns established for Wave 2 views (Calendar/Journal/Goals/Health)
- Store mutation pattern (map + recompute todayStats) reusable for remaining sub-programs
- Row patterns (TaskRow, BillRow) provide templates for similar list views
- All E-04-05.5 polish patterns carried forward successfully

**Concerns:**
- Pre-existing build failure (audio-prep modules) continues — unrelated to Jarvis
- personalStore uses hardcoded date '2026-02-26' — acceptable for mock data phase

**Blockers:**
- None

---
*Phase: E-mobile-ui, Plan: 04-06*
*Completed: 2026-02-26*
