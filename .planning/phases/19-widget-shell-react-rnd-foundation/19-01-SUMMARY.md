---
phase: 19-widget-shell-react-rnd-foundation
plan: 01
subsystem: ui
tags: [react-rnd, drag, resize, widget, floating-panel, typescript]

# Dependency graph
requires: []
provides:
  - "WidgetContainer component (draggable, resizable floating panel shell)"
  - "Widget type system (WidgetId, WidgetConfig, WidgetState, WIDGET_CONFIGS)"
  - "Z-index constants (WIDGET_Z_BASE=75, WIDGET_Z_MAX=85)"
  - "react-rnd dependency installed"
affects: [19-02-widget-store-zustand, 19-03-widget-layer-toolbar]

# Tech tracking
tech-stack:
  added: [react-rnd@10.5.2]
  patterns: [props-driven widget shell, title-bar-only drag handle, cancel on content area]

key-files:
  created:
    - src/types/widget.ts
  modified:
    - src/components/ui/WidgetContainer.tsx
    - package.json

key-decisions:
  - "Used lucide-react icons (Minus, Maximize2, X) for widget buttons instead of inline SVGs -- consistent with project icon library"
  - "Content area uses cancel='.widget-content' to prevent drag from interfering with sliders and inputs"
  - "Widget title bar is 40px fixed height (WIDGET_TITLE_BAR_HEIGHT constant shared across system)"

patterns-established:
  - "WidgetContainer is pure props-driven (no store imports) -- parent manages all state"
  - "widget-drag-handle CSS class marks the drag target; widget-content CSS class marks the cancel zone"
  - "WIDGET_CONFIGS registry pattern: static config keyed by WidgetId, runtime state separate"

requirements-completed: [WIDG-01, WIDG-02, WIDG-03, WIDG-04, WIDG-07]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 19 Plan 01: Widget Shell + react-rnd Foundation Summary

**react-rnd WidgetContainer shell with drag/resize/minimize/close, 9-widget type system, and z-index stacking constants**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T15:14:05Z
- **Completed:** 2026-03-05T15:19:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed react-rnd (10.5.2) as project dependency for drag+resize+touch+bounds
- Created complete widget type system with 9 WidgetIds, WidgetConfig, WidgetState interfaces, and WIDGET_CONFIGS registry
- Built WidgetContainer component: draggable (title bar only), resizable (react-rnd handles), minimizable (collapses to 40px), closeable, focusable (z-order), viewport-bounded

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-rnd and define widget types** - `4221898` (feat)
2. **Task 2: Create WidgetContainer component** - `909adb3` (feat)

## Files Created/Modified
- `package.json` - Added react-rnd@^10.5.2 dependency
- `src/types/widget.ts` - WidgetId (9 IDs), WidgetConfig, WidgetState, WIDGET_CONFIGS registry, z-index constants
- `src/components/ui/WidgetContainer.tsx` - Reusable floating panel shell wrapping react-rnd Rnd component

## Decisions Made
- Used lucide-react icons (Minus, Maximize2, X) for title bar buttons instead of inline SVGs -- consistent with project-wide icon library already in deps
- cancel=".widget-content" prevents drag initiation from content area, protecting sliders and input interactions
- Widget title bar fixed at 40px (WIDGET_TITLE_BAR_HEIGHT) -- shared constant for minimize collapse height
- Descriptive aria-labels include widget title (e.g., "Minimize Audio Dynamics") for accessibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced inline SVGs with lucide-react icons**
- **Found during:** Task 2 (WidgetContainer creation)
- **Issue:** Pre-existing file used hand-coded inline SVGs for minimize/close buttons, inconsistent with project icon system (lucide-react already in deps)
- **Fix:** Replaced inline SVGs with Minus, Maximize2, and X from lucide-react
- **Files modified:** src/components/ui/WidgetContainer.tsx
- **Verification:** TypeScript compiles cleanly, icons import correctly
- **Committed in:** 909adb3 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added type="button" and descriptive aria-labels**
- **Found during:** Task 2 (WidgetContainer creation)
- **Issue:** Buttons lacked type="button" (could accidentally submit forms) and had generic aria-labels ("Close widget" instead of "Close Audio Dynamics")
- **Fix:** Added type="button" to both buttons, made aria-labels include widget title
- **Files modified:** src/components/ui/WidgetContainer.tsx
- **Verification:** Buttons are explicit type, labels are descriptive
- **Committed in:** 909adb3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Minor improvements to icon consistency and accessibility. No scope creep.

## Issues Encountered
- Pre-existing TS6053 errors from missing `.next/types` cache files (Next.js build artifact not present locally) -- these are not related to this plan's changes and do not affect compilation of project source files

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WidgetContainer is ready to be wrapped by the widget store (19-02) for state management
- WIDGET_CONFIGS registry provides default sizes for all 9 widgets, ready for WidgetLayer toolbar integration (19-03)
- No blockers identified

## Self-Check: PASSED

- [x] src/types/widget.ts exists
- [x] src/components/ui/WidgetContainer.tsx exists
- [x] 19-01-SUMMARY.md exists
- [x] Commit 4221898 exists
- [x] Commit 909adb3 exists

---
*Phase: 19-widget-shell-react-rnd-foundation*
*Completed: 2026-03-05*
