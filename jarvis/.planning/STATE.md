# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** Phase 5 - Executive Function Core (IN PROGRESS)

## Current Position

Phase: 5 of 6 (Executive Function Core) - COMPLETE
Plan: 3 of 3 in current phase (ALL COMPLETE)
Status: Phase 5 verified and complete, ready for Phase 6
Last activity: 2026-02-02 - Completed 05-03-PLAN.md (Dashboard UI)

Progress: [##############] 100% (15/15 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 9 min
- Total execution time: 134 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-audio-foundation | 3/3 | 27 min | 9 min |
| 02-voice-pipeline | 3/3 | 25 min | 8 min |
| 03-intelligence-layer | 3/3 | 18 min | 6 min |
| 04-data-integration | 3/3 | 31 min | 10 min |
| 05-executive-function-core | 3/3 | 32 min | 11 min |

**Recent Trend:**
- Last 5 plans: 04-02 (8 min), 04-03 (11 min), 05-01 (12 min), 05-02 (10 min), 05-03 (10 min)
- Trend: Phase 5 executive function complete

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
- [04-02]: Non-streaming Claude calls for tool loop, streaming only for final response
- [04-02]: Parallel tool execution with Promise.all
- [04-02]: MAX_TOOL_ITERATIONS = 5 to prevent infinite loops
- [04-02]: tool_result blocks must come FIRST in user message content
- [04-03]: In-memory cache acceptable for serverless (works within tool loop)
- [04-03]: Fuzzy match priority: exact > starts-with > contains > reverse-contains
- [04-03]: 5-minute TTL for cached results
- [04-03]: Title-to-ID resolution enables natural voice commands
- [05-01]: date-fns for date manipulation (lightweight, tree-shakeable)
- [05-01]: Client-side scheduler with localStorage persistence
- [05-01]: Background tab visibility handling for missed events
- [05-01]: Calendar events derived from tasks with due times (no separate calendar tool)
- [05-01]: BriefingFlow uses Promise-returning speak() for await support
- [05-01]: Orb is primary tap target per CONTEXT.md
- [05-03]: Zustand persist for dashboard section visibility
- [05-03]: Mobile drawer from right with backdrop for orb visibility
- [05-03]: triggerDashboardRefresh via setTimeout after Notion writes
- [05-03]: Dashboard beside orb, not over it - responsive layout pattern
- [05-02]: Web Audio API for generated chime (no external MP3 dependency)
- [05-02]: BriefingClient wrapper to fix server/client module boundary issue
- [05-02]: 10-second auto-dismiss timeout for skippable check-ins

### Pending Todos

- None

### Blockers/Concerns

- None currently

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 05-03-PLAN.md
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

## Phase 4 Summary

**Data Integration complete.** All 3 plans executed:

1. **04-01**: MCP Client Infrastructure
   - @modelcontextprotocol/sdk installed
   - NotionClient.ts with stdio transport singleton
   - Schema types for Tasks, Bills, Projects, Goals, Habits
   - Discovery script found all 5 database IDs
   - Query builders and result formatters ready

2. **04-02**: Tool Execution Loop
   - toolExecutor.ts routes all 5 read operations to MCP
   - Chat route executes tools in loop until final text response
   - 10 tool definitions (5 read + 5 write)
   - All read operations verified working end-to-end

3. **04-03**: Write Operations
   - create_task: creates task with title, due date, priority
   - update_task_status: marks complete/in-progress/to-do
   - mark_bill_paid: marks bill as paid
   - pause_task: sets status to On Hold with optional resume date
   - add_project_item: creates task linked to project
   - Recent results cache for voice item identification
   - Fuzzy title matching for natural commands

**Discovered database IDs:**
- Tasks: `2f902093-f0b3-81e8-a5bd-000b0fcf5bcb`
- Bills: `2f902093-f0b3-81d5-ab21-000b05f7f947`
- Projects: `2f902093-f0b3-8146-99cc-000bf339a06d`
- Goals: `2f902093-f0b3-8173-a34b-000ba2e03fc3`
- Habits: `2f902093-f0b3-81a2-9a35-000bfe1ebf20`

**All 10 Notion tools working:**
- Read (5): query_tasks, query_bills, query_projects, query_goals, query_habits
- Write (5): create_task, update_task_status, mark_bill_paid, pause_task, add_project_item

## Phase 5 Summary (COMPLETE)

**Executive Function Core complete.** All 3 plans executed:

1. **05-01**: Morning Briefing Infrastructure
   - Scheduler class with localStorage persistence
   - BriefingBuilder aggregates Notion data in parallel
   - BriefingFlow state machine for section-by-section walkthrough
   - VoicePipeline.speak() for proactive speech
   - Orb tappable for voice activation

2. **05-02**: Check-ins and Nudges
   - NudgeManager with Web Audio chime and visual delivery
   - CheckInManager for midday/evening check-in flows
   - NudgeOverlay component for subtle visual indicator
   - BriefingClient wrapper for client-side API access
   - /api/jarvis/briefing route for server-side Notion access

3. **05-03**: Dashboard UI
   - dashboardStore with zustand persist for section visibility
   - PriorityIndicator component (overdue/urgent/deadline_near/needs_attention)
   - Dashboard section components: TasksList, BillsSummary, HabitProgress, CalendarEvents
   - DashboardPanel with responsive layout (desktop sidebar, mobile drawer)
   - Auto-refresh after Notion write operations
   - 5-minute periodic refresh as backup

**Key deliverables:**
- Scheduler triggers events at scheduled times (08:00 morning, 12:00 midday, 17:00 evening)
- BriefingBuilder queries tasks, bills, habits, goals in parallel
- Calendar events derived from tasks with due times
- BriefingFlow presents outline first, then section-by-section
- NudgeManager surfaces timely reminders
- CheckInManager enables midday/evening reviews
- Dashboard displays tasks, calendar, habits, bills beside the orb
- Priority indicators highlight overdue/urgent items
- Dashboard refreshes automatically after voice command completes task

**Phase verified:** All 9/9 must-haves confirmed in codebase
**Verification report:** .planning/phases/05-executive-function-core/05-VERIFICATION.md

**Next:** Phase 6 (Advanced Executive Function) or manual acceptance testing
