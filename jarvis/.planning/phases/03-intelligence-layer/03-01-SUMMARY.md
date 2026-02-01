---
phase: 03-intelligence-layer
plan: 01
subsystem: api
tags: [claude, anthropic, sse, streaming, ai]

# Dependency graph
requires:
  - phase: 02-voice-pipeline
    provides: VoicePipeline state machine, echo mode for testing
provides:
  - Claude API streaming route at /api/jarvis/chat
  - ClaudeClient browser class for SSE parsing
  - SSE streaming pattern for low-latency AI responses
affects: [03-02, 03-03, voice-pipeline-integration]

# Tech tracking
tech-stack:
  added: [@anthropic-ai/sdk ^0.72.1]
  patterns: [SSE streaming proxy, callback-based stream parsing]

key-files:
  created:
    - src/app/api/jarvis/chat/route.ts
    - src/lib/jarvis/intelligence/ClaudeClient.ts
  modified:
    - package.json

key-decisions:
  - "claude-haiku-4-5 model for fast TTFT (~360ms)"
  - "SSE streaming matches existing STT pattern"
  - "Error events via SSE (type: error) for graceful handling"
  - "AbortController for cancellation support"

patterns-established:
  - "SSE API route pattern: ReadableStream + TextEncoder for events"
  - "Browser SSE client pattern: fetch + TextDecoder + line parsing"
  - "Chat callbacks: onToken, onComplete, onError"

# Metrics
duration: 7min
completed: 2026-02-01
---

# Phase 3 Plan 1: Claude API Integration Summary

**Claude API streaming with SSE proxy route and browser ClaudeClient for low-latency conversational AI**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-01T01:30:46Z
- **Completed:** 2026-02-01T01:37:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Installed Anthropic TypeScript SDK (@anthropic-ai/sdk ^0.72.1)
- Created POST /api/jarvis/chat endpoint with SSE streaming
- Created ClaudeClient browser class with callback-based stream parsing
- API key stays server-side (never exposed to browser)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Anthropic SDK** - `294a33d` (chore)
2. **Task 2: Create Claude API streaming route** - `4e6c539` (feat)
3. **Task 3: Create browser ClaudeClient** - `97ce8ab` (feat)

## Files Created/Modified
- `package.json` - Added @anthropic-ai/sdk dependency
- `src/app/api/jarvis/chat/route.ts` - SSE streaming proxy to Claude API
- `src/lib/jarvis/intelligence/ClaudeClient.ts` - Browser client for chat API

## Decisions Made
- **Model choice:** claude-haiku-4-5-20250514 for fastest TTFT within 300ms latency budget
- **SSE event format:** `data: {"type":"text","text":"..."}` for tokens, `{"type":"done"}` for completion
- **Error handling:** Errors sent as SSE events (type: "error") rather than HTTP errors, allows graceful degradation
- **Abort handling:** AbortError not treated as error (no onError callback), clean cancellation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript compilation check with `npx tsc --noEmit [file]` failed on SDK type definitions (private identifier ES version mismatch) - resolved by running full project compilation with tsconfig

## User Setup Required

**External services require manual configuration:**

1. Add ANTHROPIC_API_KEY to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your-key-from-console.anthropic.com
   ```

2. Get key from: https://console.anthropic.com/

3. Verify with:
   ```bash
   npm run dev
   curl -X POST http://localhost:3000/api/jarvis/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"systemPrompt":"Be brief."}'
   ```
   Should receive SSE stream with text tokens.

## Next Phase Readiness
- Claude API integration ready for VoicePipeline integration
- ClaudeClient can replace echo mode in responseGenerator
- Ready for 03-02: Conversation Memory

---
*Phase: 03-intelligence-layer*
*Completed: 2026-02-01*
