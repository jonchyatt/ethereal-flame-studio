# Phase 29: Water + World Building - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds water simulation (Ocean Modifier with audio-reactive waves), fire-over-water combo scene, HDRI environment lighting via Poly Haven, and 3D asset placement from Sketchfab/AI generators. These capabilities transform bare-background VFX demos into rich, contextual scenes.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — creative/technical phase.

Key constraints:
- Ocean Modifier for water (not Mantaflow flip fluid — simpler, faster, audio-driven via keyframes)
- Audio treble/high frequencies drive wave scale/choppiness via keyframe_generator.py
- Fire-over-water scene combines fire_cinema_template.py with ocean surface below
- Caustic reflections via Cycles Light Paths (caustics enabled, glass shader on water)
- Foam via Ocean Modifier foam data + particle system driven by foam vertex group
- Poly Haven HDRIs loaded via blender-mcp's polyhaven integration (already available as MCP tool)
- 3D assets from Sketchfab via blender-mcp's sketchfab integration (already available)
- AI-generated assets via blender-mcp's Hyper3D/Hunyuan integration (already available)
- All features as reusable Python functions (same pattern as fire_cinema_template.py)
- Quality presets apply to water simulation too (draft/preview/production/ultra)
- Water template: `water_template.py` with create_ocean(), apply_audio_waves(), render_water()
- World template: `world_template.py` with setup_hdri(), place_asset()
- Fire-over-water combo: `combo_fire_water.py` combining both templates

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- fire_cinema_template.py — fire scene creation, compositor, audio mapping
- keyframe_generator.py — audio JSON to Blender keyframes, preset CRUD
- scene_utils.py — save_before_operate, get_or_create_object, set_cache_directory
- async_bake.py / async_render.py — async patterns
- blender-mcp tools: polyhaven (HDRIs), sketchfab (3D assets), hyper3d/hunyuan (AI gen)
- quality_presets.json — 4-tier quality configuration

### Integration Points
- keyframe_generator.py maps audio features to ocean modifier params (scale, choppiness)
- fire_cinema_template.py provides fire scene that sits above water surface
- blender-mcp MCP tools for asset download (already registered)

</code_context>

<specifics>
## Specific Ideas

- Water responds to audio TREBLE (high frequencies drive wave activity), not bass
- Fire-over-water is a combo scene — fire floating above reflective water surface
- Caustic reflections of fire in water are a key visual requirement
- Poly Haven HDRI replaces black void — photorealistic sky and environment
- 3D assets provide environmental context (rocks, terrain, objects)
- Everything configurable and reusable

</specifics>

<deferred>
## Deferred Ideas

- Mantaflow flip fluid simulation (too heavy, ocean modifier is sufficient)
- Procedural landscape generation via Geometry Nodes (WRLD-03, not in this phase)
- Underwater rendering / camera below water surface
- Rain/weather particle systems

</deferred>
