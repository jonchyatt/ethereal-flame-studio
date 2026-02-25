---
phase: B-sdk-integration
plan: 01
subsystem: api
tags: [anthropic-sdk, tool-loop, mcp-connector, multi-model]

requires:
  - phase: A-intelligence-audit
    provides: 17 gems inventory, Option D architecture decision
provides:
  - sdkBrain.ts — dedicated tool execution engine
  - chatProcessor.ts refactored to orchestrator pattern
  - Multi-model routing (Haiku/Sonnet)
  - Architecture prepared for Anthropic MCP Connector
affects: [Phase C memory preservation, Phase D self-improvement, Phase E UI]

tech-stack:
  added: []
  patterns: [brain/orchestrator separation, tool executor factory, multi-model routing]

key-files:
  created: [src/lib/jarvis/intelligence/sdkBrain.ts]
  modified: [src/lib/jarvis/intelligence/chatProcessor.ts]

key-decisions:
  - "Claude Code SDK incompatible with Vercel serverless (spawns subprocess)"
  - "Option B selected: Anthropic API + MCP Connector (beta)"
  - "Multi-model: Haiku for CRUD, Sonnet for complex queries when Agent Zero unavailable"

patterns-established:
  - "Brain/orchestrator separation: sdkBrain handles tool loop, chatProcessor handles routing + persistence"
  - "Tool executor factory: createToolExecutor(sessionId) returns a function that routes by tool name"

duration: ~45min
started: 2026-02-25
completed: 2026-02-25
---

# Phase B Plan 01: SDK Integration Summary

**Extracted tool loop into dedicated sdkBrain.ts module with multi-model support, keeping chatProcessor.ts as orchestrator for Agent Zero routing and persistence.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Started | 2026-02-25 |
| Completed | 2026-02-25 |
| Tasks | 3 completed (research + decision + implementation) |
| Files modified | 2 (1 created, 1 refactored) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Brain Module Exists | Pass | sdkBrain.ts exports `think()` returning `BrainResult` |
| AC-2: Tool Execution Works | Pass | 3-way routing preserved via `createToolExecutor()` factory |
| AC-3: SSE Streaming Preserved | Pass | `onToolUse`/`onToolResult` callbacks passed through to brain |
| AC-4: Build Succeeds | Pass | Zero new TS errors (pre-existing local-agent errors unrelated) |

## Accomplishments

- Extracted tool loop from chatProcessor.ts (263 LOC) into sdkBrain.ts (161 LOC) + leaner chatProcessor (168 LOC)
- Added multi-model support: complex queries get Sonnet when Agent Zero is down (was always Haiku before)
- Tool name routing upgraded from Array.includes() to Set.has() (O(1) lookup)
- Architecture prepared for Anthropic MCP Connector integration (when SDK updated)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/intelligence/sdkBrain.ts` | Created | Dedicated tool execution engine — `think()` function handles Claude API calls, tool loop, parallel execution, retry |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Refactored | Now an orchestrator: Agent Zero routing, tool executor factory, persistence, summarization triggers. Delegates tool loop to sdkBrain |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Claude Code SDK is incompatible with Vercel | SDK spawns subprocess, needs persistent JSONL, MCP servers also spawn subprocesses. Confirmed via GitHub issues and Vercel docs. | Eliminated Option A entirely |
| Option B: Anthropic API + MCP Connector | Zero subprocess overhead, works in serverless, Anthropic handles MCP server-side. Beta but stable enough. | Future Phase: upgrade `@anthropic-ai/sdk` and add `mcp_servers` param |
| Multi-model routing | Complex queries deserve a stronger model. When Agent Zero is down, Sonnet handles analysis/planning instead of forcing Haiku. | Better fallback quality for complex queries |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 1 | Logged below |

**Total impact:** Plan executed as written. One deferred item.

### Deferred Items

- **MCP Connector activation**: Requires upgrading `@anthropic-ai/sdk` from `0.72.1` to latest and setting up Notion OAuth (hosted MCP server uses OAuth, not bearer token). Deferred to Phase C or later when MCP is needed.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Pre-existing build errors in `local-agent` routes | Unrelated to brain swap. Missing modules (`@/lib/leases`, `@/lib/local-agent/auth`). Left as-is. |

## Next Phase Readiness

**Ready:**
- sdkBrain.ts is the clean integration point for future upgrades (MCP Connector, model changes, new tool types)
- chatProcessor.ts orchestrator pattern makes it easy to add new routing logic
- All 17 intelligence gems confirmed untouched

**Concerns:**
- `@anthropic-ai/sdk` version 0.72.1 is old — will need upgrade for MCP Connector beta features
- Notion OAuth setup needed for hosted MCP server (current bearer token works with direct SDK only)

**Blockers:** None

---
*Phase: B-sdk-integration, Plan: 01*
*Completed: 2026-02-25*
