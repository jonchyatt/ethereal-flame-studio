# Vision Model Landscape for Jarvis

**Researched:** 2026-03-01
**Purpose:** Comprehensive analysis of vision models that could give Jarvis the ability to "see" -- analyze images from cameras, screenshots, documents, etc.
**Context:** Jarvis is a Next.js app on Vercel using the Anthropic SDK (Claude Opus 4.6). Phase J already plans native chat vision for pantry recognition.

---

## Table of Contents

1. [Claude Vision (Already Available)](#1-claude-vision-already-available)
2. [Google Gemini Vision](#2-google-gemini-vision)
3. [Hugging Face Vision Models](#3-hugging-face-vision-models)
4. [Specialized Security/Surveillance Vision](#4-specialized-securitysurveillance-vision)
5. [Real-time vs On-demand Vision](#5-real-time-vs-on-demand-vision)
6. [Multi-modal Comparison Matrix](#6-multi-modal-comparison-matrix)
7. [Recommendation for Jarvis](#7-recommendation-for-jarvis)
8. [Sources](#8-sources)

---

## 1. Claude Vision (Already Available)

### Why This Is the Default Choice

Jarvis already uses the Anthropic SDK. Vision is a native capability of all Claude models -- no new SDK, no new API key, no new billing relationship. Images go into the same `messages.create()` call alongside text and tools. This means Claude sees the image AND has access to all Jarvis tools in the same turn -- it can look at a photo of groceries and call `update_pantry` directly.

### Supported Image Formats

| Format | MIME Type |
|--------|-----------|
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| GIF | `image/gif` |
| WebP | `image/webp` |

**Not supported:** HEIC/HEIF (iPhone default), TIFF, BMP, SVG, PDF (for vision -- PDF is supported separately via document processing).

**Practical implication:** iPhone photos default to HEIC. Jarvis will need client-side conversion to JPEG before upload, or use the `<canvas>` API to re-encode.

### Image Size Limits

| Constraint | Limit |
|-----------|-------|
| Max resolution | 8000x8000 px (rejected above this) |
| Max file size (API) | 5 MB per image |
| Max file size (claude.ai) | 10 MB per image |
| Optimal resolution | 1568 px on longest edge |
| Optimal megapixels | 1.15 MP (e.g., 1092x1092) |
| Max images per API request | 100 |
| Max images (>20 in one call) | 2000x2000 px per image |

**Auto-scaling:** Images with a long edge >1568 px are automatically downscaled server-side, preserving aspect ratio. This adds latency without improving quality. Always resize client-side before sending.

### Token Calculation (HIGH confidence -- from official docs)

**Formula:** `tokens = (width * height) / 750`

| Image Size | Tokens | Cost (Haiku 4.5) | Cost (Sonnet 4.6) | Cost (Opus 4.6) |
|-----------|--------|-------------------|--------------------|--------------------|
| 200x200 (thumbnail) | ~54 | $0.000054 | $0.00016 | $0.00027 |
| 640x360 (Ring snapshot) | ~307 | $0.00031 | $0.00092 | $0.0015 |
| 1000x1000 (standard) | ~1,334 | $0.0013 | $0.004 | $0.0067 |
| 1092x1092 (max before scale) | ~1,590 | $0.0016 | $0.0048 | $0.008 |
| 1920x1080 (full HD, auto-scaled) | ~1,590* | $0.0016 | $0.0048 | $0.008 |

*Full HD images are auto-scaled down to ~1568px long edge, resulting in ~1,590 tokens regardless.

**Per-model input token pricing (as of 2026-03-01):**
- Haiku 4.5: $1/MTok
- Sonnet 4.6: $3/MTok
- Opus 4.6: $5/MTok (but $3/MTok was listed in some docs -- verify; the vision docs show $3/MTok for the cost examples)

### Cost Projections for Security Camera Use Cases

| Scenario | Images/day | Model | Daily Cost | Monthly Cost |
|----------|-----------|-------|-----------|-------------|
| Ring doorbell, motion-only (~20/day) | 20 | Haiku 4.5 | $0.006 | $0.19 |
| Ring doorbell, motion-only (~20/day) | 20 | Sonnet 4.6 | $0.018 | $0.55 |
| 4 cameras, every 5 min | 1,152 | Haiku 4.5 | $0.35 | $10.66 |
| 4 cameras, every 5 min | 1,152 | Sonnet 4.6 | $1.06 | $31.97 |
| 4 cameras, motion-triggered (~200/day) | 200 | Haiku 4.5 | $0.06 | $1.90 |
| Continuous 1/min, 1 camera, 24h | 1,440 | Haiku 4.5 | $0.44 | $13.32 |

**Key insight:** At Haiku pricing with motion-triggered snapshots, vision-based security monitoring costs less than a cup of coffee per month. Continuous polling gets expensive fast.

### Strengths for Security Camera Analysis

- **Scene understanding:** Excellent at describing what's happening in a scene ("A person in a dark hoodie is standing near the front door holding a package")
- **Multi-image comparison:** Can compare before/after snapshots ("What changed between these two images?")
- **Natural language queries:** "Is there anyone on my porch?" / "Is the garage door open?" / "How many cars are in the driveway?"
- **Tool integration:** Can see image + call tools in the same turn (e.g., log the event, send an alert)
- **OCR capability:** Can read license plates, package labels, signage
- **Context awareness:** Can understand time-of-day context if told ("This is a nighttime security camera image")

### Limitations for Security Camera Analysis

- **No person identification:** Claude explicitly refuses to identify (name) people in images. This is policy, not capability. It will describe ("a person in a red jacket") but not identify ("that's John").
- **No video processing:** Claude processes still images only. No video clips, no temporal analysis across frames (unless you send multiple frames as separate images).
- **Spatial reasoning weakness:** Struggles with precise positioning, distance estimation, exact object counts in crowds.
- **No real-time streaming:** Must send discrete images via API calls. No persistent connection for continuous video.
- **Latency:** Each API call has network round-trip + inference time. Expect 1-3 seconds per image analysis (Haiku) to 3-8 seconds (Opus).
- **Hallucination risk:** May describe objects/people that aren't actually present in low-quality or ambiguous images. Night-vision IR images are particularly challenging.
- **No motion detection:** Cannot detect motion -- that must be done camera-side or with a separate system.

### Code Example: Analyzing a Security Camera Snapshot

This uses the exact same Anthropic SDK pattern Jarvis already uses:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Option 1: Base64-encoded image (from camera API or file)
async function analyzeSecurityFrame(
  imageBase64: string,
  cameraName: string,
  prompt?: string
) {
  const defaultPrompt = `You are analyzing a security camera frame from "${cameraName}".
Describe what you see concisely:
1. People: count, approximate description, what they're doing
2. Vehicles: count, type, color, license plate if readable
3. Packages/deliveries: any visible?
4. Anomalies: anything unusual or concerning?
5. Environment: lighting conditions, weather visible?

If nothing notable, just say "Clear - no activity detected."`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5", // Cheapest for routine monitoring
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt || defaultPrompt,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "No analysis available";
}

// Option 2: URL-based image (if camera provides a public/signed URL)
async function analyzeFromUrl(imageUrl: string, cameraName: string) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: `Security camera "${cameraName}": Describe any people, vehicles, packages, or unusual activity. If clear, say "No activity."`,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "No analysis available";
}

// Option 3: With tool use (Jarvis pattern -- see + act in one turn)
async function analyzeAndAct(imageBase64: string) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    tools: [
      {
        name: "log_security_event",
        description: "Log a security event detected from camera footage",
        input_schema: {
          type: "object" as const,
          properties: {
            camera: { type: "string" },
            event_type: {
              type: "string",
              enum: ["person_detected", "vehicle_detected", "package_delivered", "anomaly", "clear"],
            },
            description: { type: "string" },
            severity: {
              type: "string",
              enum: ["info", "warning", "alert"],
            },
          },
          required: ["camera", "event_type", "description", "severity"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Analyze this front door camera image. If you detect any activity, log it as a security event.",
          },
        ],
      },
    ],
  });

  return response;
}
```

### Image Preprocessing for Cost Optimization

```typescript
// Client-side image compression before sending to Claude
// Borrowed from Reset Biology pattern (GPT-4o-mini vision, ~$0.00001/image)
async function compressForVision(file: File | Blob): Promise<string> {
  const MAX_DIMENSION = 1024; // Stay well under 1568 auto-scale threshold
  const JPEG_QUALITY = 0.7; // Good enough for scene understanding

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: JPEG_QUALITY,
  });

  const buffer = await blob.arrayBuffer();
  return btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
}

// Token estimate for compressed image
function estimateTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}
// At 1024x576 (16:9 compressed): ~787 tokens = ~$0.0008/image with Haiku
```

### Claude Video API (LOW confidence -- unverified)

There are reports of an Anthropic real-time video API with capabilities including:
- Under 500ms latency per frame
- H.264 and VP9 codec support
- Up to 4K resolution
- $0.06/minute for analysis

**Status:** This appears to be speculative/future content from a single source dated February 2026. The official Claude docs (platform.claude.com) only document still image vision as of March 2026. **Do not plan around this capability.** Treat Claude as image-only until officially confirmed.

---

## 2. Google Gemini Vision

### Why Consider Gemini

Gemini's killer feature is **native video understanding**. While Claude can only process still images, Gemini can accept entire video files and reason about temporal events -- "What happened in this clip?" / "At what timestamp does the person enter?" This is potentially transformative for security camera analysis.

### Current Models (as of 2026-03-01)

| Model | Input Price (per MTok) | Output Price (per MTok) | Context Window | Best For |
|-------|----------------------|------------------------|----------------|----------|
| Gemini 3.1 Pro Preview | $2.00 (<=200K), $4.00 (>200K) | $12.00 / $18.00 | 1M tokens | Latest, highest quality |
| Gemini 2.5 Pro | $1.25 (<=200K), $2.50 (>200K) | $10.00 / $15.00 | 1M tokens | Balanced performance |
| Gemini 2.5 Flash | $0.30 | $2.50 | 1M tokens | High volume, low cost |

### Video Understanding Capabilities (HIGH confidence -- from official docs)

**Token costs for video:**
- Default resolution: ~300 tokens/second (~258 tokens per frame + 32 tokens/sec audio)
- Low resolution: ~100 tokens/second (~66 tokens per frame + 32 tokens/sec audio)
- Sampling rate: 1 frame per second (configurable via `fps` parameter in `videoMetadata`)

**Supported video formats:** MP4, MPEG, MOV, AVI, FLV, MPG, WebM, WMV, 3GPP

**Maximum video length:**
- Default resolution: Up to 1 hour (with 1M context window)
- Low resolution: Up to 3 hours

**File upload methods:**
1. File API (recommended for >100MB or >10 min) -- up to 20GB paid, 2GB free
2. Cloud Storage registration -- 2GB per file
3. Inline data -- <100MB, suitable for short clips
4. YouTube URLs -- public videos only

### Cost Projections for Video Analysis

| Scenario | Duration | Resolution | Tokens | Cost (2.5 Flash) | Cost (2.5 Pro) |
|----------|----------|-----------|--------|-------------------|----------------|
| 10-second clip | 10s | Default | ~3,000 | $0.0009 | $0.00375 |
| 30-second clip | 30s | Default | ~9,000 | $0.0027 | $0.01125 |
| 1-minute clip | 60s | Default | ~18,000 | $0.0054 | $0.0225 |
| 5-minute clip | 300s | Default | ~90,000 | $0.027 | $0.1125 |
| 1-minute clip | 60s | Low res | ~6,000 | $0.0018 | $0.0075 |

**Critical comparison:** For a single frame analysis, Gemini 2.5 Flash at ~258 tokens is comparable to Claude Haiku at ~307 tokens (for a 640x360 Ring snapshot). But Gemini's ability to process video clips -- temporal reasoning about motion, arrivals, departures -- is something Claude simply cannot do.

### Node.js SDK

The current official SDK is `@google/genai` (v1.43.0, actively maintained). The older `@google/generative-ai` package is deprecated and does not receive Gemini 2.0+ features.

```bash
npm install @google/genai
```

### Code Example: Analyzing a Video Clip

```typescript
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Option 1: Short clip as inline base64
async function analyzeVideoClip(videoPath: string) {
  const videoData = fs.readFileSync(videoPath, { encoding: "base64" });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: "video/mp4",
          data: videoData,
        },
      },
      {
        text: `Analyze this security camera footage:
1. List all people visible, with timestamps of when they appear/leave
2. Note any vehicles, their types and colors
3. Describe any deliveries or package drops
4. Flag anything unusual or suspicious
5. Provide a one-line summary`,
      },
    ],
  });

  return response.text;
}

// Option 2: Upload via File API (for longer videos)
async function analyzeWithFileAPI(videoPath: string) {
  // Upload the file first
  const uploadResult = await ai.files.upload({
    file: fs.createReadStream(videoPath),
    config: {
      mimeType: "video/mp4",
    },
  });

  // Wait for processing
  let file = uploadResult;
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name! });
  }

  // Analyze
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        fileData: {
          fileUri: file.uri!,
          mimeType: "video/mp4",
        },
      },
      {
        text: "Summarize all activity in this security footage chronologically.",
      },
    ],
  });

  return response.text;
}

// Option 3: Single frame analysis (comparable to Claude)
async function analyzeSingleFrame(imageBase64: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
      {
        text: "What do you see in this security camera image? Focus on people, vehicles, and anything unusual.",
      },
    ],
  });

  return response.text;
}
```

### Free Tier (HIGH confidence)

Gemini 2.5 Flash free tier:
- 10 requests per minute (RPM)
- 500 requests per day (RPD)
- Includes vision/video processing
- **Caveat:** Google reduced free limits 50-80% in December 2025

This is enough for prototyping and light usage, but not for continuous security monitoring.

### Gemini's Unique Strengths for Security

1. **Temporal reasoning:** "At 0:23, a person walks up the driveway. At 0:31, they ring the doorbell. At 0:45, they leave a package and walk away." Claude cannot do this.
2. **Video clip analysis:** Send a 30-second motion-triggered clip instead of individual frames. Richer context for fewer API calls.
3. **Lower cost for bulk analysis:** Flash at $0.30/MTok is cheaper than Haiku at $1/MTok.
4. **Audio analysis:** If cameras have microphones, Gemini can process audio + video together.
5. **Extremely long context:** Can analyze up to 1 hour of video in a single request.

### Gemini's Weaknesses

1. **No tool use in same call:** Unlike Claude, Gemini does not have the same tight tool-use integration. You'd analyze with Gemini, then act with Claude (two API calls).
2. **Different SDK:** Requires `@google/genai`, a second API key, and separate billing.
3. **No system prompt equivalent:** Gemini's instruction mechanism is different from Claude's system prompt pattern.
4. **Privacy:** Google processes video on their servers. For security camera footage of your home, this may be a concern.
5. **Rate limits on free tier:** Only 10 RPM on Flash free tier.

---

## 3. Hugging Face Vision Models

### Overview

Hugging Face hosts thousands of open-source vision models ranging from lightweight classifiers to full multimodal language models. These can be used via the Inference API (pay-per-request), Inference Endpoints (dedicated GPU), or self-hosted.

### Key Models Relevant to Security Camera Analysis

#### YOLO Family (Object Detection)

| Model | Release | Best For | Speed (GPU) | Accuracy (mAP) | Self-hostable |
|-------|---------|----------|-------------|-----------------|---------------|
| YOLO26 | Jan 2026 | Edge/CPU detection | 43% faster CPU than YOLOv8 | State of the art | Yes |
| YOLOv12 | 2025 | GPU detection | 1.64ms (T4) | 40.6% mAP | Yes |
| YOLOv11 | 2024 | General purpose | ~2ms (T4) | ~39% mAP | Yes |
| YOLOv8 | 2023 | Proven, well-documented | ~3ms (T4) | ~37% mAP | Yes |

**YOLO26** (latest Ultralytics release):
- NMS-free inference (no post-processing needed)
- Supports: object detection, segmentation, pose estimation, oriented object detection, classification
- Export formats: TensorRT, ONNX, CoreML, TFLite, OpenVINO
- 5 model sizes (nano to extra-large)
- Python/CLI interface via `ultralytics` package
- **Key advantage:** Runs on CPU at real-time speeds. No GPU required for basic detection.

**Use for Jarvis:** YOLO would serve as a fast, cheap pre-filter. Run locally to detect "person present" before sending the frame to Claude/Gemini for rich analysis. This dramatically reduces API costs.

#### CLIP (Zero-Shot Classification)

- Created by OpenAI, open-source on Hugging Face
- Classifies images using natural language descriptions WITHOUT training
- Can answer "Is this image more like 'a person at a front door' or 'an empty porch'?"
- Very fast inference (~10ms on GPU)
- **Security use case:** Define alert categories as text descriptions. CLIP scores how well each frame matches each description. High-scoring frames get forwarded to Claude for detailed analysis.

#### Florence-2 (Microsoft -- Unified Vision Model)

- Multi-task: captioning, detection, segmentation, grounding in ONE model
- Compact (0.77B parameters for large variant) -- runs on consumer GPUs
- Zero-shot detection capability
- Text-grounded detection: tell it what to look for ("person with package")
- Outperforms models many times larger on COCO benchmarks
- MIT licensed -- fully open source

#### LLaVA (Large Language and Vision Assistant)

- Full multimodal model -- can describe scenes like Claude/Gemini
- Self-hostable with as little as 8GB VRAM (4-bit quantized, 7B model)
- LLaVA-OneVision-1.5 (2025-2026) processes native-resolution images
- Can run via Ollama locally: `ollama run llava`
- **Trade-off:** Much less capable than Claude/Gemini for nuanced reasoning, but free to run after hardware costs.

### Hugging Face Pricing

#### Inference Providers (Pay-per-request)

HF passes through provider costs with no markup. For vision models specifically:
- Most vision tasks use serverless endpoints
- Pricing varies by provider and model
- Every HF user gets monthly free credits for experimentation

#### Inference Endpoints (Dedicated GPU)

| GPU | Price/hour | Good For |
|-----|-----------|----------|
| NVIDIA T4 (small) | ~$0.40-0.60 | YOLO, CLIP, Florence-2 |
| NVIDIA A10G | ~$1.50 | LLaVA, larger models |
| NVIDIA A100 | ~$4.00+ | Production-scale multi-model |
| 8x NVIDIA H200 | ~$40.00 | Overkill for this use case |

Billed per minute, not per hour. Auto-scaling available.

**Cost comparison for 1000 security frames/day:**

| Approach | Cost/day | Cost/month | Notes |
|----------|---------|-----------|-------|
| Claude Haiku (direct) | $0.31 | $9.30 | Simple, no infra |
| Gemini Flash (direct) | $0.09 | $2.70 | Cheapest cloud API |
| YOLO on T4 endpoint (24h) | $14.40 | $432 | Way too expensive for this scale |
| YOLO local (own hardware) | $0 (electricity) | ~$5-10 | Requires always-on machine |
| Hybrid: YOLO filter + Haiku | ~$0.05 | ~$1.50 | YOLO filters 80% of frames |

**Bottom line:** Self-hosting makes sense only if you already have an always-on machine (NAS, home server, Raspberry Pi with Coral accelerator). Otherwise, Claude Haiku or Gemini Flash are cheaper than running a dedicated HF Inference Endpoint.

---

## 4. Specialized Security/Surveillance Vision

### Frigate NVR (HIGH confidence -- actively maintained, 15K+ GitHub stars)

**What it is:** An open-source Network Video Recorder with real-time AI object detection. Built for home security cameras.

**Key capabilities:**
- Real-time object detection at 100+ FPS (with Google Coral accelerator)
- Person, vehicle, animal, package detection out of the box
- Motion-first pipeline: only sends frames to AI when pixel changes detected (huge cost savings)
- Snapshot + short video clip capture on detection events
- REST API for querying events, snapshots, clips
- MQTT event publishing (Home Assistant, NodeRed compatible)
- Supports RTSP cameras (Ring via ring-mqtt bridge, Reolink, Hikvision, etc.)

**Architecture pattern for Jarvis:**
```
Camera (RTSP) --> Frigate (local, motion + YOLO detection)
                     |
                     |--> MQTT event: "person detected on front_door"
                     |--> Snapshot saved (JPEG)
                     |--> 10-second clip saved (MP4)
                     |
                     v
              Jarvis webhook receives event
                     |
                     |--> Claude Haiku analyzes snapshot
                     |    "Person with delivery uniform, carrying box"
                     |
                     |--> Gemini Flash analyzes clip (optional)
                     |    "Person arrived at 0:02, rang bell at 0:05, left package at 0:08"
                     |
                     v
              Jarvis logs event + notifies Jonathan
```

**Hardware requirements:**
- Minimum: Any x86 machine with 2GB RAM
- Recommended: x86 + Google Coral USB accelerator ($25-60)
- Alternative: NVIDIA GPU (Jetson Nano, any desktop GPU)

**Google Coral Accelerator:**
- USB TPU that plugs into any machine
- Runs YOLO/TensorFlow Lite models at 100+ FPS
- ~$25-60 on Amazon
- 2W power draw
- **This is the recommended approach for local object detection pre-filtering**

### Ring Camera Integration (MEDIUM confidence)

**Official API:** Ring has a developer program at developer.amazon.com/ring, but the official API is limited and primarily for Ring partners.

**Unofficial but proven:**
- `ring-client-api` (npm package by dgreif) -- TypeScript package for Ring devices
- `ring-mqtt` (by tsightler) -- bridges Ring to MQTT (works with Frigate/Home Assistant)
- Home Assistant Ring integration -- mature, well-maintained

**Snapshot access:**
- `camera.getSnapshot()` returns `Promise<Buffer>` (JPEG, 640x360)
- Can force new snapshots on demand
- Snapshots stored in Ring cloud for 14 days (with subscription)
- Resolution: 640x360 -- already small enough for efficient Claude analysis (~307 tokens)

**Motion events:**
- Ring pushes motion alerts that can be captured via the unofficial APIs
- Each motion event can trigger a snapshot capture
- Video clips (30-60 seconds) available for download

### Person/Object Detection Models (Specialized for Surveillance)

| Capability | Best Model | Type | Notes |
|-----------|-----------|------|-------|
| Person detection | YOLO26 | Detection | COCO-trained, out of the box |
| Vehicle detection | YOLO26 | Detection | Cars, trucks, buses, motorcycles |
| Package detection | YOLO26 fine-tuned | Detection | Needs custom training or Florence-2 zero-shot |
| Activity recognition | Claude/Gemini | VLM | "Person is bending down to pick something up" |
| Anomaly detection | CLIP + threshold | Classification | Score deviation from "normal" scene |
| License plate reading | Claude/Gemini or PaddleOCR | OCR | Claude handles this well with clear images |

### Face Recognition (IMPORTANT: Ethics and Privacy)

**Claude's policy:** Explicitly refuses to identify (name) people. Will describe physical characteristics but not match to identities.

**Technical options that exist:**
- InsightFace/ArcFace (open-source, very accurate)
- face-recognition Python library (dlib-based)
- Amazon Rekognition, Google Vision API (cloud services)

**Recommendation: DO NOT implement face recognition.** The privacy implications are severe, especially for a home security system. Stick to person detection (someone is there) not person identification (that's John). If you must distinguish household members from strangers, consider:
- Authorized device detection (phone WiFi/Bluetooth presence)
- Clothing/posture familiarity (Claude can learn "usually wears a blue jacket")
- Time-of-day patterns ("Jonathan typically arrives between 7-8 PM")

---

## 5. Real-time vs On-demand Vision

### Processing Modes

| Mode | How It Works | Latency | Cost | Best For |
|------|-------------|---------|------|----------|
| **Continuous polling** | Capture frame every N seconds, analyze all | Fixed interval | Highest (all frames analyzed) | 24/7 monitoring, not recommended for API-based |
| **Motion-triggered** | Camera/Frigate detects motion, sends frame | Seconds after event | Low (only active frames) | Home security, doorbell events |
| **On-demand** | User asks "Show me the front door" | User-initiated | Lowest | Ad-hoc queries via Jarvis chat |
| **Event-driven** | External trigger (doorbell press, alarm) | Sub-second to event | Very low | Specific alerts only |
| **Batch review** | Analyze accumulated clips periodically | Minutes/hours delay | Medium, can use batch API | Daily security summaries |

### Recommended Architecture for Jarvis

```
                          TIER 1: Local/Edge (Free)
                    +----------------------------------+
                    |  Frigate NVR + Google Coral       |
                    |  - Motion detection               |
                    |  - Person/vehicle/animal classify  |
                    |  - Snapshot + clip capture         |
                    |  - MQTT event broadcast            |
                    +----------------+-----------------+
                                     |
                          Events with snapshots
                                     |
                          TIER 2: Cloud Analysis (Cheap)
                    +----------------v-----------------+
                    |  Jarvis API endpoint               |
                    |  receives webhook/MQTT event       |
                    |                                    |
                    |  Claude Haiku 4.5 analyzes frame   |
                    |  ~$0.0008/image, ~2s latency       |
                    |                                    |
                    |  IF notable activity detected:     |
                    |    - Log to Notion/memory          |
                    |    - Send push notification        |
                    |    - Optionally escalate to Tier 3 |
                    +----------------+-----------------+
                                     |
                          Only if needed (~5% of events)
                                     |
                          TIER 3: Deep Analysis (Occasional)
                    +----------------v-----------------+
                    |  Gemini 2.5 Flash analyzes clip    |
                    |  ~$0.005 per 30-second clip        |
                    |  Temporal reasoning, full timeline |
                    |                                    |
                    |  OR Claude Sonnet for complex      |
                    |  reasoning about the situation     |
                    +----------------------------------+
```

### Frame Extraction Strategies

| Strategy | Frame Rate | Use Case | Monthly Cost (Haiku, 1 camera) |
|----------|-----------|----------|-------------------------------|
| Every frame (30fps) | 30/sec | Never do this with API | $33,264 |
| Every second | 1/sec | Continuous monitoring (expensive) | $1,109 |
| Every 5 seconds | 0.2/sec | Near-real-time (still expensive) | $222 |
| Every minute | 1/min | Periodic check-in | $13.32 |
| Motion-triggered only | Variable | **Recommended** | $0.19-5.70 |
| On-demand only | User-initiated | Cheapest | ~$0 |

**Key insight:** Motion-triggered is the only sane approach for API-based vision. Continuous frame analysis should only happen locally (Frigate + Coral). The cloud API should receive pre-filtered, interesting frames only.

### Latency by Approach

| Approach | Cold Start | Per-Frame Latency | Total Event-to-Alert |
|----------|-----------|-------------------|---------------------|
| Claude Haiku (API) | 0ms (always warm) | 1-3 seconds | 2-5 seconds |
| Claude Sonnet (API) | 0ms | 2-5 seconds | 3-7 seconds |
| Gemini Flash (API) | 0ms | 1-3 seconds | 2-5 seconds |
| YOLO local (Coral) | 0ms | 10-20ms | <100ms |
| YOLO local (CPU) | 0ms | 50-200ms | <500ms |
| LLaVA local | 2-5s (model load) | 1-3 seconds | 3-8 seconds |
| Frigate (full pipeline) | 0ms | <100ms detection | <500ms |

---

## 6. Multi-modal Comparison Matrix

### Quick Comparison

| Model | Cost/Image | Video Support | Latency | Self-Hostable | Best For |
|-------|-----------|---------------|---------|---------------|----------|
| **Claude Haiku 4.5** | ~$0.0003 (200x200) to ~$0.0016 (1092x1092) | No (images only) | 1-3s | No | Routine frame analysis, tool integration |
| **Claude Sonnet 4.6** | ~$0.001 to ~$0.005 | No | 2-5s | No | Complex scene understanding |
| **Claude Opus 4.6** | ~$0.002 to ~$0.008 | No | 3-8s | No | Nuanced reasoning (overkill for vision) |
| **Gemini 2.5 Flash** | ~$0.0001 (text) | **Yes** (native) | 1-3s | No | Video clips, bulk analysis, cheapest cloud |
| **Gemini 2.5 Pro** | ~$0.0004 | **Yes** (native) | 2-5s | No | Complex video understanding |
| **YOLO26** | Free (local) | Frame-by-frame | 10-200ms | **Yes** | Real-time detection, pre-filtering |
| **Florence-2** | Free (local) | No | 50-200ms | **Yes** | Zero-shot detection, captioning |
| **CLIP** | Free (local) | No | 10-50ms | **Yes** | Zero-shot classification, anomaly scoring |
| **LLaVA** | Free (local) | No | 1-3s | **Yes** | Self-hosted scene description |
| **Frigate NVR** | Free (local) | **Yes** (RTSP) | <100ms | **Yes** | Full NVR pipeline, always-on monitoring |

### Detailed Feature Comparison

| Feature | Claude | Gemini | YOLO | Florence-2 | CLIP | LLaVA |
|---------|--------|--------|------|-----------|------|-------|
| Scene description | Excellent | Excellent | None | Good | None | Good |
| Object detection | Good (describes) | Good | Excellent (bboxes) | Excellent | Poor | Moderate |
| Person detection | Good | Good | Excellent | Excellent | Good | Good |
| Vehicle detection | Good | Good | Excellent | Good | Good | Good |
| Activity recognition | Excellent | Excellent | None | Limited | None | Moderate |
| OCR / text reading | Excellent | Good | None | Good | None | Moderate |
| Anomaly detection | Good (prompted) | Good | None | Limited | Good (scored) | Moderate |
| Temporal reasoning | None | **Excellent** | None | None | None | None |
| Tool integration | **Native** | Separate call | N/A | N/A | N/A | N/A |
| Runs on Vercel | API call | API call | No | No | No | No |
| Edge/mobile deploy | No | No | **Yes** | **Yes** | Yes | Partial |

### Architecture Fit for Jarvis

| Requirement | Best Solution | Why |
|-------------|---------------|-----|
| "What's on my porch?" (on-demand) | Claude Haiku | Already integrated, tool-aware, cheapest per-query |
| Pantry photo recognition (Phase J) | Claude Haiku/Sonnet | Native tool integration, sees image + calls update_pantry |
| Motion-triggered alerts | Frigate + Claude Haiku | Frigate detects motion locally, Claude describes the scene |
| "What happened in the last hour?" | Gemini Flash (video clip) | Temporal reasoning across footage |
| Real-time person detection | Frigate + Coral | <100ms, free, local |
| Daily security summary | Claude Sonnet (batch) | Analyze day's events, 50% batch discount |
| Document/receipt scanning | Claude Haiku | Excellent OCR, tool integration |
| License plate reading | Claude Sonnet | Higher accuracy for detail extraction |

---

## 7. Recommendation for Jarvis

### Phase 1: Claude Vision (Immediate -- Phase J)

Already planned for Phase J pantry recognition. Extend the same pattern to any image:
- Use Haiku 4.5 as default ($1/MTok input -- cheapest)
- Toggle to Sonnet 4.6 for better recognition ($3/MTok)
- Compress images client-side to ~1024px max dimension
- Estimated cost: <$1/month for typical usage

**What to build:**
- Generic vision message handler in chat route (already planned)
- Image compression utility (client-side, before upload)
- Model tier switch in settings (Haiku <-> Sonnet)

### Phase 2: Security Camera Integration (Future Milestone)

**Minimum viable security vision:**
1. Ring API integration via `ring-client-api` npm package
2. Motion event webhook --> Jarvis API endpoint
3. Snapshot capture on motion --> Claude Haiku analysis
4. Notable events logged to Notion + push notification
5. "What's happening on [camera]?" chat command

**Estimated monthly cost:** $0.20-2.00 (motion-triggered, Haiku)

### Phase 3: Video Understanding with Gemini (Future Milestone)

**When to add Gemini:** When the use case requires temporal reasoning -- "What happened in this clip?" rather than "What's in this frame?"

**Integration pattern:**
```
npm install @google/genai
```
- Add GEMINI_API_KEY to environment
- Create a `vision/gemini.ts` service alongside existing Anthropic integration
- Use Gemini Flash for video clips, Claude Haiku for single frames
- Route based on input type: image -> Claude, video -> Gemini

### Phase 4: Local Edge Detection (Future, Requires Hardware)

**When to add Frigate/YOLO:** When continuous monitoring is needed and API costs become a concern.

**Prerequisites:**
- Always-on machine (NAS, Raspberry Pi, old laptop)
- Google Coral USB accelerator ($25-60)
- RTSP-compatible cameras or Ring-MQTT bridge
- Network accessible from Vercel (webhook or polling)

**This is NOT needed for Phase J.** It's a hardware investment that makes sense only when Jarvis grows into a proper home automation hub.

### What NOT To Do

1. **Don't self-host LLaVA/Florence-2 on Vercel.** These models require GPU inference and are incompatible with serverless. Use them only if you have dedicated hardware.
2. **Don't implement face recognition.** Privacy nightmare, ethical concerns, and Claude refuses to do it anyway.
3. **Don't poll cameras continuously via API.** Motion-triggered is the only cost-effective approach.
4. **Don't add Gemini SDK for Phase J.** Claude vision handles pantry recognition perfectly. Add Gemini only when video understanding is actually needed.
5. **Don't build a custom object detection pipeline.** Frigate already solves this problem with a mature, battle-tested codebase.

---

## 8. Sources

### Official Documentation (HIGH confidence)
- [Claude Vision API docs](https://platform.claude.com/docs/en/build-with-claude/vision) -- image formats, limits, code examples, token calculation
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- full model pricing table
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) -- vision, video, and free tier details
- [Gemini Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding) -- video formats, token costs, code examples
- [Gemini Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) -- free and paid tier limits
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models) -- model catalog and capabilities
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) -- official Node.js SDK (v1.43.0)
- [Ultralytics YOLO26 Docs](https://docs.ultralytics.com/models/yolo26/) -- architecture, benchmarks, deployment
- [Frigate NVR Docs](https://docs.frigate.video/) -- installation, configuration, API reference
- [Frigate GitHub](https://github.com/blakeblackshear/frigate) -- 15K+ stars, actively maintained
- [ring-client-api npm](https://www.npmjs.com/package/ring-client-api) -- unofficial Ring TypeScript API
- [Microsoft Florence-2 (HuggingFace)](https://huggingface.co/microsoft/Florence-2-large) -- model card, capabilities
- [LLaVA Project](https://llava-vl.github.io/) -- model family overview
- [Hugging Face Inference Endpoints Pricing](https://huggingface.co/docs/inference-endpoints/en/pricing) -- GPU hourly rates
- [CLIP by OpenAI](https://openai.com/index/clip/) -- zero-shot classification overview

### Community/Third-party (MEDIUM confidence)
- [YOLO26 Roboflow Overview](https://blog.roboflow.com/yolo26/) -- benchmarks and comparisons
- [Gemini Pricing Guide (devtk.ai)](https://devtk.ai/en/blog/gemini-api-pricing-guide-2026/) -- 2026 pricing breakdown
- [Ring MQTT (tsightler)](https://github.com/tsightler/ring-mqtt) -- Ring-to-MQTT bridge for Home Assistant/Frigate

### Unverified/Speculative (LOW confidence -- DO NOT plan around)
- [Claude Real-Time Video API report](https://aidailyshot.com/blog/anthropic-claude-video-api-features-2026) -- appears speculative, not confirmed in official docs as of March 2026

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Claude Vision capabilities & pricing | HIGH | Verified against official platform.claude.com docs |
| Claude Vision code patterns | HIGH | Uses existing Anthropic SDK already in Jarvis |
| Gemini video understanding | HIGH | Official docs at ai.google.dev confirm capabilities and pricing |
| Gemini pricing | HIGH | Official pricing page verified |
| YOLO/Florence-2/CLIP capabilities | MEDIUM | Well-documented open source, but not verified via Context7 |
| Frigate NVR integration | MEDIUM | Mature project (15K+ stars), but not tested with Jarvis |
| Ring API access | MEDIUM | Unofficial npm package, could break with Ring API changes |
| Claude real-time video API | LOW | Single unverified source, not in official docs |
| Hugging Face per-request pricing | MEDIUM | Pricing model confirmed but exact vision costs vary by provider |
| Self-hosting cost estimates | MEDIUM | Hardware costs accurate but electricity/maintenance estimated |
