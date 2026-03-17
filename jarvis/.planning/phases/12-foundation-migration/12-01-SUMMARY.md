---
phase: 12-foundation-migration
plan: 01
subsystem: infra
tags: [pm2, cloudflare-tunnel, claude-agent-sdk, repo-migration, standalone]

# Dependency graph
requires:
  - phase: v4.3
    provides: Complete Jarvis codebase in ethereal-flame-studio monorepo
provides:
  - Standalone jarvis repo at C:\Users\jonch\Projects\jarvis
  - Claude Agent SDK installed with systemPrompt API surface
  - PM2 processes running from standalone repo with Cloudflare tunnel
affects: [12-02, 12-03, 13, 14]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk ^0.2.77"]
  patterns: ["standalone repo with PM2 process management", "SDK systemPrompt property (was customSystemPrompt)"]

key-files:
  created:
    - ecosystem.config.js
    - package.json (standalone, name: jarvis, version: 5.0.0)
    - scripts/start-web.js
  modified:
    - src/lib/jarvis/intelligence/ccodeBrain.ts
    - src/lib/jarvis/intelligence/llmProvider.ts

key-decisions:
  - "Manual extraction over git-filter-repo (monorepo structure makes subdirectory extraction impractical)"
  - "Preserved src/lib/jarvis directory structure to keep all internal imports working"
  - "SDK rename: customSystemPrompt -> systemPrompt (breaking change in claude-agent-sdk)"

patterns-established:
  - "Standalone Jarvis repo at C:\\Users\\jonch\\Projects\\jarvis"
  - "PM2 ecosystem.config.js with 4 processes: jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel"

requirements-completed: [FOUND-01, FOUND-02]

# Metrics
duration: ~20min
completed: 2026-03-17
---

# Phase 12 Plan 01: Repo Migration & SDK Swap Summary

**Jarvis extracted to standalone repo with Claude Agent SDK replacing claude-code, all 4 PM2 processes healthy on new paths**

## Performance

- **Duration:** ~20 min (across checkpoint pause)
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 3 (1 auto + 1 checkpoint + 1 auto)
- **Files modified:** 6 (ecosystem.config.js, package.json, package-lock.json, ccodeBrain.ts, llmProvider.ts, plus full repo creation)

## Accomplishments
- Jarvis runs from C:\Users\jonch\Projects\jarvis as a standalone repo (no longer nested in ethereal-flame-studio)
- All 4 PM2 processes (jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel) online with 0 restart crashes
- Cloudflare tunnel serves jarvis.whatamiappreciatingnow.com from new repo location
- Claude Agent SDK (@anthropic-ai/claude-agent-sdk) installed, replacing @anthropic-ai/claude-code
- TypeScript compiles clean with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract Jarvis to standalone repo and re-register PM2** - `484affc` (feat)
2. **Task 2: Verify repo migration and PM2 health** - checkpoint (human-verified, approved)
3. **Task 3: Swap Claude Code SDK for Claude Agent SDK** - `846296b` (feat)

## Files Created/Modified
- `ecosystem.config.js` - PM2 process config with standalone paths (scripts/start-web.js, not jarvis/scripts/start-web.js)
- `package.json` - Standalone dependencies, name: jarvis, version: 5.0.0, claude-agent-sdk replaces claude-code
- `src/lib/jarvis/intelligence/ccodeBrain.ts` - Import updated to @anthropic-ai/claude-agent-sdk, customSystemPrompt -> systemPrompt
- `src/lib/jarvis/intelligence/llmProvider.ts` - Import updated to @anthropic-ai/claude-agent-sdk

## Decisions Made
- Manual extraction chosen over git-filter-repo (monorepo subdirectory structure makes automated extraction impractical per research findings)
- Preserved src/lib/jarvis/ directory structure unchanged so all 140+ internal imports continue working
- SDK breaking change `customSystemPrompt` renamed to `systemPrompt` -- fixed in ccodeBrain.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed customSystemPrompt -> systemPrompt breaking change**
- **Found during:** Task 3 (SDK swap)
- **Issue:** Claude Agent SDK renamed the `customSystemPrompt` option to `systemPrompt`. TypeScript compilation failed with TS2561.
- **Fix:** Changed `customSystemPrompt: systemPrompt` to just `systemPrompt` (shorthand property) in ccodeBrain.ts
- **Files modified:** src/lib/jarvis/intelligence/ccodeBrain.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` exits clean
- **Committed in:** 846296b (Task 3 commit)

**2. [Rule 3 - Blocking] Fixed llmProvider.ts still importing @anthropic-ai/claude-code**
- **Found during:** Task 3 (SDK swap)
- **Issue:** Plan stated "This is the ONLY file that imports the SDK" but llmProvider.ts also imports `query` from the old package. TypeScript compilation failed with TS2307.
- **Fix:** Updated import in llmProvider.ts from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`
- **Files modified:** src/lib/jarvis/intelligence/llmProvider.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` exits clean
- **Committed in:** 846296b (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes required for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Standalone repo ready for Plans 02 (flexible scheduler) and 03 (research schema)
- Claude Agent SDK installed and functional -- unblocks sub-agent spawning in Phase 14
- PM2 processes stable with 0 restart crashes

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 12-foundation-migration*
*Completed: 2026-03-17*
