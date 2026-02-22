---
phase: 11
plan: 01
subsystem: notion-integration
tags: [notion, sdk, vercel, serverless, api]
depends_on:
  requires: []
  provides: ["Direct Notion SDK client", "Vercel-compatible Notion integration"]
  affects: ["11-02", "11-03", "11-04", "11-05", "11-06"]
tech-stack:
  added: ["@notionhq/client ^5.9.0"]
  patterns: ["Singleton client pattern", "Direct SDK over MCP"]
key-files:
  created:
    - src/lib/jarvis/notion/NotionClient.mcp.ts
  modified:
    - src/lib/jarvis/notion/NotionClient.ts
    - src/lib/jarvis/notion/toolExecutor.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - scripts/discover-notion-databases.ts
    - package.json
decisions:
  - id: "11-01-01"
    decision: "Use @notionhq/client Direct SDK instead of MCP spawn"
    rationale: "child_process.spawn() breaks Vercel serverless functions"
  - id: "11-01-02"
    decision: "Park MCP code in NotionClient.mcp.ts for future MacBook daemon"
    rationale: "Preserve MCP implementation for local development use case"
  - id: "11-01-03"
    decision: "Use dataSources.query() for database queries"
    rationale: "Notion SDK v5 API change - databases.query replaced by dataSources.query"
  - id: "11-01-04"
    decision: "Add type flexibility for backward compatibility"
    rationale: "Allow Record<string, unknown> to maintain existing schema code"
metrics:
  duration: "~15 minutes"
  completed: "2026-02-02"
---

# Phase 11 Plan 01: Notion SDK Migration Summary

Direct SDK client for Vercel serverless deployment - replaced MCP spawn with @notionhq/client

## One-liner

Replaced MCP-based Notion integration with Direct SDK to eliminate child_process dependency for Vercel serverless

## Changes Made

### Task 1: Install Notion SDK and Park MCP Code
**Commit:** d51590b

- Installed @notionhq/client ^5.9.0 dependency
- Created NotionClient.mcp.ts with parked MCP implementation
- Added header comment marking it for future MacBook daemon integration

### Task 2: Rewrite NotionClient.ts with Direct SDK
**Commit:** 26dde19

- Replaced child_process spawn with direct @notionhq/client usage
- Implemented singleton pattern for client reuse
- Exported functions: queryDatabase, createPage, updatePage, retrievePage, searchNotion
- Used dataSources.query() for database queries (SDK v5 API)

### Task 3: Update Dependent Files
**Commit:** 204828c

- Updated toolExecutor.ts to import from new NotionClient
- Updated BriefingBuilder.ts to use direct queryDatabase
- Fixed discover-notion-databases.ts for SDK v5 compatibility
- Added type flexibility for backward compatibility with existing schemas

## Technical Details

### API Changes (SDK v5)

| Old MCP Tool | New SDK Method |
|--------------|----------------|
| API-query-data-source | client.dataSources.query() |
| API-post-page | client.pages.create() |
| API-patch-page | client.pages.update() |

### Type Compatibility

The existing `NotionFilter` type from schemas.ts was incompatible with SDK types. Solved by:
1. Accepting union types in function signatures
2. Type casting at SDK call site
3. Runtime validation by Notion API

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated BriefingBuilder.ts**
- **Found during:** Task 3
- **Issue:** BriefingBuilder.ts also imported callMCPTool, causing build failure
- **Fix:** Updated import and queryNotionRaw function to use direct SDK
- **Files modified:** src/lib/jarvis/executive/BriefingBuilder.ts

**2. [Rule 2 - Missing Critical] Updated discover-notion-databases.ts**
- **Found during:** Task 3
- **Issue:** Script imported MCP functions and used 'database' object type (now 'data_source')
- **Fix:** Rewrote to use direct SDK with correct SDK v5 types
- **Files modified:** scripts/discover-notion-databases.ts

## Verification Results

- `npm run build` completed successfully (no child_process error)
- NotionClient.ts exports: queryDatabase, createPage, updatePage, retrievePage, searchNotion
- toolExecutor.ts imports from NotionClient.ts (not MCP)
- MCP code preserved in NotionClient.mcp.ts
- @notionhq/client in package.json dependencies

## Next Phase Readiness

Plan 11-01 complete. Ready for:
- Plan 11-02: Fix Turso environment variable detection (TURSO_DATABASE_URL)
- Plan 11-03: Fix Puppeteer removal for serverless
- Plan 11-04: Fix BullMQ Redis dependency
- Plan 11-05: Resolve zustand hydration mismatch
- Plan 11-06: Update session API for cookies

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| package.json | Modified | Added @notionhq/client dependency |
| NotionClient.ts | Rewritten | Direct SDK client with singleton pattern |
| NotionClient.mcp.ts | Created | Parked MCP code for future MacBook integration |
| toolExecutor.ts | Modified | Use direct SDK functions |
| BriefingBuilder.ts | Modified | Use direct queryDatabase |
| discover-notion-databases.ts | Modified | SDK v5 compatibility |
