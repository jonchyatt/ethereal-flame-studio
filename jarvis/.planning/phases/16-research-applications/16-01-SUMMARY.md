---
phase: 16-research-applications
plan: 01
subsystem: api
tags: [mcp-tools, research-library, sub-agents, tool-routing]

requires:
  - phase: 12-foundation-migration
    provides: researchStore CRUD functions, researchEntries schema, toolBridge pattern

provides:
  - 4 research MCP tool definitions (store, search, get_topic, list_topics)
  - Research tool executor routing to researchStore
  - Researcher sub-agent with research library access
  - Research tools available to parent agent via chatProcessor

affects: [16-02, research-intelligence, grant-applications]

tech-stack:
  added: []
  patterns: [research tool executor pattern matching scheduler/toolExecutor.ts]

key-files:
  created:
    - src/lib/jarvis/research/researchTools.ts
    - src/lib/jarvis/research/researchToolExecutor.ts
  modified:
    - src/lib/jarvis/mcp/toolBridge.ts
    - src/lib/jarvis/intelligence/chatProcessor.ts
    - src/lib/jarvis/agents/subAgentRegistry.ts

key-decisions:
  - "Wired into chatProcessor.ts in addition to toolBridge.ts for full routing coverage"
  - "Research tools added to localOnlyTools array (always local, even with MCP Notion enabled)"

patterns-established:
  - "Research tool naming: store_research, search_research, get_research_topic, list_research_topics"
  - "Domain parameter accepts any string (not enum-restricted) for extensibility"

requirements-completed: [RESEARCH-01, RESEARCH-02]

duration: 4min
completed: 2026-03-17
---

# Phase 16 Plan 01: Research MCP Tools Summary

**4 generic research MCP tools (store/search/get/list) wired into toolBridge, chatProcessor, and researcher sub-agent**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T17:24:17Z
- **Completed:** 2026-03-17T17:28:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created 4 research tool definitions following schedulerTools.ts pattern
- Created research tool executor routing to existing researchStore CRUD functions
- Wired tools into both toolBridge (MCP path) and chatProcessor (direct API path)
- Updated researcher sub-agent with research MCP tools + Read capability
- All tools are domain-generic (grant/credit/business/general/any custom domain)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create research tool definitions and executor** - `97a1a5c` (feat)
2. **Task 2: Wire research tools into toolBridge, chatProcessor, and sub-agent** - `68e2a43` (feat)

## Files Created/Modified
- `src/lib/jarvis/research/researchTools.ts` - 4 tool definitions + researchToolNames set
- `src/lib/jarvis/research/researchToolExecutor.ts` - Executor routing to researchStore
- `src/lib/jarvis/mcp/toolBridge.ts` - Added research imports, tool array, routing
- `src/lib/jarvis/intelligence/chatProcessor.ts` - Added research imports, allTools, localOnlyTools, routing
- `src/lib/jarvis/agents/subAgentRegistry.ts` - Researcher agent gets 4 MCP tools + Read

## Decisions Made
- Wired into chatProcessor.ts (not just toolBridge.ts) following the scheduler tools pattern, ensuring research tools work on both MCP and direct API paths
- Research tools added to localOnlyTools so they remain available even when MCP Notion connector is enabled
- Domain parameter is a free-form string, not an enum, for maximum extensibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Wired into chatProcessor.ts**
- **Found during:** Task 2 (wiring)
- **Issue:** Plan only specified toolBridge.ts and subAgentRegistry.ts, but chatProcessor.ts has its own parallel routing (the direct API path)
- **Fix:** Added research imports, tool arrays, and routing to chatProcessor.ts matching the scheduler pattern
- **Files modified:** src/lib/jarvis/intelligence/chatProcessor.ts
- **Verification:** TypeScript build passes, grep confirms all imports and routing present
- **Committed in:** 68e2a43 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correct routing on the direct API path. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Research tools are live and available to both parent agent and researcher sub-agent
- Ready for 16-02 (research prompt engineering and workflow integration)
- Researcher can now: search the web -> store findings -> search/retrieve findings in one session

---
*Phase: 16-research-applications*
*Completed: 2026-03-17*
