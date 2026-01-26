# Requirements: Ethereal Flame Studio

**Defined:** 2026-01-26
**Core Value:** Phone to published video without touching a computer

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Visual Engine

- [ ] **VIS-01**: Real-time WebGL preview of visuals in browser
- [ ] **VIS-02**: Ethereal Mist mode — soft cloud-like particle effect (from breathing orb)
- [ ] **VIS-03**: Ethereal Flame mode — organic upward drift, warm colors, wispy tendrils
- [ ] **VIS-04**: Particle lifetime system — spawn → live → die cycle for all particles
- [ ] **VIS-05**: Dual-layer particle system — inner glow (tight spawn) + outer halo (wide spawn) running together
- [ ] **VIS-05b**: Scalable particle count — default ~2000 total, slider to increase up to 50,000+ if needed
- [ ] **VIS-06**: Star Nest skybox — procedural volumetric background with multiple presets
- [ ] **VIS-07**: Automatic skybox rotation during playback (subtle background movement)
- [ ] **VIS-08**: Audio FFT analysis driving particle behavior (spawn rate, velocity, size, emission)
- [ ] **VIS-09**: Frequency band separation (bass, mids, treble) for per-layer reactivity
- [ ] **VIS-10**: Size-over-lifetime curve (37% birth → 100% at 20% life → 50% death) from Unity reference
- [ ] **VIS-11**: Threshold-crossing beat detection with minimum interval (from Unity AudioSyncer)
- [ ] **VIS-12**: Smooth lerp transitions for all reactive properties (never snap)

### Template System

- [ ] **TPL-01**: Save all visual settings as named template (JSON)
- [ ] **TPL-02**: Load templates from library
- [ ] **TPL-03**: 4-6 built-in curated presets (Ethereal Mist, Ethereal Flame, Deep Space, etc.)
- [ ] **TPL-04**: Advanced parameter editor with full slider access
- [ ] **TPL-05**: Template persistence across browser sessions
- [ ] **TPL-06**: Template selection UI (thumbnail previews)

### Audio Processing

- [ ] **AUD-01**: Audio file upload (MP3, WAV, OGG)
- [ ] **AUD-02**: Real-time FFT analysis for preview
- [ ] **AUD-03**: Pre-analysis for offline rendering (amplitude-per-frame data)
- [ ] **AUD-04**: Beat detection for pulse effects
- [ ] **AUD-05**: Whisper transcription for auto-generating video descriptions

### Rendering Pipeline

- [ ] **RND-01**: 1080p flat export (16:9 landscape)
- [ ] **RND-02**: 1080p flat export (9:16 vertical/portrait)
- [ ] **RND-03**: 4K flat export (16:9 and 9:16)
- [ ] **RND-04**: 360° monoscopic equirectangular export (up to 8K)
- [ ] **RND-05**: 360° stereoscopic export (Top/Bottom, 8K)
- [ ] **RND-06**: VR spatial metadata injection (Spherical Video V2)
- [ ] **RND-07**: Headless rendering mode (command line, no GUI)
- [ ] **RND-08**: Render queue with job persistence (survives browser close)

### Automation

- [ ] **AUT-01**: Batch queue for processing multiple audio files
- [ ] **AUT-02**: Google Drive output folder integration
- [ ] **AUT-03**: Naming convention enforcement ([Date]_[AudioName]_[Format].mp4)
- [ ] **AUT-04**: Metadata database (Google Sheets or local CSV)
- [ ] **AUT-05**: n8n webhook trigger on render complete
- [ ] **AUT-06**: n8n workflow for auto-posting to YouTube, social platforms

### Infrastructure

- [ ] **INF-01**: Mobile-friendly web UI (works on phone)
- [ ] **INF-02**: Remote access to home render server (Cloudflare Tunnel)
- [ ] **INF-03**: Job status notifications (push or polling)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **TPL-ADV-01**: Template export/import (JSON files for sharing)
- **VIS-ADV-01**: Custom 360° background video support (8K equirectangular)
- **VIS-ADV-02**: Water reflection plane
- **RND-ADV-01**: Cloud GPU rendering option (Vast.ai, RunPod)
- **AUT-ADV-01**: Scheduled batch processing (render overnight)
- **AUT-ADV-02**: Multi-platform n8n workflows (TikTok, Instagram, Facebook)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time streaming | Batch rendering only for v1 — streaming adds latency/complexity |
| Mobile native app | Web-first approach; PWA if needed |
| Multi-user accounts | Single creator workflow initially |
| Custom shader editor | Too complex; use preset system instead |
| In-browser 8K rendering | WebGL has 4K limit; must use server-side |
| Video editing timeline | Defeats mobile simplicity — full video is generated |
| Thousands of generic presets | Quality over quantity; 4-6 curated presets |
| Streaming service audio input | API restrictions make it unreliable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 1 | Pending |
| VIS-02 | Phase 1 | Pending |
| VIS-03 | Phase 1 | Pending |
| VIS-04 | Phase 1 | Pending |
| VIS-05 | Phase 1 | Pending |
| VIS-05b | Phase 1 | Pending |
| VIS-06 | Phase 1 | Pending |
| VIS-07 | Phase 1 | Pending |
| VIS-08 | Phase 1 | Pending |
| VIS-09 | Phase 1 | Pending |
| VIS-10 | Phase 1 | Pending |
| VIS-11 | Phase 1 | Pending |
| VIS-12 | Phase 1 | Pending |
| TPL-01 | Phase 2 | Pending |
| TPL-02 | Phase 2 | Pending |
| TPL-03 | Phase 2 | Pending |
| TPL-04 | Phase 2 | Pending |
| TPL-05 | Phase 2 | Pending |
| TPL-06 | Phase 2 | Pending |
| AUD-01 | Phase 1 | Pending |
| AUD-02 | Phase 1 | Pending |
| AUD-03 | Phase 3 | Pending |
| AUD-04 | Phase 1 | Pending |
| AUD-05 | Phase 4 | Pending |
| RND-01 | Phase 3 | Pending |
| RND-02 | Phase 3 | Pending |
| RND-03 | Phase 3 | Pending |
| RND-04 | Phase 3 | Pending |
| RND-05 | Phase 3 | Pending |
| RND-06 | Phase 3 | Pending |
| RND-07 | Phase 3 | Pending |
| RND-08 | Phase 3 | Pending |
| AUT-01 | Phase 4 | Pending |
| AUT-02 | Phase 4 | Pending |
| AUT-03 | Phase 4 | Pending |
| AUT-04 | Phase 4 | Pending |
| AUT-05 | Phase 5 | Pending |
| AUT-06 | Phase 5 | Pending |
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 5 | Pending |
| INF-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after initial definition*
