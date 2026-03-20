---
phase: 30-vr-cinema-compositing
plan: 03
subsystem: blender-scripting
tags: [depth-compositing, occlusion, z-pass, depth-map, mixed-reality, vr, blender-python]

# Dependency graph
requires:
  - phase: 30-vr-cinema-compositing
    provides: "compositor_layers.py multi-layer compositor API (Plan 02)"
  - phase: 28-fire-cinema-pipeline
    provides: "scene_utils.py save_before_operate, RENDERS_DIR"
provides:
  - "Depth-aware compositing: virtual effects occluded by real foreground objects via per-pixel depth comparison"
  - "External depth map loading (Video Depth Anything image sequences or single images)"
  - "Z-pass extraction from Blender Cycles renders to OpenEXR"
  - "Single-call convenience function for common depth compositing workflow"
affects: [future-mixed-reality-scenes, vr-360-compositing]

# Tech tracking
tech-stack:
  added: []
  patterns: [depth-comparison-occlusion, z-pass-extraction, footage-background-plate, soft-edge-depth-blending]

key-files:
  created:
    - blender/scripts/depth_compositor.py
  modified:
    - blender/scripts/compositor_layers.py

key-decisions:
  - "LESS_THAN math node for depth comparison: effects_depth < footage_depth = visible, >= = occluded"
  - "Gaussian blur on depth mask for soft edge transitions (resolution-independent blend_width parameter)"
  - "OpenEXR format for Z-pass output: preserves 32-bit float depth precision"
  - "Camera clip_start..clip_end used for Z-pass normalization range"

patterns-established:
  - "Depth comparison chain: normalize Z-pass -> LESS_THAN compare -> optional blur -> SetAlpha mask -> AlphaOver composite"
  - "External depth map loading with MapRange normalization for tool-agnostic input"
  - "Single-call convenience wrappers that compose lower-level functions (composite_with_depth_simple)"

requirements-completed: [COMP-02, COMP-03]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 30 Plan 03: Depth-Aware Compositor Summary

**Depth-aware compositing with per-pixel occlusion masks from depth comparison, external depth map loading (Video Depth Anything), Z-pass extraction to OpenEXR, and soft edge blending for mixed-reality VR compositing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T04:55:31Z
- **Completed:** 2026-03-20T04:58:27Z
- **Tasks:** 1
- **Files created:** 1
- **Files modified:** 1

## Accomplishments
- Created depth_compositor.py with 4 public functions (547 lines): setup_footage_background, load_depth_map, composite_with_depth, composite_with_depth_simple
- Core depth comparison chain: normalize effects Z-pass -> LESS_THAN compare against footage depth -> Gaussian blur for soft edges -> SetAlpha mask -> AlphaOver onto real footage
- External depth map support: loads Video Depth Anything output as image sequences or single images with MapRange normalization
- Added extract_z_pass() to compositor_layers.py for Blender-side depth extraction to OpenEXR (32-bit float, ZIP compression)
- Supports both flat and equirectangular 360 footage for VR mixed-reality compositing
- Single-call convenience function (composite_with_depth_simple) composes the full pipeline in one call

## Task Commits

Each task was committed atomically:

1. **Task 1: Create depth_compositor.py with depth-aware compositing and add Z-pass helper to compositor_layers.py** - `f886c48` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `blender/scripts/depth_compositor.py` - Depth-aware compositor: setup_footage_background, load_depth_map, composite_with_depth, composite_with_depth_simple
- `blender/scripts/compositor_layers.py` - Added extract_z_pass() for Z-pass extraction to OpenEXR

## Decisions Made
- LESS_THAN math node for per-pixel depth comparison (effect closer than footage = visible, farther = occluded)
- Gaussian blur on depth mask with resolution-independent blend_width parameter for soft edge transitions
- OpenEXR format for Z-pass file output preserves 32-bit float depth precision
- Camera clip_start..clip_end range used to normalize Z-pass depth values to 0..1
- MapRange passthrough (0-1 to 0-1) as default for depth maps assumes Video Depth Anything normalized output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 30 (VR Cinema Compositing) is now complete: all 3 plans delivered
- VR camera (Plan 01), multi-layer compositor (Plan 02), and depth-aware compositor (Plan 03) form a complete VR production pipeline
- Depth-aware compositing ready for mixed-reality workflows: virtual fire/effects behind real objects in 360 footage
- Tested via AST parsing and grep verification (Blender runtime verification deferred to integration)

---
*Phase: 30-vr-cinema-compositing*
*Completed: 2026-03-20*
