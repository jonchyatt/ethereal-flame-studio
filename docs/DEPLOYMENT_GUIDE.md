# Ethereal Flame Studio Deployment Guide

**Domain:** whatamiappreciatingnow.com
**Architecture:** Vercel (UI) + Cloudflare (DNS/Tunnel) + Home Server (GPU Rendering)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 1: Cloudflare Setup](#2-phase-1-cloudflare-setup)
3. [Phase 2: Home Server Setup](#3-phase-2-home-server-setup)
4. [Phase 3: Vercel Deployment](#4-phase-3-vercel-deployment)
5. [Phase 4: Connect Everything](#5-phase-4-connect-everything)
6. [Phase 5: Test the Pipeline](#6-phase-5-test-the-pipeline)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### What You Need

- [ ] Domain: `whatamiappreciatingnow.com` (you have this)
- [ ] Cloudflare account (free) - https://dash.cloudflare.com
- [ ] Vercel account (free) - https://vercel.com
- [ ] Home PC with:
  - Windows 10/11
  - NVIDIA GPU (for rendering)
  - Docker Desktop installed
  - At least 16GB RAM recommended

### Install These First (Home PC)

```powershell
# 1. Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/
# Enable WSL2 backend during install

# 2. Verify Docker is running
docker --version
docker compose version

# 3. Git (if not installed)
winget install Git.Git
```

---

## 2. Phase 1: Cloudflare Setup

### Step 1.1: Add Your Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter: `whatamiappreciatingnow.com`
4. Select **Free plan**
5. Cloudflare will scan your DNS records

### Step 1.2: Update Nameservers

Cloudflare will show you two nameservers like:
```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```

Go to your domain registrar (where you bought the domain) and update the nameservers to these Cloudflare ones.

**Wait 5-30 minutes** for propagation. Cloudflare will email you when it's active.

### Step 1.3: Create a Cloudflare Tunnel

1. In Cloudflare Dashboard, go to **Zero Trust** (left sidebar)
2. Click **Networks** → **Tunnels**
3. Click **Create a tunnel**
4. Select **Cloudflared** connector
5. Name it: `ethereal-flame-home`
6. Click **Save tunnel**

### Step 1.4: Copy the Tunnel Token

You'll see a token like:
```
eyJhIjoiNjk...very-long-string...xMjM0NTY3ODkw
```

**SAVE THIS TOKEN** - you'll need it for the Docker setup.

### Step 1.5: Configure Public Hostnames (Do This Later)

Don't configure routes yet - we'll do this after the home server is running.

---

## 3. Phase 2: Home Server Setup

### Step 2.1: Navigate to Project

```powershell
cd C:\Users\jonch\Projects\ethereal-flame-studio
```

### Step 2.2: Create Environment File

```powershell
cd docker
copy .env.example .env
```

### Step 2.3: Edit the .env File

Open `docker\.env` in your editor and fill in these values:

```env
# ============================================
# MACHINE IDENTIFICATION
# ============================================
MACHINE_ID=desktop-primary
MACHINE_NAME=Desktop RTX

# ============================================
# CLOUDFLARE TUNNEL
# ============================================
# Paste the token from Step 1.4
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiNjk...your-token-here...

# ============================================
# REDIS
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379

# ============================================
# N8N CONFIGURATION
# ============================================
N8N_HOST=n8n.whatamiappreciatingnow.com
N8N_WEBHOOK_URL=https://n8n.whatamiappreciatingnow.com/
N8N_PROTOCOL=https

# Create a strong password for n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-strong-password-here

# Generate a random encryption key (32+ chars)
N8N_ENCRYPTION_KEY=generate-a-random-32-char-string-here

# ============================================
# WHISPER TRANSCRIPTION
# ============================================
WHISPER_MODEL=large-v3
WHISPER_DEVICE=cuda
WHISPER_COMPUTE_TYPE=float16

# ============================================
# RENDER WORKER
# ============================================
RENDER_CONCURRENCY=1
RENDER_OUTPUT_DIR=C:/Users/jonch/Videos/EtherealFlame/renders
RENDER_TEMP_DIR=C:/Users/jonch/Videos/EtherealFlame/temp

# ============================================
# NOTIFICATIONS (Optional)
# ============================================
# Get a topic from https://ntfy.sh
NTFY_TOPIC=ethereal-flame-renders
NTFY_SERVER=https://ntfy.sh

# ============================================
# TIMEZONE
# ============================================
TZ=America/Los_Angeles
```

### Step 2.4: Create Output Directories

```powershell
# Create render output folders
mkdir C:\Users\jonch\Videos\EtherealFlame\renders -Force
mkdir C:\Users\jonch\Videos\EtherealFlame\temp -Force
```

### Step 2.5: Start the Docker Stack

```powershell
cd C:\Users\jonch\Projects\ethereal-flame-studio\docker

# Build the images (first time only, takes 5-10 minutes)
docker compose -f docker-compose.production.yml build

# Start all services
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps
```

You should see:
```
NAME                STATUS              PORTS
redis               running             6379/tcp
n8n                 running             5678/tcp
cloudflared         running
faster-whisper      running             8000/tcp
render-worker       running
```

### Step 2.6: Verify Tunnel is Connected

1. Go back to Cloudflare Dashboard → Zero Trust → Tunnels
2. Your tunnel `ethereal-flame-home` should show **Healthy** status

If it shows "Down", check:
```powershell
docker logs cloudflared
```

---

## 4. Phase 3: Vercel Deployment

### Step 3.1: Install Vercel CLI (if not installed)

```powershell
npm install -g vercel
```

### Step 3.2: Login to Vercel

```powershell
vercel login
```

### Step 3.3: Deploy the Project

```powershell
cd C:\Users\jonch\Projects\ethereal-flame-studio

# First deployment (will ask questions)
vercel

# Answer the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: ethereal-flame-studio
# - Directory: ./
# - Override settings? No
```

### Step 3.4: Deploy to Production

```powershell
vercel --prod
```

You'll get a URL like: `https://ethereal-flame-studio.vercel.app`

### Step 3.5: Add Custom Domain in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your `ethereal-flame-studio` project
3. Go to **Settings** → **Domains**
4. Add: `whatamiappreciatingnow.com`
5. Also add: `www.whatamiappreciatingnow.com`

Vercel will show you DNS records to add.

---

## 5. Phase 4: Connect Everything

### Step 4.1: Configure Cloudflare DNS for Vercel

In Cloudflare Dashboard → DNS → Records:

**For the main domain (Vercel):**
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | @ | cname.vercel-dns.com | Proxied (orange) |
| CNAME | www | cname.vercel-dns.com | Proxied (orange) |

### Step 4.2: Configure Tunnel Routes (Home Server)

In Cloudflare Dashboard → Zero Trust → Tunnels → `ethereal-flame-home` → Configure:

Click **Public Hostname** tab, then **Add a public hostname**:

**Route 1: Render API**
| Field | Value |
|-------|-------|
| Subdomain | `render` |
| Domain | `whatamiappreciatingnow.com` |
| Type | HTTP |
| URL | `localhost:3000` |

Click **Save hostname**

**Route 2: n8n**
| Field | Value |
|-------|-------|
| Subdomain | `n8n` |
| Domain | `whatamiappreciatingnow.com` |
| Type | HTTP |
| URL | `n8n:5678` |

Click **Save hostname**

### Step 4.3: Add Environment Variables to Vercel

In Vercel Dashboard → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_RENDER_API_URL` | `https://render.whatamiappreciatingnow.com` |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | `https://n8n.whatamiappreciatingnow.com` |

Click **Save** and redeploy:

```powershell
vercel --prod
```

### Step 4.4: Configure Cloudflare Access (Security)

To protect your n8n and render API:

1. Cloudflare Dashboard → Zero Trust → Access → Applications
2. Click **Add an application** → **Self-hosted**

**Application 1: n8n**
| Field | Value |
|-------|-------|
| Name | n8n Admin |
| Domain | `n8n.whatamiappreciatingnow.com` |
| Policy Name | Allow Me |
| Action | Allow |
| Include | Emails ending in `@gmail.com` (your email) |

**Application 2: Render API** (optional, can leave open for Vercel)
| Field | Value |
|-------|-------|
| Name | Render API |
| Domain | `render.whatamiappreciatingnow.com` |
| Policy Name | Allow Vercel |
| Action | Bypass |
| Include | Everyone (or IP ranges) |

---

## 6. Phase 5: Test the Pipeline

### Step 5.1: Test Each Endpoint

**Test 1: Main Website**
```
Open: https://whatamiappreciatingnow.com
Expected: See the Ethereal Flame Studio UI
```

**Test 2: n8n Dashboard**
```
Open: https://n8n.whatamiappreciatingnow.com
Expected: n8n login page (use credentials from .env)
```

**Test 3: Render API Health**
```powershell
curl https://render.whatamiappreciatingnow.com/api/health
# Expected: {"status":"ok"}
```

### Step 5.2: Test from Phone

1. Open `https://whatamiappreciatingnow.com` on your phone
2. You should see the full UI
3. Try uploading an audio file
4. Submit a render job

### Step 5.3: Check Logs

```powershell
# View all logs
docker compose -f docker-compose.production.yml logs -f

# View specific service
docker logs n8n -f
docker logs render-worker -f
docker logs cloudflared -f
```

---

## 7. Troubleshooting

### Tunnel Not Connecting

```powershell
# Check tunnel logs
docker logs cloudflared

# Common fixes:
# 1. Verify token in .env is correct (no extra spaces)
# 2. Restart cloudflared
docker restart cloudflared
```

### n8n Not Accessible

```powershell
# Check n8n is running
docker logs n8n

# Common fixes:
# 1. Verify N8N_HOST matches your subdomain
# 2. Check Cloudflare tunnel route points to n8n:5678
```

### Vercel Custom Domain Not Working

1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME record points to `cname.vercel-dns.com`
3. In Cloudflare, ensure proxy is enabled (orange cloud)
4. Wait 5-10 minutes for SSL certificate

### GPU Not Detected in Docker

```powershell
# Check NVIDIA Docker runtime
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi

# If this fails, install NVIDIA Container Toolkit:
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
```

### Redis Connection Errors

```powershell
# Check Redis is running
docker logs redis

# Test Redis connection
docker exec -it redis redis-cli ping
# Expected: PONG
```

---

## Quick Reference

### URLs

| Service | URL |
|---------|-----|
| Main Website | https://whatamiappreciatingnow.com |
| n8n Dashboard | https://n8n.whatamiappreciatingnow.com |
| Render API | https://render.whatamiappreciatingnow.com |

### Docker Commands

```powershell
# Start all services
docker compose -f docker-compose.production.yml up -d

# Stop all services
docker compose -f docker-compose.production.yml down

# View logs
docker compose -f docker-compose.production.yml logs -f

# Restart a service
docker restart n8n

# Rebuild after code changes
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

### Vercel Commands

```powershell
# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Vercel     │   │  Cloudflare   │   │  Cloudflare   │
│               │   │    Tunnel     │   │    Tunnel     │
│ Main Website  │   │               │   │               │
│ whatamiapp... │   │ render.what...│   │ n8n.what...   │
└───────────────┘   └───────┬───────┘   └───────┬───────┘
                            │                   │
                            └─────────┬─────────┘
                                      │
                          ┌───────────▼───────────┐
                          │    YOUR HOME PC       │
                          │                       │
                          │  ┌─────────────────┐  │
                          │  │   cloudflared   │  │
                          │  └────────┬────────┘  │
                          │           │           │
                          │  ┌────────┴────────┐  │
                          │  │                 │  │
                          │  ▼                 ▼  │
                          │ ┌────┐          ┌────┐│
                          │ │n8n │          │API ││
                          │ │:5678│         │:3000││
                          │ └────┘          └────┘│
                          │                       │
                          │  ┌─────────────────┐  │
                          │  │     Redis       │  │
                          │  │   (BullMQ)      │  │
                          │  └────────┬────────┘  │
                          │           │           │
                          │  ┌────────┴────────┐  │
                          │  │  Render Worker  │  │
                          │  │   (GPU/NVENC)   │  │
                          │  └─────────────────┘  │
                          │                       │
                          │  ┌─────────────────┐  │
                          │  │ faster-whisper  │  │
                          │  │  (GPU/CUDA)     │  │
                          │  └─────────────────┘  │
                          └───────────────────────┘
```

---

## Next Steps

After deployment is working:

1. **Set up n8n YouTube workflow** - See `.planning/phases/05-n8n/05-PLAN.md`
2. **Configure Google OAuth** - For YouTube uploads
3. **Set up notifications** - ntfy for render complete alerts
4. **Test full pipeline** - Phone → Render → YouTube

---

*Deployment guide created: 2026-01-28*
*For Ethereal Flame Studio v1*
