# Architecture Research: v4.0 Cinema VFX Pipeline Integration

**Domain:** Blender VFX integration with existing audio-reactive video generation engine
**Researched:** 2026-03-19
**Confidence:** HIGH (blender-mcp verified via official repo + docs, Modal Blender verified via official example, audio pipeline verified via source code inspection)

---

## Executive Summary

The v4.0 Cinema VFX pipeline adds Blender as a second render path to an existing production system. The fundamental architectural challenge is that **Blender runs locally on Jonathan's Windows machine while the web app runs on Vercel**. This is not a limitation to work around -- it is the correct architecture for this phase. Claude controls Blender directly via MCP during a Claude Code session, making this a **developer-driven pipeline** (Claude + Jonathan build scenes and render), not an end-user self-service pipeline.

The key architectural insight: **the Cinema render path does not go through the web app at all.** Audio analysis is the only data that bridges the two worlds. The web app (Three.js) provides real-time preview. Blender provides cinema-quality final output. They share the same audio analysis data but operate independently.

Later, Modal can run headless Blender for true cloud rendering, but that is a Phase 7+ concern after the local pipeline is proven.

---

## System Overview

```
                         EXISTING (v2.0)                          NEW (v4.0)
                    +========================+             +========================+
                    |     Vercel Web App      |             |  Jonathan's Machine    |
                    |                         |             |                         |
  User uploads -->  | Audio Upload --> R2     |  JSON file  | Blender 4.x            |
  audio             | AudioAnalyzer.ts (FFT)  | ---------> | keyframe_generator.py   |
                    | PreAnalyzer.ts (offline) |  (export)  | Mantaflow / Cycles      |
                    |                         |             |                         |
                    | Three.js Preview Path   |             | Claude Code + MCP       |
                    | CubeCamera -> FFmpeg    |             | blender-mcp (TCP:9876)  |
                    | -> R2 / YouTube         |             | CLI-Anything (subprocess)|
                    +========================+             +========================+
                              |                                        |
                              v                                        v
                    +========================+             +========================+
                    |     Cloud Services      |             |    Local Output         |
                    | Turso (job state)        |             | blender/renders/        |
                    | R2 (storage)             |             | -> FFmpeg -> MP4        |
                    | Modal (GPU render)       |             | -> R2 upload (manual)   |
                    | Render.com (CPU worker)  |             | -> YouTube (manual/n8n) |
                    +========================+             +========================+
```

### The Two Render Paths (Final Architecture)

| Aspect | Preview Path (existing) | Cinema Path (new) |
|--------|------------------------|-------------------|
| Engine | Three.js + WebGL | Blender + Cycles |
| Runs on | Browser / Modal GPU | Jonathan's local machine |
| Controller | User via web UI | Claude via MCP |
| Audio analysis | Real-time AudioAnalyzer | Offline PreAnalyzer -> JSON export |
| Quality | Good (rasterized) | Photorealistic (path-traced) |
| Speed | Real-time / minutes | Minutes to hours |
| Output | MP4 via FFmpeg | EXR sequence -> MP4 via FFmpeg |
| Storage | R2 (automatic) | Local -> R2 (manual upload) |
| VR support | CubeCamera -> equirect (4K max) | Native panoramic camera (8K+) |

---

## Data Flow Diagrams

### Flow 1: Audio Analysis Export (Browser -> Blender)

This is the critical bridge between the two worlds. The existing PreAnalyzer already produces the exact data Blender needs -- it just needs to be exported as a JSON file.

```
Browser (Vercel web app)                    Local (Blender Python)
========================                    ======================

1. User uploads audio
         |
         v
2. PreAnalyzer.ts runs offline FFT
   - 512-bin FFT, Hanning window
   - Frequency bands: bass (0-344Hz),
     mid (344-3962Hz), high (4048-11975Hz)
   - Beat detection (threshold crossing)
   - Normalized to 0.0-1.0 range
         |
         v
3. Export as JSON file:                     4. keyframe_generator.py reads JSON
   {                                           - Maps bass -> fire intensity
     "frames": [                               - Maps mid -> particle density
       {                                       - Maps high -> corona brightness
         "frame": 0,                           - Maps isBeat -> pulse events
         "time": 0.0,                          - Writes Blender keyframes via bpy
         "amplitude": 0.42,
         "bass": 0.78,                      5. Mantaflow sim / Cycles render
         "mid": 0.31,                          uses those keyframes
         "high": 0.15,
         "isBeat": false
       },
       ...
     ],
     "totalFrames": 9000,
     "duration": 300.0,
     "fps": 30
   }

   (Saved to: blender/audio-analysis.json)
```

**What exists:** PreAnalyzer.ts already produces `PreAnalysisResult` with exactly this structure. The `FrameAudioData` interface has `frame`, `time`, `amplitude`, `bass`, `mid`, `high`, `isBeat`.

**What needs building:**
- Export function: `PreAnalysisResult` -> JSON file download in the web UI
- `keyframe_generator.py`: Python script that reads the JSON and creates Blender keyframes
- Extended analysis features (envelope, onset, spectral centroid, spectral flux) in PreAnalyzer for richer Blender mappings

**The JSON file is the contract.** Both sides are decoupled. The web app does not need to know about Blender. Blender does not need to connect to Vercel.

### Flow 2: Blender MCP Control (Claude -> Blender)

```
Claude Code (on Jonathan's machine)
         |
         | MCP Protocol (JSON-RPC over stdio)
         v
blender-mcp server (Python, via `uvx blender-mcp`)
         |
         | TCP Socket (localhost:9876)
         v
Blender Addon (addon.py, installed in Blender)
         |
         | bpy.app.timers (marshals to main thread)
         v
Blender Python API (bpy)
         |
         +-- execute_blender_code: Run ANY Python script
         +-- get_viewport_screenshot: Visual feedback (base64 PNG)
         +-- get_scene_info: Inspect scene objects
         +-- get_object_info: Per-object detail
         +-- Poly Haven tools: Download HDRIs, textures, models
         +-- Sketchfab tools: Search/download 3D models
         +-- Hyper3D Rodin: Text-to-3D generation
```

**Key constraint:** Only one MCP client at a time. Claude Code IS the client. This means no web app can also connect to Blender simultaneously.

**Key constraint:** 180-second timeout per command. Long simulations (Mantaflow bake, Cycles render) must be kicked off as background tasks, not awaited in a single MCP call.

**Key constraint:** `execute_blender_code` uses unsandboxed `exec()`. Powerful but no guardrails. Always save the .blend file before risky operations.

### Flow 3: Cinema Render Output Pipeline

```
Blender Scene (configured via MCP)
         |
         v
Cycles Render (local GPU)
  - Per-frame: EXR or PNG to blender/renders/
  - Resolution: up to 8K equirectangular
  - Stereo: built-in left/right eye rendering
         |
         v
Local Post-Processing
  - FFmpeg: Image sequence -> MP4 (H.264/H.265)
  - VR metadata injection (spatial_media tool)
  - Audio mux (original audio + rendered video)
         |
         v
Output Distribution
  - Local: blender/renders/final_output.mp4
  - Cloud: Manual upload to R2 via CLI or API
  - YouTube: Manual upload or n8n workflow trigger
```

**No automatic cloud integration in v4.0.** The Blender render pipeline lives entirely on Jonathan's machine. Cloud integration (R2 upload, YouTube post) can use existing n8n workflows or manual upload. This is intentional -- the priority is proving the VFX quality, not automating distribution.

### Flow 4: Person Segmentation (Luminous Being)

```
Input: Video of person (MP4/MOV, flat or 360)
         |
         v
Step 1: Frame Extraction (FFmpeg, local)
  ffmpeg -i input.mp4 -q:v 2 frames/frame_%06d.jpg
         |
         v
Step 2: Segmentation (Python, local)
  MediaPipe Selfie Segmentation (fast, CPU)
  - Input: JPEG frames
  - Output: grayscale masks (PNG, 0=background, 255=person)
  - ~30ms per frame on CPU
  OR
  Segment Anything Model (SAM, higher quality)
  - Requires GPU for reasonable speed
  - Better edge quality, handles complex poses
         |
         v
Step 3: Mask Import to Blender
  - Image sequence import as strip
  - Used as:
    - Particle emission mask (spawn from body shape)
    - Volume density mask (fill body with glow)
    - Mantaflow flow source (fire from body)
    - Compositor alpha mask (layering)
         |
         v
Step 4: Blender Compositor
  - Background layer (original video, darkened)
  - Luminous body layer (volumetric + particles + fire)
  - Audio-reactive modulation (keyframes from JSON)
  - Edge glow layer (dilated mask outline)
         |
         v
Step 5: Cycles Render -> EXR -> FFmpeg -> MP4
```

**Where each step runs:**

| Step | Where | Why |
|------|-------|-----|
| Frame extraction | Local (Jonathan's machine) | FFmpeg is already installed, frames stay local |
| MediaPipe segmentation | Local (Python) | CPU-only, no GPU needed, ~30ms/frame |
| SAM segmentation | Local (Python + GPU) | Needs CUDA for reasonable speed |
| Blender compositing | Local (Blender + Cycles) | Needs .blend scene, MCP control |
| Final encoding | Local (FFmpeg) | Frames are local |

**Data format between steps:** PNG image sequences. Each mask frame is a grayscale PNG where pixel value 0 = background, 255 = person. This is the universal interchange format that Blender, FFmpeg, and Python all understand natively.

### Flow 5: Chrome MCP Visual Research

```
Claude Code (on Jonathan's machine)
         |
         | MCP Protocol
         v
Chrome MCP Server (Puppeteer-based)
         |
         v
Chrome Browser (headless or headed)
  - Navigate to YouTube / creator pages
  - Take screenshots at specific timestamps
  - Extract visual information
         |
         v
Claude analyzes screenshots
  - Identify visual techniques (color grading, motion patterns)
  - Decode perceptual principles (why does this "pop"?)
  - Extract parameters (approximate color values, timing)
         |
         v
Research Notes (markdown files)
  - Documented insights
  - Parameter references for Blender recreation
  - NOT connected to production pipeline
```

**This is a research tool, not a production pipeline.** Chrome MCP feeds into Jonathan's creative knowledge. It does not connect to the render queue, R2, or any automated system. The output is markdown notes that inform creative decisions.

---

## Component Boundaries

### Entirely New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `blender/scenes/*.blend` | Repo root | Template Blender files for fire, water, EDM, luminous being |
| `blender/scripts/keyframe_generator.py` | Repo root | Reads audio JSON, writes Blender keyframes |
| `blender/scripts/audio_importer.py` | Repo root | Loads audio JSON into Blender scene |
| `blender/scripts/person_segmentation.py` | Repo root | MediaPipe/SAM per-frame mask export |
| `blender/scripts/luminous_being_compositor.py` | Repo root | Sets up compositor node tree for luminous being |
| `blender/scripts/vr_video_import.py` | Repo root | Import 360 footage as background |
| `blender/scripts/depth_extractor.py` | Repo root | MiDaS/Depth Anything depth map extraction |
| `blender/scripts/shadow_catcher_setup.py` | Repo root | Shadow catcher for VR compositing |
| `blender/scripts/batch_render.py` | Repo root | Multi-scene batch render orchestration |
| `blender/scripts/compositor.py` | Repo root | Multi-layer compositor setup |
| `blender/masks/` | Repo root | Per-frame segmentation masks (gitignored) |
| `blender/renders/` | Repo root | Output frames and videos (gitignored) |
| `cli/blender-harness/efs_blender_cli.py` | Repo root | CLI-Anything custom harness for EFS workflows |
| `cli/blender-harness/SKILL.md` | Repo root | Agent discovery document for CLI harness |

### Existing Code Requiring Modification

| Component | Location | Change |
|-----------|----------|--------|
| `PreAnalyzer.ts` | `src/lib/audio/` | Add JSON export function, add envelope/onset/spectral features |
| `FrameAudioData` interface | `src/types/index.ts` | Add optional fields: `envelope`, `onset`, `spectralCentroid`, `spectralFlux` |
| Web UI (Design page) | `src/app/` | Add "Export Audio Analysis" button for JSON download |

### Existing Code That Stays Untouched

| Component | Location | Why |
|-----------|----------|-----|
| `AudioAnalyzer.ts` | `src/lib/audio/` | Real-time browser analyzer, not needed for Blender |
| All render pipeline code | `src/lib/render/` | Existing Three.js render path is separate |
| `modalClient.ts` | `src/lib/render/` | Modal integration for THREE.js renders, not Blender (yet) |
| Storage adapters | `src/lib/storage/` | R2/local storage not used by Blender pipeline in v4.0 |
| Job queue (Turso) | `src/lib/` | Blender renders are Claude-driven, not queued |
| All API routes | `src/app/api/` | No new API routes needed for local Blender pipeline |
| Widget system (v3.0) | `src/components/` | Parallel milestone, no overlap |
| n8n integration | n/a | Post-render distribution uses existing workflows |

---

## Architectural Patterns

### Pattern 1: File-Based Data Bridge (JSON Contract)

**What:** The browser-based audio analyzer exports its analysis as a JSON file that Blender Python scripts consume. No network connection between them.

**When to use:** Always. This is the primary data flow between the two worlds.

**Trade-offs:**
- Pro: Complete decoupling. Either side can change independently.
- Pro: JSON is human-readable, debuggable, versionable.
- Pro: File can be cached and reused across multiple Blender sessions.
- Con: Manual step (download JSON, reference from Blender script).
- Con: No real-time sync (but that is explicitly out of scope).

**Implementation:**

```typescript
// New function in PreAnalyzer.ts or a new audio-export.ts
export function exportAnalysisAsJSON(result: PreAnalysisResult): string {
  return JSON.stringify({
    version: 1,
    generator: "ethereal-flame-studio",
    ...result,
    // Extended fields for Phase 7:
    metadata: {
      averageBPM: calculateBPM(result),
      peakBass: Math.max(...result.frames.map(f => f.bass)),
      peakMid: Math.max(...result.frames.map(f => f.mid)),
      peakHigh: Math.max(...result.frames.map(f => f.high)),
      beatCount: result.frames.filter(f => f.isBeat).length,
    }
  }, null, 2);
}
```

```python
# keyframe_generator.py
import json
import bpy

def load_audio_analysis(json_path: str) -> dict:
    with open(json_path, 'r') as f:
        return json.load(f)

def apply_keyframes(analysis: dict, target_object: str, mapping: dict):
    """
    mapping = {
        'bass': ('scale', 'z', lambda v: 1.0 + v * 2.0),
        'mid': ('emission_strength', None, lambda v: v * 50.0),
        'isBeat': ('scale', 'xyz', lambda v: 1.5 if v else 1.0),
    }
    """
    obj = bpy.data.objects[target_object]
    for frame_data in analysis['frames']:
        bpy.context.scene.frame_set(frame_data['frame'])
        for key, (prop, axis, transform) in mapping.items():
            value = transform(frame_data[key])
            # Set property and insert keyframe
            setattr(obj, prop, value)
            obj.keyframe_insert(data_path=prop, frame=frame_data['frame'])
```

### Pattern 2: MCP-Driven Scene Construction

**What:** Claude builds Blender scenes by sending Python scripts through `execute_blender_code`. Each script is self-contained and idempotent where possible.

**When to use:** For all scene setup, material configuration, simulation setup, and render triggering.

**Trade-offs:**
- Pro: Full access to every Blender feature via bpy.
- Pro: Claude can iterate visually (screenshot -> adjust -> screenshot).
- Pro: Scripts are saveable and reusable.
- Con: 180s timeout per command (long renders must be backgrounded).
- Con: Token cost scales with script complexity.
- Con: No undo management (must save frequently).

**Best practices:**
1. Save the .blend file before every risky operation.
2. Use `execute_blender_code` for complex/custom work.
3. Use CLI-Anything for repetitive scaffolding (add objects, set transforms).
4. Keep scripts small and focused (one concern per call).
5. Use `get_viewport_screenshot` sparingly (high token cost).

### Pattern 3: Template .blend Files

**What:** Pre-built Blender scenes that Claude loads and configures via MCP, rather than building from scratch each time.

**When to use:** For each VFX type (fire, water, EDM, luminous being). Claude opens the template and customizes for the specific audio track.

**Trade-offs:**
- Pro: Massively reduces per-session setup time and token cost.
- Pro: Complex node trees (compositor, shader) are saved visually.
- Pro: Simulation settings pre-tuned for quality.
- Con: Template drift (changes not reflected in code).
- Con: Binary .blend files are not diffable in git.

**Template inventory:**

| Template | Contents |
|----------|----------|
| `fire-template.blend` | Mantaflow domain, flow emitter, Principled Volume material, Cycles settings |
| `water-template.blend` | Ocean modifier, liquid domain, caustic materials |
| `fire-over-water.blend` | Combined fire + water scene with interaction |
| `edm-laser.blend` | Volumetric beam geometry, scanning animation rig |
| `edm-grid.blend` | LED grid instances, ripple shader |
| `luminous-being.blend` | Compositor node tree, particle system, volumetric body setup |
| `compositor.blend` | Multi-layer compositing template |

### Pattern 4: CLI-Anything for Token-Efficient Scaffolding

**What:** CLI-Anything's Blender harness wraps common bpy operations as CLI commands. Claude uses subprocess calls for simple tasks, saving tokens.

**When to use:** Scene scaffolding (add objects, set materials, position camera, basic animations). NOT for Mantaflow, compositor, or custom shaders.

**Coexistence with blender-mcp:**

```
Claude Code
    |
    +-- blender-mcp (MCP)          <-- Complex: Mantaflow, custom shaders, compositor
    |     execute_blender_code         Physics simulation, visual feedback loop
    |     get_viewport_screenshot
    |
    +-- CLI-Anything (subprocess)  <-- Simple: Add cube, set material, move camera
          cli-anything-blender         Repetitive scaffolding, JSON output
          object add cube --size 2
          render preview --engine eevee
```

**Decision rule:** If the operation is in CLI-Anything's 7 command groups (scene, object, material, modifier, camera/light, animation, render), use CLI-Anything. If it involves Mantaflow, compositor nodes, Geometry Nodes, particle systems, or custom Python, use `execute_blender_code`.

---

## Cloud Rendering: Modal + Blender (Future Architecture)

Modal CAN run Blender headless with GPU. This is verified.

**How it works** (from Modal's official example):
1. Modal container starts from Debian Linux image.
2. Installs Blender's `bpy` Python package (not the full Blender GUI).
3. Loads a .blend file (uploaded to Modal volume or fetched from URL).
4. Renders frames in parallel across multiple L40S GPUs.
5. Returns frame bytes to the calling machine.
6. 240 frames at 1080p ~ 3 minutes on 10 GPUs.

**Integration with existing Modal infrastructure:**

```
Existing Modal Pipeline (v2.0):
  Web App -> API -> Worker -> Modal (Puppeteer + Three.js render)
                                      ^
                                      |  FUTURE: add Blender render mode
                                      |
Future Modal Pipeline (v4.x):
  Web App -> API -> Worker -> Modal (Blender + Cycles headless render)
                                |
                                +-- Receives: .blend file + audio-analysis.json
                                +-- Returns: rendered frames -> R2
                                +-- GPU: L40S (>10x faster than CPU)
```

**Requirements for Modal Blender integration:**
1. .blend template files must be uploadable to Modal (volume mount or URL fetch from R2).
2. Audio analysis JSON must be accessible (R2 signed URL).
3. `keyframe_generator.py` must run inside the Modal container.
4. Rendered frames must be uploaded to R2, not returned inline (too large for 8K).
5. `batch_render.py` must support headless mode (no MCP, no GUI).

**This is NOT a v4.0 concern.** v4.0 proves the pipeline locally. Modal integration is a future phase after the local workflow is validated. The architecture supports it because:
- Template .blend files are portable.
- Audio analysis JSON is a simple file.
- Python scripts are independent of MCP (they use bpy directly).
- Only the orchestration layer changes (MCP -> Modal dispatch).

---

## New Directory Structure

```
ethereal-flame-studio/
+-- blender/                          # NEW: entire directory
|   +-- scenes/                       # Template .blend files
|   |   +-- fire-template.blend
|   |   +-- water-template.blend
|   |   +-- fire-over-water.blend
|   |   +-- edm-laser.blend
|   |   +-- edm-grid.blend
|   |   +-- luminous-being.blend
|   |   +-- compositor.blend
|   +-- scripts/                      # Python scripts for Blender
|   |   +-- audio_importer.py         # Load audio JSON into Blender
|   |   +-- keyframe_generator.py     # Audio -> keyframes
|   |   +-- person_segmentation.py    # MediaPipe/SAM masks
|   |   +-- luminous_being_compositor.py
|   |   +-- vr_video_import.py
|   |   +-- depth_extractor.py
|   |   +-- shadow_catcher_setup.py
|   |   +-- compositor.py
|   |   +-- batch_render.py
|   +-- masks/                        # Per-frame segmentation masks (gitignored)
|   +-- renders/                      # Output frames and videos (gitignored)
|   +-- audio/                        # Audio analysis JSON exports (gitignored)
+-- cli/                              # NEW: CLI-Anything custom harness
|   +-- blender-harness/
|       +-- efs_blender_cli.py
|       +-- SKILL.md
+-- src/
|   +-- lib/
|   |   +-- audio/
|   |   |   +-- AudioAnalyzer.ts      # UNCHANGED (real-time browser)
|   |   |   +-- PreAnalyzer.ts        # MODIFIED: add export, add extended features
|   |   |   +-- audioExport.ts        # NEW: JSON export utility
|   |   +-- render/                   # UNCHANGED (Three.js render path)
|   |   +-- storage/                  # UNCHANGED (not used by Blender in v4.0)
|   +-- types/
|       +-- index.ts                  # MODIFIED: extend FrameAudioData
+-- .gitignore                        # MODIFIED: add blender/masks/, renders/, audio/
```

---

## Anti-Patterns

### Anti-Pattern 1: Trying to Connect Blender to Vercel in Real-Time

**What people do:** Build a WebSocket bridge from the Vercel app to local Blender, trying to make "click Render in the web app -> Blender renders locally."

**Why it is wrong:** Blender runs on a single local machine behind a NAT. Vercel is serverless. The connection would require a tunnel (Cloudflare, ngrok), persistent socket management, and would be fragile. The MCP connection is already claimed by Claude Code.

**Do this instead:** Accept the two-world model. Web app exports JSON. Blender consumes JSON. Output goes to R2 manually or via script. Automate the cloud path later via Modal.

### Anti-Pattern 2: Running MCP Commands for Long Renders

**What people do:** Call `execute_blender_code` with a script that triggers a Cycles render and waits for it to complete.

**Why it is wrong:** 180-second timeout. A 300-frame 8K Cycles render takes hours. The MCP call will time out.

**Do this instead:** Use MCP to SET UP the render (configure output path, frame range, samples). Then trigger the render as a background process (`bpy.ops.render.render(animation=True)`), which runs in Blender's main loop independently of MCP. Check on progress by querying the output directory for completed frames.

### Anti-Pattern 3: Piping Raw FFT Data Instead of JSON

**What people do:** Try to stream real-time audio analysis from the browser to Blender.

**Why it is wrong:** The browser and Blender are in different execution contexts. Real-time streaming adds complexity (WebSocket, synchronization) with zero benefit -- Blender renders offline, frame by frame.

**Do this instead:** Use PreAnalyzer for offline whole-file analysis, export as JSON, load in Blender. This is already the architecture that the existing Three.js render pipeline uses (PreAnalyzer -> per-frame data -> Puppeteer).

### Anti-Pattern 4: Storing .blend Files in R2

**What people do:** Upload .blend template files to R2 and download them for each render.

**Why it is wrong for v4.0:** .blend files can be hundreds of MB. They contain embedded textures, baked simulations, and cached data. R2 upload/download adds latency. In v4.0, everything runs locally.

**Do this instead for v4.0:** Keep .blend files in the repo's `blender/scenes/` directory. They live on Jonathan's machine alongside Blender. For future Modal integration, upload to a Modal volume (persistent storage), not per-render download.

---

## Integration Points Summary

### External Services

| Service | Integration Pattern | Used in v4.0? | Notes |
|---------|---------------------|---------------|-------|
| blender-mcp | MCP (JSON-RPC over stdio -> TCP:9876) | YES | Primary Blender control |
| CLI-Anything | Subprocess (bash) | YES | Token-efficient scaffolding |
| Chrome MCP | MCP (separate server) | YES | Research only, not production |
| Poly Haven | Via blender-mcp tools | YES | Free HDRIs, textures, models |
| Sketchfab | Via blender-mcp tools | YES | Community 3D models |
| Hyper3D Rodin | Via blender-mcp tools | MAYBE | Text-to-3D generation |
| Modal | HTTP API | NO (future) | Cloud Blender rendering |
| R2 | S3-compatible API | NO (future) | Cloud storage for renders |
| MediaPipe | Python library (local) | YES | Fast person segmentation |
| SAM | Python library (local) | MAYBE | High-quality segmentation |
| MiDaS / Depth Anything | Python library (local) | YES | Depth estimation for VR compositing |

### Internal Boundaries

| Boundary | Communication | Direction | Data Format |
|----------|---------------|-----------|-------------|
| Web App -> Blender Pipeline | File export | One-way (JSON file) | `PreAnalysisResult` JSON |
| Claude -> Blender | MCP (blender-mcp) | Bidirectional | Python scripts / JSON responses |
| Claude -> CLI-Anything | Subprocess | Request/response | CLI args / JSON stdout |
| Segmentation -> Blender | File (image sequence) | One-way | Grayscale PNG masks |
| Blender -> FFmpeg | File (image sequence) | One-way | EXR/PNG frames |
| Blender -> Output | File | One-way | MP4 video |

---

## Build Order (Optimal Sequence)

Based on dependency analysis:

```
Wave 0: Tool Setup (no dependencies, do first)
  07-00a: Install blender-mcp, verify MCP connection     [1 session]
  07-00b: Install CLI-Anything, verify basic ops          [1 session]
  07-00c: Proof of concept -- Mantaflow fire orb          [1-2 sessions]
    |
    | All three can be done in a single session
    v
Wave 1: Audio Bridge (depends on nothing new)
  07-02: Audio analysis export (JSON) + extended features [1-2 sessions]
    |
    | Unblocks ALL Blender capabilities that need audio
    v
Wave 2: Core VFX (parallel after Wave 1)
  07-03: Mantaflow fire template          [2-3 sessions] ---+
  07-04: Mantaflow water template         [2-3 sessions] ---+-- parallel
  07-05: Audio-to-keyframe mapping system [2-3 sessions] ---+
    |
    | 07-05 is the integration of 07-02 + 07-03/04
    v
Wave 3: VR + Compositing (parallel, after Wave 2)
  07-06: VR video import                  [1 session]   ---+
  07-07: Depth map extraction             [1-2 sessions] --+-- parallel
  07-08: Shadow catcher + compositing     [2 sessions]  ---+
  07-09: Video masking                    [1-2 sessions] --+
    |
    v
Wave 4: EDM Effects (parallel, after Wave 2)
  07-10: Volumetric lasers                [2 sessions]  ---+-- parallel
  07-11: LED grid + strobes               [2 sessions]  ---+
    |
    v
Wave 5: Luminous Being (after Wave 2 + some of Wave 3)
  07-13: Person segmentation pipeline     [2-3 sessions]
  07-14: Luminous being compositor        [3-4 sessions]
  07-15: Audio-reactive luminous being    [2-3 sessions]
    |
    | Depends on: 07-05 (keyframes), 07-09 (masking), 07-03 (fire)
    v
Wave 6: Integration (after everything)
  07-12: Multi-layer compositor           [2-3 sessions]
  07-16: CLI-Anything custom harness      [1-2 sessions]
```

**Parallelism:** Waves 3 and 4 can run in parallel with each other. Within each wave, plans marked "parallel" have no file dependencies on each other.

**Critical path:** 00a -> 00c -> 02 -> 05 -> 14 -> 12. This is the shortest path to the crown jewel (Luminous Being in a composited scene).

**What can be deferred without blocking anything:** Chrome MCP research (07-research) can happen anytime. It is creative research, not a technical dependency.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 creator (now) | Local Blender, manual workflow, Claude-driven. Perfect for v4.0. |
| 1 creator, multiple scenes | Batch render script (`batch_render.py`). Queue scenes, render overnight. |
| 1 creator, faster renders | Modal cloud rendering. Upload .blend + JSON to Modal, render on L40S GPUs. |
| Multiple creators | Full web UI integration: upload audio -> select VFX template -> cloud render -> R2 -> download. Requires Modal + new API routes + render queue support for Blender jobs. This is v5.0+ territory. |

### First bottleneck: Local GPU render time
Jonathan's GPU determines render speed. A 5-minute 4K Cycles animation could take hours. Mitigation: use Eevee for previews, Cycles only for finals. Reduce samples for iteration. Batch overnight.

### Second bottleneck: Manual data transfer
Downloading audio analysis JSON, referencing it in scripts, uploading final video. Mitigation: Write a helper script that automates the export-to-local-directory step. Build an R2 upload CLI command.

---

## Sources

### Verified (HIGH confidence)
- [blender-mcp GitHub repository](https://github.com/ahujasid/blender-mcp) -- architecture, tools, limitations
- [Modal Blender rendering example](https://modal.com/docs/examples/blender_video) -- headless GPU rendering, container setup, performance numbers
- [BlenderMCP architecture blog](https://yuv.ai/blog/blender-mcp) -- TCP socket protocol, component structure
- Source code inspection: `PreAnalyzer.ts`, `AudioAnalyzer.ts`, `modalClient.ts`, `renderVideo.ts`, `StorageAdapter` interface

### Verified (MEDIUM confidence)
- [CLI-Anything GitHub repository](https://github.com/HKUDS/CLI-Anything) -- harness architecture, Blender coverage
- [MediaPipe Selfie Segmentation](https://developers.google.com/mediapipe/solutions/vision/image_segmenter) -- segmentation API, performance
- [Blender Manual - Cycles GPU Rendering](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html)

---
*Architecture research for: v4.0 Cinema VFX Pipeline Integration*
*Researched: 2026-03-19*
