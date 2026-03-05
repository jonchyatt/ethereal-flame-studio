# Requirements: Ethereal Flame Studio

**Defined:** 2026-01-26 (v1.0), Updated: 2026-02-20 (v2.0), Updated: 2026-03-05 (v3.0)
**Core Value:** Phone to published video without touching a computer

## v1.0 Requirements (Validated)

All v1.0 requirements shipped in Phases 1-5. See MILESTONES.md for details.

- VIS-01 through VIS-12: Visual engine (Phase 1)
- TPL-01 through TPL-06: Template system (Phase 2)
- AUD-01 through AUD-05: Audio processing (Phases 1, 3, 4)
- RND-01 through RND-08: Rendering pipeline (Phase 3)
- AUT-01 through AUT-06: Automation (Phases 4, 5)
- INF-01 through INF-03: Infrastructure (Phases 1, 4, 5)

## v2.0 Requirements (Validated)

All v2.0 requirements shipped in Phases 12-18. See MILESTONES.md for details.

- STOR-01 through STOR-04: Cloud storage (Phase 12)
- JOB-01 through JOB-05: Job state (Phases 13, 17, 18)
- WORK-01 through WORK-05: Workers (Phases 13, 14, 15)
- API-01 through API-04: API routes (Phases 14, 18)
- DEPLOY-01 through DEPLOY-04: Config & deploy (Phases 16, 17)
- SEC-01, SEC-02: Security (Phase 14)

## v3.0 Requirements

Requirements for the Floating Widget Design System. Each maps to roadmap phases 19-25.

### Widget System (WIDG)

- [x] **WIDG-01**: User can open any parameter group as a free-floating widget on the Design screen
- [x] **WIDG-02**: User can drag widgets freely around the screen
- [x] **WIDG-03**: User can resize widgets
- [x] **WIDG-04**: User can minimize widgets to title bar only
- [ ] **WIDG-05**: User can close and reopen widgets from a toolbar
- [ ] **WIDG-06**: Widget positions and sizes persist across page refreshes
- [x] **WIDG-07**: Clicking a widget brings it to front (z-order management)
- [ ] **WIDG-08**: Widget toolbar shows all available widgets with open/close toggle
- [ ] **WIDG-09**: Mobile devices fall back to scrollable sheet instead of floating widgets

### Widget Content (WCNT)

- [ ] **WCNT-01**: AdvancedEditor's 18 parameter groups are extracted into 9 standalone widget components
- [ ] **WCNT-02**: Each widget reads directly from useVisualStore with individual selectors
- [ ] **WCNT-03**: Widget content components are lazy-loaded (closed widgets have zero bundle cost)

### Workspace Layouts (WKSP)

- [ ] **WKSP-01**: User can save current widget arrangement as a named workspace layout
- [ ] **WKSP-02**: User can load a saved workspace layout to restore widget positions
- [ ] **WKSP-03**: User can delete saved workspace layouts
- [ ] **WKSP-04**: Workspace layouts persist in localStorage independently from visual templates

### Template Actions (TMPL)

- [ ] **TMPL-01**: User can click "Use in Render" on a template card to load it and switch to Create view
- [ ] **TMPL-02**: User can click "Use in Experience" on a template card to load it and switch to Experience view

### Render Target (RNDR)

- [ ] **RNDR-01**: User can select processing target (cloud or local-agent) separately from save destination
- [ ] **RNDR-02**: User can select save destination (local download, cloud storage, or agent path)
- [ ] **RNDR-03**: When "agent path" is selected, user can specify a file path on the local-agent machine
- [ ] **RNDR-04**: Save destination options are context-aware (agent path disabled when processing on cloud)

## v3.1 Requirements (Deferred)

- **WIDG-10**: Widget snapping to edges and other widgets
- **WIDG-11**: Widget grouping (link multiple widgets together)
- **WKSP-05**: Import/export workspace layouts as JSON
- **RNDR-05**: Progress streaming from local-agent render jobs

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud-synced workspace layouts | localStorage sufficient for single user |
| Collaborative editing | Single creator workflow |
| Plugin system for custom widgets | Not needed at current scale |
| Widget animation/transitions | Minimal UX value, adds complexity |
| Undo/redo for widget positions | Save/load workspace covers this use case |

## Widget Grouping Reference

18 AdvancedEditor parameter groups consolidated into 9 widgets:

| Widget | Name | Source Groups |
|--------|------|---------------|
| global | Global & Mode | Intensity slider |
| audio | Audio Dynamics | 4 presets + 16 sliders |
| particles | Particle Layers | LayerEditor per layer |
| placement | Orb & Camera | Orb Placement + Camera |
| skybox-core | Skybox | Mode, preset, rotation, VR, audio reactivity |
| video-skybox | Video Skybox | Upload/URL + yaw/pitch |
| masking | Masking | Luma/chroma + rect mask + seam + hole fix + pole fade |
| patches | Patches & Logo | Patch pick + A-D + pole logo |
| water | Water | Enable, color, reflectivity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIDG-01 | Phase 19 | Complete |
| WIDG-02 | Phase 19 | Complete |
| WIDG-03 | Phase 19 | Complete |
| WIDG-04 | Phase 19 | Complete |
| WIDG-05 | Phase 21 | Pending |
| WIDG-06 | Phase 21 | Pending |
| WIDG-07 | Phase 19 | Complete |
| WIDG-08 | Phase 21 | Pending |
| WIDG-09 | Phase 25 | Pending |
| WCNT-01 | Phase 20 | Pending |
| WCNT-02 | Phase 20 | Pending |
| WCNT-03 | Phase 25 | Pending |
| WKSP-01 | Phase 22 | Pending |
| WKSP-02 | Phase 22 | Pending |
| WKSP-03 | Phase 22 | Pending |
| WKSP-04 | Phase 22 | Pending |
| TMPL-01 | Phase 23 | Pending |
| TMPL-02 | Phase 23 | Pending |
| RNDR-01 | Phase 24 | Pending |
| RNDR-02 | Phase 24 | Pending |
| RNDR-03 | Phase 24 | Pending |
| RNDR-04 | Phase 24 | Pending |

**Coverage:**
- v3.0 requirements: 22 total
- Mapped to phases: 22/22
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 -- v3.0 traceability mapped to phases 19-25*
