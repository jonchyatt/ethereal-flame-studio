# Phase 7 Vision: The Blender MCP Revolution

**Project:** Ethereal Flame Studio
**Author:** Jonathan + Claude (DaVinci session, 2026-03-19)
**Status:** VISION DOCUMENT — approved for execution
**Confidence:** HIGH

---

## The Thesis

Ethereal Flame Studio currently has ONE render path: Three.js particles in a browser. Beautiful for real-time preview, limited by WebGL. Phase 7 adds a SECOND render path: Blender's full VFX engine, controlled by Claude through MCP, producing cinema-quality output that the browser path physically cannot achieve.

Two tools make this possible NOW:

1. **blender-mcp** (github.com/ahujasid/blender-mcp) — MCP bridge giving Claude direct Python access to Blender
2. **CLI-Anything** (github.com/HKUDS/CLI-Anything) — CLI generation framework for token-efficient repeated operations

The 3% angle principle: even if CLI-Anything's current Blender harness only covers basics, establishing the pattern early means every future Blender workflow we build can be wrapped for efficiency. Small investment now, compounding returns later.

---

## The Two Render Paths

| Path | Engine | Speed | Quality | Use Case |
|------|--------|-------|---------|----------|
| **Preview** | Three.js (browser) | Real-time | Good | Live tweaking, Experience mode, quick iteration |
| **Cinema** | Blender/Cycles (via MCP) | Minutes-hours | Photorealistic | Final renders, VR video, YouTube, portfolio |

The user designs in Three.js (Experience/Design modes), then renders the cinema version in Blender when they want the final product. Same audio analysis data drives both paths.

---

## Tool Assessment

### blender-mcp v1.5.5 (18K stars)

**What it is:** Socket-based MCP server connecting Claude to Blender. 22 tools total.

**The 4 tools that matter for us:**

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `execute_blender_code` | Run ANY Python in Blender. This is the nuclear option. | Medium (send script, get stdout) |
| `get_viewport_screenshot` | Claude sees what it built. Visual feedback loop. | High (base64 PNG) |
| `get_scene_info` | Inspect scene objects, transforms, materials (capped at 10 objects) | Low-medium |
| `get_object_info` | Detailed per-object data | Low |

**Asset integration tools (bonus):**

| Tool Set | What It Does |
|----------|-------------|
| Poly Haven (4 tools) | Download photorealistic HDRIs, textures, 3D models — FREE |
| Sketchfab (4 tools) | Search and download community 3D models |
| Hyper3D Rodin (5 tools) | Generate 3D models from TEXT PROMPTS |
| Hunyuan3D (4 tools) | Generate 3D models from text or images (Tencent) |

**Architecture:**
```
Claude Code
    |
    v (MCP Protocol - JSON-RPC)
blender-mcp server (uvx blender-mcp)
    |
    v (TCP Socket, localhost:9876)
Blender Addon (addon.py)
    |
    v (bpy.app.timers - main thread marshal)
Blender Python API (bpy)
    |
    +-- Mantaflow (fire, smoke, water)
    +-- Cycles (raytraced rendering)
    +-- Eevee (real-time rendering)
    +-- Compositor (multi-layer VFX)
    +-- Video Sequence Editor
    +-- Geometry Nodes
    +-- Everything else Blender can do
```

**Key limitations:**
- Scene info capped at first 10 objects
- `execute_blender_code` is unsandboxed `exec()` — powerful but no guardrails
- Only one MCP client at a time
- 180-second timeout per command
- No built-in undo management (ALWAYS save work)
- Screenshots are base64 PNG (token-heavy, use sparingly)
- No dedicated tools for physics, compositing, animation — all via raw Python

**Installation (Windows):**
```powershell
# 1. Install uv
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
# Add to PATH
$localBin = "$env:USERPROFILE\.local\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$localBin", "User")

# 2. Add MCP server to Claude Code
claude mcp add blender uvx blender-mcp

# 3. In Blender: Edit > Preferences > Add-ons > Install addon.py
# 4. N panel > BlenderMCP > Connect to Claude
```

### CLI-Anything v1.0.0 (19K stars, 11 days old)

**What it is:** Framework that generates structured CLIs for GUI software, making them agent-controllable via Bash.

**NOT an MCP tool.** Works via subprocess calls. Complementary to blender-mcp, not a replacement.

**Blender harness covers:**
- 7 command groups: scene, object, material, modifier, camera/light, animation, render
- 8 modifier types (subdivision, mirror, array, bevel, solidify, decimate, boolean, smooth)
- 7 render presets (Cycles/EEVEE/Workbench)
- 50-level undo/redo
- JSON output for machine parsing
- Stateful sessions

**Blender harness does NOT cover:**
- Mantaflow (fire, smoke, water)
- Compositor / VFX nodes
- Geometry Nodes
- Particle systems
- Video Sequence Editor
- Node-based shading
- Sculpting, UV editing

**Token efficiency is architectural:**
- `cli-anything-blender object add cube --name MyCube --size 2 --json` vs 20-line bpy script
- Stateful sessions = no re-describing the scene each turn
- SKILL.md for agent discovery (read once, not every call)
- JSON output = clean parsing, less token waste

**Installation:**
```bash
pip install git+https://github.com/HKUDS/CLI-Anything.git#subdirectory=blender/agent-harness
# For Claude Code plugin:
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything
```

**The 3% angle:** Even though the harness is basic now, using it for scene scaffolding (create objects, set materials, position camera) saves tokens on the repetitive stuff. The complex work (Mantaflow, compositing) still goes through `execute_blender_code`. As we build custom scripts, we can wrap them into the CLI-Anything pattern for reuse.

---

## The Six Capabilities

### Capability A: Mantaflow Fire Orb (HIGHEST PRIORITY)

**Vision:** Photorealistic volumetric fire driven by audio analysis. The Solar Breath orb rendered at cinema quality.

**Pipeline:**
```
AudioAnalyzer.ts → audio-analysis.json → keyframe_generator.py → Mantaflow fire
                                                                       |
                                                                  Cycles render
                                                                       |
                                                                  8K equirectangular
```

**What Blender provides over Three.js:**
- Physically accurate fluid dynamics (not particle sprites)
- Volumetric absorption, scattering, emission
- Principled Volume shader with temperature-based coloring
- Turbulence from actual vorticity simulation
- Sub-frame motion blur

**Existing research:** `.planning/research/BLENDER_FIRE_ORB.md`, `07-RESEARCH.md`

**Test:** Create a Mantaflow fire sim, drive intensity with a test audio track's bass channel. Render 10 seconds at 1080p. Compare with Three.js Solar Breath mode.

---

### Capability B: Realistic Water

**Vision:** Physics-based water with caustics, reflections, foam. Fire over water = the reference image `flame-over-water.png` come to life.

**What Blender provides over Three.js:**
- Mantaflow liquid simulation (real fluid dynamics)
- Ocean Modifier for deep water surfaces with Gerstner waves
- Caustic patterns via Cycles light paths
- Foam, spray, bubble particle systems
- Realistic refraction and reflection

**Existing research:** `.planning/research/BLENDER_WATER.md`

**Combo scene:** Fire orb floating above a reactive water surface. Bass drives fire intensity. Treble drives water turbulence. The orb's light reflects and refracts in the water with caustics.

---

### Capability C: World Building

**Vision:** Build complete 3D environments around the orb using free asset libraries.

**blender-mcp built-in tools:**
- **Poly Haven:** Free photorealistic HDRIs (environment lighting), PBR textures, 3D models
- **Sketchfab:** Community 3D models (temples, forests, abstract sculptures)
- **Hyper3D Rodin:** Generate 3D models from TEXT PROMPTS ("floating crystal island")
- **Hunyuan3D:** Generate from text or reference images

**Example scenes:**
- Orb in a dark cave with volumetric fog
- Orb floating above a mountain lake at sunset (Poly Haven HDRI)
- Orb in an abstract geometric cathedral (Rodin-generated)
- Orb surrounded by floating crystals (Sketchfab + custom materials)

---

### Capability D: 360 VR Cinema Renders

**Vision:** 8K stereoscopic equirectangular video for VR headsets. Far beyond Three.js CubeCamera limits.

**What Blender provides:**
- Native panoramic camera (direct equirectangular, no cubemap conversion)
- Built-in stereo 3D mode with configurable IPD
- Resolution limited only by VRAM (8K+ achievable)
- Cycles raytracing for physically accurate lighting
- Direct VR metadata injection

**Existing research:** `07-RESEARCH-BLENDER-360-STEREO.md`

**Integration:** Feeds into existing render queue (v2.0 cloud infrastructure). User clicks "Render Cinema VR" → job dispatched → Blender renders on GPU → output to R2 → download.

---

### Capability E: Video Compositing / Masking

**Vision:** Layer virtual effects onto real 360 footage. Depth-aware occlusion.

**Pipeline:**
```
Real 360 video → depth estimation (MiDaS/Depth Anything)
     |                    |
     v                    v
Blender background    Depth pass for occlusion
     |                    |
     +-----> Compositor <-+
                |
     +-- Fire/orb layer
     +-- Water layer
     +-- EDM effects layer
     +-- Shadow catcher (ground shadows from virtual lights)
                |
                v
         Final composite (equirectangular stereo)
```

**Existing research:** `07-RESEARCH-VR-COMPOSITING.md`, `07-RESEARCH-DEPTH-MAPS.md`

---

### Capability F: EDM Light Show Effects

**Vision:** Volumetric lasers, LED grids, strobe flashes synced to beats. Concert-quality light show in VR.

**Effects:**
- Volumetric laser beams (Principled Volume + cylinder geometry)
- LED grid patterns with ripple/wave effects
- Beat-synced strobe flashes (emission keyframes on beat detection)
- Scanning/sweeping beam patterns
- Kaleidoscope patterns via geometry node instances

**Existing research:** `07-RESEARCH-EDM-EFFECTS.md`

---

### Capability G: LUMINOUS BEING (NEW — The Crown Jewel)

**Vision:** Take a video of a person (meditating, dancing, performing) and transform them into a glowing being of light. The person's silhouette becomes the vessel for the same fire/mist/solar particle effects as the orb. They ARE the orb.

**This is the most powerful creative concept in the entire project.**

**Pipeline:**
```
Input video (person meditating)
     |
     v
Person Segmentation
     |-- Option A: Blender rotoscoping (manual but precise)
     |-- Option B: AI segmentation (Segment Anything Model / MediaPipe)
     |-- Option C: Depth estimation (MiDaS) + threshold
     |
     v
Silhouette Mask (per-frame alpha)
     |
     v
Blender Compositor
     |
     +-- Original video (background, darkened/desaturated)
     +-- Silhouette mask → drives:
     |       |-- Particle emission (orb particles spawned from body shape)
     |       |-- Volumetric glow (Principled Volume filling silhouette)
     |       |-- Fire simulation (Mantaflow using mask as flow source)
     |       |-- Edge glow (dilated mask outline = corona effect)
     |
     +-- Audio-reactive modulation:
     |       |-- Bass → core glow intensity
     |       |-- Mids → particle density/size
     |       |-- Treble → corona/edge flare brightness
     |       |-- Beats → pulse/flash events
     |
     v
Composite output
     |
     +-- Flat (1080p/4K for social media)
     +-- 360 (if input is 360 footage)
```

**Three approaches to the "luminous being" effect:**

**Approach 1: Particle Silhouette (closest to existing orb system)**
- Extract person silhouette per frame
- Use silhouette as particle emission shape in Blender
- Same particle configs as Ethereal Flame / Solar Breath / Ethereal Mist
- Person's body is the spawn region instead of a sphere
- Audio drives particle behavior identically to the orb

**Approach 2: Volumetric Body (most ethereal)**
- Fill the person's silhouette with Principled Volume shader
- Temperature/density driven by audio
- Creates a glowing plasma look — person made of light
- Edge detection for corona/aura around the body
- Can layer with subtle original video (ghostly outline visible through the glow)

**Approach 3: Mantaflow Fire Body (most dramatic)**
- Use person's silhouette as Mantaflow flow source
- Fire emanates FROM the body shape
- Flames rise from shoulders, head, hands
- Audio drives combustion intensity
- Combined with volumetric core glow

**Recommended: Layer all three.** Inner volumetric glow + particle system + fire wisps = a being made of pure light energy with fire tendrils. The original person is barely visible as a ghostly outline within the luminous form.

**Segmentation approach recommendation:**
- Start with **MediaPipe Selfie Segmentation** (fast, runs in Python, no GPU needed for inference)
- Export per-frame masks as image sequence
- Import to Blender compositor as image strip
- Graduate to **Segment Anything Model (SAM)** for higher quality if needed

**Audio integration:**
- Same AudioAnalyzer.ts → JSON export pipeline
- Keyframe generator maps audio features to:
  - Particle emission rate
  - Volume density
  - Fire intensity
  - Corona brightness
  - Color temperature shifts
- Beats trigger pulse events (brief flash of increased intensity)

**Content applications:**
- Meditation videos (person sitting still, gentle breathing glow)
- Yoga/movement (flowing light trails following body motion)
- Dance videos (energetic fire/particles tracking movement)
- Music performances (audio-reactive luminous musician)
- Spiritual/wellness content (Reset Biology crossover!)
- Music videos (artist becomes a being of light)

---

## Implementation Strategy

### Phase 7 Revised Plan Structure

The original 12-plan structure remains valid. We ADD plans for the Luminous Being capability and CLI-Anything integration:

**Wave 0: Tool Setup (NEW)**
- **07-00a**: Install blender-mcp, verify Claude can control Blender
- **07-00b**: Install CLI-Anything Blender harness, verify basic operations
- **07-00c**: Proof of concept — Mantaflow fire orb driven by test audio

**Wave 1: Infrastructure + Audio Analysis (existing)**
- **07-01**: Blender + MCP installation and configuration (SIMPLIFIED by blender-mcp)
- **07-02**: Audio analysis expansion (envelope, onset, BPM, spectral)

**Wave 2: Physics Simulations + Audio Mapping (existing)**
- **07-03**: Mantaflow fire simulation template
- **07-04**: Mantaflow water simulation template
- **07-05**: Audio-to-keyframe parameter mapping system

**Wave 3: VR Compositing Suite (existing)**
- **07-06**: VR video import and equirectangular setup
- **07-07**: Depth map extraction from 360 footage
- **07-08**: Shadow catcher and VR compositing
- **07-09**: Video masking and chroma keying

**Wave 4: EDM Effects (existing)**
- **07-10**: EDM volumetric laser effects
- **07-11**: EDM LED grid and strobe effects

**Wave 5: Luminous Being (NEW)**
- **07-13**: Person segmentation pipeline (MediaPipe + SAM)
- **07-14**: Luminous being compositor (particle silhouette + volumetric + fire)
- **07-15**: Audio-reactive luminous being integration

**Wave 6: Integration (existing, expanded)**
- **07-12**: Multi-layer compositor and render pipeline
- **07-16**: CLI-Anything custom harness for EFS-specific Blender workflows

---

## File Structure (updated)

```
ethereal-flame-studio/
+-- blender/
|   +-- scenes/
|   |   +-- fire-template.blend
|   |   +-- water-template.blend
|   |   +-- fire-over-water.blend
|   |   +-- edm-laser.blend
|   |   +-- edm-grid.blend
|   |   +-- luminous-being.blend          # NEW
|   |   +-- compositor.blend
|   +-- scripts/
|   |   +-- audio_importer.py
|   |   +-- keyframe_generator.py
|   |   +-- vr_video_import.py
|   |   +-- depth_extractor.py
|   |   +-- shadow_catcher_setup.py
|   |   +-- person_segmentation.py         # NEW (MediaPipe/SAM)
|   |   +-- luminous_being_compositor.py   # NEW
|   |   +-- compositor.py
|   |   +-- batch_render.py
|   +-- masks/
|   |   +-- (per-frame segmentation masks)  # NEW
|   +-- renders/
|       +-- (output frames)
+-- cli/
|   +-- blender-harness/                    # NEW (CLI-Anything custom)
|       +-- efs_blender_cli.py
|       +-- SKILL.md
+-- src/
    +-- lib/
        +-- audio/
            +-- AdvancedAnalyzer.ts         # Extended analysis for Phase 7
```

---

## Dependencies

### New External Dependencies

| Dependency | Version | Purpose | Install |
|------------|---------|---------|---------|
| Blender | 3.0+ (recommend 4.x LTS) | VFX engine | Download from blender.org |
| blender-mcp | latest (v1.5.5+) | Claude-Blender bridge | `claude mcp add blender uvx blender-mcp` |
| CLI-Anything | latest (v1.0.0) | Token-efficient CLI wrapper | `pip install git+...` or Claude Code plugin |
| uv | latest | Python package manager (for blender-mcp) | `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| MediaPipe | latest | Person segmentation (fast) | `pip install mediapipe` |
| segment-anything | latest | Person segmentation (high quality) | `pip install segment-anything` |
| MiDaS | v3.1 | Depth estimation | pip or torch hub |
| Depth Anything | v2 | Alternative depth estimation | pip |

### Existing Internal Dependencies (already built)

| Component | Location | Reuse |
|-----------|----------|-------|
| AudioAnalyzer | `src/lib/audio/` | Audio FFT for keyframe generation |
| Render queue | v2.0 infrastructure | Job dispatch for Blender renders |
| R2 storage | v2.0 infrastructure | Store rendered videos |
| FFmpeg pipeline | `src/lib/render/` | Post-process Blender output |
| VR metadata | `src/lib/render/` | Inject spatial metadata |

---

## Success Criteria (Updated)

1. Claude creates a Mantaflow fire orb in Blender via MCP
2. Fire intensity is driven by audio bass channel
3. Side-by-side comparison shows cinema quality > Three.js preview
4. Water simulation responds to treble with physically accurate waves
5. Fire over water scene renders with caustics and reflections
6. Real 360 footage composited with virtual fire (depth-aware)
7. EDM laser beams sync to 140 BPM test track
8. 8K stereoscopic equirectangular output plays correctly in VR
9. **Person in meditation video transformed into luminous being**
10. **Luminous being effect is audio-reactive (breathes with music)**
11. CLI-Anything harness wraps at least 5 custom EFS workflows
12. Complete pipeline from audio upload to final cinema render

---

## The Big Picture

Today the user opens whatamiappreciatingnow.com and sees a beautiful particle orb on a starfield. Tomorrow they can:

1. **Design** the look in real-time (Three.js, Experience/Design modes)
2. **Render cinema quality** of that same design (Blender/Cycles via MCP)
3. **Place it in a real environment** (360 footage + depth compositing)
4. **Add EDM effects** for music videos (lasers, strobes, grids)
5. **Transform people into beings of light** (the luminous being pipeline)
6. **Output for any platform** (flat, 360 mono, 360 stereo, VR)

From a particle orb generator to a full VFX production studio. The "Ethereal Flame Studio" name earns its meaning.

---

*Document created: 2026-03-19*
*Approved by: Jonathan (verbal approval, same session)*
*Next action: Install blender-mcp, proof of concept fire orb*
