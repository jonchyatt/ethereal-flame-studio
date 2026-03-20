# Phase 33: Integration + Visual Intelligence - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase integrates all v4.0 cinema pipeline components into a cohesive, token-efficient system: CLI harness wrapping validated workflows, batch render queue for overnight processing, end-to-end pipeline demonstration (audio in → rendered video out), and visual intelligence from reference creator analysis applied to template parameters.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — integration/polish phase.

Key constraints:
- CLI harness: Python script (`efs_cli.py`) wrapping 5+ validated workflows as structured commands
  - Commands: create-fire, create-water, create-combo, create-edm, create-luminous, bake, render, render-vr, apply-audio, list-presets
  - Each command maps to the template functions already built (fire_cinema_template, water_template, etc.)
  - Designed for Claude to call via execute_blender_code without writing raw Python
- Batch render: Python script (`batch_render.py`) that queues scenes and renders sequentially
  - Reads a JSON job queue file
  - Renders each scene, saves output, logs errors
  - Can run overnight unattended
  - Progress written to status file for polling
- End-to-end pipeline: orchestration function that chains audio export → scene creation → audio mapping → bake → render
  - `pipeline.py` with `run_pipeline(audio_json, template, preset, quality)` function
- Visual intelligence: Documented perceptual principles from reference creators
  - Fractal detail, emergent complexity, contrast/darkness principle, sync quality, expectation violation
  - Principles applied as parameter recommendations in a `visual_principles.json` config
  - Applied to existing template defaults
- Chrome MCP analysis of UON Visuals deferred to human-interactive session (requires live browser)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (ALL previous phases)
- fire_cinema_template.py — fire scene + compositor + audio
- water_template.py — ocean + foam + audio
- combo_fire_water.py — fire over water
- edm_light_template.py — lasers + LED + dynamic range
- luminous_being_template.py — crown jewel effect
- vr_template.py — stereoscopic VR rendering
- compositor_layers.py — multi-layer compositing
- depth_compositor.py — depth-aware compositing
- keyframe_generator.py — audio to keyframes
- async_bake.py / async_render.py — async operations
- scene_utils.py — shared utilities
- All presets in blender/presets/
- AudioExporter.ts — browser audio analysis

### Integration Points
- efs_cli.py imports all templates and provides unified command interface
- batch_render.py reads job queue and calls render functions
- pipeline.py chains the full workflow
- visual_principles.json provides parameter tuning based on analyzed principles

</code_context>

<specifics>
## Specific Ideas

- CLI harness makes Claude's life easier — call "create-fire draft" instead of writing Python
- Batch rendering enables overnight processing without human supervision
- The end-to-end pipeline is the ultimate demonstration: audio → video with no manual steps
- Visual principles should be concrete parameter values, not abstract descriptions
- Token efficiency: CLI commands are shorter than raw Python, reducing Claude's token usage

</specifics>

<deferred>
## Deferred Ideas

- Web UI for batch render management (could be a Jarvis integration)
- Automatic scene recommendation based on audio classification
- Cloud rendering integration (Sheep-it, Sheepit, render farm)
- Live Chrome MCP analysis of reference creators (requires interactive session)

</deferred>
