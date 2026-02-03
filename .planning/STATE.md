# Project State: Ethereal Flame Studio

**Purpose:** Session continuity and context preservation for Claude

---

## Project Reference

**Core Value:** Phone to published video without touching a computer

**Current Focus:** Phase 11 - Production Deployment (Jarvis)

**Key Files:**
- `.planning/PROJECT.md` - Project definition
- `.planning/REQUIREMENTS.md` - v1 requirements (41 total)
- `.planning/ROADMAP.md` - Phase structure (now includes Phase 7)
- `.planning/research/SUMMARY.md` - Architecture decisions
- `.planning/phases/05-n8n/05-SUMMARY.md` - Phase 5 summary
- `.planning/phases/07-blender-vfx-pipeline/07-RESEARCH.md` - Phase 7 master research

---

## Current Position

**Phase:** 11 (Production Deployment - Jarvis)
**Plan:** 02 of 6 complete
**Status:** In progress
**Last activity:** 2026-02-03 - Completed 11-02 API Authentication

**Phase 1 (COMPLETE):**
- [x] 01-01: Project scaffolding
- [x] 01-02: Audio analyzer
- [x] 01-03: Particle system core
- [x] 01-04: Star Nest skybox
- [x] 01-05: Ethereal Mist mode
- [x] 01-06: Ethereal Flame mode
- [x] 01-07: Mobile-friendly UI
- [x] 01-08: Integration (APPROVED - visual quality deferred)

**Phase 2 (COMPLETE):**
- [x] 02-01: Template types + store
- [x] 02-02: Built-in presets (6 curated)
- [x] 02-03: Template gallery UI
- [x] 02-04: Save template with screenshot
- [x] 02-05: Advanced editor
- [x] 02-06: Verification (user pre-approved)

**Phase 3 (COMPLETE):**
- [x] 03-01: Pre-analysis for offline rendering
- [x] 03-02: Frame capture system
- [x] 03-03: Flat export pipeline (1080p/4K)
- [x] 03-04: 360 monoscopic pipeline
- [x] 03-05: 360 stereoscopic pipeline
- [x] 03-06: FFmpeg + VR metadata
- [x] 03-07: Headless rendering mode
- [x] 03-08: Render queue with persistence

**Phase 4 (COMPLETE):**
- [x] 04-01: SQLite database + file naming
- [x] 04-02: BullMQ queue infrastructure
- [x] 04-03: Render worker with post-processing
- [x] 04-04: Whisper transcription microservice
- [x] 04-05: Transcription queue integration
- [x] 04-06: Google Drive sync via rclone
- [x] 04-07: ntfy push notifications
- [x] 04-08: Google Sheets metadata export
- [x] 04-09: Batch upload UI

**Phase 5 (COMPLETE):**
- [x] 05-01: Cloudflare Tunnel setup
- [x] 05-02: n8n self-hosted deployment
- [x] 05-03: Webhook integration (render -> n8n)
- [x] 05-04: YouTube upload workflow

**Phase 7 (NOT STARTED):**
- [ ] 07-01: Blender + MCP installation and configuration
- [ ] 07-02: Audio analysis expansion
- [ ] 07-03: Mantaflow fire simulation template
- [ ] 07-04: Mantaflow water simulation template
- [ ] 07-05: Audio-to-keyframe parameter mapping
- [ ] 07-06: VR video import and equirectangular setup
- [ ] 07-07: Depth map extraction from 360° footage
- [ ] 07-08: Shadow catcher and VR compositing
- [ ] 07-09: Video masking and chroma keying
- [ ] 07-10: EDM volumetric laser effects
- [ ] 07-11: EDM LED grid and strobe effects
- [ ] 07-12: Multi-layer compositor and render pipeline

**Phase 11 (IN PROGRESS - Jarvis Production Deployment):**
- [x] 11-01: Notion SDK migration (Direct SDK for Vercel serverless)
- [x] 11-02: API authentication (X-Jarvis-Secret)
- [ ] 11-03: Rate limiting
- [ ] 11-04: Error boundaries
- [ ] 11-05: Production deployment
- [ ] 11-06: Monitoring and alerts

**Progress:**
```
Phase 1:  [##########] 100% (8/8 plans) - COMPLETE
Phase 2:  [##########] 100% (6/6 plans) - COMPLETE
Phase 3:  [##########] 100% (8/8 plans) - COMPLETE
Phase 4:  [##########] 100% (9/9 plans) - COMPLETE
Phase 5:  [##########] 100% (4/4 plans) - COMPLETE
Phase 7:  [          ]   0% (0/12 plans) - NOT STARTED
Phase 11: [####      ]  33% (2/6 plans) - IN PROGRESS
Overall:  [#######   ]  68% (36/53 plans)
```

**Note:** Visual quality (particle asymmetry, organic shapes) flagged for v2 redesign.

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements (v1) | 41 |
| Requirements (v2/Phase 7) | 18 |
| Requirements mapped | 59 |
| Phases total | 7 |
| Phases complete | 5 |
| Plans complete | 35/47 |

---

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-26 | Next.js + Three.js stack | Same as reference code, web-accessible |
| 2026-01-26 | Hybrid browser + GPU worker | WebGL 4K limit requires server-side rendering for 8K |
| 2026-01-26 | Blender for 8K rendering | Mature Python API, headless support, proven for VR |
| 2026-01-26 | 5 sequential phases | Clear dependencies, preview before render before automate |
| 2026-01-26 | transpilePackages: ['three'] | Critical for R3F compatibility with Next.js |
| 2026-01-26 | TypeScript strict mode | Type safety from project start |
| 2026-01-26 | Full-viewport canvas layout | Immersive experience with overflow:hidden |
| 2026-01-26 | 512 FFT size (01-02) | Balances frequency resolution with 60fps performance |
| 2026-01-26 | Beat threshold 0.05 (01-02) | Low threshold for sensitive bass detection with 80ms cooldown |
| 2026-01-26 | Backward compatibility aliases (01-02) | mids/treble mirror mid/high for existing components |
| 2026-01-26 | CPU lifetime management (01-03) | Float32Array refs for zero GC pressure, organic particle lifecycle |
| 2026-01-26 | Size-over-lifetime curve (01-03) | 37% birth -> 100% at 20% life -> 50% death (Unity reference) |
| 2026-01-26 | BackSide skybox rendering (01-04) | Large sphere with BackSide material for infinite background |
| 2026-01-26 | DarkWorld1 as default skybox (01-04) | User's preferred preset (THE ONE) |
| 2026-01-26 | Peak lifetime at 50-60% for mist (01-05) | Creates centered, gentle bloom effect for cloud-like particles |
| 2026-01-26 | Pastel color palette for mist (01-05) | Soft colors suitable for meditation and ambient backgrounds |
| 2026-01-26 | Very slow drift for mist (01-05) | 0.004-0.008 maxSpeed mimics gentle floating clouds |
| 2026-01-26 | 0.7 alpha softness multiplier (01-05) | Prevents harsh edges, maintains ethereal cloud quality |
| 2026-01-26 | GLSL webpack loader (01-05) | Fixed pre-existing build error blocking verification |
| 2026-01-26 | Tailwind v4 PostCSS plugin (01-05) | Required @tailwindcss/postcss for build compatibility |
| 2026-01-26 | 70% upward velocity bias (01-06) | Creates convincing fire effect while maintaining organic spread |
| 2026-01-26 | Age-based flame colors (01-06) | Yellow->Orange->Red mimics natural fire temperature gradient |
| 2026-01-26 | Sin/cos turbulence for flame (01-06) | Organic flicker without perlin noise overhead |
| 2026-01-26 | Touch-friendly 44px minimum (01-07) | Mobile usability per iOS/Android guidelines |
| 2026-01-26 | Collapsible control panel (01-07) | Maximizes visual area when controls not needed |
| 2026-01-26 | Semi-transparent controls (01-07) | bg-black/70 backdrop-blur-md doesn't obstruct visuals |
| 2026-01-26 | Debug overlay toggle (01-07) | Audio levels visible during development, hideable in production |
| 2026-01-27 | getState() pattern in useFrame (01-08) | Prevents React re-renders on every audio frame, maintaining 60fps |
| 2026-01-27 | 0.6 lerp factor for audio (01-08) | Fast but smooth audio response - faster than typical 0.1-0.3 |
| 2026-01-27 | Immediate beat detection (01-08) | No lerp for isBeat flag, ensures snappy pulse response |
| 2026-01-27 | Subtle skybox modulation (01-08) | 0.3/0.2 amplitude/bass multipliers prevent jarring rotation changes |
| 2026-01-27 | crypto.randomUUID() for template IDs (02-01) | Browser native, no external dependencies |
| 2026-01-27 | zustand persist for localStorage (02-01) | Only user templates persisted, built-ins from code |
| 2026-01-27 | preserveDrawingBuffer for screenshots (02-04) | Required for canvas.toDataURL() to work |
| 2026-01-27 | 150x150 JPEG thumbnails (02-04) | Center-crop for consistent aspect ratio |
| 2026-01-27 | Ref-based screenshot capture (02-04) | Invisible component inside Canvas |
| 2026-01-27 | selectSerializableState pattern (02-01) | Extract saveable state from stores |
| 2026-01-27 | IndexedDB caching for pre-analysis (03-01) | 7-day cache avoids re-analyzing same audio |
| 2026-01-27 | Double-buffering for frame capture (03-02) | Prevents GPU stalls during async readback |
| 2026-01-27 | Seeded RNG for particle positions (03-03) | Enables deterministic frame-accurate rendering |
| 2026-01-27 | Cubemap to equirect via shader (03-04) | GPU-accelerated conversion, correct spherical projection |
| 2026-01-27 | 64mm IPD for stereo capture (03-05) | Standard human interpupillary distance for VR |
| 2026-01-27 | Top/Bottom stereo layout (03-05) | YouTube VR specification: left eye on top |
| 2026-01-27 | Python spatial-media for VR metadata (03-06) | Google's official tool for sv3d/st3d metadata injection |
| 2026-01-27 | File-based job queue for render server (03-07) | Simple, filesystem-based persistence without database |
| 2026-01-27 | SQLite with WAL mode (04-01) | Concurrent read safety for batch workers |
| 2026-01-27 | better-sqlite3 sync API (04-01) | Simpler than async, high performance for Node.js |
| 2026-01-27 | BullMQ over Bull (04-02) | Active development, native TypeScript, better performance |
| 2026-01-27 | Redis noeviction policy (04-02) | Critical - BullMQ fails if Redis evicts job data |
| 2026-01-27 | faster-whisper over OpenAI API (04-04) | 4x faster, local GPU, no API costs |
| 2026-01-27 | Separate Whisper microservice (04-04) | Isolates Python from Node.js, independent scaling |
| 2026-01-27 | rclone over Google Drive API (04-06) | Simpler setup, built-in retry logic, resumable uploads |
| 2026-01-27 | ntfy over web push (04-07) | Self-hosted option, simple HTTP API, no VAPID keys |
| 2026-01-27 | Google Sheets API for export (04-08) | Human-readable view, collaboration-friendly |
| 2026-01-27 | Self-hosted n8n (05-02) | YouTube upload requires custom OAuth callback URL |
| 2026-01-27 | Docker profiles for optional services (05-01) | Clean separation of automation and remote access services |
| 2026-01-27 | Cloudflare Tunnel over VPN (05-01) | Free, no port exposure, encrypted end-to-end |
| 2026-01-27 | Fire-and-forget webhooks (05-03) | Don't block render queue on notification delivery |
| 2026-01-27 | Exponential backoff for retries (05-03) | Graceful handling of transient failures |
| 2026-01-30 | Phase 7: Blender VFX Pipeline added | Physics simulations, VR compositing, EDM effects |
| 2026-01-30 | Hybrid rendering approach | Three.js preview, Blender cinema quality |
| 2026-01-30 | Blender MCP integration | Claude-controlled scene setup via MCP protocol |
| 2026-01-30 | Audio-to-keyframe system | Export analysis JSON for Blender Python scripts |
| 2026-02-03 | X-Jarvis-Secret header for API auth (11-02) | Standard custom header pattern, middleware validation |
| 2026-02-03 | _secret query param for SSE auth (11-02) | EventSource API limitation workaround |
| 2026-02-03 | Optional auth in dev mode (11-02) | Allow local development without configuring secrets |
| 2026-02-02 | Direct Notion SDK over MCP (11-01) | child_process.spawn() breaks Vercel serverless |
| 2026-02-02 | Park MCP code in NotionClient.mcp.ts (11-01) | Preserve for future MacBook daemon integration |
| 2026-02-02 | dataSources.query() for Notion SDK v5 (11-01) | API change from databases.query |

### Technical Context

- **WebGL limit:** 4096x4096 max texture in headless Chromium (cannot render 8K in browser)
- **Unity reference:** Size-over-lifetime curve is key to ethereal look (37% birth, 100% at 20% life, 50% death)
- **Particle count:** Only need ~1000-2000 particles with proper lifetime curves
- **VR metadata:** Must use Google Spatial Media tools for sv3d/st3d metadata injection
- **Template system:** 6 built-in presets, localStorage persistence for user templates
- **Render pipeline:** CubeCamera for 360, FFmpeg for encoding, Docker for headless
- **Batch infrastructure:** SQLite + BullMQ + Redis for persistent job queue
- **Whisper service:** Python FastAPI microservice with GPU support via CUDA
- **External services:** rclone for Google Drive, ntfy for notifications, googleapis for Sheets
- **Remote access:** Cloudflare Tunnel for secure access without port forwarding
- **Workflow automation:** Self-hosted n8n with YouTube OAuth for auto-publishing

### Blockers

- **Blender Installation:** Requires Blender 5.0+ to be installed via winget
- **Blender MCP:** Requires MCP addon installation and Claude Desktop config

### TODOs

- [x] Phase 1: Foundation (Web UI + Visual Engine)
- [x] Phase 2: Template System
- [x] Phase 3: Rendering Pipeline (frame capture, export, headless)
- [x] Phase 4: Automation (batch queue, transcription, sync, notifications)
- [x] Phase 5: n8n Integration (workflow automation, remote access)
- [ ] Phase 7: Blender VFX Production Pipeline (12 plans)

**Phase 7 Research Complete:**
- [x] 07-RESEARCH.md - Master research document
- [x] 07-RESEARCH-AUDIO-STYLES.md - Audio analysis expansion
- [x] 07-RESEARCH-VR-COMPOSITING.md - VR compositing techniques
- [x] 07-RESEARCH-DEPTH-MAPS.md - Depth extraction methods
- [x] 07-RESEARCH-EDM-EFFECTS.md - Light show visual styles
- [x] 07-RESEARCH-BLENDER-360-STEREO.md - Blender 360/stereo rendering

**Future Considerations:**
- [ ] Visual quality improvements (particle asymmetry, organic shapes)
- [ ] Multi-platform posting via Blotato

---

## Session Continuity

### Last Session
- **Date:** 2026-02-02
- **Action:** Executed Plan 11-01: Notion SDK Migration
- **Outcome:** Replaced MCP-based Notion integration with Direct SDK for Vercel serverless

**Work completed:**
- Installed @notionhq/client ^5.9.0 dependency
- Rewrote NotionClient.ts with direct SDK (no child_process)
- Parked MCP code in NotionClient.mcp.ts for future MacBook daemon
- Updated toolExecutor.ts and BriefingBuilder.ts to use direct SDK

**Stopped at:** Completed 11-01-PLAN.md
**Resume file:** None

### v1 Complete (Phases 1-5)

The phone-to-published-video pipeline is fully implemented:

1. **Trigger** render from phone (via Cloudflare Tunnel remote access)
2. **Render** video with template (Web UI or API)
3. **Transcribe** audio via Whisper (for video description)
4. **Sync** to Google Drive (via rclone)
5. **Notify** n8n via webhook (on completion)
6. **Upload** to YouTube (via n8n workflow)
7. **Alert** user (via ntfy push notification)

### Phase 7 Overview (Blender VFX Pipeline)

**Goal:** Transform from particle orb generator to full VFX production pipeline

**Capabilities to Add:**
1. **Physics-based fire/water** - Mantaflow simulations driven by audio
2. **VR compositing** - Overlay effects onto real 360° footage
3. **Depth-aware rendering** - Realistic shadows and occlusion
4. **EDM light shows** - Volumetric lasers, LED grids, strobes
5. **Multi-layer output** - Combine all effects for VR video

**Architecture:**
- Hybrid approach: Three.js for preview, Blender for cinema quality
- Blender MCP for Claude-controlled scene setup
- Audio JSON export for Blender Python keyframe generation

### Context to Preserve
- All 5 v1 phases complete with 35 plans executed
- Phase 7 adds 12 more plans (47 total)
- Docker Compose orchestrates all services
- Documentation in /docs for user setup
- Phase 7 research in `.planning/phases/07-blender-vfx-pipeline/`

---

*Last updated: 2026-02-02 - Completed 11-01 Notion SDK Migration*
