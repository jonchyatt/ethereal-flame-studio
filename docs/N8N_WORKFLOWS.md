# n8n Workflows for Ethereal Flame Studio

This document describes the n8n workflows for automating video rendering and publishing.

## Workflow Overview

```
[Render Server] --webhook--> [n8n] ---> [YouTube]
                                  \---> [Notifications]
                                   \--> [Google Sheets]
```

---

## Workflow 1: Render Complete Receiver

### Purpose

Receives webhook notifications when render jobs complete (success or failure).

### Webhook Configuration

1. Create a new workflow in n8n
2. Add a **Webhook** node as the trigger

**Webhook Node Settings:**

| Setting | Value |
|---------|-------|
| HTTP Method | POST |
| Path | `render-complete` |
| Authentication | Header Auth |
| Credential Name | (create new) |
| Header Name | `X-Webhook-Secret` |
| Header Value | Your shared secret (from `.env`) |
| Response Mode | Immediately |

### Webhook URLs

- **Test URL:** `https://n8n.yourdomain.com/webhook-test/render-complete`
- **Production URL:** `https://n8n.yourdomain.com/webhook/render-complete`

### Expected Payload

The render server sends this JSON payload:

```json
{
  "jobId": "abc123",
  "status": "complete",
  "audioFile": "meditation-morning.mp3",
  "outputFiles": [
    {
      "format": "1080p",
      "path": "/renders/2026-01-27_meditation-morning_1080p.mp4",
      "driveUrl": "https://drive.google.com/file/d/..."
    }
  ],
  "template": "ethereal-flame",
  "whisperDescription": "A 10-minute guided morning meditation...",
  "duration": 600,
  "timestamp": "2026-01-27T10:30:00Z",
  "batchId": "batch-xyz"
}
```

**For failed jobs:**

```json
{
  "jobId": "abc123",
  "status": "failed",
  "audioFile": "meditation-morning.mp3",
  "outputFiles": [],
  "template": "ethereal-flame",
  "timestamp": "2026-01-27T10:30:00Z",
  "batchId": "batch-xyz",
  "errorMessage": "GPU memory exhausted"
}
```

### Testing the Webhook

Use curl to test:

```bash
# Test successful completion
curl -X POST https://n8n.yourdomain.com/webhook-test/render-complete \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_shared_secret" \
  -d '{
    "jobId": "test-001",
    "status": "complete",
    "audioFile": "test-audio.mp3",
    "outputFiles": [
      {
        "format": "1080p",
        "path": "/renders/test_1080p.mp4"
      }
    ],
    "template": "ethereal-flame",
    "whisperDescription": "Test meditation video",
    "duration": 300,
    "timestamp": "2026-01-27T10:00:00Z"
  }'

# Test failure notification
curl -X POST https://n8n.yourdomain.com/webhook-test/render-complete \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_shared_secret" \
  -d '{
    "jobId": "test-002",
    "status": "failed",
    "audioFile": "test-audio.mp3",
    "outputFiles": [],
    "template": "ethereal-flame",
    "timestamp": "2026-01-27T10:00:00Z",
    "errorMessage": "Test error message"
  }'
```

---

## Workflow 2: YouTube Upload

### Purpose

Automatically upload completed videos to YouTube with metadata from the render job.

### Workflow Structure

```
[Webhook Trigger]
       |
       v
[IF: status === "complete"]
       |
   +---+---+
   |       |
   v       v
[True]  [False]
   |       |
   v       v
[Read Binary File]  [Send Failure Alert]
   |
   v
[YouTube: Upload Video]
   |
   v
[IF: Upload Success]
   |
   +---+---+
   |       |
   v       v
[True]  [False]
   |       |
   v       v
[Success Notification]  [Error Notification]
```

### Node Configuration

#### 1. Webhook Node
(Same as Workflow 1)

#### 2. IF Node: Check Status

- **Condition:** `{{ $json.status }}` equals `complete`

#### 3. Read Binary File Node

- **File Path:** `{{ $json.outputFiles[0].path }}`
- **Binary Property Name:** `video`

**Note:** The file path must be accessible from n8n. The docker-compose mounts render output to `/renders`.

#### 4. YouTube Upload Node

| Setting | Value |
|---------|-------|
| Credential | Your YouTube OAuth2 credential |
| Resource | Video |
| Operation | Upload |
| Title | `{{ $json.audioFile.replace('.mp3', '').replace('.wav', '') }} - Ethereal Flame` |
| Binary Property | `video` |
| Category ID | `10` (Music) |
| Privacy Status | `private` (or `public`) |

**Description:**
```
{{ $json.whisperDescription || 'Audio visualization created with Ethereal Flame Studio' }}

---
Created with Ethereal Flame Studio
Template: {{ $json.template }}
Duration: {{ Math.floor($json.duration / 60) }}:{{ ($json.duration % 60).toString().padStart(2, '0') }}
```

**Tags:**
```
meditation, visualization, audio reactive, {{ $json.template }}
```

#### 5. Notification Node (Slack/Email/Telegram)

**Success message:**
```
Video uploaded successfully!
Title: {{ $json.audioFile }}
YouTube URL: https://youtube.com/watch?v={{ $node["YouTube"].json.id }}
```

**Failure message:**
```
YouTube upload failed!
File: {{ $json.audioFile }}
Error: {{ $node["YouTube"].error.message }}
```

### Workflow JSON Export

Export your workflow as JSON for version control:

1. In n8n, open your workflow
2. Click the three dots menu (...)
3. Select **Export as JSON**
4. Save to: `workflows/youtube-upload.json`

---

## Workflow 3: Multi-Platform Posting (Optional)

### Using Blotato

[Blotato](https://www.blotato.com/) is a middleware service for multi-platform social media posting.

**Why Blotato:**
- Single API for 9+ platforms (Instagram, TikTok, X/Twitter, etc.)
- Handles platform-specific formatting
- Manages rate limits internally
- Official n8n integration

**Cost:** $29-97/month depending on plan

### Workflow Addition

After YouTube upload, add:

```
[YouTube Upload Success]
       |
       v
[HTTP Request: Blotato API]
       |
       v
[Update Google Sheets]
```

#### HTTP Request Node for Blotato

| Setting | Value |
|---------|-------|
| Method | POST |
| URL | `https://api.blotato.com/posts` |
| Authentication | Header Auth |
| Header Name | `Authorization` |
| Header Value | `Bearer {{ $env.BLOTATO_API_KEY }}` |
| Content-Type | `application/json` |

**Body:**
```json
{
  "platforms": ["instagram", "tiktok", "twitter"],
  "mediaUrl": "{{ $json.driveUrl }}",
  "caption": "{{ $json.whisperDescription.substring(0, 280) }} #meditation #visualization"
}
```

### Direct API Alternative

If avoiding Blotato, each platform requires separate setup:

| Platform | Complexity | Notes |
|----------|------------|-------|
| TikTok | High | Strict API restrictions, audit required |
| Instagram | Medium | Business account required, token refresh |
| X/Twitter | Medium | v2 API, media upload complexity |

See `05-RESEARCH.md` for detailed API constraints.

---

## Environment Variables for Webhooks

Add to `.env`:

```bash
# n8n webhook endpoint
N8N_WEBHOOK_RENDER_URL=https://n8n.yourdomain.com/webhook/render-complete

# Shared secret for webhook authentication
N8N_WEBHOOK_SECRET=your_strong_secret_here

# Optional: Blotato API key for multi-platform posting
BLOTATO_API_KEY=your_blotato_api_key
```

---

## Quota Considerations

### YouTube API

- Default quota: 10,000 units/day
- Video upload: ~1,600 units
- **Maximum ~6 uploads/day on default quota**

To request higher quota:
1. Go to Google Cloud Console
2. Navigate to YouTube Data API v3
3. Click "Quotas" -> "Request quota increase"

### Privacy and Scheduling

- Videos uploaded as `private` can use `publishAt` for scheduled release
- Videos uploaded as `public` are immediately visible
- Consider uploading as `private` first, then manually making public after review

---

## Troubleshooting

### Webhook not receiving data

1. Check webhook URL is correct in render server `.env`
2. Verify n8n workflow is activated (toggle in top right)
3. Check n8n logs: `docker logs ethereal-n8n`
4. Test with curl command above

### YouTube upload fails

1. Check OAuth credential is connected (Settings -> Credentials)
2. Verify file path is accessible from n8n container
3. Check YouTube API quota (may be exhausted)
4. Ensure video format is supported (MP4, MOV, AVI)

### File not found error

The n8n container mounts renders at `/renders`. Ensure:
- File path in webhook starts with `/renders/`
- Volume mount is correct in docker-compose.yml
- File actually exists at that path

---

## Best Practices

1. **Always test with webhook-test URL first** before activating production
2. **Keep workflows simple** - one workflow per purpose
3. **Use error handling nodes** to catch and notify on failures
4. **Export workflows as JSON** for version control
5. **Monitor quota usage** especially for YouTube
