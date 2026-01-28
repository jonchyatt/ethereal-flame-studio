# Ethereal Flame Studio

**Phone to published video — audio-reactive 360° VR visual meditation creator**

Create immersive visual meditation videos with audio-reactive particle systems and procedural skybox shaders. Upload from your phone, render on your server, publish to YouTube automatically.

## Quick Start (Windows)

```batch
setup.bat
```

This checks dependencies, installs packages, and creates your `.env` file.

Then:

```batch
deploy.bat
```

Choose your deployment option from the interactive menu.

---

## Batch Files

| File | Purpose |
|------|---------|
| `setup.bat` | First-time setup — checks Node, Docker, Vercel CLI, installs dependencies |
| `start.bat` | Quick start — launches local dev server |
| `deploy.bat` | Interactive deployment menu with all options |

---

## Deployment Options

### Option 1: Web UI Only (Vercel)

Just the visualization — no backend services needed.

```batch
deploy.bat → Choose "1"
```

Or manually: `vercel --prod`

**What works:** Preview mode, template editor, all visual effects

### Option 2: Full Local Stack (Docker)

Adds batch rendering, transcription, Google Drive sync.

```batch
deploy.bat → Choose "2"
```

**Requires:** Docker Desktop running

**Services started:**
- Redis (job queue on port 6379)
- Render worker (headless video rendering)
- Whisper transcription (GPU-accelerated)

**Access:**
- App: http://localhost:3000
- Batch UI: http://localhost:3000/batch

### Option 3: Remote Access (Cloudflare Tunnel)

Access from your phone without port forwarding.

```batch
deploy.bat → Choose "3"
```

**Requires:** Cloudflare account and tunnel token (free)

**Get your token:**
1. Go to https://one.dash.cloudflare.com
2. Zero Trust → Networks → Tunnels
3. Create tunnel, copy token

### Option 4: Everything (Full Automation)

Complete pipeline including n8n workflow automation and YouTube upload.

```batch
deploy.bat → Choose "4"
```

**All services:**
- Everything from options 1-3
- n8n workflow engine (port 5678)
- YouTube OAuth integration
- Automatic upload on render complete

---

## Manual Commands

```bash
# Development
npm run dev                    # Start dev server at localhost:3000
npm run build                  # Production build

# Vercel Deployment
vercel --prod                  # Deploy to production

# Docker Services
docker-compose up -d                                        # Core services
docker-compose --profile remote up -d                       # + Cloudflare Tunnel
docker-compose --profile automation up -d                   # + n8n
docker-compose --profile remote --profile automation up -d  # Everything
docker-compose down                                         # Stop all services
```

---

## Configuration

Copy `.env.example` to `.env` (done automatically by `setup.bat`):

| Variable | Required For | Description |
|----------|--------------|-------------|
| `REDIS_PASSWORD` | Docker | Redis authentication password |
| `CLOUDFLARE_TUNNEL_TOKEN` | Remote access | From Cloudflare Zero Trust dashboard |
| `NTFY_TOPIC` | Notifications | Push notification topic name |
| `GOOGLE_SHEETS_ID` | Metadata export | Spreadsheet ID for render logs |
| `N8N_USER` / `N8N_PASSWORD` | n8n | Login credentials for workflow UI |

---

## Features

### Visual Engine
- **Audio-reactive particles** — Bass, mids, treble drive visual effects
- **Multiple modes** — Ethereal Flame (fire), Ethereal Mist (clouds)
- **20+ skybox presets** — Star Nest shader with HSV color cycling
- **Water reflections** — Optional reflective water plane

### Template System
- **Built-in presets** — 6 curated visual configurations
- **Save custom templates** — With thumbnail screenshots
- **Advanced editor** — Fine-tune all parameters

### Rendering Pipeline
- **Batch queue** — Queue multiple renders with Redis/BullMQ
- **1080p / 4K / 360° VR** — Multiple output formats
- **Stereoscopic 3D** — YouTube VR compatible
- **Headless rendering** — Server-side with Puppeteer

### Automation
- **Whisper transcription** — GPU-accelerated audio-to-text
- **Google Drive sync** — Automatic upload via rclone
- **Push notifications** — ntfy alerts on completion
- **YouTube upload** — n8n workflow automation

---

## Documentation

| Document | Description |
|----------|-------------|
| [Remote Access](docs/REMOTE_ACCESS.md) | Cloudflare Tunnel setup |
| [n8n Setup](docs/N8N_SETUP.md) | Workflow engine configuration |
| [n8n Workflows](docs/N8N_WORKFLOWS.md) | YouTube upload workflow |
| [Google Drive](docs/google-drive-setup.md) | rclone configuration |

---

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React Three Fiber + Three.js
- Zustand (state management)
- Tailwind CSS

**Backend:**
- BullMQ + Redis (job queue)
- SQLite (render database)
- FFmpeg (video encoding)

**Services:**
- Docker Compose (orchestration)
- Cloudflare Tunnel (remote access)
- n8n (workflow automation)
- faster-whisper (transcription)

---

## Project Structure

```
├── src/
│   ├── app/                 # Next.js pages and API routes
│   ├── components/
│   │   ├── canvas/          # 3D components (ParticleLayer, StarNestSkybox, WaterPlane)
│   │   └── ui/              # UI components (ControlPanel, TemplateGallery)
│   └── lib/
│       ├── audio/           # AudioAnalyzer, FFT processing
│       ├── queue/           # BullMQ queue, job types
│       ├── stores/          # Zustand stores (audio, visual, template)
│       └── templates/       # Template types and built-in presets
├── docs/                    # Setup documentation
├── docker-compose.yml       # Service definitions
├── .env.example             # Environment template
├── setup.bat                # First-time setup script
├── start.bat                # Quick start script
└── deploy.bat               # Deployment menu script
```

---

## License

MIT
