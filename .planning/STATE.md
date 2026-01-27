# Project State: Ethereal Flame Studio

**Purpose:** Session continuity and context preservation for Claude

---

## Project Reference

**Core Value:** Phone to published video without touching a computer

**Current Focus:** Phase 2 complete, ready for Phase 3 planning

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/REQUIREMENTS.md` - v1 requirements (41 total)
- `.planning/ROADMAP.md` - Phase structure
- `.planning/research/SUMMARY.md` - Architecture decisions
- `.planning/phases/02-templates/02-SUMMARY.md` - Phase 2 summary

---

## Current Position

**Phase:** 2 of 5 (Template System) - COMPLETE
**Plan:** 6/6 complete
**Status:** Ready for Phase 3 planning
**Last activity:** 2026-01-27 - Completed Phase 2 (Template System)

**Phase 1 (COMPLETE):**
- [x] 01-01: Project scaffolding
- [x] 01-02: Audio analyzer
- [x] 01-03: Particle system core
- [x] 01-04: Star Nest skybox
- [x] 01-05: Ethereal Mist mode
- [x] 01-06: Ethereal Flame mode
- [x] 01-07: Mobile-friendly UI
- [x] 01-08: Integration (APPROVED - visual quality deferred)

**Phase 2 (COMPLETE):**
- [x] 02-01: Template types + store
- [x] 02-02: Built-in presets (6 curated)
- [x] 02-03: Template gallery UI
- [x] 02-04: Save template with screenshot
- [x] 02-05: Advanced editor
- [x] 02-06: Verification (user pre-approved)

**Progress:**
```
Phase 1: [##########] 100% (8/8 plans) - COMPLETE
Phase 2: [##########] 100% (6/6 plans) - COMPLETE
Phase 3: [..........] 0% (planned)
Phase 4: [..........] 0% (planned)
Phase 5: [..........] 0% (planned)
Overall: [###.......] 34% (14/41 plans)
```

**Note:** Visual quality (particle asymmetry, organic shapes) flagged for redesign after pipeline complete.

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements (v1) | 41 |
| Requirements mapped | 41 |
| Phases total | 5 |
| Phases complete | 2 |
| Plans complete | 14 |

---

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-26 | Next.js + Three.js stack | Same as reference code, web-accessible |
| 2026-01-26 | Hybrid browser + GPU worker | WebGL 4K limit requires server-side rendering for 8K |
| 2026-01-26 | Blender for 8K rendering | Mature Python API, headless support, proven for VR |
| 2026-01-26 | 5 sequential phases | Clear dependencies, preview before render before automate |
| 2026-01-26 | transpilePackages: ['three'] | Critical for R3F compatibility with Next.js |
| 2026-01-26 | TypeScript strict mode | Type safety from project start |
| 2026-01-26 | Full-viewport canvas layout | Immersive experience with overflow:hidden |
| 2026-01-26 | 512 FFT size (01-02) | Balances frequency resolution with 60fps performance |
| 2026-01-26 | Beat threshold 0.05 (01-02) | Low threshold for sensitive bass detection with 80ms cooldown |
| 2026-01-26 | Backward compatibility aliases (01-02) | mids/treble mirror mid/high for existing components |
| 2026-01-26 | CPU lifetime management (01-03) | Float32Array refs for zero GC pressure, organic particle lifecycle |
| 2026-01-26 | Size-over-lifetime curve (01-03) | 37% birth -> 100% at 20% life -> 50% death (Unity reference) |
| 2026-01-26 | BackSide skybox rendering (01-04) | Large sphere with BackSide material for infinite background |
| 2026-01-26 | DarkWorld1 as default skybox (01-04) | User's preferred preset (THE ONE) |
| 2026-01-26 | Peak lifetime at 50-60% for mist (01-05) | Creates centered, gentle bloom effect for cloud-like particles |
| 2026-01-26 | Pastel color palette for mist (01-05) | Soft colors suitable for meditation and ambient backgrounds |
| 2026-01-26 | Very slow drift for mist (01-05) | 0.004-0.008 maxSpeed mimics gentle floating clouds |
| 2026-01-26 | 0.7 alpha softness multiplier (01-05) | Prevents harsh edges, maintains ethereal cloud quality |
| 2026-01-26 | GLSL webpack loader (01-05) | Fixed pre-existing build error blocking verification |
| 2026-01-26 | Tailwind v4 PostCSS plugin (01-05) | Required @tailwindcss/postcss for build compatibility |
| 2026-01-26 | 70% upward velocity bias (01-06) | Creates convincing fire effect while maintaining organic spread |
| 2026-01-26 | Age-based flame colors (01-06) | Yellow->Orange->Red mimics natural fire temperature gradient |
| 2026-01-26 | Sin/cos turbulence for flame (01-06) | Organic flicker without perlin noise overhead |
| 2026-01-26 | Touch-friendly 44px minimum (01-07) | Mobile usability per iOS/Android guidelines |
| 2026-01-26 | Collapsible control panel (01-07) | Maximizes visual area when controls not needed |
| 2026-01-26 | Semi-transparent controls (01-07) | bg-black/70 backdrop-blur-md doesn't obstruct visuals |
| 2026-01-26 | Debug overlay toggle (01-07) | Audio levels visible during development, hideable in production |
| 2026-01-27 | getState() pattern in useFrame (01-08) | Prevents React re-renders on every audio frame, maintaining 60fps |
| 2026-01-27 | 0.6 lerp factor for audio (01-08) | Fast but smooth audio response - faster than typical 0.1-0.3 |
| 2026-01-27 | Immediate beat detection (01-08) | No lerp for isBeat flag, ensures snappy pulse response |
| 2026-01-27 | Subtle skybox modulation (01-08) | 0.3/0.2 amplitude/bass multipliers prevent jarring rotation changes |
| 2026-01-27 | crypto.randomUUID() for template IDs (02-01) | Browser native, no external dependencies |
| 2026-01-27 | zustand persist for localStorage (02-01) | Only user templates persisted, built-ins from code |
| 2026-01-27 | preserveDrawingBuffer for screenshots (02-04) | Required for canvas.toDataURL() to work |
| 2026-01-27 | 150x150 JPEG thumbnails (02-04) | Center-crop for consistent aspect ratio |
| 2026-01-27 | Ref-based screenshot capture (02-04) | Invisible component inside Canvas |
| 2026-01-27 | selectSerializableState pattern (02-01) | Extract saveable state from stores |

### Technical Context

- **WebGL limit:** 4096x4096 max texture in headless Chromium (cannot render 8K in browser)
- **Unity reference:** Size-over-lifetime curve is key to ethereal look (37% birth, 100% at 20% life, 50% death)
- **Particle count:** Only need ~1000-2000 particles with proper lifetime curves
- **VR metadata:** Must use Google Spatial Media tools for sv3d/st3d metadata injection
- **Template system:** 6 built-in presets, localStorage persistence for user templates

### Blockers

None currently.

### TODOs

- [x] Phase 1: Foundation (Web UI + Visual Engine)
- [x] Phase 2: Template System
- [ ] Phase 3: Recording (audio upload, timeline, MP4 export)
- [ ] Phase 4: Server Rendering (8K/VR via Blender)
- [ ] Phase 5: Automation (export templates, VR hosting)

---

## Session Continuity

### Last Session
- **Date:** 2026-01-27
- **Action:** Executed all Phase 2 plans (02-01 through 02-06)
- **Outcome:** Complete template system implemented

**Commits:**
- `b49069c` feat(02-01): template types and store
- `92e7824` feat(02-02): 6 built-in presets
- `1e60c6f` feat(02-03): template gallery UI
- `1ad0e34` feat(02-04): save template with screenshot
- `977059b` feat(02-05): advanced parameter editor

**Stopped at:** Phase 2 complete
**Resume file:** None

### Next Session Should
1. Read this STATE.md for context
2. Plan Phase 3 (Recording)
3. Execute Phase 3 plans

### Context to Preserve
- Research recommends investigating shader portability in Phase 3
- User rarely has direct computer access (phone-first workflow is critical)
- Reference code exists in reset-biology-website (breathing orb, audio reactive orb, skybox)
- Template system ready: 6 presets, save/load, advanced editor

---

*Last updated: 2026-01-27*
