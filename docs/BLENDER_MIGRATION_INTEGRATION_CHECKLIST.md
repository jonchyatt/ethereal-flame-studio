# Blender Migration and Integration Checklist

Purpose: consolidate all Blender migration and integration notes into one actionable checklist.

Last consolidated: 2026-02-19

## 1) Scope and Architecture Lock

- [ ] Confirm hybrid architecture as project standard.
- [ ] Keep Three.js as the interactive runtime for live preview, audio reactivity, and user controls.
- [ ] Use Blender for reference renders, 8K final output, pre-rendered loops, and raytraced water reflections.
- [ ] Confirm shader portability approach per effect:
  - [ ] Run Three.js headless with native GPU for direct GLSL rendering where feasible.
  - [ ] Rewrite selected effects in Blender node graphs where visual quality requires it.
  - [ ] Treat Blender EEVEE custom GLSL as experimental only.

## 2) Migration Decision Checklist (What Moves to Blender)

- [ ] Fire orb high-quality lookdev references.
- [ ] Water final reflection pass (Cycles).
- [ ] Marketing/portfolio stills and short loops.
- [ ] 8K stereoscopic 360 final render path.
- [ ] Particle pass strategy for final renders:
  - [ ] Option A: import particle positions from Three.js.
  - [ ] Option B: recreate particles in Blender Geometry Nodes.
  - [ ] Option C: render particles separately and composite in Blender/post.

## 3) Keep in Three.js (Do Not Migrate)

- [ ] Real-time preview canvas and controls.
- [ ] Live audio-reactive behavior.
- [ ] Mobile/browser delivery path.
- [ ] Template preview and fast iteration loop.

## 4) Blender Scene Template Build

- [ ] Create Blender base scene template aligned to web scene scale.
- [ ] Add water plane setup for final renders:
  - [ ] Plane position aligned to web scene (Y = -0.8 parity target).
  - [ ] Ocean Modifier configured for shallow water profile.
  - [ ] Water material baseline (Principled BSDF, roughness/IOR tuning).
- [ ] Create orb/energy node setup template for repeatable shots.
- [ ] Save reusable lighting/camera presets for 360 stereo output.

## 5) Water Pipeline Integration

- [ ] Keep current Three.js water shader for runtime preview.
- [ ] Add near-term runtime improvements:
  - [ ] Water normal map support.
  - [ ] Fresnel-based reflectivity.
  - [ ] Reflection method evaluation (Water class vs Reflector).
- [ ] Define Blender final-water workflow:
  - [ ] Ocean + Cycles render for final quality.
  - [ ] Particle reflection integration method selected.
  - [ ] Composite strategy documented and repeatable.

## 6) Fire/Orb Pipeline Integration

- [ ] Use Blender renders as visual targets for orb quality calibration.
- [ ] Document visual characteristics to match in Three.js:
  - [ ] Blackbody-style center-to-edge color behavior.
  - [ ] Turbulence/noise character.
  - [ ] Fresnel-style edge glow.
- [ ] Decide per deliverable:
  - [ ] Interactive output: enhanced Three.js path.
  - [ ] Non-interactive high-fidelity output: Blender pre-render loop/pass.

## 7) Export and Render Pipeline

- [ ] Finalize 8K stereo 360 render settings in Blender.
- [ ] Build Blender-to-FFmpeg pipeline for encoded deliverables.
- [ ] Keep/align metadata injection step for 360/stereo compatibility.
- [ ] Verify output targets:
  - [ ] 1080p/4K flat exports.
  - [ ] 360 monoscopic export.
  - [ ] 360 stereoscopic 8K export.

## 8) Validation and Acceptance

- [ ] Define visual parity checklist between Three.js preview and Blender finals.
- [ ] Add quality gates:
  - [ ] Water reflections present and stable.
  - [ ] Orb look meets reference target.
  - [ ] No pipeline regressions in render queue/automation.
- [ ] Run end-to-end test: source scene -> final encoded publish-ready asset.

## 9) Phase Mapping (from Existing Project Notes)

- [ ] Phase 2: recording/export pipeline hardening.
- [ ] Phase 3: Blender integration for 8K rendering.
- [ ] Phase 4: automation integration.
- [ ] Phase 5: polish and mobile optimization.

## 10) Source Notes Consolidated

- `CURRENT_STATUS.md`
  - Future phases include Blender integration for 8K rendering.
- `docs/COMPLETE_PROJECT_SPECIFICATION.md`
  - Part 11 "Blender Integration Strategy" and hybrid architecture guidance.
  - Shader portability constraints and integration options.
  - Rebuild/render checklist includes 360 stereoscopic 8K output target.
- `.planning/research/BLENDER_FIRE_ORB.md`
  - Recommends Blender for high-quality references/pre-renders while retaining Three.js for interactive runtime.
  - Provides Option A/B/C implementation tradeoffs.
- `.planning/research/BLENDER_WATER.md`
  - Recommends Blender offline workflow for 8K final water quality.
  - Documents export constraints and near-term/future integration tasks.
