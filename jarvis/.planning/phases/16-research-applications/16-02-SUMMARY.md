---
phase: 16-research-applications
plan: 02
subsystem: workflows
tags: [grant-application, entity-profiles, approval-gateway, research-library, sub-agents]

# Dependency graph
requires:
  - phase: 16-research-applications/01
    provides: research MCP tools (store_research, search_research, get_research_topic, list_research_topics)
  - phase: 15-approval-gateway
    provides: requestApproval() for Telegram-based human approval
  - phase: 14-browser-automation
    provides: sub-agent registry (researcher, form-filler, browser-worker)
provides:
  - Entity profile loader parsing 5 ventures from markdown into research_entries
  - Grant application workflow (6-stage orchestrator with mandatory approval)
  - apply_for_grant and load_entity_profiles tool definitions and dispatch
  - Entity-optimization and website-optimization seed entries for known gaps
affects: [16.1-research-intelligence, grant-applications, credit-research]

# Tech tracking
tech-stack:
  added: []
  patterns: [entity-profile-parsing, multi-stage-grant-workflow, optimization-gap-seeding]

key-files:
  created:
    - src/lib/jarvis/data/entityProfiles.ts
    - src/lib/jarvis/workflows/grantApplicationWorkflow.ts
  modified:
    - src/lib/jarvis/intelligence/tools.ts
    - src/lib/jarvis/notion/toolExecutor.ts

key-decisions:
  - "Entity profiles use process.cwd() path resolution (works when cwd is project root on Vercel and local)"
  - "Form-filler gets 25 maxTurns (vs 15 for bill pay) due to multi-page grant forms"
  - "Approval timeout 15 minutes (vs 10 for bill pay) for more complex review"
  - "Seed entity-optimization and website-optimization entries during profile loading for day-one gap tracking"
  - "DUNS/UEI and website audit gaps automatically detected and stored as optimization entries"

patterns-established:
  - "Entity profile parsing: markdown -> research_entries with domain='business', idempotent via deleteResearchTopic"
  - "Optimization seeding: loader auto-creates entity-optimization and website-optimization entries for known gaps"
  - "Grant workflow: 6-stage pipeline (research, eligibility, prepare, approve, submit, confirm) with mandatory approval"

requirements-completed: [RESEARCH-03, RESEARCH-04, RESEARCH-05]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 16 Plan 02: Entity Profiles & Grant Application Workflow Summary

**Entity profile loader parsing 5 ventures into research_entries with grant application workflow orchestrating 6 stages (research, eligibility, prepare, approve, submit, confirm) through mandatory Telegram approval**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17T17:30:09Z
- **Completed:** 2026-03-17T17:34:39Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Entity profile loader parses all 5 ventures from grant-entity-profiles.md into structured research_entries
- [FILL] fields stored with confidence='low' so form-filler knows what's incomplete
- Grant application workflow chains 6 stages with mandatory approval before submission
- Entity-optimization and website-optimization gap entries seeded automatically during profile loading
- apply_for_grant and load_entity_profiles tools wired into toolExecutor with lazy imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entity profile loader and grant application workflow** - `cd109f0` (feat)
2. **Task 2: Wire apply_for_grant and load_entity_profiles tools into toolExecutor** - `5cfcf90` (feat)
3. **Task 3: Verify research tools, entity profiles, and grant workflow end-to-end** - CHECKPOINT (awaiting human verification)

## Files Created/Modified
- `src/lib/jarvis/data/entityProfiles.ts` - Parses grant-entity-profiles.md, loads fields as research_entries, seeds optimization gaps
- `src/lib/jarvis/workflows/grantApplicationWorkflow.ts` - 6-stage grant application orchestrator with approval gateway
- `src/lib/jarvis/intelligence/tools.ts` - apply_for_grant and load_entity_profiles tool definitions
- `src/lib/jarvis/notion/toolExecutor.ts` - Dispatch cases for both new tools with entity profile validation

## Decisions Made
- Used process.cwd() for entity profiles path (simpler than __dirname resolution, works on both local and Vercel)
- Form-filler gets 25 maxTurns (higher than bill pay's 15) because grant forms are multi-page
- Approval timeout set to 15 minutes (longer than bill pay's 10) for more complex review
- Seeded entity-optimization and website-optimization entries during profile load per ENTITY-OPTIMIZATION-SCOPE.md
- DUNS/UEI registration gaps and website audit needs auto-detected from profile data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Awaiting human verification (Task 3 checkpoint) to test live via Telegram
- Push to GitHub triggers auto-deploy, then test: load entity profiles, research grants, run workflow
- After verification, Phase 16 is complete (research-as-library fully operational)

---
*Phase: 16-research-applications*
*Completed: 2026-03-17*
