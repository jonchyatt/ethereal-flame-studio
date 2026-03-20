# Phase 31: EDM Light Show - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates concert-quality laser and LED effects synced to EDM audio: volumetric laser beams with beat-synced scanning, LED grids with per-column frequency mapping, and dynamic range implementation (darkness during breakdowns, full brightness on drops). These demonstrate the "darkness/contrast principle" — visual impact comes from dynamic range, not constant brightness.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — creative VFX phase.

Key constraints:
- Volumetric laser beams via Cycles volumetric spotlight cones with emission shaders
- Laser sweep animation driven by beat onsets via keyframe_generator.py
- LED grid as array of emission mesh cubes/planes, each column mapped to a frequency band
- 8 frequency bands = 8 LED columns (or more columns with interpolation)
- Dynamic range: RMS energy or onset detection drives global emission multiplier
- Breakdown detection: when RMS drops below threshold for N frames, reduce to 10% emission
- Drop detection: when bass onset fires after breakdown, snap to 100%
- All as reusable template: edm_light_template.py
- Audio preset: edm_lights.json with mappings for lasers + LED + dynamics
- Quality presets apply (laser count, LED resolution, volumetric samples)
- Darkness principle: scene starts dark, effects are the only light source (no ambient)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- keyframe_generator.py — audio JSON to Blender keyframes
- All existing presets (meditation, edm, cinematic, fire_cinema, water_ocean, fire_water_combo)
- fire_cinema_template.py pattern — four-function API
- scene_utils.py, async_bake.py, async_render.py
- AudioExporter.ts — 37 audio features including onsets, RMS, spectral centroid

### Integration Points
- keyframe_generator maps beat onsets to laser rotation keyframes
- Frequency band amplitudes map to LED column emission values
- RMS energy drives global emission multiplier for dynamic range
- Compositor can add lens flare/glow on bright laser points

</code_context>

<specifics>
## Specific Ideas

- Lasers scan across scene, changing sweep speed/direction on beats
- LED grid shows frequency spectrum visually (bass left, treble right)
- Breakdown = darkness (10% emission), drop = full brightness snap
- This is about the CONTRAST between light and dark, not constant brightness
- Concert/festival aesthetic — fog, volumetric light, visible beams

</specifics>

<deferred>
## Deferred Ideas

- DMX protocol output for controlling real concert lighting hardware
- Strobe effects (seizure risk — would need warning/configuration)
- Moving head fixture simulation (complex rigging)
- Crowd/audience simulation

</deferred>
