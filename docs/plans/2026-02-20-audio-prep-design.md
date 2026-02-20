# Audio Prep MVP - Design Document

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Audio ingest, editing, and render integration. Render pipeline stability deferred to separate track.

---

## 1. Architecture Overview

```
Browser (UI)                          Server (API + FFmpeg)
┌────────────────────┐               ┌──────────────────────────┐
│ AudioControls      │               │ /api/audio/ingest        │
│ + YouTube URL      │──── POST ────▶│   yt-dlp / ffmpeg / fetch│
│ + Video file       │               │   → asset on disk        │
│ + Audio file       │               ├──────────────────────────┤
├────────────────────┤               │ /api/audio/edit/preview  │
│ AudioPrepEditor    │               │ /api/audio/edit/save     │
│ - WaveSurfer.js    │──── POST ────▶│   filter_complex recipes │
│ - Region selection │               │   → prepared asset       │
│ - Clip list        │               ├──────────────────────────┤
│ - Split/reorder    │               │ /api/render (existing)   │
│ - Save as Render   │──── POST ────▶│   type: "asset" resolves │
└────────────────────┘               │   assetId → audioPath    │
                                     │   → renderVideo.ts       │
                                     └──────────────────────────┘
```

### Key Principles

- **Browser handles visualization only.** All audio mutation happens server-side via FFmpeg.
- **Non-destructive editing.** Original files are never modified. Edits stored as JSON recipes. `prepared.wav` only materialized on explicit save.
- **`preparedAsset` is the canonical render input.** Both local and cloud render consume the same unified audio input contract.
- **Render pipeline stability is a separate effort.** This design covers ingest, edit, and integration only.

### New Dependencies

- `wavesurfer.js` (npm) - Waveform rendering + RegionsPlugin
- `yt-dlp` (system binary) - YouTube audio extraction
- `ffprobe` (bundled with ffmpeg, already present) - Audio inspection

---

## 2. Audio Source Pipeline (Ingest)

### API: `POST /api/audio/ingest`

Starts an async ingest job. Returns `{ jobId }` for status polling.

**Sources supported:**

| Source | Method | Tool |
|--------|--------|------|
| YouTube URL | Download best audio, then transcode | yt-dlp + ffmpeg |
| Video file (upload) | Extract audio track | ffmpeg `-vn` |
| Audio file (upload) | Copy to asset store | direct write |
| Direct URL | Fetch, then inspect/convert | fetch + ffmpeg |

### Ingest Flow

1. Receive source (YouTube URL, file upload, video file, or direct URL)
2. Validate source (SSRF protections for URLs - see Security section)
3. Start async job, return `{ jobId }`
4. Resolve to local temp file (yt-dlp download, HTTP fetch, or direct write)
5. Run `ffprobe` - extract duration, codec, sample rate, channels, bitrate
6. If video: extract audio with `ffmpeg -vn`
7. Validate constraints: file-size cap (default 100MB), duration cap (default 30min)
8. Generate asset ID, store in `audio-assets/{id}/original.{ext}`
9. Generate precomputed waveform peaks at multiple zoom levels for WaveSurfer
10. Store metadata + provenance
11. Job completes with `{ assetId, metadata, peaksUrl }`

### Status Polling: `GET /api/audio/ingest/{jobId}`

Returns `{ status: "pending" | "processing" | "complete" | "failed", progress, result? }`.

### Asset Storage Structure

```
audio-assets/
├── {asset-id}/
│   ├── original.opus          # Source audio as downloaded (best format)
│   ├── metadata.json          # ffprobe output + provenance + source info
│   ├── peaks.json             # Precomputed waveform peaks (multiple zoom levels)
│   ├── edits.json             # Non-destructive edit recipe (when editing)
│   └── prepared.wav           # Materialized render-ready file (on save)
```

### Provenance Metadata

```json
{
  "assetId": "abc-123",
  "sourceType": "youtube",
  "sourceUrl": "https://youtube.com/watch?v=...",
  "sourceVideoId": "dQw4w9WgXcQ",
  "rightsAttestedAt": "2026-02-20T10:30:00Z",
  "ingestToolVersions": {
    "yt-dlp": "2025.01.15",
    "ffmpeg": "7.0"
  },
  "audio": {
    "duration": 204.5,
    "sampleRate": 44100,
    "channels": 2,
    "codec": "opus",
    "bitrate": 128000,
    "format": "webm"
  }
}
```

### YouTube-Specific Configuration

- `yt-dlp --extract-audio --audio-quality 0 --no-playlist`
- Cookie file support (`--cookies`) for private/unlisted owned videos
- 5-minute download timeout (`--socket-timeout 30 --retries 3`)
- Max file size enforced post-download
- Domain allowlist: `youtube.com`, `youtu.be` (configurable)

### Lifecycle Controls

- **Disk quota:** Configurable max total storage (default 5GB)
- **TTL cleanup:** Assets unused for N days auto-deleted (default 30 days)
- **Hash-based dedup:** SHA256 of source URL/content. If asset already exists, return existing ID.

---

## 3. Audio Edit Operations

### Edit Recipe Format (`edits.json`)

```json
{
  "version": 1,
  "assetId": "abc-123",
  "clips": [
    {
      "id": "clip-1",
      "sourceAssetId": "abc-123",
      "startTime": 12.5,
      "endTime": 45.0,
      "volume": 1.0,
      "fadeIn": 0.5,
      "fadeOut": 0.3
    },
    {
      "id": "clip-2",
      "sourceAssetId": "abc-123",
      "startTime": 60.0,
      "endTime": 82.0,
      "volume": 0.8,
      "fadeIn": 0,
      "fadeOut": 1.0
    }
  ],
  "normalize": true,
  "outputFormat": "wav",
  "outputSampleRate": 44100
}
```

### Operations

| Operation | FFmpeg Approach | Notes |
|-----------|----------------|-------|
| Trim | `atrim=start=N:end=N` | Set in/out points per clip |
| Split | Two `atrim` calls | Divide clip at playhead position |
| Join | `filter_complex` with concat | All clips joined in array order |
| Reorder | Rearrange concat inputs | Clip order = array index |
| Fade in/out | `afade=t=in:d=N` / `afade=t=out:d=N` | Per-clip or global |
| Volume | `volume=N` | Per-clip, range 0.0-2.0 |
| Normalize | `loudnorm` (EBU R128) | Preview: 1-pass. Save: 2-pass. |

### Render Path

All operations use a single `filter_complex` graph (not concat demuxer) since we're already in decode/re-encode territory with trim/fade/volume.

### API Endpoints

```
POST /api/audio/ingest              → Start ingest job (returns jobId)
GET  /api/audio/ingest/{jobId}      → Poll ingest status

POST /api/audio/edit/preview        → Async: render low-quality MP3 preview
GET  /api/audio/edit/preview/{jobId}→ Poll preview status
POST /api/audio/edit/save           → Async: render full-quality prepared.wav
GET  /api/audio/edit/save/{jobId}   → Poll save status

GET  /api/audio/assets              → List all assets
GET  /api/audio/assets/{id}         → Get asset metadata + peaks + edits
DELETE /api/audio/assets/{id}       → Delete asset (reference-aware)
```

### Recipe Validation (enforced before FFmpeg execution)

- `0 <= startTime < endTime <= sourceDuration`
- `fadeIn + fadeOut <= (endTime - startTime)`
- `0.0 <= volume <= 2.0`
- Max clips per recipe: 50
- Max total output duration: 30 minutes
- Min clip length: 0.1 seconds

### Caching

- SHA256 hash of recipe JSON
- If hash matches existing output, return cached result
- Cache invalidated when source asset changes

### Reference-Aware Delete

- Multi-source clips mean one source asset can be referenced by many recipes
- Delete checks for references before removing source files
- Force-delete flag available to override

---

## 4. WaveSurfer Editor UI

### Component: `AudioPrepEditor`

```
┌─────────────────────────────────────────────────────────┐
│  Audio Prep                                    [X Close] │
├─────────────────────────────────────────────────────────┤
│  Import: [Upload File] [Paste URL] [YouTube URL]        │
│          [x] I attest I have rights to use this content │
├─────────────────────────────────────────────────────────┤
│  Source Waveform                          asset: xyz-123 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ waveform with draggable region overlays             ││
│  └─────────────────────────────────────────────────────┘│
│  > Play  || Pause   0:12.5 / 3:24.0    [Zoom +/-]      │
├─────────────────────────────────────────────────────────┤
│  Clip List                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ drag Clip 1 | 0:12.5 - 0:45.0 | vol 100% [Split]│  │
│  │ drag Clip 2 | 1:00.0 - 1:22.0 | vol  80% [Split]│  │
│  │              drag to reorder    [+ Add Region]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Fade In: [0.5s]  Fade Out: [0.3s]  [x] Normalize      │
├─────────────────────────────────────────────────────────┤
│  [> Preview]  [Save as Render Audio]                    │
│  Total duration: 0:54.5    * Unsaved changes            │
└─────────────────────────────────────────────────────────┘
```

### WaveSurfer Integration

- `wavesurfer.js` core for waveform rendering
- Precomputed peaks from server (multiple zoom levels, not raw waveform arrays)
- `RegionsPlugin` for visual clip region selection
- Drag region edges to adjust start/end times
- Click waveform to set playhead, spacebar to play/pause
- Scroll wheel for zoom (uses appropriate precomputed zoom level)

### Clip List Interactions

- **Add region:** Click "Add Region" then drag on waveform
- **Split:** Position playhead within clip, click Split
- **Reorder:** Drag handle to rearrange clips
- **Delete:** Delete key or swipe on selected clip
- **Per-clip volume:** Slider on each row (0-200%)
- **Per-clip fade:** Individual override of global fade defaults

### UX Guards

- Min clip length: 0.1 seconds
- Fade in + fade out cannot exceed clip duration (enforced in UI + server)
- Unsaved changes indicator when recipe differs from last saved state
- Keyboard shortcuts: Space (play/pause), S (split at playhead), Delete (remove clip), Ctrl+Z (undo recipe change)

### MVP Scope Gate

- **Phase 1 (MVP):** Single-source editing. One asset loaded at a time.
- **Phase 2 (if needed):** Multi-source tabs. Import multiple assets, clips reference different sources.

### State Management (`audioPrepStore` - Zustand)

```typescript
interface AudioPrepState {
  assets: Record<string, AssetMetadata>  // Plain object, not Map
  activeAssetId: string | null
  clips: Clip[]                          // Ordered array = clip sequence
  selectedClipId: string | null
  normalize: boolean
  defaultFadeIn: number
  defaultFadeOut: number
  previewJobId: string | null
  saveJobId: string | null
  preparedAssetId: string | null         // ID, not path. Server resolves.
  hasUnsavedChanges: boolean
}
```

---

## 5. Unified Render Contract & Integration

### Audio Input Type (matches existing `types.ts` discriminator naming)

```typescript
type AudioInput =
  | { type: 'base64'; data: string }       // existing
  | { type: 'url'; url: string }           // existing (cloud)
  | { type: 'path'; path: string }         // existing (cloud)
  | { type: 'asset'; assetId: string }     // NEW: prepared asset
```

### Asset Resolution

Asset ID to filesystem path resolution happens in the **API/service layer only**. `renderVideo.ts` continues to receive a resolved `audioPath` string. It never sees asset IDs.

```
API route receives { type: "asset", assetId: "abc-123" }
  → AudioAssetService.resolve("abc-123")
  → returns "C:/Users/.../audio-assets/abc-123/prepared.wav"
  → passed to renderVideo({ audioPath: resolvedPath, ... })
```

### Integration Changes

| File | Current Behavior | Change |
|------|-----------------|--------|
| `ControlPanel.tsx` | Render enabled only if `audioFile` exists | Also enable if `preparedAssetId` is set |
| `RenderDialog.tsx` | Local sends base64 from `audioFile` | If `preparedAssetId` set, send `{ type: "asset", assetId }` |
| `POST /api/render` | Cloud accepts base64/url/path | Add `type: "asset"` → resolve to path |
| `POST /api/render/local` | Requires base64 only | Add `type: "asset"` → resolve to path |
| `renderVideo.ts` | Receives audioPath or audioBuffer | No change. Receives resolved path from API layer. |
| `audioStore.ts` | `audioFile: File \| null` | Add `preparedAssetId: string \| null` |

### Backward Compatibility

- Existing file upload (drag-and-drop MP3) still works via `type: "base64"` path
- Audio Prep is additive. `AudioControls` unchanged.
- Users can still render without using the editor

---

## 6. Security Requirements

### SSRF Protection (Direct URL Ingest)

- HTTPS-only (reject HTTP)
- Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1)
- Optional domain allowlist (configurable)
- Response size limit before full download

### YouTube Ingest

- `--no-playlist` flag always set (prevents accidental playlist downloads)
- Download timeout: 5 minutes
- Max output file size: 100MB (configurable)
- Retries: 3 with backoff
- Cookie file for private/unlisted owned videos (secure file permissions)
- Rights attestation checkbox required in UI, timestamp stored in metadata

### General

- Asset IDs are UUIDs (not sequential, not guessable)
- Filesystem paths never sent to client
- Recipe validation enforced server-side (not just client)

---

## 7. Runtime & Storage Assumptions

### Local Development (Primary Target for MVP)

- FFmpeg + yt-dlp installed and in PATH
- `audio-assets/` directory on local filesystem
- Node.js processes handle async jobs directly
- No external queue needed (in-process job tracking)

### Vercel Deployment

- **Persistent `./audio-assets/` is NOT safe on Vercel** (ephemeral filesystem)
- Long-running FFmpeg/yt-dlp processes will timeout on serverless functions (10s limit)
- **For Vercel:** Use persistent object storage (R2, S3) + long-running worker (Modal, dedicated server)
- MVP targets local development. Vercel deployment of audio prep requires additional infrastructure work.

### Storage Lifecycle

- Disk quota: configurable (default 5GB)
- TTL cleanup: unused assets auto-deleted after 30 days
- Hash-based dedup: same source URL returns existing asset

---

## 8. Acceptance Criteria

1. **Ingest:** YouTube URL, video file, audio file, and direct URL all produce a valid asset with metadata and peaks
2. **Edit:** Trim, split, join, reorder, fade, volume, and normalize all produce correct audio output via filter_complex
3. **Preview:** Low-quality preview renders async and is playable in browser
4. **Save:** Full-quality prepared.wav materializes and is usable by render pipeline
5. **Render with asset:** Render succeeds with `{ type: "asset", assetId }` when `audioFile` is null
6. **Legacy flow unchanged:** Drag-and-drop MP3 upload + immediate render still works exactly as before
7. **Recipe validation:** Invalid recipes (overlapping, out-of-bounds, invalid fades) rejected with clear errors
8. **YouTube hardening:** Private/unlisted videos downloadable with cookies, playlists blocked, timeouts enforced

---

## 9. Build Order

1. **Backend ingest service:** `/api/audio/ingest` (YouTube/URL/file) + asset storage + ffprobe metadata + peaks generation
2. **Backend edit service:** `/api/audio/edit/preview` + `/api/audio/edit/save` + filter_complex rendering + recipe validation
3. **AudioPrepEditor UI:** WaveSurfer waveform + regions + clip list + drag reorder + preview/save buttons
4. **Render integration:** Wire `ControlPanel.tsx`, `RenderDialog.tsx`, and render API to accept `type: "asset"` + `preparedAssetId`
5. **QA matrix:** Test 30s, 60s, 5min audio; MP3/WAV/M4A; trim + join combinations; YouTube private/public; legacy upload flow

---

## 10. Out of Scope (Deferred)

- **Render pipeline stability** (streaming PreAnalyzer, segmented Puppeteer, dynamic FFmpeg buffers) - separate track
- **Multi-source editing** (tabs for multiple assets, cross-source clips) - phase 2
- **Vercel-compatible deployment** (object storage, worker infrastructure) - requires infra work
- **Audio effects beyond MVP** (EQ, reverb, pitch shift, time stretch)
