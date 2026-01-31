# Phase 2: Voice Pipeline - Research

**Researched:** 2026-01-31
**Domain:** Real-time voice interaction (STT + TTS)
**Confidence:** HIGH

## Summary

This phase implements the voice pipeline connecting microphone input to synthesized speech output. The architecture follows a chained pipeline (STT -> Placeholder Response -> TTS) with streaming at each stage to achieve sub-300ms latency.

**Key findings:**
- Deepgram's JavaScript SDK provides WebSocket-based streaming STT with interim results for real-time transcription display
- ElevenLabs Flash v2.5 delivers ~75ms model inference latency with streaming audio output
- Browser audio requires either MediaRecorder (webm) or raw PCM via AudioWorklet for STT input
- TTS audio playback through Web Audio API requires chunked decoding for streaming playback
- API key security requires a backend proxy - cannot expose keys in browser

**Primary recommendation:** Build a Next.js API route that proxies both Deepgram and ElevenLabs WebSocket connections, keeping all API keys server-side. Use MediaRecorder with webm format for browser-to-server audio streaming.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @deepgram/sdk | 3.x | STT WebSocket client | Official SDK, handles WebSocket protocol, interim results |
| @elevenlabs/elevenlabs-js | 2.x | TTS streaming | Official SDK, Flash v2.5 support, streaming API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ws | 8.x | WebSocket server | Node.js WebSocket proxy for API key protection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deepgram | Web Speech API | Free but Chrome-only, no cross-browser support |
| ElevenLabs | Browser SpeechSynthesis | Free but robotic voice quality |
| MediaRecorder | AudioWorklet + PCM | Raw PCM lower latency but complex implementation |

**Installation:**
```bash
npm install @deepgram/sdk @elevenlabs/elevenlabs-js ws
npm install -D @types/ws
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    api/
      jarvis/
        stt/route.ts          # WebSocket proxy for Deepgram
        tts/route.ts          # Streaming TTS endpoint
  lib/
    jarvis/
      voice/
        DeepgramClient.ts     # Browser-side STT WebSocket handler
        ElevenLabsClient.ts   # Browser-side TTS streaming handler
        VoicePipeline.ts      # State machine orchestrating flow
        AudioPlayer.ts        # Web Audio API playback with orb sync
      types.ts                # Extended with voice pipeline types
      stores/
        voiceStore.ts         # Voice pipeline state (or extend jarvisStore)
```

### Pattern 1: Voice Pipeline State Machine
**What:** Finite state machine managing turn-taking
**When to use:** Coordinating STT, response generation, and TTS
**Example:**
```typescript
// Source: Voice AI architecture best practices
type VoicePipelineState =
  | 'idle'           // Waiting for user to press PTT
  | 'listening'      // Recording audio, sending to STT
  | 'processing'     // STT complete, generating response
  | 'speaking'       // TTS audio playing
  | 'error';         // Something went wrong

// State transitions:
// idle -> listening (PTT press)
// listening -> processing (PTT release)
// processing -> speaking (response ready, TTS starts)
// speaking -> idle (TTS complete)
// any -> error (failure)
// error -> idle (retry/dismiss)
```

### Pattern 2: Backend Proxy for API Keys
**What:** Server-side WebSocket relay protecting credentials
**When to use:** Any browser-to-API communication with sensitive keys
**Example:**
```typescript
// Source: https://deepgram.com/learn/protecting-api-key
// Server-side proxy (Next.js API route with WebSocket upgrade)

// Client connects to your server:
const socket = new WebSocket('wss://yourserver.com/api/jarvis/stt');

// Server relays to Deepgram with real API key:
const deepgramSocket = new WebSocket(
  'wss://api.deepgram.com/v1/listen',
  ['token', process.env.DEEPGRAM_API_KEY]
);

// Bidirectional relay
clientSocket.on('message', (audio) => deepgramSocket.send(audio));
deepgramSocket.on('message', (transcript) => clientSocket.send(transcript));
```

### Pattern 3: MediaRecorder for Browser Audio Capture
**What:** Using MediaRecorder API to encode audio for transmission
**When to use:** Sending microphone audio to STT service
**Example:**
```typescript
// Source: https://deepgram.com/learn/live-transcription-mic-browser
// Browser-side audio capture and streaming

// Check codec support
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/webm';

// Create recorder from MicrophoneCapture's MediaStream
const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

// Send chunks to WebSocket (100-250ms optimal)
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
    socket.send(event.data);
  }
};

// Start with timeslice for chunked transmission
mediaRecorder.start(250); // 250ms chunks
```

### Pattern 4: Streaming TTS Audio Playback
**What:** Playing TTS audio as it streams from API
**When to use:** Low-latency voice output
**Example:**
```typescript
// Source: ElevenLabs streaming + Web Audio API patterns

class StreamingAudioPlayer {
  private audioContext: AudioContext;
  private scheduledTime = 0;

  async playChunk(base64Audio: string) {
    // Decode base64 to ArrayBuffer
    const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));

    // Decode audio
    const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);

    // Schedule playback
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Also connect to AnalyserNode for orb reactivity
    source.connect(this.analyserNode);

    if (this.scheduledTime < this.audioContext.currentTime) {
      this.scheduledTime = this.audioContext.currentTime;
    }

    source.start(this.scheduledTime);
    this.scheduledTime += audioBuffer.duration;
  }
}
```

### Anti-Patterns to Avoid
- **Exposing API keys in browser:** Never include Deepgram/ElevenLabs keys in client-side code
- **Blocking on full audio:** Don't wait for entire TTS response before playing
- **Ignoring interim results:** Use interim transcripts for real-time feedback even if not displayed
- **Missing error recovery:** Always implement WebSocket reconnection logic

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket auth | Custom token system | Deepgram short-lived tokens | 30-second TTL, SDK support |
| Audio encoding | Custom PCM encoder | MediaRecorder | Browser-optimized, handles codecs |
| TTS streaming | Manual chunking | ElevenLabs streaming endpoint | Handles backpressure, timing |
| Audio format detection | Codec sniffing | Let Deepgram auto-detect | SDK handles webm, opus, etc |
| Reconnection logic | Manual retry loops | SDK built-in handlers | Deepgram SDK has events for errors |

**Key insight:** Both Deepgram and ElevenLabs SDKs handle the hard parts (reconnection, encoding, streaming). Use their abstractions instead of raw WebSocket manipulation.

## Common Pitfalls

### Pitfall 1: Audio Silence Timeout
**What goes wrong:** Deepgram closes connection after 10 seconds of no audio
**Why it happens:** Network delay, pauses in speech, forgetting to send during PTT
**How to avoid:** Send KeepAlive messages or silent audio frames periodically
**Warning signs:** NET-0001 error code, unexpected WebSocket closure

### Pitfall 2: API Key Exposure
**What goes wrong:** API keys visible in browser DevTools Network tab
**Why it happens:** Direct browser-to-API WebSocket connection
**How to avoid:** Use backend proxy or short-lived tokens (30 second TTL)
**Warning signs:** Hardcoded keys in client code, direct wss://api.deepgram.com connections

### Pitfall 3: Audio Playback Gaps
**What goes wrong:** Clicks, pops, or gaps between TTS audio chunks
**Why it happens:** Scheduling chunks without precise timing, resampling issues
**How to avoid:** Use AudioContext timing (scheduledTime pattern), consistent sample rate
**Warning signs:** Audible clicks at chunk boundaries, choppy audio

### Pitfall 4: Memory Leaks in Audio Processing
**What goes wrong:** Memory grows during long conversations
**Why it happens:** Not disconnecting AudioBufferSourceNodes, accumulating decoded buffers
**How to avoid:** Call source.disconnect() after playback, clear buffer references
**Warning signs:** Growing memory in DevTools, browser slowdown

### Pitfall 5: Race Conditions in State Machine
**What goes wrong:** TTS starts playing while user is still speaking
**Why it happens:** Async events from STT and TTS interleaving incorrectly
**How to avoid:** Use explicit state machine with guarded transitions
**Warning signs:** Overlapping audio, duplicate responses

### Pitfall 6: MediaRecorder Codec Mismatch
**What goes wrong:** Deepgram returns DATA-0000 error (cannot decode audio)
**Why it happens:** Sending audio format Deepgram doesn't expect
**How to avoid:** Use audio/webm which Deepgram auto-detects, or specify encoding parameter
**Warning signs:** Empty transcripts, DATA errors in WebSocket close frame

## Code Examples

Verified patterns from official sources:

### Deepgram STT WebSocket Connection
```typescript
// Source: https://github.com/deepgram/deepgram-js-sdk
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

// Server-side (proxy)
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const connection = deepgram.listen.live({
  model: 'nova-3',
  language: 'en-US',
  smart_format: true,
  interim_results: true,  // Enable real-time partial transcripts
  utterance_end_ms: 1000, // Detect end of utterance
  vad_events: true,       // Voice activity detection events
});

connection.on(LiveTranscriptionEvents.Open, () => {
  console.log('Deepgram connection opened');
});

connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel.alternatives[0].transcript;
  const isFinal = data.is_final;
  const speechFinal = data.speech_final;

  if (transcript) {
    // isFinal: true = max accuracy for this segment
    // speechFinal: true = user finished speaking (utterance complete)
    console.log(`[${isFinal ? 'FINAL' : 'interim'}] ${transcript}`);
  }
});

connection.on(LiveTranscriptionEvents.Error, (error) => {
  console.error('Deepgram error:', error);
});

connection.on(LiveTranscriptionEvents.Close, () => {
  console.log('Deepgram connection closed');
});
```

### ElevenLabs Streaming TTS
```typescript
// Source: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
// Server-side endpoint

const VOICE_ID = 'HDA9tsk27wYi3uq0fPcK'; // Stuart - professional, friendly
const MODEL_ID = 'eleven_flash_v2_5';     // ~75ms latency

// HTTP streaming approach (simpler than WebSocket for single responses)
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: responseText,
      model_id: MODEL_ID,
      output_format: 'mp3_44100_64', // Lower bitrate for faster streaming
      optimize_streaming_latency: 3, // Max latency optimization
    }),
  }
);

// Stream response to client
return new Response(response.body, {
  headers: {
    'Content-Type': 'audio/mpeg',
    'Transfer-Encoding': 'chunked',
  },
});
```

### Voice Pipeline State Machine
```typescript
// Voice pipeline orchestration

type PipelineState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoicePipelineStore {
  state: PipelineState;
  currentTranscript: string;      // Latest interim/final transcript
  finalTranscript: string;        // Complete utterance
  error: string | null;

  // Actions
  startListening: () => void;
  stopListening: () => void;      // Triggered by PTT release
  setTranscript: (text: string, isFinal: boolean) => void;
  startSpeaking: () => void;
  finishSpeaking: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

// State transitions
const transitions: Record<PipelineState, PipelineState[]> = {
  idle: ['listening', 'error'],
  listening: ['processing', 'error', 'idle'],  // idle = cancelled
  processing: ['speaking', 'error', 'idle'],   // idle = empty response
  speaking: ['idle', 'error'],
  error: ['idle'],
};

function canTransition(from: PipelineState, to: PipelineState): boolean {
  return transitions[from].includes(to);
}
```

### Web Audio API Orb Sync
```typescript
// Connect TTS audio to orb visualization

class AudioPlayer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Float32Array;

  constructor() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
    this.dataArray = new Float32Array(this.analyser.fftSize);
  }

  // Get current audio level for orb reactivity
  getAudioLevel(): number {
    this.analyser.getFloatTimeDomainData(this.dataArray);

    // Calculate RMS (same as MicrophoneCapture)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    return Math.min(1, Math.sqrt(sum / this.dataArray.length) * 4);
  }

  // Start analysis loop during TTS playback
  startAnalysis(onLevel: (level: number) => void) {
    const analyze = () => {
      onLevel(this.getAudioLevel());
      if (this.isPlaying) {
        requestAnimationFrame(analyze);
      }
    };
    analyze();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Batch STT | Streaming STT with interim results | Standard since 2023 | Real-time transcription display |
| Full TTS response | Streaming TTS | Standard since 2024 | Sub-300ms first audio byte |
| Raw WebSocket | SDK with auto-reconnect | Deepgram SDK v3 | Simpler error handling |
| MediaStream direct | MediaRecorder encoding | Browser best practice | Compatible with more backends |

**Deprecated/outdated:**
- Web Speech API for production: Limited to Chrome, privacy concerns
- Polling for transcripts: Use WebSocket streaming instead
- Custom audio encoding: Use browser's MediaRecorder

## Voice Selection for "Calm, Knowing Guide"

Based on ElevenLabs voice recommendations for conversational AI:

| Voice | ID | Character | Why Suitable |
|-------|-----|-----------|--------------|
| Stuart | HDA9tsk27wYi3uq0fPcK | Professional, friendly Aussie | Technical assistance, calm demeanor |
| Mark | 1SM7GgM6IMuvQlz2BwM3 | Relaxed, laid back | Nonchalant, non-urgent feel |
| Archer | L0Dsvb3SLTyegXwtm47J | Grounded, charming British male | Warm, intelligent presence |
| Jessica Anne Bogart | g6xIsTj2HwM6VR4iXFCw | Empathetic, expressive | Wellness coach vibe |

**Recommendation:** Start with Stuart (HDA9tsk27wYi3uq0fPcK) - professional yet friendly, good for technical/productivity context. The voice can be swapped via config without code changes.

## Latency Budget Analysis

**Target:** Sub-300ms from speech completion to first TTS audio

| Stage | Budget | Notes |
|-------|--------|-------|
| STT final transcript | ~50-100ms | After VAD detects end of speech |
| Network to/from server | ~20-50ms | WebSocket latency |
| Placeholder response | ~0ms | Hardcoded in Phase 2 |
| TTS generation start | ~75ms | ElevenLabs Flash v2.5 |
| TTS first byte to client | ~20-50ms | Streaming response |
| Audio decode + play | ~10-20ms | Web Audio API |
| **Total** | **175-295ms** | Within 300ms budget |

**Note:** Phase 3 adds LLM latency (Claude streaming can start TTS before full response).

## Open Questions

Things that couldn't be fully resolved:

1. **WebSocket upgrade in Next.js App Router**
   - What we know: Next.js API routes support streaming but WebSocket upgrade is tricky
   - What's unclear: Best pattern for WebSocket proxy in App Router
   - Recommendation: May need separate WebSocket server or use Server-Sent Events for TTS

2. **Audio format for minimum latency**
   - What we know: MP3 works, PCM is lower latency but needs WAV headers
   - What's unclear: Whether mp3_44100_64 vs pcm_44100 matters for sub-300ms
   - Recommendation: Start with MP3, optimize to PCM if needed

3. **Error recovery UX**
   - What we know: Need graceful "I didn't catch that" handling
   - What's unclear: Exact visual/audio feedback patterns
   - Recommendation: Define in planning, iterate based on testing

## Sources

### Primary (HIGH confidence)
- [Deepgram JavaScript SDK](https://github.com/deepgram/deepgram-js-sdk) - WebSocket integration patterns
- [ElevenLabs Stream API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream) - Streaming TTS endpoint
- [ElevenLabs Models](https://elevenlabs.io/docs/overview/models) - Flash v2.5 latency specs
- [Deepgram Interim Results](https://developers.deepgram.com/docs/interim-results) - is_final vs speech_final

### Secondary (MEDIUM confidence)
- [Deepgram Browser Tutorial](https://deepgram.com/learn/live-transcription-mic-browser) - MediaRecorder pattern
- [Deepgram API Key Protection](https://deepgram.com/learn/protecting-api-key) - Proxy architecture
- [ElevenLabs Latency Optimization](https://elevenlabs.io/docs/developers/best-practices/latency-optimization) - Model selection
- [ElevenLabs Voice Guide](https://elevenlabs.io/docs/agents-platform/customization/voice/best-practices/conversational-voice-design) - Voice recommendations

### Tertiary (LOW confidence)
- [Voice AI Architecture Patterns](https://softcery.com/lab/ai-voice-agents-real-time-vs-turn-based-tts-stt-architecture) - General patterns
- [Web Audio Streaming Gist](https://gist.github.com/revolunet/e620e2c532b7144c62768a36b8b96da2) - Audio playback pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs well-documented
- Architecture: HIGH - Patterns verified against official tutorials
- Pitfalls: HIGH - Error codes and solutions from official docs
- Voice selection: MEDIUM - Based on ElevenLabs recommendations, needs testing

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (APIs stable, check for SDK major versions)
