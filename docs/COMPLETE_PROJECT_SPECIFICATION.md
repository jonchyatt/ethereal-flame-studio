# Ethereal Flame Studio: Complete Project Specification

**Created:** 2026-01-27
**Purpose:** Reference document for complete rebuild or handoff to new implementation

---

## Core Mission

**"Phone to published video without touching a computer."**

A creator uploads audio from their phone, selects a visual preset, and receives a finished 8K VR video automatically posted to YouTube/social media — fully automated.

---

## Part 1: Visual Engine (The Orb)

### What It Should Look Like

**Target: Unity Reference Implementation**

The ethereal orb should be **organic, gaseous, and asymmetric** — NOT circular or hard-edged.

| Aspect | Target State | Current State (Problem) |
|--------|-------------|------------------------|
| **Shape** | Asymmetric blob, wispy tendrils | Hard-edged circular particles |
| **Particle Quality** | Soft gradient texture (`circle_particle.png`) | Procedural circles with visible hard edges |
| **Particle Count** | ~1000 max (Unity uses 40/second emission) | 100-300 (too dense, wrong aesthetic) |
| **Particle Size** | Large (2-8 units) with soft falloff | Small, visible as individual dots |
| **Size-Over-Lifetime** | 37% birth → 100% at 20% life → 50% death | May not be implemented correctly |
| **Motion** | Organic upward drift, breathing pulse | Unknown if implemented |
| **Color** | Blackbody temperature gradient (1500K-4000K) | Unknown |

### Unity Reference Settings (from `addrain_trim.prefab`)

```
Emission Rate: 40/second (NOT 100-300!)
Lifetime: 2 seconds
Start Size: 2 units
Max Particles: 1000
Shape: Cone (radius 0.01)
Texture: Soft radial gradient PNG (NOT procedural)
Blend: Additive
```

### Size-Over-Lifetime Curve (Critical for Organic Look)

```
Time  | Size (% of base)
------|------------------
0.00  | 37%   ← Birth: small
0.20  | 100%  ← Peak at 20% lifetime
1.00  | 50%   ← Death: gentle shrink
```

This creates the organic "bloom and fade" effect — particles quickly grow to full size, then gradually shrink.

### Missing Blender Techniques

The research identified these Blender techniques that should inform the Three.js implementation:

1. **Blackbody Coloring**
   - Temperature → color mapping (1500K = red, 3000K = orange, 4000K = yellow)
   - Should drive particle core color based on distance from center
   ```glsl
   float temperature = mix(1500.0, 4000.0, 1.0 - dist);
   vec3 fireColor = blackbodyToRGB(temperature);
   ```

2. **Voronoi Turbulence**
   - Procedural noise displacement in fragment shader
   - Creates organic, non-circular shapes

3. **Fresnel Edge Glow**
   - Bright edges, transparent center (for energy ball look)
   ```glsl
   float fresnel = pow(1.0 - dot(normalize(vNormal), viewDir), 2.0);
   color += edgeGlowColor * fresnel * 0.5;
   ```

4. **Noise Displacement**
   - Time-based position perturbation
   - Makes particles "swim" rather than move linearly
   ```glsl
   vec3 noiseOffset = vec3(
     noise3D(position * 2.0 + time * 0.5),
     noise3D(position * 2.0 + time * 0.5 + 100.0),
     noise3D(position * 2.0 + time * 0.5 + 200.0)
   ) * 0.1;
   ```

### Ethereal Mist vs Ethereal Flame Modes

| Mode | Behavior | Colors | Motion |
|------|----------|--------|--------|
| **Ethereal Mist** | Soft cloud-like particles | Cool blues/purples | Gentle drift, breathing |
| **Ethereal Flame** | Organic upward drift | Warm yellows/oranges/reds | Faster upward, wispy tendrils |

---

## Part 2: Star Nest Skybox

### What It Should Have

**20+ Presets (only 5 currently implemented)**

The reset-biology-website has these presets that are missing:

1. Star Nest FX (2D Surface) - 17 iterations, 20 volsteps
2. High Quality - 20 iterations, 18 volsteps
3. Crazy Fractal - formuparam 998, red tint
4. Dark World - 15 iterations, 15 volsteps
5. Hot Suns - tile 1605, sparse
6. Green Nebula 1 - green color, dark
7. Green Nebula 2 - deeper green, very bright
8. Dark World 2 - negative brightness
9. Dark World 3 - very negative brightness
10. Yellow Nebula - yellow color, negative brightness
11. Rotating - same as DarkWorld1 with rotation
12. HSV Normal (Animated Hue)
13. HSV Green Nebula
14. HSV Dark World
15. HSV Crazy Fractal

### Audio Reactivity

- Skybox rotation speed modulated by audio amplitude
- Time increment multiplied by bass level
- Uses incremental time accumulation (not multiplicative) to prevent jitter

---

## Part 3: Water Reflection Plane

### What It Should Do

**Dark blue-green reflective surface beneath the orb**

| Feature | Target |
|---------|--------|
| Base Color | #0a1828 (dark blue) |
| Wave Animation | 3 layers of sine waves |
| Reflectivity | 0.4 default, adjustable 0-1 |
| Fresnel Effect | More reflective at glancing angles |
| Normal Map | Tileable water normals for detail |
| Orb Reflection | Composite or planar reflection |

### Target Implementation

```glsl
// Wave vertex displacement
float wave = sin(pos.x * 0.5 + uTime * 0.5) * 0.1
           + sin(pos.y * 0.3 + uTime * 0.3) * 0.08
           + sin((pos.x + pos.y) * 0.2 + uTime * 0.4) * 0.05;

// Fresnel reflectivity
vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
vec3 normal = normalize(vNormal);
float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
float reflectivity = mix(0.1, 0.9, fresnel);
```

### Reference Characteristics (from screenshots)

- Dark blue-green base color (#0a1828 matches well)
- Subtle wave displacement visible
- Bright reflection streak from the orb
- Reflection is distorted by wave motion
- Horizontal ripple lines visible
- Fades to darkness at horizon

---

## Part 4: User Interface

### What It Should Look Like

**Professional, dark theme, mobile-first**

| Element | Target |
|---------|--------|
| Layout | Collapsible control panel on right side |
| Style | Dark glassmorphism, subtle borders |
| Mobile | Full-width drawers, large touch targets |
| Presets | Thumbnail grid with visual previews |
| Sliders | Smooth, responsive, labeled |
| Sections | Mode, Skybox, Particles, Water, Audio, Export |

### Required UI Components

1. **Mode Selector** - Toggle between Ethereal Mist / Ethereal Flame
2. **Preset Selector** - Thumbnail grid of 20+ skybox presets
3. **Particle Controls** - Count, size, lifetime, color gradient
4. **Water Controls** - Enable toggle, reflectivity slider, color picker
5. **Audio Controls** - Upload button, volume, sensitivity
6. **Export Panel** - Resolution dropdown, format, render button

### Design System

- Background: Dark (#0a0a0a to #1a1a2e)
- Accent: Subtle glows matching orb color
- Borders: 1px rgba(255,255,255,0.1)
- Blur: backdrop-filter blur for glassmorphism
- Font: System UI or Inter
- Touch targets: Minimum 44px

---

## Part 5: Template System (Phase 2)

### What It Does

Save, load, and share visual configurations.

| Feature | Description |
|---------|-------------|
| **Save Template** | Capture all settings as JSON + thumbnail screenshot |
| **Load Template** | Apply saved settings instantly |
| **Built-in Presets** | 4-6 curated templates (Deep Space, Ethereal Nebula, etc.) |
| **Persistence** | Templates survive browser refresh (IndexedDB) |
| **Advanced Editor** | Full slider access to all parameters |

### Template Data Structure

```typescript
interface Template {
  id: string;
  name: string;
  thumbnail: string; // Base64 or data URL
  settings: {
    mode: 'mist' | 'flame';
    skyboxPreset: string;
    particleCount: number;
    particleSize: number;
    particleLifetime: number;
    colorGradient: ColorStop[];
    waterEnabled: boolean;
    waterReflectivity: number;
    waterColor: string;
    // ... all visual parameters
  };
  created: Date;
  modified: Date;
}
```

### Built-in Presets

1. **Deep Space Starfield** - Black void, white starlight, particles pulse with audio
2. **Ethereal Nebula** - Blue/gold gradients, volumetric fog, dreamy atmosphere
3. **Ethereal Flame** - Warm upward drift, fire colors
4. **Ethereal Mist** - Cool cloud-like particles
5. **Dark World** - Deep purple/black, minimal particles
6. **Rainbow Energy** - HSV cycling colors, high energy

---

## Part 6: Rendering Pipeline (Phase 3)

### The Critical Insight

**WebGL cannot render 8K.** Browser has a hard 4096x4096 texture limit.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Control UI  │  │ Preview (4K) │  │ Pre-analyze Audio  │ │
│  └─────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (API call with job data)
┌─────────────────────────────────────────────────────────────┐
│                      Home Server                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BullMQ Queue                                          │  │
│  │  - Render jobs                                        │  │
│  │  - Transcription jobs                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌────────────────┐         ┌────────────────────────────┐ │
│  │ Render Worker  │         │ Whisper Transcription      │ │
│  │ (Puppeteer +   │         │ (faster-whisper GPU)       │ │
│  │  headless GPU) │         └────────────────────────────┘ │
│  └────────────────┘                                        │
│           │                                                │
│           ▼                                                │
│  ┌────────────────────────────────────────────────────────┐│
│  │ FFmpeg + NVENC                                          ││
│  │ - H.265 encoding                                        ││
│  │ - VR metadata injection (sv3d/st3d)                     ││
│  └────────────────────────────────────────────────────────┘│
│           │                                                │
│           ▼                                                │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Output: /renders/                                       ││
│  │ - 2026-01-27_meditation_1080p.mp4                      ││
│  │ - 2026-01-27_meditation_4k360_stereo.mp4               ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Output Formats

| Format | Resolution | Use Case |
|--------|------------|----------|
| Flat 16:9 | 1920x1080, 3840x2160 | YouTube, social media |
| Flat 9:16 | 1080x1920, 2160x3840 | Instagram Reels, TikTok |
| 360 Mono | Up to 8K (7680x3840) | VR180, YouTube 360 |
| 360 Stereo | 7680x3840 (top/bottom) | Full VR with depth |

### VR Metadata Requirements

Must inject:
- Spherical Video V2 metadata (sv3d)
- Stereoscopic metadata (st3d)
- Using Google Spatial Media tools (Python)

FFmpeg alone cannot inject proper 360/stereoscopic metadata.

### Audio Pre-Analysis

Real-time FFT doesn't apply to frame-by-frame rendering. Must:
1. Pre-analyze entire audio file
2. Generate amplitude-per-frame data array
3. Pass to renderer for each frame

---

## Part 7: Automation (Phase 4)

### Batch Processing Flow

```
Upload 5 audio files → Select template → All render overnight → Proper filenames
```

### File Naming Convention

`[Date]_[AudioName]_[Format].mp4`

Examples:
- `2026-01-27_meditation-morning_1080p.mp4`
- `2026-01-27_meditation-morning_4k360_stereo.mp4`

### Components

| Component | Purpose |
|-----------|---------|
| **SQLite Database** | Track all jobs, metadata, output files |
| **BullMQ Queue** | Persistent job queue (survives restart) |
| **Render Worker** | Puppeteer + headless GPU rendering |
| **Whisper Transcription** | Auto-generate video descriptions |
| **Google Drive Sync** | rclone uploads to GDrive folder |
| **Push Notifications** | ntfy alerts when batch completes |
| **Google Sheets Export** | Metadata spreadsheet for all videos |

### Docker Services

```yaml
services:
  redis:           # BullMQ backend
  faster-whisper:  # GPU transcription
  render-worker:   # Puppeteer + NVIDIA
  n8n:             # Workflow automation
  cloudflared:     # Remote access tunnel
```

---

## Part 8: n8n Integration (Phase 5)

### Purpose

Automated publishing pipeline after render completes.

### Workflow

```
Render Complete → Webhook → n8n → YouTube Upload + Description
```

### n8n Workflow Steps

1. **Webhook Trigger** - Receives job completion notification
2. **Read File** - Access rendered video from `/renders/` mount
3. **Read Metadata** - Pull Whisper description from database
4. **YouTube Upload** - OAuth2 authenticated upload
5. **Set Metadata** - Title, description, tags, category
6. **Notify User** - Push notification with video link

### Why Self-Hosted n8n?

Google blocks n8n Cloud's OAuth callback URL for YouTube upload scopes. Self-hosted n8n allows custom callback URL.

### YouTube API Quota

- 10,000 units/day default
- Video upload costs ~1,600 units
- = ~6 uploads per day
- Can request quota increase from Google

---

## Part 9: Remote Access

### Cloudflare Tunnel Architecture

```
[Phone] → HTTPS → [Cloudflare Edge] → Tunnel → [Home Server]
                                                    │
                                      ┌─────────────┼─────────────┐
                                      │             │             │
                                   [n8n]      [Render API]   [Web UI]
                                   :5678        :3000         :3001
```

### Setup Steps

1. Create tunnel in Cloudflare Zero Trust Dashboard
2. Copy tunnel token to `.env`
3. Configure public hostnames:
   - `n8n.yourdomain.com` → n8n:5678
   - `render.yourdomain.com` → web-ui:3000

### Security Layers

- Cloudflare Access for authentication
- Service tokens for webhook authentication
- Strong passwords on all services
- Never commit secrets to git

---

## Part 10: Complete End-to-End Flow

### The Dream Scenario

1. **User on phone** opens `render.yourdomain.com`
2. **Uploads audio** (meditation track)
3. **Selects preset** ("Deep Space Starfield")
4. **Clicks "Render 8K VR"**
5. **Gets notification** "Job queued"
6. Goes about their day...
7. Hours later: **Push notification** "Render complete!"
8. **YouTube auto-posted** with Whisper-generated description
9. User checks YouTube — video is live in VR mode

**Zero computer touching. Phone → Published.**

---

## Part 11: Blender Integration Strategy

### The Hybrid Approach

The research explicitly recommended a hybrid architecture:

> "For Ethereal Flame Studio's needs, the **procedural shader approach** is recommended for pre-rendered video assets, while the existing **Three.js particle system** remains optimal for real-time web interaction."

### Use Blender For

1. **Reference Renders** - Create target visuals to match
2. **8K Final Output** - Cycles raytracing for highest quality
3. **Pre-rendered Loops** - Background video elements
4. **Water Reflections** - True raytraced reflections
5. **Marketing Materials** - Portfolio quality renders

### Use Three.js For

1. **Real-time Preview** - Interactive browser experience
2. **Audio Reactivity** - Live FFT visualization
3. **User Controls** - Immediate feedback
4. **Mobile Access** - Web-based delivery
5. **Template Preview** - Quick visual feedback

### Shader Portability Note

Three.js GLSL shaders don't translate directly to Blender. Options:
- Run Three.js headless with native GPU (Puppeteer + NVIDIA Docker)
- Rewrite shaders in Blender's node system
- Use Blender's EEVEE with custom GLSL (experimental)

---

## Part 12: Full Rebuild Checklist

If starting from scratch with a new implementation:

### Phase 1: Visual Engine Done Right
- [ ] Load soft gradient texture (`circle_particle.png`) instead of procedural circles
- [ ] Port Unity particle settings exactly (40/sec, 2 units, 2s lifetime)
- [ ] Implement size-over-lifetime curve (37% → 100% → 50%)
- [ ] Add blackbody temperature coloring
- [ ] Add Voronoi turbulence displacement
- [ ] Implement Fresnel edge glow
- [ ] Add all 20 skybox presets from reset-biology
- [ ] Working water plane with wave animation
- [ ] Water Fresnel reflectivity
- [ ] Audio-reactive skybox rotation (incremental time)

### Phase 2: Professional UI
- [ ] Dark glassmorphism design system
- [ ] Collapsible control panel
- [ ] Thumbnail preset gallery
- [ ] Mobile-first touch targets (44px minimum)
- [ ] Smooth animations and transitions
- [ ] Proper typography hierarchy

### Phase 3: Template System
- [ ] Save/load with screenshot capture
- [ ] IndexedDB persistence
- [ ] 6 curated built-in presets
- [ ] Advanced parameter editor
- [ ] Template export/import (JSON)

### Phase 4: Rendering Pipeline
- [ ] Audio pre-analysis (amplitude per frame)
- [ ] Puppeteer + headless GPU renderer
- [ ] Frame capture system
- [ ] 1080p/4K flat export
- [ ] 360 monoscopic export
- [ ] 360 stereoscopic export (8K)
- [ ] FFmpeg encoding with NVENC
- [ ] VR metadata injection (Google Spatial Media)
- [ ] Persistent render queue (BullMQ + Redis)

### Phase 5: Automation
- [ ] SQLite metadata database
- [ ] File naming convention enforcement
- [ ] Render worker with post-processing
- [ ] Whisper transcription microservice
- [ ] Google Drive sync (rclone)
- [ ] Push notifications (ntfy)
- [ ] Google Sheets metadata export
- [ ] Batch upload web UI

### Phase 6: Remote Access + n8n
- [ ] Cloudflare Tunnel setup
- [ ] n8n self-hosted deployment
- [ ] YouTube OAuth configuration
- [ ] Render complete webhook
- [ ] Auto-publish workflow
- [ ] Phone-to-published flow verification

---

## Reference Files

### Unity Source (Original Implementation)
- `addrain_trim.prefab` — Additive rainbow particles
- `simprain_trim.prefab` — Simple rainbow particles
- `AudioSyncer.cs` — Beat detection base class
- `AudioSpectrum.cs` — FFT analysis
- `AudioSyncScale.cs` — Scale response to beats
- `AudioSyncColor.cs` — Color response to beats
- `circle_particle.png` — Soft gradient particle texture

### Key Research Documents
- `.planning/research/UNITY_REFERENCE.md` — Unity particle system analysis
- `.planning/research/BLENDER_FIRE_ORB.md` — Blender fire/energy techniques
- `.planning/research/BLENDER_WATER.md` — Water reflection research
- `.planning/research/SUMMARY.md` — Architecture decisions
- `.planning/REQUIREMENTS.md` — All 41 v1 requirements
- `.planning/ROADMAP.md` — 5-phase implementation plan

---

## Success Criteria

The project is complete when:

1. **Visual Quality**: Orb looks organic and gaseous, not circular
2. **All Presets**: 20+ skybox presets working
3. **Water Reflection**: Visible, animated, reflective
4. **Professional UI**: Dark theme, mobile-friendly, polished
5. **8K Render**: Can output 8K stereoscopic 360 video
6. **Auto-Publish**: YouTube upload with Whisper description
7. **Phone Access**: Full workflow from mobile device
8. **Zero Touch**: Audio → Published with no computer interaction

---

*Document created: 2026-01-27*
*Purpose: Complete reference for project rebuild or handoff*
