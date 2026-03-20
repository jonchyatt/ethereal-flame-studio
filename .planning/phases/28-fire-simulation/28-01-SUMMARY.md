---
phase: 28-fire-simulation
plan: 01
subsystem: blender-scripts
tags: [mantaflow, fire-simulation, blender, cycles, principled-volume, blackbody, quality-presets]

# Dependency graph
requires:
  - phase: 26-blender-mcp-bridge
    provides: "scene_utils.py (save_before_operate, get_or_create_object, set_cache_directory)"
  - phase: 26-blender-mcp-bridge
    provides: "async_bake.py + async_render.py async patterns"
provides:
  - "fire_cinema_template.py: create_fire_scene(), bake_fire(), render_fire() three-function API"
  - "quality_presets.json: Draft/Preview/Production/Ultra 4-tier quality configuration"
  - "QUALITY_PRESETS export for programmatic access to quality tiers"
affects: [28-02-PLAN, 29-compositor-effects, 30-audio-reactive-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: ["quality preset JSON driving scene configuration", "multi-scale Mantaflow fire parameters", "three-point lighting setup"]

key-files:
  created:
    - blender/scripts/fire_cinema_template.py
    - blender/presets/quality_presets.json
  modified: []

key-decisions:
  - "Preview as default quality: reasonable balance of speed and visual quality for iterative workflow"
  - "Separate cache subdirectory (fire_cinema vs fire_orb_poc) to avoid cross-contamination"
  - "Reused efs_ object naming from POC for backward compatibility with Phase 27 mapping presets"

patterns-established:
  - "Quality preset pattern: single JSON file drives all resolution/sample/frame settings via one parameter"
  - "Three-point lighting pattern: key (warm), rim (cool), ground bounce for fire scenes"
  - "Camera DOF pattern: 65mm f/2.8 for cinematic shallow depth of field on fire"

requirements-completed: [FIRE-01]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 28 Plan 01: Fire Cinema Template Summary

**Production Mantaflow fire scene builder with multi-scale detail (vorticity + noise upres + dissolve + flame params), Principled Volume Blackbody material, 4-tier quality presets, three-point lighting, and camera DOF**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T03:36:17Z
- **Completed:** 2026-03-20T03:39:48Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Created 4-tier quality preset system (Draft 64 -> Ultra 512) controlling all scene parameters from a single quality argument
- Built 654-line production fire cinema template superseding the 401-line POC with multi-scale fire parameters, enhanced material, three-point lighting, and camera DOF
- Maintained backward compatibility with Phase 27 mapping presets via consistent efs_ object naming

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quality_presets.json with 4 resolution tiers** - `cbd189e` (feat)
2. **Task 2: Create fire_cinema_template.py with multi-scale fire scene builder** - `44dc33d` (feat)

## Files Created/Modified
- `blender/presets/quality_presets.json` - 4-tier quality configuration (Draft/Preview/Production/Ultra) with resolution, samples, frame count, render resolution, denoiser, and motion blur settings
- `blender/scripts/fire_cinema_template.py` - Production fire scene builder with create_fire_scene(), bake_fire(), render_fire(), and load_quality_preset() functions

## Decisions Made
- **Preview as default quality:** Chose "preview" (128 res, 128 samples, 90 frames) as the default quality parameter for create_fire_scene(), balancing visual quality with turnaround speed for the iterative MCP workflow
- **Separate cache directory:** Used "fire_cinema" cache subdirectory instead of reusing "fire_orb_poc" to prevent cache contamination between POC and production scripts
- **efs_ object naming preserved:** Kept the same efs_fire_domain, efs_fire_flow, efs_fire_material, efs_fire_camera, efs_fire_key_light, efs_fire_target naming from the POC so existing meditation/edm/cinematic presets target the correct objects without modification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- fire_cinema_template.py is ready for 28-02 (compositor effects, background integration, or further fire parameter tuning)
- Quality presets provide clear escalation path: iterate at draft/preview, ship at production/ultra
- Three-function API (create -> bake -> render) is fully compatible with the MCP async workflow
- Object names are compatible with all three Phase 27 mapping presets (meditation, edm, cinematic)

## Self-Check: PASSED

- FOUND: blender/presets/quality_presets.json
- FOUND: blender/scripts/fire_cinema_template.py
- FOUND: .planning/phases/28-fire-simulation/28-01-SUMMARY.md
- FOUND: commit cbd189e (Task 1)
- FOUND: commit 44dc33d (Task 2)

---
*Phase: 28-fire-simulation*
*Completed: 2026-03-20*
