# Puppeteer Frame Capture Implementation Plan

## Objective
Implement automated frame-by-frame capture from Ethereal Flame Studio using Puppeteer, enabling fully automated video rendering.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PUPPETEER RENDER FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                   │
│  │  Worker     │──┐                                                │
│  │  (Node.js)  │  │                                                │
│  └─────────────┘  │                                                │
│                   │                                                 │
│                   ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Puppeteer Render Module                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ Launch  │→ │  Load   │→ │ Inject  │→ │ Capture │       │   │
│  │  │ Chrome  │  │   App   │  │  Audio  │  │ Frames  │       │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                   │                                                 │
│                   ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Browser (Headless)                       │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │  Ethereal Flame Studio                               │  │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │   │
│  │  │  │ Render Mode│  │  Particles │  │   Skybox   │    │  │   │
│  │  │  │    API     │→ │   System   │→ │   Shader   │    │  │   │
│  │  │  └────────────┘  └────────────┘  └────────────┘    │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Render Mode API (In-Browser)

### Task 1.1: Create RenderModeAPI.ts
**File:** `src/lib/render/RenderModeAPI.ts`

Exposes control functions on `window.__renderMode`:
- `init(config)` - Initialize render mode with fps, resolution
- `loadAudioData(preAnalyzedData)` - Load pre-analyzed audio
- `setFrame(frameNumber)` - Advance scene to specific frame
- `captureFrame()` - Return canvas as base64 PNG
- `getStatus()` - Return current state (ready, rendering, error)
- `cleanup()` - Exit render mode

### Task 1.2: Modify ParticleLayer for Render Mode
**File:** `src/components/canvas/ParticleLayer.tsx`

When in render mode:
- Use injected audio data instead of real-time analyzer
- Use fixed delta time (1/fps) instead of useFrame delta
- Use seeded random for deterministic particle positions

### Task 1.3: Modify StarNestSkybox for Render Mode
**File:** `src/components/canvas/StarNestSkybox.tsx`

When in render mode:
- Use fixed time progression instead of real clock
- Accept time from RenderModeAPI

### Task 1.4: Create Render Mode Hook
**File:** `src/hooks/useRenderMode.ts`

Hook that:
- Detects if render mode is active
- Provides current frame's audio data
- Provides elapsed time for current frame

### Test 1: Manual Browser Test
1. Open app in browser
2. Open console, call `window.__renderMode.init({fps: 30})`
3. Verify particles freeze (no real-time updates)
4. Call `setFrame(0)`, `setFrame(30)`, verify scene changes
5. Call `captureFrame()`, verify base64 PNG returned

---

## Phase 2: Puppeteer Render Script

### Task 2.1: Install Puppeteer
```bash
npm install puppeteer --save-dev
```

### Task 2.2: Create PuppeteerRenderer.ts
**File:** `src/lib/render/PuppeteerRenderer.ts`

Class that:
- Launches headless Chrome with GPU flags
- Navigates to app URL
- Waits for app ready
- Provides `renderVideo(audioPath, outputDir, options)` method

### Task 2.3: Implement Frame Loop
```typescript
async renderFrames(preAnalyzedAudio, outputDir, onProgress) {
  const totalFrames = Math.ceil(audioDuration * fps);

  for (let frame = 0; frame < totalFrames; frame++) {
    // Inject audio data for this frame
    await page.evaluate((data) => {
      window.__renderMode.setAudioData(data);
    }, audioDataForFrame);

    // Advance to frame
    await page.evaluate((n) => window.__renderMode.setFrame(n), frame);

    // Wait for render
    await page.waitForFunction(() => window.__renderMode.getStatus() === 'ready');

    // Capture
    const png = await page.evaluate(() => window.__renderMode.captureFrame());

    // Save to disk
    await fs.writeFile(`${outputDir}/${frame.toString().padStart(5, '0')}.png`,
                       Buffer.from(png, 'base64'));

    onProgress(frame / totalFrames);
  }
}
```

### Task 2.4: Chrome GPU Flags
```typescript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--use-gl=egl',           // Enable GPU
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-software-rasterizer',
    '--no-sandbox',           // Required for Docker
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
  ],
});
```

### Test 2: Single Frame Test
1. Run dev server: `npm run dev`
2. Create test script that:
   - Launches Puppeteer
   - Loads app
   - Captures single frame
   - Saves to disk
3. Verify frame quality matches browser preview

---

## Phase 3: Wire to Render Worker

### Task 3.1: Create renderVideo Function
**File:** `src/lib/render/renderVideo.ts`

High-level function that:
1. Pre-analyzes audio
2. Calls PuppeteerRenderer
3. Calls FFmpegEncoder
4. Calls VR metadata injection (if 360)
5. Returns final video path

### Task 3.2: Update renderWorker.ts
Replace `simulateRender()` with:
```typescript
import { renderVideo } from '../render/renderVideo';

const result = await renderVideo({
  audioPath: audioFile.path,
  outputPath: tempPath,
  template: template,
  format: outputFormat,
  fps: 30,
  onProgress: (progress) => job.updateProgress(10 + progress * 80),
});
```

### Task 3.3: Handle Errors and Cleanup
- Graceful browser shutdown on error
- Clean up temp frames directory
- Retry logic for transient failures

### Test 3: Worker Integration Test
1. Start Redis and worker
2. Submit job via API
3. Monitor job progress
4. Verify output video plays correctly

---

## Phase 4: End-to-End Testing

### Test 4.1: Short Audio Test (5 seconds)
- Input: 5-second audio clip
- Output: 1080p flat video
- Verify: Smooth playback, audio sync, particle reactivity

### Test 4.2: 360 Mono Test
- Input: Same 5-second clip
- Output: 360 monoscopic 4K
- Verify: VR metadata present, YouTube recognizes as 360

### Test 4.3: 360 Stereo Test
- Input: Same clip
- Output: 360 stereoscopic 8K
- Verify: Top/bottom layout, correct IPD

### Test 4.4: Full-Length Test
- Input: 3-minute meditation audio
- Output: 360 stereo
- Verify: Memory doesn't explode, no frame drops

---

## Critique of This Plan

### Weaknesses Identified:

1. **Single dev server dependency** - Puppeteer needs the app running. Should support both local dev and production URL.

2. **Memory pressure** - Capturing 5400 frames (3 min at 30fps) as base64 strings could be slow. Should capture directly to disk.

3. **No parallel frame capture** - Could batch multiple frames or use multiple browser tabs.

4. **Blocking the main thread** - Heavy computation in browser. Should use web workers or offscreen canvas.

5. **Error recovery** - What if Chrome crashes at frame 2000? Need checkpoint system.

6. **No GPU detection** - Should gracefully fallback if no GPU available.

### Optimizations Applied:

1. **Direct screenshot to file** - Use Puppeteer's `page.screenshot({ path })` instead of base64 round-trip.

2. **Checkpoint system** - Save progress every 100 frames, allow resuming.

3. **GPU detection** - Check for GPU before starting, warn if software rendering.

4. **Memory cleanup** - Force garbage collection between frames if needed.

5. **Timeout handling** - Set reasonable timeouts, retry on transient failures.

---

## Optimized Execution Order

```
1. [SETUP] Install puppeteer, create types
2. [API]   RenderModeAPI.ts - window.__renderMode
3. [TEST]  Manual browser test - verify API works
4. [HOOK]  useRenderMode hook - integrate with components
5. [MOD]   ParticleLayer render mode - fixed time, injected audio
6. [MOD]   StarNestSkybox render mode - fixed time
7. [TEST]  Browser test - verify particles work in render mode
8. [PUPP]  PuppeteerRenderer.ts - launch and capture
9. [TEST]  Single frame capture test
10. [PUPP] Full frame loop with checkpoints
11. [TEST] Short video test (5 seconds)
12. [WIRE] renderVideo.ts - orchestrate full pipeline
13. [WIRE] Update renderWorker.ts
14. [TEST] Worker integration test
15. [TEST] Full E2E test with real audio
```

---

## Success Criteria

- [ ] 5-second test video renders in under 60 seconds
- [ ] Output video plays smoothly at correct FPS
- [ ] Audio is in sync with visuals
- [ ] Particles react to audio correctly
- [ ] 360 videos have correct VR metadata
- [ ] Worker processes jobs from queue automatically
- [ ] No memory leaks on long renders
- [ ] Checkpoint/resume works on failure

---

## Files to Create/Modify

### New Files:
- `src/lib/render/RenderModeAPI.ts`
- `src/lib/render/PuppeteerRenderer.ts`
- `src/lib/render/renderVideo.ts`
- `src/hooks/useRenderMode.ts`
- `scripts/test-puppeteer.ts`

### Modified Files:
- `src/components/canvas/ParticleLayer.tsx`
- `src/components/canvas/StarNestSkybox.tsx`
- `src/lib/queue/renderWorker.ts`
- `package.json` (add puppeteer)

---

*Plan created: 2026-01-29*
*Ready for execution*
