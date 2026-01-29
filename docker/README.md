# Ethereal Flame Studio - Docker Production Setup

This directory contains the production Docker configuration for the Ethereal Flame Studio render farm.

## Architecture Overview

```
+------------------+     +------------------+     +------------------+
|   Your Phone     |     |   Cloudflare     |     |   Home Server    |
|                  |     |                  |     |                  |
| Upload audio --> | --> |   Tunnel (TLS)   | --> | --> n8n          |
| Trigger render   |     |   Zero Trust     |     | --> render-worker|
| View status      |     |                  |     | --> Redis        |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  | Output:          |
                                                  | - YouTube        |
                                                  | - Google Drive   |
                                                  | - Notifications  |
                                                  +------------------+
```

## Services

| Service | Description | Port | GPU |
|---------|-------------|------|-----|
| **redis** | Job queue backend (BullMQ) | 6379 | No |
| **n8n** | Workflow automation | 5678 | No |
| **cloudflared** | Secure tunnel | - | No |
| **faster-whisper** | Audio transcription | 9000 | Yes |
| **render-worker** | Video rendering | 3000 | Yes |

## Prerequisites

### Hardware
- NVIDIA GPU with 8GB+ VRAM (RTX 3070 or better recommended)
- 16GB+ system RAM
- 100GB+ free disk space for renders

### Software
- Docker Engine 20.10+
- Docker Compose v2
- NVIDIA Container Toolkit (for GPU services)
- Cloudflare account with domain

### NVIDIA Container Toolkit Installation

**Windows (WSL2):**
```bash
# In WSL2 Ubuntu
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

**Linux:**
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Verify installation:
```bash
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Quick Start

### 1. Configure Environment

```bash
cd docker
cp .env.example .env
```

Edit `.env` and configure:
- `CLOUDFLARE_TUNNEL_TOKEN` - Get from Cloudflare Zero Trust dashboard
- `N8N_HOST` - Your n8n domain (e.g., n8n.yourdomain.com)
- `N8N_PASSWORD` - Strong password for n8n login
- `N8N_ENCRYPTION_KEY` - Generate with `openssl rand -hex 32`
- `N8N_WEBHOOK_SECRET` - Generate with `openssl rand -hex 32`
- `RENDER_OUTPUT_DIR` - Path to store rendered videos
- `AUDIO_INPUT_DIR` - Path to input audio files

### 2. Create Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks > Tunnels**
3. Click **Create a tunnel**
4. Name: `ethereal-flame-desktop` (or your machine name)
5. Copy the tunnel token to `.env`
6. Add public hostnames:
   - `n8n.yourdomain.com` -> `http://n8n:5678`
   - `render-desktop.yourdomain.com` -> `http://render-worker:3000`

### 3. Build and Start Services

```bash
# Build custom images
docker compose -f docker-compose.production.yml build

# Start all services
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f
```

### 4. Configure n8n

1. Access n8n at `https://n8n.yourdomain.com`
2. Log in with credentials from `.env`
3. Go to **Settings > Credentials > Add Credential**
4. Add YouTube OAuth2 credential (see YouTube Setup below)

### 5. Verify Setup

```bash
# Check all services are running
docker compose -f docker-compose.production.yml ps

# Test health endpoints
curl http://localhost:3000/api/health  # Render worker
curl http://localhost:9000/health      # Whisper
curl http://localhost:5678/healthz     # n8n
```

## YouTube Upload Setup

n8n Cloud cannot upload to YouTube due to Google OAuth restrictions. Self-hosted n8n is required.

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Ethereal Flame Studio"
3. Enable **YouTube Data API v3**
4. Configure OAuth consent screen:
   - User type: External
   - Add scopes: `youtube.upload`, `youtube.force-ssl`
   - Add test users (your Google account)

### Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URI: `https://n8n.yourdomain.com/rest/oauth2-credential/callback`
5. Copy **Client ID** and **Client Secret**

### Add Credential to n8n

1. In n8n: **Settings > Credentials > Add Credential**
2. Search: "YouTube OAuth2 API"
3. Enter Client ID and Client Secret
4. Click **Connect** and authorize

### YouTube API Quotas

- Default: 10,000 units/day
- Video upload: ~1,600 units
- Maximum ~6 uploads/day on default quota
- Request increase at Google Cloud Console if needed

## Multi-Machine Render Farm

For multiple render machines, each machine runs its own Docker stack.

### Per-Machine Setup

1. Create machine-specific `.env` file:
   ```bash
   cp .env.example .env.desktop  # For desktop
   cp .env.example .env.laptop   # For laptop
   ```

2. Configure each `.env`:
   - `MACHINE_ID=desktop` or `MACHINE_ID=laptop`
   - Unique `CLOUDFLARE_TUNNEL_TOKEN` per machine
   - Same Redis password (if using shared Redis)

3. Create separate Cloudflare tunnels:
   - `render-desktop.yourdomain.com`
   - `render-laptop.yourdomain.com`

4. Start with specific env file:
   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.desktop up -d
   ```

### Shared vs Local Redis

**Option A: Local Redis (simpler)**
- Each machine runs its own Redis
- Jobs stay on the machine where they were submitted
- No network dependency between machines

**Option B: Shared Redis (coordinated)**
- Single Redis server (on primary machine)
- Jobs can be routed to any machine
- Requires network connectivity between machines
- Update `REDIS_HOST` in secondary machine `.env` files

## Faster-Whisper Service

The faster-whisper service provides audio transcription for video descriptions.

### Build Whisper Image

Create `docker/whisper/Dockerfile`:

```dockerfile
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y \
    python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    faster-whisper \
    fastapi \
    uvicorn \
    python-multipart

WORKDIR /app

COPY server.py .

EXPOSE 9000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "9000"]
```

Create `docker/whisper/server.py`:

```python
from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import os
import tempfile

app = FastAPI()

model = None

@app.on_event("startup")
def load_model():
    global model
    model = WhisperModel(
        os.getenv("WHISPER_MODEL", "large-v3"),
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16")
    )

@app.get("/health")
def health():
    return {"status": "ok", "model": os.getenv("WHISPER_MODEL", "large-v3")}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "5")),
            language=os.getenv("WHISPER_LANGUAGE") or None
        )
        text = " ".join([seg.text for seg in segments])
        return {
            "text": text,
            "language": info.language,
            "duration": info.duration
        }
    finally:
        os.unlink(tmp_path)
```

## Troubleshooting

### GPU Not Available

```bash
# Check NVIDIA driver
nvidia-smi

# Check Docker GPU access
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# If not working, reinstall nvidia-container-toolkit
sudo apt-get install --reinstall nvidia-container-toolkit
sudo systemctl restart docker
```

### Redis Connection Refused

```bash
# Check Redis is running
docker compose -f docker-compose.production.yml ps redis

# Check Redis logs
docker compose -f docker-compose.production.yml logs redis

# Test Redis connection
docker compose -f docker-compose.production.yml exec redis redis-cli ping
```

### Cloudflare Tunnel Not Connecting

```bash
# Check cloudflared logs
docker compose -f docker-compose.production.yml logs cloudflared

# Common issues:
# - Invalid tunnel token (regenerate in dashboard)
# - DNS not configured (add CNAME records)
# - Firewall blocking outbound HTTPS
```

### n8n Webhook Not Receiving

1. Check webhook URL in render worker env matches n8n
2. Verify shared secret matches on both sides
3. Test manually:
   ```bash
   curl -X POST https://n8n.yourdomain.com/webhook/render-complete \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your_secret" \
     -d '{"jobId":"test","status":"complete"}'
   ```

### Whisper Out of Memory

Reduce model size or compute type in `.env`:
```env
WHISPER_MODEL=medium          # Instead of large-v3
WHISPER_COMPUTE_TYPE=int8     # Instead of float16
```

## Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f render-worker
```

### Backup Data

```bash
# Stop services
docker compose -f docker-compose.production.yml stop

# Backup volumes
docker run --rm -v ethereal-redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data
docker run --rm -v ethereal-n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup.tar.gz /data

# Restart services
docker compose -f docker-compose.production.yml start
```

### Update Images

```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull

# Recreate containers
docker compose -f docker-compose.production.yml up -d

# Clean up old images
docker image prune -f
```

### Reset Everything

```bash
# Stop and remove containers, networks, volumes
docker compose -f docker-compose.production.yml down -v

# Remove all data (DESTRUCTIVE)
docker volume rm ethereal-redis_data ethereal-n8n_data ethereal-whisper_cache ethereal-render_db
```

## File Structure

```
docker/
├── docker-compose.production.yml  # Main compose file
├── .env.example                   # Environment template
├── .env                          # Your configuration (gitignored)
├── redis.conf                    # Redis configuration
├── README.md                     # This file
├── whisper/                      # Whisper service
│   ├── Dockerfile
│   └── server.py
└── render-worker/                # Render worker service
    └── Dockerfile
```

## Support

- Research docs: `.planning/phases/04-automation/04-RESEARCH.md`
- n8n integration: `.planning/phases/05-n8n/05-RESEARCH.md`
- Multi-machine: `.planning/phases/04-automation/MULTI_MACHINE_RENDER_FARM.md`
