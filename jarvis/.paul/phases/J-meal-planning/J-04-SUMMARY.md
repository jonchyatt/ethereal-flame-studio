# J-04 Summary: Polish & Intelligence

**Status:** COMPLETE
**Date:** 2026-03-01

## What Was Built

### Task 1: Recipe Detail Resolution + Prep Time Display + Dashboard Enrichment
- **MealPlanSummary** extended with `prepTime` and `cookTime` fields (types.ts)
- **PersonalMeal** extended with matching fields (personalStore.ts)
- **resolveRecipeTimesForMeals()** in BriefingBuilder queries the Recipes DB ONCE (not per-recipe), builds a Map of recipe times, merges onto meal objects. Failure returns null times silently.
- **transformMeals** in useJarvisFetch.ts flows prepTime/cookTime through pipeline
- **MealRow** in MealsView.tsx shows Clock icon + total time after servings display (only when > 0)
- **PersonalDashboard** meals stat: shows dinner name + time when found (e.g., "Stir-Fry — 45m"), degrades to count, degrades to "No meals planned"

### Task 2: Full-Week Meal Awareness in Chat System Prompt
- **SystemPromptContext** extended with `mealContext?: string | null`
- **fetchWeeklyMealContext()** in context.ts: queries meal plan DB once, resolves today's dinner recipe times (1 retrievePage call), builds full-week overview string with ordered days starting from today
- Runs as 5th parallel fetch in Promise.all — zero added sequential latency
- **THIS WEEK'S MEALS** section in system prompt: full week, today's dinner with setting-aware detail (Home = prep timing, Dine-Out = travel, Takeout = order lead)
- Explicit "do NOT volunteer meal info unprompted" guardrail
- Returns null (section omitted) when zero meals planned or on any failure

### Task 3: Claude-Reasoned Shopping List with Rich Context + Itemized Response
- **generate_shopping_list** tool definition: added `target_servings` parameter
- **getRecipeDetailsForShoppingList()**: extracts ingredients + category, difficulty, prepTime, cookTime from the same retrievePage call (zero additional API calls vs current)
- **Claude Haiku reasoning**: receives rich recipe context, produces items with quantities, units, and categories. Chef-like rules: sub-linear spice scaling, practical rounding, category assignment.
- **Quantitative pantry subtraction**: same-unit subtraction reduces Claude quantities, different units kept conservatively
- **Items created with full properties**: quantity (number), unit (select), category (select) in Notion
- **Itemized response**: lists each item with quantity and category, reports pantry skips and dedup skips
- **Fallback**: if Claude reasoning fails → exact J-01 behavior (name-only items, current response format)
- **Lazy Anthropic singleton**: follows codebase pattern from consolidation.ts/summarization.ts

## Files Modified (10)
| File | Changes |
|------|---------|
| `src/lib/jarvis/executive/types.ts` | +prepTime, +cookTime on MealPlanSummary |
| `src/lib/jarvis/executive/BriefingBuilder.ts` | +RECIPE_PROPS import, +resolveRecipeTimesForMeals(), called after parse, +null init in parser |
| `src/lib/jarvis/stores/personalStore.ts` | +prepTime, +cookTime on PersonalMeal |
| `src/lib/jarvis/hooks/useJarvisFetch.ts` | transformMeals maps prepTime/cookTime |
| `src/components/jarvis/personal/MealsView.tsx` | +Clock import, +totalTime calc + display in MealRow |
| `src/components/jarvis/personal/PersonalDashboard.tsx` | Dinner-aware stat: name + time, degrades to count |
| `src/lib/jarvis/telegram/context.ts` | +fetchWeeklyMealContext(), 5th parallel fetch, +mealContext return |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | +mealContext field, THIS WEEK'S MEALS section |
| `src/lib/jarvis/intelligence/tools.ts` | +target_servings param on generate_shopping_list |
| `src/lib/jarvis/notion/toolExecutor.ts` | +Anthropic import/singleton, +getRecipeDetailsForShoppingList, Claude reasoning path, quantitative pantry, itemized response, fallback path |

## Acceptance Criteria
- [x] AC-1: Recipe details flow through pipeline (prepTime/cookTime → MealRow + dashboard)
- [x] AC-2: Full-week meal awareness in every chat (THIS WEEK'S MEALS section, setting-aware, guardrail)
- [x] AC-3: Claude-reasoned shopping quantities (Haiku, rich context, itemized response, quantitative pantry)
- [x] AC-4: Graceful degradation at every layer (null handling, fallbacks, no blocked pipelines)
- [x] AC-5: Build passes (zero errors, zero warnings)

## Key Decisions
- Recipes DB queried ONCE in BriefingBuilder (was N retrievePage calls) — single query replaces 10-15 individual calls
- Full week context in system prompt (not just tonight) — enables proactive "empty day" suggestions
- Inline extraction helpers in context.ts (BriefingBuilder's aren't exported) — avoids touching module boundaries
- Conservative pantry subtraction (same-unit only) — no risky unit conversions
- Claude Haiku for shopping reasoning ($0.001/list generation) — negligible cost for dramatically better output
