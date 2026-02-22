---
phase: 11-production-deployment
plan: 02
subsystem: api-security
tags: [authentication, middleware, security, api]
dependency-graph:
  requires: []
  provides: [api-authentication, authenticated-fetch]
  affects: [11-03, 11-04, 11-05]
tech-stack:
  added: []
  patterns: [middleware-auth-gate, fetch-wrapper]
key-files:
  created:
    - src/lib/jarvis/api/fetchWithAuth.ts
  modified:
    - src/middleware.ts
    - src/lib/jarvis/voice/SpeechClient.ts
    - src/lib/jarvis/voice/DeepgramClient.ts
    - src/lib/jarvis/executive/BriefingClient.ts
    - src/lib/jarvis/intelligence/ClaudeClient.ts
decisions:
  - id: auth-header-name
    choice: X-Jarvis-Secret
    rationale: Standard custom header pattern for API auth
  - id: sse-auth-fallback
    choice: Query parameter _secret
    rationale: EventSource API does not support custom headers
  - id: dev-mode-auth
    choice: Optional when JARVIS_API_SECRET not set
    rationale: Allow local development without configuring secrets
metrics:
  duration: "10 minutes"
  completed: "2026-02-03"
---

# Phase 11 Plan 02: API Authentication Summary

**One-liner:** X-Jarvis-Secret header validation in middleware with authenticated fetch wrapper for all client-side API calls

## What Was Built

### 1. Middleware Authentication Gate (src/middleware.ts)
- Added `validateJarvisAuth()` function to check X-Jarvis-Secret header
- Validates all `/api/jarvis/*` requests before they reach API routes
- Returns 401 Unauthorized for missing/invalid secrets
- Supports `_secret` query parameter as fallback for SSE connections (EventSource limitation)
- Development mode allows unauthenticated requests when secret not configured

### 2. Authenticated Fetch Wrapper (src/lib/jarvis/api/fetchWithAuth.ts)
Created comprehensive fetch wrapper with these exports:
- `fetchJarvisAPI()` - Generic authenticated fetch
- `getJarvisAPI()` - GET requests
- `postJarvisAPI()` - POST with JSON body
- `patchJarvisAPI()` - PATCH with JSON body
- `deleteJarvisAPI()` - DELETE requests
- `postBinaryJarvisAPI()` - POST with binary data (for audio streaming)
- `buildSSEUrl()` - Build authenticated EventSource URLs

All wrappers automatically include:
- `X-Jarvis-Secret` header (from NEXT_PUBLIC_JARVIS_SECRET env var)
- `X-Timezone` header (for date boundary handling)

### 3. Updated Client Files
All direct fetch() calls to /api/jarvis/* were replaced with authenticated wrappers:

| File | API Endpoint | Wrapper Used |
|------|--------------|--------------|
| SpeechClient.ts | /api/jarvis/tts | postJarvisAPI |
| DeepgramClient.ts | /api/jarvis/stt | buildSSEUrl, postBinaryJarvisAPI, deleteJarvisAPI |
| BriefingClient.ts | /api/jarvis/briefing | getJarvisAPI |
| ClaudeClient.ts | /api/jarvis/chat | fetchJarvisAPI |

## Decisions Made

1. **Header name: X-Jarvis-Secret**
   - Standard custom header pattern
   - Clear naming convention
   - Easy to add via headers object

2. **SSE fallback: Query parameter**
   - EventSource API limitation: no custom headers
   - Solution: `_secret` query parameter
   - Middleware checks both header and query param

3. **Development mode: Optional auth**
   - When JARVIS_API_SECRET not set in dev mode, allow requests
   - Logs warning to console
   - Production always requires secret

## Environment Variables Required

For Vercel deployment:
```
JARVIS_API_SECRET=<random-string>
NEXT_PUBLIC_JARVIS_SECRET=<same-value>
```

Generate with: `openssl rand -hex 32`

## Verification

1. Middleware validates X-Jarvis-Secret on /api/jarvis/* routes
2. fetchWithAuth.ts exports all required helpers
3. All client-side API calls use authenticated fetch
4. Development mode works without secret set

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 5b44f36 | feat(11-02): add API authentication to middleware |
| 3fd225d | feat(11-02): create authenticated fetch wrapper |
| 1222a85 | feat(11-02): update API calls to use authenticated fetch |

## Next Phase Readiness

Ready for:
- 11-03: Rate limiting (builds on middleware pattern)
- 11-04: Error boundaries (can use authenticated fetch)
- 11-05: Production deployment (needs env vars configured)
