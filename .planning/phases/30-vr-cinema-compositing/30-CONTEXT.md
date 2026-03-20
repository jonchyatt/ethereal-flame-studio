# Phase 30: VR Cinema + Compositing - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds 8K stereoscopic VR rendering from Blender (panoramic camera, equirectangular output, VR spatial metadata), a multi-layer compositor for combining render passes, and depth-aware compositing for overlaying virtual effects on real 360 footage.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — technical infrastructure phase.

Key constraints:
- Blender panoramic camera with equirectangular_stereo projection for VR output
- Resolution: 8192x4096 (8K stereo equirectangular) at production quality
- Quality presets apply: draft (2048x1024), preview (4096x2048), production (8192x4096)
- VR metadata injection via spatial-media-metadata-injector (Google's open-source tool) or ffmpeg
- YouTube VR requires specific metadata tags (spherical video V2 format)
- IPD (interpupillary distance) = 64mm (human average, safe default)
- No camera motion in VR (causes nausea) — static camera with look-around only
- Multi-layer compositor: Render Layers node per element (fire, water, effects), each on separate render layer
- Mix nodes with alpha-over compositing for layered control
- Depth-aware compositing: depth map input (from Video Depth Anything or Blender Z-pass) used for occluding effects behind foreground objects
- All as reusable Python functions: vr_template.py, compositor_layers.py
- VR template: create_vr_camera(), render_vr_stereo(), inject_vr_metadata()
- Compositor: setup_multi_layer(), add_render_pass(), composite_with_depth()

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- fire_cinema_template.py — fire scene with compositor
- water_template.py — water scene with compositor
- combo_fire_water.py — composing multiple templates
- async_render.py — async Cycles render
- scene_utils.py — save_before_operate, get_or_create_object
- quality_presets.json — 4-tier configuration

### Integration Points
- VR camera replaces standard camera in any template
- Multi-layer compositor extends existing compositor setups
- Depth compositing reads Z-pass from Cycles or external depth maps
- vr_template.py callable from any scene template

</code_context>

<specifics>
## Specific Ideas

- 8K stereo equirectangular is the standard for high-quality VR video
- YouTube VR requires spatial-media metadata (spherical video V2)
- Meta Quest and other headsets require proper left/right eye separation
- Static camera only in VR — movement causes motion sickness
- Depth-aware occlusion is the key compositing innovation for mixed reality
- Multi-layer compositor enables per-element control (adjust fire intensity without re-rendering water)

</specifics>

<deferred>
## Deferred Ideas

- Interactive VR (real-time rendering, head tracking) — needs game engine, not Blender
- Ambisonic spatial audio for VR — separate audio domain
- Hand tracking / controller interaction — game engine scope
- Live 360 camera feed compositing — real-time pipeline, not offline render

</deferred>
