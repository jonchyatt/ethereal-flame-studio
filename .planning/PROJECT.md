# Ethereal Flame Studio

## What This Is

An audio-reactive video generation engine that transforms audio files (meditation, music) into high-fidelity 360° VR and flat social media videos. Users upload audio, select a visual template, and the system renders publication-ready videos with auto-generated descriptions, then hands off to n8n for automated social media posting.

## Core Value

**Phone to published video without touching a computer.** A creator should be able to upload audio from their phone, pick a preset, and have a finished video posted to YouTube/social media — fully automated.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Visual engine combining breathing orb aesthetics with audio reactivity
- [ ] Particle systems with proper lifetime (spawn → live → die cycle)
- [ ] Two visual modes: Ethereal Mist (soft/cloud) and Ethereal Flame (upward drift, warm, wispy)
- [ ] Audio FFT analysis driving particle behavior (spawn rate, velocity, size, emission)
- [ ] Skybox layer supporting procedural starfields, video projection, and 360° equirectangular
- [ ] Automatic skybox rotation during playback
- [ ] Template system with simple presets + advanced parameter access
- [ ] Template save/load functionality
- [ ] Batch queue for processing multiple audio files
- [ ] Multiple output formats: Stereo 360° (8K), Mono 360°, flat 16:9/9:16
- [ ] Whisper AI integration for auto-generating video descriptions
- [ ] Rendering architecture optimized for phone → web → render workflow
- [ ] File organization with proper naming conventions
- [ ] Metadata database (Google Sheets or local CSV)
- [ ] n8n automation handoff for social media posting

### Out of Scope

- Real-time live streaming — batch rendering only for v1
- Mobile native app — web-based, mobile-friendly
- Multi-user accounts — single creator workflow initially
- Custom skybox upload in v1 — use pre-built presets first

## Context

**Reference Code:** The reset-biology-website project contains:
- Breathing orb component with good ethereal mist aesthetics (but static particles)
- Audio reactive orb with functional FFT analysis (but poor visuals)
- Working skybox system (no rotation yet)

**User Environment:**
- Has home computers with GPU rendering capability
- Rarely has direct access (at work most of the time)
- Can remotely access home machines sometimes
- Wants to be able to trigger renders from phone

**Target Output Examples:**
- Deep Space Starfield: Black void, white starlight, particles pulse with audio
- Ethereal Nebula: Blue/gold gradients, volumetric fog, dreamy atmosphere
- Both in 360° stereo and mono variants

**Automation Pipeline:**
- Render completes → files to watch folder (Google Drive sync)
- Metadata to Google Sheet with Whisper-generated descriptions
- n8n watches folder → posts to YouTube, social platforms with proper metadata

## Constraints

- **Tech Stack**: Next.js + Three.js — consistent with existing code, web-based for accessibility
- **Resolution**: Must support up to 8K (7680x3840) for VR master output
- **Rendering**: Must work with available home GPU resources OR cloud fallback
- **Headless Ready**: Core rendering must be extractable for CLI/server deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Three.js stack | Same as reference code, web-accessible, proven for 3D | — Pending |
| Two visual modes (Mist + Flame) | Different aesthetic needs for different content | — Pending |
| Particle lifetime system | Current static particles lack organic, living feel | — Pending |
| Research rendering architecture | Critical for phone-to-publish workflow, multiple options | — Pending |
| n8n for automation | User has experience, powerful workflow tool | — Pending |

---
*Last updated: 2026-01-26 after initialization*
