# Audio Prep — Quickstart Guide

Local-only non-destructive audio editor for preparing render-ready audio. Import audio from files, YouTube, or URLs, then trim/split/reorder/normalize before rendering.

> **Local dev only.** FFmpeg and SQLite require persistent filesystem and long-running processes. Not compatible with Vercel's serverless runtime.

## Prerequisites

| Tool | Install | Verify |
|------|---------|--------|
| **Node.js** 18+ | Already installed | `node -v` |
| **FFmpeg** (includes ffprobe) | `winget install ffmpeg` / `brew install ffmpeg` | `ffmpeg -version` |
| **yt-dlp** (YouTube only) | `winget install yt-dlp` / `brew install yt-dlp` | `yt-dlp --version` |

All npm dependencies (`wavesurfer.js`, `better-sqlite3`, `zod`) are already in `package.json` — just run `npm install`.

## Start

```bash
npm run dev
```

Open `http://localhost:3000`. Click the teal **Audio Prep** button in the bottom control bar.

## Usage

### 1. Import Audio

Three methods:

- **Upload File** — drag or click to upload any audio/video file (extracts audio from video via ffmpeg)
- **YouTube** — paste a YouTube URL, check "I have rights", click Import (requires yt-dlp)
- **URL** — paste a direct link to an audio file

Import runs as a background job. Progress shows in the UI. Once complete, the waveform loads automatically.

### 2. Edit Clips

The initial import creates one clip spanning the full duration. From there:

| Action | How |
|--------|-----|
| **Trim** | Drag region edges on the waveform |
| **Split** | Position playhead, press `S` or click scissors icon |
| **Delete** | Select clip, press `Delete` or click trash icon |
| **Reorder** | Drag clips by the grip handle in the clip list |
| **Volume** | Per-clip slider (0–200%) |
| **Normalize** | Toggle checkbox — applies 2-pass EBU R128 loudnorm |
| **Fade In/Out** | Set default fade times (applied to all clips) |

**Keyboard shortcuts:** `Space` play/pause, `S` split at playhead, `Delete` remove selected clip.

### 3. Preview

Click **Preview** to render a quick 128kbps MP3. Playback starts automatically. Previews are cached — same edit recipe returns instantly on repeat.

### 4. Save as Render Audio

Click **Save as Render Audio** to render a full-quality WAV (or AAC). This:

- Materializes the edit recipe to `audio-assets/{assetId}/prepared.wav`
- Sets the prepared asset as the active render audio source
- The main Render dialog will use this prepared file instead of the raw upload

## File Structure

Created automatically at project root on first use:

```
./audio-assets/                 # All ingested audio
  └── {uuid}/
      ├── original.{ext}       # Source file as-ingested
      ├── metadata.json        # Duration, codec, sample rate, provenance
      ├── peaks.json           # Precomputed waveform data
      ├── edits.json           # Last saved edit recipe
      ├── prepared.{wav|aac}   # Render-ready output
      └── preview_{hash}.mp3   # Cached preview renders

./audio-prep-jobs.db            # SQLite job tracking (auto-created)
```

## API Reference

All endpoints return `{ success: boolean, data?: ..., error?: { code, message } }`.

### Ingest

| Method | Endpoint | Body |
|--------|----------|------|
| `POST` | `/api/audio/ingest` | `multipart/form-data` (file upload) or JSON `{type, url, rightsAttested?}` |
| `GET` | `/api/audio/ingest/{jobId}` | Poll job status |
| `DELETE` | `/api/audio/ingest/{jobId}` | Cancel job |

### Assets

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/audio/assets` | List all assets with disk usage |
| `POST` | `/api/audio/assets` | Cleanup expired assets (`{action:"cleanup"}`) |
| `GET` | `/api/audio/assets/{id}` | Asset detail with peaks + edits |
| `DELETE` | `/api/audio/assets/{id}` | Delete asset (`?force=true` to skip ref check) |
| `GET` | `/api/audio/assets/{id}/stream` | Stream original audio (supports Range) |

### Edit

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/audio/edit/preview` | Start preview render (128k MP3) |
| `GET` | `/api/audio/edit/preview/{jobId}` | Poll preview job |
| `DELETE` | `/api/audio/edit/preview/{jobId}` | Cancel preview |
| `GET` | `/api/audio/edit/preview/{jobId}/audio` | Stream rendered preview |
| `POST` | `/api/audio/edit/save` | Start full-quality save render |
| `GET` | `/api/audio/edit/save/{jobId}` | Poll save job |
| `DELETE` | `/api/audio/edit/save/{jobId}` | Cancel save |

## Configuration

No environment variables required. Defaults in `src/lib/audio-prep/types.ts`:

```
assetsDir:             ./audio-assets
maxFileSizeMB:         100
maxDurationMinutes:    30
maxClipsPerRecipe:     50
diskQuotaGB:           5
ttlDays:               30
youtubeAllowedDomains: youtube.com, youtu.be, www.youtube.com
cookieFilePath:        undefined (set for private YouTube videos)
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ffmpeg: command not found` | Install ffmpeg and ensure it's in your PATH |
| `yt-dlp: command not found` | Install yt-dlp (only needed for YouTube imports) |
| YouTube "Sign in to confirm" | Set `cookieFilePath` in config to a Netscape cookie file |
| Ingest stuck at 0% | Check that the dev server terminal shows no ffprobe errors |
| Preview doesn't play | Browser may block autoplay — click the Preview button again |
| `SQLITE_CANTOPEN` | Ensure the project root directory is writable |
