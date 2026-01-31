# Architecture Patterns

**Domain:** Voice-enabled AI Personal Assistant
**Researched:** 2026-01-31
**Confidence:** MEDIUM (verified patterns, some implementation details need phase-specific validation)

## Executive Summary

Voice AI assistants follow a well-established **chained pipeline architecture**: Speech-to-Text (STT) -> Language Model (LLM) -> Text-to-Speech (TTS). This modular approach is recommended for new projects because it is easier to debug, allows swapping individual components, and provides predictable costs. The alternative—end-to-end speech-to-speech models—offers lower latency but is harder to customize and debug.

For Jarvis specifically, the architecture must integrate:
1. Browser-based voice I/O (microphone capture, audio playback)
2. Real-time STT (Deepgram recommended over Web Speech API)
3. Claude API for reasoning with tool calling
4. Notion MCP for data layer access
5. Ethereal Flame orb for visual feedback
6. Vercel hosting with Next.js

## Recommended Architecture

```
+-----------------------------------------------------------------------------------+
|                              BROWSER (Next.js Client)                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-------------+     +------------------+     +------------------+                |
|  | Microphone  |---->| Audio Capture    |---->| STT WebSocket    |----+          |
|  | (MediaStream)|    | (Web Audio API)  |     | (Deepgram SDK)   |    |          |
|  +-------------+     +------------------+     +------------------+    |          |
|                                                                       |          |
|  +-------------+     +------------------+     +------------------+    |          |
|  | Speakers    |<----| Audio Playback   |<----| TTS Streaming    |    |          |
|  | (Audio API) |     | (AudioContext)   |     | (ElevenLabs)     |    |          |
|  +-------------+     +------------------+     +------------------+    |          |
|                                                      ^                |          |
|                                                      |                v          |
|  +--------------------------------------------------+----------------------------+
|  |                    Orchestration Layer (React + Zustand)                      |
|  |  +----------------+  +----------------+  +------------------+                 |
|  |  | Conversation   |  | Audio State    |  | Visual State     |                 |
|  |  | Manager        |  | Machine        |  | (Orb Animation)  |                 |
|  |  +----------------+  +----------------+  +------------------+                 |
|  +-------------------------------------------------------------------------------+
|                                       |                                           |
|  +-------------------------------------------------------------------------------+
|  |                     Ethereal Flame Orb (Visual Avatar)                        |
|  |  - Pulses on TTS audio output                                                 |
|  |  - Idle animation when listening                                              |
|  |  - Beat detection from AudioAnalyzer                                          |
|  +-------------------------------------------------------------------------------+
|                                                                                   |
+-----------------------------------------------------------------------------------+
                                        |
                                        | API Routes (HTTPS)
                                        v
+-----------------------------------------------------------------------------------+
|                          VERCEL SERVERLESS (Next.js API Routes)                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------+     +----------------------+                             |
|  | /api/chat           |---->| Claude API           |                             |
|  | (Conversation Core) |     | (Tool Calling)       |                             |
|  +---------------------+     +----------------------+                             |
|                                       |                                           |
|                                       v                                           |
|  +-------------------------------------------------------------------+           |
|  |                    Tool Execution Layer                           |           |
|  |  +-------------------+  +-------------------+  +----------------+ |           |
|  |  | Notion MCP Client |  | Time/Calendar     |  | User Prefs     | |           |
|  |  | (read/write)      |  | (awareness)       |  | (patterns)     | |           |
|  |  +-------------------+  +-------------------+  +----------------+ |           |
|  +-------------------------------------------------------------------+           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
                                        |
                                        | MCP / REST
                                        v
+-----------------------------------------------------------------------------------+
|                              EXTERNAL SERVICES                                    |
+-----------------------------------------------------------------------------------+
|  +-------------------+  +-------------------+  +-------------------+              |
|  | Notion Workspace  |  | Deepgram API      |  | ElevenLabs API   |              |
|  | (Data Layer)      |  | (STT)             |  | (TTS)            |              |
|  +-------------------+  +-------------------+  +-------------------+              |
+-----------------------------------------------------------------------------------+
```

## Component Boundaries

| Component | Responsibility | Communicates With | Build Phase |
|-----------|---------------|-------------------|-------------|
| **Audio Capture** | Microphone access, audio chunk buffering | STT WebSocket | Phase 1 |
| **STT Client** | Real-time speech transcription | Audio Capture, Orchestration | Phase 1 |
| **Orchestration** | State machine, turn management, context | All components | Phase 1-2 |
| **Chat API Route** | Claude reasoning, tool dispatch | Claude API, MCP, Orchestration | Phase 2 |
| **TTS Streaming** | Voice synthesis, audio streaming | ElevenLabs, Audio Playback | Phase 1 |
| **Audio Playback** | Streaming audio output, volume control | TTS, Orb Animation | Phase 1 |
| **Orb Animation** | Visual feedback synchronized to audio | Audio Analyzer, Visual State | Phase 1 |
| **Notion MCP** | Read/write Notion databases | Claude Tools, Chat API | Phase 3 |
| **User Preferences** | Pushiness levels, time patterns | Orchestration, Claude Context | Phase 4 |

## Data Flow

### Voice Input Flow (User speaks)

```
1. User speaks into microphone
2. MediaStream API captures audio chunks
3. Audio chunks sent via WebSocket to Deepgram
4. Deepgram returns real-time transcript (interim + final)
5. Final transcript triggers conversation turn
6. Orchestration layer sends transcript to /api/chat
7. Claude processes with tool calling enabled
8. Claude may invoke Notion MCP tools
9. Response text returned to client
10. Response sent to ElevenLabs for TTS
11. Audio streamed back and played
12. Orb pulses synchronized to audio output
```

### Voice Output Flow (Jarvis speaks)

```
1. Response text arrives from Claude
2. Text chunked for streaming TTS
3. ElevenLabs returns audio chunks (~75ms latency)
4. Audio chunks fed to AudioContext
5. AudioAnalyzer extracts amplitude/frequency data
6. Orb animation driven by beat detection
7. User can interrupt (barge-in detection)
```

### Turn-Taking State Machine

```
                    +------------+
                    |   IDLE     |
                    | (listening)|
                    +-----+------+
                          |
                    voice detected
                          |
                          v
                    +------------+
                    | LISTENING  |
                    | (capturing)|
                    +-----+------+
                          |
                    silence/endpoint
                          |
                          v
                    +------------+
                    | PROCESSING |
                    | (thinking) |
                    +-----+------+
                          |
                    response ready
                          |
                          v
                    +------------+
                    | SPEAKING   |
                    | (TTS play) |
                    +-----+------+
                          |
              +-----------+-----------+
              |                       |
         completed               user interrupts
              |                       |
              v                       v
        +------------+          +------------+
        |   IDLE     |          | LISTENING  |
        +------------+          +------------+
```

## Patterns to Follow

### Pattern 1: Streaming-First Audio Pipeline

**What:** Process audio as streams, not complete files. Start TTS playback before full response is generated.

**When:** Always for real-time voice interaction.

**Why:** Reduces perceived latency. Pipeline latency compounds: STT (100-500ms) + LLM (350ms-1s+) + TTS (75-200ms). Streaming allows overlap.

**Example:**
```typescript
// Stream TTS chunks as they arrive
async function streamResponse(text: string) {
  const ttsStream = await elevenlabs.textToSpeech.stream(voiceId, {
    text,
    modelId: "eleven_flash_v2_5", // 75ms latency
  });

  const audioContext = new AudioContext();
  for await (const chunk of ttsStream) {
    // Queue audio chunks for playback
    await queueAudioChunk(audioContext, chunk);
  }
}
```

**Source:** [ElevenLabs Streaming Documentation](https://elevenlabs.io/docs/developers/guides/cookbooks/text-to-speech/streaming)

### Pattern 2: WebSocket for STT, REST for LLM

**What:** Use persistent WebSocket connection for real-time STT. Use REST API routes for LLM calls.

**When:** Browser-based voice apps with Vercel hosting.

**Why:** STT needs continuous bidirectional streaming (audio up, transcripts down). LLM calls are request/response and fit serverless better. Vercel serverless functions have 60s timeout which is sufficient for LLM calls.

**Example:**
```typescript
// Browser: WebSocket to Deepgram
const socket = new WebSocket("wss://api.deepgram.com/v1/listen", ["token", apiKey]);
socket.onmessage = (event) => {
  const transcript = JSON.parse(event.data);
  if (transcript.is_final) {
    // Send to API route
    fetch("/api/chat", { body: JSON.stringify({ text: transcript.text }) });
  }
};

// API Route: REST to Claude
export async function POST(req: Request) {
  const { text } = await req.json();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: text }],
    tools: notionTools,
  });
  return Response.json(response);
}
```

**Source:** [Deepgram Next.js Starter](https://github.com/deepgram-starters/nextjs-live-transcription)

### Pattern 3: Tool Calling for Data Access

**What:** Define Claude tools for Notion operations. Claude decides when to query/update Notion.

**When:** Any data layer interaction.

**Why:** Claude's tool calling handles intent parsing naturally. No need for explicit command detection. Claude determines when information is needed.

**Example:**
```typescript
const tools = [
  {
    name: "query_tasks",
    description: "Get tasks from Notion with optional filters",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "in_progress", "done"] },
        due_date: { type: "string", description: "ISO date for due filter" }
      }
    }
  },
  {
    name: "create_inbox_item",
    description: "Capture a new idea or task to the inbox",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The idea or task to capture" }
      },
      required: ["content"]
    }
  }
];
```

**Source:** [Claude Tool Use Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)

### Pattern 4: Audio-Visual Synchronization via Analyzer

**What:** Feed TTS audio through AudioAnalyzer to drive orb animation.

**When:** Jarvis is speaking.

**Why:** Creates embodied presence. The existing AudioAnalyzer from Ethereal Flame already provides amplitude, bass, mid, high, and beat detection - perfect for orb reactivity.

**Example:**
```typescript
// Existing AudioAnalyzer can connect to any audio element
const audioElement = document.createElement("audio");
audioElement.srcObject = ttsAudioStream;
await audioAnalyzer.connect(audioElement);

// In animation loop
function animate() {
  audioAnalyzer.update(deltaTime);
  const { amplitude, isBeat, currentScale } = audioAnalyzer.getLevels();

  // Drive orb animation
  orb.scale.setScalar(currentScale);
  orb.material.emissiveIntensity = amplitude * 2;
}
```

**Source:** Existing `src/lib/audio/AudioAnalyzer.ts`

### Pattern 5: Conversation Context Management

**What:** Maintain conversation history with sliding window. Include system context about user preferences and current time.

**When:** Every Claude API call.

**Why:** Claude needs context for coherent multi-turn conversations. System prompt establishes Jarvis personality and current situation awareness.

**Example:**
```typescript
const systemPrompt = `You are Jarvis, a professional butler-style executive function partner.
Current time: ${new Date().toISOString()}
User's timezone: ${userTimezone}
Current focus mode: ${focusMode}
Time in current session: ${sessionDuration}

Your role is to help manage priorities, capture ideas, and maintain time awareness.
Speak formally but warmly. Be concise - this is voice, not text.`;

const messages = [
  ...conversationHistory.slice(-10), // Keep last 10 turns
  { role: "user", content: transcript }
];
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Web Speech API for Production STT

**What:** Using the browser's built-in SpeechRecognition API.

**Why bad:**
- Only works in Chrome/Chromium browsers
- Firefox, Safari (PWA), Brave do not support it
- Sends audio to Google servers (privacy concern)
- No control over model, latency, or accuracy
- Cannot work offline without language pack download

**Instead:** Use Deepgram or AssemblyAI for production STT. They offer 150ms latency, work in all browsers via WebSocket, and provide better accuracy.

**Source:** [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [AssemblyAI Blog](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api)

### Anti-Pattern 2: Polling for Audio State

**What:** Using setInterval to check audio playback status.

**Why bad:** Wastes CPU, introduces latency, misses events between polls.

**Instead:** Use event-driven callbacks:
```typescript
audioElement.addEventListener("ended", handleSpeechComplete);
audioElement.addEventListener("play", handleSpeechStart);
```

### Anti-Pattern 3: Blocking on Full TTS Generation

**What:** Waiting for entire TTS audio file before starting playback.

**Why bad:** Adds 1-3 seconds of perceived latency. User waits in silence.

**Instead:** Stream TTS chunks and begin playback immediately. ElevenLabs Flash v2.5 delivers first chunk in ~75ms.

**Source:** [ElevenLabs Documentation](https://elevenlabs.io/docs/api-reference/streaming)

### Anti-Pattern 4: Storing Conversation State in Browser Only

**What:** Keeping conversation history only in React state or localStorage.

**Why bad:** Lost on refresh, no persistence across devices, can't resume sessions.

**Instead:**
- Short-term: Keep in Zustand with optional localStorage persistence
- Long-term: Store conversation summaries in Notion for cross-session context

### Anti-Pattern 5: Direct MCP from Browser

**What:** Connecting to Notion MCP server directly from browser.

**Why bad:** Notion MCP requires OAuth authentication flow. Browser cannot maintain secure MCP connection. Exposes credentials.

**Instead:** MCP connection lives in server (API routes). Browser communicates with your API routes, which then use MCP to access Notion.

**Source:** [Notion MCP Documentation](https://developers.notion.com/docs/mcp)

## Build Order (Dependencies)

The architecture has clear dependencies that dictate build order:

```
Phase 1: Audio Foundation (No external AI)
├── Microphone capture (Web Audio API)
├── Audio playback infrastructure
├── Orb integration (connect AudioAnalyzer)
└── Basic UI shell

Phase 2: Voice Pipeline (STT + TTS)
├── Deepgram WebSocket integration
├── ElevenLabs streaming TTS
├── Turn-taking state machine
└── Basic echo test (speak, transcribe, speak back)

Phase 3: Intelligence Layer (Claude)
├── Chat API route with Claude
├── Tool definitions for Notion
├── Conversation context management
└── Simple Q&A without data access

Phase 4: Data Integration (Notion MCP)
├── MCP client setup in API routes
├── Tool implementations (query, create, update)
├── Morning briefing workflow
└── Inbox capture workflow

Phase 5: Modes and Behaviors
├── Body doubling mode (timed check-ins)
├── Triage session flow
├── Adaptive pushiness (user preference learning)
└── Evening wrap workflow
```

### Dependency Rationale

1. **Audio before AI:** Must prove voice capture/playback works before adding complexity
2. **STT before Claude:** Need reliable transcription before LLM can process
3. **Claude before Notion:** Tool calling architecture must work before adding tool implementations
4. **Basic before Advanced:** Morning briefing simpler than adaptive pushiness

## Scalability Considerations

| Concern | At 1 User | At 10 Users | At 100 Users |
|---------|-----------|-------------|--------------|
| STT Costs | ~$0.01/min (Deepgram) | $0.10/min | $1.00/min - consider batching |
| TTS Costs | ~$0.003/1k chars (ElevenLabs) | $0.03/1k chars | Bulk pricing, consider caching |
| Claude API | Pay per token | Pay per token | Consider response caching for common queries |
| Vercel | Free tier sufficient | Pro tier | Enterprise tier |
| WebSocket Connections | 1 concurrent | 10 concurrent | May need dedicated WebSocket service |
| Notion API | 3 req/sec limit | Rate limiting concern | Queue requests, cache reads |

**For single-user Jarvis:** Scalability is not a concern. All services have sufficient free/starter tiers.

## Technology Choices Summary

| Component | Recommended | Why | Alternatives |
|-----------|-------------|-----|--------------|
| STT | Deepgram | 150ms latency, good accuracy, WebSocket streaming, Next.js starter available | AssemblyAI (similar), OpenAI Whisper (batch only) |
| LLM | Claude API | Best reasoning, tool calling, personality consistency | OpenAI GPT-4o (good alternative), Gemini (cost effective) |
| TTS | ElevenLabs | 75ms latency (Flash), natural voices, streaming | Deepgram Aura (unified platform), OpenAI TTS (simpler) |
| Data Layer | Notion MCP | User already has PARA system, official MCP support | Custom database (more work) |
| Hosting | Vercel | Already hosting Ethereal Flame, serverless, edge functions | None (requirement) |
| Framework | Next.js | Already used, API routes, React | None (requirement) |

## Open Architecture Questions

These need validation during implementation:

1. **WebSocket Management:** How to handle Deepgram WebSocket reconnection on network interruption?
2. **Barge-in Detection:** How to detect user interruption during TTS playback?
3. **MCP Session:** Does Notion MCP OAuth flow work with Vercel serverless (stateless)?
4. **Audio Sync:** Exact integration point for TTS audio -> AudioAnalyzer -> Orb?
5. **Mobile Microphone:** Does MediaStream API work reliably on iOS Safari?

## Sources

### HIGH Confidence (Official Documentation)
- [Deepgram Next.js Starter](https://github.com/deepgram-starters/nextjs-live-transcription)
- [ElevenLabs Streaming Documentation](https://elevenlabs.io/docs/developers/guides/cookbooks/text-to-speech/streaming)
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [Claude Tool Use Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)

### MEDIUM Confidence (Verified Industry Patterns)
- [AssemblyAI Voice AI Stack](https://www.assemblyai.com/blog/the-voice-ai-stack-for-building-agents)
- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Pipecat Framework](https://github.com/pipecat-ai/pipecat)
- [TEN Framework](https://theten.ai/blog/building-real-time-voice-ai-with-websockets)

### LOW Confidence (Needs Validation)
- Mobile Safari microphone behavior (needs testing)
- Vercel serverless + MCP OAuth flow (needs validation)
- Exact latency numbers for full pipeline (needs benchmarking)
