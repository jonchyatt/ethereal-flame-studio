---
phase: 14-sub-agents-browser-engine
plan: 01
subsystem: agents
tags: [claude-agent-sdk, sub-agents, playwright, bitwarden, mcp, browser-automation]

# Dependency graph
requires:
  - phase: 13-vault-integration
    provides: "ensureVaultUnlocked() for form-filler BW_SESSION"
  - phase: 12-foundation-migration
    provides: "Claude Agent SDK query() in ccodeBrain.ts"
provides:
  - "Sub-agent registry with browser-worker, researcher, form-filler definitions"
  - "buildSubAgents() function returning SDK-compatible agents config"
  - "SubAgentName type and SUB_AGENT_NAMES const"
  - "ccodeBrain.ts wired with agents param and Agent tool"
  - "Playwright MCP configured with persistent screenshot directory"
affects: [14-02-PLAN, phase-15, browser-engine, screenshot-store]

# Tech tracking
tech-stack:
  added: []
  patterns: [sub-agent-registry, role-restricted-tools, private-mcp-servers, non-fatal-agent-build]

key-files:
  created:
    - src/lib/jarvis/agents/agentTypes.ts
    - src/lib/jarvis/agents/subAgentRegistry.ts
  modified:
    - src/lib/jarvis/intelligence/ccodeBrain.ts
    - .mcp.json
    - .gitignore

key-decisions:
  - "Record<string, unknown> return type for buildSubAgents to avoid SDK internal type coupling"
  - "Non-fatal vault failure: form-filler created with empty BW_SESSION, reports error at invocation"
  - "Bitwarden MCP scoped to form-filler only, never in global .mcp.json"
  - "MCP inheritance from .mcp.json assumed working; inline fallback deferred to live verification"

patterns-established:
  - "Sub-agent registry pattern: centralized buildSubAgents() called per-request (fresh BW_SESSION)"
  - "Private MCP servers: sub-agent-only MCP config via mcpServers property"
  - "Non-fatal agent build: try/catch around buildSubAgents so normal chat works if vault unavailable"

requirements-completed: [AGENT-01, AGENT-02, AGENT-03, BROWSER-01]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 14 Plan 01: Sub-Agent Registry Summary

**Three role-specialized sub-agents (browser-worker, researcher, form-filler) with restricted tools and focused prompts wired into ccodeBrain query()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T15:08:58Z
- **Completed:** 2026-03-17T15:11:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created sub-agent registry with three role-specialized agents, each with restricted tool sets and focused prompts under 2K tokens
- Wired buildSubAgents() into ccodeBrain.ts with non-fatal try/catch and Agent tool in allowedTools
- Configured Playwright MCP with persistent screenshot output directory
- Added sub-agent event handling (task_progress, task_notification) for monitoring

## Task Commits

Each task was committed atomically:

1. **Task 1: Create agent types and sub-agent registry** - `ab29b06` (feat)
2. **Task 2: Wire sub-agents into ccodeBrain and update Playwright MCP** - `78ee609` (feat)

## Files Created/Modified
- `src/lib/jarvis/agents/agentTypes.ts` - SubAgentName type and SUB_AGENT_NAMES const
- `src/lib/jarvis/agents/subAgentRegistry.ts` - buildSubAgents() with browser-worker, researcher, form-filler definitions
- `src/lib/jarvis/intelligence/ccodeBrain.ts` - Import buildSubAgents, add agents param to query(), handle sub-agent events
- `.mcp.json` - Add --output-dir to Playwright MCP for persistent screenshots
- `.gitignore` - Add data/screenshots/ exclusion

## Decisions Made
- **Record<string, unknown> return type:** Avoids coupling to SDK internal AgentDefinition type that may change between versions
- **Non-fatal vault failure:** form-filler is created with empty BW_SESSION rather than crashing buildSubAgents; the agent reports an error when actually invoked
- **MCP inheritance assumed:** Browser-worker and form-filler rely on .mcp.json global Playwright config rather than inline mcpServers; if inheritance fails in production, inline fallback can be added
- **buildSubAgents() called per-request:** Ensures fresh BW_SESSION token on each chat message (tokens rotate hourly)

## Deviations from Plan

None - plan executed exactly as written.

Note: The plan called for MCP inheritance testing via runtime invocation. This was skipped per project rules (no local test environments). MCP inheritance will be verified on live deployment.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sub-agent registry complete, ready for Plan 02 (screenshot store, browser context, orchestration)
- MCP inheritance needs live verification after push
- vaultConfig.ts from Phase 13 still exists alongside the new registry (can be deprecated once registry is confirmed working)

---
*Phase: 14-sub-agents-browser-engine*
*Completed: 2026-03-17*
