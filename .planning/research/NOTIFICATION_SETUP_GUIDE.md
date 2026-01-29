# Notification Setup Guide for Render Pipeline

**Project:** Ethereal Flame Studio
**Created:** 2026-01-28
**Status:** Research Complete

---

## Overview

This guide covers setting up push notifications for the Ethereal Flame Studio render pipeline using **ntfy** (primary) and **Telegram** (backup). Notifications keep you informed of render job status from any device.

---

## Table of Contents

1. [Self-Hosted ntfy Setup](#1-self-hosted-ntfy-setup)
2. [Mobile App Setup](#2-mobile-app-setup)
3. [Notification Templates for Render Pipeline](#3-notification-templates-for-render-pipeline)
4. [Advanced ntfy Features](#4-advanced-ntfy-features)
5. [Node.js Integration](#5-nodejs-integration)
6. [n8n Integration](#6-n8n-integration)
7. [Alternative: Telegram Bot Setup](#7-alternative-telegram-bot-setup)

---

## 1. Self-Hosted ntfy Setup

### Why Self-Host?

- **Privacy**: Notification content stays on your infrastructure
- **No rate limits**: Unlike ntfy.sh free tier
- **Custom domain**: Professional appearance
- **Authentication**: Control who can publish/subscribe

### Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  ntfy:
    image: binwiederhier/ntfy:latest
    container_name: ntfy
    command:
      - serve
    environment:
      - TZ=America/Los_Angeles
      - NTFY_BASE_URL=https://ntfy.yourdomain.com
      - NTFY_CACHE_FILE=/var/lib/ntfy/cache.db
      - NTFY_CACHE_DURATION=48h
      - NTFY_AUTH_FILE=/var/lib/ntfy/auth.db
      - NTFY_AUTH_DEFAULT_ACCESS=deny-all
      - NTFY_BEHIND_PROXY=true
      - NTFY_ATTACHMENT_CACHE_DIR=/var/lib/ntfy/attachments
      - NTFY_ATTACHMENT_TOTAL_SIZE_LIMIT=1G
      - NTFY_ATTACHMENT_FILE_SIZE_LIMIT=15M
      - NTFY_ATTACHMENT_EXPIRY_DURATION=24h
      - NTFY_ENABLE_LOGIN=true
      - NTFY_ENABLE_SIGNUP=false
    volumes:
      - ./ntfy-data/cache:/var/cache/ntfy
      - ./ntfy-data/lib:/var/lib/ntfy
      - ./ntfy-data/config:/etc/ntfy
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --tries=1 http://localhost:80/v1/health -O - | grep -Eo '\"healthy\"\\s*:\\s*true' || exit 1"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    init: true
```

### Server Configuration File

Create `./ntfy-data/config/server.yml`:

```yaml
# Base URL for your ntfy server
base-url: "https://ntfy.yourdomain.com"

# Listen address
listen-http: ":80"

# Cache settings
cache-file: "/var/lib/ntfy/cache.db"
cache-duration: "48h"

# Authentication
auth-file: "/var/lib/ntfy/auth.db"
auth-default-access: "deny-all"

# Attachment settings
attachment-cache-dir: "/var/lib/ntfy/attachments"
attachment-total-size-limit: "1G"
attachment-file-size-limit: "15M"
attachment-expiry-duration: "24h"

# Rate limiting (generous for self-hosted)
visitor-request-limit-burst: 60
visitor-request-limit-replenish: "5s"
visitor-email-limit-burst: 16
visitor-email-limit-replenish: "1h"

# iOS push support (forward to upstream)
upstream-base-url: "https://ntfy.sh"
```

### Authentication Setup

After starting the container, create users and set permissions:

```bash
# Start the container
docker compose up -d

# Create admin user
docker exec -it ntfy ntfy user add --role=admin admin
# Enter password when prompted

# Create a regular user for the render pipeline
docker exec -it ntfy ntfy user add renderbot
# Enter password when prompted

# Create access tokens for API use
docker exec -it ntfy ntfy token add renderbot

# Grant permissions to topics
docker exec -it ntfy ntfy access renderbot ethereal-renders rw
docker exec -it ntfy ntfy access renderbot ethereal-errors rw
docker exec -it ntfy ntfy access renderbot ethereal-batch rw

# Verify users and access
docker exec -it ntfy ntfy user list
docker exec -it ntfy ntfy access list
```

### HTTPS Configuration with Caddy

Create `Caddyfile`:

```caddyfile
ntfy.yourdomain.com {
    reverse_proxy ntfy:80

    # Enable compression
    encode gzip

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
```

Add Caddy to docker-compose:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./caddy-data:/data
      - ./caddy-config:/config
    restart: unless-stopped

  ntfy:
    # ... existing ntfy config ...
    ports: []  # Remove port mapping, Caddy handles it
    networks:
      - caddy_net

networks:
  caddy_net:
    driver: bridge
```

### Alternative: Cloudflare Tunnel

For servers without public IP or complex firewall rules:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
```

Configure the tunnel in Cloudflare dashboard to route `ntfy.yourdomain.com` to `http://ntfy:80`.

---

## 2. Mobile App Setup

### iOS App Configuration

1. **Download**: Install "ntfy" from the [App Store](https://apps.apple.com/us/app/ntfy/id1625396347)

2. **Add Self-Hosted Server**:
   - Open app, tap Settings (gear icon)
   - Tap "Add server"
   - Enter: `https://ntfy.yourdomain.com`
   - Set as default server

3. **Authentication**:
   - In server settings, tap "Authentication"
   - Enter username and password
   - Or use access token: tap "Use token" and paste token

4. **Subscribe to Topics**:
   - Tap "+" button
   - Enter topic name: `ethereal-renders`
   - Repeat for: `ethereal-errors`, `ethereal-batch`

5. **iOS Push Notifications**:
   - For instant delivery on iOS, your self-hosted server must forward poll requests to ntfy.sh
   - This is configured in `server.yml` with `upstream-base-url`
   - iOS has strict background limits; this workaround enables instant push

### Android App Configuration

1. **Download**: Install from [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/)

2. **Add Self-Hosted Server**:
   - Open app, tap menu (three dots)
   - Tap "Settings" > "Add server"
   - Enter: `https://ntfy.yourdomain.com`

3. **Authentication**:
   - In server settings, add credentials
   - Username/password or access token

4. **Subscribe to Topics**:
   - Tap "+" (Subscribe)
   - Topic: `ethereal-renders`
   - Select your self-hosted server
   - Repeat for other topics

5. **Instant Delivery** (recommended for render notifications):
   - Go to Settings > "Default server"
   - Enable "Instant delivery"
   - Note: Uses more battery but delivers notifications immediately

6. **Battery Optimization**:
   - Exempt ntfy from battery optimization
   - Settings > Apps > ntfy > Battery > Unrestricted

### Topic Naming Convention

| Topic | Purpose |
|-------|---------|
| `ethereal-renders` | Individual render job updates |
| `ethereal-batch` | Batch completion summaries |
| `ethereal-errors` | Errors and failures (high priority) |
| `ethereal-progress` | Progress updates (optional, can be noisy) |

---

## 3. Notification Templates for Render Pipeline

### Job Submitted

```javascript
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Job Submitted',
  message: `Job #${jobId} queued\nAudio: ${audioName}\nTemplate: ${template}\nFormat: ${format}`,
  priority: 'default',
  tags: ['inbox_tray', 'render'],
  click: `https://studio.etherealflame.com/jobs/${jobId}`
});
```

### Render Started

```javascript
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Started',
  message: `Job #${jobId} is now rendering\nAudio: ${audioName}\nEstimated time: ${estimatedMinutes} min`,
  priority: 'low',
  tags: ['hourglass_flowing_sand', 'render'],
  click: `https://studio.etherealflame.com/jobs/${jobId}`
});
```

### Render Progress

```javascript
await sendNotification({
  topic: 'ethereal-progress',
  title: `Rendering: ${percentage}%`,
  message: `Job #${jobId}\nAudio: ${audioName}\nFrame: ${currentFrame}/${totalFrames}\nETA: ${eta}`,
  priority: 'min',
  tags: ['fire', String(Math.floor(percentage / 10) * 10)], // Shows progress emoji
});
```

### Render Complete

```javascript
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Complete!',
  message: `Job #${jobId} finished successfully\nAudio: ${audioName}\nDuration: ${renderTime}\nFile: ${fileName}`,
  priority: 'default',
  tags: ['white_check_mark', 'tada'],
  click: driveUrl,
  actions: [
    { action: 'view', label: 'View in Drive', url: driveUrl },
    { action: 'view', label: 'Download', url: downloadUrl }
  ],
  attach: thumbnailUrl  // Preview thumbnail
});
```

### Render Failed

```javascript
await sendNotification({
  topic: 'ethereal-errors',
  title: 'Render Failed!',
  message: `Job #${jobId} encountered an error\nAudio: ${audioName}\nError: ${errorMessage}\nRetry: ${retryCount}/${maxRetries}`,
  priority: 'high',
  tags: ['x', 'warning', 'render'],
  click: `https://studio.etherealflame.com/jobs/${jobId}/logs`,
  actions: [
    { action: 'http', label: 'Retry', url: `https://api.etherealflame.com/jobs/${jobId}/retry`, method: 'POST' },
    { action: 'view', label: 'View Logs', url: `https://studio.etherealflame.com/jobs/${jobId}/logs` }
  ]
});
```

### Batch Complete Summary

```javascript
await sendNotification({
  topic: 'ethereal-batch',
  title: 'Batch Render Complete',
  message: `Batch #${batchId} finished\n` +
    `Total: ${totalJobs} jobs\n` +
    `Successful: ${successCount}\n` +
    `Failed: ${failedCount}\n` +
    `Duration: ${totalDuration}\n` +
    `Output folder: ${folderName}`,
  priority: failedCount > 0 ? 'high' : 'default',
  tags: failedCount > 0 ? ['warning', 'batch'] : ['sparkles', 'batch'],
  click: driveFolderUrl,
  actions: [
    { action: 'view', label: 'Open Folder', url: driveFolderUrl },
    { action: 'view', label: 'View Report', url: `https://studio.etherealflame.com/batches/${batchId}` }
  ]
});
```

---

## 4. Advanced ntfy Features

### Priority Levels

| Priority | Value | Behavior |
|----------|-------|----------|
| `min` | 1 | No sound, no vibration |
| `low` | 2 | No sound, may vibrate |
| `default` | 3 | Sound and vibration |
| `high` | 4 | Sound, vibration, shows even in DND |
| `urgent` | 5 | Persistent notification, loud sound |

**Usage recommendation for render pipeline**:
- `min`: Progress updates (optional subscription)
- `low`: Render started
- `default`: Render complete, batch complete
- `high`: Render failed, batch failed
- `urgent`: Critical system errors (disk full, GPU failure)

### Action Buttons

Three types of actions:

#### 1. View Action (opens URL)
```javascript
actions: [
  {
    action: 'view',
    label: 'Open in Drive',
    url: 'https://drive.google.com/file/d/xxx',
    clear: true  // Clear notification after tap
  }
]
```

#### 2. HTTP Action (triggers API call)
```javascript
actions: [
  {
    action: 'http',
    label: 'Retry Render',
    url: 'https://api.etherealflame.com/jobs/123/retry',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${token}'
    },
    body: '{"priority": "high"}',
    clear: true
  }
]
```

#### 3. Broadcast Action (Android only - for Tasker/MacroDroid)
```javascript
actions: [
  {
    action: 'broadcast',
    label: 'Mark Complete',
    intent: 'io.etherealflame.MARK_COMPLETE',
    extras: {
      'jobId': '123',
      'status': 'acknowledged'
    }
  }
]
```

### Attachments (Thumbnails)

Send a thumbnail preview with render completion:

```javascript
// Option 1: Attach from URL
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Complete',
  message: 'Your video is ready!',
  attach: 'https://storage.etherealflame.com/thumbnails/job-123.jpg',
  filename: 'preview.jpg'
});

// Option 2: Upload attachment directly (requires binary POST)
const thumbnail = await fs.readFile('thumbnail.jpg');
await fetch('https://ntfy.yourdomain.com/ethereal-renders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Filename': 'preview.jpg',
    'Title': 'Render Complete',
    'Tags': 'white_check_mark'
  },
  body: thumbnail
});
```

### Tags and Emoji Icons

ntfy automatically converts certain tags to emojis:

| Tag | Emoji | Use Case |
|-----|-------|----------|
| `white_check_mark` | ✅ | Success |
| `x` | ❌ | Failure |
| `warning` | ⚠️ | Warning/Error |
| `fire` | 🔥 | Render in progress |
| `tada` | 🎉 | Batch complete |
| `hourglass_flowing_sand` | ⏳ | Processing |
| `inbox_tray` | 📥 | Job queued |
| `rocket` | 🚀 | Started |
| `stopwatch` | ⏱️ | Timing |

Custom tags that don't match emojis appear as labels below the notification.

### Custom Icons

```javascript
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Complete',
  message: 'Your video is ready!',
  icon: 'https://etherealflame.com/icons/flame-logo.png'  // PNG or JPEG only
});
```

### Delayed Delivery

Schedule notifications for later:

```javascript
// Deliver at specific time
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Daily Render Summary',
  message: summaryText,
  delay: '9am'  // Deliver at 9 AM
});

// Deliver after duration
await sendNotification({
  topic: 'ethereal-renders',
  title: 'Render Timeout Warning',
  message: `Job #${jobId} has been running for 2 hours`,
  delay: '2h'  // Deliver in 2 hours
});
```

### Email Forwarding

Forward important notifications to email:

```javascript
await sendNotification({
  topic: 'ethereal-errors',
  title: 'Critical: Render Farm Offline',
  message: 'All render workers are unreachable',
  priority: 'urgent',
  email: 'admin@etherealflame.com'  // Also sends email
});
```

Requires SMTP configuration in `server.yml`:

```yaml
smtp-sender-addr: "smtp.gmail.com:587"
smtp-sender-user: "notifications@etherealflame.com"
smtp-sender-pass: "app-password-here"
smtp-sender-from: "Ethereal Flame Studio <notifications@etherealflame.com>"
```

---

## 5. Node.js Integration

### Basic Notification Service

```typescript
// services/notifications.ts

interface NotificationOptions {
  topic: string;
  title?: string;
  message: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
  click?: string;
  attach?: string;
  filename?: string;
  icon?: string;
  actions?: Array<{
    action: 'view' | 'http' | 'broadcast';
    label: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    clear?: boolean;
  }>;
  delay?: string;
  email?: string;
}

const NTFY_URL = process.env.NTFY_URL || 'https://ntfy.sh';
const NTFY_TOKEN = process.env.NTFY_TOKEN;

export async function sendNotification(options: NotificationOptions): Promise<void> {
  const {
    topic,
    title,
    message,
    priority = 'default',
    tags = [],
    click,
    attach,
    filename,
    icon,
    actions,
    delay,
    email
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
  };

  // Add authentication
  if (NTFY_TOKEN) {
    headers['Authorization'] = `Bearer ${NTFY_TOKEN}`;
  }

  // Add optional headers
  if (title) headers['Title'] = title;
  if (priority) headers['Priority'] = priority;
  if (tags.length > 0) headers['Tags'] = tags.join(',');
  if (click) headers['Click'] = click;
  if (attach) headers['Attach'] = attach;
  if (filename) headers['Filename'] = filename;
  if (icon) headers['Icon'] = icon;
  if (delay) headers['Delay'] = delay;
  if (email) headers['Email'] = email;

  // Format actions
  if (actions && actions.length > 0) {
    const actionStrings = actions.map(a => {
      let str = `${a.action}, ${a.label}`;
      if (a.url) str += `, ${a.url}`;
      if (a.method) str += `, method=${a.method}`;
      if (a.clear) str += `, clear=true`;
      return str;
    });
    headers['Actions'] = actionStrings.join('; ');
  }

  try {
    const response = await fetch(`${NTFY_URL}/${topic}`, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!response.ok) {
      throw new Error(`ntfy error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw - notifications shouldn't break the render pipeline
  }
}
```

### JSON Format Alternative

```typescript
export async function sendNotificationJSON(options: NotificationOptions): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (NTFY_TOKEN) {
    headers['Authorization'] = `Bearer ${NTFY_TOKEN}`;
  }

  const body = {
    topic: options.topic,
    message: options.message,
    title: options.title,
    priority: priorityToNumber(options.priority || 'default'),
    tags: options.tags,
    click: options.click,
    attach: options.attach,
    filename: options.filename,
    icon: options.icon,
    actions: options.actions,
    delay: options.delay,
    email: options.email,
  };

  // Remove undefined values
  Object.keys(body).forEach(key =>
    body[key] === undefined && delete body[key]
  );

  const response = await fetch(NTFY_URL, {  // POST to root, not topic!
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`ntfy error: ${response.status}`);
  }
}

function priorityToNumber(priority: string): number {
  const map: Record<string, number> = {
    min: 1, low: 2, default: 3, high: 4, urgent: 5
  };
  return map[priority] || 3;
}
```

### BullMQ Integration

```typescript
// workers/renderWorker.ts
import { Worker, Job } from 'bullmq';
import { sendNotification } from '../services/notifications';

const worker = new Worker('render-queue', async (job: Job) => {
  const { jobId, audioName, template, format } = job.data;

  // Notify: Render started
  await sendNotification({
    topic: 'ethereal-renders',
    title: 'Render Started',
    message: `Job #${jobId}: ${audioName}`,
    priority: 'low',
    tags: ['hourglass_flowing_sand']
  });

  try {
    // Progress updates
    job.updateProgress(0);

    for (let frame = 0; frame < totalFrames; frame++) {
      await renderFrame(frame);

      const progress = Math.floor((frame / totalFrames) * 100);
      job.updateProgress(progress);

      // Notify at milestones (25%, 50%, 75%)
      if (progress % 25 === 0 && progress > 0) {
        await sendNotification({
          topic: 'ethereal-progress',
          title: `Rendering: ${progress}%`,
          message: `Job #${jobId}: ${audioName}`,
          priority: 'min',
          tags: ['fire']
        });
      }
    }

    // Notify: Render complete
    const driveUrl = await uploadToGoogleDrive(outputPath);

    await sendNotification({
      topic: 'ethereal-renders',
      title: 'Render Complete!',
      message: `Job #${jobId}: ${audioName}\nDuration: ${renderDuration}`,
      priority: 'default',
      tags: ['white_check_mark', 'tada'],
      click: driveUrl,
      actions: [
        { action: 'view', label: 'View Video', url: driveUrl }
      ]
    });

    return { success: true, driveUrl };

  } catch (error) {
    // Notify: Render failed
    await sendNotification({
      topic: 'ethereal-errors',
      title: 'Render Failed!',
      message: `Job #${jobId}: ${audioName}\nError: ${error.message}`,
      priority: 'high',
      tags: ['x', 'warning'],
      actions: [
        { action: 'http', label: 'Retry', url: `${API_URL}/jobs/${jobId}/retry`, method: 'POST' }
      ]
    });

    throw error;
  }
}, { connection: redisConnection });

// Batch complete handler
worker.on('completed', async (job) => {
  const batch = await getBatchStats(job.data.batchId);

  if (batch.completedCount === batch.totalCount) {
    await sendNotification({
      topic: 'ethereal-batch',
      title: 'Batch Complete!',
      message: `Batch #${batch.id}\n` +
        `Total: ${batch.totalCount}\n` +
        `Success: ${batch.successCount}\n` +
        `Failed: ${batch.failedCount}`,
      priority: batch.failedCount > 0 ? 'high' : 'default',
      tags: batch.failedCount > 0 ? ['warning'] : ['sparkles']
    });
  }
});
```

### Using @cityssm/ntfy-publish Package

For a more feature-rich approach:

```bash
npm install @cityssm/ntfy-publish
```

```typescript
import ntfyPublish from '@cityssm/ntfy-publish';

// Configure globally
ntfyPublish.setDefaultOptions({
  server: 'https://ntfy.yourdomain.com',
  authorization: {
    username: 'renderbot',
    password: process.env.NTFY_PASSWORD
  }
});

// Send notification
await ntfyPublish({
  topic: 'ethereal-renders',
  title: 'Render Complete',
  message: 'Your video is ready!',
  priority: 'high',
  tags: ['white_check_mark', 'video_camera'],
  iconURL: 'https://etherealflame.com/logo.png',
  clickURL: 'https://drive.google.com/...'
});
```

---

## 6. n8n Integration

### Method 1: Community Node

Install the ntfy community node:

```bash
# In n8n container/installation
npm install n8n-nodes-ntfy
```

Then use the ntfy node in workflows with full GUI configuration.

### Method 2: HTTP Request Node

Create an HTTP Request node with these settings:

**Basic Notification:**

| Setting | Value |
|---------|-------|
| Method | POST |
| URL | `https://ntfy.yourdomain.com/ethereal-renders` |
| Authentication | Header Auth |
| Header Name | Authorization |
| Header Value | Bearer {{$credentials.ntfyToken}} |
| Body Content Type | Text |
| Body | `{{$json.message}}` |

**With Headers (Title, Priority, Tags):**

Add these headers in the "Headers" section:

| Header | Value |
|--------|-------|
| Title | `{{$json.title}}` |
| Priority | `{{$json.priority}}` |
| Tags | `{{$json.tags}}` |
| Click | `{{$json.clickUrl}}` |

### Example n8n Workflow: Render Complete

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "render-complete",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Send ntfy Notification",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://ntfy.yourdomain.com/ethereal-renders",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Title", "value": "={{ 'Render Complete: ' + $json.audioName }}" },
            { "name": "Priority", "value": "default" },
            { "name": "Tags", "value": "white_check_mark,tada" },
            { "name": "Click", "value": "={{ $json.driveUrl }}" },
            { "name": "Actions", "value": "={{ 'view, View Video, ' + $json.driveUrl }}" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "body",
              "value": "={{ 'Job #' + $json.jobId + ' finished\\n' + 'Audio: ' + $json.audioName + '\\n' + 'Duration: ' + $json.duration }}"
            }
          ]
        }
      }
    }
  ]
}
```

### Example n8n Workflow: Error Alert

```json
{
  "nodes": [
    {
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger"
    },
    {
      "name": "Format Error",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "title", "value": "Workflow Error!" },
            { "name": "message", "value": "={{ 'Workflow: ' + $json.workflow.name + '\\nError: ' + $json.execution.error.message }}" }
          ]
        }
      }
    },
    {
      "name": "Send Error Alert",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://ntfy.yourdomain.com/ethereal-errors",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Title", "value": "={{ $json.title }}" },
            { "name": "Priority", "value": "high" },
            { "name": "Tags", "value": "x,warning" }
          ]
        },
        "body": "={{ $json.message }}"
      }
    }
  ]
}
```

### Setting Up Credentials in n8n

1. Go to **Settings > Credentials**
2. Click **Add Credential**
3. Select **Header Auth**
4. Name: `ntfy`
5. Header Name: `Authorization`
6. Header Value: `Bearer your-token-here`

---

## 7. Alternative: Telegram Bot Setup

Telegram is a solid backup option if ntfy has issues or you prefer a different mobile experience.

### Step 1: Create Bot with BotFather

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `Ethereal Flame Render Bot`
4. Choose username: `ethereal_render_bot` (must end in `bot`)
5. Save the API token provided

### Step 2: Get Your Chat ID

1. Start a chat with your new bot
2. Send any message
3. Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find your `chat.id` in the response

For group notifications:
1. Add bot to group
2. Send a message in the group
3. Check getUpdates for the group's chat ID (negative number)

### Step 3: Node.js Integration

```bash
npm install node-telegram-bot-api
```

```typescript
// services/telegram.ts
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: false  // We only send, don't receive
});

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

interface TelegramNotification {
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  photo?: string;
  video?: string;
  buttons?: Array<{
    text: string;
    url: string;
  }>;
}

export async function sendTelegramNotification(options: TelegramNotification): Promise<void> {
  const { message, parseMode = 'HTML', photo, video, buttons } = options;

  const replyMarkup = buttons ? {
    inline_keyboard: [
      buttons.map(btn => ({ text: btn.text, url: btn.url }))
    ]
  } : undefined;

  try {
    if (video) {
      await bot.sendVideo(CHAT_ID, video, {
        caption: message,
        parse_mode: parseMode,
        reply_markup: replyMarkup
      });
    } else if (photo) {
      await bot.sendPhoto(CHAT_ID, photo, {
        caption: message,
        parse_mode: parseMode,
        reply_markup: replyMarkup
      });
    } else {
      await bot.sendMessage(CHAT_ID, message, {
        parse_mode: parseMode,
        reply_markup: replyMarkup,
        disable_web_page_preview: false
      });
    }
  } catch (error) {
    console.error('Telegram notification failed:', error);
  }
}
```

### Step 4: Notification Templates for Telegram

```typescript
// Render Complete
await sendTelegramNotification({
  message: `
<b>✅ Render Complete!</b>

<b>Job:</b> #${jobId}
<b>Audio:</b> ${audioName}
<b>Duration:</b> ${renderDuration}
<b>Format:</b> ${format}
`,
  photo: thumbnailUrl,
  buttons: [
    { text: '📂 Open in Drive', url: driveUrl },
    { text: '⬇️ Download', url: downloadUrl }
  ]
});

// Render Failed
await sendTelegramNotification({
  message: `
<b>❌ Render Failed!</b>

<b>Job:</b> #${jobId}
<b>Audio:</b> ${audioName}
<b>Error:</b> <code>${errorMessage}</code>
<b>Retry:</b> ${retryCount}/${maxRetries}
`,
  buttons: [
    { text: '🔄 Retry', url: `${API_URL}/jobs/${jobId}/retry` },
    { text: '📋 View Logs', url: `${WEB_URL}/jobs/${jobId}/logs` }
  ]
});

// Batch Summary
await sendTelegramNotification({
  message: `
<b>🎉 Batch Complete!</b>

<b>Batch:</b> #${batchId}
<b>Total:</b> ${totalJobs} videos
<b>Success:</b> ✅ ${successCount}
<b>Failed:</b> ❌ ${failedCount}
<b>Duration:</b> ${totalDuration}
`,
  buttons: [
    { text: '📂 Open Folder', url: driveFolderUrl }
  ]
});
```

### Unified Notification Service

Create a service that can use both ntfy and Telegram:

```typescript
// services/notifications.ts
import { sendNotification as sendNtfy } from './ntfy';
import { sendTelegramNotification } from './telegram';

type Channel = 'ntfy' | 'telegram' | 'both';

interface UnifiedNotification {
  title: string;
  message: string;
  priority?: 'low' | 'default' | 'high';
  url?: string;
  thumbnail?: string;
  channel?: Channel;
}

export async function notify(options: UnifiedNotification): Promise<void> {
  const channel = options.channel || 'both';

  const promises: Promise<void>[] = [];

  if (channel === 'ntfy' || channel === 'both') {
    promises.push(sendNtfy({
      topic: 'ethereal-renders',
      title: options.title,
      message: options.message,
      priority: options.priority,
      click: options.url,
      attach: options.thumbnail
    }));
  }

  if (channel === 'telegram' || channel === 'both') {
    promises.push(sendTelegramNotification({
      message: `<b>${options.title}</b>\n\n${options.message}`,
      photo: options.thumbnail,
      buttons: options.url ? [{ text: 'Open', url: options.url }] : undefined
    }));
  }

  await Promise.allSettled(promises);  // Don't fail if one channel fails
}
```

---

## Environment Variables

```bash
# .env

# ntfy Configuration
NTFY_URL=https://ntfy.yourdomain.com
NTFY_TOKEN=tk_your_access_token_here

# Telegram Configuration (backup)
TELEGRAM_BOT_TOKEN=123456789:AbCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=123456789

# Notification Preferences
NOTIFICATION_CHANNEL=both  # ntfy, telegram, or both
```

---

## Testing

### Test ntfy from Command Line

```bash
# Basic test
curl -d "Test notification from render pipeline" \
  -H "Authorization: Bearer tk_your_token" \
  https://ntfy.yourdomain.com/ethereal-renders

# Full featured test
curl https://ntfy.yourdomain.com/ethereal-renders \
  -H "Authorization: Bearer tk_your_token" \
  -H "Title: Test Render Complete" \
  -H "Priority: default" \
  -H "Tags: white_check_mark,test" \
  -H "Click: https://google.com" \
  -H "Actions: view, Open Google, https://google.com" \
  -d "This is a test notification with all features"
```

### Test Telegram from Command Line

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "'${TELEGRAM_CHAT_ID}'",
    "text": "Test notification from render pipeline",
    "parse_mode": "HTML"
  }'
```

---

## Sources

### Official Documentation
- [ntfy Documentation](https://docs.ntfy.sh/)
- [ntfy Publishing Guide](https://docs.ntfy.sh/publish/)
- [ntfy Configuration](https://docs.ntfy.sh/config/)
- [ntfy Installation](https://docs.ntfy.sh/install/)
- [ntfy Examples](https://docs.ntfy.sh/examples/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

### Community Resources
- [ntfy GitHub Repository](https://github.com/binwiederhier/ntfy)
- [n8n ntfy Community Node](https://github.com/JYLN/n8n-nodes-ntfy)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [Telegraf Framework](https://github.com/telegraf/telegraf)
- [@cityssm/ntfy-publish](https://github.com/cityssm/node-ntfy-publish)

### Tutorials
- [Self-Hosted ntfy Setup with Cloudflare Tunnel](https://medium.com/@svenvanginkel/setup-ntfy-for-selfhosted-notifications-with-cloudflare-tunnel-e342f470177d)
- [ntfy Docker Deployment Guide](https://www.gingertechblog.com/mastering-ntfy-a-comprehensive-guide-to-docker-deployment-and-real-world-applications/)
- [n8n and ntfy Integration](https://medium.com/@abhishekarya1/send-push-notifications-with-n8n-and-ntfy-in-seconds-9590aad759a4)
- [Telegram Bot Node.js Guide](https://www.sitepoint.com/how-to-build-your-first-telegram-chatbot-with-node-js/)

### App Downloads
- [ntfy iOS App](https://apps.apple.com/us/app/ntfy/id1625396347)
- [ntfy Android App (Google Play)](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- [ntfy Android App (F-Droid)](https://f-droid.org/packages/io.heckel.ntfy/)

---

*Research completed: 2026-01-28*
