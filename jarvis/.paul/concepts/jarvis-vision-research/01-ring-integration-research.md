# Ring Camera Integration Research for Jarvis

**Researched:** 2026-03-01
**Researcher:** Claude (automated research agent)
**Purpose:** Evaluate all viable approaches for Jarvis to pull images/snapshots/event history from Ring cameras for vision model analysis

---

## Summary Recommendation

**Use `ring-client-api` (the unofficial Node.js library) -- but NOT directly in Vercel serverless functions.** Deploy a lightweight sidecar service (a small Node.js process on a VPS, Raspberry Pi, or always-on server) that maintains the persistent Ring connection and token state, then expose simple REST endpoints that Jarvis API routes can call.

**Why this architecture:**
1. `ring-client-api` requires persistent token refresh management (tokens rotate hourly, and the FIRST refresh contains Firebase registration data that is irrecoverable if lost). Vercel's ephemeral serverless functions cannot reliably maintain this state.
2. The library is actively maintained (v14.3.0, Feb 2025), has 1.5k GitHub stars, ~2k weekly downloads, and is the foundation for homebridge-ring, ring-mqtt, and a new Ring MCP server.
3. Browser automation (Playwright/Puppeteer) is technically possible but massively over-engineered for this use case and cannot run on Vercel.
4. The official Ring Developer API (Spring 2026 Appstore) is enterprise-focused and requires application approval -- not viable for personal use.

**The simplest path to "Jarvis sees my front door":**
1. Deploy a small Node.js service that uses `ring-client-api` to pull snapshots on demand
2. Create a Jarvis API route that calls the sidecar, gets the image buffer, and passes it to Claude Vision
3. Optionally subscribe to motion/ding events and store recent event history in Turso

---

## 1. `ring-client-api` -- The Unofficial Node.js Library

### 1.1 Current State (as of March 2026)

| Metric | Value | Source |
|--------|-------|--------|
| Latest version | 14.3.0 | npm / GitHub releases |
| Last release | February 8, 2025 | GitHub releases |
| Release cadence | Every 2-3 months | GitHub releases |
| GitHub stars | ~1,500 | GitHub |
| Weekly downloads | ~1,900-2,000 | Snyk / npm |
| Contributors | 34 | GitHub |
| Dependents | 170 packages | GitHub |
| Maintenance status | Sustainable (active) | Snyk health analysis |
| Package health | Healthy | Snyk |

**Confidence: HIGH** -- verified via GitHub releases page, Snyk health analysis, and npm.

The library is maintained by `dgreif` and has been continuously updated since its creation. The v14.x line converted to ESM (breaking change from v13), uses `undici` for WebSocket connections, and replaced TypeScript enums with union types. It is the backbone of `homebridge-ring` (Apple HomeKit integration) and `ring-mqtt` (Home Assistant MQTT bridge), giving it a strong incentive to remain maintained.

**Risk factor:** This is a single-maintainer project. If `dgreif` stops maintaining it and Ring changes their internal API, the library breaks. However, with 170 dependents and an active community, forks would likely appear quickly. The `@koush/ring-client-api` and `@keur/ring-client-api` forks already exist as evidence of this pattern.

### 1.2 What It Can Access

| Capability | Method | Notes |
|------------|--------|-------|
| **Get snapshot** | `camera.getSnapshot()` | Returns `Promise<Buffer>` -- a PNG image buffer |
| **Get event history** | `camera.getEvents()` | Returns motion events, doorbell presses, on-demand recordings |
| **Get recording URL** | `camera.getRecordingUrl(dingId, { transcoded: true })` | Returns URL to mp4 video (valid for ~15 min) |
| **Subscribe to live events** | `camera.onNewDing.subscribe()` | Real-time motion/ding/notification stream |
| **Start live stream** | `camera.startVideoOnDemand()` | Initiates live video (requires SIP/WebRTC) |
| **SIP session** | `camera.createSipSession()` | RTP flow management for real-time video |
| **Toggle light** | `camera.setLight(true/false)` | For cameras with lights |
| **Toggle siren** | `camera.setSiren(true/false)` | For cameras with sirens |
| **Get device health** | `camera.getHealth()` | WiFi signal, firmware info |
| **List all cameras** | `ringApi.getCameras()` | All cameras across all locations |
| **List locations** | `ringApi.getLocations()` | All Ring locations on account |
| **Location events** | `location.getCameraEvents()` | Events from ALL cameras at a location |
| **Alarm control** | `location.armAway()` etc. | Arm/disarm alarm system |

**For Jarvis's use case, the critical methods are:**
- `camera.getSnapshot()` -- pull a current image for Claude Vision analysis
- `camera.getEvents()` -- "what happened at my door today?"
- `camera.getRecordingUrl()` -- get a video clip of a specific event
- `camera.onNewDing.subscribe()` -- real-time "someone is at the door" notifications

### 1.3 Snapshot Limitations (Important)

**Battery-powered cameras:**
- Cannot take a snapshot while recording video (hardware limitation)
- When motion triggers recording, snapshot is blocked for 30-40 seconds
- Snapshots refresh every 2 minutes minimum
- If motion occurs during recording, you get a STALE image from the previous refresh
- The `getSnapshot()` method caches for 2 minutes; returns cached image if called within 10-60 seconds

**Wired cameras:**
- CAN take snapshots while recording
- Snapshots are typically no more than 10 seconds old during events
- Much more reliable for real-time visual analysis

**Implication for Jarvis:** If Jonathan has battery cameras, snapshots during active motion events will be stale. Wired cameras give much better results. For the "what's happening right now?" use case, wired cameras are strongly preferred.

### 1.4 Authentication Flow

**Initial setup (one-time, interactive):**
```bash
npx -p ring-client-api ring-auth-cli
```
This prompts for email, password, and 2FA code, then outputs a `refreshToken`.

**How token refresh works:**
1. The initial refresh token is used to authenticate
2. Ring generates a NEW refresh token approximately every hour
3. The library MUST subscribe to `api.onRefreshTokenUpdated` to capture the new token
4. The new token MUST be persisted (file, database, env var)
5. **CRITICAL:** The FIRST token refresh contains Firebase Cloud Messaging registration data. If this is lost, push notifications break PERMANENTLY for that token. Recovery requires deleting the client from Ring Control Center and re-authenticating.

**Token lifecycle:**
```
Initial token (from CLI)
  --> First use registers with Firebase (MUST save new token)
  --> Hourly rotation (MUST save each new token)
  --> Tokens expire shortly after use (can't reuse old ones)
```

**Code example for token management:**
```typescript
import { RingApi } from 'ring-client-api';
import * as fs from 'fs';

const ringApi = new RingApi({
  refreshToken: process.env.RING_REFRESH_TOKEN!,
  debug: true,
});

// CRITICAL: Subscribe to token updates and persist them
ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken, oldRefreshToken }) => {
  console.log('Token refreshed, saving new token...');
  // Persist to wherever you store secrets
  // e.g., update .env file, database, or secrets manager
  fs.writeFileSync('.ring-token', newRefreshToken);
});
```

### 1.5 Reliability Concerns

**Known failure modes:**
- Ring occasionally changes internal APIs, breaking the library until `dgreif` updates it
- Token refresh failures have been documented (July 2025, October 2025 -- see GitHub issues)
- Home Assistant's Ring integration (which uses the same underlying API patterns) has had snapshot issues that went unfixed for months
- Battery camera snapshot limitations cause confusion and stale images

**Mitigation:**
- Pin to a specific version and test before upgrading
- Implement graceful degradation (if Ring API fails, log it and skip rather than crashing)
- Store token state in Turso (not just .env) so it survives restarts
- Set up health monitoring for the Ring connection

### 1.6 Code Examples for Jarvis Integration

**Basic: Get devices and pull a snapshot**
```typescript
import { RingApi } from 'ring-client-api';
import * as fs from 'fs';

async function getSnapshot() {
  const ringApi = new RingApi({
    refreshToken: process.env.RING_REFRESH_TOKEN!,
    // Reduce battery drain on wireless cameras
    cameraStatusPollingSeconds: 120,
  });

  // Subscribe to token refresh (CRITICAL)
  ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    // Persist new token
    updateStoredToken(newRefreshToken);
  });

  const cameras = await ringApi.getCameras();
  console.log(`Found ${cameras.length} cameras:`);
  cameras.forEach(cam => {
    console.log(`  - ${cam.name} (${cam.deviceType})`);
  });

  if (cameras.length > 0) {
    const snapshot = await cameras[0].getSnapshot();
    // snapshot is a Buffer containing PNG image data
    // Can be sent directly to Claude Vision as base64
    const base64 = snapshot.toString('base64');
    return { base64, mimeType: 'image/png' };
  }
}
```

**Get recent event history**
```typescript
async function getRecentEvents(ringApi: RingApi) {
  const cameras = await ringApi.getCameras();

  for (const camera of cameras) {
    const events = await camera.getEvents();
    // events is an array of ding objects
    for (const event of events) {
      console.log(`${event.created_at}: ${event.kind} (ID: ${event.ding_id_str})`);

      // Get recording URL for this event (requires Ring Protect plan)
      if (event.ding_id_str) {
        const url = await camera.getRecordingUrl(event.ding_id_str, {
          transcoded: true,
        });
        console.log(`  Recording: ${url}`);
        // NOTE: URL is only valid for ~15 minutes
      }
    }
  }
}
```

**Subscribe to real-time events (long-running process)**
```typescript
async function monitorEvents(ringApi: RingApi) {
  const cameras = await ringApi.getCameras();

  for (const camera of cameras) {
    camera.onNewDing.subscribe(ding => {
      if (ding.kind === 'motion') {
        console.log(`Motion detected on ${camera.name}!`);
        // Trigger snapshot capture and Claude Vision analysis
      } else if (ding.kind === 'ding') {
        console.log(`Doorbell pressed on ${camera.name}!`);
        // Could auto-capture and analyze who's at the door
      }
    });
  }
}
```

### 1.7 ESM Requirement (v14+)

Version 14 converted to ESM-only. Your project must use ESM imports. Since Jarvis is a Next.js project (which supports ESM), this should be compatible. However, if running a standalone sidecar service, ensure `"type": "module"` is in package.json or use `.mjs` extensions.

---

## 2. Browser Automation (Playwright/Puppeteer against ring.com)

### 2.1 Feasibility Assessment

**Verdict: Technically possible but NOT recommended.**

Ring's web interface at `ring.com` does expose:
- Dashboard with all cameras
- Live View (WebRTC-based, works in most modern browsers)
- Event History with recorded clips
- Bulk download of event videos

However, automating this has severe drawbacks.

### 2.2 What Ring's Web UI Exposes

| Feature | Available on Web | Notes |
|---------|-----------------|-------|
| Live View | Yes | WebRTC stream, requires modern browser |
| Event History | Yes | List of motion/ding events with timestamps |
| Video Playback | Yes | Requires Ring Protect subscription |
| Video Download | Yes | Bulk download up to 150 at a time |
| Snapshots | No (not directly) | Would need to screenshot the Live View |
| Device Settings | Yes | Full device configuration |

### 2.3 Auth Challenges

- **2FA required** on all Ring accounts -- must handle SMS/email code entry
- **CAPTCHA potential** -- Ring could add CAPTCHAs at any time
- **Session management** -- sessions expire; would need to maintain cookies
- **Bot detection** -- Ring/Amazon likely has bot detection; headless browsers leave fingerprints
- **Account lockout risk** -- automated login attempts could trigger security alerts

### 2.4 Pros vs Cons Compared to ring-client-api

| Factor | Browser Automation | ring-client-api |
|--------|-------------------|-----------------|
| Setup complexity | Very high | Low |
| Maintenance burden | Very high (UI changes break it) | Moderate (API changes break it) |
| Reliability | Low (fragile selectors, timing) | Medium-High |
| Resource usage | High (headless browser = 200-500MB RAM) | Low (Node.js API calls) |
| Vercel compatible | No (needs persistent browser) | No (needs persistent process) |
| Snapshot quality | Screenshot of video player | Direct PNG buffer from camera |
| Event history | Must scrape HTML | Structured JSON response |
| Video download | Must navigate UI workflow | Direct URL via API |
| Auth handling | Complex (2FA, session, cookies) | Refresh token (one-time setup) |

### 2.5 Vercel Compatibility

**Browser automation CANNOT run on Vercel.** Reasons:
- Playwright/Puppeteer require a Chromium binary (~400MB)
- Serverless functions have package size limits and short timeouts
- Maintaining browser sessions across ephemeral function invocations is impractical
- Would need a separate always-on server regardless

**If you need a separate server anyway, just use `ring-client-api` directly.** It's simpler, lighter, and more reliable.

### 2.6 Existing Browser Scripts

There are GitHub gists for downloading Ring videos via browser console bookmarklets (e.g., [vogler/5bb22703e](https://gist.github.com/vogler/5bb22703e2dc95f6bc4eb0c35abcd600)), but these are manual tools that assume you're already logged in and navigating the Ring website. They're not automation solutions.

**Recommendation: Do not pursue browser automation. `ring-client-api` is strictly superior for every dimension that matters.**

---

## 3. Other Approaches

### 3.1 Home Assistant as a Bridge

**Architecture:** Ring --> Home Assistant --> REST API --> Jarvis

**How it works:**
- Home Assistant has a native Ring integration (uses same underlying API as ring-client-api)
- HA exposes camera entities with snapshot endpoints: `/api/camera_proxy/camera.[name]`
- External access via HA's REST API with Bearer token authentication
- Can also use `ring-mqtt` addon for MQTT-based integration

**Pros:**
- If Jonathan already runs Home Assistant, this is free infrastructure
- HA handles token refresh and connection management
- Provides a stable REST API layer that Jarvis can call
- Ring-MQTT addon adds RTSP streaming capability

**Cons:**
- Requires running Home Assistant (Pi, NAS, or server)
- HA's Ring snapshot integration has been buggy -- a community post from Nov 2025 describes it as "abandoned" with a PR sitting unmerged
- Adds complexity (Ring --> HA --> MQTT/REST --> Jarvis) vs. direct API calls
- Snapshot on ring.com refreshes cached images, not fresh ones (same underlying limitation)

**Verdict:** Good if HA is already running. Not worth deploying HA solely as a Ring bridge.

### 3.2 Ring Email / Push Notification Parsing

**How it works:**
- Ring sends push notifications for motion/ding events
- Ring sends email notifications for alarm events (NOT for motion/ding)
- Could parse emails via IMAP or use IFTTT to forward notifications

**Limitations:**
- Email notifications do NOT include snapshots or video
- Push notifications include a thumbnail but parsing them requires mobile OS hooks
- No way to request a snapshot on demand -- purely reactive
- IFTTT Ring integration only supports basic triggers (motion detected, doorbell pressed)
- Does not provide video or image data through IFTTT

**Verdict: Not viable for vision analysis.** No images in email. Push notification parsing requires mobile app integration. This approach only tells you THAT something happened, not WHAT happened.

### 3.3 Amazon Alexa API

**How it works:**
- Ring is Amazon-owned; Ring Skill connects to Alexa
- Alexa Smart Home Skill API supports camera streams (WebRTC)
- Doorbell Event Source and Motion Sensor APIs exist for developers

**Limitations:**
- The Alexa Smart Home API is designed for Alexa-to-device communication (e.g., "Alexa, show me the front door" on Echo Show)
- Third-party skills can receive doorbell press/motion events and respond with camera stream URLs
- BUT: Building a custom Alexa Skill to access YOUR OWN Ring cameras requires:
  - Amazon Developer account
  - Skill certification process
  - Account linking (OAuth flow)
  - The skill would show video on Alexa devices, not extract images for external analysis
- No straightforward way to use Alexa API to pull a snapshot buffer for Claude Vision

**Verdict: Wrong tool for the job.** Alexa APIs are designed for the Alexa ecosystem (Echo Show, Fire TV), not for extracting camera data to external services.

### 3.4 Official Ring Developer API / Appstore (NEW -- Spring 2026)

**This is a significant development.** Ring announced at CES 2026 that they are launching an official Ring Appstore with a developer program.

**What's available:**
- Official developer portal at `developer.amazon.com/ring`
- Pre-built connectors and AI-assisted development tools
- Self-serve sandbox environments
- Access to: Live View, Motion Events, Video Snapshots

**Current Appstore apps (launching Spring 2026):**
- Spacture AI (shoplifting detection)
- Visionify (safety monitoring -- falls, fire, smoke)
- Lumeo (customer analytics)
- PoolScout (pool safety)
- MELD (dog behavior analysis)
- And 4 others

**Key constraints:**
- Designed for enterprise/commercial use cases (retail analytics, workplace safety)
- "Access on a rolling basis based on fit with our top customer use cases"
- Requires application and approval
- Apps process video data with 30-day retention policies
- Ring subscription required alongside developer subscription
- Currently US-only

**EU Data Portability API (separate):**
- Available in select EU countries only
- "Login With Ring" OAuth flow
- Access to video events, device info, location details
- Asynchronous data queries with S3 presigned URL responses
- Rate limited (5 req/sec for queries, 10 req/sec for results)

**Verdict for Jarvis:** The official API is enterprise-focused. A personal AI assistant monitoring your own front door is unlikely to be approved as an Appstore app. However, this signals that Ring is moving toward more open access. **Worth monitoring but not actionable today.**

### 3.5 IFTTT

**Capabilities:**
- Trigger: Motion detected on Ring camera
- Trigger: Doorbell pressed
- Action: Send notification, log to spreadsheet, call webhook

**Limitations:**
- No image/video data in triggers -- only metadata (timestamp, device name)
- Cannot request snapshots on demand
- Ring has scaled back IFTTT support over the years
- IFTTT Pro required for webhook actions ($3.99/month)

**Verdict: Not viable for vision analysis.** IFTTT could serve as a motion detection trigger (webhook to Jarvis saying "motion detected, go pull a snapshot"), but it cannot provide the image data itself. Could be a supplementary trigger mechanism alongside `ring-client-api`.

### 3.6 Ring MCP Server (Community Project)

**A community member (`jpcors`) built an MCP server for Ring** using `ring-client-api` under the hood. Repository: [github.com/jpcors/ring-mcp](https://github.com/jpcors/ring-mcp).

**Tools exposed:**
1. `list_devices` -- enumerate Ring devices
2. `get_device_info` -- detailed device specs
3. `arm_disarm_alarm` -- alarm control
4. `get_camera_snapshot` -- capture still images
5. `turn_light_on_off` -- toggle lights
6. `monitor_events` -- watch for events (~30 second windows)

**Why this matters:** This proves the pattern works. An MCP server wrapping `ring-client-api` that provides snapshot and event tools. Jarvis could adopt a similar architecture -- either use this MCP server directly (if it fits) or build a custom one.

**Limitations:** Only 6 commits, created July 2025. Small project, not battle-tested. No video recording access, only snapshots.

---

## 4. Legal / ToS Considerations

### 4.1 Ring Terms of Service Analysis

Ring's ToS (at `ring.com/terms`) contains the following relevant restrictions:

**Reverse engineering prohibition (exact quote):**
> "You may not reverse engineer, decompile or disassemble, tamper with, or bypass any security associated with the Software, whether in whole or in part."

**Software use restriction (exact quote):**
> "You may use the software (including updates) incorporated in any Ring Offering solely for purposes of enabling you to use the Ring Offerings and as permitted by this Agreement."

**Modification warning:**
> "If you alter any hardware, software, or other element of Ring Offerings, it may prevent the proper operation of Ring Offerings."

### 4.2 Does `ring-client-api` Violate ToS?

**Likely yes, technically.** The library reverse-engineers Ring's internal API endpoints. Using your own account credentials to access your own camera data is a gray area, but Ring's ToS broadly prohibits reverse engineering.

**However, in practice:**
- `ring-client-api` has existed since ~2018 with 1,500+ GitHub stars
- It's the foundation of `homebridge-ring`, used by thousands
- Amazon/Ring has NOT taken legal action against the project or its users
- Amazon has not issued DMCA takedowns or cease-and-desist letters
- Ring's CES 2026 Appstore announcement suggests they're moving TOWARD third-party access, not away from it
- The EU Data Portability API explicitly supports third-party data access (in EU countries)

**Risk assessment:** LOW for personal use. You're accessing your own cameras with your own credentials. The risk would increase if you were building a commercial product or accessing other people's cameras.

### 4.3 Amazon Blocking Unofficial Access

**Has Amazon actively blocked unofficial API access?**

No confirmed cases of targeted blocking. However:
- Ring has tightened authentication over the years (mandatory 2FA, token rotation)
- Token refresh behavior changes have broken libraries temporarily
- There is no evidence of IP bans, account suspensions, or legal action against users of unofficial APIs
- The `dgreif/ring` library has adapted to every auth change Amazon has made

### 4.4 Privacy Implications

**Automated camera access creates privacy considerations:**
- Storing camera images means storing images of anyone who walks by your property
- Sending images to Claude Vision means sending them to Anthropic's API
- Ring's own data practices have been scrutinized (FTC settlement in 2023)
- Consider retention policies for any stored snapshots

**Recommendations:**
- Do NOT store snapshots long-term -- process and discard
- Use Anthropic's API data retention policies (no training on API data)
- Be mindful of local privacy laws regarding security camera footage
- Keep Ring credentials secure (refresh tokens have password-equivalent value)

---

## 5. Recommended Architecture for Jarvis

### 5.1 The Problem with Direct Vercel Integration

`ring-client-api` cannot run reliably as a Vercel serverless function because:
1. **Token rotation:** Tokens rotate hourly and must be persisted. Serverless functions are stateless and ephemeral.
2. **Firebase registration:** The first token use registers with Firebase. If that registration response is lost (function cold-starts, timeouts), push notifications break permanently.
3. **Connection state:** Event subscriptions (`onNewDing`) require a persistent WebSocket connection. Serverless functions spin down after each request.
4. **Timeout limits:** Vercel Hobby tier = 10s timeout. Even Pro = 15s default (up to 5min with config). Snapshot fetching can take 10-40 seconds on battery cameras.

### 5.2 Recommended: Sidecar Service Architecture

```
                                Ring Cloud
                                    |
                            ring-client-api
                                    |
                    [Ring Sidecar Service]          (persistent Node.js process)
                    - Token management              (auto-refresh, persist to file/DB)
                    - Snapshot on demand             (GET /snapshot/:cameraName)
                    - Event history                  (GET /events/:cameraName)
                    - Event subscription             (WebSocket or SSE to Jarvis)
                    - Health check                   (GET /health)
                                    |
                           HTTPS + API key
                                    |
                    [Jarvis API Routes]             (Vercel serverless)
                    - /api/jarvis/ring/snapshot      (calls sidecar, returns base64)
                    - /api/jarvis/ring/events        (calls sidecar, returns JSON)
                                    |
                           Claude Vision API
                    (snapshot buffer --> analysis)
```

**Where to run the sidecar:**
- **Raspberry Pi** (at home, on local network) -- simplest, cheapest
- **Small VPS** (DigitalOcean $4/mo, Fly.io free tier) -- reliable, always-on
- **Home server / NAS** -- if Jonathan has one
- **Railway / Render** -- managed hosting, free tier available

### 5.3 Sidecar Service Skeleton

```typescript
// ring-sidecar/src/index.ts
import { RingApi, RingCamera } from 'ring-client-api';
import express from 'express';
import * as fs from 'fs';

const TOKEN_FILE = './ring-token.json';
const API_KEY = process.env.SIDECAR_API_KEY;

// Load persisted token
function loadToken(): string {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    return data.refreshToken;
  } catch {
    return process.env.RING_REFRESH_TOKEN!;
  }
}

// Save new token
function saveToken(token: string) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refreshToken: token }));
}

async function main() {
  const ringApi = new RingApi({
    refreshToken: loadToken(),
    cameraStatusPollingSeconds: 120, // reduce battery drain
  });

  // CRITICAL: persist token updates
  ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    console.log('Ring token refreshed, persisting...');
    saveToken(newRefreshToken);
  });

  const app = express();

  // Auth middleware
  app.use((req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // List cameras
  app.get('/cameras', async (req, res) => {
    const cameras = await ringApi.getCameras();
    res.json(cameras.map(c => ({
      name: c.name,
      id: c.id,
      deviceType: c.deviceType,
      batteryLevel: c.batteryLevel,
    })));
  });

  // Get snapshot
  app.get('/snapshot/:cameraId', async (req, res) => {
    const cameras = await ringApi.getCameras();
    const camera = cameras.find(c => c.id.toString() === req.params.cameraId);
    if (!camera) return res.status(404).json({ error: 'Camera not found' });

    try {
      const buffer = await camera.getSnapshot();
      const base64 = buffer.toString('base64');
      res.json({
        image: base64,
        mimeType: 'image/png',
        camera: camera.name,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get snapshot', details: String(err) });
    }
  });

  // Get recent events
  app.get('/events/:cameraId', async (req, res) => {
    const cameras = await ringApi.getCameras();
    const camera = cameras.find(c => c.id.toString() === req.params.cameraId);
    if (!camera) return res.status(404).json({ error: 'Camera not found' });

    const events = await camera.getEvents();
    res.json(events);
  });

  // Health check
  app.get('/health', async (req, res) => {
    try {
      const cameras = await ringApi.getCameras();
      res.json({ status: 'ok', cameras: cameras.length });
    } catch (err) {
      res.status(500).json({ status: 'error', details: String(err) });
    }
  });

  app.listen(3001, () => console.log('Ring sidecar running on :3001'));
}

main().catch(console.error);
```

### 5.4 Jarvis API Route (Vercel Side)

```typescript
// app/api/jarvis/ring/snapshot/route.ts
import { NextResponse } from 'next/server';

const RING_SIDECAR_URL = process.env.RING_SIDECAR_URL; // e.g., https://ring-sidecar.fly.dev
const RING_SIDECAR_KEY = process.env.RING_SIDECAR_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('camera');

  if (!RING_SIDECAR_URL) {
    return NextResponse.json({ error: 'Ring sidecar not configured' }, { status: 503 });
  }

  try {
    const response = await fetch(`${RING_SIDECAR_URL}/snapshot/${cameraId}`, {
      headers: { 'x-api-key': RING_SIDECAR_KEY! },
    });

    if (!response.ok) {
      throw new Error(`Sidecar returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch snapshot from Ring sidecar' },
      { status: 502 }
    );
  }
}
```

### 5.5 Integration with Claude Vision

Once you have the base64 image from the sidecar, pass it to Claude Vision in the chat route:

```typescript
// In the Jarvis chat route, when the user asks about cameras:
const snapshotResponse = await fetch(`${RING_SIDECAR_URL}/snapshot/${cameraId}`, {
  headers: { 'x-api-key': RING_SIDECAR_KEY },
});
const { image, mimeType } = await snapshotResponse.json();

// Add to Claude message as an image block
const messages = [
  {
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: image,
        },
      },
      {
        type: 'text',
        text: 'What do you see at my front door right now?',
      },
    ],
  },
];
```

---

## 6. Implementation Phases (Suggested)

### Phase 1: Basic Snapshot (Simplest Valuable Thing)
1. Deploy ring sidecar service (Fly.io or Raspberry Pi)
2. Generate refresh token via `ring-auth-cli`
3. Implement `/snapshot` and `/cameras` endpoints
4. Create Jarvis API route to proxy snapshot requests
5. Add `check_camera` chat tool that pulls snapshot and sends to Claude Vision
6. **Result:** "Hey Jarvis, what's happening at my front door?" works

### Phase 2: Event History
1. Add `/events` endpoint to sidecar
2. Add `get_camera_events` chat tool to Jarvis
3. Store recent events in Turso for quick retrieval
4. Include camera events in morning briefing when relevant
5. **Result:** "Were there any visitors yesterday?" works

### Phase 3: Real-Time Monitoring (Optional, Complex)
1. Add WebSocket/SSE event stream from sidecar to Jarvis
2. Subscribe to `onNewDing` events
3. Auto-capture snapshot on motion/ding events
4. Push notification to Jarvis with Claude Vision analysis
5. **Result:** Proactive "Someone is at your door" alerts with visual context

### Phase 4: Official API Migration (Future)
1. Monitor Ring Appstore developer program
2. If/when personal use becomes viable, migrate from unofficial to official API
3. **Result:** Legitimate, stable, supported integration

---

## 7. Cost Considerations

| Component | Cost | Notes |
|-----------|------|-------|
| Ring Protect Plan | $3.99/mo (Basic) or $12.99/mo (Plus) | Required for video recording history |
| Sidecar hosting | $0-5/mo | Fly.io free tier, DigitalOcean $4/mo, or Raspberry Pi (one-time ~$35-75) |
| Claude Vision API | ~$0.001-0.003 per snapshot | Depends on image size and model (Haiku vs Sonnet) |
| ring-client-api | Free | Open source, MIT license |

---

## 8. Open Questions

1. **What Ring cameras does Jonathan have?** Battery vs. wired matters enormously for snapshot reliability.
2. **Does Jonathan have a Ring Protect subscription?** Required for video event history and recording URLs.
3. **Does Jonathan run Home Assistant?** If yes, HA bridge might be simpler than a custom sidecar.
4. **Where should the sidecar run?** Raspberry Pi at home vs. VPS in the cloud? Pi is cheaper but requires local network management.
5. **Should the Ring MCP server be used directly?** `jpcors/ring-mcp` already implements the pattern, though it's minimal.
6. **Is the official Ring Developer API worth applying for?** The Appstore is launching Spring 2026 -- timing could align with Jarvis development.

---

## Sources

### Primary (HIGH confidence)
- [dgreif/ring GitHub repository](https://github.com/dgreif/ring) -- 1.5k stars, actively maintained
- [dgreif/ring releases](https://github.com/dgreif/ring/releases) -- v14.3.0, Feb 2025
- [dgreif/ring Refresh Tokens wiki](https://github.com/dgreif/ring/wiki/Refresh-Tokens) -- auth flow documentation
- [dgreif/ring Snapshot Limitations wiki](https://github.com/dgreif/ring/wiki/Snapshot-Limitations) -- battery vs wired behavior
- [Ring Terms of Service](https://ring.com/terms) -- legal restrictions
- [Ring Appstore](https://ring.com/appstore) -- official third-party app platform
- [Ring Developer Portal](https://developer.amazon.com/ring) -- official developer program

### Secondary (MEDIUM confidence)
- [ring-client-api npm](https://www.npmjs.com/package/ring-client-api) -- package health and downloads
- [Snyk package health](https://snyk.io/advisor/npm-package/ring-client-api) -- maintenance classification
- [jpcors/ring-mcp](https://github.com/jpcors/ring-mcp) -- MCP server implementation
- [tsightler/ring-mqtt](https://github.com/tsightler/ring-mqtt) -- MQTT bridge for Home Assistant
- [Ring HA integration](https://www.home-assistant.io/integrations/ring/) -- Home Assistant docs
- [HA community: Ring integration abandoned](https://community.home-assistant.io/t/ring-integration-abandoned-iso-dev-to-submit-existing-pr-ready-since-nov-2025/978712) -- snapshot issues

### Tertiary (LOW confidence -- needs validation)
- [Android Authority: Ring upgrades 2026](https://www.androidauthority.com/ring-camera-upgrades-2026-3630132/) -- CES announcement details
- [Ring EU Data Portability](https://ring.com/eu/en/data-portability) -- EU-only API
- [vogler Ring download gist](https://gist.github.com/vogler/5bb22703e2dc95f6bc4eb0c35abcd600) -- browser bookmarklet approach
