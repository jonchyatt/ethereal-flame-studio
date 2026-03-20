# Phase 32: Luminous Being - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates the crown jewel effect: transforming a person in video into a glowing being of light with audio-reactive volumetric fill, particles, fire wisps, and corona glow. Requires video segmentation (SAM 2.1), body mesh creation from masks, volumetric material, particle systems, Mantaflow fire from body mesh, and corona edge glow — all audio-reactive via keyframe_generator.py.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — creative VFX crown jewel phase.

Key constraints:
- Person segmentation via SAM 2.1 (Segment Anything Model) or similar mask extraction tool
- Masks → body mesh in Blender (image sequence to mesh proxy via alpha)
- Volumetric glow fill: Principled Volume on body mesh with audio-reactive density/emission
- Particles from body surface: 3 modes matching Three.js orb (Flame=upward drift, Mist=soft dispersion, Solar Breath=radial pulse)
- Mantaflow fire wisps: body mesh as Flow source, small-scale fire emanating from silhouette
- Corona edge glow: compositor effect or Fresnel-based emission shader on edge
- All layers composited via compositor_layers.py (multi-layer system from Phase 30)
- Audio mapping: per-layer frequency separation (bass=volumetric, mid=particles, treble=corona, onsets=fire bursts)
- Reusable template: luminous_being_template.py
- Audio preset: luminous_being.json
- Quality presets apply to particle count, fire resolution, render samples
- SAM 2.1 integration: Python script that generates mask sequences from video frames (can run as preprocessing step, doesn't need to be in Blender)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- fire_cinema_template.py — Mantaflow fire with audio mapping (fire wisps from body mesh)
- compositor_layers.py — multi-layer compositor for combining all effect layers
- depth_compositor.py — depth-aware compositing for real footage overlay
- keyframe_generator.py — audio JSON to keyframes with preset CRUD
- edm_light_template.py — emission-based effects, particle systems
- All existing presets and quality tiers

### Integration Points
- compositor_layers.py combines volumetric fill + particles + fire + corona as separate render passes
- depth_compositor.py enables the effect to work over real video footage
- keyframe_generator.py drives all audio-reactive behavior
- vr_template.py enables VR viewing of the luminous being effect

</code_context>

<specifics>
## Specific Ideas

- This is the CROWN JEWEL — the most impressive single effect in the entire pipeline
- Person literally glows with light, fire, and particles — "being of light"
- Each visual layer responds to different audio frequency range for emergent complexity
- The 3 particle modes match existing Three.js orb modes (Flame, Mist, Solar Breath)
- Must work on real video of a person (not just 3D models)
- SAM 2.1 provides the segmentation, but mask-to-mesh conversion is the key bridge

</specifics>

<deferred>
## Deferred Ideas

- Real-time luminous being (needs game engine, not offline Blender render)
- Multiple people tracking simultaneously
- Full body motion capture / animation from video
- Face-specific effects (eyes glowing, etc.)
- Clothing simulation interaction with fire

</deferred>
