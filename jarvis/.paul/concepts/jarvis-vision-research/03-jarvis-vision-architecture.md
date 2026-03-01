# Jarvis Vision Layer Architecture

**Author:** Research Agent
**Date:** 2026-03-01
**Status:** Research Document (not yet in execution)
**Confidence:** HIGH on Claude vision API, MEDIUM on Ring integration, HIGH on Vercel constraints

---

## Table of Contents

1. [Architecture: Vision as a Capability Layer](#1-architecture-vision-as-a-capability-layer)
2. [Vision Source Abstraction](#2-vision-source-abstraction)
3. [Vercel Constraints & Solutions](#3-vercel-constraints--solutions)
4. [Integration with Existing Jarvis Systems](#4-integration-with-existing-jarvis-systems)
5. [Security & Privacy](#5-security--privacy)
6. [Phased Implementation Roadmap](#6-phased-implementation-roadmap)
7. [Appendix: Code Examples](#7-appendix-code-examples)
8. [Sources & Confidence](#8-sources--confidence)

---

## 1. Architecture: Vision as a Capability Layer

### Where Vision Fits in Jarvis

Jarvis has four architectural layers today. Vision becomes the fifth:

```
+================================================================+
|                        JARVIS OS                                |
|================================================================|
|                                                                 |
|  BRAIN (Claude Opus/Haiku/Sonnet via Anthropic SDK)            |
|    - Chat processing with tool loop                             |
|    - Multi-model routing (simple vs complex)                    |
|    - System prompt with personality + context                   |
|                                                                 |
|  MEMORY (SQLite + OpenAI embeddings via Turso/libsql)          |
|    - Vector memory with dual retrieval (BM25 + semantic)        |
|    - Memory consolidation + decay                               |
|    - Session history + summarization                            |
|                                                                 |
|  SENSES (Notion SDK + Google Calendar API)                     |
|    - Tasks, bills, habits, goals, journal, health               |
|    - Calendar events + meal planning                            |
|    - Briefing aggregation pipeline                              |
|                                                                 |
|  SELF-IMPROVEMENT (Haiku critic -> Opus reflection -> meta)    |
|    - Conversation evaluation                                    |
|    - Behavior rule evolution                                    |
|    - Meta-evaluation for rule quality                           |
|                                                                 |
|  VISION (NEW) <------ THIS DOCUMENT                            |
|    - Image capture from multiple sources                        |
|    - Claude native vision analysis (image + tools in same turn) |
|    - Event detection + notification                             |
|    - Vision memory (notable events stored)                      |
|                                                                 |
+================================================================+
```

### Design Principle: Vision is a Sense, Not a Brain

Vision should be treated as another **sense** -- a way for Jarvis to perceive the world. The Brain already knows how to analyze images natively through Claude's vision API. Vision sources are input adapters that feed the existing Brain.

This means:
- Vision does NOT need its own AI pipeline
- Vision sources capture images and feed them to the existing `processChatMessage` flow
- Claude's native multimodal capability handles analysis (image + tools in same API call)
- The Brain decides what to do: call `update_pantry`, store a memory, send an alert

### Data Flow

```
                    VISION SOURCES
                    =============
  Ring Camera    Phone Upload    Screenshot    File Upload
       |              |              |              |
       v              v              v              v
  +----------------------------------------------------------+
  |               VisionSource Adapter                        |
  |  Normalizes all sources to: ImageCapture { buffer,       |
  |  metadata, sourceId, timestamp, trigger }                 |
  +----------------------------------------------------------+
                          |
                          v
  +----------------------------------------------------------+
  |              Vision Service                               |
  |  1. Resize/compress image (< 1568px long edge)           |
  |  2. Convert to base64                                     |
  |  3. Store snapshot in Vercel Blob (optional)              |
  |  4. Build Claude message with image + context prompt      |
  +----------------------------------------------------------+
                          |
                          v
  +----------------------------------------------------------+
  |              Brain (sdkBrain.ts)                          |
  |  Claude receives image as content block:                  |
  |  { type: "image", source: { type: "base64", ... } }     |
  |  + text prompt: "Analyze this [source] image..."         |
  |  + has access to ALL existing tools                       |
  |  = Can call update_pantry, remember_fact, etc.            |
  +----------------------------------------------------------+
                          |
                    +-----+-----+
                    |           |
                    v           v
              Tool Actions   Memory Storage
              (update_pantry,  (remember_fact:
               create_task)    "Delivery at
                               3:15 PM")
```

### Key Architectural Decision: Native Chat Vision

**Decision:** Use Claude's native multimodal API (image content blocks in messages) rather than a separate vision endpoint.

**Why:**
- Claude sees the image AND has access to all tools in the same turn
- No separate "vision API" to build or maintain
- A pantry photo goes through the same `processChatMessage` pipeline as text
- The Brain can decide to call `update_pantry` directly after seeing the groceries
- Already decided in PROJECT.md: "Native chat vision over separate endpoint"

**How it works in the existing codebase:**

The `sdkBrain.ts` `think()` function accepts `Anthropic.MessageParam[]` as messages. Claude's Messages API natively supports image content blocks. The only change needed is to allow the chat route to accept image data alongside text.

---

## 2. Vision Source Abstraction

### Core Types

```typescript
// src/lib/jarvis/vision/types.ts

/**
 * What triggered the image capture
 */
export type VisionTrigger =
  | 'motion'           // Camera detected motion
  | 'doorbell'         // Doorbell pressed
  | 'manual_snapshot'  // User requested a snapshot
  | 'user_upload'      // User uploaded a photo in chat
  | 'screenshot'       // User shared a screenshot
  | 'scheduled'        // Periodic scheduled capture
  | 'api_event';       // External API event

/**
 * Normalized image data from any source
 */
export interface ImageCapture {
  /** Raw image buffer (JPEG preferred for size) */
  buffer: Buffer;
  /** MIME type */
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** When the image was captured */
  timestamp: Date;
  /** Which source produced this image */
  sourceId: string;
  /** What triggered the capture */
  trigger: VisionTrigger;
  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * An event from a vision source (motion, doorbell, etc.)
 */
export interface VisionEvent {
  id: string;
  sourceId: string;
  type: VisionTrigger;
  timestamp: Date;
  /** Text description of the event */
  description: string;
  /** Associated snapshot, if available */
  snapshot?: ImageCapture;
  /** Whether this event has been processed by the Brain */
  processed: boolean;
}

/**
 * Configuration for a vision source
 */
export interface VisionSourceConfig {
  id: string;
  name: string;
  type: 'security_camera' | 'phone_camera' | 'screenshot' | 'upload';
  enabled: boolean;
  /** How often to poll for events (seconds). 0 = event-driven only */
  pollIntervalSeconds: number;
  /** Custom settings per source type */
  settings: Record<string, unknown>;
}

/**
 * Abstract interface all vision sources must implement
 */
export interface VisionSource {
  /** Unique source identifier */
  readonly id: string;
  /** Human-readable name (e.g., "Front Door Camera") */
  readonly name: string;
  /** Source category */
  readonly type: VisionSourceConfig['type'];

  /** Is this source currently reachable? */
  isAvailable(): Promise<boolean>;

  /** Get a snapshot right now */
  getSnapshot(): Promise<ImageCapture>;

  /** Get recent events since a given timestamp */
  getRecentEvents(since: Date): Promise<VisionEvent[]>;

  /** Get the most recent event (for quick checks) */
  getLatestEvent(): Promise<VisionEvent | null>;
}
```

### Ring Camera Implementation

```typescript
// src/lib/jarvis/vision/sources/RingSource.ts

import { RingApi, RingCamera } from 'ring-client-api';
import type { VisionSource, ImageCapture, VisionEvent } from '../types';

/**
 * Ring camera adapter.
 *
 * Uses ring-client-api (unofficial, community-maintained).
 * Authentication: Ring refresh token obtained via OAuth flow.
 *
 * IMPORTANT: ring-client-api requires a persistent process for
 * real-time event subscriptions (onNewDing, onMotionDetected).
 * On Vercel (serverless), we can only do snapshot-on-demand
 * and poll for recent events via the Ring cloud API.
 *
 * For real-time: requires a separate always-on service (see Section 3).
 */
export class RingSource implements VisionSource {
  readonly id: string;
  readonly name: string;
  readonly type = 'security_camera' as const;

  private ringApi: RingApi | null = null;
  private camera: RingCamera | null = null;

  constructor(
    id: string,
    name: string,
    private refreshToken: string,
    private cameraDescription?: string // to find the right camera
  ) {
    this.id = id;
    this.name = name;
  }

  private async getCamera(): Promise<RingCamera> {
    if (this.camera) return this.camera;

    this.ringApi = new RingApi({ refreshToken: this.refreshToken });
    const cameras = await this.ringApi.getCameras();

    if (this.cameraDescription) {
      this.camera = cameras.find(c =>
        c.name.toLowerCase().includes(this.cameraDescription!.toLowerCase())
      ) || cameras[0];
    } else {
      this.camera = cameras[0];
    }

    if (!this.camera) throw new Error('No Ring camera found');
    return this.camera;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getCamera();
      return true;
    } catch {
      return false;
    }
  }

  async getSnapshot(): Promise<ImageCapture> {
    const camera = await this.getCamera();
    const buffer = await camera.getSnapshot();

    return {
      buffer: Buffer.from(buffer),
      mediaType: 'image/jpeg',
      width: 1920,  // Ring cameras typically 1080p
      height: 1080,
      timestamp: new Date(),
      sourceId: this.id,
      trigger: 'manual_snapshot',
    };
  }

  async getRecentEvents(since: Date): Promise<VisionEvent[]> {
    const camera = await this.getCamera();
    const history = await camera.getEvents({
      limit: 20,
      // Ring API returns most recent events
    });

    return history
      .filter(event => new Date(event.created_at) > since)
      .map(event => ({
        id: event.ding_id_str || String(event.created_at),
        sourceId: this.id,
        type: event.kind === 'motion' ? 'motion' as const : 'doorbell' as const,
        timestamp: new Date(event.created_at),
        description: event.kind === 'motion'
          ? `Motion detected at ${this.name}`
          : `Doorbell pressed at ${this.name}`,
        processed: false,
      }));
  }

  async getLatestEvent(): Promise<VisionEvent | null> {
    const events = await this.getRecentEvents(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24 hours
    );
    return events[0] || null;
  }
}
```

**Ring Authentication Flow:**
1. Run `npx ring-client-api` locally once to complete OAuth login
2. Extract the `refreshToken` from the output
3. Store as `RING_REFRESH_TOKEN` env var in Vercel
4. The token auto-refreshes itself via the Ring API

**Caveats (MEDIUM confidence):**
- `ring-client-api` is unofficial/community-maintained by `dgreif`
- Ring may change their API without notice
- The `getSnapshot()` method wakes the camera, which can drain battery on battery-powered devices
- Real-time event subscription (`camera.onNewDing.subscribe()`) requires a persistent WebSocket connection -- NOT possible on Vercel serverless

### Phone Camera / Upload Implementation

```typescript
// src/lib/jarvis/vision/sources/UploadSource.ts

import type { VisionSource, ImageCapture, VisionEvent } from '../types';

/**
 * Handles images uploaded directly by the user in chat.
 *
 * This isn't really a "source" you poll -- it's a handler for
 * user-initiated image sharing. But it implements VisionSource
 * so it can participate in the same pipeline.
 *
 * In practice, image uploads go through the chat route directly.
 * This class is used for the "show me the camera" / snapshot
 * management use case, not for live chat uploads.
 */
export class UploadSource implements VisionSource {
  readonly id = 'user_upload';
  readonly name = 'User Upload';
  readonly type = 'upload' as const;

  private recentUploads: VisionEvent[] = [];

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async getSnapshot(): Promise<ImageCapture> {
    throw new Error('Upload source does not support getSnapshot -- images are user-initiated');
  }

  /** Record that a user uploaded an image */
  recordUpload(capture: ImageCapture): VisionEvent {
    const event: VisionEvent = {
      id: `upload_${Date.now()}`,
      sourceId: this.id,
      type: 'user_upload',
      timestamp: capture.timestamp,
      description: 'User uploaded an image in chat',
      snapshot: capture,
      processed: true, // Uploads are processed immediately by the Brain
    };
    this.recentUploads.unshift(event);
    if (this.recentUploads.length > 50) this.recentUploads.pop();
    return event;
  }

  async getRecentEvents(since: Date): Promise<VisionEvent[]> {
    return this.recentUploads.filter(e => e.timestamp > since);
  }

  async getLatestEvent(): Promise<VisionEvent | null> {
    return this.recentUploads[0] || null;
  }
}
```

### Screenshot Implementation

Screenshots follow the same pattern as uploads. The user either:
1. Takes a screenshot on their phone and shares it in chat (same as upload)
2. Uses a browser extension to capture and send to Jarvis

For Jonathan's use case, screenshots are functionally identical to uploads -- the image arrives in the chat as a file. No separate ScreenshotSource class is needed unless a programmatic capture mechanism is added later.

---

## 3. Vercel Constraints & Solutions

### Constraint Matrix

| Constraint | Limit | Impact | Solution |
|-----------|-------|--------|----------|
| **Body size** | 4.5 MB per serverless function request | Camera snapshots are typically 100-500KB JPEG, well under limit. But base64 encoding adds ~33% overhead | JPEG compression + resize to 1568px max. A 1080p JPEG at quality 80 is ~200KB. Base64 = ~267KB. Safe. |
| **Function timeout** | 60s (Pro, already set on chat route) | Ring API call + Claude vision analysis could be slow | Ring snapshot: ~2-5s. Claude vision: ~3-10s. Total ~15s. Safe within 60s. |
| **Cron frequency** | Hobby: once/day. **Pro: once/minute.** | Hobby plan cannot poll cameras frequently. Pro can poll every minute. | Jonathan is on Hobby. Upgrade to Pro for camera polling, or use external polling service. |
| **No persistent processes** | Serverless = stateless, no WebSockets | Cannot use `camera.onNewDing.subscribe()` for real-time Ring events | Poll-based approach via cron, or use external always-on service |
| **Blob storage** | 1 GB on Hobby. Pro includes more. | Snapshots at ~200KB each = ~5,000 on Hobby | Retain only last 24-48 hours. Auto-cleanup via cron. |
| **Cold starts** | ~500ms-2s for serverless functions | Ring API initialization adds latency | Lazy initialization, cache RingApi instance within function lifetime |

### Image Processing on Vercel: Feasible

Image processing on Vercel serverless functions is absolutely feasible for the vision use case:

1. **No heavy image processing needed.** Claude accepts JPEG/PNG directly. We only need to:
   - Resize if over 1568px (use `sharp` -- already works in serverless)
   - Convert to base64 string
   - Pass to Claude API

2. **Size math:**
   - Ring snapshot: ~200KB JPEG (1080p)
   - Base64 encoded: ~267KB
   - Well under 4.5MB body limit
   - Well under Claude's 5MB per-image API limit

3. **Token cost math (from Anthropic docs):**
   - Formula: `tokens = (width * height) / 750`
   - Ring 1080p (1920x1080): would be resized to ~1568x882 = ~1,846 tokens
   - Optimized 800x600: ~640 tokens
   - At Haiku pricing ($1/M input): ~$0.0006 per image analysis
   - At Sonnet pricing ($3/M input): ~$0.002 per image analysis

### Image Storage: Use Vercel Blob

**Recommendation:** Vercel Blob with private storage.

```typescript
import { put, del, list } from '@vercel/blob';

// Store a snapshot
async function storeSnapshot(
  capture: ImageCapture,
  eventId: string
): Promise<string> {
  const path = `vision/${capture.sourceId}/${eventId}.jpg`;
  const blob = await put(path, capture.buffer, {
    access: 'private',
    contentType: capture.mediaType,
    // Cache for 24 hours, then auto-expire
    cacheControlMaxAge: 86400,
  });
  return blob.url;
}

// Clean up old snapshots (run via cron)
async function cleanupOldSnapshots(maxAgeHours: number = 48): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const blobs = await list({ prefix: 'vision/' });
  let deleted = 0;

  for (const blob of blobs.blobs) {
    if (new Date(blob.uploadedAt) < cutoff) {
      await del(blob.url);
      deleted++;
    }
  }
  return deleted;
}
```

**Why Vercel Blob over alternatives:**
- Already in the Vercel ecosystem (no new infra)
- Private storage mode = authenticated access only
- SDK is simple (`put`, `del`, `list`)
- Backed by S3 (11 nines durability)
- Pricing: $0.023/GB-month storage + $0.05/GB transfer
- At ~200KB/snapshot, 100 snapshots/day = ~20MB/day = ~600MB/month = ~$0.014/month

**NOT recommended:**
- Base64 in SQLite: bloats the database, no CDN, slow queries
- R2/S3 direct: unnecessary complexity for this scale
- Local filesystem: doesn't exist on serverless

### Scheduling: Camera Polling

**The Problem:** Vercel Hobby plan limits cron jobs to once per day. Ring camera events happen in real-time.

**Three options, in order of pragmatism:**

#### Option A: Event-Driven via Webhook Relay (Recommended for Phase 2+)

Run a tiny always-on service that subscribes to Ring events and POSTs to Jarvis:

```
Ring Cloud ----WebSocket----> Relay Service ----POST----> /api/jarvis/vision/event
                              (Render.com,                (Vercel serverless)
                               Railway, etc.
                               $0-7/month)
```

The relay service is a ~50-line Node.js script:

```typescript
// relay-service/index.ts (runs on Render/Railway/etc.)
import { RingApi } from 'ring-client-api';

const ringApi = new RingApi({ refreshToken: process.env.RING_REFRESH_TOKEN! });
const JARVIS_WEBHOOK = process.env.JARVIS_VISION_WEBHOOK!;
const WEBHOOK_SECRET = process.env.VISION_WEBHOOK_SECRET!;

async function start() {
  const cameras = await ringApi.getCameras();
  for (const camera of cameras) {
    camera.onNewDing.subscribe(async (ding) => {
      const snapshot = await camera.getSnapshot();
      await fetch(JARVIS_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vision-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          sourceId: camera.name,
          event: ding.kind, // 'motion' or 'ding'
          timestamp: new Date().toISOString(),
          snapshot: Buffer.from(snapshot).toString('base64'),
        }),
      });
    });
  }
  console.log(`Watching ${cameras.length} cameras`);
}

start();
```

**Cost:** Render.com free tier or $7/month for background worker.

#### Option B: Vercel Cron Polling (Requires Pro Plan)

If Jonathan upgrades to Vercel Pro ($20/month), cron jobs can run every minute:

```json
// vercel.json
{
  "crons": [
    { "path": "/api/jarvis/reflect", "schedule": "0 5 * * *" },
    { "path": "/api/jarvis/vision/poll", "schedule": "*/5 * * * *" }
  ]
}
```

Poll every 5 minutes, check Ring for new events since last poll.

**Downside:** 5-minute delay between event and notification. Not real-time.

#### Option C: On-Demand Only (Phase 1, No Extra Infra)

Skip polling entirely. Vision only activates when:
1. User asks "show me the front door"
2. User uploads a photo in chat
3. User takes a grocery photo

This requires ZERO extra infrastructure and works on Hobby plan.

**Recommendation:** Start with Option C (Phase 1), add Option A when camera monitoring matters (Phase 2+).

---

## 4. Integration with Existing Jarvis Systems

### 4.1 Chat Integration: Image Messages

The chat route needs to accept image content blocks. Here is the minimal change:

```typescript
// Modified ChatMessage type to support images
interface ChatContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ChatContentBlock[];
}
```

The frontend sends a message like:

```typescript
// Client-side: user takes a photo and sends it in chat
const handleImageSend = async (file: File, prompt: string) => {
  const base64 = await fileToBase64(file);
  const mediaType = file.type; // 'image/jpeg', 'image/png', etc.

  // Send as a message with image + text content blocks
  sendMessage({
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      },
      {
        type: 'text',
        text: prompt || 'What do you see in this image?',
      },
    ],
  });
};
```

The `sdkBrain.ts` already accepts `Anthropic.MessageParam[]` which supports image content blocks natively. The only change is allowing the chat API route to pass through image content blocks instead of forcing everything to be a string.

**Critical insight:** This is a small change to the chat route, NOT a new API endpoint. The Brain already handles multimodal messages because Claude's SDK supports them.

### 4.2 Vision Tools for the Brain

New tools that let the Brain interact with vision sources:

```typescript
// Addition to src/lib/jarvis/intelligence/tools.ts

export const visionTools: ToolDefinition[] = [
  {
    name: 'get_camera_snapshot',
    description: 'Get a live snapshot from a camera. Use when the user asks '
      + '"show me the front door", "what does the camera see?", '
      + '"check the backyard", or any request to see a camera feed.',
    input_schema: {
      type: 'object',
      properties: {
        camera_name: {
          type: 'string',
          description: 'Camera name or location (e.g., "front door", "backyard")',
        },
      },
      required: ['camera_name'],
    },
  },
  {
    name: 'get_recent_camera_events',
    description: 'Check recent camera events (motion, doorbell presses). '
      + 'Use when user asks "any activity at the door?", "has anyone '
      + 'been at the house?", "what happened while I was gone?"',
    input_schema: {
      type: 'object',
      properties: {
        camera_name: {
          type: 'string',
          description: 'Camera name or "all" for all cameras',
        },
        hours_back: {
          type: 'number',
          description: 'How many hours back to check (default: 4)',
        },
      },
    },
  },
];
```

The tool executor for `get_camera_snapshot` would:
1. Find the matching VisionSource
2. Call `getSnapshot()`
3. Resize + compress the image
4. Return a special response that includes the image data

**Challenge:** Current tool results are strings. A snapshot tool needs to inject an image back into the conversation. Two approaches:

**Approach A (Recommended): Two-Turn Vision**

The `get_camera_snapshot` tool stores the snapshot in Vercel Blob and returns a URL. The Brain then gets a second turn where the system prompt includes the image:

```typescript
// In the vision tool executor
async function executeVisionTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'get_camera_snapshot') {
    const source = findVisionSource(input.camera_name as string);
    const snapshot = await source.getSnapshot();
    const compressed = await compressImage(snapshot);
    const blobUrl = await storeSnapshot(compressed, `snap_${Date.now()}`);

    // Return structured data that the chat processor can detect
    return JSON.stringify({
      __vision_snapshot: true,
      blobUrl,
      base64: compressed.buffer.toString('base64'),
      mediaType: compressed.mediaType,
      width: compressed.width,
      height: compressed.height,
      source: source.name,
      timestamp: new Date().toISOString(),
    });
  }
  // ... other tools
}
```

The `chatProcessor.ts` detects `__vision_snapshot` in a tool result and injects the image into the next Claude turn as an image content block. This way Claude sees the actual image and can describe what it sees.

**Approach B: Separate Vision Analysis Call**

The tool executor calls Claude vision API directly, gets a text description, and returns that as the tool result. Simpler but means the user never sees the actual image in chat.

**Recommendation:** Approach A for camera snapshots (user wants to SEE the image). The UI shows the image inline in chat, and Claude's text response describes what it sees.

### 4.3 Briefing Integration

Vision events should appear in morning briefings:

```typescript
// Extension to BriefingData in executive/types.ts
export interface VisionSummary {
  /** Total events in last 24 hours */
  totalEvents: number;
  /** Motion events */
  motionEvents: number;
  /** Doorbell events */
  doorbellEvents: number;
  /** Most recent notable event */
  lastNotableEvent?: {
    type: string;
    timestamp: string;
    description: string;
    /** Blob URL if snapshot was stored */
    snapshotUrl?: string;
  };
}

// Add to BriefingData:
export interface BriefingData {
  // ... existing fields ...
  vision?: {
    summary: VisionSummary;
  };
}
```

The `BriefingBuilder.ts` would add a vision query to its parallel fetch:

```typescript
// In buildMorningBriefing(), add to the Promise.all:
const visionPromise = isVisionConfigured()
  ? getVisionSummary(last24Hours)
  : Promise.resolve(null);
```

**Briefing text example:**
> "Overnight camera activity: 3 motion events at the front door, last one at 2:47 AM. No doorbell presses."

### 4.4 Memory Integration

Notable vision events should be stored in Jarvis's memory:

```typescript
// When processing a vision event, the Brain can call remember_fact:
// "Delivery arrived at front door at 3:15 PM on March 1st"
// "Motion detected at backyard camera at 11:30 PM -- appeared to be a cat"
```

The Brain decides what is memorable. Most motion events are not worth storing. But:
- Doorbell presses (someone was at the door)
- Unusual activity times (3 AM motion)
- User-requested snapshots (contextual)
- Identified patterns ("delivery person comes around 3 PM most days")

This is handled naturally by Claude's reasoning -- no special memory pipeline needed. The system prompt can guide what to remember:

```
When analyzing camera events, remember notable observations:
- Visitors or deliveries
- Unusual timing (late night / early morning activity)
- Patterns you notice over time
Do NOT store routine events (wind-triggered motion, etc.)
```

### 4.5 Self-Improvement Integration

The self-improvement loop applies naturally to vision interactions:

- **Evaluator** assesses: "Did the vision response help the user?"
- **Reflection** can produce rules like: "When user asks about camera, describe what you see concisely -- they want a quick status, not a paragraph"
- **Meta-evaluator** can flag: "Vision-related rules are too generic, need concrete examples"

No special vision-specific self-improvement code needed.

---

## 5. Security & Privacy

### 5.1 Threat Model

Camera data is the most sensitive data Jarvis handles. A security camera feed is:
- PII-rich (faces, license plates, daily patterns)
- Location-revealing (home address visible)
- Routine-exposing (when you leave/arrive home)

### 5.2 Security Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Auth** | Vision API endpoints require Jarvis auth | Same `X-Jarvis-Secret` middleware as existing routes |
| **Ring token** | Refresh token stored as Vercel env var | Never exposed to client. Server-side only. |
| **Blob storage** | Private mode (authenticated access only) | `access: 'private'` on all vision blobs |
| **Data retention** | Auto-delete snapshots after 48 hours | Cron job runs `cleanupOldSnapshots(48)` |
| **Transmission** | HTTPS only (Vercel enforces TLS) | All Vercel endpoints are HTTPS by default |
| **Vision webhook** | Webhook secret for relay service | `X-Vision-Secret` header, return 500 if unset (same pattern as Telegram webhook) |
| **No face ID** | Claude's AUP prohibits person identification | System prompt: "Do not attempt to identify people" |
| **Logging** | Snapshot base64 NOT logged to console | Only log metadata (sourceId, trigger, timestamp) |

### 5.3 Data Retention Policy

```typescript
// Vision data retention config
export const VISION_RETENTION = {
  /** How long to keep snapshots in Blob storage */
  snapshotRetentionHours: 48,
  /** How long to keep event metadata in DB */
  eventRetentionDays: 30,
  /** Maximum snapshots per source per day */
  maxSnapshotsPerSourcePerDay: 100,
  /** Maximum total storage (MB) before forced cleanup */
  maxTotalStorageMB: 500,
};
```

### 5.4 Access Control

Jarvis is single-user (Jonathan only). But the vision layer should still enforce:
- All vision API routes behind the existing middleware auth
- No unauthenticated access to stored snapshots (Vercel Blob private mode)
- Webhook endpoint for relay service authenticated via shared secret
- Ring refresh token treated as a secret (env var, never in code)

---

## 6. Phased Implementation Roadmap

### Phase 1: Chat Vision (Simplest Useful Capability)

**What:** User can send photos in Jarvis chat. Claude sees them and responds with tools.

**Scope:**
- Modify chat route to accept image content blocks
- Modify chat UI to support image upload (camera button, file picker)
- Image compression/resizing utility (`sharp`)
- Model switching: Haiku (cheap) vs Sonnet (better recognition)
- System prompt update for vision context

**Use cases unlocked:**
- Snap a grocery receipt -> Claude calls `update_pantry`
- Photo of fridge contents -> "What can I make with this?"
- Screenshot of an error -> "What does this error mean?"
- Photo of a document -> "Summarize this"

**Effort:** ~2-3 coding sessions
**Dependencies:** None beyond current codebase
**Infrastructure:** None (uses existing chat pipeline)

**Key files to modify:**
1. `src/app/api/jarvis/chat/route.ts` -- accept image content blocks
2. `src/lib/jarvis/intelligence/chatProcessor.ts` -- pass through image content
3. `src/lib/jarvis/intelligence/sdkBrain.ts` -- already supports images natively (no change)
4. Chat UI component -- add camera/upload button
5. New: `src/lib/jarvis/vision/imageUtils.ts` -- resize, compress, base64

### Phase 2: Camera Snapshots On-Demand

**What:** User asks "show me the front door" and Jarvis fetches a live snapshot.

**Scope:**
- `VisionSource` interface + `RingSource` implementation
- `get_camera_snapshot` tool + tool executor
- Vision tool routing in `chatProcessor.ts`
- Vercel Blob storage for snapshots
- Camera image displayed inline in chat UI

**Use cases unlocked:**
- "Show me the front door"
- "Is anyone at the door?"
- "What does the backyard look like?"

**Effort:** ~3-4 coding sessions
**Dependencies:** Phase 1 (chat vision), Ring account + refresh token
**Infrastructure:** `ring-client-api` npm package, `@vercel/blob`, `sharp`
**New env vars:** `RING_REFRESH_TOKEN`, `BLOB_READ_WRITE_TOKEN`

### Phase 3: Event Awareness

**What:** Jarvis knows about recent camera events and can report on activity.

**Scope:**
- `get_recent_camera_events` tool
- Vision events table in SQLite (metadata only, not images)
- Event polling (Option B: cron if Pro, or Option A: relay service)
- Briefing integration: "3 motion events overnight"
- Push notification via Telegram for doorbell presses

**Use cases unlocked:**
- "Any activity at the house today?"
- "Was anyone at the door while I was at work?"
- Morning briefing includes overnight camera summary
- Telegram alert: "Doorbell ring at front door -- [snapshot]"

**Effort:** ~4-5 coding sessions
**Dependencies:** Phase 2, either Vercel Pro or relay service
**Infrastructure:** Relay service (Render.com ~$0-7/month) or Vercel Pro ($20/month)
**New env vars:** `VISION_WEBHOOK_SECRET` (if relay), cron config updates

### Phase 4: Vision Intelligence (Future)

**What:** Jarvis learns from vision data over time.

**Scope:**
- Automatic categorization of events (delivery, visitor, animal, weather)
- Pattern detection ("deliveries usually come at 3 PM")
- Smart filtering (reduce noise: ignore wind-triggered motion)
- Notable event memory storage
- Vision-aware self-improvement rules

**Use cases unlocked:**
- "When do deliveries usually come?"
- "Has the package been delivered today?"
- Proactive: "Looks like someone is at the door"
- Reduced noise: only alert on meaningful events

**Effort:** ~4-6 coding sessions
**Dependencies:** Phase 3 (needs event history data)
**Infrastructure:** Same as Phase 3

### Effort Summary for Jonathan

| Phase | Sessions | New Infra | Monthly Cost |
|-------|----------|-----------|-------------|
| 1: Chat Vision | 2-3 | None | $0 |
| 2: Camera Snapshots | 3-4 | ring-client-api, @vercel/blob, sharp | ~$0.01 (blob) |
| 3: Event Awareness | 4-5 | Relay service OR Vercel Pro | $0-20/month |
| 4: Vision Intelligence | 4-6 | None new | Same |

**Recommended approach:** Ship Phase 1 as part of v4.2 (it supports the pantry photo use case already in scope). Phase 2 can be v4.3 or a separate milestone. Phases 3-4 are future milestones.

---

## 7. Appendix: Code Examples

### A. Image Compression Utility

```typescript
// src/lib/jarvis/vision/imageUtils.ts

/**
 * Compress and resize an image for Claude vision API.
 *
 * Target: JPEG, max 1568px long edge, quality 80.
 * This keeps images under 500KB and within Claude's optimal
 * token range (~1600 tokens per 1.15 megapixel image).
 *
 * Uses 'sharp' which works in Vercel serverless.
 */

import sharp from 'sharp';

const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 80;

export interface CompressedImage {
  buffer: Buffer;
  mediaType: 'image/jpeg';
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export async function compressForVision(
  input: Buffer,
  inputMediaType?: string
): Promise<CompressedImage> {
  const metadata = await sharp(input).metadata();
  const originalSize = input.length;

  let pipeline = sharp(input);

  // Resize if needed (preserve aspect ratio)
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const longEdge = Math.max(width, height);

  if (longEdge > MAX_DIMENSION) {
    pipeline = pipeline.resize({
      width: width >= height ? MAX_DIMENSION : undefined,
      height: height > width ? MAX_DIMENSION : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to JPEG for consistent size/quality
  const result = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mediaType: 'image/jpeg',
    width: result.info.width,
    height: result.info.height,
    originalSize,
    compressedSize: result.data.length,
  };
}

/**
 * Convert an image buffer to base64 for Claude API.
 */
export function imageToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Estimate token count for an image.
 * Formula from Anthropic docs: tokens = (width * height) / 750
 */
export function estimateImageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

/**
 * Estimate cost in USD for analyzing an image.
 */
export function estimateImageCost(
  width: number,
  height: number,
  model: 'haiku' | 'sonnet' = 'haiku'
): number {
  const tokens = estimateImageTokens(width, height);
  const costPerMillion = model === 'haiku' ? 1.0 : 3.0; // $ per million input tokens
  return (tokens / 1_000_000) * costPerMillion;
}
```

### B. Modified Chat Route (Phase 1 Change)

```typescript
// Key change to src/app/api/jarvis/chat/route.ts

// Before (current):
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// After (with vision support):
type ChatContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: string;
        data: string;
      };
    };

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ChatContentBlock[];
}

// In the POST handler, normalize messages for Claude:
function normalizeMessages(
  messages: ChatMessage[]
): Anthropic.MessageParam[] {
  return messages.map(msg => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    // Already in content block format -- pass through to Claude
    return {
      role: msg.role,
      content: msg.content.map(block => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text };
        }
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: block.source.media_type,
            data: block.source.data,
          },
        };
      }),
    };
  });
}
```

### C. Chat UI Image Upload Component

```typescript
// Minimal image upload in chat (React component sketch)

function ImageUploadButton({ onImageSelected }: {
  onImageSelected: (file: File, base64: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side compression before sending
    const compressed = await compressImageClient(file, {
      maxWidth: 1568,
      maxHeight: 1568,
      quality: 0.8,
      type: 'image/jpeg',
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      onImageSelected(file, base64);
    };
    reader.readAsDataURL(compressed);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"  // Opens phone camera on mobile
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="p-2 text-white/50 hover:text-cyan-400 transition-colors"
        aria-label="Upload image or take photo"
      >
        <Camera size={20} />
      </button>
    </>
  );
}
```

### D. Vision Event Database Schema

```sql
-- Addition to Jarvis SQLite schema for vision events

CREATE TABLE IF NOT EXISTS vision_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  event_type TEXT NOT NULL,          -- 'motion', 'doorbell', 'manual_snapshot', etc.
  timestamp TEXT NOT NULL,           -- ISO 8601
  description TEXT,
  snapshot_blob_url TEXT,            -- Vercel Blob URL (nullable)
  brain_analysis TEXT,               -- Claude's description of what it saw
  processed INTEGER DEFAULT 0,       -- 1 if Brain has analyzed this
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_vision_events_source ON vision_events(source_id);
CREATE INDEX idx_vision_events_timestamp ON vision_events(timestamp);
CREATE INDEX idx_vision_events_type ON vision_events(event_type);
```

---

## 8. Sources & Confidence

### Sources Used

| Source | Type | What it provided |
|--------|------|-----------------|
| [Anthropic Vision Docs](https://platform.claude.com/docs/en/build-with-claude/vision) | Official docs | Image input methods, token formula, size limits, supported formats. **Verified directly.** |
| [Vercel Blob Docs](https://vercel.com/docs/vercel-blob) | Official docs | Private/public storage, SDK API, pricing, caching behavior. |
| [Vercel Cron Docs](https://vercel.com/docs/cron-jobs/usage-and-pricing) | Official docs | Hobby: once/day only. Pro: once/minute. 100 crons max. |
| [Vercel Body Size Limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) | Official KB | 4.5MB limit, client-side upload workaround. |
| [ring-client-api (npm)](https://www.npmjs.com/package/ring-client-api) | NPM package | `getSnapshot()`, `getEvents()`, `onNewDing`, authentication flow. Community-maintained. |
| [dgreif/ring (GitHub)](https://github.com/dgreif/ring) | GitHub repo | TypeScript Ring API, refresh token auth, event subscription model. |
| [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Official docs | Haiku $1/M, Sonnet $3/M input tokens. Image token formula. |
| Existing Jarvis codebase | Local files | Architecture patterns, tool system, chat pipeline, config system. |

### Confidence Levels

| Area | Confidence | Rationale |
|------|------------|-----------|
| Claude vision API (image input, token costs) | **HIGH** | Verified directly from official Anthropic documentation |
| Vercel constraints (body size, cron limits, blob) | **HIGH** | Verified from official Vercel documentation |
| Chat route modification (Phase 1) | **HIGH** | Read the actual codebase; change is minimal and well-understood |
| ring-client-api capabilities | **MEDIUM** | Unofficial library; API could change. Community-maintained but active. |
| Ring real-time events on serverless | **HIGH** | Definitively NOT possible (requires persistent WebSocket). Relay service needed. |
| Vercel Blob for snapshots | **HIGH** | Official Vercel product, well-documented, appropriate for this use case |
| Relay service architecture | **MEDIUM** | Standard pattern but requires additional infrastructure management |
| Self-improvement for vision | **HIGH** | Uses existing pipeline; no new code needed |
| Cost estimates | **MEDIUM** | Based on current pricing; may change. But magnitude is correct (~pennies/day). |

### Key Uncertainties

1. **Ring API stability:** `ring-client-api` reverses an unofficial API. Ring could break it at any time. However, it has been maintained for years and is used by Home Assistant.

2. **Claude video API:** Anthropic may have released or be releasing a real-time video API. If so, it could replace the snapshot-based approach entirely. This document assumes snapshot-based (which is available today and proven). If real-time video becomes available, it would be a Phase 4+ enhancement.

3. **Vercel plan:** Jonathan is currently on Hobby. Camera polling requires Pro ($20/month) or a relay service. This is a cost decision, not a technical one.

4. **sharp on Vercel:** The `sharp` library generally works on Vercel serverless, but occasionally has issues with specific Node.js versions or bundler configurations. The `@next/image` package uses sharp internally, so the existing Next.js deployment should already be compatible.

---

## Summary: What to Build and When

| Priority | What | Why | Phase |
|----------|------|-----|-------|
| **Now** | Chat image upload + Claude vision | Unlocks pantry photos (v4.2 scope), receipts, screenshots. Zero new infra. | Phase 1 |
| **Next** | Ring camera snapshots on-demand | "Show me the front door" -- compelling, tangible, Jarvis-feeling. | Phase 2 |
| **Later** | Event monitoring + briefing | "3 motion events overnight" -- awareness without checking Ring app. | Phase 3 |
| **Future** | Vision intelligence | Pattern learning, smart filtering, proactive alerts. | Phase 4 |

The most important architectural decision: **Vision is NOT a new system. It is an input adapter for the existing Brain.** Claude already knows how to see. We just need to give it eyes.
