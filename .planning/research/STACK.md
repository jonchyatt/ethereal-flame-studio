# Technology Stack

**Project:** Ethereal Flame Studio - v4.0 Cinema VFX Pipeline
**Researched:** 2026-03-19
**Overall Confidence:** HIGH (verified with official repos, docs, and community sources)

---

## Executive Summary

The v4.0 Cinema VFX Pipeline adds Blender as a second render path controlled by Claude via MCP. This document covers ONLY the new stack additions required for: Blender MCP integration, Mantaflow fire/water, person segmentation for the Luminous Being pipeline, video analysis for reference research, audio-to-keyframe mapping, and EDM effects.

The existing validated stack (Next.js, Three.js, Zustand, BullMQ, Redis, R2, Modal, Puppeteer, FFmpeg) is NOT re-documented here. See the v1.0/v2.0 section at the bottom for reference.

---

## NEW Stack Additions for v4.0

### 1. Blender MCP Bridge

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **blender-mcp** (ahujasid) | v1.5.5+ | Primary Claude-to-Blender bridge | 18K stars, MIT license, 22 tools including `execute_blender_code` which is the nuclear option for running ANY Python in Blender. Built-in Poly Haven, Sketchfab, Hyper3D Rodin, and Hunyuan3D asset integrations. |
| **Blender** | 4.x LTS or 5.0 | VFX engine | Mantaflow fire/water, Cycles raytracing, compositor, Geometry Nodes. Blender 5.0 added 27 new volume grid nodes (OpenVDB SDF operations) which are directly useful for fire/volume effects. |
| **uv** | latest | Python package manager | Required by blender-mcp for `uvx` launcher. Faster than pip, handles virtual environments automatically. |

**Confidence:** HIGH -- verified via [GitHub repo](https://github.com/ahujasid/blender-mcp) and [PyPI](https://pypi.org/project/blender-mcp/).

**Installation:**
```bash
# Install uv (Windows)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Add MCP server to Claude Code
claude mcp add blender uvx blender-mcp

# In Blender: Edit > Preferences > Add-ons > Install addon.py
# N panel > BlenderMCP > Connect to Claude
```

**Key architecture insight:** blender-mcp uses a TCP socket (localhost:9876) with JSON-RPC. The addon marshals execution to Blender's main thread via `bpy.app.timers`. This means:
- Only ONE MCP client at a time
- 180-second timeout per command (cannot be easily extended)
- Long renders must be kicked off asynchronously (start render, poll for completion)
- Screenshots are base64 PNG (token-heavy, use sparingly)

#### Alternative: poly-mcp/Blender-MCP-Server

| Technology | Stars | Differentiator | When to Use |
|------------|-------|----------------|-------------|
| **Blender-MCP-Server** (poly-mcp) | ~200 | 51 tools (vs 22), thread-safe execution queue, auto-dependency install, physics/animation/geometry node tools built-in | If ahujasid's version proves limiting on physics or batch operations. More tools means fewer raw Python calls. |

**Confidence:** MEDIUM -- newer project, less battle-tested.

**Recommendation:** Start with ahujasid/blender-mcp (more mature, larger community). Switch to poly-mcp only if the 22-tool limitation becomes painful. The `execute_blender_code` tool in ahujasid's version can do anything Python can do in Blender, so the 22-tool count is misleading -- it is unlimited via code execution.

#### Notable Fork: CommonSenseMachines/blender-mcp

| Technology | Differentiator | Why It Matters |
|------------|----------------|----------------|
| **CSM blender-mcp** | Text-to-4D asset generation via CSM.ai platform | Vector search-based 3D model retrieval. "Get me a chair" generates or retrieves a 3D asset with animations. Could generate world-building assets procedurally. |

**Confidence:** MEDIUM -- requires CSM.ai account, unclear pricing.

**Recommendation:** Monitor but do not adopt yet. The Poly Haven and Sketchfab integrations in the main blender-mcp already cover asset sourcing. CSM is interesting for AI-generated custom assets in later phases.

---

### 2. CLI-Anything (Token-Efficient Blender Automation)

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **CLI-Anything** | v1.0.0 | Structured CLI wrapper for Blender | 19K stars. Wraps common Blender ops as CLI commands with JSON output. Token-efficient: `cli-anything-blender object add cube --name MyCube --size 2 --json` vs 20-line bpy script. Stateful sessions. |

**Confidence:** HIGH on concept, MEDIUM on maturity -- only 11 days old at time of vision doc.

**Coverage limitations (important):**
- Covers: scene, object, material, modifier, camera/light, animation, render (7 command groups)
- Does NOT cover: Mantaflow, compositor, Geometry Nodes, particle systems, Video Sequence Editor, node-based shading, sculpting, UV editing

**Installation:**
```bash
pip install git+https://github.com/HKUDS/CLI-Anything.git#subdirectory=blender/agent-harness
```

**Recommendation:** Use CLI-Anything for scene scaffolding (create objects, position camera, set materials, trigger renders). Use `execute_blender_code` for everything it does not cover (Mantaflow, compositor, Geometry Nodes). As custom scripts mature, wrap them into CLI-Anything patterns for reuse.

**Alternative approach -- direct bpy scripting:** For the Mantaflow/compositor/advanced work that CLI-Anything does not cover, write reusable Python scripts in `blender/scripts/` and execute them via `execute_blender_code`. This is actually MORE flexible than CLI-Anything for complex VFX work. The key library:

| Library | Purpose | Notes |
|---------|---------|-------|
| **bpy** (Blender Python module) | Full Blender API access | Available as `pip install bpy` for headless use, or built into Blender's embedded Python. Use Blender's embedded Python for MCP work. |

---

### 3. Person Segmentation (Luminous Being Pipeline)

**Use SAM 2.1 as the primary segmentation engine. Skip MediaPipe.**

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **SAM 2.1** (Meta) | sam2.1_hiera_small | Primary person segmentation | 46M params, 84.8 FPS on A100. Click once on person in frame 1, propagate mask across entire video. Binary mask export per frame for Blender compositor. |
| **torch** | >=2.5.1 | SAM 2 runtime | Required by SAM 2. |
| **torchvision** | >=0.20.1 | Image transforms for SAM 2 | Required by SAM 2. |

**Confidence:** HIGH -- verified via [official repo](https://github.com/facebookresearch/sam2) and [Ultralytics docs](https://docs.ultralytics.com/models/sam-2/).

**Why SAM 2.1 over MediaPipe:**
- MediaPipe Selfie Segmentation is designed for video conferencing (low-res, body-only, poor edge quality)
- SAM 2.1 produces pixel-accurate masks with temporal consistency across video frames
- SAM 2.1's streaming memory architecture maintains context across frames -- no flickering
- One-click prompting: mark person once, masks propagate automatically
- SAM 2.1 is the current state-of-the-art for video object segmentation (CVPR 2025)

**Model size recommendation:**
| Model | Params | FPS (A100) | Quality (SA-V J&F) | Recommendation |
|-------|--------|------------|---------------------|----------------|
| sam2.1_hiera_tiny | 38.9M | 91.2 | 76.5 | Too low quality for body edges |
| **sam2.1_hiera_small** | **46M** | **84.8** | **76.6** | **Best quality/speed tradeoff for our use case** |
| sam2.1_hiera_base_plus | 80.8M | 64.1 | 78.2 | Diminishing returns for +75% more params |
| sam2.1_hiera_large | 224.4M | 39.5 | 79.5 | Only if edge quality is insufficient with small |

**Use `sam2.1_hiera_small`** -- 7M more params than tiny gives meaningfully better edge quality at body boundaries (shoulders, fingers, hair), which matters critically for the luminous being silhouette. If edges still look rough, upgrade to base_plus.

**Installation:**
```bash
git clone https://github.com/facebookresearch/sam2.git
cd sam2
pip install -e .
# Download checkpoint
wget https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt
```

**Per-frame mask export workflow:**
```python
# 1. Extract video frames (JPEG only -- SAM 2 requirement)
# 2. Load SAM 2 predictor
# 3. Click point prompt on person in frame 0
# 4. Propagate masks across all frames
# 5. Save binary masks as PNG image sequence
# 6. Import mask sequence into Blender compositor
```

**Frames must be JPEG** -- this is a current SAM 2 limitation.

---

### 4. Video Analysis (Reference Research Pipeline)

Two complementary tools for analyzing reference creators like UON Visuals:

#### 4a. Frame Extraction + Color Analysis

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **yt-dlp** | latest | Download reference videos | The gold standard. Supports 1000+ sites. Python API for programmatic use. |
| **youtube-screenshot-extractor** | latest | High-quality frame extraction with aesthetic filtering | Built on yt-dlp + FFmpeg. Auto-filters for quality, blur detection, watermark detection. Supports scene detection for keyframe extraction. GPU-accelerated. |
| **colorthief** | 0.2.1 | Dominant color palette extraction | Uses median cut algorithm. `get_palette(color_count=8)` per frame to build color progression timelines. For analyzing UON Visuals' color choices. |
| **fast-colorthief** | latest | High-performance color extraction | C++ backend, same API as colorthief but significantly faster for batch frame analysis. |

**Confidence:** HIGH for yt-dlp and colorthief (widely used), MEDIUM for youtube-screenshot-extractor (smaller project).

**Installation:**
```bash
pip install yt-dlp colorthief
# For high-volume color analysis:
pip install fast-colorthief
# For aesthetic frame extraction:
pip install git+https://github.com/EnragedAntelope/youtube-screenshot-extractor.git
```

#### 4b. AI-Powered Video Understanding

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **video-analysis-mcp** (Gemini-based) | latest | Deep video content analysis | MCP server using Google Gemini AI. Analyze UON Visuals videos to decode: what makes them visually stunning? Extract pacing, color theory, transition patterns, effect techniques. |
| **opencv-mcp-server** | latest | Computer vision frame analysis | 40+ CV tools via MCP. Frame extraction, motion detection, object tracking, edge detection, color space conversion. Use for motion flow visualization of reference videos. |

**Confidence:** MEDIUM -- both are newer MCP servers with smaller communities.

**Why TWO video MCP servers:**
- `video-analysis-mcp` does HIGH-LEVEL analysis (Gemini understands "this video uses pulsing neon colors synced to bass drops")
- `opencv-mcp-server` does LOW-LEVEL analysis (extract motion vectors, color histograms, edge density per frame)
- Together they give Claude both intuitive understanding AND quantitative data about reference videos

**Installation:**
```bash
# Gemini video analysis
pip install video-analysis-mcp
# Requires: GOOGLE_API_KEY environment variable

# OpenCV MCP server
pip install opencv-mcp-server
# Requires: opencv-python, numpy (auto-installed)

# Add to Claude Code MCP config
claude mcp add video-analysis npx video-analysis-mcp
claude mcp add opencv npx opencv-mcp-server
```

**For optical flow / motion visualization** (not built into opencv-mcp-server): Use OpenCV's Farneback or RAFT methods directly via `execute_blender_code` or standalone Python script. The opencv-mcp-server does motion detection between frames but not dense optical flow visualization.

---

### 5. Audio-to-Keyframe Pipeline

**Use librosa for analysis, custom Python for Blender keyframe generation.**

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **librosa** | 0.11.0 | Audio feature extraction | Industry standard. Beat tracking, onset detection, spectral centroid, BPM estimation, chromagram, MFCCs, spectral flux, mel spectrogram. Everything needed for audio-reactive VFX. |
| **numpy** | latest | Numerical processing | Array operations for audio data manipulation. Already a librosa dependency. |
| **scipy** | latest | Signal processing | Bandpass filtering for frequency band separation (bass/mid/treble). Peak detection for beats. |

**Confidence:** HIGH -- librosa is the dominant Python audio analysis library with extensive documentation.

**Installation:**
```bash
pip install librosa scipy numpy
```

**Critical architecture decision: librosa (Python) vs existing AudioAnalyzer.ts (TypeScript)**

The existing `AudioAnalyzer.ts` runs in the browser for real-time preview. For the Blender pipeline, we need a Python-side analyzer because:
1. Blender scripts run in Python -- no TypeScript runtime
2. librosa provides features AudioAnalyzer.ts does not (onset detection, BPM tracking, spectral centroid, MFCCs)
3. librosa processes the FULL audio file at once (offline analysis), not frame-by-frame like the browser FFT

**Pipeline:**
```
audio.mp3
    |
    v
librosa (Python) -- offline full-track analysis
    |
    v
audio-analysis.json
    |  {
    |    "bpm": 140,
    |    "beats": [0.43, 0.86, 1.29, ...],  // seconds
    |    "onsets": [0.12, 0.43, 0.87, ...],
    |    "frames": [
    |      {"time": 0.0, "bass": 0.72, "mid": 0.3, "treble": 0.1, "centroid": 2400, "flux": 0.05},
    |      ...
    |    ]
    |  }
    |
    v
keyframe_generator.py -- maps audio features to Blender parameters
    |
    v
bpy.keyframe_insert() -- inserts keyframes into Blender objects/materials
```

**librosa features mapped to Blender parameters:**

| librosa Feature | Blender Parameter | Effect |
|-----------------|-------------------|--------|
| `beat_track()` | Strobe flash, particle burst | Beat-synced events |
| `onset_detect()` | Particle emission spikes | Note/hit-triggered effects |
| `spectral_centroid` | Fire temperature (Blackbody) | Brighter sounds = hotter fire |
| `spectral_flux` | Mantaflow turbulence | Spectral change = chaos |
| Bass band (20-250Hz) | Fire intensity, core glow | Low frequencies drive power |
| Mid band (250-4000Hz) | Particle density, LED patterns | Melodic content drives detail |
| Treble band (4000-20000Hz) | Corona brightness, water ripples | High frequencies drive sparkle |
| `tempo` | Laser sweep speed, pattern cycling | BPM synchronizes motion |

#### Blender Audio Visualization Addons (alternatives considered)

| Addon | What It Does | Why Not Primary |
|-------|-------------|-----------------|
| **AudVis** ($25, v7.1) | Real-time and sequence audio visualization. Bakes drivers to F-curves. Spread Drivers utility. Spectrogram generation. MIDI support. | Paid addon. Excellent for driving object properties from audio, but we need lower-level control for Mantaflow parameters. Worth considering for LED grid effects where it could save significant scripting time. |
| **Simple Audio Visualizer** (free, Polyfjord) | Bakes audio spectrum to object animations. Updated for Blender 5.0 Action Slot/Channelbag system. | Good for basic visualizers, not for Mantaflow/compositor integration. Useful reference for how to properly bake audio to F-curves in Blender 5.0. |
| **GXAudioVisualisation** (free) | Python script for audio visualization in Blender. | Simpler than our needs. Good reference code. |

**Recommendation:** Build custom `keyframe_generator.py` using librosa for analysis and direct `bpy.keyframe_insert()` for Blender integration. Reference Simple Audio Visualizer's Blender 5.0 baking code for proper Action Slot/Channelbag compatibility. Consider AudVis if LED grid/strobe effects need rapid prototyping.

#### Blender's Built-in Audio: Bake Sound to F-Curves

Blender has a built-in `bpy.ops.graph.sound_bake()` operator that can bake audio amplitude to F-curves. However:
- Requires Graph Editor context (hack: temporarily change `bpy.context.area.type`)
- Only bakes amplitude, not frequency bands
- No onset detection, no BPM, no spectral features
- Community requests for frequency band separation have gone unanswered for years

**Verdict:** Use librosa for analysis, skip Blender's built-in audio baking entirely.

---

### 6. Depth Estimation (VR Compositing)

| Technology | Version | Purpose | Why This One |
|------------|---------|---------|--------------|
| **Video Depth Anything** | latest (CVPR 2025 Highlight) | Temporally consistent depth maps from video | Successor to Depth Anything V2. Designed for video (not per-frame). Temporal consistency via spatial-temporal head + overlapping inference. Handles arbitrarily long videos. Small models run <10ms/frame on A100 (30+ FPS). |
| **Depth Anything V2** | latest (NeurIPS 2024) | Per-image depth estimation | Fallback for single frames or if Video Depth Anything has issues. |

**Confidence:** HIGH -- published at CVPR 2025, [official repo](https://github.com/DepthAnything/Video-Depth-Anything).

**Why Video Depth Anything over MiDaS V3.1:**
- MiDaS processes frames independently (temporal flickering in depth maps)
- Video Depth Anything produces temporally consistent depth (smooth transitions between frames)
- For VR compositing with moving camera/objects, temporal consistency is critical
- MiDaS is still fine for single images

**Installation:**
```bash
git clone https://github.com/DepthAnything/Video-Depth-Anything.git
cd Video-Depth-Anything
pip install -e .
```

---

### 7. Mantaflow Enhancement Libraries

**There are NO community addons that make Mantaflow dramatically easier.** The ecosystem is thin.

What exists:

| Resource | Type | Value |
|----------|------|-------|
| **FluidDomainSettings API** | Official Blender API | Full programmatic access to all Mantaflow domain, flow, and effector settings via `bpy.types.FluidDomainSettings`. This is THE interface for scripted control. |
| **sebbas/blender-mantaflow** | Historical integration repo | The original Mantaflow integration into Blender. No active community scripts. |
| **mantaflow.com scene scripts** | Python scene definitions | Mantaflow standalone scene scripts in Python. Can inform Blender script design but are not directly usable in Blender (different API). |

**The real answer:** Write custom Python scripts that wrap `bpy.types.FluidDomainSettings` and `bpy.types.FluidFlowSettings` for our specific fire/water templates. There is no shortcut addon.

**Key FluidDomainSettings properties for programmatic fire control:**

```python
# Domain setup
domain.fluid_type = 'GAS'  # or 'LIQUID' for water
domain.resolution_max = 128  # 64=preview, 128=good, 256=cinema
domain.use_adaptive_domain = True
domain.vorticity = 0.5  # Turbulence swirl

# Fire-specific
domain.burning_rate = 0.75
domain.flame_ignition = 1.5
domain.flame_max_temp = 3.0
domain.flame_smoke = 1.0
domain.flame_vorticity = 0.5

# These can be keyframed:
flow.fuel_amount = 1.0  # Keyframe this from audio bass
flow.temperature = 1.0  # Keyframe from spectral centroid
domain.vorticity = 0.5  # Keyframe from spectral flux
```

---

## Hidden Gems

### 1. GSoC 2026: Native Audio Analysis in Geometry Nodes

**Source:** [Blender Developer Forum](https://devtalk.blender.org/t/draft-gsoc-2026-geometry-nodes-wavelet-transient-detection-and-procedural-audio-analysis/44517)

A GSoC 2026 proposal aims to add native, procedural audio analysis tools directly into Geometry Nodes, building on Simulation Zones and array-based processing. This would make audio-reactive effects a first-class Blender feature with wavelet-based transient detection.

**Why this matters:** If accepted (decision likely summer 2026), this could replace our custom keyframe_generator.py for Geometry Nodes-based effects. The existing GSoC 2024 Sample Sound node already laid groundwork. Monitor this -- it could simplify the EDM effects pipeline significantly.

**Status:** Draft proposal, 2 weeks old. Blender accepted for GSoC 2026 (21st time).

### 2. Blender 5.0 Volume Grid Nodes (27 New Nodes)

**Source:** [Blender Developers Blog](https://code.blender.org/2025/10/volume-grids-in-geometry-nodes/)

Blender 5.0 (November 2025) added 27 new volume grid nodes to Geometry Nodes: mesh-to-SDF conversion, Boolean operations on signed distance fields, advection, curl, gradient, mean curvature filtering, and more. All built on OpenVDB.

**Why this matters:** These nodes enable volume-based fire effects DIRECTLY in Geometry Nodes without Mantaflow. Combined with the Stylized Procedural Fire Tool approach (Geometry Nodes only, no simulation baking), this could provide a faster, more controllable fire pipeline than Mantaflow for stylized effects.

**Recommendation:** Use Mantaflow for physically accurate fire (cinema quality). Use Geometry Nodes + volume grids for stylized/real-time-preview fire (faster iteration). Two paths for two aesthetic needs.

### 3. Stylized Procedural Fire Tool (100% Geometry Nodes)

**Source:** [Gumroad](https://apostelvi.gumroad.com/l/qzvuuv)

A procedural fire tool built entirely in Geometry Nodes with full control over buoyancy, direction, and temperature-inspired movement. No volumetrics or simulation baking. Real-time preview with minimal performance impact.

**Why this matters:** For the Luminous Being pipeline, we may want STYLIZED fire emanating from the body rather than physically accurate Mantaflow fire. This tool provides that aesthetic with much faster iteration. The creator is expanding it to smoke, magic effects, and other stylized simulations.

### 4. Pallaidium: AI Movie Studio in Blender VSE

**Source:** [GitHub](https://github.com/tin2tin/Pallaidium)

A generative AI movie studio integrated into Blender's Video Sequence Editor. Text-to-video, image-to-video, ControlNet, OpenPose, IP Adapter for style transfer. Models downloaded from HuggingFace on demand.

**Why this matters:** The ControlNet and IP Adapter capabilities could generate reference frames or style-transfer effects for the Luminous Being pipeline. For example: generate a "glowing energy being" reference image from text, then use it as a style target. Not for the core pipeline, but a powerful creative exploration tool.

**Recommendation:** Install for creative experimentation. Do not make it a pipeline dependency.

### 5. Nodevember 2025: Claymation Fire with SDF Nodes

**Source:** [80.lv](https://80.lv/articles/nodevember-2025-simulating-a-claymation-fire-in-blender)

A technique combining Blender 5.0's new SDF nodes with procedural textures and Volume to Mesh conversion to create fire effects in Geometry Nodes. Uses volumetric sampling of basic geometry shapes.

**Why this matters:** Demonstrates that Blender 5.0's volume grid nodes ARE capable of fire-like effects without Mantaflow. This is the fastest path to a "fire body" effect for the Luminous Being -- create a volume from the body mesh, apply fire-like procedural textures, convert back to mesh.

### 6. youtube-screenshot-extractor: ML Dataset Builder

**Source:** [GitHub](https://github.com/EnragedAntelope/youtube-screenshot-extractor)

Builds on yt-dlp with scene detection, aesthetic quality filtering, blur detection, watermark removal, and GPU-accelerated frame extraction. Originally designed for LoRA training dataset creation.

**Why this matters:** When analyzing UON Visuals or other reference creators, this tool automatically extracts the "best" frames -- the ones with the highest visual quality and most dramatic compositions. Instead of manually scrubbing through videos, get an aesthetic-filtered frame set automatically.

### 7. Blender 5.0 Action Slot / Channelbag System

**Source:** [Simple Audio Visualizer release notes](https://extensions.blender.org/add-ons/simple-audio-visualizer/)

Blender 5.0 changed its animation data model. The old `Action.fcurves` API is broken. The new system uses Action Slots and Channelbags. Any audio-to-keyframe code MUST account for this.

**Why this matters:** If we write keyframe_generator.py targeting Blender 4.x and then try to run on Blender 5.0, it will fail. The Simple Audio Visualizer's v0.5.0 update (March 2026) has the fix code we can reference for proper Blender 5.0 animation data setup.

**Action item:** Decide Blender version NOW. If Blender 5.0, reference Simple Audio Visualizer's animation baking code for the correct API patterns.

---

## Alternatives Considered (And Why Not)

| Category | Considered | Chosen | Why |
|----------|-----------|--------|-----|
| Person segmentation | MediaPipe Selfie Segmentation | SAM 2.1 | MediaPipe is video-call quality. SAM 2 is pixel-accurate with temporal consistency. For luminous being silhouettes, edge quality is critical. |
| Person segmentation | SAM 2.1 Large (224M) | SAM 2.1 Small (46M) | Large is only 3% better quality but 2x slower. Small is sufficient for body outlines. |
| Depth estimation | MiDaS V3.1 | Video Depth Anything | MiDaS has temporal flickering between frames. Video Depth Anything was designed for video with temporal consistency. |
| Audio analysis | Blender "Bake Sound to F-Curves" | librosa + custom keyframe_generator.py | Built-in only bakes amplitude. No frequency bands, no onset detection, no BPM. Requires Graph Editor context hack. |
| Audio analysis | AudVis ($25) | librosa (free) | AudVis is excellent for quick prototyping but we need lower-level control for Mantaflow parameter keyframing. Consider AudVis for LED grid effects specifically. |
| MCP bridge | poly-mcp/Blender-MCP-Server | ahujasid/blender-mcp | poly-mcp has more tools but is newer and less tested. ahujasid's `execute_blender_code` can do anything, making the tool count difference moot. |
| CLI wrapper | Pure bpy scripts only | CLI-Anything + bpy scripts | CLI-Anything saves tokens on repetitive scene setup. bpy scripts handle complex VFX. Use both. |
| Video analysis | Chrome MCP only | yt-dlp + opencv-mcp + video-analysis-mcp | Chrome MCP alone cannot do programmatic frame extraction or color analysis. The trio covers download, CV analysis, and AI understanding. |
| Fire effects | Mantaflow only | Mantaflow + Geometry Nodes volume grids | Mantaflow for cinema quality. GeoNodes for fast iteration and stylized effects. Two tools for two needs. |
| Blender version | 4.x LTS | Blender 5.0 (with 4.x fallback scripts) | 5.0's volume grid nodes are too valuable for fire/volume effects. But write scripts that gracefully handle both versions. |

---

## Integration Points with Existing Stack

| Existing Component | New Component | Integration |
|-------------------|---------------|-------------|
| AudioAnalyzer.ts (browser FFT) | librosa (Python offline) | Same audio file, two analyzers. Browser for real-time preview, librosa for Blender keyframes. Export format: shared `audio-analysis.json` schema. |
| BullMQ + Redis (job queue) | Blender render jobs | New job type: `blender_render`. Worker spawns `blender --background --python script.py`. Progress reported via file polling or subprocess stdout. |
| R2 (cloud storage) | Blender output | Rendered frames/videos uploaded to R2 same as Three.js renders. |
| FFmpeg pipeline | Blender frame sequences | Blender renders PNG/EXR sequences. FFmpeg encodes to video. Existing FFmpeg pipeline reused. |
| Modal (cloud GPU) | SAM 2 / Blender Cycles | Person segmentation and cinema renders need GPU. Modal already set up for GPU workloads. |

---

## What NOT to Add

| Technology | Why Not |
|------------|---------|
| **Houdini** | $269/year, overkill for our needs. Blender does everything we need. |
| **ComfyUI** | Image generation, not VFX compositing. Pallaidium covers the AI generation angle within Blender. |
| **Real-time Blender rendering (Eevee for final output)** | Use Eevee for previews, Cycles for final. Eevee quality is insufficient for cinema output. |
| **Custom Blender UI addon** | Claude controls via MCP, no GUI addon needed. |
| **Self-hosted ML models on Vercel** | SAM 2 and depth estimation need GPU. Run on local machine or Modal. |
| **Face recognition in Luminous Being** | Claude refuses face recognition. Use full-body silhouette only. |
| **Continuous video frame polling** | Event-driven and on-demand only. |
| **RIFE (video frame interpolation)** | Tempting for smoothing Mantaflow renders, but adds complexity. Render at target framerate instead. |

---

## Version Matrix

| Component | Minimum Version | Recommended Version | Notes |
|-----------|----------------|---------------------|-------|
| Blender | 4.0 | 5.0 | 5.0 for volume grid nodes |
| Python (Blender embedded) | 3.10 | 3.11 | Blender 5.0 ships with 3.11 |
| Python (standalone for SAM 2) | 3.10 | 3.11 | SAM 2 requires >=3.10 |
| PyTorch | 2.5.1 | 2.6+ | SAM 2 requires >=2.5.1 |
| blender-mcp | 1.5.5 | latest | Pin after testing |
| CLI-Anything | 1.0.0 | latest | New project, expect breaking changes |
| librosa | 0.11.0 | 0.11.0 | Current stable |
| SAM 2.1 | - | sam2.1_hiera_small | 46M params, best quality/speed |
| Video Depth Anything | - | latest | CVPR 2025 Highlight |
| yt-dlp | 2024.01+ | latest | Always use latest for site support |
| uv | latest | latest | For blender-mcp uvx launcher |

---

## Full Installation Script

```bash
# === System Requirements ===
# Blender 5.0: https://www.blender.org/download/
# Python 3.11+
# CUDA-capable GPU (for SAM 2, Cycles)
# FFmpeg (already installed from v1.0)

# === 1. MCP Tools ===
# Install uv (if not already)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Add blender-mcp to Claude Code
claude mcp add blender uvx blender-mcp

# === 2. CLI-Anything ===
pip install git+https://github.com/HKUDS/CLI-Anything.git#subdirectory=blender/agent-harness

# === 3. Person Segmentation (SAM 2.1) ===
git clone https://github.com/facebookresearch/sam2.git
cd sam2 && pip install -e . && cd ..
# Download model checkpoint
mkdir -p blender/models
wget -P blender/models https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt

# === 4. Audio Analysis ===
pip install librosa scipy numpy

# === 5. Video Analysis ===
pip install yt-dlp colorthief
pip install git+https://github.com/EnragedAntelope/youtube-screenshot-extractor.git

# === 6. Depth Estimation ===
git clone https://github.com/DepthAnything/Video-Depth-Anything.git
cd Video-Depth-Anything && pip install -e . && cd ..

# === 7. Video MCP Servers (optional, for Claude-driven analysis) ===
# Requires GOOGLE_API_KEY for Gemini
pip install video-analysis-mcp
pip install opencv-mcp-server
```

---

## Existing Stack Reference (NOT re-researched)

These are documented in the v1.0 STACK.md and confirmed still current:

| Category | Technologies |
|----------|-------------|
| Web framework | Next.js 15, React 19, Tailwind 4 |
| 3D engine | Three.js r172+, React Three Fiber 8 |
| State management | Zustand |
| Job queue | BullMQ 5, Redis 7 |
| Video encoding | FFmpeg 7, NVENC |
| Cloud storage | Cloudflare R2 |
| Cloud GPU | Modal |
| Database | Turso (SQLite) |
| Remote access | Cloudflare Tunnel |
| Deployment | Vercel (web), Render.com (worker) |

---

## Sources

### HIGH Confidence (Official Documentation / Repos)
- [blender-mcp GitHub](https://github.com/ahujasid/blender-mcp) -- 18K stars, MIT license
- [SAM 2 GitHub](https://github.com/facebookresearch/sam2) -- Meta official, CVPR 2025
- [Video Depth Anything GitHub](https://github.com/DepthAnything/Video-Depth-Anything) -- CVPR 2025 Highlight
- [librosa Documentation](https://librosa.org/doc/0.11.0/tutorial.html) -- v0.11.0 stable
- [Blender Python API - FluidDomainSettings](https://docs.blender.org/api/current/bpy.types.FluidDomainSettings.html) -- Official
- [Blender Python API - FCurve](https://docs.blender.org/api/current/bpy.types.FCurve.html) -- Official keyframe insertion
- [Blender 5.0 Volume Grid Nodes](https://code.blender.org/2025/10/volume-grids-in-geometry-nodes/) -- Official dev blog
- [CLI-Anything GitHub](https://github.com/HKUDS/CLI-Anything) -- 19K stars

### MEDIUM Confidence (Verified Community Sources)
- [poly-mcp/Blender-MCP-Server](https://github.com/poly-mcp/Blender-MCP-Server) -- 51 tools, newer project
- [CommonSenseMachines/blender-mcp](https://github.com/CommonSenseMachines/blender-mcp) -- Text-to-4D fork
- [video-analysis-mcp](https://github.com/samihalawa/video-analysis-mcp) -- Gemini-based video analysis
- [opencv-mcp-server](https://github.com/GongRzhe/opencv-mcp-server) -- 40+ CV tools via MCP
- [Simple Audio Visualizer](https://extensions.blender.org/add-ons/simple-audio-visualizer/) -- Blender 5.0 animation fix reference
- [AudVis](https://superhivemarket.com/products/audvis) -- $25 audio visualization addon
- [Pallaidium](https://github.com/tin2tin/Pallaidium) -- AI movie studio in Blender VSE
- [youtube-screenshot-extractor](https://github.com/EnragedAntelope/youtube-screenshot-extractor) -- Aesthetic frame extraction
- [colorthief](https://pypi.org/project/colorthief/) -- Color palette extraction

### LOW Confidence (Needs Validation)
- [GSoC 2026 Audio Analysis in Geometry Nodes](https://devtalk.blender.org/t/draft-gsoc-2026-geometry-nodes-wavelet-transient-detection-and-procedural-audio-analysis/44517) -- Draft proposal only, may not be accepted
- [Stylized Procedural Fire Tool](https://apostelvi.gumroad.com/l/qzvuuv) -- Commercial Gumroad product, untested
- [Nodevember 2025 Claymation Fire](https://80.lv/articles/nodevember-2025-simulating-a-claymation-fire-in-blender) -- Technique demonstrated, not production-tested

---

*Last updated: 2026-03-19*
*Research mode: Ecosystem (Cinema VFX Pipeline stack additions)*
