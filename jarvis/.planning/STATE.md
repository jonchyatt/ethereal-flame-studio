# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** Phase 3 - Intelligence Layer (COMPLETE)

## Current Position

Phase: 3 of 6 (Intelligence Layer)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase 3 complete
Last activity: 2026-02-01 - Completed 03-03-PLAN.md (Claude Integration)

Progress: [##########] 50% (3/6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 9 min
- Total execution time: 69 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-audio-foundation | 3/3 | 27 min | 9 min |
| 02-voice-pipeline | 3/3 | 25 min | 8 min |
| 03-intelligence-layer | 3/3 | 18 min | 6 min |

**Recent Trend:**
- Last 5 plans: 02-03 (5 min), 03-01 (7 min), 03-02 (3 min), 03-03 (8 min)
- Trend: Fast plans (integration work, established patterns)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use Deepgram for STT (not Web Speech API) for cross-browser support
- [Roadmap]: Use ElevenLabs Flash v2.5 for sub-75ms TTS latency
- [Roadmap]: Follow chained pipeline architecture (STT -> LLM -> TTS) for modularity
- [Roadmap]: 300ms total latency budget for conversational feel
- [Context]: Omnipresent guide personality (NOT butler)
- [Context]: NO butler voice - avoid formal British male voices, prefer neutral/warm US voices
- [Context]: Orb state colors: blue->cyan->amber->orange (cool->warm)
- [Context]: Intensity/reactivity increases with Jarvis's perceived importance
- [Context]: Dynamic transition speeds based on emotional intensity
- [Context]: Placeholder orb first, fancy animations after pipeline proven
- [Scope]: Bill tracking in v1 (same workspace, FIN-01/02/03 added)
- [01-01]: Use h-dvh for mobile viewport height handling
- [01-01]: Clamp audioLevel and importance to 0-1 in store actions
- [01-02]: 200 particles for mobile performance (vs 1000+ in main Ethereal Flame)
- [01-02]: OrbStateManager as pure logic component (returns null)
- [01-02]: Importance boosts both intensity (1.3x) and reactivity (1.5x)
- [01-02]: Animation state passed via callback to avoid re-renders
- [01-03]: RMS amplitude calculation for accurate voice level
- [01-03]: 256 FFT size for fast response time
- [01-03]: Singleton pattern for MicrophoneCapture
- [01-03]: Permission explanation BEFORE browser prompt
- [01-03]: Spacebar support for desktop push-to-talk
- [02-01]: SSE + POST pattern for STT proxy (Next.js App Router WebSocket limitation)
- [02-01]: In-memory session Map for single-instance deployment
- [02-03]: Raw PCM (linear16) via Web Audio API (webm/opus from MediaRecorder failed)
- [03-01]: claude-haiku-4-5 for fast TTFT (~360ms) within latency budget
- [03-01]: SSE streaming matches existing STT pattern
- [03-01]: Error events via SSE (type: error) for graceful handling
- [03-02]: 10 message sliding window for context
- [03-02]: 20 max key facts for cross-session memory
- [03-02]: Summary injected as synthetic user/assistant exchange
- [03-03]: Omnipresent guide personality (calm, knowing, NOT butler)
- [03-03]: Time format as "Friday, 3:45 PM" for natural speech
- [03-03]: Tool graceful degradation with "coming soon" message

### Pending Todos

- [ ] Configure ANTHROPIC_API_KEY in .env.local with real key (required for Claude)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-01 01:48 UTC
Stopped at: Completed 03-03-PLAN.md (Claude Integration)
Resume file: None

## Phase 1 Summary

**Audio Foundation complete.** All 3 plans executed:

1. **01-01**: Jarvis app setup (store, types, page structure)
2. **01-02**: JarvisOrb visualization with state-based colors and audio reactivity
3. **01-03**: MicrophoneCapture, push-to-talk, permission UX

**Key deliverables:**
- `/jarvis` route with full-screen orb visualization
- Push-to-talk interaction (mouse, touch, spacebar)
- Permission explanation UI before browser prompt
- Orb responds to voice amplitude in real-time
- State colors: idle (blue) -> listening (cyan) -> thinking (amber) -> speaking (orange)

## Phase 2 Summary

**Voice Pipeline complete.** All 3 plans executed:

1. **02-01**: Deepgram STT Integration
   - Server-side Deepgram proxy (SSE + POST pattern)
   - DeepgramClient browser class with raw PCM audio

2. **02-02**: Browser TTS Client
   - SpeechClient using Web Speech API
   - AudioPlayer for orb sync

3. **02-03**: Voice Pipeline Orchestration
   - VoicePipeline state machine (idle -> listening -> processing -> speaking)
   - Full echo test verified
   - Fixed STT audio format (webm -> linear16 PCM)

## Phase 3 Summary

**Intelligence Layer complete.** All 3 plans executed:

1. **03-01**: Claude API Integration
   - @anthropic-ai/sdk installed
   - POST /api/jarvis/chat with SSE streaming
   - ClaudeClient browser class for stream parsing

2. **03-02**: Conversation Memory
   - ConversationManager with sliding window (10 messages)
   - MemoryStore for localStorage persistence (summary, key facts)
   - getContextMessages() for Claude API format

3. **03-03**: Claude Integration
   - System prompt with omnipresent guide personality
   - Time awareness via buildSystemPrompt()
   - 5 Notion tool definitions for Phase 4
   - VoicePipeline wired to Claude (replaces echo)
   - Multi-turn conversation context

**Key deliverables:**
- User speaks -> Jarvis responds intelligently (not echo)
- Personality: calm, knowing, warm but not formal
- Time awareness: "It's Friday, 3:45 PM"
- Multi-turn memory: "My name is Jonathan" -> "What's my name?" works
- Tool readiness: "Add a task" -> graceful "coming soon" message

## Ready for Phase 4

Phase 4 (Notion Integration) will:
- Implement actual tool handlers
- Connect to Notion API
- Enable real task/bill/project operations
