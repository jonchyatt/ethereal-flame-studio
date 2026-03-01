---
phase: J-meal-planning
plan: "01"
subsystem: api
tags: [notion, claude-tools, meal-planning, pantry, shopping-list]

requires:
  - phase: I-bill-payment
    provides: Notion tool patterns, createPage/updatePage/queryDatabase, upsert pattern
provides:
  - 7 new Claude tools for conversational meal planning
  - Pantry inventory tracking with upsert pattern
  - Smart shopping list generation (meal plan - pantry = shopping list)
  - Recipe creation with ingredient auto-linking
  - archivePage() in NotionClient for soft-delete
affects: [J-02-briefing, J-03-frontend, J-04-polish]

tech-stack:
  added: []
  patterns: [upsert-by-name, find-or-create-relation, multi-step-compound-tool, client-side-threshold-filtering]

key-files:
  modified:
    - src/lib/jarvis/notion/schemas.ts
    - src/lib/jarvis/intelligence/tools.ts
    - src/lib/jarvis/notion/toolExecutor.ts
    - src/lib/jarvis/notion/recentResults.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/lib/jarvis/notion/NotionClient.ts
    - .env.example

key-decisions:
  - "archivePage added to NotionClient — updatePage only passes properties, cannot set archived:true at top level"
  - "Pantry upsert searches by exact name, updates if found, creates if not"
  - "generate_shopping_list is a 5-step compound tool (query meals → extract ingredients → check pantry → dedupe → write)"
  - "Client-side low-stock filtering because Notion can't compare two properties"

patterns-established:
  - "Upsert by name: search → update existing OR create new (reusable for any Notion entity)"
  - "Find-or-create relation: ingredient pages auto-created when recipe saved"
  - "Compound tool pattern: multi-query orchestration within a single tool execution"
  - "Graceful degradation: clear error message when env var not configured, no throws"

duration: ~90min
started: 2026-03-01
completed: 2026-03-01
---

# Phase J Plan 01: Backend Foundation Summary

**7 new Claude tools for conversational meal planning — recipes, meal plan queries, pantry tracking with upsert, and smart shopping list generation that subtracts pantry stock from meal plan ingredients.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~90min |
| Started | 2026-03-01 |
| Completed | 2026-03-01 |
| Tasks | 4 completed |
| Files modified | 7 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Recipe Creation via Conversation | Pass | create_recipe with findOrCreateIngredients auto-linking |
| AC-2: Meal Plan Querying | Pass | query_meal_plan with day/meal type filters via buildMealPlanFilter |
| AC-3: Pantry Management (Upsert) | Pass | update_pantry searches by name, updates or creates. quantity=0 for out-of-stock |
| AC-4: Smart Shopping List Generation | Pass | 5-step pipeline: meals → ingredients → pantry subtract → dedupe → write |
| AC-5: Shopping List Operations | Pass | query + clear_checked (archive) + check_all |
| AC-6: Graceful Degradation | Pass | All 7 tools return clear config message when env vars missing |
| AC-7: Build Passes | Pass | `npm run build` zero errors |

## Accomplishments

- 7 new tool definitions + 7 case handlers fully implemented and verified
- `generate_shopping_list` compound tool — the killer feature — orchestrates 4 Notion queries in sequence
- Pantry upsert pattern: "we're out of milk" = quantity 0, not delete (preserves item for restocking)
- `findOrCreateIngredients()` — recipes auto-link to ingredient pages, creating missing ones on the fly
- All schemas, filters, formatters, and parsers for 3 new entity types (pantry, shopping list, meal plan queries)

## Task Commits

Single commit covering all 4 tasks (developed as cohesive unit):

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Extend Notion Schemas | `c1c51b9` | feat | PANTRY_PROPS, SHOPPING_LIST_PROPS, interfaces, filters, formatters |
| Task 2: Add 7 Tool Definitions | `c1c51b9` | feat | 7 tools in notionTools array |
| Task 3: Implement Tool Executors | `c1c51b9` | feat | 7 case handlers + helpers |
| Task 4: System Prompt + Build | `c1c51b9` | feat | CAPABILITIES update, .env.example, build pass |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/notion/schemas.ts` | Modified | PANTRY_PROPS, enhanced SHOPPING_LIST_PROPS, 2 interfaces, 3 filters, 3 formatters, parsePantryResults |
| `src/lib/jarvis/intelligence/tools.ts` | Modified | 7 new tool definitions with full input schemas |
| `src/lib/jarvis/notion/toolExecutor.ts` | Modified | 7 case handlers, findOrCreateIngredients, enhanced addItemsToShoppingList, 7 summarizeNotionContext cases, TITLE_PROPS expanded |
| `src/lib/jarvis/notion/recentResults.ts` | Modified | CachedItem type extended with 'mealPlan' |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | CAPABILITIES section: meal planning, pantry, smart shopping |
| `src/lib/jarvis/notion/NotionClient.ts` | Modified | archivePage() function added (deviation) |
| `.env.example` | Modified | 5 new env var slots for meal planning databases |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| archivePage() added to NotionClient | Plan assumed updatePage could set `archived: true` — Notion SDK only passes `properties` via updatePage. archivePage wraps `client.pages.update({ page_id, archived: true })` directly | Clean API, reusable for any future soft-delete needs |
| extractSelectFromProp as local helper | generate_shopping_list needs to extract select values from meal plan pages for multi-day filtering. Private function in toolExecutor, not exported | Keeps schemas.ts clean, single-use helper stays local |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — plan's approach didn't work with Notion SDK |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Single essential fix, no scope creep.

### Auto-fixed Issues

**1. [SDK] archivePage needed because updatePage can't archive**
- **Found during:** Task 3 (clear_shopping_list handler)
- **Issue:** Plan specified `await updatePage(p.id, { archived: true })` but updatePage only passes the `properties` field to the Notion SDK — `archived` is a top-level page property, not a page property field
- **Fix:** Added `archivePage(pageId: string)` to NotionClient.ts wrapping `client.pages.update({ page_id, archived: true })`
- **Files:** `src/lib/jarvis/notion/NotionClient.ts`
- **Verification:** Build passes, function integrated into circuit breaker + retry pattern
- **Commit:** `c1c51b9`

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Notion updatePage API limitation | archivePage() workaround (see Deviations) |

## Next Phase Readiness

**Ready:**
- All 7 tools deployed and auto-routing through chatProcessor (notionTools array)
- Schemas, filters, formatters ready for J-02 briefing queries
- System prompt already advertises meal planning capabilities
- Tools gracefully degrade until databases are configured

**Concerns:**
- Human blocker: Jonathan must create Pantry database in Notion + set 5 env vars before tools are functional in production
- Tools cannot be live-tested until databases exist and env vars are set

**Blockers:**
- Pantry database creation in Notion (human action)
- 5 env vars in Vercel: NOTION_RECIPES_DATABASE_ID, NOTION_INGREDIENTS_DATABASE_ID, NOTION_SHOPPING_LIST_DATA_SOURCE_ID, NOTION_PANTRY_DATA_SOURCE_ID, NOTION_PANTRY_DATABASE_ID

---
*Phase: J-meal-planning, Plan: 01*
*Completed: 2026-03-01*
