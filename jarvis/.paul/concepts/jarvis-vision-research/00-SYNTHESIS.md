# Jarvis Vision — Research Synthesis

**Date:** 2026-03-01
**Status:** Research complete, ready for milestone/phase scoping
**Research files:** 3 documents totaling ~2,900 lines of detailed findings

---

## The Big Picture

Jonathan wants to give Jarvis **eyes** — the ability to see through multiple sources:
- **Home security** (Ring cameras)
- **Phone camera** (pantry photos, anything you point at)
- **Screenshots & uploads** (documents, receipts, images in chat)
- **Future:** Screen awareness, real-world via phone, etc.

### The Key Insight

**Vision is NOT a new system — it's a new sense for the existing Brain.**

Claude's Messages API already accepts image content blocks natively. Jarvis's `sdkBrain.ts` already accepts `Anthropic.MessageParam[]` which supports multimodal content. The only change needed for Phase 1 is allowing the chat route to accept image data alongside text.

---

## What We Learned (Decisions & Discoveries)

### 1. Ring Integration: `ring-client-api` is the clear winner

| Approach | Verdict |
|----------|---------|
| `ring-client-api` (unofficial npm) | **USE THIS** — v14.3.0, 1.5K stars, ~2K weekly downloads, actively maintained |
| Browser automation (Playwright) | Rejected — strictly inferior in every dimension |
| Home Assistant bridge | Only if already running HA |
| Official Ring API (Spring 2026) | Enterprise-focused, not viable for personal use today |
| IFTTT / email parsing | No image data, only metadata |
| Alexa API | Wrong tool for the job |

**Critical constraints:**
- Ring tokens rotate **hourly** — must persist every new token
- First token refresh registers with Firebase — if lost, push notifications break **permanently**
- Battery cameras can't snapshot while recording (30-40s blackout during motion)
- **Wired cameras strongly preferred** for reliable snapshots
- Requires **persistent process** (can't run on Vercel serverless)
- ToS technically prohibits reverse engineering, but 8+ years of community use with no enforcement

**Architecture: Sidecar service required**
```
Ring Cloud → ring-client-api → [Sidecar Service] → HTTPS → [Jarvis on Vercel]
                                  (persistent)                  (serverless)
```
Sidecar options: Fly.io ($0-7/mo), Raspberry Pi ($35-75 one-time), Render free tier, small VPS ($4/mo)

### 2. Vision Models: Claude is the default, Gemini for video

| Model | Cost/Image | Video? | Best For |
|-------|-----------|--------|----------|
| **Claude Haiku 4.5** | ~$0.0008 | No | Routine frame analysis, tool integration (ALREADY INTEGRATED) |
| **Claude Sonnet 4.6** | ~$0.005 | No | Complex scene understanding |
| **Gemini 2.5 Flash** | ~$0.0003 | **YES** | Video clips, temporal reasoning, cheapest bulk |
| YOLO26 (local) | Free | Frame-by-frame | Real-time detection pre-filter |
| Frigate NVR (local) | Free | RTSP streams | Full local monitoring with Coral accelerator |

**Key discoveries:**
- Motion-triggered analysis: **$0.19-5.70/month** (Haiku). Continuous polling: **$1,100/month**. Motion-triggered is the only sane approach.
- Gemini's killer feature: **temporal reasoning** — "Person arrived at 0:02, rang bell at 0:05, left package at 0:08." Claude can't do this.
- Claude refuses face identification by policy — stick to person detection, not identification
- Claude sees image + has access to all tools in same turn (Gemini doesn't have this)
- iPhone photos default to HEIC — need client-side conversion to JPEG

### 3. Architecture: Vision as a Sense Layer

```
+================================================================+
|                        JARVIS OS                                |
|================================================================|
|  BRAIN    — Claude (chat, tools, reasoning)                     |
|  MEMORY   — Vector store (embeddings, consolidation)            |
|  SENSES   — Notion, Calendar, Vision (NEW)                      |
|  SELF-IMPROVEMENT — Haiku critic → Opus reflection              |
+================================================================+
```

**VisionSource abstraction** — plugin pattern where each source implements:
```typescript
interface VisionSource {
  getSnapshot(): Promise<ImageCapture>
  getRecentEvents(since: Date): Promise<VisionEvent[]>
  isAvailable(): Promise<boolean>
}
```

Ring, phone uploads, screenshots all implement this interface.

**Vercel constraints are manageable:**
- Ring snapshots ~200KB JPEG → base64 ~267KB → well under 4.5MB body limit
- Claude token cost: ~1,846 tokens per 1080p frame → ~$0.0006/analysis (Haiku)
- Storage: Vercel Blob, ~$0.014/month for 100 snapshots/day, auto-cleanup after 48h
- Timeout: Ring snapshot (~5s) + Claude analysis (~5s) = ~10s, safe within 60s limit

---

## Phased Roadmap

### Phase 1: Chat Vision (fits in v4.2 — minimal effort)
- Accept image uploads in Jarvis chat
- Pass to Claude as image content block alongside text
- Claude sees image + can call existing tools (update_pantry, remember_fact, etc.)
- Client-side HEIC→JPEG conversion, resize to ≤1024px
- **Effort:** 2-3 sessions | **New infra:** None | **Cost:** ~$0/month

### Phase 2: Ring Camera Snapshots (future milestone)
- Deploy Ring sidecar service (Fly.io or Pi)
- `ring-client-api` with token persistence
- "Show me the front door" chat command
- On-demand snapshot → Claude Haiku analysis
- **Effort:** 3-4 sessions | **New infra:** Sidecar service | **Cost:** ~$5-10/month (hosting + API)

### Phase 3: Event-Driven Security (future milestone)
- Motion/doorbell events → webhook to Jarvis
- Auto-capture snapshot → Claude analysis → notification
- Security events in morning briefing
- Vision events stored in memory
- **Effort:** 4-5 sessions | **New infra:** Vercel Pro or relay service | **Cost:** ~$20-25/month

### Phase 4: Video Understanding with Gemini (future milestone)
- Add `@google/genai` SDK
- Ring recording clips → Gemini Flash for temporal analysis
- "What happened in the last hour?" with timeline
- **Effort:** 3-4 sessions | **New infra:** Gemini API key | **Cost:** ~$5-10/month

### Phase 5: Local Edge Detection (future, requires hardware)
- Frigate NVR + Google Coral USB ($25-60)
- YOLO pre-filtering (100+ FPS, free)
- Only sends interesting frames to cloud API
- Drops API costs to near-zero
- **Effort:** 5+ sessions | **New infra:** Always-on machine + Coral | **Cost:** ~$5 electricity

---

## Answered Questions (2026-03-01)

1. **Ring cameras: BATTERY** — This means snapshots are blocked during recording (30-40s blackout during motion events). Stale images likely during active events. Wired cameras would be better but not what Jonathan has.
2. **Ring Protect: YES** — Full access to video recording history and clip download URLs.
3. **Home Assistant: NO** — Custom sidecar is the path, not HA bridge.
4. **Sidecar hosting: CLOUD for now** — Jonathan's son has Raspberry Pis but Jonathan wants to research ALL cloud options beyond what was found (Fly.io, Render, Railway, DigitalOcean — need broader survey).
5. **Vercel plan:** Still unknown — Hobby can't poll frequently. Pro ($20/mo) enables minute-level cron.

### Implication of Battery Cameras
- `getSnapshot()` returns cached image (up to 2 min old) during recording
- Best strategy: pull the **recording clip** via `getRecordingUrl()` (Ring Protect enables this) instead of relying on snapshots during motion events
- For on-demand "show me the front door" (no active motion), snapshots work fine
- Consider: extract a frame from the recording clip for Claude analysis during motion events

---

## What NOT To Do

1. Don't implement face recognition (Claude refuses it, privacy nightmare)
2. Don't poll cameras continuously via API ($1,100/month)
3. Don't add Gemini for Phase 1 (Claude handles images fine, add Gemini only when video understanding is needed)
4. Don't self-host vision models on Vercel (need GPU, incompatible with serverless)
5. Don't pursue browser automation against ring.com (inferior in every way to `ring-client-api`)
6. Don't build custom object detection (Frigate already solves this)

---

## Sidecar Hosting — Cloud Options (Researched 2026-03-01)

20+ platforms evaluated. Full details in `04-cloud-sidecar-hosting.md`.

### Top 3 Picks

| Rank | Platform | Cost/mo | Why |
|------|----------|---------|-----|
| 1st | **Fly.io** | ~$2.17 | Managed PaaS, native WebSocket, persistent volumes, auto-TLS, zero sysadmin, `flyctl deploy` |
| 2nd | **Oracle Cloud Free** | $0 | Forever free ARM instances (4 OCPU, 24GB RAM). Risk: idle instances reclaimed if CPU <20% for 7 days. Mitigate by converting to PAYG. |
| 3rd | **Vultr** | $2.50-3.50 | Cheapest US VPS. Unmanaged — requires PM2/systemd + Caddy/nginx setup. |

### Disqualified

| Platform | Why |
|----------|-----|
| Heroku | Ephemeral filesystem — token lost on every restart |
| Google Cloud Run | ~$65/mo for always-warm (serverless pricing, wrong paradigm) |
| Azure ACI | ~$33/mo minimum |
| Koyeb free | Sleeps after 1hr, kills WebSockets |
| Porter.run | $200+/mo (Kubernetes, absurd for this) |
| Cloudflare Workers | ring-client-api won't run in Workers runtime |

### Other Viable Options

| Platform | Cost | Notes |
|----------|------|-------|
| Railway | $5/mo | Good DX, $5 base fee minimum |
| DigitalOcean | $4/mo | Reliable VPS, unmanaged |
| AWS Lightsail | $3.50-5/mo | AWS simplicity, unmanaged |
| Render | $7/mo | Works but 3x Fly.io cost |
| Northflank | $0 | Free sandbox, always-on claimed but opaque limits |
| Hetzner + Coolify | ~$4-5/mo | Best value VPS but EU-only |

---

## Local Security System — Replaces Ring (Researched 2026-03-01)

Jonathan's wife wants to replace Ring entirely with a local system. This is **better for Jarvis** — eliminates unofficial APIs, token rotation, cloud dependency, and subscription fees.

### Recommendation: Reolink PoE Cameras + Frigate NVR

**Why Reolink:** Best price-to-quality ($55-120/camera), proven Frigate integration via go2rtc, RTSP on all PoE models, no proprietary lock-in, wife-friendly app (4.4/5 App Store), and a **PoE doorbell for $93** that replaces Ring doorbell.

**Why Frigate:** Free, open source, full REST API + MQTT, real-time AI detection (person/vehicle/animal/package), runs on a $150-200 mini PC with Hailo/Coral accelerator.

### How This Changes the Jarvis Architecture

**BEFORE (Ring):**
```
Ring Cloud → ring-client-api → Sidecar (Fly.io $2/mo) → Jarvis (Vercel)
```

**AFTER (Local):**
```
Cameras (local) → Frigate (local) → Cloudflare Tunnel (free) → Jarvis (Vercel)
```

**What this eliminates:** ring-client-api, hourly token rotation, Ring Protect ($200/yr), cloud sidecar ($24/yr), battery snapshot limitations, cloud dependency.

**What this adds:** Mini PC (~$180), AI accelerator (~$70), PoE switch (~$65), cameras, Ethernet cabling. All one-time costs.

### Pricing Tiers

| Tier | Cameras | Total Cost | Key Difference |
|------|---------|-----------|----------------|
| Budget | 4 + doorbell | $493 | Pi 5, Coral, 5MP cameras |
| Mid-range | 6 + doorbell | $918 | N100 mini PC, Hailo-8L, mix of 4K+5MP |
| Premium | 8 + doorbell | $1,611 | CX810 color night vision, managed PoE switch, UPS |

**vs Ring:** 8-camera Ring setup = $1,200 hardware + $200/yr subscription. Local premium pays for itself in 2-3 years, then saves $200/yr forever.

### Wife Test: 3.7/5

The wife uses the **Reolink app** (not Frigate). Same experience as Ring: doorbell notifications, live view, two-way audio. Frigate is the developer's tool — she never touches YAML or Docker.

### Bridge: Cloudflare Tunnel (Free)

Cloudflare Tunnel connects local Frigate to Vercel-hosted Jarvis. No port forwarding, no exposed home IP, auto-TLS. Simpler and cheaper than the Fly.io sidecar that Ring required.

### Full details: `05-local-security-systems.md` (1,152 lines)

---

## Detailed Research Files

| File | Lines | Content |
|------|-------|---------|
| `01-ring-integration-research.md` | 771 | ring-client-api deep dive, auth flow, code examples, browser automation analysis, ToS, all alternatives evaluated |
| `02-vision-model-landscape.md` | 879 | Claude/Gemini/HuggingFace comparison, pricing matrices, code examples, security-specific models, Frigate NVR, cost projections |
| `03-jarvis-vision-architecture.md` | 1,254 | Full architecture design, VisionSource interface, Vercel constraints, integration patterns, code examples, phased roadmap |
| `04-cloud-sidecar-hosting.md` | ~600 | 20+ cloud platforms compared for always-on Node.js sidecar hosting |
| `05-local-security-systems.md` | 1,152 | Reolink/Amcrest/UniFi/Tapo/Eufy comparison, Frigate NVR, doorbell replacements, 3 pricing tiers, wife test, network architecture, Jarvis integration code |
