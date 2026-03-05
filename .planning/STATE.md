# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Phone to published video without touching a computer
**Current focus:** Milestone v3.0 Floating Widget Design System -- Phase 19 in progress

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/MILESTONES.md` - Milestone history
- `.planning/REQUIREMENTS.md` - v3.0 requirements (22 mapped to phases 19-25)
- `.planning/ROADMAP.md` - Phase structure (v1.0 phases 1-7, v2.0 phases 12-18, v3.0 phases 19-25)

---

## Current Position

Phase: 19 (Widget Shell + react-rnd Foundation)
Plan: 2 of 3 complete
Status: Executing Phase 19
Last activity: 2026-03-05 -- 19-02 widgetStore complete

Progress: [#############_______] 2/3 plans (67%)

---

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 35+
- Phases completed: 5 (core pipeline)
- Audio Prep MVP shipped on feature branch

**v2.0:**
- Plans completed: 18
- Phases completed: 7 (all v2.0 phases)

**v3.0:**
- Plans completed: 2/17
- Phases remaining: 7 (phases 19-25)
- Phase 19: 2/3 plans done (19-01, 19-02 complete)

---

## Accumulated Context

### Key Decisions

- react-rnd for drag + resize (15KB gzipped, touch support, bounds constraints)
- Z-index range z-[75]-z-[85] for widgets (above panels z-50, below modals z-100)
- 18 AdvancedEditor parameter groups -> 9 widget components
- Workspace layouts in localStorage (independent from visual templates)
- Widget content reads directly from useVisualStore with individual selectors
- Lazy-loaded widget content (closed widgets have zero bundle cost)
- Mobile devices fall back to scrollable sheets instead of floating widgets
- Render target split: processing target (cloud/local-agent) + save destination (download/cloud/agent-path)
- Phases 23 (Template Actions) and 24 (Render Target Split) are independent -- can run in parallel or out of order
- WidgetContainer is pure props-driven (no store imports) -- parent manages all state
- cancel='.widget-content' on Rnd prevents drag from interfering with sliders/inputs inside widgets
- lucide-react icons (Minus, Maximize2, X) for widget title bar buttons
- renormalizeZIndices extracted as standalone helper for reuse between openWidget and bringToFront
- bringToFront skips update when widget already at front (performance optimization)
- Cascading initial positions (50+i*30 per axis) prevent widget overlap on first open

### Technical Context

- AdvancedEditor at `src/components/ui/AdvancedEditor.tsx` (2,293 lines -- decompose target)
- ControlPanel at `src/components/ui/ControlPanel.tsx` (407 lines -- widget toolbar integration)
- TemplateCard at `src/components/ui/TemplateCard.tsx` (112 lines -- action buttons)
- CreateOverlay at `src/components/ui/CreateOverlay.tsx` (409 lines -- render target)
- RenderDialog at `src/components/ui/RenderDialog.tsx` (~1,700 lines -- render target)
- Visual store at `src/lib/stores/visualStore.ts` (821 lines -- read-only, no changes)
- Template store at `src/lib/stores/templateStore.ts` -- read-only, no changes
- Widget store at `src/lib/stores/widgetStore.ts` (169 lines -- 19-02 output)
- WidgetContainer at `src/components/ui/WidgetContainer.tsx` (136 lines -- 19-01 output)
- Widget types at `src/types/widget.ts` (55 lines -- 19-01 output)
- Page mount at `src/app/page.tsx` (383 lines -- mount WidgetLayer)

### Blockers

(None identified)

---

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 19-02-PLAN.md (widgetStore)
Resume with: `/gsd:execute-phase 19` (19-03 remaining)
Resume file: .planning/phases/19-widget-shell-react-rnd-foundation/19-03-PLAN.md

---

*Last updated: 2026-03-05 -- 19-02 widgetStore complete*
