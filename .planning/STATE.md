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

**Phase:** 1 - Foundation (Web UI + Visual Engine)
**Plan:** 8 plans in 5 waves (VERIFIED ✓)
**Status:** Ready for `/gsd:execute-phase 1`

**Plans:**
- 01-01: Project scaffolding (Next.js + R3F setup)
- 01-02: Audio analyzer (FFT, frequency bands, beat detection)
- 01-03: Particle system core (lifetime, size curve, dual-layer)
- 01-04: Star Nest skybox (procedural background)
- 01-05: Ethereal Mist mode (soft clouds)
- 01-06: Ethereal Flame mode (warm upward drift)
- 01-07: Mobile-friendly UI (control panels)
- 01-08: Integration (wire audio to visuals)

**Progress:**
```
Phase 1: [▓---------] PLANNED
Phase 2: [----------] 0%
Phase 3: [----------] 0%
Phase 4: [----------] 0%
Phase 5: [----------] 0%
Overall: [----------] 0%
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

### Technical Context

- **WebGL limit:** 4096x4096 max texture in headless Chromium (cannot render 8K in browser)
- **Unity reference:** Size-over-lifetime curve is key to ethereal look (37% birth, 100% at 20% life, 50% death)
- **Particle count:** Only need ~1000-2000 particles with proper lifetime curves
- **VR metadata:** Must use Google Spatial Media tools for sv3d/st3d metadata injection

### Blockers

None currently.

### TODOs

- [x] Run `/gsd:plan-phase 1` to create Phase 1 execution plan
- [ ] Run `/gsd:execute-phase 1` to build Foundation
- [ ] Set up Next.js + Three.js project scaffold
- [ ] Port Unity particle system reference to GLSL

---

## Session Continuity

### Last Session
- **Date:** 2026-01-26
- **Action:** Planned Phase 1 (Foundation)
- **Outcome:** 8 plans in 5 waves, verified by plan-checker

### Next Session Should
1. Read this STATE.md for context
2. Run `/gsd:execute-phase 1` to build Foundation
3. Execute plans wave by wave (scaffolding → audio/particles/skybox → modes → UI → integration)

### Context to Preserve
- Research recommends investigating shader portability in Phase 3
- User rarely has direct computer access (phone-first workflow is critical)
- Reference code exists in reset-biology-website (breathing orb, audio reactive orb, skybox)

---

*Last updated: 2026-01-26*
