# Phase 5 Execution Plan: n8n Integration + Remote Access

**Phase:** 05-n8n
**Created:** 2026-01-27
**Plans:** 4 plans in 3 waves
**Dependencies:** Phase 4 (Automation) must be complete

---

## Overview

This phase completes the "phone to published video" pipeline by enabling secure remote access to the home render server and integrating n8n workflow automation for YouTube posting and multi-platform distribution.

**Requirements Covered:**
- AUT-05: n8n webhook trigger on render complete
- AUT-06: n8n workflow for auto-posting to YouTube/social platforms
- INF-02: Remote access to home render server via Cloudflare Tunnel

**Key Constraint:** YouTube upload requires self-hosted n8n (not n8n Cloud) due to Google OAuth callback URL restrictions.

---

## Wave Structure

| Wave | Plans | Parallel | Description |
|------|-------|----------|-------------|
| 1 | 05-01, 05-02 | Yes | Infrastructure setup (tunnel + n8n) |
| 2 | 05-03 | No | Webhook integration (requires render server + n8n) |
| 3 | 05-04 | No | YouTube workflow (requires webhook working) |

---

## Plans

### Plan 05-01: Cloudflare Tunnel Setup (Wave 1)

**Objective:** Establish secure remote access to home server without exposing ports

**Depends on:** None (infrastructure setup)

**Files Modified:**
- `docker-compose.yml` (new cloudflared service)
- `.env.example` (CLOUDFLARE_TUNNEL_TOKEN placeholder)
- `docs/REMOTE_ACCESS.md` (setup documentation)

---

```yaml
---
phase: 05-n8n
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - .env.example
  - docs/REMOTE_ACCESS.md
autonomous: false
user_setup:
  - service: cloudflare
    why: "Tunnel requires Cloudflare account and domain"
    env_vars:
      - name: CLOUDFLARE_TUNNEL_TOKEN
        source: "Cloudflare Dashboard -> Zero Trust -> Networks -> Tunnels -> Create -> Copy token"
    dashboard_config:
      - task: "Add domain to Cloudflare (DNS managed)"
        location: "Cloudflare Dashboard -> Websites -> Add site"
      - task: "Create tunnel named 'ethereal-flame'"
        location: "Cloudflare Dashboard -> Zero Trust -> Networks -> Tunnels"
      - task: "Add public hostname mappings"
        location: "Tunnel config -> Public Hostnames"

must_haves:
  truths:
    - "User can access n8n from phone outside home network"
    - "User can access render API from phone outside home network"
    - "No inbound firewall ports are exposed"
    - "Connection is encrypted end-to-end"
  artifacts:
    - path: "docker-compose.yml"
      provides: "cloudflared service configuration"
      contains: "cloudflare/cloudflared"
    - path: ".env.example"
      provides: "Environment variable documentation"
      contains: "CLOUDFLARE_TUNNEL_TOKEN"
  key_links:
    - from: "cloudflared container"
      to: "Cloudflare edge network"
      via: "outbound HTTPS connection"
      pattern: "tunnel run"
---
```

<objective>
Set up Cloudflare Tunnel for secure remote access to home render server.

Purpose: Enable phone-to-server communication without VPN or port forwarding
Output: Working tunnel exposing n8n and render API to public hostnames
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-n8n/05-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add cloudflared to Docker Compose</name>
  <files>docker-compose.yml, .env.example</files>
  <action>
Create or update docker-compose.yml with cloudflared service:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - ethereal-network

networks:
  ethereal-network:
    driver: bridge
```

Add to .env.example:
```
# Cloudflare Tunnel (get from Zero Trust dashboard)
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
```

Do NOT start the container yet - user must configure Cloudflare first.
  </action>
  <verify>
`docker-compose config` validates without errors
`.env.example` contains CLOUDFLARE_TUNNEL_TOKEN
  </verify>
  <done>
Docker Compose file ready for cloudflared deployment
  </done>
</task>

<task type="auto">
  <name>Task 2: Create remote access documentation</name>
  <files>docs/REMOTE_ACCESS.md</files>
  <action>
Create documentation covering:

1. Prerequisites (Cloudflare account, domain)
2. Tunnel creation steps (dashboard walkthrough)
3. Public hostname configuration:
   - n8n.yourdomain.com -> localhost:5678
   - render.yourdomain.com -> localhost:3000
4. Cloudflare Access policy setup (optional but recommended)
5. Starting the tunnel: `docker-compose up -d cloudflared`
6. Verification steps

Include security recommendations:
- Enable Cloudflare Access for admin endpoints
- Use service tokens for webhook authentication
- Keep tunnel token in .env (never commit)
  </action>
  <verify>
`docs/REMOTE_ACCESS.md` exists and is readable
Contains sections for Prerequisites, Setup, Security
  </verify>
  <done>
User has clear instructions for Cloudflare Tunnel setup
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Configure Cloudflare Tunnel</action>
  <instructions>
1. Log into Cloudflare Dashboard
2. Go to Zero Trust -> Networks -> Tunnels
3. Create tunnel named "ethereal-flame"
4. Copy the tunnel token to .env file as CLOUDFLARE_TUNNEL_TOKEN
5. Add public hostname mappings:
   - n8n.yourdomain.com -> http://n8n:5678
   - render.yourdomain.com -> http://localhost:3000
6. Run: docker-compose up -d cloudflared
7. Verify tunnel shows "Healthy" in dashboard
  </instructions>
  <resume-signal>Type "tunnel configured" when complete</resume-signal>
</task>

</tasks>

<verification>
- [ ] `docker-compose ps` shows cloudflared running
- [ ] Cloudflare dashboard shows tunnel as "Healthy"
- [ ] Can access n8n.yourdomain.com from phone (will show n8n login once n8n deployed)
</verification>

<success_criteria>
Cloudflare Tunnel established and routing traffic to localhost services
</success_criteria>

<output>
After completion, create `.planning/phases/05-n8n/05-01-SUMMARY.md`
</output>

---

### Plan 05-02: n8n Self-Hosted Deployment (Wave 1, parallel with 05-01)

**Objective:** Deploy n8n via Docker with YouTube OAuth configured

**Depends on:** None (can run parallel with tunnel setup)

**Files Modified:**
- `docker-compose.yml` (n8n service)
- `.env.example` (n8n configuration variables)
- `docs/N8N_SETUP.md` (setup documentation)

---

```yaml
---
phase: 05-n8n
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - .env.example
  - docs/N8N_SETUP.md
autonomous: false
user_setup:
  - service: google-cloud
    why: "YouTube upload requires OAuth credentials"
    env_vars: []
    dashboard_config:
      - task: "Create Google Cloud Project"
        location: "console.cloud.google.com -> New Project"
      - task: "Enable YouTube Data API v3"
        location: "APIs & Services -> Library -> YouTube Data API v3"
      - task: "Configure OAuth consent screen"
        location: "APIs & Services -> OAuth consent screen"
      - task: "Create OAuth 2.0 credentials"
        location: "APIs & Services -> Credentials -> Create -> OAuth client ID"

must_haves:
  truths:
    - "n8n is accessible via web browser"
    - "n8n can authenticate with YouTube API"
    - "Webhook endpoints are externally accessible"
    - "Workflow data persists across container restarts"
  artifacts:
    - path: "docker-compose.yml"
      provides: "n8n service configuration"
      contains: "n8nio/n8n"
    - path: ".env.example"
      provides: "n8n environment documentation"
      contains: "N8N_HOST"
  key_links:
    - from: "n8n container"
      to: "Cloudflare Tunnel"
      via: "HTTP on port 5678"
      pattern: "5678:5678"
    - from: "n8n"
      to: "YouTube API"
      via: "OAuth 2.0"
      pattern: "oauth2-credential"
---
```

<objective>
Deploy self-hosted n8n with YouTube OAuth credentials configured.

Purpose: Enable automated YouTube uploads (requires self-hosted, not n8n Cloud)
Output: Running n8n instance with YouTube credential ready
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/05-n8n/05-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add n8n service to Docker Compose</name>
  <files>docker-compose.yml, .env.example</files>
  <action>
Add n8n service to docker-compose.yml:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - GENERIC_TIMEZONE=${TZ:-America/Los_Angeles}
      - N8N_PAYLOAD_SIZE_MAX=100
    volumes:
      - n8n_data:/home/node/.n8n
      - ${RENDER_OUTPUT_DIR:-./renders}:/renders:ro
    networks:
      - ethereal-network

volumes:
  n8n_data:
```

Add to .env.example:
```
# n8n Configuration
N8N_HOST=n8n.yourdomain.com
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/
N8N_USER=admin
N8N_PASSWORD=change_this_password

# Render output directory (n8n reads rendered videos from here)
RENDER_OUTPUT_DIR=/path/to/renders

# Timezone
TZ=America/Los_Angeles
```
  </action>
  <verify>
`docker-compose config` validates
n8n service includes all required environment variables
Volume mount for /renders exists
  </verify>
  <done>
n8n Docker service configured and ready to deploy
  </done>
</task>

<task type="auto">
  <name>Task 2: Create n8n setup documentation</name>
  <files>docs/N8N_SETUP.md</files>
  <action>
Create documentation covering:

1. Google Cloud Project setup:
   - Create project
   - Enable YouTube Data API v3
   - Configure OAuth consent screen (External, requires verification for production)
   - Create OAuth 2.0 Client ID (Web application type)
   - Add redirect URI: https://n8n.yourdomain.com/rest/oauth2-credential/callback

2. Starting n8n:
   ```bash
   docker-compose up -d n8n
   ```

3. First-time n8n setup:
   - Access https://n8n.yourdomain.com
   - Log in with N8N_USER/N8N_PASSWORD
   - Go to Settings -> Credentials -> Add Credential
   - Select "YouTube OAuth2 API"
   - Enter Client ID and Client Secret from Google Cloud
   - Click "Connect" and authorize

4. Testing YouTube connection:
   - Create test workflow with YouTube node
   - Verify can list channels (proves connection works)

5. Quota notes:
   - Default: 10,000 units/day
   - Video upload: ~1,600 units
   - Approximately 6 uploads/day on default quota
  </action>
  <verify>
`docs/N8N_SETUP.md` exists
Contains Google Cloud setup instructions
Contains YouTube credential setup steps
  </verify>
  <done>
User has complete n8n + YouTube OAuth setup guide
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Configure YouTube OAuth in n8n</action>
  <instructions>
1. Create Google Cloud Project at console.cloud.google.com
2. Enable YouTube Data API v3
3. Configure OAuth consent screen (select External)
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Redirect URI: https://n8n.yourdomain.com/rest/oauth2-credential/callback
5. Copy Client ID and Client Secret
6. Start n8n: docker-compose up -d n8n
7. Access n8n at https://n8n.yourdomain.com
8. Add YouTube OAuth2 credential with your Client ID/Secret
9. Authorize the connection

Test by creating a workflow with YouTube node that lists your channels.
  </instructions>
  <resume-signal>Type "youtube connected" when credential is working</resume-signal>
</task>

</tasks>

<verification>
- [ ] `docker-compose ps` shows n8n running
- [ ] Can access n8n web interface
- [ ] YouTube credential shows "Connected" status
- [ ] Test workflow can list YouTube channels
</verification>

<success_criteria>
n8n deployed with working YouTube OAuth credential
</success_criteria>

<output>
After completion, create `.planning/phases/05-n8n/05-02-SUMMARY.md`
</output>

---

### Plan 05-03: Render Complete Webhook (Wave 2)

**Objective:** Integrate render server with n8n via webhook on job completion

**Depends on:** 05-01 (tunnel), 05-02 (n8n), Phase 4 render server

**Files Modified:**
- `src/lib/render/webhookNotifier.ts` (new)
- `src/lib/render/renderQueue.ts` (add webhook call)
- `.env.example` (webhook configuration)

---

```yaml
---
phase: 05-n8n
plan: 03
type: execute
wave: 2
depends_on: ["05-01", "05-02"]
files_modified:
  - src/lib/render/webhookNotifier.ts
  - src/lib/render/renderQueue.ts
  - .env.example
autonomous: true

must_haves:
  truths:
    - "n8n receives notification when render completes"
    - "Webhook payload contains all metadata needed for YouTube upload"
    - "Failed webhook deliveries are retried"
    - "Webhook includes authentication header"
  artifacts:
    - path: "src/lib/render/webhookNotifier.ts"
      provides: "Webhook notification logic"
      exports: ["notifyRenderComplete", "WebhookPayload"]
    - path: "src/lib/render/renderQueue.ts"
      provides: "Render queue with webhook integration"
      contains: "notifyRenderComplete"
  key_links:
    - from: "renderQueue.ts"
      to: "webhookNotifier.ts"
      via: "import and call on job complete"
      pattern: "notifyRenderComplete"
    - from: "webhookNotifier.ts"
      to: "n8n webhook endpoint"
      via: "HTTP POST"
      pattern: "fetch.*webhook"
---
```

<objective>
Implement webhook notification from render server to n8n on job completion.

Purpose: Trigger automated workflows when videos finish rendering
Output: Render server POSTs job metadata to n8n webhook endpoint
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/05-n8n/05-RESEARCH.md
@.planning/phases/04-automation/*-SUMMARY.md (if exists)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create webhook notifier module</name>
  <files>src/lib/render/webhookNotifier.ts, .env.example</files>
  <action>
Create webhook notifier with retry logic:

```typescript
// src/lib/render/webhookNotifier.ts

export interface WebhookPayload {
  jobId: string;
  status: 'complete' | 'failed';
  audioFile: string;
  outputFiles: Array<{
    format: string;
    path: string;
    driveUrl?: string;
  }>;
  template: string;
  whisperDescription?: string;
  duration: number;
  timestamp: string;
}

interface WebhookConfig {
  url: string;
  authHeader?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export async function notifyRenderComplete(
  payload: WebhookPayload,
  config?: Partial<WebhookConfig>
): Promise<boolean> {
  const url = config?.url || process.env.N8N_WEBHOOK_URL;
  const authHeader = config?.authHeader || process.env.N8N_WEBHOOK_SECRET;
  const maxRetries = config?.maxRetries ?? 3;
  const retryDelayMs = config?.retryDelayMs ?? 5000;

  if (!url) {
    console.warn('No webhook URL configured, skipping notification');
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'X-Webhook-Secret': authHeader }),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Webhook delivered successfully (attempt ${attempt})`);
        return true;
      }

      console.warn(`Webhook failed with status ${response.status} (attempt ${attempt})`);
    } catch (error) {
      console.error(`Webhook error (attempt ${attempt}):`, error);
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  console.error(`Webhook delivery failed after ${maxRetries} attempts`);
  return false;
}
```

Add to .env.example:
```
# n8n Webhook (for render complete notifications)
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/render-complete
N8N_WEBHOOK_SECRET=your_shared_secret_here
```
  </action>
  <verify>
TypeScript compiles without errors
WebhookPayload interface matches research spec
Retry logic implemented with exponential backoff
  </verify>
  <done>
Webhook notifier module ready for integration
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate webhook into render queue</name>
  <files>src/lib/render/renderQueue.ts</files>
  <action>
Modify render queue to call webhook on job completion:

1. Import notifyRenderComplete from webhookNotifier
2. After job completes successfully, call:

```typescript
import { notifyRenderComplete, WebhookPayload } from './webhookNotifier';

// In job completion handler:
const payload: WebhookPayload = {
  jobId: job.id,
  status: 'complete',
  audioFile: job.audioFile,
  outputFiles: job.outputs.map(o => ({
    format: o.format,
    path: o.filePath,
    driveUrl: o.driveUrl,
  })),
  template: job.template,
  whisperDescription: job.whisperResult?.text,
  duration: job.duration,
  timestamp: new Date().toISOString(),
};

// Fire and forget (don't block queue)
notifyRenderComplete(payload).catch(err => {
  console.error('Webhook notification failed:', err);
});
```

3. Also call on failure with status: 'failed'

Important: Webhook should not block the render queue. Use fire-and-forget pattern.
  </action>
  <verify>
Render queue imports and calls notifyRenderComplete
Webhook is called on both success and failure
Webhook errors don't crash the queue
  </verify>
  <done>
Render server sends webhook notifications on job completion
  </done>
</task>

<task type="auto">
  <name>Task 3: Create n8n webhook receiver workflow</name>
  <files>docs/N8N_WORKFLOWS.md</files>
  <action>
Document the n8n workflow setup for receiving render complete webhooks:

```markdown
# n8n Workflow: Render Complete Receiver

## Webhook Node Configuration

1. Create new workflow in n8n
2. Add Webhook node as trigger:
   - HTTP Method: POST
   - Path: render-complete
   - Authentication: Header Auth
   - Header Name: X-Webhook-Secret
   - Header Value: (your shared secret from .env)
   - Response Mode: Immediately

3. Production webhook URL:
   https://n8n.yourdomain.com/webhook/render-complete

4. Test webhook URL (for development):
   https://n8n.yourdomain.com/webhook-test/render-complete

## Expected Payload

{
  "jobId": "uuid",
  "status": "complete",
  "audioFile": "meditation-001.mp3",
  "outputFiles": [...],
  "template": "ethereal-flame",
  "whisperDescription": "...",
  "duration": 600,
  "timestamp": "2026-01-27T10:30:00Z"
}

## Testing

Use curl to test the webhook:
curl -X POST https://n8n.yourdomain.com/webhook-test/render-complete \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret" \
  -d '{"jobId":"test","status":"complete",...}'
```

Include screenshot locations for n8n UI if helpful.
  </action>
  <verify>
docs/N8N_WORKFLOWS.md exists
Contains webhook configuration steps
Includes test curl command
  </verify>
  <done>
User can configure n8n webhook receiver following documentation
  </done>
</task>

</tasks>

<verification>
- [ ] TypeScript compiles without errors
- [ ] Render queue calls webhook on completion
- [ ] Test curl to webhook-test endpoint succeeds
- [ ] n8n workflow receives and logs webhook payload
</verification>

<success_criteria>
Render server successfully notifies n8n when jobs complete
</success_criteria>

<output>
After completion, create `.planning/phases/05-n8n/05-03-SUMMARY.md`
</output>

---

### Plan 05-04: YouTube Upload Workflow (Wave 3)

**Objective:** Create n8n workflow that uploads completed videos to YouTube

**Depends on:** 05-02 (n8n with YouTube OAuth), 05-03 (webhook integration)

**Files Modified:**
- `docs/N8N_WORKFLOWS.md` (add YouTube workflow)
- `.env.example` (YouTube defaults)

---

```yaml
---
phase: 05-n8n
plan: 04
type: execute
wave: 3
depends_on: ["05-02", "05-03"]
files_modified:
  - docs/N8N_WORKFLOWS.md
  - .env.example
autonomous: false

must_haves:
  truths:
    - "Completed videos automatically upload to YouTube"
    - "Video title and description come from render job metadata"
    - "Whisper transcription populates video description"
    - "User receives notification on upload success or failure"
  artifacts:
    - path: "docs/N8N_WORKFLOWS.md"
      provides: "YouTube upload workflow documentation"
      contains: "YouTube Upload"
  key_links:
    - from: "n8n webhook node"
      to: "n8n YouTube node"
      via: "workflow execution"
      pattern: "YouTube.*Upload"
    - from: "render payload"
      to: "YouTube metadata"
      via: "field mapping in workflow"
      pattern: "whisperDescription"
---
```

<objective>
Create n8n workflow for automated YouTube upload with Whisper-generated descriptions.

Purpose: Complete the phone-to-published pipeline
Output: Working n8n workflow that uploads to YouTube on render complete
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/05-n8n/05-RESEARCH.md
@.planning/phases/05-n8n/05-03-SUMMARY.md (after 05-03 complete)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Document YouTube upload workflow</name>
  <files>docs/N8N_WORKFLOWS.md</files>
  <action>
Add YouTube upload workflow section to N8N_WORKFLOWS.md:

```markdown
# YouTube Upload Workflow

## Workflow Structure

1. **Webhook Trigger** (from Plan 05-03)
   - Receives render complete notification

2. **IF Node: Check Status**
   - Condition: status === "complete"
   - True: Continue to upload
   - False: Send failure notification

3. **Read Binary File Node**
   - File Path: {{ $json.outputFiles[0].path }}
   - Binary Property Name: video

4. **YouTube Upload Node**
   - Credential: Your YouTube OAuth2
   - Resource: Video
   - Title: {{ $json.audioFile.replace('.mp3', '') }} - Ethereal Flame
   - Description:
     ```
     {{ $json.whisperDescription || 'Audio visualization created with Ethereal Flame Studio' }}

     ---
     Created with Ethereal Flame Studio
     Template: {{ $json.template }}
     Duration: {{ Math.floor($json.duration / 60) }}:{{ ($json.duration % 60).toString().padStart(2, '0') }}
     ```
   - Privacy Status: private (or scheduled with Publish At)
   - Category: 10 (Music)
   - Tags: meditation, visualization, audio reactive

5. **IF Node: Upload Success**
   - Check YouTube response for video ID

6. **Notification Node** (Slack, Email, or Telegram)
   - Success: "Video uploaded: {videoUrl}"
   - Failure: "Upload failed: {error}"

7. **Google Sheets Node** (Optional)
   - Update metadata spreadsheet with video URL

## Workflow JSON Export

Export and save workflow JSON to: workflows/youtube-upload.json
This allows version control of workflow configuration.

## Quota Considerations

- Default quota: 10,000 units/day
- Video upload: ~1,600 units
- Max ~6 uploads/day on default quota
- Request increase at Google Cloud Console if needed

## Privacy and Scheduling

- Videos must upload as "private" to use Publish At
- Set publishAt timestamp for scheduled release
- Or upload as "public" for immediate visibility
```

Add sample environment variables to .env.example if needed for defaults.
  </action>
  <verify>
docs/N8N_WORKFLOWS.md contains YouTube upload section
Workflow structure includes all required nodes
Quota information documented
  </verify>
  <done>
YouTube upload workflow fully documented
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Build and test YouTube upload workflow in n8n</action>
  <instructions>
1. Open n8n at https://n8n.yourdomain.com
2. Create new workflow named "YouTube Upload"
3. Add nodes following the documented structure:
   - Webhook (already configured in 05-03)
   - IF node for status check
   - Read Binary File node
   - YouTube Upload node (use your OAuth credential)
   - Notification node (optional)
4. Configure field mappings per documentation
5. Test with a small video file:
   - Trigger webhook manually with test payload
   - Verify video appears in YouTube Studio (private)
6. Save and activate workflow
  </instructions>
  <resume-signal>Type "workflow tested" when video uploads successfully</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Document multi-platform posting (optional)</name>
  <files>docs/N8N_WORKFLOWS.md</files>
  <action>
Add optional Blotato integration section:

```markdown
# Multi-Platform Posting (Optional)

If you want to post to Instagram, TikTok, X/Twitter, etc.,
use Blotato as a middleware service.

## Why Blotato?

- Single API for 9+ platforms
- Handles platform-specific formatting
- Manages rate limits internally
- Official n8n integration available
- Cost: $29-97/month depending on plan

## Workflow Addition

After YouTube upload, add:

1. **HTTP Request Node** (Blotato API)
   - Method: POST
   - URL: https://api.blotato.com/posts
   - Headers: Authorization: Bearer {{ $env.BLOTATO_API_KEY }}
   - Body: Platform-specific formatting

2. **Merge Node**
   - Combine YouTube + Blotato results

3. **Update Google Sheets**
   - Log all platform URLs

## Direct API Alternative

If avoiding Blotato, each platform requires separate setup:
- TikTok: Strict API restrictions, audit required
- Instagram: Business account required, token refresh needed
- X/Twitter: v2 API, media upload complexity

See 05-RESEARCH.md for detailed API constraints.
```
  </action>
  <verify>
docs/N8N_WORKFLOWS.md contains Blotato section
Alternative approaches documented
  </verify>
  <done>
Multi-platform posting options documented for future expansion
  </done>
</task>

</tasks>

<verification>
- [ ] YouTube upload workflow exists in n8n
- [ ] Test video uploaded to YouTube successfully
- [ ] Video title and description populated from webhook data
- [ ] Workflow is activated and ready for production
</verification>

<success_criteria>
Complete phone-to-YouTube pipeline working:
1. Render completes on home server
2. Webhook triggers n8n
3. Video uploads to YouTube with metadata
4. User notified of completion
</success_criteria>

<output>
After completion, create `.planning/phases/05-n8n/05-04-SUMMARY.md`
</output>

---

## Phase Verification

After all plans complete:

- [ ] Can access n8n from phone outside home network
- [ ] Render complete triggers n8n webhook
- [ ] YouTube upload workflow receives payload and uploads video
- [ ] Video has correct title and Whisper description
- [ ] Full pipeline works: trigger render from phone -> video published to YouTube

---

## Success Criteria (Phase 5)

1. **Remote Access:** User triggers render from phone while away from home
2. **Auto-Publishing:** Completed video auto-posts to YouTube with Whisper-generated description
3. **Secure Tunnel:** Home render server accessible via Cloudflare Tunnel (no exposed ports)
4. **Phone-to-Published:** Complete flow works without touching a computer

---

## Notes

- **Blotato integration is optional** - YouTube is the primary target for v1
- **YouTube quota may limit throughput** - ~6 videos/day on default quota
- **Self-hosted n8n required** - n8n Cloud cannot upload to YouTube due to OAuth restrictions
- **Cloudflare Access recommended** - Add authentication layer for admin access

---

*Phase 5 plan created: 2026-01-27*
