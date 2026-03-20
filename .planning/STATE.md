---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Floating Widget Design System
status: executing
stopped_at: Completed 29-02-PLAN.md
last_updated: "2026-03-20T04:27:49.499Z"
last_activity: 2026-03-20 -- Completed 29-02 world template (HDRI + asset placement utilities)
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 10
  completed_plans: 8
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Phone to published video without touching a computer
**Current focus:** Phase 29 -- Water & World Building (Plan 02 complete, Plans 01/03 queued)

---

## Current Position

Phase: 29 of 33 (Water & World Building)
Plan: 2 of 3 in current phase
Status: In Progress
Last activity: 2026-03-20 -- Completed 29-02 world template (HDRI + asset placement utilities)

Progress: [████████░░] 80%

---

## Performance Metrics

**v1.0:** 35+ plans completed across 5 phases
**v2.0:** 18 plans completed across 7 phases
**v3.0 (parallel):** 3/17 plans (Phase 19 complete, Phases 20-25 queued)
**v4.0:** 3/3 plans in Phase 26 complete, 2/2 in Phase 27 complete, 1/2 in Phase 28, 1/3 in Phase 29

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

Last session: 2026-03-20T04:27:45.315Z
Stopped at: Completed 29-02-PLAN.md
Resume with: 29-01-PLAN.md or 29-03-PLAN.md (Phase 29, remaining plans)
Resume file: None

---

*Last updated: 2026-03-20 -- Phase 29 Plan 02 complete (world template -- HDRI + asset placement)*
