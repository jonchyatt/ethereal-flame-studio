# Domain Pitfalls: Audio-Reactive Video Generation

**Domain:** Audio-reactive WebGL visualization with 8K/VR video export
**Researched:** 2026-01-26
**Confidence:** HIGH (verified across multiple authoritative sources)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues. These can derail the project if not addressed early.

---

### Pitfall 1: WebGL Cannot Do 8K In-Browser

**What goes wrong:** Developers assume they can render 8K (7680x4320) directly in a browser WebGL canvas. The browser either crashes, loses context, or produces corrupted output.

**Why it happens:**
- WebGL texture limits vary by device ([only 50% of devices support textures >4096px](https://webgl2fundamentals.org/webgl/lessons/webgl-cross-platform-issues.html))
- GPU memory consumption spikes from 254MB to 2.5GB causing [context loss and browser crashes](https://github.com/OHIF/Viewers/issues/3207)
- No reliable way to determine available VRAM in WebGL

**Consequences:**
- Browser crash mid-render
- WebGL context lost with no recovery
- Hours of render time wasted
- User's device becomes unresponsive

**Prevention:**
1. **Never render 8K directly in WebGL.** Maximum safe resolution is 4096x4096
2. **Use tile-based rendering:** Render 4x 4K tiles and stitch server-side
3. **Offload to headless GPU server:** Use Puppeteer/Playwright with real GPU for high-res capture
4. **Consider WebGPU** for future-proofing (better memory control, modern GPU access)

**Detection (warning signs):**
- `gl.getParameter(gl.MAX_TEXTURE_SIZE)` returns < 8192
- Memory usage spikes in Chrome DevTools
- Intermittent "WebGL context lost" errors during development

**Phase to address:** Phase 1 (Architecture) - Must decide rendering strategy before any code

---

### Pitfall 2: Three.js Memory Leaks in Long Sessions

**What goes wrong:** Visualizations run for 3-5 minute songs, accumulating memory until the browser crashes or context is lost.

**Why it happens:**
- [Every texture, geometry, and material consumes GPU memory](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene) that must be explicitly disposed
- Removing objects from scene without calling `dispose()` leaves them in GPU memory
- Event listeners tied to old objects create orphaned closures
- [ImageBitmap textures from GLB files are not garbage collected by default](https://github.com/mrdoob/three.js/issues/23953)
- [TSL (Three Shader Language) leaks via JsFunc closures](https://github.com/mrdoob/three.js/issues/31644)

**Consequences:**
- Memory grows 50-100MB per minute of visualization
- Browser becomes sluggish
- WebGL context lost mid-render
- Video generation fails partway through

**Prevention:**
1. **Explicit disposal pattern:**
   ```javascript
   // ALWAYS dispose before removing
   mesh.geometry.dispose();
   mesh.material.dispose();
   if (mesh.material.map) mesh.material.map.dispose();
   scene.remove(mesh);
   ```
2. **Monitor with `renderer.info`:** Track texture count, geometries, draw calls
3. **Use Chrome memory profiler:** Watch for increasing `THREE.BufferGeometry` or `THREE.Texture` instances
4. **Pool and reuse objects** instead of creating/destroying
5. **For ImageBitmap textures:** Call `.close()` manually before dispose

**Detection:**
- `renderer.info.memory.textures` or `geometries` increasing over time
- Chrome Task Manager shows GPU memory climbing
- Performance degrades as song progresses

**Phase to address:** Phase 2 (Core Visualizer) - Build disposal patterns into base architecture

---

### Pitfall 3: Audio-Video Sync Drift

**What goes wrong:** The visual animation drifts out of sync with the audio, especially in long videos or during export.

**Why it happens:**
- [Web Audio API uses seconds, JavaScript setTimeout uses milliseconds](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - mixing them causes drift
- [requestAnimationFrame timing is not guaranteed](https://medium.com/fender-engineering/near-realtime-animations-with-synchronized-audio-in-javascript-6d845afcf1c5) (varies with CPU load)
- Audio sample rate mismatches (44.1kHz vs 48kHz) cause cumulative drift
- Frame export doesn't match audio timestamps during video generation
- [Audio output latency varies by device](https://web.dev/articles/audio-output-latency)

**Consequences:**
- Beat drops happen 100-500ms after visual peaks
- VR video feels "off" in ways users can't articulate
- Professional quality impossible to achieve

**Prevention:**
1. **Use AudioContext.currentTime as single source of truth:**
   ```javascript
   // DON'T: Use Date.now() or performance.now() for audio sync
   // DO: Use audio context time
   const now = audioContext.currentTime;
   const beatProgress = (now - beatStartTime) / beatDuration;
   ```
2. **For frame export:** Calculate exact audio timestamp for each frame
   ```javascript
   const frameTime = frameNumber / targetFPS;
   // Seek audio analysis to frameTime, not wall-clock time
   ```
3. **Standardize sample rate:** Always use 48kHz (video standard)
4. **Account for output latency:** Use `audioContext.outputLatency` or `audioContext.baseLatency`

**Detection:**
- Clap/snare test: visual should hit exactly on transient
- Export a 3-minute video and check sync at beginning vs end
- Compare with professional music videos for reference

**Phase to address:** Phase 2 (Audio Analysis) - Core timing architecture

---

### Pitfall 4: Headless Browser WebGL Fails Silently

**What goes wrong:** Puppeteer/Playwright runs fine locally but produces black frames or crashes in CI/cloud.

**Why it happens:**
- [GPU hardware acceleration is disabled by default in headless mode](https://github.com/microsoft/playwright/issues/11627)
- [Default WebGL context reports "Google SwiftShader"](https://www.scrapeless.com/en/blog/webgl-fingerprint) (software renderer, unusably slow)
- [Firefox headless doesn't support WebGL at all](https://bugzilla.mozilla.org/show_bug.cgi?id=1375585)
- [Windows requires different flags than Mac/Linux](https://github.com/microsoft/playwright/issues/11627)

**Consequences:**
- 8 FPS instead of 60 FPS during capture
- Black frames in exported video
- CI pipeline works locally, fails in cloud
- 100x slower rendering than expected

**Prevention:**
1. **Force hardware acceleration:**
   ```javascript
   // Puppeteer
   browser = await puppeteer.launch({
     args: [
       '--use-gl=egl',        // Enable GPU in headless
       '--use-angle=angle',   // Force ANGLE for WebGL
       '--enable-gpu',
       '--enable-webgl',
     ],
     headless: 'new',  // Use new headless mode
   });
   ```
2. **Use cloud GPU providers:** Runpod, Modal, or dedicated GPU instances
3. **Verify GPU is active:**
   ```javascript
   const gl = canvas.getContext('webgl2');
   const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
   console.log(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
   // Should NOT be "SwiftShader" or "llvmpipe"
   ```
4. **Use Chrome, not Firefox** for headless WebGL

**Detection:**
- Renderer string contains "SwiftShader" or "llvmpipe"
- Frame capture takes >100ms per frame (should be <16ms)
- GPU utilization shows 0% in cloud monitoring

**Phase to address:** Phase 3 (Video Export) - Critical for server-side rendering

---

### Pitfall 5: VR Metadata Injection Fails Silently

**What goes wrong:** 360/VR videos play as flat videos on YouTube, Oculus, or VR players despite being equirectangular.

**Why it happens:**
- YouTube requires [Spherical Video V2 metadata](https://github.com/google/spatial-media) in the file header
- [FFmpeg doesn't preserve 360 metadata by default](https://www.mail-archive.com/ffmpeg-user@ffmpeg.org/msg30275.html) when re-encoding
- Different platforms have different metadata requirements
- [XMP-GSpherical tags often lost during processing](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)

**Consequences:**
- Video appears flat/distorted on VR headsets
- YouTube doesn't enable 360 viewer
- Client thinks video is broken
- Requires re-render and re-upload

**Prevention:**
1. **Use `-strict unofficial` flag in FFmpeg:**
   ```bash
   ffmpeg -i input.mp4 -strict unofficial -c copy output_with_metadata.mp4
   ```
2. **Or use Google's Spatial Media Metadata Injector** as final step
3. **Add `-map_metadata 0 -movflags use_metadata_tags`** for metadata preservation
4. **Validate before delivery:**
   ```bash
   exiftool -XMP-GSpherical:* output.mp4
   # Should show: ProjectionType: equirectangular
   ```
5. **Test on actual VR headset** before client delivery

**Detection:**
- `exiftool` shows no GSpherical tags
- YouTube preview doesn't show 360 controls
- VR player shows stretched flat image

**Phase to address:** Phase 3 (Video Export) - Build into export pipeline

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 6: Cloud GPU Cold Start Delays

**What goes wrong:** User submits video job, waits 30+ seconds before anything happens.

**Why it happens:**
- [Serverless GPU cold starts can be 10-30 seconds](https://www.runpod.io/articles/guides/top-serverless-gpu-clouds) for large containers
- Model loading, shader compilation add to startup time
- [85% of serverless cost goes to waiting, not processing](https://www.runpod.io/articles/guides/serverless-gpu-pricing)

**Prevention:**
1. **Use warm pools:** Keep minimum 1 instance running for frequent users
2. **Choose providers with FlashBoot:** [Runpod claims 1-2 second cold starts](https://www.runpod.io/product/serverless)
3. **Pre-compile shaders** and cache them
4. **Show progress UI** during cold start (don't make user think it's broken)
5. **Consider dedicated GPU pods** for production (no cold start)

**Detection:**
- First request takes >10 seconds, subsequent requests <2 seconds
- Monitoring shows "waiting for instance" time

**Phase to address:** Phase 4 (Cloud Infrastructure)

---

### Pitfall 7: FFmpeg 8K Encoding Memory Exhaustion

**What goes wrong:** FFmpeg process crashes or system becomes unresponsive during 8K encoding.

**Why it happens:**
- [32GB RAM proved insufficient for 8K VMAF quality measurements](https://streaminglearningcenter.com/metrics/8k-video-per-title-encoding-hdr-metrics.html)
- Multi-pass encoding doubles memory requirements
- Node.js default heap limit (4GB) is insufficient
- Pipe buffering between Node.js and FFmpeg causes memory accumulation

**Prevention:**
1. **Use hardware encoding (NVENC/AMF)** to reduce CPU/memory load
2. **Stream frames instead of buffering:**
   ```javascript
   // DON'T: Buffer all frames then encode
   // DO: Pipe frames directly to FFmpeg stdin
   const ffmpeg = spawn('ffmpeg', ['-f', 'image2pipe', '-i', '-', ...]);
   for (const frame of frames) {
     await new Promise(resolve => ffmpeg.stdin.write(frame, resolve));
   }
   ```
3. **Increase Node.js memory:** `node --max-old-space-size=16384`
4. **Use faster preset for long videos:** `medium` instead of `veryslow`
5. **Monitor with `process.memoryUsage()`**

**Detection:**
- FFmpeg exits with code 137 (OOM killed)
- System swap usage spikes during encoding
- Node.js heap grows continuously

**Phase to address:** Phase 3 (Video Export)

---

### Pitfall 8: Unity Shader Port Fails on WebGL

**What goes wrong:** Shaders that work in Unity Editor show pink (error) or wrong colors in WebGL build.

**Why it happens:**
- [HLSL compiler is stricter than GLSL](https://docs.unity3d.com/6000.2/Documentation/Manual/SL-PlatformDifferences.html) about uninitialized outputs
- [Const keyword means different things in HLSL vs GLSL](https://docs.unity3d.com/6000.2/Documentation/Manual/SL-PlatformDifferences.html)
- [Depth buffer direction differs between platforms](https://docs.unity3d.com/6000.2/Documentation/Manual/SL-PlatformDifferences.html)
- [tex2D in vertex shader is invalid](https://docs.unity3d.com/6000.2/Documentation/Manual/SL-PlatformDifferences.html)
- DirectX 11 specific syntax (StructuredBuffers, RWTextures) unsupported

**Prevention:**
1. **Always initialize all output components:**
   ```hlsl
   // BAD: float4 result; result.xyz = ...; return result;
   // GOOD: float4 result = float4(0,0,0,1); result.xyz = ...; return result;
   ```
2. **Test WebGL build frequently** during shader development
3. **Use `UNITY_INITIALIZE_OUTPUT(Input, o)`** in surface shaders
4. **Wrap DirectX-only features in preprocessor guards**
5. **Follow GLSL const semantics** (compile-time only)

**Detection:**
- Pink/magenta objects in WebGL build
- GLSL link errors in browser console
- Works in Editor, fails in build

**Phase to address:** If porting Unity shaders, Phase 1; otherwise N/A

---

### Pitfall 9: Audio Analysis Frequency Data Misinterpretation

**What goes wrong:** Bass doesn't feel punchy, highs feel muddy, visualization doesn't match what you hear.

**Why it happens:**
- [FFT data is linear but human hearing is logarithmic](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- Default `fftSize` of 2048 may be wrong for your use case
- [getByteFrequencyData returns 0-255 values](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) (unsigned bytes), not dB
- [Some FFT bins are always 0](https://www.smashingmagazine.com/2022/03/audio-visualization-javascript-gsap-part1/) and should be filtered
- [smoothingTimeConstant](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) affects responsiveness

**Prevention:**
1. **Use logarithmic frequency binning** for perceptual accuracy:
   ```javascript
   // Map FFT bins to musical octaves, not linear indices
   const bass = averageBins(0, 10);     // ~20-150Hz
   const mid = averageBins(10, 100);    // ~150-2000Hz
   const high = averageBins(100, 512);  // ~2000Hz+
   ```
2. **Lower smoothingTimeConstant** (0.4-0.6) for reactive visualizations
3. **Use [audioMotion-analyzer](https://github.com/hvianna/audioMotion-analyzer)** for pre-built perceptual weighting
4. **Apply A-weighting filter** to match human ear sensitivity
5. **Test with reference tracks** (known punchy bass, clear highs)

**Detection:**
- Snare hits feel delayed vs kick drum
- High frequencies dominate visualization despite balanced audio
- Bass feels sluggish compared to commercial visualizers

**Phase to address:** Phase 2 (Audio Analysis)

---

### Pitfall 10: WebGL Context Lost Without Recovery

**What goes wrong:** Long render crashes and there's no way to resume.

**Why it happens:**
- [Context loss can happen at ANY time, even mid-initialization](https://www.khronos.org/webgl/wiki/HandlingContextLost)
- GPU driver crash, memory pressure, tab switching, external monitor plug-in
- Without recovery, all render progress is lost

**Prevention:**
1. **Always listen for context events:**
   ```javascript
   canvas.addEventListener('webglcontextlost', (e) => {
     e.preventDefault();  // Tell browser we'll handle recovery
     cancelAnimationFrame(animationId);
     // Save render progress
   });

   canvas.addEventListener('webglcontextrestored', () => {
     // Re-create ALL resources: textures, buffers, shaders, programs
     // Resume from saved progress
   });
   ```
2. **Checkpoint render progress** (e.g., every 10 seconds / 300 frames)
3. **Re-create all WebGL resources** on restore (they're all invalid)
4. **Test with `WEBGL_lose_context.loseContext()`** extension

**Detection:**
- `gl.isContextLost()` returns true
- Renders stop producing output
- Chrome shows "Rats! WebGL hit a snag" message

**Phase to address:** Phase 2 (Core Visualizer)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall 11: Equirectangular Seam Artifacts

**What goes wrong:** Visible vertical line at the "back" of 360 video where left/right edges meet.

**Why it happens:**
- [Traditional sharpening tools aren't 360-aware](https://creator.oculus.com/getting-started/sharpening-and-denoising-360-video-content/)
- Post-processing applied after projection creates edge discontinuity
- Antialiasing doesn't wrap around

**Prevention:**
1. Apply effects BEFORE projection to equirectangular
2. Use 360-aware post-processing tools
3. Test by viewing at 180 degrees (looking "backward")

**Phase to address:** Phase 3 (VR Output)

---

### Pitfall 12: OffscreenCanvas Memory Tripling

**What goes wrong:** Memory usage 3x higher than expected when using Web Workers for rendering.

**Why it happens:**
- [OffscreenCanvas with context can't be transferred back](https://github.com/whatwg/html/issues/6615)
- Requires main canvas + worker canvas + ImageBitmap transfer
- [Double/triple buffering uses 375MB+ for antialiased 1080p](https://github.com/gpuweb/gpuweb/issues/403)

**Prevention:**
1. Be aware this is a fundamental limitation
2. Don't use OffscreenCanvas for final high-res output
3. Use it for preview/low-res only
4. Budget memory accordingly (3x visible canvas size)

**Phase to address:** Phase 2 (Architecture decision)

---

### Pitfall 13: Puppeteer Frame Drops During Recording

**What goes wrong:** Exported video has stutters, dropped frames, or inconsistent timing.

**Why it happens:**
- [puppeteer-screen-recorder has known frame drop issues](https://github.com/prasanaworld/puppeteer-screen-recorder/issues/69)
- Real-time capture can't keep up with render speed
- CDP screenshot methods are slower than canvas copy

**Prevention:**
1. **Use timecut for guaranteed frame-perfect capture:**
   - [Timecut](https://github.com/tungs/timecut) overwrites time functions for deterministic capture
   - Every frame is captured regardless of render speed
2. **Or use canvas capture mode** (faster than screenshot mode)
3. **Don't rely on real-time screencast** for production quality

**Phase to address:** Phase 3 (Video Export)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Architecture | 8K in-browser | Tile-based rendering or server-side |
| Architecture | Memory strategy | Budget 3x for OffscreenCanvas, explicit disposal |
| Audio Analysis | Sync drift | Use AudioContext.currentTime exclusively |
| Audio Analysis | Frequency mapping | Logarithmic binning, perceptual weighting |
| Core Visualizer | Memory leaks | Dispose pattern, renderer.info monitoring |
| Core Visualizer | Context loss | Event handlers, checkpointing |
| Video Export | Headless GPU | Force hardware acceleration, verify renderer |
| Video Export | FFmpeg memory | Streaming, hardware encoding |
| VR Output | Metadata loss | -strict unofficial, validate with exiftool |
| VR Output | Seam artifacts | Pre-projection processing |
| Cloud Deployment | Cold starts | Warm pools, FlashBoot providers |

---

## Summary: Top 5 Project-Killing Mistakes

1. **Assuming WebGL can do 8K** - It cannot. Plan for tile rendering or server-side GPU.
2. **Ignoring memory management** - Three.js leaks unless you explicitly prevent it.
3. **Using wall-clock time for audio sync** - Always use AudioContext.currentTime.
4. **Headless browser without GPU flags** - You'll get software rendering at 8 FPS.
5. **Forgetting VR metadata injection** - Your 360 video will play flat.

---

## Sources

**WebGL/Memory:**
- [WebGL Cross-Platform Issues](https://webgl2fundamentals.org/webgl/lessons/webgl-cross-platform-issues.html)
- [OHIF WebGL Context Lost Issue](https://github.com/OHIF/Viewers/issues/3207)
- [Three.js Memory Leak Tips](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene)
- [Three.js ImageBitmap Leak](https://github.com/mrdoob/three.js/issues/23953)
- [Three.js TSL Memory Leak](https://github.com/mrdoob/three.js/issues/31644)
- [WebGL Context Loss Handling](https://www.khronos.org/webgl/wiki/HandlingContextLost)

**Audio Sync:**
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Near-Realtime Animations with Synchronized Audio](https://medium.com/fender-engineering/near-realtime-animations-with-synchronized-audio-in-javascript-6d845afcf1c5)
- [Audio/Video Synchronization](https://web.dev/articles/audio-output-latency)
- [Web Audio Visualizations MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)

**Headless/Video Export:**
- [Playwright WebGL Hardware Acceleration](https://github.com/microsoft/playwright/issues/11627)
- [WebGL Fingerprinting and Headless](https://www.scrapeless.com/en/blog/webgl-fingerprint)
- [Timecut - Frame-perfect capture](https://github.com/tungs/timecut)
- [Puppeteer Frame Drop Issues](https://github.com/prasanaworld/puppeteer-screen-recorder/issues/69)

**VR/360:**
- [FFmpeg 360 Cheat Sheet](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)
- [Google Spatial Media](https://github.com/google/spatial-media)
- [Meta 360 Post-Processing](https://creator.oculus.com/getting-started/sharpening-and-denoising-360-video-content/)

**Cloud GPU:**
- [Runpod Serverless GPU](https://www.runpod.io/articles/guides/top-serverless-gpu-clouds)
- [Serverless GPU Pricing](https://www.runpod.io/articles/guides/serverless-gpu-pricing)

**FFmpeg/Encoding:**
- [8K Encoding Memory Issues](https://streaminglearningcenter.com/metrics/8k-video-per-title-encoding-hdr-metrics.html)
- [Node.js Memory Management in Containers](https://developers.redhat.com/articles/2025/10/10/nodejs-20-memory-management-containers)

**Shader Porting:**
- [Unity Shader Platform Differences](https://docs.unity3d.com/6000.2/Documentation/Manual/SL-PlatformDifferences.html)

**OffscreenCanvas:**
- [OffscreenCanvas MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [OffscreenCanvas Context Transfer Issue](https://github.com/whatwg/html/issues/6615)
- [Three.js with OffscreenCanvas](https://evilmartians.com/chronicles/faster-webgl-three-js-3d-graphics-with-offscreencanvas-and-web-workers)
