# Architecture Patterns

**Domain:** Audio-Reactive Video Generation System
**Researched:** 2026-01-26
**Overall Confidence:** HIGH (verified with official documentation and current industry patterns)

## Executive Summary

An audio-reactive video generation system with the constraint "phone to published video without touching a computer" requires a **client-server split architecture** where:

1. **Web UI** handles user interaction and lightweight preview (mobile-friendly)
2. **Server/Local GPU** handles heavy rendering (headless, batch)
3. **Job Queue** persists work across browser sessions
4. **Automation Layer** handles post-processing and publishing

The key insight from the reference code (BreathingOrb.tsx) is that it conflates preview and export in a single React component. The architecture must **separate these concerns** to enable headless rendering at quality levels impossible in real-time WebGL.

---

## Recommended Architecture

```
+------------------+     +------------------+     +------------------+
|   MOBILE WEB UI  |     |   JOB QUEUE +    |     |   RENDER WORKER  |
|                  |     |   PERSISTENCE    |     |                  |
| - Parameter UI   | --> | - IndexedDB      | --> | - Blender/Python |
| - WebGL Preview  |     | - Job Status     |     | - Headless GPU   |
| - Template Mgmt  |     | - Resume Support |     | - 8K / VR Output |
+------------------+     +------------------+     +------------------+
                                |
                                v
+------------------+     +------------------+     +------------------+
|   AUDIO PROCESS  |     |   POST-PROCESS   |     |   AUTOMATION     |
|                  |     |                  |     |                  |
| - Whisper API    | --> | - FFmpeg Encode  | --> | - n8n Workflow   |
| - Beat Detection |     | - VR Metadata    |     | - Google Drive   |
| - Amplitude Map  |     | - Subtitle Burn  |     | - Social Publish |
+------------------+     +------------------+     +------------------+
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **Web UI** | Parameter editing, preview, job creation | Job Queue, WebGL Canvas | Next.js, React, Three.js |
| **WebGL Preview** | Real-time visualization at reduced quality | Web UI (props) | React Three Fiber, WebGL |
| **Job Queue** | Persist jobs, track status, survive browser close | Web UI, Render Worker | IndexedDB + Service Worker |
| **Audio Processor** | Extract features, transcribe, generate timing | Job Queue, Render Worker | Whisper API, Web Audio API |
| **Render Worker** | Headless high-quality frame generation | Job Queue, Post-Processor | Blender/Python, CUDA |
| **Post-Processor** | Encode frames, inject metadata, add subtitles | Render Worker, Automation | FFmpeg, Spatial Media Tools |
| **Automation** | Detect completion, publish to platforms | Post-Processor, Cloud Storage | n8n, Google Drive API |

---

## Data Flow

### Job Creation Flow (User -> Queue)

```
1. User opens Web UI on phone
2. Uploads audio file (stored in IndexedDB as blob)
3. Adjusts parameters via sliders/presets
4. Clicks "Create Video"
5. Job object created:
   {
     id: uuid,
     status: "pending",
     audio: blob_reference,
     preset: { skybox, orb, colors, etc },
     export: { resolution, format, stereo },
     created: timestamp
   }
6. Job persisted to IndexedDB
7. If worker available, job starts immediately
8. If offline/closed, job waits for resume
```

### Render Flow (Queue -> Output)

```
1. Render Worker polls queue for pending jobs
2. Loads job configuration
3. Audio pre-processing:
   - FFmpeg extract audio track
   - Whisper transcription (for subtitles)
   - Beat detection (amplitude map JSON)
4. Frame generation:
   - Blender loads scene template
   - Applies preset parameters
   - Renders frames driven by amplitude map
5. Post-processing:
   - FFmpeg encodes frames to video
   - Inject VR metadata (if equirectangular)
   - Burn subtitles (if transcription enabled)
6. Output stored to configured location
7. Job status updated to "complete"
```

### Publish Flow (Output -> Social)

```
1. n8n watches Google Drive folder for new videos
2. On new file:
   - Read metadata JSON (title, description, tags)
   - Upload to configured platforms:
     - YouTube (with VR metadata)
     - TikTok
     - Instagram
   - Update job status to "published"
3. Notify user via webhook/push notification
```

---

## Component Deep Dives

### 1. Web UI (Mobile-First)

**Purpose:** Let users create jobs from their phone.

**Key Design Decisions:**
- Mobile-first responsive design (280px minimum width)
- WebGL preview runs at reduced particle count and resolution
- All state stored in React + IndexedDB (not just React useState)
- Progressive enhancement: basic UI works without WebGL

**State Management:**
```typescript
// Separate concerns from reference code's monolithic state
interface JobConfig {
  audio: { file: Blob; duration: number; name: string };
  preset: OrbPreset;
  skybox: SkyboxPreset;
  export: ExportSettings;
}

// Persist to IndexedDB, not just React state
const [jobConfig, setJobConfig] = usePersistedState<JobConfig>('currentJob');
```

**Reference Code Issue:** The current `page.tsx` has 1500 lines with all state in `useState`. This needs to be:
1. Split into smaller components
2. State persisted to IndexedDB
3. Preset system externalized to JSON files

### 2. Template/Preset System

**Purpose:** Same preset works in preview AND render.

**Architecture:**
```
/presets
  /orb
    default.json
    ethereal.json
    fire.json
  /skybox
    darkworld1.json    # THE ONE from reference
    starnest-fx.json
    hsv-rainbow.json
  /scene
    breathwork.json    # Full scene combining orb + skybox + water
    meditation.json
```

**Preset Schema Example:**
```json
{
  "$schema": "./preset.schema.json",
  "id": "darkworld1",
  "name": "1DarkWorld1 (THE ONE)",
  "version": "1.0",
  "type": "skybox",
  "parameters": {
    "iterations": 16,
    "volsteps": 15,
    "formuparam": 420.2,
    "stepSize": 312.2,
    "tile": 796.96,
    "brightness": 0.63,
    "darkmatter": 40,
    "distfading": 50,
    "saturation": 62,
    "color": [1, 1, 1],
    "center": [0, 0.3, 0.5, 0],
    "scroll": [0.1, 0.1, -0.3, 0],
    "rotation": [1, 10, 0, 0.5]
  }
}
```

**Key Insight:** Presets are JSON, not TypeScript constants. This enables:
- User-created presets
- Import/export
- Same file used by WebGL preview AND Blender renderer

### 3. Job Queue (IndexedDB + Service Worker)

**Purpose:** Jobs survive browser close.

**Technology:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) + [Background Sync API](https://web.dev/articles/indexeddb-best-practices-app-state)

**Schema:**
```typescript
interface RenderJob {
  id: string;
  status: 'pending' | 'processing' | 'encoding' | 'complete' | 'failed';
  created: number;
  updated: number;

  // Input
  audioBlob: Blob;
  audioName: string;
  audioDuration: number;

  // Configuration
  preset: ScenePreset;
  exportSettings: ExportSettings;

  // Processing state
  progress: number;        // 0-100
  currentStep: string;     // "analyzing", "rendering", "encoding"
  framesCurrent: number;
  framesTotal: number;

  // Output
  outputPath?: string;
  outputUrl?: string;
  error?: string;
}
```

**Resume Logic:**
```typescript
// On app startup
async function resumeJobs() {
  const db = await openDB('render-jobs', 1);
  const pendingJobs = await db.getAll('jobs',
    IDBKeyRange.only('pending')
  );

  for (const job of pendingJobs) {
    // Check if render worker is available
    if (await isWorkerAvailable()) {
      await submitToWorker(job);
    }
  }
}
```

### 4. Audio Processor

**Purpose:** Extract features before render.

**Pipeline:**
```
Input Audio (.mp3/.wav)
    |
    v
[FFmpeg] Extract to WAV (normalized)
    |
    +---> [Whisper] Transcription -> SRT subtitles
    |
    +---> [Web Audio API] Beat Detection -> Amplitude JSON
    |
    v
Analysis Output:
{
  "duration": 180.5,
  "sampleRate": 44100,
  "beats": [0.5, 1.0, 1.5, ...],
  "amplitudes": [
    { "time": 0.0, "amplitude": 0.12, "bass": 0.3, "mid": 0.1, "high": 0.05 },
    ...
  ],
  "transcription": {
    "segments": [
      { "start": 0.5, "end": 2.1, "text": "Welcome to your meditation" }
    ]
  }
}
```

**Key Decision:** Beat detection runs client-side (Web Audio API), but Whisper transcription can run:
- Client-side: [Whisper.cpp via WebAssembly](https://github.com/nickarino/whisperwebassembly) for privacy
- Server-side: OpenAI Whisper API for speed/quality

### 5. Render Worker (Headless Blender)

**Purpose:** High-quality frame generation.

**Technology Options:**

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Blender + Python** | Full control, GPU raytracing | Requires Blender install | Local power users |
| **Cloud GPU (RunPod/Vast.ai)** | Scalable, no local GPU needed | Cost per render | Production scale |
| **WebGL Frame Export** | No external deps | Lower quality, browser limits | Quick exports |

**Recommended: Blender Headless**

Based on [Blenderless](https://github.com/oqton/blenderless) and [blender-cli-rendering](https://github.com/yuki-koyama/blender-cli-rendering):

```bash
# Render command (generated by Web UI)
blender -b scene.blend -P render_script.py -- \
  --analysis analysis.json \
  --preset scene_preset.json \
  --resolution 7680 \
  --fps 60 \
  --output-dir /renders/job_123/frames/
```

**render_script.py responsibilities:**
1. Load preset JSON
2. Configure Cycles renderer
3. Read amplitude map
4. For each frame:
   - Set particle positions based on amplitude
   - Set shader colors based on global hue
   - Render frame to PNG

### 6. Post-Processor (FFmpeg)

**Purpose:** Encode frames + inject metadata.

**Pipeline:**
```bash
# 1. Encode frames to video
ffmpeg -r 60 -i frames/%05d.png \
  -i audio.wav \
  -c:v libx265 -preset slow -crf 18 \
  -c:a aac -b:a 192k \
  output_raw.mp4

# 2. Inject VR metadata (if equirectangular)
python spatial_media_injector.py \
  --inject \
  --stereo=none \
  output_raw.mp4 \
  output_vr.mp4

# 3. Burn subtitles (optional)
ffmpeg -i output_vr.mp4 \
  -vf subtitles=transcription.srt \
  output_final.mp4
```

**VR Metadata:** Uses [Google Spatial Media tools](https://github.com/google/spatial-media) for YouTube/platform compatibility.

### 7. Automation Layer (n8n)

**Purpose:** Phone-to-published without manual steps.

**n8n Workflow:**
```
[Google Drive Watch]
    -> [File Uploaded?]
    -> [Read metadata.json]
    -> [Parallel Upload]
        -> [YouTube API] (with VR tags)
        -> [TikTok API]
        -> [Instagram API]
    -> [Update Job Status]
    -> [Push Notification]
```

**Reference:** [n8n video generation workflow templates](https://n8n.io/workflows/3442-fully-automated-ai-video-generation-and-multi-platform-publishing/)

---

## Patterns to Follow

### Pattern 1: Preset-Driven Configuration

**What:** All visual parameters stored as JSON presets, not hardcoded.

**Why:**
- User can create/save presets
- Same preset works in preview and render
- Easy versioning and sharing

**Example:**
```typescript
// BAD - hardcoded in component (current reference code)
const [intensity, setIntensity] = useState(1.5);
const [turbulence, setTurbulence] = useState(0.4);

// GOOD - preset-driven
const [preset, setPreset] = usePreset<OrbPreset>('orb', 'default');
// preset.intensity, preset.turbulence loaded from JSON
```

### Pattern 2: Queue-First Job Processing

**What:** All render jobs go through persistent queue, never direct execution.

**Why:**
- Jobs survive browser close
- Can resume after crash
- Can transfer to different device/worker

**Example:**
```typescript
// BAD - direct execution
const handleRender = async () => {
  await renderVideo(config); // Lost if browser closes
};

// GOOD - queue first
const handleRender = async () => {
  const job = await jobQueue.create(config);
  // Job persisted immediately
  await jobQueue.process(job.id);
  // Can resume if interrupted
};
```

### Pattern 3: Progressive Enhancement

**What:** UI works without WebGL; 3D preview is enhancement.

**Why:**
- Mobile devices may not support full WebGL
- Faster initial load
- Accessibility

**Example:**
```tsx
// Show static preview image as fallback
<Suspense fallback={<PreviewImage preset={preset} />}>
  <Canvas>
    <BreathingOrb {...preset} />
  </Canvas>
</Suspense>
```

### Pattern 4: Separation of Preview and Export

**What:** Preview component is NOT the export component.

**Why:**
- Preview: real-time, lower quality, React Three Fiber
- Export: offline, higher quality, Blender/headless

**Example:**
```
/components
  /preview
    OrbPreview.tsx      # React Three Fiber, real-time
  /export
    BlenderTemplate.py  # Blender Python, headless
  /shared
    presets/            # JSON presets used by BOTH
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Component State

**What:** All state in a single component's useState hooks.

**Why Bad:**
- Lost on browser refresh
- Can't share between components
- Can't resume jobs

**Current Reference Code Issue:**
```typescript
// page.tsx has 40+ useState calls
const [colorA, setColorA] = useState("#ffdd77");
const [colorB, setColorB] = useState("#ff4400");
const [particleCount, setParticleCount] = useState(25000);
// ... 37 more ...
```

**Instead:**
```typescript
// Use consolidated state with persistence
const [jobConfig, setJobConfig] = usePersistedState('job', defaultConfig);
const [uiState, setUIState] = useState(defaultUIState);
```

### Anti-Pattern 2: Browser-Only Rendering

**What:** Assuming WebGL can produce final output.

**Why Bad:**
- Limited to 4K max (browser/GPU constraints)
- Can't do proper VR stereo
- Performance inconsistent across devices

**Instead:** Use WebGL for preview only, Blender for final render.

### Anti-Pattern 3: Synchronous Audio Processing

**What:** Processing audio on main thread.

**Why Bad:**
- Blocks UI
- Browser may kill long-running tasks
- Can't show progress

**Instead:** Use Web Workers or offload to server.

### Anti-Pattern 4: Hardcoded Shader Parameters

**What:** Shader uniforms embedded in TypeScript.

**Why Bad:** (Current reference code issue)
```typescript
// Can't easily serialize for Blender render
const STAR_NEST_PRESETS: StarNestPreset[] = [
  {
    key: "darkWorld1",
    iterations: 16,
    // ... embedded in code
  }
];
```

**Instead:** External JSON files that both WebGL and Blender read.

---

## Scalability Considerations

| Concern | 10 Users | 1K Users | 10K Users |
|---------|----------|----------|-----------|
| **Preview** | Client-side WebGL | Client-side WebGL | Client-side WebGL |
| **Job Queue** | Local IndexedDB | Shared Redis + IndexedDB | Redis cluster |
| **Render** | Local GPU | Cloud GPU pool | Auto-scaling cloud |
| **Storage** | Local disk | Google Drive | S3 + CDN |
| **Publish** | Single n8n | n8n workers | Queue + Lambda |

**Key Insight:** Start with local-first (IndexedDB + local GPU), design for cloud-scale.

---

## Build Order Implications

Based on dependencies between components:

### Phase 1: Foundation (Must Build First)
1. **Preset System** - Everything else depends on it
2. **Job Queue (IndexedDB)** - Core persistence
3. **State Management Refactor** - Extract from monolithic component

### Phase 2: Processing Pipeline
4. **Audio Processor** - Required before render
5. **Blender Template** - Port shaders from WebGL to Blender
6. **Render Worker Integration** - Connect queue to Blender

### Phase 3: Output Pipeline
7. **FFmpeg Encoding** - Frames to video
8. **VR Metadata Injection** - Platform compatibility
9. **Subtitle Burn** - Optional but valuable

### Phase 4: Automation
10. **n8n Workflow** - Watch folder, publish
11. **Push Notifications** - Job completion alerts
12. **Social API Integration** - Platform-specific formatting

---

## Sources

### Architecture Patterns
- [Web-Queue-Worker Architecture Style (Azure)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/web-queue-worker)
- [RenderingNG Architecture (Chromium)](https://developer.chrome.com/docs/chromium/renderingng-architecture)
- [Build a Hybrid Render Farm (Google Cloud)](https://docs.cloud.google.com/architecture/building-a-hybrid-render-farm)

### Browser Persistence
- [IndexedDB Best Practices (web.dev)](https://web.dev/articles/indexeddb-best-practices-app-state)
- [Hustle - IndexedDB Queue Library](https://github.com/orthecreedence/hustle)
- [Offline-First Frontend Apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)

### Rendering Pipeline
- [Blenderless - Headless Rendering](https://github.com/oqton/blenderless)
- [Blender CLI Rendering](https://github.com/yuki-koyama/blender-cli-rendering)
- [FFmpeg WebAssembly](https://github.com/ffmpegwasm/ffmpeg.wasm)

### VR/360 Video
- [Google Spatial Media Tools](https://github.com/google/spatial-media)
- [Meta Quest Spatial Audio Guide](https://creator.oculus.com/skills-principles/editing-immersive-video-with-spatial-audio/)

### Automation
- [n8n Video Generation Workflows](https://n8n.io/workflows/3442-fully-automated-ai-video-generation-and-multi-platform-publishing/)
- [Whisper Subtitle Generation](https://www.digitalocean.com/community/tutorials/how-to-generate-and-add-subtitles-to-videos-using-python-openai-whisper-and-ffmpeg)

### WebGL/WebGPU
- [WebGL Best Practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Three.js Shader System (DeepWiki)](https://deepwiki.com/mrdoob/three.js/3.2-webgpu-renderer-and-tsl)
