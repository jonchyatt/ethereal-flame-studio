---
phase: 19-widget-shell-react-rnd-foundation
plan: 02
subsystem: ui
tags: [zustand, state-management, widget, z-index, react-rnd]

# Dependency graph
requires:
  - phase: 19-widget-shell-react-rnd-foundation
    provides: "WidgetId, WidgetState, WIDGET_CONFIGS, WIDGET_Z_BASE, WIDGET_Z_MAX from src/types/widget.ts"
provides:
  - "useWidgetStore Zustand store for widget runtime state"
  - "selectWidget(id) individual widget selector for performance"
  - "selectOpenWidgetIds selector for WidgetLayer rendering"
  - "openWidget, closeWidget, toggleMinimize, bringToFront, updatePosition, updateSize actions"
  - "Z-index renormalization within z-[75]-z-[85] range"
affects: [19-03-WidgetLayer, 20-widget-content, 21-toolbar-persistence, 22-workspace-layouts]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-individual-selectors, z-index-renormalization, immutable-widget-state-updates]

key-files:
  created:
    - "src/lib/stores/widgetStore.ts"
  modified: []

key-decisions:
  - "Extracted renormalizeZIndices as standalone helper for cleaner bringToFront and openWidget code"
  - "bringToFront skips update when widget is already at front (performance optimization)"
  - "Cascading initial positions (50+i*30 per axis) prevent widget overlap on first open"

patterns-established:
  - "patchWidget helper for immutable single-widget updates within Record<WidgetId, WidgetState>"
  - "renormalizeZIndices pattern: sort open widgets by z, reassign from WIDGET_Z_BASE, focused gets top slot"
  - "selectWidget(id) curried selector pattern for per-widget subscription"

requirements-completed: [WIDG-01, WIDG-02, WIDG-03, WIDG-04, WIDG-07]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 19 Plan 02: Widget Store Summary

**Zustand widgetStore managing 9 widget states with z-index renormalization, individual selectors, and immutable updates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T15:14:26Z
- **Completed:** 2026-03-05T15:19:07Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Zustand store managing open/close, position, size, minimize, and z-index for all 9 widgets
- Z-index renormalization keeps widget layers within z-[75]-z-[85] range when ceiling is reached
- Individual selectors (selectWidget, selectOpenWidgetIds) prevent cross-widget re-renders
- Store is self-contained with no external store dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create widgetStore with full widget state management** - `4272816` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/lib/stores/widgetStore.ts` - Zustand store with 6 actions, 2 selectors, z-index renormalization logic, and cascading initial positions

## Decisions Made
- Extracted renormalizeZIndices as a standalone helper function rather than inline in each action -- cleaner and avoids duplication between openWidget and bringToFront
- bringToFront includes an early return when the widget is already at the front -- avoids unnecessary state updates and re-renders
- Cascading initial positions (x: 50+i*30, y: 50+i*30) prevent all widgets from stacking at the same coordinates when first opened

## Deviations from Plan

None - plan executed exactly as written. The store was committed as part of a combined 19-01+02 commit (4272816) that also included WidgetContainer.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- widgetStore is complete and ready for consumption by WidgetLayer (19-03)
- All 6 actions and 2 selectors are exported and typed
- No persistence middleware (deferred to Phase 21 per WIDG-06)

## Self-Check: PASSED

- [x] src/lib/stores/widgetStore.ts exists
- [x] Commit 4272816 exists in git history
- [x] tsc --noEmit passes (no source errors)
- [x] All grep checks pass (useWidgetStore, selectWidget, selectOpenWidgetIds, bringToFront, WIDGET_Z_BASE)

---
*Phase: 19-widget-shell-react-rnd-foundation*
*Completed: 2026-03-05*
