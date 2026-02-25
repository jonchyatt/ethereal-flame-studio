---
phase: C-memory-preservation
plan: 01
subsystem: intelligence
tags: [mcp-connector, post-hooks, gem-relocation, sdk-upgrade, notion-mcp]

requires:
  - phase: B-sdk-integration
    provides: sdkBrain.ts tool execution engine, chatProcessor.ts orchestrator
provides:
  - MCP Connector path for Notion (feature-flagged)
  - Post-tool-result hook system for intelligence gem relocation
  - Recurring task hook extracted as standalone module (Gem #13)
  - System prompt enrichment for search-before-act and recurring task awareness
affects: [Phase D self-improvement, Phase E UI, Phase G integration]

tech-stack:
  added: []
  upgraded: ["@anthropic-ai/sdk 0.72.1 → 0.78.0"]
  patterns: [dual-path brain (local/MCP), post-tool-result hooks, gem relocation to prompts]

key-files:
  created: [src/lib/jarvis/notion/recurringHook.ts]
  modified:
    - package.json
    - src/lib/jarvis/config.ts
    - src/lib/jarvis/intelligence/sdkBrain.ts
    - src/lib/jarvis/intelligence/chatProcessor.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts

key-decisions:
  - "MCP beta string: 'mcp-client-2025-04-04' (from SDK 0.78.0 type definitions)"
  - "Dual-path architecture: thinkLocal() preserves Phase B exactly, thinkWithMcp() adds MCP"
  - "Gem #13 extracted to notion/recurringHook.ts as standalone module (not removed from toolExecutor.ts)"
  - "Post-hook is fire-and-forget: errors logged, never block response"

patterns-established:
  - "Post-tool-result hook pattern: onPostToolResult fires after every tool (MCP or local)"
  - "MCP tool routing: Notion tools via MCP server, memory/tutorial tools stay local"
  - "Gem relocation strategy: extract to hooks + enrich system prompt"

duration: ~30min
started: 2026-02-25
completed: 2026-02-25
---

# Phase C Plan 01: Memory & Intelligence Preservation Summary

**Wired Notion MCP Connector behind feature flag, relocated Gem #13 (recurring tasks) to post-hook layer, enriched system prompt with search-before-act intelligence.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-02-25 |
| Completed | 2026-02-25 |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files modified | 5 (1 created, 4 modified, 1 package.json) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: SDK Upgraded | Pass | `@anthropic-ai/sdk` 0.72.1 → 0.78.0 (latest stable) |
| AC-2: MCP Connector Wired | Pass | `thinkWithMcp()` uses `beta.messages.create()` with `mcp_servers` param |
| AC-3: Post-Hook Layer Works | Pass | `onPostToolResult` fires after every tool, `createPostToolHook()` detects task completion → recurring hook |
| AC-4: System Prompt Enriched | Pass | NOTION INTEGRATION section with 4 guidance lines |
| AC-5: Build Passes | Pass | Zero new TS errors (21 pre-existing local-agent errors unchanged) |

## Accomplishments

- Split `think()` into dual-path: `thinkLocal()` (Phase B behavior, unchanged) and `thinkWithMcp()` (Notion via MCP Connector)
- Added `onPostToolResult` hook to `BrainRequest` — fire-and-forget, errors never block response
- Extracted Gem #13 (recurring task auto-creation) to `notion/recurringHook.ts` as standalone module
- `chatProcessor.ts` now passes only local tools (memory/tutorial) when MCP enabled — Notion tools come from MCP server
- System prompt teaches Claude to search before acting and be aware of recurring tasks
- SDK upgraded to 0.78.0 with full MCP Connector beta type support

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `package.json` | Modified | SDK `^0.72.1` → `^0.78.0` |
| `src/lib/jarvis/config.ts` | Modified | 3 new fields: `enableMcpConnector`, `notionMcpUrl`, `notionOAuthToken` with env var readers |
| `src/lib/jarvis/intelligence/sdkBrain.ts` | Modified | Dual-path brain: `thinkLocal()` + `thinkWithMcp()`, post-hook system (161→295 LOC) |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Modified | MCP-aware tool routing, `createPostToolHook()` for recurring task detection |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | NOTION INTEGRATION section (4 lines of search/recurring guidance) |
| `src/lib/jarvis/notion/recurringHook.ts` | Created | Gem #13 relocated as standalone exportable hook |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Dual-path architecture (not in-place replacement) | `thinkLocal()` is the exact Phase B code — zero risk of regression when MCP is off | Safe rollout, easy to verify |
| Extract Gem #13 to separate module (not remove from toolExecutor) | toolExecutor still calls it for local path; recurringHook.ts also callable from post-hook | Both paths work |
| MCP beta string `mcp-client-2025-04-04` | Confirmed from SDK 0.78.0 type definitions (`AnthropicBeta` union type) | Correct beta header |
| Post-hook is fire-and-forget | Recurring task creation is best-effort — must never block user's chat response | Resilient UX |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minor — see below |
| Scope additions | 1 | Minor — see below |
| Deferred | 0 | None |

**Auto-fixed:** Plan specified beta string `mcp-client-2025-11-20`, but SDK 0.78.0 types show `mcp-client-2025-04-04`. Used the correct one from the SDK.

**Scope addition:** Created `notion/recurringHook.ts` as a new file (plan said to add hook in chatProcessor). Cleaner architecture — the hook logic is reusable and testable independently.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Pre-existing build errors in `local-agent` routes | Same as Phase B — unrelated to our work |

## Next Phase Readiness

**Ready:**
- MCP Connector is fully wired and type-safe behind feature flag
- Post-hook system is extensible — add more hooks without touching sdkBrain
- System prompt can be enriched further for new gems
- To activate MCP: set `JARVIS_ENABLE_MCP=true` and `NOTION_OAUTH_TOKEN=<token>` in Vercel env

**Concerns:**
- Notion OAuth token setup needed (different from current integration token)
- MCP Connector is still Anthropic beta — may change
- `thinkWithMcp()` not yet tested against live Notion MCP server (feature flag off by default)

**Blockers:** None

---
*Phase: C-memory-preservation, Plan: 01*
*Completed: 2026-02-25*
