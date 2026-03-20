---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Floating Widget Design System
status: executing
stopped_at: Completed 31-01-PLAN.md
last_updated: "2026-03-20T05:12:11.219Z"
last_activity: 2026-03-20 -- Completed 31-01 EDM light show scene template
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 15
  completed_plans: 14
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Phone to published video without touching a computer
**Current focus:** Phase 30 -- VR Cinema Compositing (COMPLETE, 3/3 plans done)

---

## Current Position

Phase: 31 of 33 (EDM Light Show)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-03-20 -- Completed 31-01 EDM light show scene template

Progress: [█████████░] 93%

---

## Performance Metrics

**v1.0:** 35+ plans completed across 5 phases
**v2.0:** 18 plans completed across 7 phases
**v3.0 (parallel):** 3/17 plans (Phase 19 complete, Phases 20-25 queued)
**v4.0:** 3/3 plans in Phase 26 complete, 2/2 in Phase 27 complete, 1/2 in Phase 28, 3/3 in Phase 29

---

## Accumulated Context

### Decisions

- blender-mcp for Claude-Blender bridge (TCP:9876, 180s timeout)
- Async patterns mandatory: `bpy.app.timers.register()` for bakes, `INVOKE_DEFAULT` for renders
- Audio JSON bridge: browser export once, never re-analyze in Python
- Keyframe Flow objects, not Domain parameters (Blender T72812 workaround)
- Resolution ladder: 64 prototype, 128 test, 256 production, 512 if hardware allows
- Phase 7 (v1.0) superseded by v4.0 Phases 26-33
- Force-add .gitkeep in gitignored dirs (negation rules alone insufficient on initial add)
- 0.1s timer delay ensures MCP response sent before bake callback fires
- Single shared status file (blender/cache/.efs_status.json) for all async operations
- OpenImageDenoise default denoiser -- 128 samples comparable to 2048 without denoising
- exec(open()) needs __file__ fallback for MCP script execution
- Blender 5.0.1 Mantaflow FIRE bake crashes (MANTA::initHeat bug) -- use 4.5 LTS for fire sims
- Own FFT implementation for AudioExporter (no new deps), stereo from raw L/R channels
- BPM via autocorrelation on RMS energy (8s window, 60-200 BPM range)
- LUFS approximated via K-weighted RMS windowing (not true ITU BS.1770)
- resolve_target() returns (set_fn, keyframe_fn) closures -- no exec() for safety
- Color temp RGB ramp: 1500K red -> 3000K orange -> 6500K white
- Preset-driven mapping: JSON preset defines source_feature -> data_path with scale/offset/clamp
- Targets resolved upfront before frame loop (fail fast on missing objects)
- Preview as default quality for fire_cinema_template -- balance speed vs visual quality
- Separate fire_cinema cache subdir from fire_orb_poc to avoid cross-contamination
- efs_ object naming preserved from POC for backward compatibility with Phase 27 mapping presets
- World-building as composable utility module (not scene template) -- other templates call these functions
- Two-step MCP workflow: download via MCP tools, configure via Python -- transport-independent design
- HDRI rotation via Mapping node Z axis -- controls sun direction without re-downloading
- [Phase 29]: World-building as composable utility module -- other templates import these functions
- [Phase 29]: Ocean Modifier is procedural -- bake_ocean() is a no-op for API symmetry
- [Phase 29]: Treble/brilliance drive water waves (complementary to fire bass-driven intensity)
- [Phase 29]: Glass BSDF with IOR 1.333 for water refraction + caustics enabled (12 max bounces)
- [Phase 29]: Combo scenes raise fire domain to (0,0,2.5) and flow to (0,0,0.8) above water at origin
- [Phase 29]: Combo caustic bounces: 16 max / 16 transmission / 4 volume (higher than standalone water)
- [Phase 29]: HDRI strength 0.8 in combo to avoid overpowering fire self-illumination
- [Phase 29]: efs_combo_* namespace for combo-specific objects prevents conflicts with fire/water presets
- [Phase 29]: fire_water_combo.json has 17 merged audio mappings (9 fire + 4 water + 4 combo-specific)
- [Phase 30]: IPD fixed at 64mm (human average) -- safe for general audience VR
- [Phase 30]: Top-bottom stereo layout -- YouTube VR and Meta Quest standard format
- [Phase 30]: OFFAXIS convergence mode at 10m -- most natural stereoscopic depth
- [Phase 30]: Static VR camera only (no keyframes, no Track To) -- prevents motion sickness
- [Phase 30]: ffmpeg metadata tags (spherical, stitched, stereo_mode) for VR spatial marking
- [Phase 30]: VR sample multiplier per tier (1.0x draft/preview, 1.5x production, 2.0x ultra)
- [Phase 30]: Additive VR camera overlay -- create_vr_camera() works on any existing scene
- [Phase 30]: Neutral Color Balance at end of compositor chain -- users adjust grade without changing layer setup
- [Phase 30]: film_transparent=True at scene level -- all View Layers inherit transparent background for alpha-over
- [Phase 30]: Idempotent collection creation -- reuses existing collection if name matches (safe for MCP re-runs)
- [Phase 30]: View Layer per element pattern -- each scene element gets own View Layer rendering only its Collection
- [Phase 30]: View Layer per element: each scene element rendered in isolation via own View Layer + Collection
- [Phase 30]: LESS_THAN math node for depth comparison: effects_depth < footage_depth = visible, >= = occluded
- [Phase 30]: Gaussian blur on depth mask for soft edge transitions (resolution-independent blend_width)
- [Phase 30]: OpenEXR format for Z-pass output: preserves 32-bit float depth precision
- [Phase 30]: Camera clip_start..clip_end used for Z-pass normalization to 0..1 range
- [Phase 31]: World Volume Scatter + dedicated fog cube for dual-layer laser visibility in EDM scene
- [Phase 31]: Total darkness principle: world Strength=0.0, effects are the sole illumination source
- [Phase 31]: Bloom threshold 0.5 (lower than fire 0.8 / water 0.9) for heavy laser/LED flare effects

### Critical Pitfalls (from research)

- 180s MCP timeout kills bakes/renders silently -- async from day one
- Mantaflow cache explosion (30-180+ GB) -- dedicated cache dir, start at resolution 64
- Screenshot tokens compound ($5-15/day without discipline) -- use text feedback primarily
- Mantaflow Domain keyframing broken (T72812) -- keyframe Flow objects only
- Cycles + Mantaflow fire = corrupted frames (T77678) -- verify every test render frame-by-frame
- Blender 5.0.1 Mantaflow FIRE crashes in MANTA::initHeat -- SMOKE works fine, FIRE needs 4.5 LTS

### Blockers

None blocking. Blender 5.0.1 fire crash is documented but not blocking (pipeline validated via smoke).

---

## Session Continuity

Last session: 2026-03-20T05:12:11.216Z
Stopped at: Completed 31-01-PLAN.md
Resume with: Phase 31 Plan 02
Resume file: None

---

*Last updated: 2026-03-20 -- Phase 31 in progress (1/2 plans: EDM light show scene template)*
