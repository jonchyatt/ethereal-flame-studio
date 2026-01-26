# Roadmap: Ethereal Flame Studio

**Created:** 2026-01-26
**Depth:** Comprehensive
**Coverage:** 41/41 v1 requirements mapped

---

## Overview

This roadmap transforms audio files into publication-ready 360 VR and social media videos through five phases: (1) Web UI with visual engine and audio reactivity, (2) template system for preset management, (3) high-fidelity rendering pipeline for 8K output, (4) batch automation with Whisper and Drive integration, and (5) remote access with n8n workflow automation.

---

## Phases

### Phase 1: Foundation - Web UI + Visual Engine

**Goal:** User can preview audio-reactive visuals in browser on any device

**Dependencies:** None (foundational phase)

**Requirements:**
- VIS-01: Real-time WebGL preview of visuals in browser
- VIS-02: Ethereal Mist mode - soft cloud-like particle effect
- VIS-03: Ethereal Flame mode - organic upward drift, warm colors
- VIS-04: Particle lifetime system - spawn/live/die cycle
- VIS-05: Dual-layer particle system - inner glow + outer halo
- VIS-05b: Scalable particle count (2000 default, up to 50,000+)
- VIS-06: Star Nest skybox - procedural volumetric background
- VIS-07: Automatic skybox rotation during playback
- VIS-08: Audio FFT analysis driving particle behavior
- VIS-09: Frequency band separation (bass, mids, treble)
- VIS-10: Size-over-lifetime curve (Unity reference implementation)
- VIS-11: Threshold-crossing beat detection with minimum interval
- VIS-12: Smooth lerp transitions for all reactive properties
- AUD-01: Audio file upload (MP3, WAV, OGG)
- AUD-02: Real-time FFT analysis for preview
- AUD-04: Beat detection for pulse effects
- INF-01: Mobile-friendly web UI

**Success Criteria:**
1. User uploads audio file from phone and sees particles react to the beat
2. User switches between Ethereal Mist and Ethereal Flame modes with visible difference
3. Particles exhibit organic bloom/fade lifecycle (not static sprites)
4. Star Nest skybox rotates subtly during playback
5. Bass/mids/treble independently influence different visual properties

---

### Phase 2: Template System

**Goal:** User can save, load, and switch between visual presets

**Dependencies:** Phase 1 (visual engine must exist to configure)

**Requirements:**
- TPL-01: Save all visual settings as named template (JSON)
- TPL-02: Load templates from library
- TPL-03: 4-6 built-in curated presets
- TPL-04: Advanced parameter editor with full slider access
- TPL-05: Template persistence across browser sessions
- TPL-06: Template selection UI (thumbnail previews)

**Success Criteria:**
1. User selects "Deep Space" preset and visuals update immediately
2. User tweaks particle color, saves as "My Custom", finds it in library next session
3. User sees thumbnail previews distinguishing different presets
4. Advanced users access full slider panel for fine-grained control

---

### Phase 3: Rendering Pipeline

**Goal:** User can export publication-quality videos in multiple formats up to 8K

**Dependencies:** Phase 1 (visual engine), Phase 2 (templates define what to render)

**Requirements:**
- AUD-03: Pre-analysis for offline rendering (amplitude-per-frame data)
- RND-01: 1080p flat export (16:9 landscape)
- RND-02: 1080p flat export (9:16 vertical)
- RND-03: 4K flat export (16:9 and 9:16)
- RND-04: 360 monoscopic equirectangular export (up to 8K)
- RND-05: 360 stereoscopic export (Top/Bottom, 8K)
- RND-06: VR spatial metadata injection (Spherical Video V2)
- RND-07: Headless rendering mode (command line, no GUI)
- RND-08: Render queue with job persistence (survives browser close)

**Success Criteria:**
1. User clicks "Render 1080p" and receives downloadable MP4 matching preview
2. User renders 8K 360 stereoscopic video playable in VR headset
3. Rendered 360 video uploads to YouTube and displays in VR mode correctly
4. User queues multiple renders, closes browser, returns to find completed jobs
5. Render server processes jobs via CLI without GUI dependencies

---

### Phase 4: Automation

**Goal:** User can batch-process multiple audio files with automatic organization

**Dependencies:** Phase 3 (rendering pipeline must work for batch processing)

**Requirements:**
- AUD-05: Whisper transcription for auto-generating video descriptions
- AUT-01: Batch queue for processing multiple audio files
- AUT-02: Google Drive output folder integration
- AUT-03: Naming convention enforcement ([Date]_[AudioName]_[Format].mp4)
- AUT-04: Metadata database (Google Sheets or local CSV)
- INF-03: Job status notifications (push or polling)

**Success Criteria:**
1. User uploads 5 audio files, selects template, all render overnight with proper names
2. Completed videos appear in Google Drive folder automatically
3. Each video has Whisper-generated description in metadata spreadsheet
4. User receives notification when batch completes

---

### Phase 5: n8n Integration + Remote Access

**Goal:** User can trigger renders from phone and have videos auto-post to social media

**Dependencies:** Phase 4 (automation infrastructure must exist)

**Requirements:**
- AUT-05: n8n webhook trigger on render complete
- AUT-06: n8n workflow for auto-posting to YouTube, social platforms
- INF-02: Remote access to home render server (Cloudflare Tunnel)

**Success Criteria:**
1. User triggers render from phone while away from home
2. Completed video auto-posts to YouTube with Whisper-generated description
3. User's home render server is securely accessible via Cloudflare Tunnel
4. Complete phone-to-published flow works without touching a computer

---

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation - Web UI + Visual Engine | Not Started | 17 |
| 2 | Template System | Not Started | 6 |
| 3 | Rendering Pipeline | Not Started | 9 |
| 4 | Automation | Not Started | 6 |
| 5 | n8n Integration + Remote Access | Not Started | 3 |

**Total:** 41 requirements across 5 phases

---

## Phase Dependencies

```
Phase 1 (Foundation)
    |
    v
Phase 2 (Templates)
    |
    v
Phase 3 (Rendering)
    |
    v
Phase 4 (Automation)
    |
    v
Phase 5 (n8n + Remote)
```

All phases are sequential. Each depends on the previous.

---

## Research Flags

| Phase | Flag | Notes |
|-------|------|-------|
| Phase 3 | NEEDS RESEARCH | Shader portability - Three.js GLSL to Blender or headless Three.js with native GPU |
| Phase 3 | NEEDS RESEARCH | Tiled rendering for 8K on consumer GPUs (24GB VRAM limit) |
| Phase 4 | STANDARD | Whisper integration is well-documented |
| Phase 5 | STANDARD | Cloudflare Tunnel and n8n patterns are established |

---

*Last updated: 2026-01-26*
