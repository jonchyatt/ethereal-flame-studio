# Feature Landscape: Cinema VFX Pipeline

**Domain:** Blender MCP Cinema Render Path for Audio-Reactive Video Generation
**Researched:** 2026-03-19
**Confidence:** HIGH (verified across official Blender docs, community resources, professional VFX workflows)

---

## Executive Summary

The v4.0 Cinema VFX Pipeline adds Blender as a second render path to an existing audio-reactive video generation engine. The feature landscape splits into two tiers: TABLE STAKES are what any Blender-based VFX pipeline must do to justify its existence over the existing Three.js path, and DIFFERENTIATORS are what make the output transcendent rather than merely competent.

The critical insight from researching UON Visuals and professional VJ workflows: **what separates mind-blowing audio-reactive visuals from forgettable ones is NOT technical quality -- it is perceptual mapping sophistication.** "Bass drives scale" is the equivalent of a stick figure. Pros map 8+ frequency bands to different visual properties simultaneously, use onset detection for transient events, use envelope followers for smooth organic motion, and layer multiple visual systems that each respond to different spectral characteristics. The visual result has emergent complexity -- the viewer's brain processes it as a unified living thing rather than "parameter A tracks frequency B."

The Luminous Being concept is the project's crown jewel because it is genuinely novel. No one is doing audio-reactive person-to-light-being transformation in Blender with MCP automation. There are silhouette glow tutorials, there are audio-reactive particle systems, and there are person segmentation tools -- but no one has combined all three into a single automated pipeline.

---

## Table Stakes

Features users expect from a cinema-quality Blender VFX pipeline. Missing = the Blender path does not justify its existence over the Three.js path.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|------------|------------|------------|-------|
| **Mantaflow fire simulation** | Core promise -- photorealistic volumetric fire | HIGH | Blender MCP, audio analysis JSON | Must visibly exceed Three.js Solar Breath quality |
| **Audio-to-keyframe mapping** | Core value prop -- visuals react to music | HIGH | Audio analysis pipeline, Python librosa/scipy | Without this, output is just a screensaver |
| **Principled Volume shader with blackbody** | Physically accurate fire coloring | MEDIUM | Blender Cycles | Temperature-based color (1500K red to 6500K white) |
| **Cycles raytraced rendering** | The quality justification for offline rendering | LOW | Blender + GPU | This is literally why the Blender path exists |
| **1080p/4K frame sequence output** | Minimum deliverable resolution | LOW | FFmpeg, existing pipeline | Render to PNG sequence, encode to MP4 |
| **Compositor glow/glare pass** | Fire without bloom looks dead | LOW | Blender compositor | Glare node with Fog Glow, threshold 0.8-1.0 |
| **Scene template system** | Reusable .blend files for each effect type | MEDIUM | File organization | fire-template.blend, water-template.blend, etc. |
| **Beat detection to keyframe events** | Bass hits trigger visual events | MEDIUM | Onset detection in audio pipeline | Transient events (flash, burst) distinct from continuous mapping |
| **Multi-frequency band mapping** | Bass/mids/treble drive different parameters | HIGH | Spectral analysis, band separation | Minimum 3 bands; 8+ bands for pro quality |
| **Headless batch rendering** | Render without Blender GUI | LOW | Blender CLI, existing render queue | `blender -b scene.blend -a` |

### Why These Are Table Stakes

The existing Three.js path already delivers audio-reactive visuals in real-time. The Blender path must justify render times of minutes-to-hours by producing output that is OBVIOUSLY superior. Specifically:
- Volumetric fire with absorption, scattering, and physically-accurate light transport
- Sub-frame motion blur on fluid dynamics
- True raytraced reflections and caustics
- Bloom/glow that comes from actual light emission rather than post-process hacks

If the Blender output looks only marginally better than Three.js, the pipeline fails.

**Confidence:** HIGH
**Sources:** Blender official documentation, Polyfjord Audio Visualizer Masterclass, AudVis addon documentation, Mantaflow simulation guides

---

## Differentiators

Features that make the output transcendent. This is what separates "nice fire simulation" from "UON Visuals quality."

### Tier 1: High-Impact Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|------------|-------|
| **Luminous Being transformation** | NO ONE is doing this automated. A person becomes a being of light. | VERY HIGH | Person segmentation (MediaPipe/SAM), Blender compositor, audio mapping | The crown jewel. Genuinely novel. |
| **Sophisticated audio-visual mapping (8+ bands)** | The difference between "visualizer" and "visual art" | HIGH | Python librosa, onset detection, envelope followers | Map bass to density, low-mids to turbulence, mids to color temp, high-mids to particle density, treble to corona brightness, beats to flash events, sub-bass to scale, spectral flux to chaos |
| **Fire-over-water combo scene** | The reference image (`flame-over-water.png`) come to life | HIGH | Mantaflow fire + Ocean Modifier + Cycles | Caustic reflections of fire in water. Audio drives fire intensity (bass) and water turbulence (treble) |
| **Onset detection for transient events** | Beats trigger discrete visual events (flash, burst, color shift) | MEDIUM | Python onset detection (librosa) | Distinct from continuous envelope mapping -- creates punctuation |
| **Envelope follower for organic motion** | Smooth parameter curves that breathe with the music | MEDIUM | Python scipy signal processing | No jerky frame-to-frame jumps -- smooth organic response |
| **Multi-layer compositor pipeline** | Separate render passes combined for maximum control | HIGH | Blender View Layers, compositor nodes | Fire layer + water layer + EDM effects + bloom = independent control |

### Tier 2: World-Building Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|------------|-------|
| **8K stereoscopic equirectangular VR** | Premium format that few creators produce | MEDIUM | Panoramic camera, stereo 3D config, VR metadata injection | Native Blender panoramic camera -- no cubemap conversion needed |
| **Poly Haven HDRI environments** | Photorealistic lighting from real-world environments | LOW | blender-mcp Poly Haven tools (built-in) | Free, high-quality, instant scene transformation |
| **EDM volumetric laser beams** | Concert-quality light shows in the scene | MEDIUM | Principled Volume cylinders, audio mapping | Beams sweep, color-cycle, intensity-pulse on beat |
| **EDM LED grid patterns** | Audio spectrum visualized as a physical light wall | HIGH | Grid geometry, per-LED emission keyframes | Map frequency bands to grid columns, amplitude to brightness |
| **Shadow catcher compositing** | Virtual objects cast shadows on real footage | MEDIUM | Cycles shadow catcher, depth maps | Grounds virtual fire in real scenes |
| **Depth-aware occlusion** | Real objects correctly occlude virtual effects | HIGH | Depth Anything v2 or MiDaS, Blender Z Combine | The difference between "pasted on" and "integrated" |

### Tier 3: Polish Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|------------|-------|
| **Geometry Nodes particle bursts on beats** | Physical particle explosions synced to transients | MEDIUM | Geometry Nodes, onset keyframes | More satisfying than emission rate changes |
| **Color temperature cycling on spectral centroid** | Fire color shifts with the harmonic content of the music | MEDIUM | Spectral centroid analysis, blackbody mapping | When music gets brighter, fire gets hotter/whiter |
| **World building with AI-generated assets** | Hyper3D Rodin generates 3D models from text prompts | MEDIUM | blender-mcp Rodin/Hunyuan3D tools | "floating crystal island" becomes geometry |
| **Motion blur on fluid dynamics** | Cinematic motion blur on fire/water | LOW | Cycles motion blur settings | Sub-frame sampling. Huge quality increase for free. |
| **Noise upscaling for Mantaflow** | High-res detail without high-res sim time | MEDIUM | Mantaflow noise settings | Simulate at res 64, upres with noise to appear 256+ |

**Confidence:** MEDIUM-HIGH (UON Visuals techniques inferred from output analysis; specific implementations verified in Blender docs)

---

## The Perceptual Principles: WHY Certain Visuals Spark

This section synthesizes what research reveals about why UON Visuals and similar creators produce content that is mesmerizing rather than merely pretty. These principles should guide every feature implementation.

### Principle 1: Fractal Self-Similarity at Multiple Scales

The human brain is organized in fractal patterns. Visual stimuli with fractal characteristics (patterns that repeat at multiple scales) trigger innate attraction responses. Brain networks spontaneously organize into fractal-like patterns during complex cognition. Research shows that fractals of the right dimension exert measurable physiological calming effects.

**Implementation:** Every effect should contain detail at multiple scales simultaneously. Fire should have large billowing shapes AND medium turbulence AND fine wispy tendrils. Particle systems should have large slow-moving particles AND medium AND tiny fast-moving sparks. One scale = flat. Three+ scales = alive.

### Principle 2: Emergent Complexity from Simple Mappings

UON Visuals uses "math formulas and code" to create visuals that appear impossibly complex. The secret: multiple simple audio-visual mappings running simultaneously create emergent behavior that no single mapping could produce.

**Implementation:** Do NOT map one audio feature to one visual parameter. Map 8+ features to 8+ parameters and let the interactions create complexity:

| Audio Feature | Visual Parameter | Response Type |
|--------------|-----------------|--------------|
| Sub-bass (20-60 Hz) | Overall scale / breathing | Envelope (slow, smooth) |
| Bass (60-250 Hz) | Fire density / intensity | Envelope (medium) |
| Low-mids (250-500 Hz) | Turbulence / vorticity | Envelope (medium) |
| Mids (500-2 kHz) | Color temperature shift | Continuous (fast) |
| High-mids (2-4 kHz) | Particle emission rate | Continuous (fast) |
| Treble (4-8 kHz) | Corona / edge glow brightness | Continuous (fast) |
| Air (8-20 kHz) | Shimmer / noise displacement | Continuous (very fast) |
| Onset / beat | Flash event, particle burst | Transient (instant on, quick decay) |
| Spectral centroid | Blackbody temperature | Continuous (smooth) |
| Spectral flux | Chaos / randomness amount | Continuous (medium) |
| RMS energy | Global emission strength | Envelope (slow) |
| BPM phase | Cyclic sweep patterns | Phase-locked loop |

### Principle 3: Contrast and Negative Space

EDM light shows work because they alternate between intensity and darkness. A laser is only visible because the rest of the space is dark. A beat drop is only impactful because the buildup was restrained.

**Implementation:** Effects need dynamic range. Quiet musical passages should produce near-darkness with subtle glow. Build sections should gradually increase. Drops should EXPLODE. The ratio matters more than the peak value. A strobe in constant brightness is invisible. A strobe after 4 bars of darkness is blinding.

### Principle 4: Synchronization Creates Meaning

Research on EDM visual perception: "the visuals dance in sync with the hype-style energy perfectly" -- synchronization between audio and visuals creates the perception that the visual IS the sound. Desynchronization, even by 50ms, breaks the illusion.

**Implementation:** Audio-to-keyframe mapping must be sample-accurate. Onset detection must use high-resolution spectral analysis (not frame-averaged). Beat events should trigger on the EXACT frame, not the nearest keyframe. For Mantaflow sims, bake the simulation AFTER setting keyframes so the fluid dynamics respond to the actual audio timing.

### Principle 5: Top-Down Processing (Expectation as Perception)

The brain does not passively receive visual input -- it actively predicts what it will see. When predictions are violated in pleasing ways, the result is delight. This is why UON Visuals' work feels "mind-blowing" -- familiar geometric shapes morph in unexpected ways.

**Implementation:** Establish visual patterns in the first 4-8 bars, then break them. If fire has been pulsing with the bass for 16 bars, suddenly shifting to treble-driven behavior on a breakdown creates surprise. The Luminous Being effect itself exploits this: you EXPECT a person, you GET a being of light.

**Sources:**
- [Fractal Brain Networks Support Complex Thought](https://scitechdaily.com/fractal-brain-networks-support-complex-thought-amazing-lightning-storm-of-connection-patterns/)
- [FractalBrain EEG VR Mindfulness Study (ACM)](https://dl.acm.org/doi/10.1145/3613905.3648667)
- [UON Visuals - H+ Creative](https://www.hpluscreative.com/uon-visuals)
- [Impact of Visual Effects on EDM Experience](https://dlksoulfuledm.com/what-is-the-impact-of-visual-effects-on-the-edm-experience/)
- [Conceptualising Visuals for Big Stage EDM Acts](https://www.palmtechnology.in/Article_15.aspx)

---

## Deep Dive: Audio-Reactive VFX in Blender

### Current State of the Art

The professional audio-reactive visual pipeline in 2025-2026 looks like this:

1. **Audio analysis** happens OUTSIDE Blender (Python: librosa, essentia, scipy)
2. **Keyframe data** is generated as JSON or direct bpy keyframe insertions
3. **Blender receives keyframes** and bakes simulations / renders

Blender is NOT good at real-time audio analysis. Its built-in "Sound to F-Curve" (Bake Sound to F-Curves) is rudimentary -- it maps overall amplitude to a single curve. For sophisticated multi-band mapping, you need external analysis.

### Tools That Matter

| Tool | What It Does | Our Use |
|------|-------------|---------|
| **Polyfjord Audio Visualizer Masterclass** | Teaches frequency band visualization with Geometry Nodes | Technique reference for band-to-geometry mapping |
| **AudVis addon** | Driver expressions for frequency-to-property mapping | May be useful for prototyping, but our pipeline is script-based |
| **Sound Nodes addon** | Processes audio, stores keyframes, exposes to Geometry Nodes | Alternative to our custom keyframe generator |
| **Audio2Blender** | Real-time audio sampling into Geometry Nodes | Not useful -- we need offline/baked, not real-time |
| **librosa (Python)** | Industry-standard audio analysis library | PRIMARY analysis tool: onset detection, spectral features, beat tracking |
| **essentia (Python)** | Advanced audio feature extraction | SECONDARY: spectral centroid, spectral flux, tonal analysis |

### The keyframe_generator.py Architecture

This is the most critical script in the entire pipeline. It must:

1. Load audio file
2. Compute per-frame analysis (at render FPS, typically 30 or 60):
   - FFT frequency bands (minimum 8, ideally 16+)
   - RMS energy (overall loudness)
   - Spectral centroid (brightness of sound)
   - Spectral flux (rate of spectral change)
   - Onset detection (beat/transient locations)
   - BPM and beat phase
3. Apply smoothing (envelope follower per band):
   - Fast attack (10-50ms) for transient response
   - Slower release (100-500ms) for organic decay
   - Different attack/release per band (treble faster than bass)
4. Map analysis to Blender parameters via bpy keyframe insertion
5. Support multiple mapping presets (meditation = slow/smooth, EDM = aggressive/punchy)

**Confidence:** HIGH (librosa documentation, Polyfjord course curriculum, AudVis implementation)

---

## Deep Dive: Luminous Being Effect

### What Exists Today

**Person segmentation:**
- **MediaPipe Selfie Segmentation** -- fast, runs on CPU, suitable for real-time, but lower accuracy on edges. Good enough for initial mask.
- **SAM (Segment Anything Model)** -- higher quality, GPU-preferred, excellent edge quality. Use for final renders.
- **RotoForge AI** -- Blender addon implementing SAM-HQ for video rotoscoping, generates bitmasks from prompts. Directly produces Blender-compatible masks.
- **AutoMask** -- Free Blender addon using ML for automatic rotoscoping with manual fine-tuning.

**Glow/luminous effects in Blender:**
- Emission shader + Glare compositor node (standard approach)
- Principled Volume filling a mesh (volumetric glow)
- Freestyle edge detection + emission for corona/aura
- Geometry Nodes particle emission from mesh surface

**What does NOT exist (our innovation):**
- Automated pipeline: video in -> segmentation -> mask sequence -> Blender compositor -> audio-reactive glow parameters -> rendered output
- Audio-reactive modulation of the luminous effect
- Layered approach: inner volumetric core + particle system + fire wisps + corona edge glow, all independently audio-driven

### Three Approaches (from Vision Doc, validated by research)

**Approach 1: Particle Silhouette** -- Closest to existing orb system
- Use silhouette as particle emission shape (Geometry Nodes: Distribute Points on Faces)
- Same particle configs as Three.js modes (Ethereal Flame, Solar Breath, Ethereal Mist)
- Person's body is the spawn region instead of a sphere
- PROS: Leverages existing visual language, moderate complexity
- CONS: Particles alone may look thin without volumetric core

**Approach 2: Volumetric Body** -- Most ethereal
- Fill silhouette mesh with Principled Volume shader
- Temperature/density driven by audio (bass = hotter/brighter)
- Edge detection creates corona/aura (dilated mask minus original mask)
- PROS: Most "being of light" feeling, beautiful in Cycles
- CONS: Volumetric rendering is slow, hard to art-direct precisely

**Approach 3: Mantaflow Fire Body** -- Most dramatic
- Person's silhouette mesh as Mantaflow flow source
- Fire emanates FROM the body shape
- Flames rise from shoulders, head, hands
- Audio drives combustion intensity
- PROS: Dramatic, physically convincing, leverages fire pipeline
- CONS: Most complex, longest sim/render times, hard to control

**Recommendation: Layer all three.** Inner volumetric glow (Approach 2) + particle system (Approach 1) + fire wisps (Approach 3) + corona edge glow. Each layer responds to different frequency bands. The result: a being made of pure light energy with fire tendrils, the original person barely visible as a ghostly outline within the luminous form.

### Segmentation Pipeline Architecture

```
Input video (person meditating/dancing)
    |
    v
Frame extraction (FFmpeg: ffmpeg -i input.mp4 -q:v 2 frames/%05d.jpg)
    |
    v
MediaPipe Selfie Segmentation (fast pass)
    |
    +--[if quality sufficient]--> Mask sequence (PNG alpha)
    |
    +--[if edges rough]--> SAM refinement pass
                               |
                               v
                          Mask sequence (PNG alpha, high quality)
    |
    v
Import to Blender as image strip (Background image + Mask strip)
    |
    v
Compositor node tree:
    +-- Background video (darkened, desaturated)
    +-- Silhouette mask drives:
    |     +-- Volumetric body (Principled Volume, density from mask)
    |     +-- Particle emission (Geometry Nodes, spawn on mask shape)
    |     +-- Fire sim source (Mantaflow flow from mask mesh)
    |     +-- Edge glow (dilated mask - original mask = corona)
    +-- Audio keyframes modulate all parameters
    |
    v
Render (Cycles) -> Frame sequence -> FFmpeg encode
```

**Confidence:** MEDIUM-HIGH (individual components verified; combined pipeline is novel/untested)

---

## Deep Dive: What Makes CGI Fire Look Real vs. Fake

### The Five Killers of Fake Fire

1. **Too blobby / too solid** -- Low voxel resolution produces smooth, rounded shapes that look like orange cotton candy instead of fire. SOLUTION: Resolution Division 128+ for mid-range, 256+ for hero shots. Use Noise upscaling (upres factor 2-4) to add detail without full-res simulation cost.

2. **Wrong color** -- Beginners use orange emission. Real fire has temperature-based color: dark red edges (1000K), orange body (2000K), yellow-white core (4000-6500K). SOLUTION: Use Blackbody node with temperature attribute from Mantaflow, not manual color.

3. **No turbulence at small scales** -- Real fire has micro-eddies and swirls at every scale. Smooth fire looks CGI. SOLUTION: Turbulence strength 10-20 in domain settings. Noise method "Wavelet" for high-frequency detail. Vorticity > 0 for rotational motion.

4. **Missing secondary effects** -- Fire without bloom, without light casting on surroundings, without smoke, without heat distortion looks flat. SOLUTION: Glare compositor node, area lights parented to fire, smoke in Mantaflow domain (set Fire+Smoke not just Fire), heat distortion in compositor (displacement node).

5. **No motion blur** -- Each frame is frozen. Real fire viewed at 1/30s shutter has significant blur. SOLUTION: Enable motion blur in Cycles (Shutter 0.5 for standard, 1.0 for dreamy), ensure sub-frame simulation steps.

### The Parameters That Actually Matter

| Parameter | Domain | Setting | Why |
|-----------|--------|---------|-----|
| Resolution Division | Domain > Settings | 128-256 | Voxel detail. Below 64 = unusable. Above 256 = diminishing returns. |
| Noise Method | Domain > Noise | Wavelet | Adds high-frequency turbulence detail without increasing base resolution |
| Upres Factor | Domain > Noise | 2-4 | Effective resolution = base * upres. Cheap way to get detail. |
| Vorticity | Domain > Settings | 0.5-2.0 | Creates swirling, rotating motion. 0 = lifeless rising columns. |
| Turbulence Strength | Force Field | 10-20 | Controls micro-turbulence. Too low = smooth. Too high = chaotic. |
| Flame Max Temp | Domain > Settings | 3.0-5.0 | Controls how hot fire gets. Affects color via blackbody. |
| Fuel Amount | Flow > Settings | 1.0-2.0 | Larger fuel = smaller flames (burns faster). Smaller = larger flames. |
| Blackbody Intensity | Material | 1.0 | Must be 1.0 for physically accurate temperature-to-color. |
| Emission Strength | Material | 10-50 | Makes fire actually emit light. Below 5 = too dim. |
| Volume Step Rate | Render > Volumetrics | 0.1 | Quality of volumetric raymarching. Lower = better quality, slower. |
| Max Steps | Render > Volumetrics | 256-1024 | Higher = less banding in thick volumes. |

**Confidence:** HIGH (Blender official docs, Concept Art Empire explosion tips, community tutorials)
**Sources:**
- [Blender Manual - Domain Settings](https://docs.blender.org/manual/en/latest/physics/fluid/type/domain/settings.html)
- [8 Tips For Better Explosion Simulations](https://conceptartempire.com/explosion-simulation-tips-blender/)
- [Creating Realistic Fire Simulations in Blender](https://toxigon.com/creating-realistic-fire-simulations-in-blender)

---

## Deep Dive: What Makes CGI Water Convincing

### The Three Pillars of Convincing Water

1. **Correct optical properties** -- Water is NOT blue. It is transparent with an IOR of 1.33. What we perceive as "water color" is a combination of absorption (deep water absorbs red), reflection (sky reflection on surface), and scattering (foam/spray). SOLUTION: Principled BSDF with Transmission 1.0, Roughness 0-0.05, IOR 1.33. Absorption Color controls underwater tint.

2. **Caustics** -- The dancing light patterns caused by refraction through a wavy surface. Without caustics, water looks like glass. SOLUTION: In Cycles, enable Shadow Caustics in lamp settings, Cast Shadow Caustics on water surface, Receive Shadow Caustics on underwater surfaces. Note: full spectral caustics require very high sample counts or denoiser.

3. **Secondary elements** -- Foam, spray, bubbles, mist. Water without these looks like a mirror. SOLUTION: Ocean Modifier foam output drives particle systems. Spray particles with additive-blend emission material for bright highlights. Mist as low-density Principled Volume near surface.

### Water Parameters for the Fire-Over-Water Scene

| Parameter | Component | Setting | Why |
|-----------|----------|---------|-----|
| Wave Scale | Ocean Modifier | 0.1-0.3 | Subtle waves for ethereal calm. Not rough ocean. |
| Spectrum | Ocean Modifier | Shallow Water | Calm, reflective surface. Not turbulent. |
| Choppiness | Ocean Modifier | 0.05-0.1 | Minimal lateral displacement. Sharp peaks look violent. |
| Damping | Ocean Modifier | 0.5-1.0 | Reduces bounce-back waves. Calmer surface. |
| IOR | Material | 1.33 | Water's index of refraction. Non-negotiable. |
| Roughness | Material | 0.0-0.05 | Near-perfect mirror for calm water. |
| Transmission | Material | 1.0 | Fully transparent (depth creates opacity via absorption). |
| Absorption Color | Material | Dark teal/blue | Controls what color light becomes underwater. |

### Audio Reactivity for Water

The bass channel should NOT drive water. That creates violent sloshing that fights the fire aesthetic. Instead:
- **Treble/shimmer** drives wave micro-displacement (subtle surface ripples)
- **Spectral flux** drives foam density (musical changes create brief foam events)
- **Global RMS** drives reflection clarity (louder = more surface disturbance = softer reflections)

**Confidence:** HIGH
**Sources:**
- [How to Create Realistic Water Caustics in Blender](https://www.themorphicstudio.com/how-to-create-realistic-water-caustics-in-blender/)
- [Physical Water FX](https://www.cgchannel.com/2024/10/physical-water-fx-adds-good-looking-water-surfaces-in-blender/)
- [Blender Manual - Ocean Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)

---

## Deep Dive: 360/VR Cinema Rendering

### What Makes VR Content People Actually Watch

Research on YouTube VR viewing patterns reveals clear content patterns:

1. **Travel/exploration** -- 360-degree virtual tourism. Not our space.
2. **Music/concert experiences** -- 360 concert footage. THIS IS OUR SPACE.
3. **Meditation/relaxation** -- Immersive calming environments. THIS IS OUR SPACE.
4. **Psychedelic/abstract** -- Fractal journeys, visual experiences. THIS IS OUR SPACE.

The intersection of music + meditation + abstract visual art in VR is EXACTLY the Ethereal Flame Studio value proposition.

### What Gets 20K+ Views in VR

Based on successful 360/VR content on YouTube:
- **High production quality** (8K or at minimum 5K for acceptable VR sharpness)
- **Stereoscopic 3D** (mono 360 feels flat and disappointing in a headset)
- **Environment fills the space** (not a flat scene with interesting stuff only in front)
- **Movement is SLOW or STATIC** (fast motion causes nausea)
- **Sound design matches visual space** (spatial audio adds immersion)
- **Content is 3-10 minutes** (too short = not worth putting on headset; too long = fatigue)

### Technical Gotchas That Ruin VR Immersion

| Gotcha | What Happens | Prevention |
|--------|-------------|-----------|
| **Stereo IPD mismatch** | Objects feel wrong size, headache | Use 64mm standard IPD, verify scene scale is 1 unit = 1 meter |
| **Stitching seams** | Visible line in equirectangular output | Use Blender's native panoramic camera (no stitching needed -- direct equirectangular render) |
| **Pole distortion** | Top/bottom of sphere look stretched | Minimize visual detail at poles. Place interesting content at horizon. |
| **Frame rate below 30fps** | Nausea, temporal judder | Render at 30fps minimum. 60fps for high-motion content. |
| **Wrong metadata** | Video plays flat instead of 360 | Inject spatial metadata with spatialmedia or FFmpeg |
| **Close objects in stereo** | Cross-eye strain, discomfort | Keep nearest objects >1 meter from camera. Infinity convergence for distant scenes. |
| **Texture discontinuity at 180/-180** | Visible seam at wrap point | Use procedural textures (no UV seam) or seamless textures |
| **Color banding in gradients** | Visible steps in dark scenes | Render to 16-bit PNG or OpenEXR. Dither on final encode. |
| **Non-uniform texel density** | Some objects blurry, some sharp | Less critical for procedural VFX. Watch for imported 3D assets. |

### Platform Requirements

| Platform | Format | Max Resolution | Stereo Layout | Metadata |
|----------|--------|---------------|--------------|----------|
| YouTube VR | MP4 H.264/H.265 | 8K stereo | Top/Bottom | Google Spatial Media v2 |
| Meta Quest | MP4 H.265 | 5760x5760 | Top/Bottom | Standard VR metadata |
| Apple Vision Pro | HEVC Main 10 | 7680x3840 | Side-by-Side | Apple spatial metadata |
| Vimeo 360 | MP4 H.264 | 8K mono | N/A | Standard VR metadata |

**Confidence:** HIGH
**Sources:**
- [Blender Manual - Panoramic Cameras](https://docs.blender.org/manual/en/latest/render/cycles/object_settings/cameras.html)
- [YouTube VR Requirements](https://support.google.com/youtube/answer/6178631)
- [VR Rendering Essentials - GarageFarm](https://garagefarm.net/blog/mastering-vr-rendering-for-immersive-experiences)
- [Frontiers: Panoramic Imaging in Immersive XR](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1622605/full)
- [Monoscopic vs Stereoscopic 360 VR - Boris FX](https://borisfx.com/blog/monoscopic-vs-stereoscopic-360-vr-key-differences/)

---

## Deep Dive: EDM Visual Effects -- Perceptual Design

### Why Concert Visuals Work on Screen

Live EDM shows use physical phenomena (fog, lasers through haze, strobes, LED walls) that create specific perceptual effects. Recreating these in Blender requires understanding WHAT the effects do to perception, not just WHAT they look like.

| Physical Effect | Perceptual Function | Blender Recreation |
|----------------|--------------------|--------------------|
| **Laser through fog** | Creates a visible light plane in 3D space; depth perception cue | Principled Volume cylinder with low density (0.3-0.5), high emission (50+), placed in volumetric fog domain |
| **Strobe** | Temporal pattern disruption; creates afterimage; resets visual adaptation | Point light with energy 0 -> 10000 -> 0 in 2 frames. Compositor flash overlay (Add blend, factor 0.8 for 1 frame). |
| **LED wall** | Massive luminance source with spatial frequency patterns | Grid of emissive spheres. Each column maps to a frequency band. Amplitude drives emission strength. |
| **Moving head sweep** | Attention direction; creates anticipation as beam approaches | Spot light with animated pan/tilt. Volumetric cone visible in fog. Speed synced to musical phrases. |
| **Color cycling** | Mood manipulation; hue shift tracks musical key or energy | HSV Hue node driven by time * speed * (1 + amplitude). Cycle speed increases with intensity. |
| **Darkness between effects** | Reset adaptation; makes next effect feel brighter | Global emission multiplier drops to 10% during breakdowns. Returns to 100% on drops. Dynamic range is everything. |

### The Multi-Sensory Synchronization Principle

Professional VJ work operates on the principle that EVERY visual element must be time-coded to the music. The audience should not be able to tell where the sound ends and the visual begins. In practice this means:

1. **Macro sync:** Scene changes on 8/16-bar boundaries
2. **Meso sync:** Effect intensity follows 4-bar phrases
3. **Micro sync:** Individual beats trigger discrete events
4. **Continuous sync:** Every frame's visual state reflects the current audio state

**Confidence:** MEDIUM-HIGH
**Sources:**
- [Impact of Visual Effects on EDM Experience](https://dlksoulfuledm.com/what-is-the-impact-of-visual-effects-on-the-edm-experience/)
- [Role of Light and Visuals in EDM Events - 4D4M](https://4d4m.com/the-role-of-light-and-visuals-in-edm-events-an-in-depth-look/)
- [Best DJ Visuals of All Time - ZIPDJ](https://www.zipdj.com/blog/best-dj-visuals)
- [Conceptualising Visuals for Big Stage EDM Acts](https://www.palmtechnology.in/Article_15.aspx)

---

## Deep Dive: Video Compositing

### Hollywood vs. Achievable in Blender

| Hollywood Tool | What It Does | Blender Equivalent | Quality Gap |
|---------------|-------------|-------------------|------------|
| Nuke | Industry-standard compositing | Blender Compositor | Blender handles 95% of use cases. Nuke wins on deep compositing, MASSIVE node trees, and team workflows. |
| After Effects | Motion graphics + compositing | Blender Compositor + VSE | Blender lacks AE's motion graphics ecosystem but matches for VFX compositing |
| Boris Silhouette | Rotoscoping + paint | RotoForge AI addon | RotoForge uses SAM-HQ which is comparable to modern AI roto tools |
| Depth estimation | LIDAR / multi-cam stereo | Depth Anything v2 / MiDaS | Monocular depth is inherently less accurate than physical depth. Good enough for artistic compositing, not for precise occlusion. |

### Blender Compositor Capabilities for Our Needs

What we CAN do well:
- Multi-layer compositing (render passes combined with control)
- Alpha-over compositing (VFX layers on background footage)
- Z Combine (depth-aware occlusion using depth maps)
- Color correction per layer (match virtual to real lighting)
- Glare / bloom / fog glow post-processing
- Lens distortion matching
- Cryptomatte object isolation

What we CANNOT do well:
- Real-time preview of complex node trees (always need to render)
- Deep compositing (holdout per sample, not per pixel -- Nuke territory)
- Interactive rotoscoping (use RotoForge or external tools, import masks)

### The Practical Compositing Pipeline for EFS

```
Real 360 video
    |
    +-- Extract frames (FFmpeg)
    +-- Estimate depth (Depth Anything v2, per-frame)
    |
    v
Blender Scene
    |
    +-- Background: 360 video as Environment Texture
    +-- Depth: Imported depth maps for Z Combine
    +-- Virtual objects: Fire, water, particles, EDM effects
    +-- Shadow catcher: Invisible plane catching virtual shadows
    +-- View Layers: Separate for VFX, shadows, effects
    |
    v
Blender Compositor
    |
    +-- VFX layer + Background via Z Combine (depth occlusion)
    +-- Shadow layer via Multiply blend
    +-- EDM effects via Add blend (additive light)
    +-- Bloom/glare post-processing
    +-- Color matching / grading
    |
    v
Frame sequence output -> FFmpeg encode with VR metadata
```

**Confidence:** HIGH
**Sources:**
- [Blender VFX Features](https://www.blender.org/features/vfx/)
- [VFX Compositing Workflow with Blender and COLMAP](https://www.blendernation.com/2025/09/21/vfx-compositing-workflow-with-blender-and-colmap/)
- [RotoForge AI](https://github.com/MagnumVD/RotoForge-AI)
- [Master Compositing in Blender - CG Boost](https://www.cgboost.com/courses/master-compositing-in-blender)

---

## Anti-Features

Features to explicitly NOT build. These waste time, add complexity without value, or produce worse results than simpler approaches.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time Blender rendering** | Cycles is offline. Fighting this wastes effort. Eevee 360 requires cubemap workaround hack. | Accept the offline paradigm. Three.js handles real-time. Blender handles cinema. |
| **Custom Blender GUI addon** | Claude controls via MCP. A GUI addon adds maintenance burden for zero user benefit. | All interaction through `execute_blender_code` via MCP. |
| **Face recognition in Luminous Being** | Claude refuses face recognition. Attempting it will fail and waste tokens. | Silhouette-only approach. The mask is the feature, not the face. |
| **Continuous 360 video polling for compositing** | Processing every frame of a long video is slow and usually unnecessary. | Event-driven: process on-demand, user selects segment. |
| **Over-parameterized audio mapping UI** | Exposing 50 sliders for audio-visual mapping overwhelms users. | Smart presets: "Meditation" (slow, smooth), "EDM" (aggressive, punchy), "Ambient" (subtle, organic). Users pick a preset. |
| **Eevee for VR rendering** | Eevee does not support panoramic cameras. The cubemap workaround produces seams and quality loss. | Cycles only for VR output. Accept the render time. |
| **Turbulence FD / EmberGen for fire** | External commercial tools. Adds licensing cost, installation complexity, and breaks the MCP automation pipeline. | Mantaflow is built into Blender. Good enough for our needs with proper parameters. |
| **Full procedural fire (no simulation)** | Procedural noise-based fire looks like glowing smoke, not fire. It lacks fluid dynamics. | Use Mantaflow simulation for realistic fire behavior. Reserve procedural for subtle background effects. |
| **Thousands of visual presets** | Quality dilution. Paradox of choice. Same mistake as v1 anti-feature. | 6-10 curated presets, each carefully art-directed and optimized. |
| **Self-hosted ML models on Vercel** | Vercel is serverless. ML models need persistent GPU. This architecture mismatch creates nothing but pain. | Run segmentation locally (Python on Jonathan's machine) or on GPU cloud (Modal). |
| **Interactive Blender sessions for users** | Users do not know Blender. Exposing Blender's complexity defeats the entire abstraction. | Users interact with web UI. Claude orchestrates Blender behind the scenes. |
| **Attempting photorealistic human skin in Luminous Being** | The effect is about LIGHT, not about human rendering. Trying to make the skin look real before covering it with glow is wasted effort. | The person is a silhouette. The light IS the render. Dark silhouette + luminous glow = the effect. |

### The Most Important Anti-Feature: "Bass Drives Scale" as the Only Mapping

This deserves special attention because it is the single most common mistake in audio visualization. Every beginner tutorial shows "amplitude -> object scale" and stops. The result: a bouncing blob. It communicates "audio is controlling this" but it is perceptually boring within seconds.

The fix is not one feature -- it is a design philosophy: **every visual parameter should be driven by a DIFFERENT audio feature.** Scale by sub-bass. Density by bass. Turbulence by low-mids. Color by mids. Particle count by high-mids. Edge glow by treble. Flash events by onset detection. The result has emergent complexity that the brain processes as a living thing.

---

## Feature Dependencies

```
Audio Analysis Pipeline (exists, needs expansion)
    |
    +-- Spectral band separation (8+ bands) -- NEEDED
    |       |
    |       +-- Onset detection (librosa) -- NEEDED
    |       +-- Envelope followers per band -- NEEDED
    |       +-- Spectral centroid / flux -- NEEDED
    |
    v
keyframe_generator.py (NEW -- core bridge)
    |
    +-- Maps audio features to Blender parameters
    +-- Inserts keyframes via bpy
    +-- Supports multiple mapping presets
    |
    v
Blender Scene Templates
    |
    +-- fire-template.blend
    |       +-- Mantaflow domain + flow object + materials
    |       +-- Principled Volume with blackbody
    |       +-- Compositor: bloom, color grade
    |
    +-- water-template.blend
    |       +-- Ocean Modifier + material
    |       +-- Caustic configuration
    |
    +-- fire-over-water.blend (depends on both above)
    |
    +-- edm-laser.blend
    |       +-- Volumetric laser geometry
    |       +-- LED grid (optional)
    |       +-- Strobe lights
    |
    +-- luminous-being.blend (depends on segmentation)
    |       +-- Compositor node tree for mask-driven effects
    |       +-- Volumetric body material
    |       +-- Particle emission from mask
    |
    +-- compositor.blend
            +-- Multi-layer compositing template
            +-- Depth-aware Z Combine setup
    |
    v
Person Segmentation Pipeline (for Luminous Being)
    |
    +-- MediaPipe (fast, CPU) -- quick pass
    +-- SAM / RotoForge AI (quality, GPU) -- refinement
    +-- Frame export as PNG mask sequence
    |
    v
Render Pipeline
    |
    +-- Batch render (Blender CLI, headless)
    +-- Frame sequence to video (FFmpeg)
    +-- VR metadata injection (spatialmedia)
    +-- Upload to R2 storage (existing v2.0 infrastructure)
```

### Critical Path

1. **Audio analysis expansion** -- Without 8+ band separation and onset detection, the entire pipeline produces boring output
2. **keyframe_generator.py** -- Without the bridge from audio to Blender, nothing is audio-reactive
3. **Fire template** -- The first visual proof that Blender path exceeds Three.js quality
4. **Render pipeline integration** -- Without batch render + encode, output is manual

### Dependency on Existing Systems

| Existing System | How Cinema Pipeline Uses It | Risk |
|----------------|---------------------------|------|
| AudioAnalyzer.ts | Source of FFT data for Python analysis | Low -- well-tested, may need JSON export format |
| Render queue (v2.0) | Dispatches Blender render jobs | Medium -- needs Blender CLI integration, not just Puppeteer |
| R2 storage (v2.0) | Stores rendered video output | Low -- just file upload |
| FFmpeg pipeline | Encodes frame sequences to video | Low -- add VR metadata injection step |
| n8n auto-upload | Posts finished video to YouTube | Low -- same output format |

---

## MVP Recommendation

### Must Build First (Foundation)

1. **Audio analysis expansion** (8+ bands, onset detection, envelope followers, JSON export)
2. **keyframe_generator.py** (audio JSON -> Blender keyframes via bpy)
3. **Mantaflow fire template** with audio-reactive intensity
4. **Cycles rendering** at 1080p with compositor bloom
5. **Headless batch render** via Blender CLI

### Build Second (Quality Jump)

1. **Fire-over-water combo scene** (the reference image brought to life)
2. **8K stereoscopic VR output** (panoramic camera + stereo 3D)
3. **Multi-frequency mapping** (beyond bass-only: the 10+ parameter mapping table)
4. **Noise upscaling** for high-detail fire without extreme sim times

### Build Third (Differentiation)

1. **Person segmentation pipeline** (MediaPipe -> mask sequence)
2. **Luminous Being compositor** (mask -> volumetric + particles + corona)
3. **Audio-reactive Luminous Being** (frequency bands drive different glow layers)
4. **EDM laser effects** (volumetric beams, LED grid, strobes)

### Build Fourth (Polish)

1. **Depth-aware compositing** on real 360 footage
2. **World building** with Poly Haven HDRIs and AI-generated assets
3. **CLI-Anything custom harness** for token-efficient repeated operations
4. **Multiple mapping presets** (Meditation / EDM / Ambient / Custom)

### Defer

- Real-time Blender rendering (anti-feature)
- Eevee VR workaround (anti-feature)
- Full motion tracking for dynamic 360 scenes (too complex for initial pipeline)
- Spatial audio integration (valuable but out of scope for visual pipeline)

---

## UON Visuals Analysis: The Standard to Beat

### What UON Does

UON Visuals (Mike V, Vancouver BC) creates sound-reactive 4K HDR fractal visuals using "math formulas and code." He runs 3 computers with 7 GPUs rendering 24/7, producing 1800+ loops. His work appears at festivals and for artists like Excision, Jon Hopkins, PNAU, and LSDREAM.

### What Makes His Work Mind-Blowing (Inferred from Output Analysis)

1. **Fractal self-similarity** -- Patterns repeat at 3+ scales simultaneously. Zoom in on any portion and you find more detail.
2. **Continuous transformation** -- Nothing is ever static. Every element is morphing, flowing, or evolving.
3. **HDR luminance range** -- Blacks are truly black. Bright elements clip into bloom. The dynamic range exploits display capability.
4. **Audio synchronization at every temporal scale** -- Global shape breathes with bars. Color shifts with phrases. Geometric details pulse with beats. Micro-textures shimmer with high frequencies.
5. **Mathematical beauty** -- Hilbert spaces, fractal geometry, sacred geometry. The shapes are inherently pleasing because they tap into the same mathematical structures the brain uses for perception.
6. **No narrative, pure sensation** -- There is no story. The visual IS the experience. This lowers the cognitive load and allows direct perceptual engagement.

### How This Applies to EFS

We are NOT recreating UON's fractal visual style. But we can apply the SAME perceptual principles to volumetric fire, water, and the luminous being:

- **Multi-scale detail** in fire (large billows + medium turbulence + fine wisps)
- **Continuous transformation** via audio-driven parameter modulation
- **HDR bloom** via Cycles emission + compositor glare
- **Multi-temporal-scale audio mapping** (bars, phrases, beats, sub-beat)
- **Mathematical beauty** in the fire-over-water scene (caustic patterns are mathematical)
- **Pure sensation** for meditation/ambient content (no narrative needed)

**Confidence:** MEDIUM (UON's specific techniques are proprietary; analysis is based on output observation and general fractal visual research)
**Sources:**
- [UON Visuals - H+ Creative](https://www.hpluscreative.com/uon-visuals)
- [UON Visuals Gumroad](https://uon.gumroad.com/)
- [UON Visuals on FeedFreq](https://feedfreq.com/arts/visual-artists/uon-visuals-canada/)

---

## Sources Summary

### High Confidence (Official Documentation)
- [Blender Manual - Principled Volume](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/volume_principled.html)
- [Blender Manual - Domain Settings (Mantaflow)](https://docs.blender.org/manual/en/latest/physics/fluid/type/domain/settings.html)
- [Blender Manual - Ocean Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)
- [Blender Manual - Panoramic Cameras](https://docs.blender.org/manual/en/latest/render/cycles/object_settings/cameras.html)
- [Blender Manual - Blackbody Node](https://docs.blender.org/manual/en/latest/render/shader_nodes/converter/blackbody.html)
- [Blender VFX Features](https://www.blender.org/features/vfx/)
- [YouTube VR Requirements](https://support.google.com/youtube/answer/6178631)

### Medium Confidence (Verified Community Sources)
- [Polyfjord Audio Visualizer Masterclass](https://polyfjord.teachable.com/p/audio-visualizer-masterclass)
- [AudVis Addon Documentation](https://superhivemarket.com/products/audvis/docs)
- [Sound Nodes Blender Addon](https://github.com/negdo/Sound_Nodes)
- [RotoForge AI](https://github.com/MagnumVD/RotoForge-AI)
- [8 Tips For Better Explosion Simulations](https://conceptartempire.com/explosion-simulation-tips-blender/)
- [How to Create Realistic Water Caustics in Blender](https://www.themorphicstudio.com/how-to-create-realistic-water-caustics-in-blender/)
- [VR Rendering Essentials - GarageFarm](https://garagefarm.net/blog/mastering-vr-rendering-for-immersive-experiences)
- [Monoscopic vs Stereoscopic 360 VR - Boris FX](https://borisfx.com/blog/monoscopic-vs-stereoscopic-360-vr-key-differences/)
- [VFX Compositing Workflow with Blender and COLMAP](https://www.blendernation.com/2025/09/21/vfx-compositing-workflow-with-blender-and-colmap/)

### Medium Confidence (Creative/Perceptual Research)
- [Impact of Visual Effects on EDM Experience](https://dlksoulfuledm.com/what-is-the-impact-of-visual-effects-on-the-edm-experience/)
- [Role of Light and Visuals in EDM Events](https://4d4m.com/the-role-of-light-and-visuals-in-edm-events-an-in-depth-look/)
- [Best DJ Visuals of All Time - ZIPDJ](https://www.zipdj.com/blog/best-dj-visuals)
- [Fractal Brain Networks](https://scitechdaily.com/fractal-brain-networks-support-complex-thought-amazing-lightning-storm-of-connection-patterns/)
- [FractalBrain EEG VR Study](https://dl.acm.org/doi/10.1145/3613905.3648667)
- [Panoramic Imaging in Immersive XR (Frontiers)](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1622605/full)

### Low Confidence (Single Source / Inferred)
- [UON Visuals - H+ Creative](https://www.hpluscreative.com/uon-visuals) (biographical info, techniques inferred from output)
- [UON Visuals Gumroad](https://uon.gumroad.com/) (product listings)
- [UON Visuals on FeedFreq](https://feedfreq.com/arts/visual-artists/uon-visuals-canada/) (overview)

---

*Research completed: 2026-03-19*
*Prior research preserved: BLENDER_FIRE_ORB.md, BLENDER_WATER.md, 07-RESEARCH-*.md*
