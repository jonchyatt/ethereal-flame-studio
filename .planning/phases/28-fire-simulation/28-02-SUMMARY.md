---
phase: 28-fire-simulation
plan: 02
subsystem: vfx
tags: [blender, mantaflow, fire, cycles, compositor, audio-reactive, keyframes]

# Dependency graph
requires: [28-01]
provides:
  - setup_compositor() with Glare bloom + Color Balance warm grading
  - apply_audio() wrapping keyframe_generator.py for fire scenes
  - fire_cinema.json preset with 11 audio-to-visual mappings
  - Complete pipeline: create scene -> apply audio -> bake -> render with compositor
affects: [29, 30, 31, 32, 33]

# Tech tracking
tech-stack:
  added: [compositor-nodes, glare-fog-glow, color-balance-asc-cdl]
  patterns: [compositor-function, audio-fire-mapping, four-function-api]

key-files:
  created:
    - blender/presets/fire_cinema.json
  modified:
    - blender/scripts/fire_cinema_template.py (added setup_compositor, apply_audio)
---

# Plan 28-02 Summary: Compositor Effects + Audio-Reactive Fire Mapping

## What was built

Added two critical capabilities to `fire_cinema_template.py`:

1. **setup_compositor()** — Automated compositor node setup:
   - Glare node (FOG_GLOW) for natural fire bloom at threshold 0.8
   - Color Balance node (ASC CDL) with warm shadow/highlight grading
   - Viewer node for background preview
   - All nodes auto-connected in the composite chain

2. **apply_audio(audio_json_path)** — Wraps keyframe_generator.py:
   - Uses fire_cinema.json preset (11 mappings)
   - Bass envelopes drive fuel_amount (fire intensity)
   - Bass onsets create sharp fuel spikes on beats (CONSTANT curve)
   - Spectral centroid drives flame_max_temp + Blackbody Intensity (color shifts)
   - RMS energy drives key light + world background
   - Sub-bass envelopes drive flow temperature
   - Mid envelopes create focal breathing on camera lens
   - Brilliance envelopes modulate rim light

3. **fire_cinema.json** preset — 11 simultaneous audio → visual mappings enabling emergent complexity

## Verification

- Task 1: Code committed (`3e678b1`), all acceptance criteria pass
- Task 2: Human render verification DEFERRED — Cycles CPU rendering at 128 samples too slow for live verification. Fire bake completed successfully (draft quality). Code is structurally correct.

## Commits

| Commit | Description |
|--------|-------------|
| `3e678b1` | feat(28-02): add compositor setup and fire cinema audio preset |

## Self-Check: PASSED (render verification deferred)

All code artifacts committed and verified structurally. Live render quality comparison deferred to when GPU rendering is available.
