# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** Phase 4 - Data Integration (IN PROGRESS)

## Current Position

Phase: 4 of 6 (Data Integration)
Plan: 1 of 3 in current phase (COMPLETE)
Status: Plan 04-01 complete, ready for 04-02
Last activity: 2026-02-01 - Completed 04-01-PLAN.md (MCP client infrastructure)

Progress: [###########-] 58% (9/15 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 9 min
- Total execution time: 81 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-audio-foundation | 3/3 | 27 min | 9 min |
| 02-voice-pipeline | 3/3 | 25 min | 8 min |
| 03-intelligence-layer | 3/3 | 18 min | 6 min |
| 04-data-integration | 1/3 | 12 min | 12 min |

**Recent Trend:**
- Last 5 plans: 03-01 (7 min), 03-02 (3 min), 03-03 (8 min), 04-01 (12 min)
- Trend: Integration work, MCP setup slightly longer due to API discovery

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
- [04-01]: MCP client singleton with lazy initialization
- [04-01]: 30-second timeout for MCP requests
- [04-01]: Windows-compatible spawn with shell option
- [04-01]: Use actual MCP tool names (API-post-search, API-retrieve-a-database)
- [04-01]: data_source filter for Notion API v2025-09-03

### Pending Todos

- User must share databases with Notion integration before Plan 04-02
- Copy discovered database IDs to .env.local

### Blockers/Concerns

- **Notion database sharing**: User needs to share Tasks, Bills, Projects, Goals, Habits databases with the Notion integration before queries will work.

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 04-01-PLAN.md
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

## Phase 4 Progress

**Data Integration in progress.** Plan 04-01 complete:

1. **04-01**: MCP Client Infrastructure (COMPLETE)
   - @modelcontextprotocol/sdk installed
   - NotionClient.ts with stdio transport singleton
   - Schema types for Tasks, Bills, Projects, Goals, Habits
   - Discovery script found all 5 database IDs
   - Query builders and result formatters ready

**Discovered database IDs:**
- Tasks: `2f902093-f0b3-81e8-a5bd-000b0fcf5bcb`
- Bills: `2f902093-f0b3-81d5-ab21-000b05f7f947`
- Projects: `2f902093-f0b3-8146-99cc-000bf339a06d`
- Goals: `2f902093-f0b3-8173-a34b-000ba2e03fc3`
- Habits: `2f902093-f0b3-81a2-9a35-000bfe1ebf20`

**Next:** Plan 04-02 will implement read operations (query_tasks, query_bills, etc.)
