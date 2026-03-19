# Project Research Summary

**Project:** Ethereal Flame Studio — v4.0 Cinema VFX Pipeline
**Domain:** Blender MCP Cinema Render Path for Audio-Reactive Video Generation
**Researched:** 2026-03-19
**Confidence:** HIGH (all four research areas verified with official sources, GitHub issues, and production-validated architecture)

## Executive Summary

The v4.0 Cinema VFX Pipeline adds Blender as a second, offline render path to the existing Three.js audio-reactive engine. The two paths are architecturally separate: Three.js handles real-time browser preview; Blender handles cinema-quality final output. They share only one artifact — a JSON file exported from the existing `PreAnalyzer.ts` browser analyzer. This clean decoupling means the Blender pipeline can be built without touching any existing production code except for a small export function and a UI button. Claude controls Blender locally via the `blender-mcp` MCP server, making this a developer-driven pipeline (Claude + Jonathan orchestrating Blender) rather than an end-user self-service system. Cloud rendering via Modal is architecturally supported but explicitly out of scope for v4.0 — the local machine is the correct target while the pipeline is being proven.

The recommended technical approach is: `blender-mcp` (ahujasid, 18K stars) as the primary Claude-to-Blender bridge via `execute_blender_code`; `librosa` for offline Python audio analysis (onset detection, 8+ spectral bands, envelope followers); `SAM 2.1 hiera_small` for person segmentation in the Luminous Being pipeline; and Blender 5.0 targeting (with Blender 4.5 LTS as a stable fallback) for access to 27 new volume grid nodes useful for stylized fire effects. The critical insight from feature research is that what separates mind-blowing audio-reactive visuals from mediocre ones is not technical quality — it is the sophistication of the perceptual mapping: mapping 8+ distinct audio features (sub-bass, bass, low-mids, mids, high-mids, treble, onset detection, spectral centroid, spectral flux) to 8+ independent visual parameters simultaneously, creating emergent complexity the brain reads as a living system.

The main risks are operational, not architectural. Three pitfalls can derail sessions before any VFX work begins: screenshot token hemorrhage (base64 PNGs re-sent on every conversation turn cost $5-15/day without discipline), the 180-second MCP timeout that kills Mantaflow bakes and Cycles renders silently (requires async fire-and-forget patterns from day one), and Mantaflow cache explosions consuming 30-180+ GB without warning (requires dedicated cache directory management before first simulation). Two additional critical pitfalls affect the core pipeline: Mantaflow Domain parameter keyframing is broken in Blender (must keyframe Flow object parameters instead), and the Mantaflow-Cycles fire combination produces corrupted frames on up to 50% of renders (must verify every test render frame-by-frame). These are all documented bugs with known workarounds — they are manageable if addressed in Wave 0 before building on top of them.

---

## Key Findings

### Recommended Stack

The new stack additions for v4.0 layer onto the validated existing stack (Next.js 15, Three.js r172+, Zustand, BullMQ, Redis, FFmpeg, R2, Modal, Turso) without replacing anything. The bridge is a JSON file.

**Core technologies:**

- **blender-mcp (ahujasid v1.5.5+):** Claude-to-Blender MCP bridge via TCP:9876. The `execute_blender_code` tool provides unlimited Python access inside Blender. 18K stars, MIT license. One client at a time (Claude Code), 180s timeout per call — requires async patterns for all bakes and renders.
- **Blender 5.0 (4.5 LTS fallback):** VFX engine for Mantaflow fire/water, Cycles raytracing, compositor, Geometry Nodes. Blender 5.0 adds 27 new volume grid nodes (SDF operations, advection, curl) directly useful for stylized fire and the Luminous Being pipeline. NOTE: Blender 5.0 broke the old `Action.fcurves` animation API — any audio-to-keyframe code must target the new Action Slot/Channelbag system.
- **librosa 0.11.0:** Industry-standard Python audio analysis. Beat tracking, onset detection, spectral centroid, spectral flux, BPM, per-band STFT — all features the browser Web Audio API cannot provide. This is the analysis engine for `keyframe_generator.py`, the core bridge between audio and Blender parameters.
- **SAM 2.1 hiera_small (Meta):** Person segmentation for the Luminous Being pipeline. 46M params, 84.8 FPS on A100, temporal consistency via streaming memory architecture. Eliminates the mask flickering that makes MediaPipe unusable for video. JPEG-only input is a hard requirement.
- **Video Depth Anything (CVPR 2025):** Temporally consistent depth maps from video for VR compositing. Designed for video (MiDaS processes frames independently and flickers between frames).
- **CLI-Anything v1.0.0:** Token-efficient Blender scaffolding via structured CLI commands. Use for scene/object/material/camera/render operations (7 command groups). Use `execute_blender_code` for everything it does not cover (Mantaflow, compositor, Geometry Nodes, particle systems).
- **uv (latest):** Required Python package manager for the `uvx blender-mcp` launcher. Faster than pip, auto-manages virtual environments.

**Version matrix decision:** Blender 5.0 is recommended for its volume grid nodes. If instability is encountered, fall back to 4.5 LTS. This decision must be locked in Wave 0 because the animation keyframe API differs between versions.

### Expected Features

**Must have — table stakes (Blender path fails to justify its existence without these):**
- Mantaflow fire simulation with Principled Volume + Blackbody shader (temperature-based color: dark red edges 1000K, orange body 2000K, yellow-white core 4000-6500K)
- 8+ frequency band audio-to-keyframe mapping via `keyframe_generator.py` — the core pipeline bridge
- Cycles raytraced rendering at 1080p with compositor bloom/glare pass
- Scene template system (fire-template.blend, water-template.blend, etc.) to avoid rebuilding from scratch each session
- Onset detection for transient events (beat-triggered flash/burst, distinct from continuous envelope mapping)
- Headless batch rendering via Blender CLI

**Should have — differentiators (what makes output transcendent vs. merely competent):**
- Luminous Being transformation pipeline (person video → segmentation → mask sequence → audio-reactive volumetric glow + particles + fire wisps) — genuinely novel; no one is doing this automated
- Fire-over-water combo scene with caustic reflections (the `flame-over-water.png` reference realized)
- 8K stereoscopic equirectangular VR output (Blender native panoramic camera, no cubemap conversion needed)
- Envelope followers per frequency band (smooth organic motion, not jerky per-frame jumps)
- Multi-layer compositor pipeline (separate render passes per VFX type, independent control)
- EDM volumetric laser beams and LED grid effects

**Defer to later phases (v4.x+):**
- Modal cloud rendering integration (local workflow must be proven first)
- Depth-aware compositing on real 360 footage
- Multi-creator self-service web UI for Blender renders (v5.0+ territory)
- Spatial audio (out of scope for the visual pipeline)

**Anti-features — explicitly do not build:**
- Custom Blender GUI addon (Claude controls via MCP, no GUI needed)
- Eevee for VR output (does not support panoramic cameras)
- "Bass drives scale" as the only audio mapping (the most common, most boring mistake)
- Face recognition in Luminous Being (Claude refuses; silhouette-only approach is the feature)
- Self-hosted ML models on Vercel (SAM 2, depth estimation need persistent GPU)
- Real-time Blender rendering (architectural anti-feature — Three.js handles real-time)

### Architecture Approach

The architecture is two independent worlds connected by a JSON file. The Vercel web app exports audio analysis via a new `audioExport.ts` utility (extending existing `PreAnalyzer.ts`). Blender Python scripts consume that JSON to generate keyframes via `bpy.keyframe_insert()`. No real-time network connection between web app and Blender is needed or desired. All Blender work runs locally on Jonathan's machine with Claude controlling it via blender-mcp. Rendered output goes to `blender/renders/` (gitignored) and is manually uploaded to R2 or distributed via existing n8n workflows. The web app's existing render pipeline (Three.js, BullMQ, Modal, R2) is completely untouched.

**Major components:**

1. **`PreAnalyzer.ts` + `audioExport.ts` (modified/new):** Browser-side audio analysis extended with envelope, onset, spectral centroid, and spectral flux features. New JSON export function outputs the `audio-analysis.json` contract file. One download button added to the Design page UI. This is the only touch to existing production code.
2. **`blender/scripts/keyframe_generator.py` (new):** The critical bridge. Reads audio JSON, applies smoothing (envelope followers per band with fast attack / slower release), maps 8+ audio features to 8+ Blender parameters, inserts keyframes via `bpy.keyframe_insert()`. Supports mapping presets (Meditation / EDM / Ambient).
3. **`blender/scenes/*.blend` (new):** Template scenes for each VFX type — fire, water, fire-over-water, EDM lasers, EDM grid, luminous-being, compositor. Pre-configured with Mantaflow domains, Cycles settings, and compositor node trees. Claude opens a template and customizes for the specific audio track.
4. **`blender/scripts/person_segmentation.py` (new):** SAM 2.1-based per-frame mask export. JPEG frames in, grayscale PNG mask sequence out. Used by the Luminous Being compositor.
5. **`blender/scripts/luminous_being_compositor.py` (new):** Builds the Blender compositor node tree for the Luminous Being effect: background video (darkened) + volumetric body fill + particle emission from mask + fire wisps from mask + corona edge glow. All layers independently driven by audio keyframes from different frequency bands.
6. **CLI-Anything custom harness `cli/blender-harness/efs_blender_cli.py` (new):** Token-efficient scaffolding for repetitive EFS-specific operations, wrapping validated workflows as structured CLI commands.

**Build order critical path:** Wave 0 (MCP setup + async patterns + proof of concept) → Wave 1 (audio JSON export + extended analysis) → Wave 2 (keyframe_generator.py + fire + water templates) → Wave 5 (person segmentation + Luminous Being compositor). The crown jewel requires all prior waves complete.

### Critical Pitfalls

1. **180-second MCP timeout kills simulations silently** — Never run Mantaflow bakes or Cycles renders through `execute_blender_code` directly. Use `bpy.app.timers.register()` to fire bakes asynchronously; launch renders via `bpy.ops.render.render('INVOKE_DEFAULT')` (non-blocking); poll the output directory for completed frames. Establish these async patterns in Wave 0 before any simulation work starts.

2. **Mantaflow Domain parameter keyframing is broken (Blender bug T72812)** — Keyframing Domain settings mid-simulation is unreliable. Keyframe the Flow object's `fuel_amount`, `temperature`, and emission rate instead — Flow object parameters respond correctly. This directly affects the entire audio-to-keyframe pipeline. Validate with a 2-second test clip before committing to full renders.

3. **Mantaflow cache explosion fills disk without warning** — Resolution scales cubically (doubling resolution = 8x more cache). A single 256+ resolution sim can consume 30-180 GB. Set a dedicated `blender/cache/` directory from day one, write a cleanup script that runs before each new bake, start at resolution 64 for all prototyping.

4. **Screenshot token hemorrhage** — Each `get_viewport_screenshot` costs approximately 2,765 tokens at 1920x1080. Base64 images are re-sent on every conversation turn, compounding cost exponentially. Use `get_scene_info` and `get_object_info` (text) as primary feedback; take screenshots only at validation checkpoints; batch multiple changes before any visual check.

5. **Cycles + Mantaflow fire produces corrupted frames (Blender bug T77678)** — Up to 50% of frames may be glitched in Cycles while Eevee renders the same simulation perfectly. Always preview in Eevee, render a 30-frame test in Cycles and inspect every frame before committing to full production renders. Fallback: procedural volumetric fire (Principled Volume + noise textures, no simulation) for simpler effects.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Wave 0: Foundation and Tool Discipline

**Rationale:** Three of the top five pitfalls must be solved before building anything on top of the MCP bridge. The proof of concept (Mantaflow fire orb) validates the entire tool chain. This wave has no dependencies on anything new.

**Delivers:** Verified MCP connection, async bake/render patterns established, save-before-operate discipline documented, connection stability confirmed, Blender version pinned, first working Mantaflow fire orb rendered to disk.

**Addresses:** MCP bridge setup (blender-mcp install, Blender addon, TCP connection), async patterns for long operations, screenshot token discipline, scene state management patterns, Blender version lock.

**Avoids:** Pitfalls 1 (screenshot token burn), 2 (180s timeout), 3 (scene state corruption), 5 (socket disconnect), 12 (version lock).

**Research flag:** No research phase needed. blender-mcp docs and community GitHub issues are comprehensive. The async timer pattern for Blender bakes is the one area needing careful implementation but the approach is documented.

---

### Wave 1: Audio Bridge

**Rationale:** The JSON file is the contract that decouples the two worlds. Without it, nothing in the Blender pipeline is audio-reactive. Must be built before VFX templates because the templates are designed around audio-driven parameters.

**Delivers:** `audioExport.ts` utility, extended `PreAnalyzer.ts` (onset detection, spectral centroid, spectral flux, per-band envelope followers), "Export Audio Analysis" button in Design page UI, validated `audio-analysis.json` format. Defines the shared schema for both the Three.js preview path and the Blender cinema path.

**Addresses:** Multi-frequency band mapping (8+ bands table stake), onset detection, envelope followers, single-source audio analysis to prevent FFT mismatch between browser and Python (Pitfall 10).

**Avoids:** Pitfall 10 (audio analysis inconsistency — export JSON once from browser AudioAnalyzer, use same file for both render paths; never re-analyze in Python independently).

**Research flag:** No research phase needed. PreAnalyzer.ts already produces the base data structure; extension is well-documented librosa territory.

---

### Wave 2: Core VFX Templates

**Rationale:** Fire and water are the table stakes that justify the Blender path's existence over Three.js. Audio-to-keyframe mapping (`keyframe_generator.py`) is the integration point that makes templates audio-reactive. These three constitute the minimum viable cinema pipeline.

**Delivers:** `fire-template.blend` (Mantaflow domain at resolution 128, Principled Volume + Blackbody, Cycles compositor, noise upres configured), `water-template.blend` (Ocean Modifier, caustics, IOR 1.33 Principled BSDF), `keyframe_generator.py` (multi-band audio → Blender keyframes with preset system), `fire-over-water.blend` (the `flame-over-water.png` reference realized).

**Addresses:** Mantaflow fire (table stake), audio-to-keyframe mapping (table stake), multi-frequency band mapping (differentiator), fire-over-water scene (Tier 1 differentiator), color temperature cycling on spectral centroid (treble drives Blackbody temperature).

**Avoids:** Pitfall 4 (cache explosion — dedicated cache directory, resolution ladder 64→128→256→512), Pitfall 6 (keyframe Domain params broken — keyframe Flow object only: `fuel_amount`, `temperature`, emission strength), Pitfall 7 (memory wall — document actual RAM/VRAM usage per resolution tier on Jonathan's hardware), Pitfall 14 (Cycles fire glitch — test every frame of all initial Cycles renders).

**Research flag:** A short research session at the start of 07-03 is recommended to identify optimal starting Mantaflow parameters for fire (resolution, vorticity, turbulence, noise method) — saves iteration cycles. The `keyframe_generator.py` is novel code with no direct community reference — budget extra implementation time and plan a 2-second test validation clip.

---

### Wave 3: VR and Compositing Foundation

**Rationale:** 8K stereoscopic VR output is a high-value differentiator (few creators produce it) that fits the meditation/concert content in EFS's value proposition. The compositor infrastructure built here is also required by the Luminous Being pipeline in Wave 5.

**Delivers:** VR stereo camera setup (IPD 65mm standard, safe VR camera motion rules), panoramic equirectangular render template, VR metadata injection via FFmpeg/spatial media tools, 360 video import for background footage, depth map extraction (Video Depth Anything), shadow catcher compositing template.

**Addresses:** 8K stereoscopic VR (Tier 2 differentiator — YouTube, Meta Quest, Apple Vision Pro), depth-aware occlusion (Tier 2 differentiator), multi-layer compositor pipeline (Tier 1 differentiator for Luminous Being).

**Avoids:** Pitfall 9 (8K file sizes and render times — establish resolution presets with expected render time budgets before any production renders), Pitfall 13 (VR convergence/IPD causing nausea — test in actual VR headset before any production output).

**Research flag:** A short research session at the start of 07-06 is recommended for VR metadata injection format differences across platforms (YouTube vs Meta Quest vs Apple Vision Pro require different metadata boxes). Well-documented elsewhere but the differences are subtle and getting them wrong means the video plays flat.

---

### Wave 4: EDM Effects

**Rationale:** EDM laser and LED effects have no file dependencies on Wave 3 and can proceed in parallel. They extend the content use case from meditation to concert/festival visual art.

**Delivers:** `edm-laser.blend` (volumetric Principled Volume cylinder geometry with scanning animation, beat-synced sweep speed), `edm-grid.blend` (LED grid instances with per-column frequency band mapping, amplitude-to-emission keyframes), strobe implementation (point light 0→10000→0 in 2 frames + compositor flash overlay).

**Addresses:** EDM volumetric laser beams (Tier 2 differentiator), EDM LED grid (Tier 2 differentiator), darkness/contrast principle (global emission multiplier drops to 10% during breakdowns, returns to 100% on drops).

**Avoids:** Pitfall 1 (screenshot discipline especially important during iterative visual tuning of volumetric laser density and LED grid brightness).

**Research flag:** A short research session at the start of 07-11 is recommended for per-instance Geometry Nodes animation at scale — per-instance keyframing in Blender's instancing system is a known complex area and LED grid requires thousands of independently animated emitters.

---

### Wave 5: Luminous Being (Crown Jewel)

**Rationale:** Depends on all prior waves: audio keyframes (Wave 2), compositor infrastructure (Wave 3), and the fire template (Wave 2 for fire wisps from body). It is the most complex deliverable and the most novel — no automated person-to-luminous-being Blender pipeline exists in the community.

**Delivers:** `person_segmentation.py` (SAM 2.1 hiera_small, JPEG frames in → grayscale PNG mask sequence out), `luminous_being.blend` (compositor node tree: darkened background + inner volumetric body + surface particle emission + Mantaflow fire wisps from mask + corona edge glow), audio-reactive per-layer modulation (each layer driven by a different frequency band: bass → fire intensity, treble → corona brightness, mid → particle density, sub-bass → overall scale breathing).

**Addresses:** Luminous Being transformation (Tier 1 differentiator — the crown jewel), layered approach combining Approach 1 (particle silhouette) + Approach 2 (volumetric body fill) + Approach 3 (Mantaflow fire wisps from body mesh), fractal self-similarity at multiple scales.

**Avoids:** Pitfall 8 (segmentation temporal flickering — SAM 2.1 has built-in temporal memory that eliminates the per-frame flickering that makes MediaPipe unusable for video; validate temporal consistency by scrubbing 100+ frames before importing to Blender).

**Research flag:** A full research phase is warranted before 07-14. The combined three-layer Luminous Being pipeline is genuinely novel territory. Specifically: building a Blender compositor node tree where mask-driven Principled Volume density is also animated by audio keyframes has no community reference. Budget significant iteration time. The segmentation step (07-13) does not need research — SAM 2.1 is well-documented.

---

### Wave 6: Integration and Token Efficiency

**Rationale:** By Wave 6 all capabilities exist but each lives in its own template. The multi-layer compositor ties them together into combined output scenes. The CLI-Anything custom harness reduces per-session token cost for operations that are now well-understood and repetitive.

**Delivers:** `compositor.blend` (multi-layer compositing template: fire + water + EDM effects + luminous being combined in one output), `efs_blender_cli.py` (CLI-Anything custom harness wrapping validated EFS workflows as structured commands), `batch_render.py` for multi-scene overnight queue rendering.

**Addresses:** Multi-layer compositor pipeline (full version), token efficiency for long-term daily use, multi-scene batch rendering for overnight production runs.

**Research flag:** No research phase needed. Standard patterns for CLI-Anything harness construction. All components being wrapped are already proven and understood.

---

### Phase Ordering Rationale

- Wave 0 must be first: critical pitfalls 1, 2, 3, 5, and 12 create instability that makes everything built on top of them fragile. Solving them before any VFX work is non-negotiable.
- Wave 1 must precede all VFX work: the JSON contract is the only data bridge; without it, templates cannot be audio-reactive.
- Waves 2, 3, and 4 can partially overlap: fire template (Wave 2 start) → water template (Wave 2 mid) runs independently of VR setup (Wave 3) which runs independently of EDM effects (Wave 4). `keyframe_generator.py` (Wave 2 end) is the synchronization point before Wave 5.
- Wave 5 is sequentially last among capability waves: Luminous Being needs the fire template (for wisps), the keyframe system (for audio reactivity), and the compositor infrastructure (for multi-layer compositing). All three come from prior waves.
- Wave 6 is final integration: the CLI harness only makes sense once the operations it wraps are validated and stable.

---

### Research Flags

Phases likely needing deeper research during planning:

- **Wave 2 (07-03 — Fire Template):** Short session recommended. Optimal starting Mantaflow parameter set (resolution ladder, vorticity, noise method Wavelet vs. other) is not obvious from docs alone. Getting this right early saves hours of iteration.
- **Wave 3 (07-06 — VR Setup):** Short session recommended. VR metadata format differences across platforms (YouTube SV3D, Meta Quest, Apple Vision Pro HEVC Main 10) are subtle and platform-specific.
- **Wave 4 (07-11 — LED Grid):** Short session recommended. Per-instance Geometry Nodes animation at scale is a known complex Blender area.
- **Wave 5 (07-14 — Luminous Being Compositor):** Full research phase warranted. Novel pipeline with no community reference. Mask-driven volume density + audio keyframe interaction in Blender compositor is non-trivial.

Phases with standard patterns (skip research phase):

- **Wave 0 (Tool Setup):** blender-mcp docs + GitHub issues are comprehensive. Async patterns are documented.
- **Wave 1 (Audio Bridge):** librosa docs + existing PreAnalyzer.ts are clear starting points.
- **Wave 2 (07-05 — keyframe_generator.py):** librosa + bpy.keyframe_insert are well-documented; design is specified clearly.
- **Wave 5 (07-13 — Segmentation):** SAM 2.1 is Meta official with thorough documentation.
- **Wave 6 (Integration):** Standard patterns once all components are proven.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | blender-mcp verified via GitHub (18K stars, active maintainer), librosa is industry-standard, SAM 2.1 is Meta official (CVPR 2025), Video Depth Anything is CVPR 2025 Highlight. CLI-Anything is HIGH on concept, MEDIUM on maturity (11 days old at vision doc creation — treat as provisional). |
| Features | HIGH | Table stakes verified via Blender official docs. Differentiators verified across Polyfjord masterclass, AudVis documentation, and UON Visuals output analysis. Perceptual principles backed by fractal brain research (ACM, SciTechDaily) and EDM visual perception studies. The combined Luminous Being pipeline is novel (MEDIUM for full integration). |
| Architecture | HIGH | Source code inspection of PreAnalyzer.ts, AudioAnalyzer.ts, and modalClient.ts confirmed integration points. blender-mcp TCP architecture verified via official blog and GitHub. Modal Blender rendering verified via Modal's official example (240 frames 1080p = 3 min on 10 L40S GPUs). The two-world JSON bridge pattern is clean and validated. |
| Pitfalls | HIGH | All critical pitfalls backed by real GitHub issues (blender-mcp #50, #52, #73, #96; Blender T72812, T77678, T77713, T86164), community reports (Blender Artists 180GB cache story), and official Anthropic vision token pricing docs. No speculative pitfalls — all are documented with known occurrence conditions. |

**Overall confidence: HIGH**

### Gaps to Address

- **CLI-Anything maturity:** The project was 11 days old at research time. If it proves unstable during Wave 0, fall back to pure `execute_blender_code` with a growing library of reusable Python scripts in `blender/scripts/`. The architecture supports this gracefully — CLI-Anything is an optimization, not a dependency.
- **Luminous Being integration complexity:** The three-layer combined approach (volumetric + particles + fire wisps simultaneously, all audio-reactive via different frequency bands) has no community reference implementation. The compositor node tree for mask-driven volume density may require significantly more iteration than estimated. The full research phase before 07-14 is not optional.
- **Blender version decision:** 4.5 LTS vs 5.0 has knock-on effects throughout (animation API, volume node availability, undo system stability). Lock this decision in Wave 0 — do not revisit. Recommendation: start with 4.5 LTS for stability; upgrade to 5.0 in a separate validation step only if the volume grid nodes are specifically needed for a Luminous Being effect.
- **Jonathan's local GPU calibration:** Render times for Cycles at 4K-8K depend entirely on local GPU VRAM and compute. The resolution ladder (64 prototype → 128 test → 256 production → 512 if hardware allows) must be calibrated to actual hardware in Wave 0 by running a timed test render at each tier.
- **GSoC 2026 Native Audio in Geometry Nodes:** If this proposal is accepted (decision likely summer 2026), it could eventually replace `keyframe_generator.py` for GeoNodes-based effects. Monitor but do not design the pipeline around it — the proposal is still a draft.

---

## Sources

### Primary (HIGH confidence — Official Documentation and Repos)

- [blender-mcp GitHub](https://github.com/ahujasid/blender-mcp) — 18K stars, MIT, architecture, tools, 180s timeout confirmed in source
- [SAM 2 GitHub](https://github.com/facebookresearch/sam2) — Meta official, model sizes, temporal consistency, JPEG input requirement
- [Video Depth Anything GitHub](https://github.com/DepthAnything/Video-Depth-Anything) — CVPR 2025 Highlight, temporal consistency over MiDaS
- [librosa Documentation v0.11.0](https://librosa.org/doc/0.11.0/tutorial.html) — beat tracking, onset detection, spectral features
- [Blender Python API — FluidDomainSettings](https://docs.blender.org/api/current/bpy.types.FluidDomainSettings.html) — programmatic Mantaflow control
- [Blender Python API — FCurve](https://docs.blender.org/api/current/bpy.types.FCurve.html) — keyframe insertion
- [Blender 5.0 Volume Grid Nodes](https://code.blender.org/2025/10/volume-grids-in-geometry-nodes/) — 27 new nodes, SDF operations
- [Anthropic Vision API — Token Calculation](https://platform.claude.com/docs/en/build-with-claude/vision) — tokens = (width * height) / 750
- [Blender Manual — Mantaflow Domain](https://docs.blender.org/manual/en/latest/physics/fluid/type/domain/settings.html)
- [Blender Manual — Ocean Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)
- [Blender Manual — Panoramic Cameras](https://docs.blender.org/manual/en/latest/render/cycles/object_settings/cameras.html)
- [Modal Blender rendering example](https://modal.com/docs/examples/blender_video) — headless GPU rendering confirmed, 240 frames 1080p = 3 min on 10 L40S GPUs
- [CLI-Anything GitHub](https://github.com/HKUDS/CLI-Anything) — 19K stars, 7 command group coverage map
- Source code inspection: `PreAnalyzer.ts`, `AudioAnalyzer.ts`, `modalClient.ts` — integration point validation

### Secondary (MEDIUM confidence — Verified Community Sources)

- [Polyfjord Audio Visualizer Masterclass](https://polyfjord.teachable.com/p/audio-visualizer-masterclass) — frequency band visualization techniques
- [AudVis Addon Documentation](https://superhivemarket.com/products/audvis/docs) — audio driver implementation patterns
- [Blender Artists — 180 GB cache](https://blenderartists.org/t/blender-took-180-gb-in-cache-and-i-had-no-way-of-knowing-it/656526) — Pitfall 4 cache explosion real-world confirmation
- [8 Tips For Better Explosion Simulations](https://conceptartempire.com/explosion-simulation-tips-blender/) — Mantaflow parameter guidance
- [VR Rendering Essentials — GarageFarm](https://garagefarm.net/blog/mastering-vr-rendering-for-immersive-experiences) — stereo IPD, VR safety rules
- [Monoscopic vs Stereoscopic 360 VR — Boris FX](https://borisfx.com/blog/monoscopic-vs-stereoscopic-360-vr-key-differences/)
- [Fractal Brain Networks](https://scitechdaily.com/fractal-brain-networks-support-complex-thought-amazing-lightning-storm-of-connection-patterns/) — perceptual principle backing for multi-scale visual design
- [Impact of Visual Effects on EDM Experience](https://dlksoulfuledm.com/what-is-the-impact-of-visual-effects-on-the-edm-experience/) — synchronization principles
- [BlenderMCP architecture blog](https://yuv.ai/blog/blender-mcp) — TCP protocol confirmation
- [Simple Audio Visualizer](https://extensions.blender.org/add-ons/simple-audio-visualizer/) — Blender 5.0 Action Slot/Channelbag API fix reference

### GitHub Issues (Pitfall Evidence — HIGH reliability for confirmed bugs)

- [blender-mcp #50](https://github.com/ahujasid/blender-mcp/issues/50) — MCP error -32001: Request Timed Out (180s confirmed in source)
- [blender-mcp #52](https://github.com/ahujasid/blender-mcp/issues/52) — ProactorEventLoop Windows connection error
- [blender-mcp #96](https://github.com/ahujasid/blender-mcp/issues/96) — execute_blender_code print() output unreliable
- [Blender T72812](https://developer.blender.org/T72812) — Mantaflow Domain parameter keyframing broken
- [Blender T77678](https://developer.blender.org/T77678) — Cycles + Mantaflow fire renders corrupted frames
- [Blender T77713](https://developer.blender.org/T77713) — Cache deleted when changing upres factor
- [Blender T86164](https://developer.blender.org/T86164) — Mantaflow crash on bake
- [Blender #149890](https://projects.blender.org/blender/blender/issues/149890) — Blender 5.0 undo system instability

### Tertiary (LOW confidence — Needs Validation Before Relying On)

- [GSoC 2026 Audio in Geometry Nodes](https://devtalk.blender.org/t/draft-gsoc-2026-geometry-nodes-wavelet-transient-detection-and-procedural-audio-analysis/44517) — Draft proposal only; may not be accepted; do not design pipeline around it
- [Stylized Procedural Fire Tool (Gumroad)](https://apostelvi.gumroad.com/l/qzvuuv) — Commercial product, untested; interesting as faster iteration path for stylized fire in Luminous Being
- [Nodevember 2025 Claymation Fire](https://80.lv/articles/nodevember-2025-simulating-a-claymation-fire-in-blender) — Technique demonstrated but not production-tested; confirms Blender 5.0 SDF nodes can produce fire-like effects without Mantaflow

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
