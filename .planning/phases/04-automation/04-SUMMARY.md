---
phase: 04
name: Automation
subsystem: batch-processing
tags: [sqlite, bullmq, redis, whisper, rclone, ntfy, googleapis]
completed: 2026-01-27
duration: ~1 hour
---

# Phase 4: Automation Summary

**One-liner:** SQLite + BullMQ batch pipeline with Whisper transcription, Google Drive sync, ntfy notifications, and web batch UI.

## What Was Built

### Database & Queue Infrastructure (Wave 1)
- **SQLite database** (`better-sqlite3`) with WAL mode for renders metadata
- **File naming convention** utilities with automatic versioning
- **BullMQ queue** with Redis for batch job processing
- **Docker Compose** with Redis (noeviction policy, AOF persistence)

### Render Worker (Wave 2)
- **Render worker** processes jobs from queue, updates database
- **Post-processor** handles file renaming, completion status
- **Whisper microservice** (Python FastAPI + faster-whisper) for GPU transcription
- **Node.js client** for calling Whisper service

### External Integrations (Wave 3)
- **Transcription queue** for async audio processing
- **Google Drive sync** via rclone with retry logic
- **ntfy notifications** for mobile push alerts
- **Batch tracker** for completion detection

### User Interface (Wave 4)
- **Google Sheets export** API with service account auth
- **Batch API endpoints** for job creation and status
- **BatchUploader component** with progress tracking
- **Batch page** at /batch with instructions

## Commits

| Plan | Commit | Description |
|------|--------|-------------|
| 04-01 | b8322c2 | SQLite database and file naming utilities |
| 04-02 | 7ef785a | BullMQ batch queue infrastructure |
| 04-03 | ea0db67 | BullMQ render worker with post-processing |
| 04-04 | fd45614 | faster-whisper transcription microservice |
| 04-05 | 85f633d | Transcription queue integration |
| 04-06 | 16f67e8 | Google Drive sync via rclone |
| 04-07 | 9f4f098 | ntfy push notifications |
| 04-08 | 172389e | Google Sheets metadata export |
| 04-09 | d73471e | Batch upload UI and API |

## Key Files Created

### Database
- `src/lib/db/schema.ts` - SQLite schema and types
- `src/lib/db/index.ts` - Database connection and queries
- `src/lib/db/export.ts` - Google Sheets export utilities

### Queue
- `src/lib/queue/connection.ts` - Redis connection config
- `src/lib/queue/types.ts` - Job type definitions
- `src/lib/queue/bullmqQueue.ts` - BullMQ queue and batch operations
- `src/lib/queue/renderWorker.ts` - Render job processor
- `src/lib/queue/postProcessor.ts` - File naming and sync
- `src/lib/queue/transcriptionQueue.ts` - Transcription job queue
- `src/lib/queue/transcriptionWorker.ts` - Whisper integration
- `src/lib/queue/batchTracker.ts` - Completion detection
- `src/lib/queue/shutdown.ts` - Graceful shutdown handlers

### Services
- `src/lib/services/whisperClient.ts` - Whisper API client
- `src/lib/services/googleDrive.ts` - rclone sync wrapper
- `src/lib/services/notifications.ts` - ntfy integration
- `src/lib/services/googleSheets.ts` - Sheets API client

### Whisper Microservice
- `whisper-service/main.py` - FastAPI transcription service
- `whisper-service/Dockerfile` - CUDA-enabled container
- `whisper-service/requirements.txt` - Python dependencies

### API Endpoints
- `src/app/api/batch/route.ts` - Batch creation
- `src/app/api/batch/[id]/route.ts` - Batch status
- `src/app/api/batch/status/route.ts` - Queue status
- `src/app/api/export/sheets/route.ts` - Sheets export

### UI Components
- `src/components/batch/BatchUploader.tsx` - File upload form
- `src/app/batch/page.tsx` - Batch render page

### Utilities
- `src/lib/utils/fileNaming.ts` - File naming convention
- `scripts/start-worker.ts` - Worker CLI entry point

### Documentation
- `docs/google-drive-setup.md` - rclone setup guide

## Dependencies Added

```json
{
  "better-sqlite3": "^12.6.2",
  "bullmq": "^5.67.1",
  "form-data": "^4.0.5",
  "googleapis": "^144.0.0",
  "uuid": "^13.0.0"
}
```

## Environment Variables Required

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Whisper
WHISPER_SERVICE_URL=http://localhost:8001

# Google Drive (optional)
GDRIVE_REMOTE=gdrive
GDRIVE_OUTPUT_FOLDER=EtherealFlame/Renders

# Notifications (optional)
NTFY_URL=https://ntfy.sh
NTFY_TOPIC=ethereal-renders-yourname

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n"
GOOGLE_SHEETS_ID=spreadsheet-id
```

## Usage

```bash
# Start Redis
docker-compose up -d redis

# Start Whisper (GPU required)
docker-compose up -d whisper

# Start worker
npm run worker

# Or start specific workers
npm run worker:render
npm run worker:transcribe
```

## Architecture

```
User uploads files via /batch page
       |
       v
POST /api/batch -> Creates batch in BullMQ queue
       |
       v
Render Worker processes jobs
       |
       +---> Updates SQLite database
       |
       +---> Post-processes (rename, sync to GDrive)
       |
       +---> Queues transcription job
       |
       v
Transcription Worker calls Whisper service
       |
       +---> Stores description in database
       |
       v
Batch Tracker checks completion
       |
       +---> Sends ntfy notification
       |
       v
User exports to Google Sheets via /api/export/sheets
```

## Deviations from Plan

None - plan executed as written.

## Next Phase Readiness

Phase 4 provides the complete batch processing infrastructure. Phase 5 (n8n integration) can now:

- Trigger batch jobs via API
- Monitor queue status
- Export results to Google Sheets
- Receive webhook notifications on completion

All infrastructure is in place for workflow automation.
