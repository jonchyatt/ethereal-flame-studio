---
phase: 29-water-world-building
plan: 03
subsystem: blender-pipeline
tags: [blender, mantaflow, ocean-modifier, cycles, caustics, hdri, audio-reactive, combo-scene]

# Dependency graph
requires:
  - phase: 29-01
    provides: water_template.py with Ocean Modifier, Glass BSDF material, foam particles, water_ocean preset
  - phase: 29-02
    provides: world_template.py with setup_hdri(), place_asset(), setup_world() for HDRI environments
  - phase: 28-01
    provides: fire_cinema_template.py with Mantaflow fire domain, flow emitter, Principled Volume material
provides:
  - combo_fire_water.py -- fire-over-water combo scene builder with four-function API
  - fire_water_combo.json -- merged 17-mapping audio preset for simultaneous fire+water+combo control
  - Caustic reflection pipeline (fire light reflecting in water via Cycles path tracing)
  - Combined audio-reactive scene (bass drives fire, treble drives water, energy drives combo lights)
affects: [30-mantaflow-particles, 31-compositing-pipeline, 33-final-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [combo-scene-composition, merged-audio-presets, efs-namespace-isolation]

key-files:
  created:
    - blender/scripts/combo_fire_water.py
    - blender/presets/fire_water_combo.json
  modified: []

key-decisions:
  - "Fire domain raised to (0,0,2.5) and flow to (0,0,0.8) -- positions fire clearly above water surface"
  - "Caustic bounces increased to 16 max / 16 transmission / 4 volume for fire-water light interaction"
  - "HDRI strength reduced to 0.8 in combo to avoid overpowering fire self-illumination"
  - "efs_combo_* namespace for combo-specific objects prevents naming conflicts with fire/water presets"
  - "17 merged audio mappings: 9 fire + 4 water + 4 combo-specific (most complex preset)"
  - "Removed __world__, efs_fire_camera, efs_water_camera mappings from combo preset (replaced by HDRI and efs_combo_camera)"

patterns-established:
  - "Combo scene composition: import internal functions from multiple templates, adjust positions for combined layout"
  - "Merged audio presets: combine mappings from multiple presets, remove conflicting targets, add combo-specific mappings"
  - "Object namespace isolation: efs_fire_*, efs_water_*, efs_combo_* allow simultaneous audio targeting without conflicts"

requirements-completed: [WATR-02, WRLD-01, WRLD-02]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 29 Plan 03: Fire-Over-Water Combo Scene Summary

**Fire-over-water combo scene with caustic reflections, HDRI environment, and 17 simultaneous audio-visual mappings merging fire bass + water treble + combo lights/camera**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T04:30:43Z
- **Completed:** 2026-03-20T04:34:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created combo_fire_water.py composing fire, water, and world templates into one cinematic scene with fire floating above reflective water
- Enabled Cycles caustic reflections (reflective + refractive) with increased bounce limits (16 max bounces, 16 transmission, 4 volume) for fire-in-water light interaction
- Created fire_water_combo.json with 17 simultaneous audio-visual mappings -- the most complex emergent mapping preset (fire_cinema has 11, water_ocean has 8)
- Object namespace isolation (efs_fire_*, efs_water_*, efs_combo_*) allows all three audio presets to target their respective objects without naming conflicts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create combo_fire_water.py** - `0d9c57f` (feat)
2. **Task 2: Create fire_water_combo.json** - `ade31f5` (feat)

## Files Created/Modified
- `blender/scripts/combo_fire_water.py` - Fire-over-water combo scene builder with create_fire_water_scene/apply_combo_audio/bake_fire_water/render_fire_water four-function API
- `blender/presets/fire_water_combo.json` - Merged audio preset with 17 mappings (9 fire + 4 water + 4 combo-specific)

## Decisions Made
- Fire domain raised to (0,0,2.5) and flow to (0,0,0.8) to position fire clearly above the water surface at origin
- Caustic bounce limits increased beyond water_template defaults (16 max vs 12, volume_bounces=4 added) for complex fire-water light interaction
- HDRI strength set to 0.8 (not 1.0) to avoid overpowering the fire's self-illumination
- Combo compositor uses glare threshold 0.85 (between fire's 0.8 and water's 0.9) to bloom both fire hotspots and water specular highlights
- Removed __world__ background mapping from combo preset (HDRI controls world now)
- Removed efs_fire_camera and efs_water_camera lens mappings (combo uses efs_combo_camera)
- Removed efs_water_sun and efs_water_fill mappings (combo uses efs_combo_sun and efs_combo_rim)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 29 (Water & World Building) is now complete with all 3 plans finished
- Fire-over-water combo scene ready for Phase 30 (Mantaflow particles) and Phase 31 (compositing pipeline)
- All three audio presets (fire_cinema, water_ocean, fire_water_combo) can target their respective objects in any combination

## Self-Check: PASSED

- [x] blender/scripts/combo_fire_water.py exists
- [x] blender/presets/fire_water_combo.json exists
- [x] .planning/phases/29-water-world-building/29-03-SUMMARY.md exists
- [x] Commit 0d9c57f found (Task 1)
- [x] Commit ade31f5 found (Task 2)

---
*Phase: 29-water-world-building*
*Completed: 2026-03-20*
