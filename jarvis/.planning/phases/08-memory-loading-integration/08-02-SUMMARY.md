---
phase: 08-memory-loading-integration
plan: 02
subsystem: memory-integration
tags: [feature-flag, system-prompt, chat-api]
dependency-graph:
  requires: [08-01]
  provides: [memory-injection, feature-controlled-memory]
  affects: [08-03]
tech-stack:
  added: []
  patterns: [feature-flag, server-side-prompt-building, graceful-degradation]
key-files:
  created:
    - src/lib/jarvis/config.ts
  modified:
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/app/api/jarvis/chat/route.ts
decisions:
  - feature-flag-default: "Memory loading disabled by default for safe rollout"
  - server-side-prompt: "System prompt built on server, never exposing memories to client"
  - graceful-degradation: "Memory loading errors logged but don't break chat"
metrics:
  duration: 4m
  completed: 2026-02-02
---

# Phase 08 Plan 02: Memory Integration into Voice Pipeline Summary

Feature-flagged memory loading with server-side system prompt building.

## What Was Built

### Feature Flag Configuration (`src/lib/jarvis/config.ts`)

Centralized configuration for controlled rollout:

```typescript
interface JarvisConfig {
  enableMemoryLoading: boolean;  // JARVIS_ENABLE_MEMORY env var
  memoryTokenBudget: number;     // JARVIS_MEMORY_TOKEN_BUDGET (default: 1000)
  maxMemories: number;           // JARVIS_MAX_MEMORIES (default: 10)
}
```

Memory loading is disabled by default (`enableMemoryLoading: false`). Enable via:
```env
JARVIS_ENABLE_MEMORY=true
```

### Enhanced System Prompt (`src/lib/jarvis/intelligence/systemPrompt.ts`)

Updated `SystemPromptContext` interface:
```typescript
interface SystemPromptContext {
  currentTime: Date;
  userName?: string;
  keyFacts?: string[];
  memoryContext?: string;  // NEW: from database
}
```

When `memoryContext` is provided:
1. Memory context injected into CURRENT CONTEXT section
2. MEMORY CONTEXT guidance section added with natural reference instructions

When `memoryContext` is undefined:
- Output is identical to v1 (backward compatible)

### Chat API with Memory Loading (`src/app/api/jarvis/chat/route.ts`)

Flow when `JARVIS_ENABLE_MEMORY=true`:
1. Load config via `getJarvisConfig()`
2. Call `retrieveMemories()` with token/entry budgets
3. Format memories with `formatMemoriesForPrompt()`
4. Build system prompt server-side with `buildSystemPrompt({ memoryContext })`
5. Pass `serverSystemPrompt` to Claude API

Error handling:
- Memory loading errors are caught and logged
- Chat continues without memories (graceful degradation)
- User experience unaffected by memory system failures

## Key Changes

| Component | Before | After |
|-----------|--------|-------|
| System prompt source | Client-provided | Server-built |
| Memory context | None | Loaded from database when enabled |
| Error handling | N/A | Graceful degradation |
| Feature control | None | Environment variable flag |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| Feature flag controls memory loading | Yes - `JARVIS_ENABLE_MEMORY` |
| When enabled, memories fetched from DB | Yes - via `retrieveMemories()` |
| Memory context passed to `buildSystemPrompt()` | Yes - server-side |
| Claude receives natural reference guidance | Yes - MEMORY CONTEXT section |
| Errors don't break chat | Yes - catch/log/continue |
| Flag off matches v1 exactly | Yes - `memoryContext` is undefined |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/jarvis/config.ts` | Created (34 lines) |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Added memoryContext support (+18 lines) |
| `src/app/api/jarvis/chat/route.ts` | Added memory loading (+32 lines) |

## Commits

| Hash | Message |
|------|---------|
| 4400f65 | feat(08-02): create Jarvis feature flag configuration |
| b1dfb96 | feat(08-02): enhance system prompt to include memory context |
| 71aa3c8 | feat(08-02): load memories in chat API and build system prompt server-side |

## Usage

**Enable memory loading:**
```env
# .env.local
JARVIS_ENABLE_MEMORY=true
JARVIS_MEMORY_TOKEN_BUDGET=1000
JARVIS_MAX_MEMORIES=10
```

**Verify in logs:**
```
[Chat] Loaded 5 memories (247 tokens)
```

## Next Steps

Plan 08-03 will add memory persistence, extracting and storing facts from conversations automatically.
