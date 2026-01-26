# Project State: Ethereal Flame Studio

**Purpose:** Session continuity and context preservation for Claude

---

## Project Reference

**Core Value:** Phone to published video without touching a computer

**Current Focus:** Roadmap complete, ready for Phase 1 planning

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/REQUIREMENTS.md` - v1 requirements (41 total)
- `.planning/ROADMAP.md` - Phase structure
- `.planning/research/SUMMARY.md` - Architecture decisions

---

## Current Position

**Phase:** 1 of 5 (Foundation - Web UI + Visual Engine)
**Plan:** 7 of 8 completed
**Status:** In progress
**Last activity:** 2026-01-26 - Completed 01-07-PLAN.md (Mobile-friendly UI)

**Plans:**
- ✅ 01-01: Project scaffolding (Next.js + R3F setup)
- ✅ 01-02: Audio analyzer (FFT, frequency bands, beat detection)
- ✅ 01-03: Particle system core (lifetime, size curve, dual-layer)
- ✅ 01-04: Star Nest skybox (procedural background)
- ✅ 01-05: Ethereal Mist mode (soft clouds)
- ✅ 01-06: Ethereal Flame mode (warm upward drift)
- ✅ 01-07: Mobile-friendly UI (control panels)
- 01-08: Integration (wire audio to visuals)

**Progress:**
```
Phase 1: [███████░░░] 87.5% (7/8 plans)
Phase 2: [░░░░░░░░░░] 0%
Phase 3: [░░░░░░░░░░] 0%
Phase 4: [░░░░░░░░░░] 0%
Phase 5: [░░░░░░░░░░] 0%
Overall: [█░░░░░░░░░] 17.1% (7/41 plans estimated)
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements (v1) | 41 |
| Requirements mapped | 41 |
| Phases total | 5 |
| Phases complete | 0 |
| Current streak | 0 days |

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
| 2026-01-26 | Size-over-lifetime curve (01-03) | 37% birth → 100% at 20% life → 50% death (Unity reference) |
| 2026-01-26 | BackSide skybox rendering (01-04) | Large sphere with BackSide material for infinite background |
| 2026-01-26 | DarkWorld1 as default skybox (01-04) | User's preferred preset (THE ONE) |
| 2026-01-26 | Peak lifetime at 50-60% for mist (01-05) | Creates centered, gentle bloom effect for cloud-like particles |
| 2026-01-26 | Pastel color palette for mist (01-05) | Soft colors suitable for meditation and ambient backgrounds |
| 2026-01-26 | Very slow drift for mist (01-05) | 0.004-0.008 maxSpeed mimics gentle floating clouds |
| 2026-01-26 | 0.7 alpha softness multiplier (01-05) | Prevents harsh edges, maintains ethereal cloud quality |
| 2026-01-26 | GLSL webpack loader (01-05) | Fixed pre-existing build error blocking verification |
| 2026-01-26 | Tailwind v4 PostCSS plugin (01-05) | Required @tailwindcss/postcss for build compatibility |
| 2026-01-26 | 70% upward velocity bias (01-06) | Creates convincing fire effect while maintaining organic spread |
| 2026-01-26 | Age-based flame colors (01-06) | Yellow→Orange→Red mimics natural fire temperature gradient |
| 2026-01-26 | Sin/cos turbulence for flame (01-06) | Organic flicker without perlin noise overhead |
| 2026-01-26 | Touch-friendly 44px minimum (01-07) | Mobile usability per iOS/Android guidelines |
| 2026-01-26 | Collapsible control panel (01-07) | Maximizes visual area when controls not needed |
| 2026-01-26 | Semi-transparent controls (01-07) | bg-black/70 backdrop-blur-md doesn't obstruct visuals |
| 2026-01-26 | Debug overlay toggle (01-07) | Audio levels visible during development, hideable in production |

### Technical Context

- **WebGL limit:** 4096x4096 max texture in headless Chromium (cannot render 8K in browser)
- **Unity reference:** Size-over-lifetime curve is key to ethereal look (37% birth, 100% at 20% life, 50% death)
- **Particle count:** Only need ~1000-2000 particles with proper lifetime curves
- **VR metadata:** Must use Google Spatial Media tools for sv3d/st3d metadata injection

### Blockers

None currently.

### TODOs

- [x] Run `/gsd:plan-phase 1` to create Phase 1 execution plan
- [x] Set up Next.js + Three.js project scaffold (01-01 complete)
- [x] Implement audio analyzer with FFT (01-02 complete)
- [x] Port Unity particle system reference to GLSL (01-03 complete)
- [x] Implement Star Nest skybox (01-04 complete)
- [x] Implement Ethereal Mist mode (01-05 complete)
- [x] Implement Ethereal Flame mode (01-06 complete)
- [x] Create mobile-friendly UI controls (01-07 complete)
- [ ] Continue executing Phase 1 plans (1 remaining: 01-08)

---

## Session Continuity

### Last Session
- **Date:** 2026-01-26
- **Action:** Executed plan 01-07 (Mobile-friendly UI)
- **Outcome:** Touch-optimized control panel with mode switching, preset selection, and collapsible layout

**Stopped at:** Completed 01-07-PLAN.md
**Resume file:** None

### Next Session Should
1. Read this STATE.md for context
2. Execute final Phase 1 plan: 01-08 (Integration - wire audio to visuals)
3. Note: Phase 1 nearly complete - 7/8 plans done in same day

### Context to Preserve
- Research recommends investigating shader portability in Phase 3
- User rarely has direct computer access (phone-first workflow is critical)
- Reference code exists in reset-biology-website (breathing orb, audio reactive orb, skybox)

---

*Last updated: 2026-01-26 18:24:00 UTC*
