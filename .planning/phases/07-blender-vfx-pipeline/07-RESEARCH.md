# Phase 7 Research: Blender VFX Production Pipeline

**Project:** Ethereal Flame Studio
**Researched:** 2026-01-30
**Research Mode:** Ecosystem / Feasibility
**Overall Confidence:** HIGH

---

## Executive Summary

Phase 7 transforms Ethereal Flame Studio from a particle orb generator into a full VFX production pipeline capable of physics-based fire/water simulations, VR video compositing, depth-aware rendering, and EDM light show effects.

**Key Architecture Decision:** Maintain a hybrid approach with two rendering paths:

| Path | Tool | Use Case | Quality | Speed |
|------|------|----------|---------|-------|
| **Preview** | Three.js/Puppeteer | Real-time preview, quick iteration | Good | Minutes |
| **Cinema** | Blender/Cycles | Physics simulation, final renders | Photorealistic | Hours |

---

## Existing Research Assets

Phase 7 builds on existing research documents:

| Document | Location | Reusable For |
|----------|----------|--------------|
| **BLENDER_FIRE_ORB.md** | `.planning/research/` | Plans 07-03, 07-05 |
| **BLENDER_WATER.md** | `.planning/research/` | Plans 07-04, 07-05 |
| **THREEJS_360_STEREO_GUIDE.md** | `.planning/research/` | Reference for Blender equivalents |

---

## Research Gaps Addressed

This phase creates new research documents for areas not covered by existing research:

| Document | Purpose |
|----------|---------|
| `07-RESEARCH-AUDIO-STYLES.md` | Audio analysis expansion (envelope, onset, BPM, spectral) |
| `07-RESEARCH-VR-COMPOSITING.md` | 360 video import, shadow catcher, depth compositing |
| `07-RESEARCH-DEPTH-MAPS.md` | Monocular depth extraction (MiDaS, Depth Anything) |
| `07-RESEARCH-EDM-EFFECTS.md` | Volumetric lasers, LED grids, strobe effects |
| `07-RESEARCH-BLENDER-360-STEREO.md` | Blender panoramic camera, stereo rendering, VR metadata |

---

## Technology Stack

### Blender MCP Integration

```
Claude Desktop
    |
    v (MCP Protocol)
Blender MCP Server (uvx blender-mcp)
    |
    v (Python API)
Blender 5.0+
    |
    ├── Mantaflow (fire/water simulation)
    ├── Cycles (raytraced rendering)
    ├── Eevee (real-time rendering)
    └── Compositor (multi-layer output)
```

### Audio-to-Keyframe Pipeline

```
Audio File
    |
    v
AudioAnalyzer.ts (existing + new features)
    |
    v
audio-analysis.json (export)
    |
    v
keyframe_generator.py (Blender Python)
    |
    v
Animated Simulation Parameters
```

---

## Blender vs Three.js Comparison

### Physics Simulations

| Aspect | Three.js | Blender Mantaflow |
|--------|----------|-------------------|
| Fire behavior | Particle sprites (approximation) | Fluid dynamics (physically accurate) |
| Water behavior | Shader-based waves | Full fluid simulation |
| Turbulence | Noise functions | Vorticity simulation |
| Performance | Real-time | Minutes to hours |
| Quality | Good for web | Photorealistic |

### 360 Rendering

| Aspect | Three.js | Blender |
|--------|----------|---------|
| Camera | CubeCamera + shader conversion | Panoramic camera native |
| Stereo | Manual left/right offset | Built-in stereo mode |
| Output | Convert cubemap to equirect | Direct equirectangular |
| Max resolution | 4K (WebGL texture limit) | 8K+ (GPU memory limited) |

---

## Audio Analysis Expansion

Current `AudioAnalyzer.ts` provides:
```typescript
{ bass, mid, high, amplitude, isBeat, currentScale }
```

Phase 7 adds:

| Feature | Use Case | Blender Mapping |
|---------|----------|-----------------|
| **Envelope Follower** | Smooth amplitude curve | Fire intensity, water calm/turbulence |
| **Onset Detection** | Note/hit starts | Particle bursts, strobe triggers |
| **BPM Detection** | Beats per minute | Rotation sync, pattern cycling speed |
| **Frequency Centroid** | Brightness of sound | Fire temperature, color warmth |
| **Spectral Flux** | Rate of change | Turbulence, chaos level |

---

## VR Compositing Workflow

```
1. Import 360 video as equirectangular background
2. Extract depth map (MiDaS/Depth Anything)
3. Create Mantaflow fire/water simulation
4. Set up shadow catcher for realistic ground shadows
5. Composite with depth-aware occlusion
6. Add EDM effects layer
7. Render stereo equirectangular output
8. Inject VR metadata for YouTube/headsets
```

---

## Plan Structure (12 Plans, 5 Waves)

### Wave 1: Infrastructure + Audio Analysis
- **07-01**: Blender + MCP installation and configuration
- **07-02**: Audio analysis expansion (envelope, onset, BPM, spectral)

### Wave 2: Physics Simulations + Audio Mapping
- **07-03**: Mantaflow fire simulation template
- **07-04**: Mantaflow water simulation template
- **07-05**: Audio-to-keyframe parameter mapping system

### Wave 3: VR Compositing Suite
- **07-06**: VR video import and equirectangular setup
- **07-07**: Depth map extraction from 360 footage
- **07-08**: Shadow catcher and VR compositing
- **07-09**: Video masking and chroma keying

### Wave 4: EDM Effects
- **07-10**: EDM volumetric laser effects
- **07-11**: EDM LED grid and strobe effects

### Wave 5: Integration
- **07-12**: Multi-layer compositor and render pipeline

---

## Dependencies

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Blender | 5.0+ | VFX rendering |
| blender-mcp | latest | Claude-Blender bridge |
| Python | 3.10+ | Blender scripting |
| MiDaS | v3.1 | Depth estimation |
| Depth Anything | v2 | Alternative depth estimation |

### Internal Dependencies

| Dependency | Location | Purpose |
|------------|----------|---------|
| AudioAnalyzer | `src/lib/audio/` | Audio FFT analysis |
| FFmpegEncoder | `src/lib/render/` | Video encoding |
| SpatialMetadataInjector | `src/lib/render/` | VR metadata |

---

## Success Criteria

1. Claude can create/modify Blender scenes via MCP commands
2. Fire/water simulations respond meaningfully to audio
3. Real 360 footage composites with virtual fire/water/effects
4. Depth maps enable realistic shadow casting
5. EDM effects (lasers, grids, strobes) sync to beats
6. Complete pipeline from audio upload to VR video output
7. Quality visibly superior to current Three.js particle system

---

## Verification Checkpoints

| After Plan | Verify |
|------------|--------|
| 07-01 | Claude creates cube in Blender via MCP |
| 07-02 | Audio JSON exports with all analysis features |
| 07-05 | Fire reacts to music (visual confirmation) |
| 07-08 | Virtual fire casts shadow on real VR footage |
| 07-11 | Laser beams sync to beat (140 BPM test track) |
| 07-12 | Complete multi-layer video renders to VR format |

---

## Quality Settings

| Render Type | Engine | Resolution | Use Case |
|-------------|--------|------------|----------|
| Preview | Eevee | 1080p | Quick iteration |
| Standard | Eevee | 4K | Good quality, fast |
| Cinema | Cycles | 4K-8K | Highest quality, overnight |

---

## File Structure (to be created)

```
ethereal-flame-studio/
├── blender/
│   ├── scenes/
│   │   ├── fire-template.blend
│   │   ├── water-template.blend
│   │   ├── fire-over-water.blend
│   │   ├── edm-laser.blend
│   │   ├── edm-grid.blend
│   │   └── compositor.blend
│   ├── scripts/
│   │   ├── audio_importer.py
│   │   ├── keyframe_generator.py
│   │   ├── vr_video_import.py
│   │   ├── depth_extractor.py
│   │   ├── shadow_catcher_setup.py
│   │   ├── compositor.py
│   │   └── batch_render.py
│   └── renders/
│       └── (output frames)
└── src/
    └── lib/
        └── audio/
            └── AdvancedAnalyzer.ts (extended analysis)
```

---

## Sources

### Blender Documentation
- [Blender 5.0 Manual](https://docs.blender.org/manual/en/latest/)
- [Mantaflow Simulation](https://docs.blender.org/manual/en/latest/physics/fluid/index.html)
- [Principled Volume](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/volume_principled.html)
- [Ocean Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)

### MCP Resources
- [Blender MCP](https://github.com/ahujasid/blender-mcp)

### Depth Estimation
- [MiDaS](https://github.com/isl-org/MiDaS)
- [Depth Anything](https://github.com/LiheYoung/Depth-Anything)

### Existing Project Research
- `.planning/research/BLENDER_FIRE_ORB.md`
- `.planning/research/BLENDER_WATER.md`
- `.planning/research/THREEJS_360_STEREO_GUIDE.md`

---

*Last updated: 2026-01-30*
