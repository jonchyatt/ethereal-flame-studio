---
phase: 27-audio-bridge
plan: 02
subsystem: blender-pipeline
tags: [keyframe-generator, bpy, audio-to-blender, mapping-presets, mantaflow, principled-volume]

# Dependency graph
requires:
  - phase: 27-audio-bridge-01
    provides: "Audio JSON export format (37 features, frames array, classification)"
  - phase: 26-mcp-bridge
    provides: "scene_utils.py, fire_orb_poc.py object names, save_before_operate pattern"
provides:
  - "keyframe_generator.py: audio JSON to Blender keyframe pipeline"
  - "Preset CRUD system (list, load, save, delete, create)"
  - "3 mapping presets: Meditation (9 mappings), EDM (10 mappings), Cinematic (10 mappings)"
  - "8 data path patterns covering 10 visual parameters"
  - "resolve_target() for Fluid domain/flow, material nodes, lights, camera, world background"
affects: [future-blender-pipeline, audio-reactive-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: ["resolve_target() pattern for Blender data path routing", "preset-driven audio-visual mapping", "0-to-1 frame offset for Blender compatibility", "color temperature RGB interpolation"]

key-files:
  created:
    - blender/scripts/keyframe_generator.py
    - blender/presets/meditation.json
    - blender/presets/edm.json
    - blender/presets/cinematic.json
  modified: []

key-decisions:
  - "resolve_target() returns (obj, set_fn, keyframe_fn) tuple pattern instead of exec() for safety"
  - "Color temp mapped via interpolated RGB ramp (1500K red to 6500K white) rather than Blender color management"
  - "Interpolation set globally after each keyframe via action FCurve scan (Blender API limitation)"
  - "Presets resolve targets upfront (fail fast) before entering frame loop"

patterns-established:
  - "Preset-driven mapping: JSON preset defines source_feature -> target_object.data_path with scale/offset/clamp"
  - "resolve_target() routes 8 data path patterns to typed (set_fn, keyframe_fn) closures"
  - "Frame offset: blender_frame = audio_frame['frame'] + 1 (0-based to 1-based)"

requirements-completed: [AUD4-03, AUD4-04, AUD4-05]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 27 Plan 02: Audio Bridge - Keyframe Generator Summary

**Python keyframe generator with 8 data path patterns, preset CRUD, and 3 shipped presets (Meditation/EDM/Cinematic) mapping 8+ audio features to 8+ visual parameters**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T03:09:55Z
- **Completed:** 2026-03-20T03:13:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built keyframe_generator.py with complete audio JSON to Blender keyframe pipeline -- reads Plan 01 export format and drives scene animations
- Implemented resolve_target() routing 8 data path patterns (fluid domain/flow, material nodes, light energy/color, camera lens/shift, world background, particles)
- Full preset CRUD: list_presets, load_preset, save_preset, delete_preset, create_preset
- 3 presets with distinct strategies: Meditation (envelope-driven, all Bezier), EDM (onset/bass-driven, Constant for hits), Cinematic (dynamics/chromagram-driven)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create keyframe_generator.py with mapping engine and preset CRUD** - `86dd501` (feat)
2. **Task 2: Create 3 example presets (Meditation, EDM, Cinematic)** - `6449f13` (feat)

## Files Created/Modified
- `blender/scripts/keyframe_generator.py` - Audio JSON to Blender keyframe pipeline with preset CRUD, 8 data path patterns, resolve_target routing, Bezier/Constant/Linear interpolation
- `blender/presets/meditation.json` - 9 mappings, envelope-driven, sub-bass/centroid dominated, all Bezier
- `blender/presets/edm.json` - 10 mappings, onset/bass-driven, Constant for sharp hits, stereo width for camera
- `blender/presets/cinematic.json` - 10 mappings, crest_factor/chromagram/spectral_contrast-driven, L/R balance for camera shift

## Decisions Made
- Used resolve_target() returning (set_fn, keyframe_fn) closures instead of exec() for safety -- each data path pattern gets typed handling
- Color temperature mapping uses custom RGB interpolation ramp (1500K deep red to 6500K white) rather than Blender's color management system
- Interpolation types set via global FCurve scan after keyframe insertion (Blender API does not expose per-keyframe interpolation at insert time)
- Targets resolved upfront before frame loop (fail fast on missing objects rather than mid-processing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete audio-to-Blender pipeline: browser exports JSON (Plan 01) -> keyframe_generator reads it and drives Blender animations (Plan 02)
- Claude can create custom presets via create_preset() for any audio style
- Auto-classification from audio JSON enables zero-config preset selection
- Pipeline ready for end-to-end testing: upload audio in browser -> export JSON -> apply_audio_keyframes() in Blender via MCP

## Self-Check: PASSED

All files exist and all commits verified:
- blender/scripts/keyframe_generator.py: FOUND
- blender/presets/meditation.json: FOUND
- blender/presets/edm.json: FOUND
- blender/presets/cinematic.json: FOUND
- .planning/phases/27-audio-bridge/27-02-SUMMARY.md: FOUND
- Commit 86dd501 (Task 1): FOUND
- Commit 6449f13 (Task 2): FOUND

---
*Phase: 27-audio-bridge*
*Completed: 2026-03-20*
