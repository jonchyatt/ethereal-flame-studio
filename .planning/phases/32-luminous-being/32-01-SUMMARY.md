---
phase: 32-luminous-being
plan: 01
subsystem: blender-pipeline
tags: [sam2, segmentation, opencv, mesh, shape-keys, blender-python, torch]

# Dependency graph
requires:
  - phase: 26-blender-foundation
    provides: scene_utils.py (REPO_ROOT, MASKS_DIR, get_or_create_object, save_before_operate)
  - phase: 28-fire-cinema
    provides: efs_ naming convention, fire_cinema_template.py pattern reference
provides:
  - sam_segmenter.py for video-to-mask-PNG segmentation via SAM 2.1
  - mask_to_mesh.py for mask-PNG-to-Blender-mesh conversion with shape keys
  - efs_lumi_body mesh proxy ready for particle, flow, and volumetric attachment
affects: [32-02-PLAN (luminous being template needs body mesh), 32-03-PLAN (audio mapping needs mesh targets)]

# Tech tracking
tech-stack:
  added: [segment-anything-2 (SAM 2.1), torch, opencv-python]
  patterns: [two-step preprocessing pipeline (system Python + Blender Python), cv2 fallback to bpy image loading, shape key animation driven by frame number, contour simplification via approxPolyDP]

key-files:
  created:
    - blender/scripts/sam_segmenter.py
    - blender/scripts/mask_to_mesh.py
  modified: []

key-decisions:
  - "Two-step pipeline: sam_segmenter.py runs in system Python (torch), mask_to_mesh.py runs in Blender Python (bpy) -- clean separation of concerns"
  - "SAM 2.1 video propagation for temporal consistency instead of per-frame independent segmentation"
  - "cv2 primary with bpy fallback for contour extraction -- works regardless of Blender Python having opencv installed"
  - "Shape key drivers with triangular window expression for smooth interpolation between sampled frames"
  - "Frame-adaptive sampling: if >100 frames, auto-sample every Nth frame to cap shape key count at 100"

patterns-established:
  - "Preprocessing scripts (no bpy) live alongside Blender scripts in blender/scripts/ but are clearly marked as standalone"
  - "efs_lumi_* naming namespace for Luminous Being objects (consistent with efs_fire_*, efs_edm_*)"
  - "Quality presets for mesh complexity: draft (500v), preview (1000v), production (2000v)"

requirements-completed: [LUMI-01]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 32 Plan 01: SAM Segmentation + Mask-to-Mesh Pipeline Summary

**SAM 2.1 video segmentation script and mask-to-mesh Blender converter creating efs_lumi_body animated proxy from video of a person**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T05:26:40Z
- **Completed:** 2026-03-20T05:31:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- SAM 2.1 video segmentation script with temporal propagation across frames (not per-frame independent)
- Mask-to-mesh converter with shape keys driven by frame number for animated body deformation
- Complete two-step pipeline: video -> mask PNGs -> efs_lumi_body Blender mesh with Solidify, particle slot, material slot
- Fallback path for environments without opencv (bpy-based edge detection)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SAM 2.1 video segmentation script** - `8ff7764` (feat)
2. **Task 2: Create mask-to-mesh converter for Blender** - `8307bc0` (feat)

## Files Created/Modified
- `blender/scripts/sam_segmenter.py` - Standalone SAM 2.1 person segmenter (system Python, no bpy) with CLI, video/frame input, morphological smoothing, JSON progress reporting
- `blender/scripts/mask_to_mesh.py` - Blender Python mask-to-mesh converter creating efs_lumi_body with shape keys, Solidify modifier, particle system slot, hidden from render

## Decisions Made
- Two-step pipeline architecture: preprocessing in system Python (torch/SAM), mesh creation in Blender Python (bpy) -- different runtime requirements
- SAM 2.1 video propagation for temporal consistency rather than per-frame segmentation -- prevents flickering and lost limbs
- cv2 as primary contour extraction with bpy fallback -- ensures script works in any Blender Python environment
- Shape key count capped at 100 with triangular window drivers for smooth interpolation between sampled frames
- Largest-area heuristic for automatic person detection with optional point_prompt override

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. SAM 2.1 model auto-downloads on first use.

## Next Phase Readiness
- Body proxy mesh (efs_lumi_body) is ready for luminous_being_template.py (32-02) to attach volumetric fill, particles, fire wisps, and corona
- Shape keys provide animated deformation that downstream effects will inherit
- Particle system slot is empty, ready for configuration by template
- Material slot has placeholder, ready for Principled Volume replacement

## Self-Check: PASSED

- [x] blender/scripts/sam_segmenter.py exists
- [x] blender/scripts/mask_to_mesh.py exists
- [x] Commit 8ff7764 exists (Task 1)
- [x] Commit 8307bc0 exists (Task 2)

---
*Phase: 32-luminous-being*
*Completed: 2026-03-20*
