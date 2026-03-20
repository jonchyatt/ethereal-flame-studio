# Requirements: Ethereal Flame Studio

**Defined:** 2026-01-26 (v1.0), Updated: 2026-02-20 (v2.0), Updated: 2026-03-05 (v3.0), Updated: 2026-03-19 (v4.0)
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

## v3.0 Requirements (In Progress)

Requirements for the Floating Widget Design System. Phases 19-25 (parallel with v4.0).

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

### v3.0 Traceability

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

**v3.0 Coverage:** 22 total, 22 mapped, 0 unmapped

---

## v4.0 Requirements

Requirements for the Cinema VFX Pipeline. Each maps to roadmap phases 26+.

**Constraint:** Existing Three.js orb system (Flame, Mist, Solar Breath) remains completely untouched. Blender is an additive second render path, not a replacement.

### Tool Setup & Discipline (TOOL)

- [x] **TOOL-01**: Claude can create and modify Blender scenes via blender-mcp MCP commands
- [x] **TOOL-02**: Long operations (sim bakes, Cycles renders) run asynchronously without hitting MCP timeout
- [ ] **TOOL-03**: Proof-of-concept Mantaflow fire orb renders successfully from test audio track

### Audio Bridge (AUD4)

- [x] **AUD4-01**: Audio analysis exports as JSON from browser with 8+ frequency bands (sub-bass through air)
- [x] **AUD4-02**: Onset detection and envelope followers per band included in audio export
- [x] **AUD4-03**: keyframe_generator.py reads audio JSON and inserts Blender keyframes via bpy.keyframe_insert()
- [x] **AUD4-04**: Mapping presets available (Meditation / EDM / Ambient) with different parameter profiles
- [x] **AUD4-05**: 8+ audio features mapped to 8+ independent visual parameters simultaneously (emergent complexity principle)

### Fire Simulation (FIRE)

- [x] **FIRE-01**: Mantaflow fire with Principled Volume + Blackbody shader at multi-scale detail (billows + turbulence + fine wisps)
- [ ] **FIRE-02**: Fire intensity driven by audio bass channel via keyframe mapping
- [ ] **FIRE-03**: Color temperature cycles with spectral centroid (brighter music = hotter/whiter fire)
- [ ] **FIRE-04**: Cycles render with compositor bloom, motion blur, and light-casting produces cinema-quality output
- [ ] **FIRE-05**: Side-by-side comparison shows cinema quality visibly exceeds Three.js Solar Breath

### Water Simulation (WATR)

- [x] **WATR-01**: Physics-based water surface with Ocean Modifier responds to audio treble
- [x] **WATR-02**: Fire-over-water scene renders with caustic reflections of fire in water
- [x] **WATR-03**: Water includes foam and spray particle systems for physical realism

### World Building (WRLD)

- [x] **WRLD-01**: Scenes use Poly Haven HDRIs for photorealistic environment lighting
- [x] **WRLD-02**: 3D assets from Sketchfab or AI generators (Rodin/Hunyuan3D) placed in scenes for context

### VR Cinema Rendering (VR)

- [x] **VR-01**: 8K stereoscopic equirectangular output from Blender panoramic camera
- [x] **VR-02**: VR spatial metadata injected for correct YouTube/Meta Quest VR playback
- [x] **VR-03**: VR output validated in actual headset without discomfort (safe IPD, no nausea-inducing motion)

### EDM Light Show Effects (EDM)

- [x] **EDM-01**: Volumetric laser beams with beat-synced scanning animation
- [x] **EDM-02**: LED grid with per-column frequency band mapping and amplitude-to-emission keyframes
- [x] **EDM-03**: Dynamic range principle implemented (10% emission during breakdowns, 100% on drops)

### Compositing Pipeline (COMP)

- [x] **COMP-01**: Multi-layer compositor combines fire + water + EDM + luminous being as separate render passes
- [x] **COMP-02**: Depth maps extracted from video using Video Depth Anything for VR compositing
- [x] **COMP-03**: Virtual effects composited onto real 360 footage with depth-aware occlusion

### Luminous Being (LUMI)

- [x] **LUMI-01**: Person segmented from video via SAM 2.1 with temporal consistency across frames
- [x] **LUMI-02**: Person silhouette filled with audio-reactive volumetric glow (Principled Volume)
- [x] **LUMI-03**: Particles emit from body silhouette (same modes as Three.js orb: Flame, Mist, Solar Breath)
- [x] **LUMI-04**: Mantaflow fire wisps emanate from body mesh as flow source
- [x] **LUMI-05**: Corona edge glow around body driven by treble frequency
- [x] **LUMI-06**: Complete Luminous Being effect is audio-reactive with per-layer frequency mapping

### Visual Intelligence Research (VRES)

- [ ] **VRES-01**: Chrome MCP analysis of UON Visuals decodes perceptual principles (fractal detail, emergent complexity, contrast, synchronization, expectation violation)
- [ ] **VRES-02**: Documented principles applied to fire/water/EDM/luminous being template parameters

### Integration & Efficiency (INTG)

- [ ] **INTG-01**: CLI-Anything custom harness wraps 5+ validated EFS-specific Blender workflows
- [ ] **INTG-02**: Batch render script queues multiple scenes for overnight rendering
- [ ] **INTG-03**: Complete pipeline demonstrated from audio file to final cinema render output

### v4.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | Phase 26 | Complete |
| TOOL-02 | Phase 26 | Complete |
| TOOL-03 | Phase 26 | Pending |
| AUD4-01 | Phase 27 | Complete |
| AUD4-02 | Phase 27 | Complete |
| AUD4-03 | Phase 27 | Complete |
| AUD4-04 | Phase 27 | Complete |
| AUD4-05 | Phase 27 | Complete |
| FIRE-01 | Phase 28 | Complete |
| FIRE-02 | Phase 28 | Pending |
| FIRE-03 | Phase 28 | Pending |
| FIRE-04 | Phase 28 | Pending |
| FIRE-05 | Phase 28 | Pending |
| WATR-01 | Phase 29 | Complete |
| WATR-02 | Phase 29 | Complete |
| WATR-03 | Phase 29 | Complete |
| WRLD-01 | Phase 29 | Complete |
| WRLD-02 | Phase 29 | Complete |
| VR-01 | Phase 30 | Complete |
| VR-02 | Phase 30 | Complete |
| VR-03 | Phase 30 | Complete |
| COMP-01 | Phase 30 | Complete |
| COMP-02 | Phase 30 | Complete |
| COMP-03 | Phase 30 | Complete |
| EDM-01 | Phase 31 | Complete |
| EDM-02 | Phase 31 | Complete |
| EDM-03 | Phase 31 | Complete |
| LUMI-01 | Phase 32 | Complete |
| LUMI-02 | Phase 32 | Complete |
| LUMI-03 | Phase 32 | Complete |
| LUMI-04 | Phase 32 | Complete |
| LUMI-05 | Phase 32 | Complete |
| LUMI-06 | Phase 32 | Complete |
| VRES-01 | Phase 33 | Pending |
| VRES-02 | Phase 33 | Pending |
| INTG-01 | Phase 33 | Pending |
| INTG-02 | Phase 33 | Pending |
| INTG-03 | Phase 33 | Pending |

**v4.0 Coverage:**
- v4.0 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

## v4.1 Requirements (Deferred)

- **WRLD-03**: World building with procedurally generated landscapes (Geometry Nodes)
- **VR-04**: Apple Vision Pro spatial video output format
- **LUMI-07**: Multiple people tracked simultaneously in Luminous Being
- **INTG-04**: Modal cloud rendering for Blender scenes (GPU offload)
- **INTG-05**: Web UI self-service for Blender render job submission

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing Three.js orb system | Blender is additive only; Three.js stays for real-time preview |
| Real-time Blender rendering | Batch/offline via Cycles only; Three.js handles real-time |
| Face recognition in Luminous Being | Claude refuses face recognition; silhouette-only by design |
| Custom Blender GUI addon | Claude controls via MCP; no GUI addon needed |
| Self-hosted ML models on Vercel | SAM 2, depth estimation need persistent GPU; run locally |
| Eevee for VR output | Does not support panoramic cameras |
| "Bass drives scale" as sole mapping | Anti-pattern; emergent complexity requires 8+ simultaneous mappings |
| Cloud-synced workspace layouts (v3.0) | localStorage sufficient for single user |
| Collaborative editing (v3.0) | Single creator workflow |
| Spatial audio | Out of scope for the visual pipeline |
| Continuous video frame polling | Event-driven and on-demand only |

## Widget Grouping Reference (v3.0)

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

---
*Requirements defined: 2026-01-26 (v1.0)*
*Last updated: 2026-03-19 after v4.0 roadmap creation (38 requirements mapped to phases 26-33)*
