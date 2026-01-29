# Research: Multi-Machine Render Farm Architecture

**Phase:** 4
**Plans:** 04-10, 04-11, 04-13, 04-14
**Created:** 2026-01-28
**Status:** Draft

---

## Overview

The user has 2-3 machines (desktop, laptop, possibly more) that can act as render nodes. This document covers how to:
1. Set up each machine as a render server
2. Expose each via Cloudflare Tunnel
3. Let the user choose which machine to render on
4. Route jobs to the selected machine

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB APP (Vercel)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Machine Selector: [Desktop (Online) ▼]                   │  │
│  │                    [Laptop (Offline)]                     │  │
│  │                    [Other (Online)]                       │  │
│  │                                                           │  │
│  │  [RENDER] button → sends to n8n with selected machine    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    n8n ORCHESTRATOR                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Receive job: { machine: "desktop", audio, template }  │  │
│  │  2. Look up machine URL from registry                     │  │
│  │  3. POST to render-desktop.yourdomain.com/api/render     │  │
│  │  4. Return job ID to web app                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ render-desktop  │ │ render-laptop   │ │ render-other    │
│ .yourdomain.com │ │ .yourdomain.com │ │ .yourdomain.com │
│                 │ │                 │ │                 │
│ Cloudflare      │ │ Cloudflare      │ │ Cloudflare      │
│ Tunnel          │ │ Tunnel          │ │ Tunnel          │
│       ↓         │ │       ↓         │ │       ↓         │
│ localhost:3000  │ │ localhost:3000  │ │ localhost:3000  │
│                 │ │                 │ │                 │
│ Render Server   │ │ Render Server   │ │ Render Server   │
│ + FFmpeg        │ │ + FFmpeg        │ │ + FFmpeg        │
│ + Whisper       │ │ + Whisper       │ │ + Whisper       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Machine Registry

### Configuration File

Each machine is registered in a config file or database:

```json
{
  "machines": [
    {
      "id": "desktop",
      "name": "Desktop (RTX 4090)",
      "tunnelUrl": "https://render-desktop.yourdomain.com",
      "internalUrl": "http://localhost:3000",
      "capabilities": {
        "gpu": "RTX 4090",
        "vram": 24,
        "maxResolution": "8K",
        "priority": 1
      },
      "healthEndpoint": "/api/health"
    },
    {
      "id": "laptop",
      "name": "Laptop (RTX 3070)",
      "tunnelUrl": "https://render-laptop.yourdomain.com",
      "internalUrl": "http://localhost:3000",
      "capabilities": {
        "gpu": "RTX 3070",
        "vram": 8,
        "maxResolution": "4K",
        "priority": 2
      },
      "healthEndpoint": "/api/health"
    }
  ]
}
```

### Where to Store

**Option 1: Static config file (simple)**
- Store in `config/machines.json`
- Edit manually when adding machines
- Sync to n8n via workflow variable

**Option 2: Database (dynamic)**
- Store in SQLite alongside render jobs
- Can update via API
- Better for future automation

**Recommendation:** Start with static config, migrate to database later.

---

## Per-Machine Cloudflare Tunnel

### Setup (per machine)

Each machine runs its own cloudflared daemon with a unique hostname.

**On Desktop:**
```bash
# Create tunnel (one-time)
cloudflared tunnel create render-desktop

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: render-desktop
credentials-file: /home/user/.cloudflared/render-desktop.json

ingress:
  - hostname: render-desktop.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run render-desktop
```

**On Laptop:**
```bash
# Create tunnel (one-time)
cloudflared tunnel create render-laptop

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: render-laptop
credentials-file: /home/user/.cloudflared/render-laptop.json

ingress:
  - hostname: render-laptop.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run render-laptop
```

### DNS Records

In Cloudflare DNS, add CNAME records:
- `render-desktop` → `<tunnel-id>.cfargotunnel.com`
- `render-laptop` → `<tunnel-id>.cfargotunnel.com`

Or use the Zero Trust Dashboard to configure public hostnames.

---

## Health Check Endpoint

Each render server exposes `/api/health`:

```typescript
// src/app/api/health/route.ts

export async function GET() {
  const status = {
    status: 'online',
    machineId: process.env.MACHINE_ID,
    timestamp: new Date().toISOString(),
    queue: {
      pending: await getQueueLength('pending'),
      processing: await getQueueLength('processing'),
    },
    system: {
      gpu: await getGpuInfo(),
      memory: await getMemoryInfo(),
      disk: await getDiskInfo(),
    },
  };

  return Response.json(status);
}
```

### Health Response Example

```json
{
  "status": "online",
  "machineId": "desktop",
  "timestamp": "2026-01-28T10:30:00Z",
  "queue": {
    "pending": 0,
    "processing": 1
  },
  "system": {
    "gpu": {
      "name": "NVIDIA GeForce RTX 4090",
      "vram": {
        "total": 24576,
        "used": 4200,
        "free": 20376
      }
    },
    "memory": {
      "total": 32768,
      "used": 8192,
      "free": 24576
    },
    "disk": {
      "total": 1000000,
      "used": 450000,
      "free": 550000
    }
  }
}
```

---

## Machine Selector UI

### Web App Component

```tsx
// components/MachineSelector.tsx

interface Machine {
  id: string;
  name: string;
  tunnelUrl: string;
  status: 'online' | 'offline' | 'busy';
}

export function MachineSelector({
  machines,
  selected,
  onSelect
}: {
  machines: Machine[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <select
      value={selected || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="..."
    >
      <option value="" disabled>Select render machine...</option>
      {machines.map((m) => (
        <option
          key={m.id}
          value={m.id}
          disabled={m.status === 'offline'}
        >
          {m.name} ({m.status})
        </option>
      ))}
    </select>
  );
}
```

### Fetching Machine Status

```typescript
// lib/machines.ts

export async function getMachineStatuses(machines: MachineConfig[]): Promise<Machine[]> {
  const results = await Promise.allSettled(
    machines.map(async (m) => {
      try {
        const res = await fetch(`${m.tunnelUrl}/api/health`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        const data = await res.json();
        return {
          ...m,
          status: data.queue.processing > 0 ? 'busy' : 'online',
        };
      } catch {
        return {
          ...m,
          status: 'offline',
        };
      }
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...machines[i], status: 'offline' }
  );
}
```

---

## Job Routing

### n8n Workflow Logic

```
Webhook receives:
{
  "machine": "desktop",
  "audioFile": "meditation.mp3",
  "template": "ethereal-flame",
  "format": "youtube-1080p"
}

Switch Node:
  - machine === "desktop" → Route A
  - machine === "laptop" → Route B
  - machine === "other" → Route C

Route A (Desktop):
  HTTP Request to https://render-desktop.yourdomain.com/api/render
  Body: { audioFile, template, format }

Route B (Laptop):
  HTTP Request to https://render-laptop.yourdomain.com/api/render
  Body: { audioFile, template, format }
```

### Alternative: Dynamic Routing

Instead of hard-coded routes, use expression to build URL:

```javascript
// n8n expression
{{ $('Webhook').item.json.machine === 'desktop'
   ? 'https://render-desktop.yourdomain.com'
   : $('Webhook').item.json.machine === 'laptop'
   ? 'https://render-laptop.yourdomain.com'
   : 'https://render-other.yourdomain.com' }}/api/render
```

Or use machine registry as workflow static data:

```javascript
// Look up from static data
{{ $workflow.staticData.machines[$json.machine].tunnelUrl }}/api/render
```

---

## Machine Not Always On

User mentioned machines are not always on but can be turned on when needed.

### Options

**Option 1: Manual power-on (simplest)**
- User turns on machine before submitting render
- Health check shows offline if not on
- Web app shows error: "Machine offline. Please power on and try again."

**Option 2: Wake-on-LAN (automatic)**
- n8n sends WoL magic packet to wake machine
- Wait for health check to pass
- Then submit render job

**Option 3: Scheduled operation**
- Machines powered on at scheduled times (e.g., 10pm-6am)
- Batch jobs queued during the day, processed overnight

### Wake-on-LAN Setup (if desired)

1. Enable WoL in BIOS on each machine
2. Get MAC address: `ipconfig /all` (Windows) or `ip link` (Linux)
3. Install WoL tool: `npm install wake_on_lan`
4. Store MAC addresses in machine registry:

```json
{
  "id": "desktop",
  "name": "Desktop",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "tunnelUrl": "https://render-desktop.yourdomain.com"
}
```

5. n8n workflow node to send WoL:

```javascript
// Code node
const wol = require('wake_on_lan');
const macAddress = $json.macAddress;

await new Promise((resolve, reject) => {
  wol.wake(macAddress, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

return { success: true };
```

**Note:** WoL only works on same LAN. If n8n is cloud-hosted, you'd need a local relay.

---

## Render Server Per Machine

Each machine runs the same render server software:

```
ethereal-flame-studio/
├── render-server/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── src/
│   │   ├── server.ts
│   │   ├── render.ts
│   │   └── health.ts
│   └── config/
│       └── machine.json  ← Machine-specific config
```

### Machine-Specific Config

```json
// config/machine.json
{
  "machineId": "desktop",
  "gpu": "RTX 4090",
  "maxConcurrentJobs": 1,
  "outputDir": "/renders",
  "tempDir": "/tmp/renders"
}
```

### Docker Compose per Machine

```yaml
version: '3.8'

services:
  render-server:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - MACHINE_ID=${MACHINE_ID}
      - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - N8N_WEBHOOK_SECRET=${N8N_WEBHOOK_SECRET}
    volumes:
      - ./config:/app/config
      - ./renders:/renders
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

---

## Implementation Plan

### Phase 4 (Automation)

1. **04-10-PLAN.md: Multi-machine configuration**
   - Create machine registry schema
   - Config file format
   - Environment variables per machine

2. **04-11-PLAN.md: Health monitoring**
   - `/api/health` endpoint on render server
   - Status response format
   - Queue length reporting

3. **04-13-PLAN.md: Machine selector UI**
   - Dropdown component
   - Fetch machine status before rendering
   - Show online/offline/busy state

4. **04-14-PLAN.md: Job routing**
   - n8n workflow routing logic
   - Dynamic URL construction
   - Error handling for offline machines

### Phase 5 (n8n)

5. **05-01-PLAN.md: Cloudflare Tunnel (updated)**
   - Per-machine tunnel configuration
   - Multiple hostnames

---

## Open Questions

1. **Machine specs:** Need exact GPU models and VRAM for each machine
2. **Wake-on-LAN:** Do you want automatic wake, or manual power-on?
3. **Fallback routing:** If selected machine is offline, should we offer alternative?
4. **Load balancing:** Ever want auto-selection based on queue depth?

---

## Next Steps

1. [ ] User provides machine specs when available
2. [ ] Decide on manual vs WoL power management
3. [ ] Create 04-10 through 04-14 detailed plans
4. [ ] Implement health check endpoint
5. [ ] Build machine selector component
6. [ ] Configure per-machine Cloudflare Tunnels

---

*Research completed: 2026-01-28*
