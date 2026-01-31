---
phase: 02-voice-pipeline
plan: 01
subsystem: voice-stt
tags: [deepgram, stt, streaming, sse, websocket-proxy]

dependency-graph:
  requires: [01-audio-foundation]
  provides: [stt-client, stt-proxy, voice-types]
  affects: [02-02, 02-03]

tech-stack:
  added: [@deepgram/sdk]
  patterns: [sse-audio-proxy, session-management]

key-files:
  created:
    - src/lib/jarvis/voice/types.ts
    - src/lib/jarvis/voice/index.ts
    - src/lib/jarvis/voice/DeepgramClient.ts
    - src/app/api/jarvis/stt/route.ts
  modified: []

decisions:
  - id: stt-sse-pattern
    choice: "SSE + POST instead of WebSocket"
    why: "Next.js App Router doesn't support WebSocket upgrades in route handlers"
  - id: audio-encoding
    choice: "webm/opus via MediaRecorder"
    why: "Widely supported, efficient for streaming audio"
  - id: session-storage
    choice: "In-memory Map for session management"
    why: "Sufficient for local dev and single-instance deployment"

metrics:
  duration: 17 min
  completed: 2026-01-31
---

# Phase 2 Plan 1: Deepgram STT Integration Summary

**One-liner:** Deepgram streaming STT with secure server proxy, SSE transcripts, and MediaRecorder audio capture.

## What Was Built

### Voice Pipeline Types (`src/lib/jarvis/voice/types.ts`)

Type definitions for the voice pipeline:

- `TranscriptResult`: STT response with transcript, confidence, word-level timing
- `STTConfig`: Configuration for model, language, interim results
- `STTCallbacks`: Event handlers for transcript, error, open, close
- `TTSConfig` / `TTSCallbacks`: Prepared for TTS integration (02-02)
- `VoicePipelineState`: Pipeline state machine (idle, listening, processing, speaking, error)

### Deepgram Proxy API Route (`src/app/api/jarvis/stt/route.ts`)

Server-side proxy that keeps API key secure:

- **GET**: Opens SSE connection, creates Deepgram WebSocket, streams transcripts back
- **POST**: Receives audio chunks from browser, forwards to Deepgram
- **DELETE**: Cleans up session resources
- Session management with 5-minute timeout cleanup
- Handles connection lifecycle events (open, transcript, utterance_end, error, close)

### DeepgramClient (`src/lib/jarvis/voice/DeepgramClient.ts`)

Browser-side STT client:

- `start(mediaStream)`: Opens SSE connection, starts MediaRecorder with 100ms chunks
- `stop()`: Stops recording, closes connections, requests server cleanup
- Audio queue buffers chunks until Deepgram connection opens
- Parses SSE transcript events, calls user callbacks
- Auto-detects supported MIME type (webm/opus preferred)

## Architecture

```
Browser                          Server                    Deepgram
-------                          ------                    --------
MicrophoneCapture
    |
    v
DeepgramClient
    |
    +-- SSE GET -----------------> /api/jarvis/stt
    |                                   |
    |                                   +-- WebSocket --> api.deepgram.com
    |                                   |
    +-- POST audio chunks -------> forwards to Deepgram
    |                                   |
    <-- SSE transcript events -----+
```

## Key Implementation Details

### SSE + POST Pattern

Next.js App Router doesn't support WebSocket upgrades. Instead:

1. Browser opens SSE connection (GET) for receiving transcripts
2. Browser POSTs audio chunks separately
3. Server maintains Deepgram WebSocket per session
4. Server pushes transcript events via SSE

### MediaRecorder Settings

```typescript
{
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000
}
```

Chunks sent every 100ms for low latency.

### Deepgram Configuration

```typescript
{
  model: 'nova-3',
  language: 'en-US',
  smart_format: true,
  interim_results: true,
  utterance_end_ms: 1000,
  vad_events: true,
  encoding: 'linear16',
  sample_rate: 16000
}
```

## Commits

| Commit | Description |
|--------|-------------|
| ffcfa21 | feat(02-01): create voice pipeline types |
| 0b56284 | feat(02-01): create Deepgram STT proxy API route |
| 5b28fdd | feat(02-01): create DeepgramClient browser class |

## Deviations from Plan

**[Rule 1 - Bug] Fixed Buffer type incompatibility**

- **Found during:** Task 2 verification
- **Issue:** `Buffer.from(audioData)` not assignable to `SocketDataLike` (Deepgram SDK type)
- **Fix:** Pass `ArrayBuffer` directly instead of converting to Buffer
- **Files modified:** src/app/api/jarvis/stt/route.ts
- **Commit:** 0b56284

## What's Next

**02-02 (TTS Integration):**

- Create SpeechClient using browser SpeechSynthesis
- Implement speak(), stop(), and callbacks
- Wire audio output to orb speaking state

**02-03 (Voice Pipeline Orchestration):**

- VoicePipeline class to coordinate STT -> LLM -> TTS
- Integrate DeepgramClient and SpeechClient
- Connect to PushToTalk UI from Phase 1

## User Setup Required

Before using STT, configure Deepgram API key:

1. Sign up at https://console.deepgram.com/signup
2. Go to Settings -> API Keys -> Create Key
3. Add to `.env.local`:
   ```
   DEEPGRAM_API_KEY=your_api_key_here
   ```

---

*Phase: 02-voice-pipeline | Plan: 01 | Completed: 2026-01-31*
