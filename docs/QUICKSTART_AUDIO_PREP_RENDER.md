# Audio Prep + Render Quickstart (Local MVP)

This quickstart is for the current working flow: import audio, edit it in Audio Prep, save a render-ready asset, and render video.

## 1. Prerequisites

- Node.js 20+
- npm
- `ffmpeg` + `ffprobe` available in PATH
- `yt-dlp` in PATH (only needed for YouTube ingest)

Windows install examples:

```powershell
winget install Gyan.FFmpeg
winget install yt-dlp.yt-dlp
```

Verify:

```powershell
ffmpeg -version
ffprobe -version
yt-dlp --version
```

## 2. Start The App

From project root:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3. First Video Workflow

1. Click `Audio Prep` in the bottom controls.
2. Import audio using one of:
- `Upload File`
- `YouTube` URL (requires rights checkbox)
- Direct `URL`
3. Wait for ingest to complete.
4. Edit clips on waveform:
- Drag region edges to trim
- `S` to split at playhead
- Drag clip rows to reorder
- Adjust per-clip volume
5. Click `Preview` to generate and play the preview MP3.
6. Click `Save as Render Audio` to create the prepared asset.
7. Close Audio Prep.
8. Click `Render Video`.
9. Choose output format + FPS.
10. Click:
- `Render Locally` (fastest way to get a file now), or
- `Cloud Render` (requires queue/worker setup)

## 4. Where Outputs Go

- Prepared audio assets: `audio-assets/{assetId}/`
- Audio prep jobs DB: `audio-prep-jobs.db`
- Local rendered videos: `renders/`

## 5. Recommended “Ship This Week” Defaults

- Audio length: 45 to 90 seconds
- Format: `flat-1080p-portrait` (Shorts) or `flat-1080p-landscape`
- FPS: `30`
- Use `Render Locally` first, then publish

## 6. Quick Troubleshooting

- `ffmpeg`/`yt-dlp` not found: install and restart terminal.
- YouTube ingest rejected: use a valid `youtube.com/watch?v=...` or `youtu.be/...` URL and check rights attestation.
- Render button disabled: you need either an uploaded audio file or a saved prepared asset.
- Preview/save job not progressing in cloud/serverless environments: run local dev/worker flow for long FFmpeg jobs.
- Local render fails immediately: check terminal running `npm run dev` for API/CLI errors.

## 7. Optional Sanity Checks

```powershell
npx tsc --noEmit
npx jest src/lib/audio-prep/__tests__ --runInBand
```

## 8. Playlist Batch MVP (Sequential YouTube Playlist Rendering)

This repo now includes an MVP playlist batch page for sequential YouTube playlist ingest + render:

- Open `http://localhost:3000/playlist-batches`
- Paste a YouTube playlist URL (`/playlist?list=...`)
- Check rights attestation
- Choose output format / FPS / target (`Cloud` or `Home Server`)
- Start the batch and leave a JobStore worker running

Current MVP behavior:

- Uses the JobStore worker path (not the legacy BullMQ batch page)
- Ingests and renders playlist items one-by-one
- Waits for each render to complete before dispatching the next item
- Uses existing render pipeline/webhook flow (Modal/home-worker deployment path)
- Applies per-target lease locks (`cloud`, `home`, `local-agent[:agentId]`) for multi-worker safety
- Dedupes by `videoId + render settings` against completed playlist render jobs
- Supports retrying failed items / resuming incomplete items from the playlist batch page

### Local Agent Target (Viewer-Machine GPU)

To render on the machine you are using to access the site, run the local agent on that machine:

```powershell
npx tsx scripts/local-render-agent.ts --server http://localhost:3000 --agent-id my-laptop --token YOUR_LOCAL_AGENT_SHARED_SECRET
```

Server requirement:

- Set `LOCAL_AGENT_SHARED_SECRET` in the app environment (same value used by the agent `--token`)

Then choose `Local Agent` as the target in `/playlist-batches` and optionally set `Target Agent ID` to `my-laptop`.

