---
phase: 31-edm-light-show
plan: 01
subsystem: blender-scripting
tags: [blender, cycles, volumetric, laser, led, emission, compositor, edm, concert]

# Dependency graph
requires:
  - phase: 26-blender-pipeline
    provides: scene_utils.py (get_or_create_object, save_before_operate, RENDERS_DIR), fire_cinema_template.py (load_quality_preset, four-function API pattern), quality_presets.json
provides:
  - "edm_light_template.py: EDM light show scene builder with volumetric lasers, LED grid, fog, camera, compositor"
  - "create_edm_scene() / apply_edm_audio() / render_edm() four-function API"
  - "4 laser spotlights (efs_edm_laser_0..3) with volumetric beam visibility"
  - "8 LED emission cubes (efs_edm_led_0..7) with per-column frequency-band materials"
  - "Ground fog volume (efs_edm_fog) for laser scattering medium"
  - "Total darkness scene (world Strength 0.0) implementing darkness/contrast principle"
affects: [31-02-PLAN (audio keyframe mapping for lasers and LEDs)]

# Tech tracking
tech-stack:
  added: []
  patterns: [world Volume Scatter for atmospheric laser beams, per-object emission materials for LED grid, total darkness scene principle]

key-files:
  created:
    - blender/scripts/edm_light_template.py
  modified: []

key-decisions:
  - "World Volume Scatter (density=0.02, anisotropy=0.3) plus dedicated fog cube (density=0.03, anisotropy=0.6) for dual-layer laser visibility"
  - "LED colors as bass-to-treble gradient (warm red left to cool violet right) for intuitive frequency visualization"
  - "500W laser energy for bright volumetric beams through fog; 10.0 emission strength default for LEDs (both keyframeable)"
  - "24mm wide-angle concert camera at front-of-house position to frame both laser ceiling and LED wall"
  - "Bloom threshold 0.5 (lower than fire 0.8 / water 0.9) for heavy laser/LED flare effects"

patterns-established:
  - "Total darkness principle: world Strength=0.0 with effects as sole illumination"
  - "Dual-layer fog: world Volume Scatter for general atmosphere + dedicated fog volume for focused scattering zones"
  - "Per-column LED materials: independent emission shaders for per-frequency-band audio keyframing"

requirements-completed: [EDM-01, EDM-02, EDM-03]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 31 Plan 01: EDM Light Show Template Summary

**Concert-venue scene builder with 4 volumetric laser spotlights, 8-column LED frequency grid, dual-layer fog, total darkness world, and heavy-bloom compositor**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T05:06:54Z
- **Completed:** 2026-03-20T05:10:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created complete EDM light show scene template following the established four-function API pattern (create_edm_scene / apply_edm_audio / render_edm)
- 4 laser spotlights (red/green/blue/magenta) at 500W with tight 0.15-radian spot cones, positioned at venue ceiling with fan-out Z rotations
- 8 LED emission cubes in bass-to-treble color gradient with independent per-column materials (Emission Strength=10.0, ready for audio keyframing)
- Dual-layer volumetric fog: world Volume Scatter (density=0.02) for general atmosphere + ground fog cube 20x20x3 (density=0.03, anisotropy=0.6) for pronounced laser beam visibility
- Total darkness scene (world Strength=0.0) implementing the darkness/contrast principle -- lasers and LEDs are the only illumination
- Concert camera at 24mm wide angle with f/4.0 DOF and Track To constraint targeting center of laser/LED action
- Compositor with low-threshold bloom (FOG_GLOW, threshold=0.5, size=8) and subtle cool color tint

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EDM light show template with lasers, LED grid, and concert scene** - `728483e` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `blender/scripts/edm_light_template.py` - Complete EDM light show scene builder with four-function API, 785 lines

## Decisions Made

- World Volume Scatter (density=0.02, anisotropy=0.3) plus dedicated fog cube (density=0.03, anisotropy=0.6) for dual-layer laser visibility -- world volume provides general atmospheric haze while the fog cube adds denser scattering near the floor where lasers are most visible
- LED colors as bass-to-treble gradient (warm red left to cool violet right) for intuitive frequency visualization when audio keyframes are applied in Plan 02
- 500W laser energy ensures bright volumetric beams through fog; 10.0 emission strength for LEDs as default (both will be keyframed by audio)
- Bloom threshold 0.5 (lower than fire 0.8 / water 0.9) because laser/LED emission points should bloom heavily as the primary visual effect
- 24mm wide-angle lens to capture both the laser ceiling and LED wall in a single concert-venue composition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scene template ready for Plan 02: audio keyframe mapping preset for laser sweep and LED frequency visualization
- All LED materials have independent emission strength (keyframeable per-column)
- Laser Z rotations ready for audio-driven sweep animation
- No bake needed -- can go directly from create_edm_scene() -> apply_edm_audio() -> render_edm()

## Self-Check: PASSED

- FOUND: blender/scripts/edm_light_template.py
- FOUND: .planning/phases/31-edm-light-show/31-01-SUMMARY.md
- FOUND: commit 728483e

---
*Phase: 31-edm-light-show*
*Completed: 2026-03-20*
