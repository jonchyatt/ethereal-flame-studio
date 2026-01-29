# Phase 4 Research: Automation

**Project:** Ethereal Flame Studio
**Researched:** 2026-01-27
**Overall Confidence:** HIGH

---

## Executive Summary

Phase 4 automation transforms the manual render workflow into a fully automated batch processing pipeline. The core components are: (1) Whisper transcription for auto-generating video descriptions, (2) BullMQ-based batch queue for processing multiple audio files, (3) Google Drive integration via rclone for output delivery, (4) structured file naming and metadata tracking, and (5) multi-channel job status notifications.

**Key recommendation:** Use a Python microservice for Whisper (faster-whisper) called from the Node.js main application, BullMQ for job orchestration (already recommended in Phase 3), rclone for Google Drive sync (simpler than raw API), SQLite for metadata (can sync to Google Sheets on demand), and ntfy for self-hosted push notifications.

---

## Research Domains

### 1. Whisper Transcription for Video Descriptions (AUD-05)

#### OpenAI Whisper API vs Local Whisper.cpp

| Factor | OpenAI API | Whisper.cpp/faster-whisper |
|--------|------------|---------------------------|
| **Speed** | Network-bound, ~1.0x realtime | GPU: 35-40% faster; CPU: comparable |
| **Cost** | $0.006/min (~$0.36/hr) | Free after setup |
| **Privacy** | Data sent to OpenAI | Fully local |
| **Setup** | API key only | Requires Python/C++ runtime |
| **Quality** | Large-v3, best accuracy | Same models available locally |
| **VRAM** | None required | 4.5GB for large-v3 |
| **Break-even** | N/A | ~500 hrs/month vs API |

**Confidence:** HIGH - Verified via [Northflank 2026 STT Benchmarks](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

#### Recommended: faster-whisper (Local)

faster-whisper is a CTranslate2-based reimplementation that is **up to 4x faster** than original OpenAI Whisper with less memory usage.

**Performance benchmarks (13-minute audio):**
| Implementation | Time | VRAM |
|----------------|------|------|
| OpenAI Whisper | 2m23s | 4.7GB |
| faster-whisper (fp16) | 1m03s | 4.5GB |
| faster-whisper (int8) | 59s | 2.9GB |

**Installation:**
```bash
pip install faster-whisper
```

**Usage:**
```python
from faster_whisper import WhisperModel

model = WhisperModel("large-v3", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.mp3", beam_size=5)

description = " ".join([segment.text for segment in segments])
```

**Integration pattern:** Create a Python microservice with FastAPI that exposes a `/transcribe` endpoint. The Node.js BullMQ worker calls this service via HTTP when generating metadata.

**Why not OpenAI API:**
- User has home GPU (RTX) that can run faster-whisper locally
- No recurring API costs
- Privacy preserved (meditation audio stays local)
- Same model quality available (large-v3)

**Sources:**
- [faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
- [Modal Blog: Whisper Variants](https://modal.com/blog/choosing-whisper-variants)

---

### 2. Batch Job Queue Patterns (AUT-01)

#### Bull vs BullMQ

| Factor | Bull | BullMQ |
|--------|------|--------|
| **Status** | Maintenance mode (bug fixes only) | Active development |
| **TypeScript** | JS with types | Native TypeScript |
| **Performance** | Good | Better throughput, lower latency |
| **API** | Stable, battle-tested | Modern, modular |
| **Version** | 4.x | 5.66.5 (Jan 2026) |

**Recommendation:** BullMQ - It's the successor to Bull, designed specifically for production workloads like video transcoding.

**Confidence:** HIGH - Verified via [BullMQ Official Docs](https://docs.bullmq.io)

#### BullMQ Best Practices for Video Batch Processing

**1. Sandboxed Processing**

Run video processing in separate Node.js processes to prevent crashes from affecting the main worker:

```typescript
// worker.ts
import { Worker } from 'bullmq';

const worker = new Worker('render-queue',
  // Sandboxed processor runs in separate process
  new URL('./processor.js', import.meta.url),
  {
    connection: redisConnection,
    concurrency: 1, // One render at a time per GPU
  }
);
```

**2. Job Persistence Configuration**

```typescript
// queue.ts
import { Queue } from 'bullmq';

const renderQueue = new Queue('render-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 }, // Keep last 100 completed
    removeOnFail: { count: 500 },     // Keep last 500 failed for debugging
    attempts: 3,                       // Retry on failure
    backoff: {
      type: 'exponential',
      delay: 10000, // 10s initial delay
    },
  },
});
```

**3. Graceful Shutdown**

Critical for preventing stalled jobs on server restart:

```typescript
process.on('SIGTERM', async () => {
  await worker.close(); // Wait for current job to complete
  process.exit(0);
});
```

**4. Redis Configuration**

**CRITICAL:** Set `maxmemory-policy noeviction` - BullMQ cannot function with eviction enabled.

```bash
# redis.conf
maxmemory-policy noeviction
appendonly yes  # AOF persistence
appendfsync everysec
```

**5. Batch Queue Structure**

For processing multiple audio files:

```typescript
interface BatchJob {
  batchId: string;
  audioFiles: Array<{
    id: string;
    path: string;
    originalName: string;
  }>;
  template: string;
  outputFormats: string[]; // ['1080p', '4k', '360_stereo']
}

// Add batch job
await renderQueue.add('batch-render', batchJob, {
  priority: 1,
});

// Add individual render jobs (children of batch)
for (const audio of batchJob.audioFiles) {
  for (const format of batchJob.outputFormats) {
    await renderQueue.add('single-render', {
      batchId: batchJob.batchId,
      audioFile: audio,
      template: batchJob.template,
      outputFormat: format,
    }, {
      parent: { id: batchJob.batchId, queue: 'render-queue' },
    });
  }
}
```

**Sources:**
- [BullMQ Production Guide](https://docs.bullmq.io/guide/going-to-production)
- [Better Stack BullMQ Tutorial](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)

---

### 3. Google Drive Integration (AUT-02)

#### Google Drive API vs rclone

| Factor | Google Drive API | rclone |
|--------|-----------------|--------|
| **Setup** | OAuth2 + SDK | Config file |
| **Node.js** | Native | Spawn child process |
| **Sync** | Manual implementation | Built-in `sync` command |
| **Reliability** | Must handle retries | Built-in retry/resume |
| **Features** | Full API access | Sync, copy, upload |
| **Automation** | Complex | Simple cron/script |

**Recommendation:** rclone for file sync, Google Drive API only if programmatic metadata manipulation needed.

**Confidence:** HIGH - Verified via [rclone Google Drive docs](https://rclone.org/drive/)

#### rclone Setup for Automation

**1. Service Account Configuration (for unattended operation):**

```bash
# Create service account in Google Cloud Console
# Download JSON key file
# Configure rclone
rclone config

# Set service_account_file to the JSON key path
```

**2. Sync Command:**

```bash
# Sync rendered videos to Google Drive
rclone copy /path/to/renders remote:EtherealFlame/Renders \
  --drive-chunk-size 256M \
  --transfers 4 \
  --checkers 8 \
  --progress
```

**3. Node.js Integration:**

```typescript
import { spawn } from 'child_process';

async function syncToGoogleDrive(localPath: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rclone = spawn('rclone', [
      'copy',
      localPath,
      `gdrive:${remotePath}`,
      '--progress',
      '--stats', '5s',
    ]);

    rclone.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`rclone exited with code ${code}`));
    });
  });
}
```

**Important Limits:**
- Upload: 750GB/day
- Download: 10TB/day
- Rate: ~2 files/second

**Sources:**
- [rclone Google Drive Documentation](https://rclone.org/drive/)
- [rclone GitHub](https://github.com/rclone/rclone)

---

### 4. Naming Conventions (AUT-03)

#### Recommended Format

```
[YYYYMMDD]_[AudioName]_[Format]_[Version].mp4
```

**Examples:**
```
20260127_MorningMeditation_1080p_v1.mp4
20260127_MorningMeditation_4k_v1.mp4
20260127_MorningMeditation_360stereo_v1.mp4
```

**Rules:**
- Use underscores as delimiters (avoid spaces)
- ISO 8601 date format (YYYYMMDD)
- Sanitize audio names (alphanumeric + underscores only)
- Include format in name for easy filtering
- Zero-pad sequence numbers if needed

**Implementation:**

```typescript
function generateFileName(
  audioName: string,
  format: string,
  date: Date = new Date(),
  version: number = 1
): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const sanitizedName = audioName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  return `${dateStr}_${sanitizedName}_${format}_v${version}.mp4`;
}
```

**Confidence:** HIGH - Standard industry practice

**Sources:**
- [MASV Video File Naming Conventions](https://massive.io/file-transfer/video-file-naming-convention/)
- [Frame.io File Naming Best Practices](https://blog.frame.io/2018/10/22/file-naming-conventions/)

---

### 5. Metadata Database (AUT-04)

#### SQLite vs CSV vs Google Sheets

| Factor | SQLite | CSV | Google Sheets |
|--------|--------|-----|---------------|
| **Querying** | Full SQL | Manual parsing | Limited API |
| **Concurrency** | Safe with WAL | Risky | Handled by Google |
| **Local** | Yes | Yes | Requires internet |
| **Version control** | Harder | Easy (text) | Cloud-managed |
| **Sync** | N/A | Easy | Native |
| **Programmatic** | Excellent | Good | Good |

**Recommendation:** SQLite as primary, with export-to-Google-Sheets for user visibility.

**Why SQLite:**
- No server setup
- Single file database
- Full SQL querying for analytics
- Better for concurrent access during batch processing
- Can sync to Google Sheets on demand

**Schema:**

```sql
CREATE TABLE renders (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  audio_name TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  template TEXT NOT NULL,
  output_format TEXT NOT NULL,
  output_path TEXT,
  gdrive_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  whisper_description TEXT,
  duration_seconds REAL,
  render_started_at TEXT,
  render_completed_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_renders_batch ON renders(batch_id);
CREATE INDEX idx_renders_status ON renders(status);
CREATE INDEX idx_renders_created ON renders(created_at);
```

**Google Sheets Export (on-demand):**

```typescript
import { google } from 'googleapis';

async function exportToGoogleSheets(renders: Render[], sheetId: string) {
  const sheets = google.sheets({ version: 'v4', auth });

  const rows = renders.map(r => [
    r.audio_name,
    r.output_format,
    r.status,
    r.whisper_description,
    r.gdrive_url,
    r.created_at,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Renders!A:F',
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}
```

**Confidence:** HIGH - Standard pattern verified via [Google Sheets API Quickstart](https://developers.google.com/workspace/sheets/api/quickstart/nodejs)

---

### 6. Job Status Notifications (INF-03)

#### Notification Channel Options

| Channel | Setup | Use Case |
|---------|-------|----------|
| **Web Push** | VAPID keys, service worker | Browser users |
| **Email (SendGrid)** | API key | Professional, reliable |
| **SMS (Twilio)** | API key, phone number | Critical alerts |
| **ntfy** | Self-hosted or ntfy.sh | Simple, private |
| **Gotify** | Self-hosted only | Alternative to ntfy |

**Recommendation:** ntfy (self-hosted) as primary, with optional email fallback.

**Why ntfy:**
- Dead simple HTTP API (just POST to topic)
- Free, open source, self-hosted
- Mobile apps for iOS/Android
- No accounts or subscriptions required
- Works with any HTTP client

**Confidence:** HIGH - Verified via [ntfy documentation](https://docs.ntfy.sh/)

#### ntfy Integration

**Simple notification:**
```bash
curl -d "Batch #123 complete: 5 videos rendered" ntfy.sh/ethereal-renders
```

**Node.js implementation:**
```typescript
async function sendNotification(
  topic: string,
  title: string,
  message: string,
  priority: 'min' | 'low' | 'default' | 'high' | 'urgent' = 'default'
): Promise<void> {
  const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';

  await fetch(`${ntfyUrl}/${topic}`, {
    method: 'POST',
    headers: {
      'Title': title,
      'Priority': priority,
      'Tags': 'video,render',
    },
    body: message,
  });
}

// Usage
await sendNotification(
  'ethereal-renders',
  'Batch Complete',
  `Rendered 5 videos for "Morning Meditation"\nGoogle Drive: [link]`,
  'default'
);
```

**Self-hosting (Docker):**
```yaml
# docker-compose.yml
services:
  ntfy:
    image: binwiederhier/ntfy
    container_name: ntfy
    command: serve
    environment:
      - NTFY_BASE_URL=https://ntfy.yourdomain.com
      - NTFY_AUTH_FILE=/var/lib/ntfy/user.db
      - NTFY_AUTH_DEFAULT_ACCESS=deny-all
    volumes:
      - ./ntfy-data:/var/lib/ntfy
    ports:
      - "8080:80"
```

**Web Push as Alternative:**

Using the `web-push` npm package for browser notifications:

```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function sendBrowserNotification(subscription: PushSubscription, payload: object) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload)
  );
}
```

**Email Fallback (SendGrid):**

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendEmailNotification(to: string, batchId: string, videoCount: number) {
  await sgMail.send({
    to,
    from: 'renders@etherealflame.studio',
    subject: `Render Complete: Batch ${batchId}`,
    text: `Your batch of ${videoCount} videos has finished rendering.`,
    html: `<p>Your batch of <strong>${videoCount}</strong> videos has finished rendering.</p>`,
  });
}
```

**Sources:**
- [ntfy Documentation](https://docs.ntfy.sh/)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [SendGrid Node.js Quickstart](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-nodejs)

---

## Architecture Overview

```
                    +------------------------+
                    |      Web UI (Next.js)  |
                    |  - Upload audio files  |
                    |  - Select template     |
                    |  - Trigger batch       |
                    +------------------------+
                              |
                              v
                    +------------------------+
                    |    BullMQ Queue        |
                    |    (batch-render)      |
                    +------------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    +------------------+            +------------------+
    |  Render Worker   |            | Transcribe Worker|
    |  (From Phase 3)  |            | (faster-whisper) |
    +------------------+            +------------------+
              |                               |
              v                               v
    +------------------+            +------------------+
    |  Completed Video |            | Video Description|
    +------------------+            +------------------+
              |                               |
              +---------------+---------------+
                              |
                              v
                    +------------------------+
                    |   Post-Processing      |
                    |  - Apply naming conv.  |
                    |  - Store metadata      |
                    |  - Sync to Google Drive|
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
    +-------------+   +-------------+   +--------------+
    |   SQLite    |   |Google Drive |   |     ntfy     |
    |  (metadata) |   |   (output)  |   | (notify user)|
    +-------------+   +-------------+   +--------------+
              |
              v
    +------------------------+
    | Google Sheets (export) |
    |   (user visibility)    |
    +------------------------+
```

---

## Recommended Technology Stack (Phase 4 Additions)

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Transcription | faster-whisper | 1.1.x | 4x faster, local, same quality |
| Job Queue | BullMQ | 5.66+ | Already selected in Phase 3 |
| Cloud Sync | rclone | 1.68+ | Battle-tested, simple CLI |
| Metadata DB | SQLite (better-sqlite3) | 11.x | Fast, no server, SQLite3 |
| Notifications | ntfy | latest | Self-hosted, simple HTTP |
| Email (optional) | SendGrid | 8.x | Reliable email delivery |

---

## Implementation Priorities

### Wave 1: Core Automation
1. **Batch queue job structure** - Extend existing BullMQ setup
2. **File naming convention** - Utility function for all outputs
3. **SQLite metadata schema** - Track all renders

### Wave 2: Transcription
4. **faster-whisper microservice** - Python FastAPI service
5. **Transcription job type** - Post-render transcription queue
6. **Metadata enrichment** - Store descriptions in SQLite

### Wave 3: External Integration
7. **rclone integration** - Sync completed videos
8. **Google Sheets export** - On-demand metadata sync
9. **ntfy notifications** - Push on batch complete

---

## Pitfalls to Avoid

### 1. Whisper Memory Exhaustion
**Problem:** Loading large-v3 model uses 4.5GB VRAM
**Prevention:** Run transcription service separately from render worker, or use smaller model (medium) for descriptions

### 2. Redis Eviction Breaking Queue
**Problem:** Default Redis config may evict BullMQ keys
**Prevention:** ALWAYS set `maxmemory-policy noeviction`

### 3. Google Drive Rate Limits
**Problem:** Uploading many small files hits 2 files/second limit
**Prevention:** Batch uploads, use chunked transfer for large files

### 4. Stalled Jobs on Restart
**Problem:** Server restart leaves jobs in "active" state forever
**Prevention:** Implement graceful shutdown, configure stall timeout appropriately

### 5. SQLite Concurrent Write Issues
**Problem:** Multiple workers writing simultaneously
**Prevention:** Use WAL mode, serialize writes, or use better-sqlite3 with proper locking

---

## Open Questions (Deferred to Planning)

1. **Transcription accuracy tuning** - Should we use language hints for meditation content?
2. **Google Sheets update frequency** - Real-time vs batch export?
3. **Notification preferences** - Allow user to choose channels?
4. **Failed job handling** - Auto-retry vs manual intervention?

---

## Sources

### High Confidence (Official Documentation)
- [BullMQ Production Guide](https://docs.bullmq.io/guide/going-to-production)
- [faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
- [rclone Google Drive](https://rclone.org/drive/)
- [ntfy Documentation](https://docs.ntfy.sh/)
- [Google Sheets API Node.js](https://developers.google.com/workspace/sheets/api/quickstart/nodejs)
- [SendGrid Node.js Quickstart](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-nodejs)

### Medium Confidence (Verified Community Sources)
- [Northflank STT Benchmarks 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)
- [Modal Blog: Whisper Variants](https://modal.com/blog/choosing-whisper-variants)
- [Better Stack BullMQ Guide](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)
- [web-push npm](https://www.npmjs.com/package/web-push)

### Low Confidence (Needs Validation)
- Specific GPU VRAM requirements may vary by driver version
- Google Drive daily limits may change without notice

---

*Research completed: 2026-01-27*
*Ready for plan creation*
