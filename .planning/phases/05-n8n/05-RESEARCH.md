# Phase 5 Research: n8n Integration + Remote Access

**Phase:** 5 - n8n Integration + Remote Access
**Researched:** 2026-01-27
**Overall Confidence:** HIGH (well-established patterns)

---

## Executive Summary

Phase 5 completes the "phone to published video" automation pipeline by integrating n8n workflow automation with the render server and enabling secure remote access via Cloudflare Tunnel. The research confirms all three requirements (AUT-05, AUT-06, INF-02) are achievable with established, well-documented technologies.

**Key Finding:** YouTube video upload via n8n requires **self-hosted n8n** (not n8n Cloud) because Google blocks the OAuth callback URL for upload scopes on cloud-hosted instances. Since the user already has a home server environment, this is not a blocker.

**Recommendation:** Use Blotato as a middleware service for multi-platform social posting to avoid the complexity of managing individual API credentials for TikTok, Instagram, X/Twitter, etc. This trades a monthly fee ($29-97/month) for significant reliability and maintenance reduction.

---

## Requirement Analysis

### AUT-05: n8n Webhook Trigger on Render Complete

**Feasibility:** HIGH - Standard n8n pattern

The render server will POST to an n8n webhook when a job completes. The webhook triggers a workflow that processes the rendered file.

#### n8n Webhook Node Configuration

| Option | Recommended Setting | Rationale |
|--------|---------------------|-----------|
| HTTP Method | POST | Sending job metadata payload |
| Path | `/render-complete` | Descriptive endpoint name |
| Response Mode | Immediately | Don't block render server |
| Authentication | Header Auth | Simple, secure with shared secret |

**Webhook URL Structure:**
- Test: `https://n8n.yourdomain.com/webhook-test/render-complete`
- Production: `https://n8n.yourdomain.com/webhook/render-complete`

**Payload Schema (from render server):**
```json
{
  "jobId": "uuid",
  "status": "complete",
  "audioFile": "meditation-001.mp3",
  "outputFiles": [
    {
      "format": "1080p-landscape",
      "path": "/renders/2026-01-27_meditation-001_1080p.mp4",
      "driveUrl": "https://drive.google.com/..."
    }
  ],
  "template": "ethereal-flame",
  "whisperDescription": "A 10-minute guided meditation...",
  "duration": 600,
  "timestamp": "2026-01-27T10:30:00Z"
}
```

**Security Considerations:**
- Use Header Authentication with a strong shared secret
- Whitelist render server IP (if static)
- Maximum payload size: 16MB (configurable via `N8N_PAYLOAD_SIZE_MAX`)

#### Sources
- [n8n Webhook Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)

---

### AUT-06: n8n Workflow for Auto-Posting to YouTube/Social

**Feasibility:** HIGH with caveats

#### YouTube Upload

**Critical Requirement:** Must use **self-hosted n8n** for YouTube uploads.

n8n Cloud uses a redirect URL (`https://oauth.n8n.cloud/oauth2/callback`) that Google blocks for YouTube upload scopes. Self-hosted n8n allows custom OAuth credentials with your own redirect URL.

**Setup Steps:**
1. Create Google Cloud Project
2. Enable YouTube Data API v3
3. Configure OAuth consent screen (may need external publishing for production)
4. Create OAuth 2.0 credentials with:
   - Authorized redirect URI: `https://n8n.yourdomain.com/rest/oauth2-credential/callback`
   - Scopes: `youtube.upload`, `youtube.force-ssl`

**YouTube API Quotas:**
- 10,000 units/day default quota
- Video upload: ~1,600 units per upload
- Approximately 6 uploads/day on default quota
- Can request quota increase from Google

**Workflow Pattern:**
```
Webhook (render complete)
  -> Read Binary File (video from path)
  -> YouTube Upload (with metadata)
  -> IF error -> Slack/Email notification
  -> Update metadata spreadsheet
```

**Important Notes:**
- Videos must be uploaded as **private** initially if scheduling (Publish At only works for private videos)
- Consider YouTube API quotas when handling multiple uploads

#### Social Media Posting Options

**Option 1: Blotato (RECOMMENDED)**

Blotato is a middleware service that handles multi-platform posting through a single API.

| Aspect | Details |
|--------|---------|
| Supported Platforms | YouTube, Instagram, TikTok, X/Twitter, LinkedIn, Facebook, Threads, Pinterest, Bluesky |
| Pricing | $29/mo (Starter), $97/mo (Creator), $499/mo (Agency) |
| n8n Integration | Official n8n node available |
| API Access | Paid feature (reduces spam) |

**Why Blotato:**
- Single API for 9+ platforms
- Handles API authentication complexity
- Manages rate limits internally
- Official n8n integration
- No need to maintain individual platform credentials

**Option 2: Direct Platform APIs (Complex)**

If avoiding Blotato, each platform requires individual setup:

##### TikTok Content Posting API

| Constraint | Limit |
|------------|-------|
| Unaudited client | 5 users/24h, private videos only |
| Rate limit | 6 requests/minute per token |
| Publishing cap | 2 videos/minute, 20 videos/day |
| Max duration | 600 seconds |
| Caption limit | 2200 characters |

**Major Caveat:** TikTok explicitly states that "utility tools to help upload contents to the account(s) you or your team manages" is NOT an acceptable use case. API audit required for public visibility.

##### Instagram Graph API

| Constraint | Limit |
|------------|-------|
| Rate limit | 200 requests/hour per account |
| Token expiry | Short-lived: 1 hour, Long-lived: 60 days |
| Supported | Reels, Stories, Feed posts |
| Account type | Business or Creator only |

##### X/Twitter API v2

| Constraint | Details |
|------------|---------|
| Media upload | POST to `/2/media/upload` |
| Video limit | 1 video per post, max 2:20 duration |
| Free tier | Media upload may have limitations |
| Auth | OAuth 2.0 or OAuth 1.0a |

**Note:** v1.1 media upload endpoint was deprecated March 2025. Must use v2.

#### Recommended Workflow Architecture

```
Render Complete Webhook
  |
  v
Read Video File (binary)
  |
  v
Branch: Platform Selection
  |
  +-> YouTube Node (direct, self-hosted n8n)
  |     - Set as private with scheduled publish time
  |     - Include Whisper-generated description
  |
  +-> Blotato HTTP Request (for other platforms)
  |     - Single API call for Instagram + TikTok + X
  |     - Handles platform-specific formatting
  |
  v
Merge Results
  |
  v
Update Google Sheet (status, URLs, timestamps)
  |
  v
Send Notification (Slack/Email/Telegram)
```

#### Sources
- [n8n YouTube Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/)
- [YouTube Upload Workflow Template](https://n8n.io/workflows/3906-automate-youtube-uploads-with-ai-generated-metadata-from-google-drive/)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [Instagram Graph API Guide](https://getlate.dev/blog/instagram-api)
- [Blotato n8n Integration](https://n8n.io/integrations/blotato/)
- [n8n Social Media Workflows](https://n8n.io/workflows/categories/social-media/)

---

### INF-02: Remote Access via Cloudflare Tunnel

**Feasibility:** HIGH - Well-documented, free, secure

Cloudflare Tunnel provides secure remote access without exposing ports or requiring VPN setup.

#### Architecture

```
Phone (anywhere)
    |
    v (HTTPS)
Cloudflare Network
    |
    v (encrypted tunnel)
cloudflared daemon (home server)
    |
    v (localhost)
n8n / Render Server
```

**Key Benefits:**
- No inbound firewall ports required
- No public IP needed
- Free (Cloudflare One free tier)
- DDoS protection included
- SSL/TLS handled automatically

#### Prerequisites

1. **Cloudflare Account** (free tier sufficient)
2. **Domain managed by Cloudflare** (DNS)
3. **cloudflared installed** on home server
4. **Docker** (recommended for cloudflared)

#### Installation Options

| Method | Platform | Command/Notes |
|--------|----------|---------------|
| Docker | Any | `docker run cloudflare/cloudflared` |
| Package | Debian/Ubuntu | `apt install cloudflared` |
| Package | macOS | `brew install cloudflared` |
| Binary | Windows | Download from GitHub releases |

**Docker Compose Example:**
```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

#### Tunnel Configuration

**Services to Expose:**

| Service | Internal URL | Public Hostname |
|---------|--------------|-----------------|
| n8n | `http://localhost:5678` | `n8n.yourdomain.com` |
| Render API | `http://localhost:3000` | `render.yourdomain.com` |

**Dashboard Setup:**
1. Zero Trust Dashboard -> Networks -> Tunnels
2. Create tunnel with descriptive name (e.g., "homelab-render")
3. Install connector (copy Docker command with token)
4. Add public hostname mapping

#### Security Layers

**Layer 1: Cloudflare Tunnel (Network)**
- Outbound-only connections
- Block all inbound traffic at firewall
- Encrypted tunnel to Cloudflare edge

**Layer 2: Cloudflare Access (Authentication)**
Protect exposed applications with Cloudflare Access policies.

| Policy Type | Use Case |
|-------------|----------|
| Email OTP | Simple, works with any email |
| Google/GitHub | SSO for single user |
| Service Token | For webhook/API access |

**Recommended Access Policy for n8n:**
```
Application: n8n.yourdomain.com
Policy: Allow
Include: Email ending with @yourdomain.com
         OR email is user@gmail.com
Session Duration: 24 hours
```

**Layer 3: Application Authentication (n8n)**
- n8n has built-in basic auth
- Configure `N8N_BASIC_AUTH_ACTIVE=true`
- Set strong username/password

**For Webhook Endpoints (render server -> n8n):**
- Use Service Tokens instead of user authentication
- Service tokens provide Client ID + Client Secret
- Include in webhook headers for authentication

#### Security Best Practices

1. **Token Validation:** Enable "Protect with Access" in tunnel settings
2. **IP Restriction:** Consider allowing only Cloudflare IPs at origin firewall
3. **Logging:** Enable Access logging for audit trail
4. **Session Duration:** Set short durations for sensitive apps
5. **MFA:** Require MFA for admin access

#### Sources
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
- [Create Tunnel Dashboard](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [cloudflared Docker Image](https://hub.docker.com/r/cloudflare/cloudflared)
- [Cloudflare Access Policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Cloudflare Zero Trust Overview](https://developers.cloudflare.com/cloudflare-one/)

---

## n8n Self-Hosting Requirements

Since YouTube upload requires self-hosted n8n, here are the hosting requirements:

### Hardware Requirements

| Tier | CPU | RAM | Storage | Use Case |
|------|-----|-----|---------|----------|
| Minimum | 1 core | 2GB | 10GB | Light usage, few workflows |
| Recommended | 2-4 cores | 4-8GB | 20GB | Moderate usage, video handling |
| Production | 4+ cores | 8-16GB | 50GB+ | Heavy usage, large files |

**Note:** Video processing workflows handle large binary files. Budget additional RAM.

### Software Requirements

| Component | Requirement |
|-----------|-------------|
| Docker | v20.10.0+ (includes Compose) |
| Node.js | 20.19 - 24.x (if not using Docker) |
| Database | SQLite (default) or PostgreSQL (recommended) |

### Docker Compose Setup

```yaml
version: '3.8'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - GENERIC_TIMEZONE=America/Los_Angeles
      - N8N_PAYLOAD_SIZE_MAX=100  # MB, for video handling
    volumes:
      - n8n_data:/home/node/.n8n
      - /path/to/renders:/renders:ro  # Read access to rendered videos

volumes:
  n8n_data:
```

### Important Environment Variables

| Variable | Purpose | Recommended Value |
|----------|---------|-------------------|
| `WEBHOOK_URL` | External URL for webhooks | `https://n8n.yourdomain.com/` |
| `N8N_PAYLOAD_SIZE_MAX` | Max webhook payload (MB) | `100` for video metadata |
| `N8N_BASIC_AUTH_ACTIVE` | Enable basic auth | `true` |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | Save successful runs | `all` for debugging |

### Sources
- [n8n Docker Installation](https://docs.n8n.io/hosting/installation/docker/)
- [n8n Hosting Documentation](https://docs.n8n.io/hosting/)

---

## Complete System Architecture

```
[Phone/Browser]
       |
       v (HTTPS)
[Cloudflare Network]
       |
       +-- Access Policy (authentication)
       |
       v (encrypted tunnel)
[cloudflared daemon]
       |
       +--------+--------+
       |        |        |
       v        v        v
    [n8n]   [Render]  [Web UI]
    :5678    :3000     :3001
       |        |
       |        +-- Render complete webhook --> n8n
       |        +-- Output to Google Drive
       |
       v
[YouTube API] --> YouTube
[Blotato API] --> Instagram, TikTok, X, etc.
       |
       v
[Google Sheets] --> Metadata tracking
[Slack/Telegram] --> Notifications
```

---

## Implementation Recommendations

### Phase 5 Plan Structure

**Plan 05-01: Cloudflare Tunnel Setup**
- Install cloudflared on home server
- Create tunnel in Cloudflare dashboard
- Configure public hostnames
- Set up Cloudflare Access policies
- Test remote access from phone

**Plan 05-02: n8n Self-Hosted Deployment**
- Deploy n8n via Docker Compose
- Configure OAuth credentials for YouTube
- Set up persistent storage
- Configure webhook URL
- Test YouTube upload manually

**Plan 05-03: Render Complete Webhook**
- Implement webhook endpoint in render server
- Send POST to n8n on job completion
- Include job metadata and file paths
- Handle retry logic for failed deliveries

**Plan 05-04: YouTube Upload Workflow**
- Create n8n workflow for YouTube upload
- Map Whisper description to video metadata
- Handle scheduling (private -> public)
- Error handling and notifications

**Plan 05-05: Multi-Platform Posting (Optional)**
- Integrate Blotato API
- Create platform-specific content formatting
- Implement posting workflow
- Status tracking in Google Sheets

### Cost Considerations

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Tunnel | Free | Cloudflare One free tier |
| Cloudflare Access | Free | Up to 50 users |
| n8n Self-Hosted | Free | Open source |
| YouTube API | Free | 10k units/day default |
| Blotato | $29-97/mo | If using multi-platform posting |
| Google Sheets | Free | With Google account |

**Total Recurring Cost:** $0-97/month depending on social media needs

---

## Pitfalls and Mitigations

### Critical Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| Using n8n Cloud for YouTube | Upload fails | Must self-host n8n |
| TikTok API restrictions | Private-only videos, limited users | Use Blotato or accept limitations |
| YouTube quota exhaustion | Uploads fail | Monitor usage, request increase |
| Tunnel token exposure | Security breach | Use environment variables, never commit |

### Moderate Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| Token expiry (Instagram) | Workflow breaks | Implement auto-refresh every 50 days |
| Large video file handling | Memory issues | Increase n8n RAM, use streaming |
| n8n downtime | Webhooks lost | Implement retry queue in render server |
| Cloudflare Access session expiry | Re-auth needed | Set appropriate session duration |

### Minor Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| Timezone mismatches | Wrong publish times | Standardize on UTC, convert at edges |
| Missing metadata | Poor YouTube SEO | Validate Whisper output before upload |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Cloudflare Tunnel | HIGH | Official documentation, widely used |
| n8n Self-Hosting | HIGH | Well-documented, Docker-based |
| n8n Webhooks | HIGH | Core n8n functionality |
| YouTube Upload | HIGH | Documented, requires self-hosting |
| TikTok Direct API | MEDIUM | Restrictions may change, audit required |
| Instagram Direct API | MEDIUM | Token management complexity |
| Blotato Integration | HIGH | Official n8n node, simplifies multi-platform |

---

## Open Questions

1. **TikTok Audit:** If direct TikTok posting is needed, will the use case pass TikTok's API audit?
2. **YouTube Quota:** Will 6 uploads/day be sufficient, or should quota increase be requested?
3. **Blotato vs Direct:** Is the monthly cost of Blotato worth avoiding direct API complexity?

---

## Sources Summary

### Official Documentation
- [n8n Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n YouTube Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/)
- [n8n Docker Installation](https://docs.n8n.io/hosting/installation/docker/)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
- [Cloudflare Access Policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)

### Workflow Templates
- [YouTube Upload with AI Metadata](https://n8n.io/workflows/3906-automate-youtube-uploads-with-ai-generated-metadata-from-google-drive/)
- [Multi-Platform Upload (Drive to Social)](https://n8n.io/workflows/2894-upload-to-instagram-tiktok-and-youtube-from-google-drive/)
- [Social Media Automation Workflows](https://n8n.io/workflows/categories/social-media/)

### Third-Party Integrations
- [Blotato Pricing](https://www.blotato.com/pricing)
- [Blotato n8n Integration](https://n8n.io/integrations/blotato/)
- [cloudflared Docker Image](https://hub.docker.com/r/cloudflare/cloudflared)

---

*Research completed: 2026-01-27*
