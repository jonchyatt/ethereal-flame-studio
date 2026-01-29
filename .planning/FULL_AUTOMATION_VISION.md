# Full Automation Vision: Ethereal Flame Studio

**Created:** 2026-01-28
**Status:** Draft for Review
**Purpose:** Capture complete automation pipeline including multi-machine rendering and YouTube optimization

---

## The Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB APP (Vercel)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  1. Configure orb (colors, audio reactivity, effects)                 │  │
│  │  2. Preview in real-time WebGL                                        │  │
│  │  3. Select render machine: [Desktop ▼] [Laptop] [Other]              │  │
│  │  4. Select output format: [YouTube 1080p ▼] [YouTube 4K] [VR 360]    │  │
│  │  5. Click [RENDER] → sends job to n8n                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         n8n ORCHESTRATOR (Cloud or Self-Hosted)             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  - Receives render job via webhook                                    │  │
│  │  - Validates settings and audio file                                  │  │
│  │  - Routes to selected render machine via Cloudflare Tunnel           │  │
│  │  - Monitors job progress                                              │  │
│  │  - On complete: triggers YouTube upload workflow                      │  │
│  │  - Sends notification (Slack/Email/ntfy)                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│  RENDER: Desktop (GPU)  │ │  RENDER: Laptop (GPU)   │ │  RENDER: Other          │
│  render-desktop.domain  │ │  render-laptop.domain   │ │  render-other.domain    │
│  ─────────────────────  │ │  ─────────────────────  │ │  ─────────────────────  │
│  RTX 4090 (24GB VRAM)   │ │  RTX 3070 (8GB VRAM)    │ │  Custom config          │
│  High priority renders  │ │  Overflow/batch jobs    │ │  Future expansion       │
│  ─────────────────────  │ │  ─────────────────────  │ │  ─────────────────────  │
│  - Node.js + Puppeteer  │ │  - Node.js + Puppeteer  │ │  - Same stack           │
│  - Headless Chrome      │ │  - Headless Chrome      │ │                         │
│  - FFmpeg encoding      │ │  - FFmpeg encoding      │ │                         │
│  - faster-whisper       │ │  - faster-whisper       │ │                         │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
           │                         │                          │
           └─────────────────────────┴──────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST-PROCESSING + UPLOAD                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  1. Render complete webhook → n8n                                     │  │
│  │  2. Whisper transcription → generates description                    │  │
│  │  3. YouTube upload with optimized metadata:                          │  │
│  │     - Title: "[Audio Name] | Ethereal Flame Visualization"           │  │
│  │     - Description: Whisper transcript + template info                │  │
│  │     - Tags: meditation, visualization, audio reactive, [genre]       │  │
│  │     - Thumbnail: Auto-generated or uploaded                          │  │
│  │  4. Optional: Cross-post to TikTok, Instagram via Blotato           │  │
│  │  5. Update Google Sheet with video URL and metadata                  │  │
│  │  6. Send notification: "Video published!"                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Missing from Current Plan

### 1. Multi-Machine Render Farm

**Current assumption:** Single render server
**Reality:** User has 2-3 machines (desktop, laptop, possibly more)

**Required additions:**

| Component | Description |
|-----------|-------------|
| Machine Registry | Config file or database listing available render machines |
| Machine Selector UI | Dropdown in web app to choose target machine |
| Health Check | API endpoint on each machine to verify availability |
| Cloudflare Tunnel per machine | Each machine has unique subdomain |
| Load Balancing (optional) | Auto-select based on queue depth or availability |

**Machine configuration example:**
```json
{
  "machines": [
    {
      "id": "desktop",
      "name": "Desktop (RTX 4090)",
      "tunnelUrl": "https://render-desktop.yourdomain.com",
      "capabilities": {
        "maxResolution": "8K",
        "vram": 24,
        "priority": 1
      }
    },
    {
      "id": "laptop",
      "name": "Laptop (RTX 3070)",
      "tunnelUrl": "https://render-laptop.yourdomain.com",
      "capabilities": {
        "maxResolution": "4K",
        "vram": 8,
        "priority": 2
      }
    }
  ]
}
```

---

### 2. Headless Rendering Options

**Never discussed:** GUI vs headless rendering

**Options:**

| Mode | Description | Use Case |
|------|-------------|----------|
| **Headless** | No display, runs in background | Batch processing, servers |
| **GUI** | Visible browser window | Debugging, preview checking |
| **Hybrid** | Virtual framebuffer (Xvfb) | Linux servers without display |

**Headless rendering stack:**
- Puppeteer (headless Chrome)
- Playwright (alternative, better for complex rendering)
- Xvfb (virtual framebuffer for Linux)
- WebGL via SwiftShader (software fallback) or real GPU

**Recommendation:** Default to headless with real GPU acceleration. Puppeteer with `--use-gl=desktop` flag.

---

### 3. YouTube Quality Optimization

**Not in current plan:** Specific encoding settings for YouTube

**YouTube recommended settings (2026):**

| Format | Resolution | Framerate | Bitrate (video) | Codec |
|--------|------------|-----------|-----------------|-------|
| 1080p | 1920x1080 | 60fps | 12-15 Mbps | H.264/AVC |
| 4K | 3840x2160 | 60fps | 35-45 Mbps | H.264 or VP9 |
| 4K HDR | 3840x2160 | 60fps | 44-56 Mbps | VP9 Profile 2 |

**Audio settings:**
- Codec: AAC-LC
- Channels: Stereo or 5.1
- Sample rate: 48kHz (preferred) or 44.1kHz
- Bitrate: 384 kbps (stereo), 512 kbps (5.1)

**FFmpeg command template:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k \
  -movflags +faststart \
  -y output.mp4
```

**VR 360 specific:**
- Resolution: 5760x2880 (mono) or 5760x5760 (stereo top/bottom)
- Inject spatial metadata with Google's tools
- Use equirectangular projection

---

### 4. Video Tagging, Formatting, Sizing

**Not in current plan:** Metadata templates for different platforms

**YouTube metadata template:**
```yaml
title_template: "{audio_name} | Ethereal Flame Visualization"
description_template: |
  {whisper_transcription}

  ---

  🔥 Created with Ethereal Flame Studio
  🎨 Template: {template_name}
  ⏱️ Duration: {duration_formatted}

  #meditation #visualization #audioreactive #etherealflame
tags:
  - meditation
  - visualization
  - audio reactive
  - ethereal flame
  - "{genre}"
  - "{mood}"
category: "10"  # Music
privacy: "private"  # or "public", "scheduled"
thumbnail:
  auto_generate: true
  frame_offset: 30  # seconds into video
```

**Platform-specific sizing:**
| Platform | Aspect Ratio | Max Resolution | Notes |
|----------|--------------|----------------|-------|
| YouTube | 16:9 | 8K | HDR supported |
| YouTube Shorts | 9:16 | 1080x1920 | Max 60 seconds |
| TikTok | 9:16 | 1080x1920 | Max 10 minutes |
| Instagram Reels | 9:16 | 1080x1920 | Max 90 seconds |
| Instagram Feed | 1:1 or 4:5 | 1080x1080 | Square or portrait |

---

### 5. n8n MCP + Skills Integration

**Not in current plan:** Using Claude Code to BUILD the n8n workflows

**From the videos you shared:**
- n8n MCP Server gives Claude Code access to all n8n nodes, configurations, templates
- n8n Skills teaches Claude Code how to use the MCP, write expressions, validate workflows
- Claude Code can CREATE, EDIT, and DEPLOY n8n workflows directly

**This means:**
Instead of manually building n8n workflows, we should:
1. Set up n8n MCP in Claude Code project
2. Use Claude Code to generate the render orchestration workflow
3. Use Claude Code to generate the YouTube upload workflow
4. Iterate on workflows through conversation

**Example prompt to Claude Code:**
```
Build me an n8n workflow that:
1. Receives a webhook with render job details (audio file, template, machine)
2. Routes the job to the selected render machine via HTTP request
3. Polls for job status every 30 seconds
4. On completion, downloads the video and uploads to YouTube
5. Sends me a Slack notification with the YouTube URL
```

**This is Phase 5.5: n8n Workflow Generation via Claude Code**

---

### 6. Web App "Send to Render" Integration

**Current plan:** Assumes manual triggering
**Needed:** Button in web app that sends job to n8n

**Web app additions:**
1. **Render button** in preview UI
2. **Machine selector** dropdown
3. **Format selector** (YouTube 1080p, 4K, VR, etc.)
4. **Progress indicator** (job submitted, rendering, encoding, uploading)
5. **Notification settings** (where to send completion notice)

**API flow:**
```
Web App → POST /api/render → n8n webhook → Route to machine → Render → Upload
```

---

## Revised Phase Structure

### Current Phases (keep)
- Phase 1: Foundation (UI + Visual Engine) ✅ MOSTLY COMPLETE
- Phase 2: Template System ✅ COMPLETE
- Phase 3: Rendering Pipeline (needs enhancement)
- Phase 4: Automation (needs enhancement)
- Phase 5: n8n Integration (needs enhancement)

### Proposed Additions

**Phase 3 Additions:**
- 03-09-PLAN.md: YouTube-optimized encoding presets
- 03-10-PLAN.md: Platform-specific output formats (Shorts, Reels, etc.)

**Phase 4 Additions:**
- 04-10-PLAN.md: Multi-machine render farm configuration
- 04-11-PLAN.md: Machine health monitoring and selection
- 04-12-PLAN.md: Video metadata templates and tagging

**Phase 5 Additions:**
- 05-05-PLAN.md: n8n MCP + Skills setup for Claude Code workflow generation
- 05-06-PLAN.md: Render job routing to multiple machines
- 05-07-PLAN.md: Web app "Render" button integration

**New Phase 6: YouTube Channel Optimization**
- 06-01-PLAN.md: Thumbnail generation (auto or manual)
- 06-02-PLAN.md: SEO optimization (titles, descriptions, tags)
- 06-03-PLAN.md: Scheduling and publishing workflow
- 06-04-PLAN.md: Analytics integration (track views, engagement)

---

## Implementation Using n8n MCP + Claude Code

The videos you shared demonstrate the power of:
1. **n8n MCP Server** - Gives Claude access to all n8n functionality
2. **n8n Skills** - Teaches Claude how to build proper workflows

**Setup required:**
```bash
# In Claude Code project
npm install @n8n/mcp-server

# Add to .mcp.json
{
  "n8n": {
    "url": "https://n8n.yourdomain.com",
    "apiKey": "YOUR_N8N_API_KEY"
  }
}

# Clone n8n-skills for Claude to reference
git clone https://github.com/user/n8n-skills
```

**Then we can say to Claude Code:**
> "Build me the complete render orchestration workflow that receives jobs from the web app, routes to the correct machine, monitors progress, and triggers YouTube upload on completion."

And Claude Code will:
1. Search n8n templates for similar patterns
2. Research required nodes and configurations
3. Build the workflow JSON
4. Deploy it to our n8n instance
5. Test the webhook endpoint

---

## Questions to Answer

Before implementing, we need decisions on:

1. **Render machine setup:**
   - Which machines will be part of the render farm?
   - What are their specs (GPU, VRAM, etc.)?
   - Are they always on, or need wake-on-LAN?

2. **Headless preference:**
   - Pure headless (no display ever)?
   - Virtual framebuffer (Xvfb)?
   - Real GPU with headless Chrome?

3. **YouTube channel details:**
   - Channel name and branding?
   - Default video settings (public/private/scheduled)?
   - Preferred upload times?

4. **Multi-platform:**
   - YouTube only for v1?
   - TikTok, Instagram later?
   - Use Blotato ($29-97/mo) or direct APIs?

5. **Notification preferences:**
   - Slack, Email, Telegram, ntfy?
   - Per-job or batch summary?

---

## Next Steps

1. **Review this document** - Does it capture your vision?
2. **Answer the questions above** - So we can fill in specifics
3. **Update ROADMAP.md** - Add missing plans to existing phases
4. **Set up n8n MCP in Claude Code** - Enable workflow generation
5. **Execute enhanced Phase 3-5** - Build the complete pipeline

---

*This document captures the full automation vision based on conversation 2026-01-28*
