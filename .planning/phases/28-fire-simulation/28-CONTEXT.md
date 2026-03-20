# Phase 28: Fire Simulation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates a production-grade Mantaflow fire simulation system with audio-reactive behavior, configurable quality presets (Draft/Preview/Production/Ultra), Cycles compositor effects (bloom, motion blur), and reusable Python templates. The fire must visibly exceed the Three.js Solar Breath mode in quality and demonstrate audio-reactive intensity/color shifts.

</domain>

<decisions>
## Implementation Decisions

### Quality Presets (Configurable, NOT Fixed)
- 4 quality tiers, all selectable at runtime:
  - Draft: resolution 64, noise x2, 30 frames (laptop, fast iteration)
  - Preview: resolution 128, noise x2, 90 frames (decent quality, quick)
  - Production: resolution 256, noise x4, 150 frames (cinema quality)
  - Ultra: resolution 512, noise x4, 300 frames (high-end GPU, maximum detail)
- Quality preset is a parameter to the template function, not a hardcoded choice
- Resolution ladder from Phase 26 is the foundation

### Audio-Reactive Fire
- Uses keyframe_generator.py from Phase 27 with audio analysis JSON
- Bass amplitude drives Flow fuel_amount (fire intensity)
- Spectral centroid drives Blackbody temperature (color shifts: deep red → bright yellow-white)
- Onset detection drives brief fuel spikes (bass hits → flame bursts)
- Envelope followers provide smooth animation curves between hits
- At minimum: 8 audio features mapped to fire/material/light parameters simultaneously

### Compositor Effects
- Cycles render with compositor node setup for:
  - Glare node (bloom/glow on bright fire areas)
  - Motion blur via Vector Blur node (or Cycles motion blur)
  - Color grading (slight warm tint, contrast boost)
- Compositor setup as a reusable function, not manual node wiring

### Template Architecture
- Reusable `fire_cinema_template.py` in blender/scripts/
- Follows same pattern as fire_orb_poc.py (create scene → bake → render)
- Takes quality_preset, audio_json_path, mapping_preset as parameters
- Multi-scale fire: vorticity + noise upres + dissolve + turbulence for large billows, mid turbulence, fine edge wisps

### Blender Version
- Must work on Blender 4.5.8 LTS (validated in Phase 26)
- Remember: free_all() and bake must be in separate timer callbacks (race condition fix from Phase 26)

### Claude's Discretion
- Exact Mantaflow parameter values for multi-scale detail (vorticity, dissolve time, noise settings)
- Compositor node graph layout and parameter tuning
- Camera placement and lighting for best fire showcase
- Exact mapping between audio features and visual parameters beyond the core bass/centroid ones
- Whether to use Cycles motion blur or Vector Blur node
- Sample count per quality tier

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `blender/scripts/fire_orb_poc.py` — Phase 26 POC. create_fire_orb_scene(), bake_fire_orb(), render_fire_orb(). Resolution 64, basic material, no compositor.
- `blender/scripts/keyframe_generator.py` — Phase 27. apply_audio_keyframes(), CRUD presets, resolve_target(), 8 data path patterns.
- `blender/scripts/async_bake.py` — Async bake with race condition fix (separate free + bake timer callbacks).
- `blender/scripts/async_render.py` — Async Cycles render via INVOKE_DEFAULT.
- `blender/scripts/scene_utils.py` — save_before_operate, get_or_create_object, set_cache_directory, full_scene_info.
- `blender/presets/meditation.json`, `edm.json`, `cinematic.json` — Mapping preset examples.

### Established Patterns
- Three-function API: create_scene() → bake() → render() (fire_orb_poc.py)
- Async timer pattern for bakes (0.1s delay), INVOKE_DEFAULT for renders
- Status polling via .efs_status.json
- Objects named with efs_ prefix for idempotent creation
- Principled Volume + Blackbody for fire material

### Integration Points
- keyframe_generator.py's apply_audio_keyframes() drives all audio-reactive behavior
- Quality presets parallel the mapping presets structure (JSON in blender/presets/)
- fire_cinema_template.py supersedes fire_orb_poc.py as the production fire scene builder

</code_context>

<specifics>
## Specific Ideas

- The fire must show multi-scale detail: large billowing flames, mid-scale turbulence, AND fine wisps at edges
- Side-by-side with Three.js Solar Breath should show "different quality class"
- Audio sync must be VISIBLE (bass hit → fire flare, quiet → calm embers)
- Color shifts must be VISIBLE (spectral centroid → Blackbody temperature range)
- Compositor bloom should make bright fire areas glow naturally
- All quality levels should be testable without code changes (just pass different preset name)

</specifics>

<deferred>
## Deferred Ideas

- Multi-emitter fire (multiple flow objects for layered effects) — Phase 32 Luminous Being scope
- Fire particles/sparks system — Phase 32 scope
- Fire interaction with geometry (fire wrapping around objects) — Phase 32 scope
- Real-time fire preview in viewport — not feasible with Mantaflow

</deferred>
