# Pitfalls Research: Cinema VFX Pipeline (Blender MCP Integration)

**Domain:** Adding Blender MCP cinema render path to existing audio-reactive video generation engine
**Researched:** 2026-03-19
**Confidence:** HIGH (verified with GitHub issues, official Blender docs, Anthropic docs, community reports)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or fundamentally broken workflows. These will stop the project cold if not addressed in the right phase.

---

### Pitfall 1: Screenshot Token Hemorrhage Burns Through Claude Usage

**What goes wrong:**
Every `get_viewport_screenshot` call from blender-mcp sends a base64 PNG to Claude. A typical Blender viewport screenshot at 1920x1080 costs ~2,765 tokens (1920*1080/750). At Claude Sonnet's $3/M input tokens, that is ~$0.008 per screenshot. Sounds cheap until you realize an iterative VFX session easily involves 20-50 screenshots as Claude adjusts fire intensity, camera angles, materials, and lighting. A single session: 50 screenshots = ~138K tokens = ~$0.41 just for images. Over a day of development with multiple iterations across fire, water, EDM, and luminous being capabilities, screenshot costs alone can reach $5-15/day. In a multi-turn conversation, base64 images are resent on every turn in the conversation history, compounding the cost exponentially.

**Why it happens:**
Claude cannot "see" 3D space from scene data alone. The temptation is to screenshot after every change to verify results. blender-mcp makes this trivially easy (one tool call), so there is no friction to stop excessive use.

**How to avoid:**
1. Use `get_scene_info` and `get_object_info` as primary feedback (text is ~100x cheaper than images)
2. Screenshot only at validation checkpoints, not after every individual change
3. Batch multiple changes before taking a screenshot
4. Reduce screenshot resolution before sending -- downscale to 800x600 for verification (~640 tokens vs ~2,765)
5. Use Anthropic's Files API to upload images once and reference by file_id rather than re-sending base64 on every turn
6. Build template scripts that are known-good so Claude does not need to visually verify basic operations

**Warning signs:**
- Token usage reports showing >50% image tokens
- Claude requesting screenshots after simple object placement
- Multi-turn conversations where each turn re-sends all previous screenshots

**Phase to address:** Wave 0 (Tool Setup) -- establish screenshot discipline from the first session

---

### Pitfall 2: 180-Second Timeout Kills Long Operations Silently

**What goes wrong:**
blender-mcp has a hard 180-second (3-minute) timeout per `execute_blender_code` call. Operations that exceed this fail silently -- the MCP server returns a timeout error (-32001), Claude loses context of what happened, and Blender's internal state may be partially modified. Operations that will exceed 180 seconds:

- **Mantaflow bake at resolution 256+:** 5-60+ minutes depending on frame count
- **Cycles render at 4K+:** 30 seconds to 10+ minutes per frame depending on complexity
- **8K equirectangular render:** 5-30+ minutes per frame with volumetrics
- **Noise bake (upres):** Often longer than the base simulation bake
- **Batch renders of any length video:** Always exceeds 180s

**Why it happens:**
The blender-mcp TCP socket timeout is set to exactly 180.0 seconds (confirmed in source code). This matches the addon's timeout. There is no configuration option to change it. The socket timeout error does not trigger reconnection -- the connection silently fails.

**How to avoid:**
1. Never run bakes or renders through `execute_blender_code` directly
2. Write Python scripts that Blender executes independently: save script to disk, then use `execute_blender_code` only to call `exec(open('path/to/script.py').read())` which returns immediately if the script uses `bpy.ops.fluid.bake_data()` in a timer callback
3. For bakes: trigger via `bpy.app.timers.register()` so the command returns immediately, then poll for completion separately
4. For renders: use `bpy.ops.render.render('INVOKE_DEFAULT')` (non-blocking) or launch Blender CLI render as a subprocess
5. Build a status-polling pattern: script writes progress to a temp file, Claude polls via `execute_blender_code` reading that file

**Warning signs:**
- MCP error -32001 on any operation
- Claude reporting "the command timed out" and losing track of scene state
- Blender appearing frozen after a failed MCP command

**Phase to address:** Wave 0 (07-00a, Tool Setup) -- must establish async execution patterns before any simulation work

---

### Pitfall 3: No Undo Management = Corrupted Scene State on Script Failure

**What goes wrong:**
`execute_blender_code` runs arbitrary Python via unsandboxed `exec()`. If a script partially executes and then errors (e.g., creates 3 objects, fails on the 4th, leaves materials half-assigned), the scene is in an inconsistent state. blender-mcp has NO built-in undo management. Blender 5.0's own undo system has known instability issues (GitHub issue #149890 -- undo-related crashes). Claude cannot easily determine what succeeded and what failed.

**Why it happens:**
- `exec()` has no transaction semantics -- partial execution is the norm on error
- blender-mcp does not wrap operations in undo groups
- `execute_blender_code` does not return print() output reliably (GitHub issue #96)
- Error messages from bpy can be cryptic ("Error: Operator bpy.ops.mesh.primitive_cube_add.poll() failed, context is incorrect")

**How to avoid:**
1. ALWAYS save the .blend file before any complex operation: `bpy.ops.wm.save_mainfile()`
2. Wrap every script in try/except with explicit cleanup in the except block
3. Use Blender's undo system manually: `bpy.ops.ed.undo_push(message="Before MCP operation")` at the start of each script
4. Design scripts to be idempotent -- re-running should produce the same result, not duplicate objects
5. Name objects systematically (e.g., `efs_fire_domain`, `efs_water_emitter`) so scripts can check for existing objects before creating new ones
6. Return explicit success/failure JSON from scripts via print() to stdout

**Warning signs:**
- Duplicate objects appearing in the scene after re-running scripts
- Materials assigned to wrong objects
- "Context is incorrect" errors from bpy.ops calls
- Scene state diverges from what Claude believes it to be

**Phase to address:** Wave 0 (07-00a) -- establish save-before-operate pattern from day one

---

### Pitfall 4: Mantaflow Cache Explosion Fills Disk Without Warning

**What goes wrong:**
Mantaflow simulation caches can consume 30-180+ GB of disk space without any warning or size limit. A single high-resolution (256+) liquid simulation with noise upres, whitewater particles, and multiple frames can silently consume an entire drive. One user on Blender Artists reported 180 GB consumed unknowingly. Cache files are stored in the directory specified in the Domain's Cache panel (defaults to `/tmp/` or a subdirectory of the .blend file) and are NOT automatically cleaned up.

**Why it happens:**
- Each frame of a Mantaflow simulation stores a full 3D voxel grid as either `.uni` (Blender native) or `.vdb` (OpenVDB) files
- Resolution scales cubically: doubling resolution from 128 to 256 increases cache size by ~8x
- Noise upres multiplies this further (upres factor of 2 = another 8x)
- "Replay" cache mode saves every frame automatically as you scrub the timeline
- There is no size limit or warning in Blender's UI
- The "Free All" button is the only way to clean up, and it requires manually navigating to the Domain's physics panel

**How to avoid:**
1. Set a dedicated cache directory for the project: `blender/cache/` with monitoring
2. Start with resolution 64-96 for initial testing, only increase for final renders
3. Use "Modular" cache type (not "All") to bake data and noise separately
4. Write a cleanup script that runs before each new bake session
5. Monitor disk space programmatically: have scripts check free space before starting a bake
6. Delete old cache before re-baking -- Mantaflow does NOT overwrite cleanly when changing resolution parameters
7. Prefer OpenVDB format for liquid sims (more stable than uni format for liquids), but prefer uni format for gas sims (OpenVDB gas bake can crash -- Blender bug T86164)

**Warning signs:**
- Disk usage climbing rapidly during bake operations
- Blender becoming sluggish (reading large cache files)
- "Bake" operations becoming progressively slower
- Cache directory growing past 10GB for test simulations

**Phase to address:** Wave 2 (07-03/07-04, Mantaflow Fire and Water) -- establish cache management before first simulation

---

### Pitfall 5: TCP Socket Disconnect Leaves Blender and Claude Out of Sync

**What goes wrong:**
blender-mcp communicates over a TCP socket on localhost:9876. The connection can drop due to: Blender crashing (common with high-res sims), Blender going unresponsive during a long operation, Windows sleep/hibernate, or the MCP server process dying. When the socket disconnects, there is no automatic reconnection. Claude continues sending commands that silently fail. The addon.py in Blender shows "disconnected" status but the MCP server may not know.

**Why it happens:**
- Simple JSON-over-TCP protocol with no heartbeat or keepalive mechanism
- Socket timeout is 180 seconds -- a long gap between commands can cause silent disconnect
- Blender crash during simulation takes down the addon socket server
- No reconnection logic in the MCP server -- it relies on `get_blender_connection` to reconnect, but this is not always triggered
- Windows-specific: ProactorEventLoop issues cause connection failures (GitHub issue #52)

**How to avoid:**
1. After any suspected failure, explicitly test the connection with a simple command (e.g., `get_scene_info`)
2. Save .blend files frequently -- a crash loses all unsaved work
3. If connection drops: restart both the Blender addon ("Connect to Claude" button in N-panel) and the MCP server
4. For long operations, use the async pattern from Pitfall 2 to avoid blocking the socket
5. Keep Blender's auto-save enabled (File > Preferences > Save & Load > Auto Save, set to 2-minute interval)
6. On Windows, update to latest addon.py regularly -- the maintainer patches connection issues frequently

**Warning signs:**
- "Server transport closed unexpectedly" in MCP logs
- Commands returning no response after a period of inactivity
- blender-mcp status showing "disconnected" in Blender's N-panel
- First command after idle period failing (documented behavior -- "sometimes the first command won't go through but after that it starts working")

**Phase to address:** Wave 0 (07-00a) -- verify connection stability before building anything on top of it

---

### Pitfall 6: Mantaflow Keyframing Is Broken for Domain Parameters

**What goes wrong:**
Keyframing Mantaflow Domain parameters (fire intensity, smoke density, flow rate) mid-simulation is unreliable. Bug T72812 in Blender's tracker documents that keyframing Domain parameters in the Physics panel is broken -- values cannot be changed via the panel after keyframing, requiring the Graph Editor instead. Additionally, Mantaflow fire rendered in Cycles can produce glitched frames (50%+ of frames corrupted) while Eevee renders fine (bug T77678). This directly impacts the audio-to-keyframe mapping system (07-05) which is central to the entire pipeline.

**Why it happens:**
- Mantaflow forces bakes to start from frame 1, making mid-bake parameter changes unreliable
- The keyframe system and Mantaflow's internal cache do not always stay in sync
- Changing noise upres factor can delete the entire base simulation cache (bug T77713)
- Cycles and Mantaflow interact poorly for fire rendering specifically

**How to avoid:**
1. Keyframe the FLOW object parameters (emission rate, fuel, temperature) instead of Domain parameters -- Flow objects respond to keyframes more reliably
2. Use drivers linked to Empty objects for cleaner control (animate the Empty, driver reads its properties)
3. For audio-reactive fire: vary the Flow object's emission strength and fuel amount, not the Domain's flame settings
4. Render fire with Eevee first for testing; only use Cycles for final output and verify each frame
5. Always bake from frame 1 -- never try to bake a partial frame range
6. After changing any Domain resolution or upres setting, delete ALL cache before re-baking
7. Test the audio-to-keyframe pipeline on a 2-second clip before committing to a full-length render

**Warning signs:**
- Keyframed values appearing flat in the Graph Editor when they should vary
- Simulation looking identical regardless of keyframed parameter changes
- Random white/black frames in Cycles renders of fire
- Cache suddenly disappearing after tweaking upres settings

**Phase to address:** Wave 2 (07-05, Audio-to-Keyframe Mapping) -- this is THE critical system; test thoroughly with short clips first

---

## Moderate Pitfalls

Issues that cause significant rework or quality problems but will not derail the project entirely.

---

### Pitfall 7: Mantaflow Resolution Memory Wall

**What goes wrong:**
Mantaflow simulation memory usage scales cubically with resolution. Resolution 128 = ~2M voxels, 256 = ~16M voxels, 512 = ~134M voxels. Each voxel stores density, velocity (3 components), temperature, and flags. A resolution-512 gas simulation requires 8-16 GB of RAM just for the simulation grid. Add Cycles rendering with 8K output, volumetric step sampling, and HDRI lighting, and total memory easily exceeds 32 GB. On a GPU with <12 GB VRAM, Cycles will fall back to CPU rendering (massively slower) or crash with "Out of GPU Memory."

**Why it happens:**
- Developers start with low resolution (64-96), everything works, then increase for "final quality" and hit the wall
- Blender provides no warning about memory requirements before baking
- VRAM limits are separate from system RAM -- GPU rendering fails even with 64 GB system RAM if VRAM is insufficient
- Volumetric rendering (Principled Volume shader) has its own memory overhead for step sampling

**How to avoid:**
1. Design the resolution pipeline explicitly: 64 for prototyping, 128 for testing, 256 for production, 512 only if hardware supports it
2. Check system RAM and GPU VRAM before starting a bake: write a script that estimates memory requirements
3. Use Eevee for preview renders (much lower memory) and Cycles only for final
4. Keep Mantaflow domain as small as possible -- a domain twice as large uses 8x the memory
5. For 8K renders: use GPU+CPU hybrid rendering in Cycles (Blender 3.0+ supports this) to use both VRAM and system RAM
6. Consider render farm services (SheepIt, Render.st) for 8K renders that exceed local hardware

**Warning signs:**
- Bake times increasing non-linearly as resolution goes up
- Blender process consuming >80% of system RAM
- Cycles render starting then immediately failing
- "CUDA error: out of memory" in render log

**Phase to address:** Wave 2 (07-03/07-04) -- establish resolution ladder from the start

---

### Pitfall 8: Person Segmentation Temporal Flickering (Luminous Being)

**What goes wrong:**
MediaPipe Selfie Segmentation processes each frame independently. The resulting masks flicker between frames: a pixel classified as "person" in frame N may be classified as "background" in frame N+1 and back to "person" in frame N+2. This creates a strobing, jittery edge on the luminous being effect that looks terrible. Hair, loose clothing, and dark/backlit scenes are worst affected. MediaPipe's "general" model is slightly more accurate than the "landscape" model but both suffer from temporal inconsistency.

**Why it happens:**
- MediaPipe has no temporal awareness -- each frame is processed in isolation
- The model outputs a probability mask (0-1) and small probability changes around the 0.5 threshold flip pixels
- Hair and semi-transparent edges are inherently ambiguous at the per-pixel level
- Low-light and high-contrast scenes reduce model confidence

**How to avoid:**
1. Use SAM 2 (Segment Anything Model 2) instead of MediaPipe for video -- SAM 2 has built-in memory-based temporal propagation that eliminates flickering
2. If using MediaPipe: post-process masks with temporal smoothing -- average mask values across 3-5 frames
3. Apply Gaussian blur to mask edges (radius 5-15px) before using in Blender compositor to create soft boundaries
4. Use morphological operations (erode then dilate) to clean up mask noise
5. Threshold the probability mask at 0.6-0.7 instead of 0.5 to reduce edge jitter (accepts tighter boundary)
6. For the luminous being effect specifically: a slightly-too-tight mask is better than flickering edges, because the volumetric glow and fire effects extend beyond the mask anyway

**Warning signs:**
- Mask edges visibly dancing/oscillating when viewing the image sequence
- Thin lines of background showing through the person intermittently
- Hair appearing and disappearing frame-to-frame
- Effect looking "buzzy" or "electric" at edges (unintentional)

**Phase to address:** Wave 5 (07-13, Person Segmentation Pipeline) -- build comparison test between MediaPipe and SAM 2 early

---

### Pitfall 9: 8K Stereo VR File Sizes and Render Times

**What goes wrong:**
8K stereoscopic equirectangular video (8192x8192 with top-bottom stereo layout) produces enormous files and extraordinary render times. A single uncompressed frame is ~256 MB. A 30-second video at 30fps = 900 frames. Even with H.265 compression, a 30-second 8K stereo clip is typically 500 MB - 2 GB. Cycles render times for 8K equirectangular with volumetrics: 5-30 minutes per frame on a modern GPU. 900 frames = 75-450 hours of render time for 30 seconds of video.

**Why it happens:**
- 8K equirectangular is 8192x4096 per eye. Stereo doubles this to 8192x8192 (top-bottom layout)
- Equirectangular projection wastes pixels at the poles (inherent to the format)
- Cycles path tracing is slow for volumetrics (fire, fog) because each volumetric step requires ray sampling
- Stereo requires rendering twice (left eye + right eye) -- Blender's stereo mode cannot cheat this
- File storage on R2 at $0.015/GB/month adds up with hundreds of GB

**How to avoid:**
1. Establish a resolution ladder: 2K mono (preview) -> 4K mono (standard) -> 4K stereo (VR standard) -> 8K stereo (premium only)
2. Most VR headsets cannot display beyond 4K effectively anyway -- Meta Quest 3 has ~2064x2208 per eye. 8K is only justified for archival or cinema projection.
3. Render to image sequences (PNG/EXR), not directly to video -- crash recovery becomes free
4. Use Eevee for most of the frame, Cycles only for hero elements (fire, water) via render layers and compositing
5. Optimize Cycles: use denoiser aggressively (128-256 samples + OpenImageDenoise instead of 2048 samples), disable caustics unless rendering water
6. Use H.265/HEVC encoding (30-50% smaller than H.264) and consider cube map format (25% smaller than equirectangular)
7. Budget render time explicitly: a 3-minute meditation video at 4K stereo 30fps = 5,400 frames. Even at 1 min/frame = 90 hours. Plan for render farm or overnight batch.

**Warning signs:**
- Test renders at 8K taking >5 minutes per frame
- Disk usage climbing past 50 GB for a single project's renders
- R2 storage costs exceeding $5/month

**Phase to address:** Wave 1 (07-01, Configuration) -- define resolution presets and expected render times from the start

---

### Pitfall 10: Audio Analysis Inconsistency Between Browser and Blender

**What goes wrong:**
The existing Three.js pipeline uses the Web Audio API's `AnalyserNode` for FFT analysis. The Blender pipeline needs Python-based audio analysis (librosa or scipy). These two implementations produce DIFFERENT results for the same audio file due to fundamental algorithmic differences: Web Audio API always applies a Blackman window function; Python FFT uses no window by default. Web Audio's `getByteFrequencyData` returns 8-bit (0-255) scaled values; Python returns raw floating-point magnitudes. Frequency bin boundaries differ based on FFT size and sample rate handling. The result: fire that responds to bass in the Three.js preview may respond to different frequencies (or with different intensity curves) in the Blender cinema render.

**Why it happens:**
- Web Audio API's AnalyserNode has hardcoded Blackman windowing -- you cannot change it
- librosa uses Hann window by default for STFT
- Different default FFT sizes (Web Audio default 2048; librosa default 2048 but hop_length differs)
- Different amplitude scaling (dB reference levels differ)
- Different handling of frequency band aggregation (bass/mid/high cutoffs)

**How to avoid:**
1. Export audio analysis from the SAME source for both pipelines. Do NOT re-analyze in Python independently.
2. Best approach: export the audio analysis JSON from the browser-based AudioAnalyzer.ts ONCE, use that same JSON file to drive both Three.js preview and Blender keyframes
3. If Python analysis is needed (e.g., for onset detection not available in Web Audio): use explicit Blackman windowing in Python to match Web Audio, normalize to the same dB reference, and validate against browser output for a test track
4. Define frequency band boundaries explicitly in a shared config (e.g., bass = 20-250 Hz, mid = 250-4000 Hz, high = 4000-20000 Hz) used by both pipelines
5. Create a visual comparison test: render 5 seconds of audio-reactive fire in both Three.js and Blender, compare side by side

**Warning signs:**
- Fire/water behaving noticeably differently in cinema render vs preview
- Beat detection triggering at different times
- Frequency bands "feeling" wrong (bass hits not landing on the right beats)

**Phase to address:** Wave 1 (07-02, Audio Analysis Expansion) -- design the single-source analysis export before building the keyframe mapper

---

### Pitfall 11: Claude Cannot Perceive 3D Space Reliably

**What goes wrong:**
Claude is a language model, not a 3D engine. When controlling Blender, Claude works from scene data (object names, positions, material names) and occasional screenshots. But Claude has limited spatial reasoning -- it struggles with: understanding relative positions ("is object A behind or in front of object B from the camera's perspective?"), judging scale ("is this fire orb too large for the scene?"), estimating volumetric density ("is this fog too thick?"), and understanding light direction/shadows. Screenshots help but they are expensive (Pitfall 1) and 2D projections lose depth information.

**Why it happens:**
- LLMs process text and images, not 3D scene graphs
- A screenshot is a 2D projection -- depth information is lost
- Scene info from `get_scene_info` is capped at 10 objects (easily exceeded in complex scenes)
- Claude cannot rotate the viewport to check a different angle without another expensive screenshot
- Coordinate systems in Blender (X=right, Y=forward, Z=up) are non-intuitive and Claude can confuse axes

**How to avoid:**
1. Use template scenes with known-good camera positions, lighting setups, and object placements
2. Build scripts with explicit coordinate systems: `place_fire_orb(x=0, y=0, z=1.5)` not "place the fire orb above the water"
3. Use Blender's named collections and organized scene hierarchy so Claude can query by name
4. Take screenshots from MULTIPLE angles when spatial verification is needed (front + top views for 2 screenshots instead of guessing from 1)
5. Build validation scripts that check spatial relationships: "is camera pointing at origin? is fire domain above water plane? is domain large enough for flame height?"
6. For the scene info 10-object cap: write custom info scripts that return all relevant objects with their transforms

**Warning signs:**
- Fire appearing below the water plane
- Camera pointing away from the scene
- Objects at wildly wrong scales
- Lighting coming from unexpected directions
- Claude repeatedly asking for screenshots to verify basic positioning

**Phase to address:** Wave 0 (07-00c, Proof of Concept) -- establish template scenes and validation scripts before building complex setups

---

## Minor Pitfalls

Issues that cause annoyance or small rework but are manageable.

---

### Pitfall 12: Blender Version Lock with blender-mcp

**What goes wrong:**
blender-mcp addon.py is tightly coupled to Blender's Python API. Blender 5.0 introduced major Python API breaking changes: direct dict-like access to runtime properties removed, RNA paths for geometry node properties changed, Collada support removed. The addon declares minimum Blender 4.0 with 4.x as best-effort. Updating Blender may break the addon, and updating the addon may break existing scripts.

**How to avoid:**
1. Pin a specific Blender version for the project (4.5 LTS recommended -- long-term support, stable API)
2. Do not auto-update Blender or the addon mid-project
3. Test addon compatibility in an isolated environment before upgrading
4. Keep a backup of the working addon.py version

**Phase to address:** Wave 0 (07-00a) -- pin versions before any development

---

### Pitfall 13: VR Stereo Convergence Causes Physical Discomfort

**What goes wrong:**
Incorrect Inter-Pupillary Distance (IPD) settings in Blender's stereo camera cause viewer headaches and nausea. Improperly adjusted IPD is the cause of 40% of all VR sickness. Objects at incorrect stereo depth can cause vergence-accommodation conflict. Camera movements that are fine in flat video (quick pans, rolls, Z-axis translation) cause severe motion sickness in VR.

**How to avoid:**
1. Use standard IPD of 65mm (average human) with Blender's stereo camera
2. Safe IPD range: 55-75mm to cover most viewers
3. Keep convergence plane at the primary subject distance
4. VR-safe camera rules: no roll, no sudden acceleration, no Z-axis dolly, prefer slow pans and static shots
5. For meditation content specifically: static camera or very slow rotation (< 5 degrees/second) is ideal
6. Test in an actual VR headset before publishing -- what looks fine on a monitor may cause nausea in VR

**Phase to address:** Wave 3 (07-06, VR Setup) -- configure stereo camera templates with safe defaults

---

### Pitfall 14: Mantaflow Cycles Fire Rendering Glitches

**What goes wrong:**
Mantaflow fire rendered in Cycles produces glitched/corrupted frames (50%+ of frames may be wrong) while Eevee renders the same simulation perfectly (Blender bug T77678). This is specifically a Cycles + Mantaflow fire interaction bug that has persisted across multiple Blender versions.

**How to avoid:**
1. Always preview fire simulations in Eevee first to verify the simulation is correct
2. For Cycles rendering of fire: render a short test (20-30 frames) and inspect every frame before committing to full render
3. If glitches appear: try toggling "Persistent Images" off in Cycles render settings
4. Consider using the procedural volumetric fire approach (Principled Volume + noise textures without Mantaflow) for simpler fire effects -- no baking, no glitches
5. Report new instances on Blender's issue tracker with version and GPU info

**Phase to address:** Wave 2 (07-03, Mantaflow Fire Template) -- test Cycles + fire rendering immediately

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded file paths in bpy scripts | Quick iteration | Breaks on different machines, different project locations | Never in committed scripts; use relative paths via `bpy.path.abspath()` |
| Skipping .blend file saves before MCP operations | Faster iteration | Data loss on any crash or failed script | Never -- always save first |
| Using resolution 64 for all development | Fast bakes, quick renders | Final render looks completely different at 256 (fire behavior changes with resolution) | Only for verifying script logic, never for artistic decisions |
| Direct `exec()` in scripts without error handling | Simpler code | Silent failures, corrupted scene state | Only for trivial one-liner commands |
| Keeping Mantaflow caches between sessions | Avoid re-baking | 30-180+ GB disk consumption, stale caches causing confusion | Never without explicit cache management script |
| Single screenshot per iteration cycle | Cheapest visual feedback | May miss spatial issues visible from other angles | Acceptable for color/material checks, not for spatial layout |

## Integration Gotchas

Common mistakes when connecting the new Blender pipeline to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| blender-mcp socket | Assuming connection persists indefinitely | Test connection before each session; handle reconnection explicitly |
| Audio analysis JSON | Re-analyzing audio in Python with different FFT parameters | Export JSON once from browser AudioAnalyzer, use same file for both paths |
| Render queue | Trying to add Blender renders to the existing BullMQ Three.js queue | Create a separate Blender render queue with different timeout settings (hours not minutes) |
| File format bridge | Trying to import Three.js scene JSON into Blender | They are completely different formats -- share DATA (audio analysis, camera params) not scene files |
| VR metadata | Injecting spatial metadata after Blender render using existing Three.js pipeline | Use Blender's own stereo rendering output; metadata injection path is separate from Three.js |
| Template system | Reusing Three.js template names/configs for Blender scenes | Create a separate Blender template registry -- parameters do not map 1:1 between engines |

## Performance Traps

Patterns that work at small scale but fail as complexity grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Screenshot-per-change workflow | Token burn rate, slow iteration | Batch changes, validate with text scene info | >20 screenshots per session |
| High-resolution Mantaflow for testing | Multi-minute bake times killing iteration speed | Use 64-96 resolution for testing, 256+ only for final | Resolution >128 with >100 frames |
| All-Cycles rendering pipeline | Hours per frame, 8K impossible in reasonable time | Eevee for testing, Cycles for final; hybrid render layers | Any scene with volumetrics at >4K |
| Single .blend file for all capabilities | File bloat, slow open times, cache confusion | One .blend template per capability (fire, water, EDM, luminous being) | >5 simulations in one file |
| Synchronous MCP operations | 180s timeout wall | Async execution with polling | Any bake or render operation |
| Storing renders in Git | Repository bloats to GB+ | Output to `blender/renders/` which is .gitignored; use R2 for permanent storage | First 8K render committed |

## Security Considerations

Domain-specific security issues relevant to this pipeline.

| Concern | Risk | Prevention |
|---------|------|------------|
| `execute_blender_code` is unsandboxed `exec()` | Any Python code runs with full OS access -- file system, network, processes | Only run trusted scripts; never pipe untrusted user input into bpy scripts (GitHub issues #201, #207) |
| Poly Haven / Sketchfab asset downloads | Downloaded assets could contain malicious scripts (less likely but possible via .blend files with Python handlers) | Download and open assets only from Poly Haven and Sketchfab directly; inspect any .blend file before opening |
| SSRF via asset generation tools | Hunyuan3D / Rodin tools accept URLs that are not sanitized (GitHub issue #203) | Avoid passing user-controlled URLs to AI asset generation tools |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Mantaflow fire template:** Often missing noise bake (upres) -- simulation looks chunky without it -- verify noise is baked after data bake
- [ ] **Audio-to-keyframe system:** Often tested with one audio file only -- verify with 3+ different tracks (ambient, EDM, speech) to catch frequency mapping issues
- [ ] **Stereo VR output:** Often verified only on a monitor -- verify in an actual VR headset to catch IPD/convergence issues
- [ ] **Person segmentation masks:** Often checked on one frame only -- verify temporal consistency by scrubbing through 100+ frames looking for flicker
- [ ] **Blender render output:** Often missing alpha channel -- verify fire/water compositing layers have proper alpha for downstream compositing
- [ ] **Cache cleanup scripts:** Often clean the current cache only -- verify they also clean orphaned caches from previous bake attempts
- [ ] **Connection stability:** Often tested with quick commands only -- verify the socket survives a 5-minute idle gap followed by a command
- [ ] **Render to image sequence:** Often only the encoding step is tested -- verify crash recovery works by killing Blender mid-render and resuming from the last completed frame
- [ ] **Audio JSON export:** Often only bass/mid/high tested -- verify onset detection, BPM, and spectral features are present and correct
- [ ] **Template scenes:** Often only look correct from the default camera angle -- verify from multiple viewpoints

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Screenshot token burn | LOW | Stop current session; review and reduce screenshot frequency in next session |
| 180s timeout on bake | LOW | Kill the stuck Blender process; restart Blender; reload .blend from last save; use async bake pattern |
| Corrupted scene state | MEDIUM | Revert to last saved .blend file (`bpy.ops.wm.revert_mainfile()`); if unsaved, use Blender's auto-save recovery |
| Cache fills disk | MEDIUM | Identify cache directory; delete caches manually; free space; re-bake at lower resolution first |
| Socket disconnect | LOW | Restart Blender addon and MCP server; reconnect; verify with `get_scene_info` |
| Audio analysis mismatch | HIGH | Must re-export audio analysis from single source; re-generate all keyframes; may need to re-bake simulations |
| Mantaflow fire Cycles glitch | MEDIUM | Re-render affected frames with Eevee; composite with good Cycles frames; or switch to procedural volumetric fire |
| VR stereo convergence wrong | LOW-MEDIUM | Re-render with corrected IPD (must re-render all frames for stereo-affected scenes) |
| Segmentation mask flicker | MEDIUM | Switch from MediaPipe to SAM 2; or apply temporal smoothing post-process to all masks; re-import to Blender |
| Blender version update breaks addon | LOW | Revert Blender to pinned version from backup; restore working addon.py |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Screenshot token burn | Wave 0 (07-00a) | Monitor token usage in first 3 sessions; should be <20% images |
| #2 180s timeout | Wave 0 (07-00a) | Successfully bake a 50-frame simulation via async pattern |
| #3 No undo/corrupted state | Wave 0 (07-00a) | Run a script that intentionally errors; verify .blend reverts cleanly |
| #4 Cache explosion | Wave 2 (07-03) | Monitor disk after first fire bake; cache should be in dedicated directory |
| #5 Socket disconnect | Wave 0 (07-00a) | Idle for 5 minutes then send command; verify it works or reconnects |
| #6 Keyframe broken | Wave 2 (07-05) | Keyframe Flow object params; bake; verify animation in rendered output |
| #7 Memory wall | Wave 2 (07-03/04) | Document RAM/VRAM usage at resolution 64, 128, 256 |
| #8 Segmentation flicker | Wave 5 (07-13) | Export 100 frames of masks; inspect edge consistency frame-by-frame |
| #9 8K file sizes | Wave 1 (07-01) | Calculate expected file sizes for each resolution preset |
| #10 Audio mismatch | Wave 1 (07-02) | Render 5 seconds in both Three.js and Blender; compare beat alignment |
| #11 Claude spatial limits | Wave 0 (07-00c) | Claude positions fire orb at (0,0,1.5); verify via scene info without screenshot |
| #12 Version lock | Wave 0 (07-00a) | Pin Blender 4.5 LTS + specific addon.py commit hash |
| #13 VR convergence | Wave 3 (07-06) | Render stereo test frame; check in VR headset |
| #14 Cycles fire glitch | Wave 2 (07-03) | Render 30 frames of Mantaflow fire in Cycles; inspect all frames |

## Sources

### GitHub Issues (Primary -- Real User Reports)
- [blender-mcp #50 -- MCP error -32001: Request Timed out](https://github.com/ahujasid/blender-mcp/issues/50)
- [blender-mcp #52 -- ProactorEventLoop connection error (Windows)](https://github.com/ahujasid/blender-mcp/issues/52)
- [blender-mcp #73 -- Connected but can't receive answer](https://github.com/ahujasid/blender-mcp/issues/73)
- [blender-mcp #96 -- execute_blender_code should return print output](https://github.com/ahujasid/blender-mcp/issues/96)
- [blender-mcp #189 -- get_viewport_screenshot fails on Windows/WSL](https://github.com/ahujasid/blender-mcp/issues/189)
- [blender-mcp #201 -- RCE via unsanitized exec()](https://github.com/ahujasid/blender-mcp/issues/201)
- [blender-mcp #207 -- Unrestricted arbitrary code execution](https://github.com/ahujasid/blender-mcp/issues/207)
- [Blender #149890 -- Blender 5.0 undo system crash](https://projects.blender.org/blender/blender/issues/149890)

### Blender Bug Tracker (Mantaflow Issues)
- [T72812 -- Keyframing Domain parameters broken: Mantaflow Smoke](https://developer.blender.org/T72812)
- [T77678 -- Buggy/Glitchy Mantaflow fire animation in Cycles](https://developer.blender.org/T77678)
- [T77713 -- Cache deleted when changing upres factor](https://developer.blender.org/T77713)
- [T86164 -- Crash when baking Mantaflow](https://developer.blender.org/T86164)
- [T73155 -- Mantaflow unstable with adaptive domain gas sim](https://developer.blender.org/T73155)
- [T80154 -- Mantaflow rendering unstable with multiple fluid domains](https://developer.blender.org/T80154)

### Official Documentation
- [Anthropic Vision API -- Token Calculation](https://platform.claude.com/docs/en/build-with-claude/vision) -- tokens = (width*height)/750
- [Blender 5.1 Manual -- Mantaflow Cache](https://docs.blender.org/manual/en/latest/physics/fluid/type/domain/cache.html)
- [Blender 5.0 Release -- Compatibility Breakages](https://devtalk.blender.org/t/upcoming-blender-5-0-release-compatibility-breakages/37078)
- [Blender Python API Best Practice](https://docs.blender.org/api/current/info_best_practice.html)
- [Blender GPU Rendering](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html)
- [MDN -- Web Audio API AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)

### Community Reports
- [Blender Artists -- Mantaflow bake time reduction](https://blenderartists.org/t/i-wanna-decrease-the-bake-time-for-physics-but-how-mantaflow/1197922)
- [Blender Artists -- 180 GB cache without warning](https://blenderartists.org/t/blender-took-180-gb-in-cache-and-i-had-no-way-of-knowing-it/656526)
- [Blender Artists -- Mantaflow smoke refinement](https://blenderartists.org/t/mantaflow-smoke-refinement/1229889)
- [Blender Community -- Clear Mantaflow Cache request](https://blender.community/c/rightclickselect/2Hfbbc/)
- [Blender DevTalk -- Mantaflow Bug/Problem](https://devtalk.blender.org/t/mantaflow-bug-problem/11794)

### VR / Stereo Rendering
- [Medium -- VR Cybersickness Playbook 2025](https://medium.com/antaeus-ar/beating-cybersickness-the-complete-vr-ar-comfort-playbook-2025-59ea4e083b9f)
- [Springer -- Gaze-contingent VR stereo cybersickness prevention](https://link.springer.com/article/10.1007/s00371-024-03505-0)
- [360 Labs -- VR Video Formats Explained](https://360labs.net/blog/vr-video-formats-explained)

### Segmentation
- [Meta AI -- SAM 2: Segment Anything in Images and Videos](https://ai.meta.com/sam2/)
- [ArXiv -- SAM 2 Paper](https://arxiv.org/html/2408.00714v1)
- [MediaPipe -- Selfie Segmentation](https://chuoling.github.io/mediapipe/solutions/selfie_segmentation.html)
- [PMC -- SAM2Plus with Kalman Filtering for Long-Term Video Object Segmentation](https://pmc.ncbi.nlm.nih.gov/articles/PMC12252479/)

---
*Pitfalls research for: Cinema VFX Pipeline (Blender MCP + Mantaflow + Person Segmentation + VR Rendering)*
*Researched: 2026-03-19*
