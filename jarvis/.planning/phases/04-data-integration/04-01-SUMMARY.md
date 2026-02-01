---
phase: 04-data-integration
plan: 01
subsystem: data
tags: [notion, mcp, typescript, schemas, discovery]

# Dependency graph
requires:
  - phase: 03-intelligence-layer
    provides: Claude integration with tool definitions
provides:
  - MCP client singleton for Notion communication
  - Schema types for all Life OS databases
  - Database discovery utility script
  - Environment configuration for Notion tokens and IDs
affects: [04-02, 04-03, notion-tools]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk@^1.25.3"]
  patterns: ["MCP stdio transport", "JSON-RPC over child_process", "singleton client pattern"]

key-files:
  created:
    - src/lib/jarvis/notion/NotionClient.ts
    - src/lib/jarvis/notion/schemas.ts
    - scripts/discover-notion-databases.ts
  modified:
    - package.json
    - .env.local

key-decisions:
  - "Use child_process.spawn with shell option for Windows compatibility"
  - "Singleton MCP client pattern with lazy initialization"
  - "30-second timeout for MCP requests"
  - "Use API-post-search and API-retrieve-a-database tool names (actual MCP names)"
  - "data_source filter value for Notion API v2025-09-03"

patterns-established:
  - "MCP client: ensureMCPRunning -> callMCPTool -> closeMCPClient lifecycle"
  - "Query builders: buildXxxFilter(options) returning Notion filter structure"
  - "Result formatters: formatXxxResults(result) for speech-friendly output with IDs"
  - "Property constants: XXX_PROPS objects with case-sensitive Notion property names"

# Metrics
duration: 12min
completed: 2026-02-01
---

# Phase 04 Plan 01: MCP Client Infrastructure Summary

**MCP client singleton for Notion integration with stdio transport, schema types for all 5 Life OS databases, and discovery script finding database IDs**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-01T13:26:00Z
- **Completed:** 2026-02-01T13:38:00Z
- **Tasks:** 3
- **Files modified:** 4 (created 3, modified 1)

## Accomplishments

- MCP client communicates with Notion MCP server via stdio transport
- Schema types cover Tasks, Bills, Projects, Goals, and Habits databases
- Discovery script found all 5 Life OS database IDs successfully
- Query builders and result formatters ready for Plan 04-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create MCP client** - `a6b3cda` (feat)
2. **Task 2: Create schema types and query builders** - `b4e6fca` (feat)
3. **Task 3: Create comprehensive database discovery script** - `4d8a935` (feat)

## Files Created/Modified

- `src/lib/jarvis/notion/NotionClient.ts` - MCP client singleton with stdio transport
- `src/lib/jarvis/notion/schemas.ts` - Schema types, query builders, result formatters
- `scripts/discover-notion-databases.ts` - Database discovery utility
- `package.json` - Added discover-notion script
- `.env.local` - Added NOTION_TOKEN and database ID placeholders

## Decisions Made

1. **Windows-compatible spawn**: Used `shell: process.platform === 'win32'` for cross-platform MCP process spawning
2. **Singleton with lazy init**: MCP process only starts when first request is made
3. **Request timeout**: 30 seconds for MCP requests to handle slow network
4. **Correct MCP tool names**: Discovered actual tool names (API-post-search, API-retrieve-a-database) vs documented names
5. **data_source filter**: Notion API v2025-09-03 uses 'data_source' not 'database' for search filters

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed MCP tool names**
- **Found during:** Task 3 (discovery script)
- **Issue:** Research doc showed `notion-search` but actual MCP tool name is `API-post-search`
- **Fix:** Updated discovery script to use correct tool names from MCP server
- **Files modified:** scripts/discover-notion-databases.ts
- **Committed in:** 4d8a935 (Task 3 commit)

**2. [Rule 3 - Blocking] Fixed Notion API filter value**
- **Found during:** Task 3 (discovery script)
- **Issue:** Notion API v2025-09-03 requires `data_source` filter, not `database`
- **Fix:** Updated filter value in discovery script
- **Files modified:** scripts/discover-notion-databases.ts
- **Committed in:** 4d8a935 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both blocking issues)
**Impact on plan:** Fixes were necessary for script to work. No scope creep.

## Issues Encountered

- Discovery script found database IDs but couldn't retrieve detailed schemas because databases aren't shared with the Notion integration yet. This is expected - user needs to share databases in Notion UI before Plan 04-02.

## User Setup Required

**External services require configuration.** The user needs to:

1. **Share databases with Notion integration:**
   - Open each database in Notion (Tasks, Bills, Projects, Goals, Habits)
   - Click "..." > "Connections" > "Add connection"
   - Select the integration

2. **Copy discovered database IDs to .env.local:**
   ```
   NOTION_TASKS_DATA_SOURCE_ID=2f902093-f0b3-81e8-a5bd-000b0fcf5bcb
   NOTION_BILLS_DATA_SOURCE_ID=2f902093-f0b3-81d5-ab21-000b05f7f947
   NOTION_PROJECTS_DATA_SOURCE_ID=2f902093-f0b3-8146-99cc-000bf339a06d
   NOTION_GOALS_DATA_SOURCE_ID=2f902093-f0b3-8173-a34b-000ba2e03fc3
   NOTION_HABITS_DATA_SOURCE_ID=2f902093-f0b3-81a2-9a35-000bfe1ebf20
   ```

3. **Re-run discovery** after sharing to get property schemas:
   ```
   npm run discover-notion
   ```

## Next Phase Readiness

- MCP client ready for tool execution in Plan 04-02
- Schema types ready for query building
- Database IDs discovered, awaiting user to share databases
- Result formatters ready for speech-friendly output

**Blockers:** User must share databases with Notion integration before Plan 04-02 can execute actual queries.

---
*Phase: 04-data-integration*
*Completed: 2026-02-01*
