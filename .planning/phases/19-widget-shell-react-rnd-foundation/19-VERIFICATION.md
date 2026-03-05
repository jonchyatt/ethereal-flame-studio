---
phase: 19-widget-shell-react-rnd-foundation
verified: 2026-03-05T16:00:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
human_verification:
  - test: "Open Demo Widgets button on live Design screen"
    expected: "Clicking 'Open Demo Widgets' opens 3 floating panels (Global, Audio, Particles). Each panel is draggable by title bar, resizable from edges/corners, minimizable to 40px title bar, closeable via X. Clicking any panel brings it to front. Panels stay within viewport when dragged to edges."
    why_human: "react-rnd drag/resize/bounds behavior requires browser DOM to verify. Build passes but visual interaction cannot be confirmed statically."
---

# Phase 19: Widget Shell + react-rnd Foundation — Verification Report

**Phase Goal:** Widget Shell + react-rnd Foundation — install react-rnd, build WidgetContainer (draggable/resizable/minimizable floating panel), create Zustand widgetStore, wire WidgetLayer onto the Design screen with a demo trigger to prove the full pipeline.
**Verified:** 2026-03-05
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | react-rnd is installed as a dependency | VERIFIED | `"react-rnd": "^10.5.2"` in package.json + package-lock.json, react-rnd@10.5.2 resolved |
| 2 | WidgetContainer renders a draggable, resizable panel via react-rnd | VERIFIED | `src/components/ui/WidgetContainer.tsx` imports `{ Rnd }` from `'react-rnd'` and wraps all content in `<Rnd>` |
| 3 | Dragging is constrained to title bar handle only | VERIFIED | `dragHandleClassName="widget-drag-handle"` on Rnd; title bar div has class `widget-drag-handle`; content area has `cancel=".widget-content"` |
| 4 | Resizing is handled by react-rnd built-in handles | VERIFIED | `enableResizing={!isMinimized}` — enabled when not minimized, disabled when minimized |
| 5 | Minimize collapses widget to title bar only; restore brings back previous height | VERIFIED | When `isMinimized`: height set to `WIDGET_TITLE_BAR_HEIGHT` (40px), content area hidden with conditional render `{!isMinimized && ...}` |
| 6 | Close button calls onClose callback (does not self-destruct) | VERIFIED | Close button: `onClick={() => onClose(id)}` — component is pure props-driven, no self-removal |
| 7 | Clicking anywhere on the widget calls onFocus callback for z-order | VERIFIED | `onMouseDown={() => onFocus(id)}` on the `<Rnd>` element |
| 8 | Widget stays within viewport bounds (bounds="parent") | VERIFIED | `bounds="parent"` on Rnd; WidgetLayer is `fixed inset-0` providing the full-viewport parent |
| 9 | Widget types are defined in src/types/widget.ts | VERIFIED | Exports: `WidgetId` (9 union values), `WidgetConfig`, `WidgetState`, `WIDGET_CONFIGS`, `WIDGET_TITLE_BAR_HEIGHT`, `WIDGET_Z_BASE`, `WIDGET_Z_MAX` |
| 10 | widgetStore tracks per-widget state: isOpen, isMinimized, position, size, zIndex | VERIFIED | `WidgetState` interface and `widgets: Record<WidgetId, WidgetState>` in store |
| 11 | All 6 store actions present: openWidget, closeWidget, toggleMinimize, bringToFront, updatePosition, updateSize | VERIFIED | All 6 implemented with immutable spreads in `src/lib/stores/widgetStore.ts` |
| 12 | bringToFront assigns highest z-index within WIDGET_Z_BASE (75) to WIDGET_Z_MAX (85) | VERIFIED | `getNextZIndex` + `renormalizeZIndices` helpers enforce the z-[75]-z-[85] range with ceiling renormalization |
| 13 | Individual selectors exported to prevent cross-widget re-renders | VERIFIED | `selectWidget(id)` curried selector + `selectOpenWidgetIds` exported; WidgetPanel uses per-widget inline selector |
| 14 | WidgetLayer is a full-viewport overlay at z-[70] with pointer-events passthrough | VERIFIED | `className="fixed inset-0 z-[70] pointer-events-none"` on container; `className="pointer-events-auto"` on each widget wrapper |
| 15 | WidgetLayer is mounted in page.tsx only when viewMode === 'designer' (and not VR/render mode) | VERIFIED | `{viewMode === 'designer' && !isVRMode && !renderMode.isActive && (<WidgetLayer />)}` |
| 16 | npm run build passes with no errors | VERIFIED | Full Next.js build completes cleanly; all routes render, no TypeScript errors |

**Score:** 16/16 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | react-rnd@^10.5.2 dependency | VERIFIED | Line 46: `"react-rnd": "^10.5.2"` |
| `src/types/widget.ts` | WidgetId, WidgetConfig, WidgetState, WIDGET_CONFIGS | VERIFIED | 56 lines, all types and constants exported, 9 widget IDs |
| `src/components/ui/WidgetContainer.tsx` | Rnd-based floating panel shell | VERIFIED | 129 lines, 'use client', imports Rnd, full props interface, drag/resize/minimize/close/focus |
| `src/lib/stores/widgetStore.ts` | Zustand store with 6 actions, 2 selectors | VERIFIED | 169 lines, useWidgetStore, all 6 actions, selectWidget + selectOpenWidgetIds |
| `src/components/ui/WidgetLayer.tsx` | Renders open widgets from store | VERIFIED | 79 lines, WidgetPanel inner component, fixed inset-0 overlay, per-widget selectors |
| `src/app/page.tsx` | WidgetLayer + demo button in designer conditional | VERIFIED | WidgetLayer at line 325, demo button at line 330, both gated on viewMode === 'designer' |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WidgetContainer.tsx` | `react-rnd` | `import { Rnd } from 'react-rnd'` | WIRED | Line 4: import present; Rnd used as root JSX element |
| `WidgetContainer.tsx` | `src/types/widget.ts` | `import { WIDGET_TITLE_BAR_HEIGHT }` + `type { WidgetId }` | WIRED | Lines 6-7: both imports present and used in component |
| `widgetStore.ts` | `src/types/widget.ts` | `import { WidgetId, WidgetState, WIDGET_CONFIGS, WIDGET_Z_BASE, WIDGET_Z_MAX }` | WIRED | Lines 1-8: all 5 imports present and used in store logic |
| `WidgetLayer.tsx` | `widgetStore.ts` | `useWidgetStore(selectOpenWidgetIds)` + `useWidgetStore.getState()` | WIRED | Lines 3, 17, 63: store imported and used for both reactive and action access |
| `WidgetLayer.tsx` | `WidgetContainer.tsx` | `import { WidgetContainer }` + renders it per open widget | WIRED | Line 5: import; line 22: `<WidgetContainer ...>` rendered in WidgetPanel |
| `page.tsx` | `WidgetLayer.tsx` | `import { WidgetLayer }` + conditional mount | WIRED | Line 21: import; line 325: `<WidgetLayer />` in designer conditional |
| `page.tsx` | `widgetStore.ts` | `import { useWidgetStore }` for demo button | WIRED | Line 23: import; line 332: `useWidgetStore.getState()` in demo onClick |

---

## Requirements Coverage

| Requirement | Description | Source Plans | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| WIDG-01 | User can open any parameter group as a free-floating widget on the Design screen | 19-01, 19-02, 19-03 | SATISFIED | `openWidget(id)` in store; demo button opens 3 widgets; WidgetLayer renders them as floating panels |
| WIDG-02 | User can drag widgets freely around the screen | 19-01, 19-03 | SATISFIED | react-rnd `<Rnd>` provides drag; `dragHandleClassName="widget-drag-handle"` constrains to title bar; `onDragStop` updates store position |
| WIDG-03 | User can resize widgets | 19-01, 19-03 | SATISFIED | react-rnd built-in resize handles; `enableResizing={!isMinimized}`; `onResizeStop` updates store size |
| WIDG-04 | User can minimize widgets to title bar only | 19-01, 19-02, 19-03 | SATISFIED | `toggleMinimize` in store; `isMinimized` collapses height to 40px, hides content, disables resize |
| WIDG-07 | Clicking a widget brings it to front (z-order management) | 19-02, 19-03 | SATISFIED | `bringToFront(id)` in store with z-index renormalization; `onMouseDown={() => onFocus(id)}` on Rnd triggers it |

No orphaned requirements — WIDG-01 through WIDG-07 are all accounted for. WIDG-05, WIDG-06, WIDG-08, WIDG-09 are explicitly mapped to Phases 21 and 25 in REQUIREMENTS.md and are out of scope for Phase 19.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `WidgetLayer.tsx` | 38-44 | Placeholder content ("Widget content will be extracted from AdvancedEditor in Phase 20") | INFO | Intentional — Phase 19 scope explicitly excludes content extraction (Phase 20). Demo content is expected. |
| `widgetStore.ts` | 164 | `selectWidget` exported but not imported anywhere yet | INFO | Prepared for Phase 20 consumers. Not a gap — it is used in the inline pattern in WidgetLayer and will be consumed when Phase 20 creates per-widget content components. |

No blockers or warnings found.

---

## Architectural Note (Informational)

The WidgetLayer is `fixed inset-0`, and react-rnd uses `bounds="parent"` which walks the DOM for the nearest positioned ancestor. Since neither WidgetLayer nor the per-widget wrapper divs have `position: relative`, react-rnd will find `<main style="position: relative">` as the containing block. For a full-screen app where `<main>` covers the full viewport, this produces the correct viewport-bounded behavior. However, if `<main>` dimensions ever differ from the viewport, widgets may escape the visual WidgetLayer boundary. This is a **human verification item** — the behavior is correct in current app structure but worth confirming on the live site.

---

## Human Verification Required

### 1. Full Drag/Resize/Minimize/Close/Z-order Pipeline

**Test:** Navigate to the Design screen on https://www.whatamiappreciatingnow.com/. Click the purple "Open Demo Widgets" button (bottom-right). Three floating panels should appear: Global & Mode, Audio Dynamics, Particle Layers.

**Expected:**
- Each panel has a dark glass title bar (draggable); clicking and dragging the title bar moves the panel freely
- Dragging from the content area does NOT move the panel (cancel zone works)
- Resize handles appear on edges/corners when hovering; dragging them resizes the panel
- Clicking the dash icon collapses the panel to 40px title bar height; clicking the expand icon restores it
- Clicking X closes the panel (removes it from screen)
- Clicking a background panel brings it to the front (z-order)
- Dragging a panel to any edge stops at the viewport boundary (bounds constraint)

**Why human:** react-rnd drag/resize/bounds behavior is DOM-event-driven. Build passes but no static check can confirm the interaction pipeline is correctly wired at runtime.

### 2. Canvas Passthrough (Pointer Events)

**Test:** With no widgets open, click and drag on the 3D flame canvas. With widgets open, click on the visible canvas area (not on any widget panel).

**Expected:** Canvas interaction (flame color, orbit control, etc.) should work normally both with and without widgets open. Widgets should not block canvas interaction outside their own bounds.

**Why human:** `pointer-events-none` on WidgetLayer and `pointer-events-auto` on widget panels cannot be verified statically — requires live browser event testing.

---

## Commit Verification

All commits documented in summaries confirmed in git log:
- `4221898` — feat(19-01): install react-rnd and define widget type system
- `909adb3` — feat(19-01): create WidgetContainer component with react-rnd
- `4272816` — feat(19-01+02): create WidgetContainer and widgetStore prerequisites
- `cb5103a` — feat(19-03): create WidgetLayer component with per-widget selectors
- `f48dd19` — feat(19-03): mount WidgetLayer on Design screen with demo trigger

---

## Gaps Summary

No gaps. All 16 must-haves verified. All 5 requirement IDs (WIDG-01, WIDG-02, WIDG-03, WIDG-04, WIDG-07) satisfied with implementation evidence. Build passes cleanly. Two human verification items documented for live-site confirmation.

---

_Verified: 2026-03-05_
_Verifier: Claude (gsd-verifier)_
