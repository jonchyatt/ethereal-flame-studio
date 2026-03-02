# J-02 UNIFY — Briefing Integration

**Date:** 2026-03-01
**Plan:** J-02-PLAN.md
**Summary:** J-02-SUMMARY.md

## Verification Checklist

- [x] `npm run build` completes with zero errors
- [x] types.ts has MealPlanSummary interface with 7 fields (id, title, dayOfWeek, timeOfDay, setting, **servings**, recipeIds)
- [x] BriefingData.meals is optional and contains planned + today + shoppingListCount
- [x] BriefingBuilder has extractRichText and extractRelationIds helpers
- [x] BriefingBuilder queries ALL meals (no day filter) via queryAllMealsSafe
- [x] BriefingBuilder queries shopping list unchecked count via queryShoppingListCountSafe
- [x] Both queries run in parallel (inside Promise.all, 8 entries total)
- [x] parseMealPlanResults extracts title, dayOfWeek, timeOfDay, setting, **servings**, AND recipeIds
- [x] todayMeals is server-filtered from allMeals by dayOfWeek === todayDayName (timezone-safe)
- [x] todayDayName derived via format(parseISO(getTodayInTimezone(tz)), 'EEEE')
- [x] Graceful degradation: empty results when env vars not configured
- [x] Error fallback includes meals field with empty defaults (planned=[], today=[], shoppingListCount=0)
- [x] personalStore has PersonalMeal interface with recipeIds + servings, meals state, setMeals action
- [x] useJarvisFetch transformMeals maps `planned` (full week) not just `today`
- [x] refetchJarvisData calls personalStore.setMeals
- [x] transformBriefingSummary shows meal names for 1-2, count for 3+, and shopping list count
- [x] All acceptance criteria (AC-1 through AC-6) satisfied

## Deviations from Plan

| # | Deviation | Reason | Impact |
|---|-----------|--------|--------|
| 1 | **MealPlanSummary has 7 fields, not 6** — added `servings: number \| null` | Jonathan requested servings/feeds count for intelligent recipe scaling. Added during execution since all files were already open. | Positive — enables J-04 intelligent scaling without retrofitting. Degrades to null until Notion column added. |
| 2 | **extractSelect 'Unknown' handling** — plan said `extractSelect(...) \|\| null` but implementation uses explicit `!== 'Unknown'` checks | `extractSelect` returns `'Unknown'` (truthy string) for missing properties, not empty string or null. The plan's `\|\| null` pattern wouldn't work. | Bug prevention — without this fix, `dayOfWeek` would never match `todayDayName`, causing zero meals in today's briefing. |
| 3 | **MEAL_PLAN_PROPS.servings added to schemas.ts** | Required for servings field to flow through. Plan didn't include schemas.ts in files_modified since servings wasn't in original scope. | schemas.ts is a J-01 artifact; adding a new key is additive and non-breaking. |

## Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | MealPlanSummary type + BriefingData.meals | PASS (7 fields, exceeds plan's 6) |
| AC-2 | Morning briefing queries full weekly plan + shopping list | PASS (8 parallel queries) |
| AC-3 | Graceful degradation when DBs not configured | PASS (empty results, no throws) |
| AC-4 | Personal store has full weekly meals with recipe IDs | PASS (+ servings field) |
| AC-5 | useJarvisFetch transforms and distributes meal data | PASS (full week mapped, rich summary text) |
| AC-6 | Build passes | PASS (zero errors, zero new warnings) |

## New Requirements Captured

1. **Intelligent recipe scaling (J-04):** When servings differs from recipe base, Claude reasons about sub-linear spice scaling, cooking time adjustments for volume, equipment constraints — not dumb multiplication.
2. **Human action needed:** Add "Servings" number column to Notion Meal Plan database.
3. **generate_shopping_list enhancement (J-04):** Accept target servings override, pull recipe base + ingredients, pass to Claude for intelligent adjustment.

## Files Modified (Final)

| File | Lines Changed | Nature |
|------|--------------|--------|
| `src/lib/jarvis/executive/types.ts` | +14 | MealPlanSummary interface, meals? on BriefingData |
| `src/lib/jarvis/executive/BriefingBuilder.ts` | +75 | 2 helpers, 2 safe queries, 1 parser, briefing wiring |
| `src/lib/jarvis/stores/personalStore.ts` | +12 | PersonalMeal interface, meals state, setMeals action |
| `src/lib/jarvis/hooks/useJarvisFetch.ts` | +28 | transformMeals, setMeals wiring, briefing summary |
| `src/lib/jarvis/notion/schemas.ts` | +1 | servings key in MEAL_PLAN_PROPS |

## Verdict

**J-02 COMPLETE.** All acceptance criteria pass. Two deviations — both improvements (servings field, extractSelect bug fix). No regressions. Ready for J-03.
