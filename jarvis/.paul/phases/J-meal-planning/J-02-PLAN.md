---
phase: J-meal-planning
plan: "02"
type: execute
wave: 1
depends_on: ["J-01"]
files_modified:
  - src/lib/jarvis/executive/types.ts
  - src/lib/jarvis/executive/BriefingBuilder.ts
  - src/lib/jarvis/stores/personalStore.ts
  - src/lib/jarvis/hooks/useJarvisFetch.ts
autonomous: true
---

<objective>
## Goal
Wire the full weekly meal plan, recipe relation IDs, and shopping list count into the morning briefing pipeline — so today's meals appear in the briefing, the complete weekly plan populates the personal store for J-03's UI, and recipe IDs are captured for J-04's prep time calculations. All at zero extra API cost.

## Purpose
J-01 built 7 conversational tools that let Jonathan populate his meal plan, pantry, and shopping list by talking to Jarvis. But that data is invisible outside of chat — the morning briefing doesn't mention meals, the personal store has no meal data, and the home page summary doesn't reference food. J-02 closes this gap: the same data Jonathan creates conversationally now flows through the established briefing pipeline (Notion → BriefingBuilder → API → useJarvisFetch → stores → UI).

**Key design insight:** The meal plan database is a recurring weekly plan (Day of the week = Monday/Tuesday/etc.), not dated entries. Fetching ALL entries (not just today) costs the same single query but gives J-03's WeeklyPlannerTab the full week's data without any additional API calls. The server pre-computes the `today` subset (timezone-safe), while `planned` carries the full weekly plan. Recipe relation IDs are already in the meal plan page properties — extracting them costs zero extra API calls but enables J-04's prep time resolution.

## Output
- `MealPlanSummary` interface with `recipeIds: string[]` in types.ts
- `meals?` field on `BriefingData` with `planned`, `today`, and `shoppingListCount`
- Full weekly meal plan + shopping list count queries in `buildMorningBriefing()` parallel fetch
- `parseMealPlanResults()` parser + `extractRichText` + `extractRelationIds` helpers in BriefingBuilder
- `PersonalMeal` interface with `recipeIds` + `meals` state + `setMeals` action in personalStore
- `transformMeals()` in useJarvisFetch wired into `refetchJarvisData()`
- Briefing summary: rich text for 1-2 meals ("Eggs & Toast for breakfast, Stir-Fry for dinner"), count for 3+
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/J-meal-planning/J-01-SUMMARY.md
- J-01 established all schemas (MEAL_PLAN_PROPS, SHOPPING_LIST_PROPS, PANTRY_PROPS), filter builders (buildMealPlanFilter, buildShoppingListFilter), and formatters (formatMealPlanResults, parsePantryResults) in schemas.ts
- J-01 established queryDatabase() in NotionClient.ts with circuit breaker + retry
- J-01 added LIFE_OS_DATABASES.mealPlan, .shoppingList, .pantry, .recipes, .ingredients keys
- Meal plan uses Day of the week (Select: Monday-Sunday) — recurring weekly plan, NOT dated entries
- Recipes relation on meal plan entries links to recipe pages with prepTime, cookTime, kcal, ingredients

## Source Files
@src/lib/jarvis/executive/types.ts — BriefingData interface, all Summary types
@src/lib/jarvis/executive/BriefingBuilder.ts — queryNotionRaw, parsers, buildMorningBriefing, extraction helpers
@src/lib/jarvis/stores/personalStore.ts — PersonalState, PersonalActions, all store types
@src/lib/jarvis/hooks/useJarvisFetch.ts — transform functions, refetchJarvisData, transformBriefingSummary
@src/lib/jarvis/notion/schemas.ts — MEAL_PLAN_PROPS, SHOPPING_LIST_PROPS, buildMealPlanFilter, buildShoppingListFilter, LIFE_OS_DATABASES
</context>

<skills>
No specialized flows configured.
</skills>

<acceptance_criteria>

## AC-1: MealPlanSummary Type and BriefingData Extension
```gherkin
Given the types.ts file defines BriefingData
When J-02 code is added
Then BriefingData has an optional `meals` field containing `planned: MealPlanSummary[]`, `today: MealPlanSummary[]`, and `shoppingListCount: number`
And MealPlanSummary has fields: id, title, dayOfWeek, timeOfDay, setting (all string | null except id and title), and recipeIds (string[])
And existing BriefingData consumers (evening wrap, check-in, weekly review) continue to compile without modification because `meals` is optional
```

## AC-2: Morning Briefing Queries Full Weekly Meal Plan and Shopping List
```gherkin
Given LIFE_OS_DATABASES.mealPlan and .shoppingList are configured (env vars set)
When buildMorningBriefing(timezone) executes
Then it queries the meal plan database with NO day filter (fetches entire weekly plan)
And it queries the shopping list database for unchecked items count
And both queries run in parallel with existing queries (inside the same Promise.all)
And meal results are parsed into MealPlanSummary[] via parseMealPlanResults() including recipeIds from the Recipes relation
And today's meals are filtered server-side by matching dayOfWeek to the current day name (timezone-safe)
And the returned BriefingData includes meals.planned (full week), meals.today (today only), and meals.shoppingListCount
```

## AC-3: Graceful Degradation When Databases Not Configured
```gherkin
Given LIFE_OS_DATABASES.mealPlan or .shoppingList is empty (env vars not set)
When buildMorningBriefing() executes
Then meal queries return empty results without throwing
And the briefing still succeeds with meals.planned=[], meals.today=[], meals.shoppingListCount=0
And no other briefing sections are affected
```

## AC-4: Personal Store Has Full Weekly Meals with Recipe IDs
```gherkin
Given personalStore is initialized
When setMeals() is called with PersonalMeal[]
Then the store's meals field is updated with the FULL weekly plan (all days, not just today)
And the PersonalMeal interface has: id, name, dayOfWeek, timeOfDay, setting, recipeIds
```

## AC-5: useJarvisFetch Transforms and Distributes Meal Data
```gherkin
Given refetchJarvisData() fetches BriefingData with meals field
When the data arrives
Then transformMeals() converts all MealPlanSummary[] (planned, not just today) to PersonalMeal[]
And personalStore.setMeals() is called with the full weekly plan
And transformBriefingSummary() shows meal names for 1-2 meals ("Eggs & Toast for breakfast, Stir-Fry for dinner") or count for 3+ ("3 meals planned today")
And shopping list count appears in the summary when > 0
```

## AC-6: Build Passes
```gherkin
Given all J-02 changes are applied
When `npm run build` runs
Then it completes with zero errors
And no new TypeScript warnings are introduced
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Server-side — Types + BriefingBuilder Integration</name>
  <files>src/lib/jarvis/executive/types.ts, src/lib/jarvis/executive/BriefingBuilder.ts</files>
  <action>
    **types.ts changes:**

    1. Add `MealPlanSummary` interface after `GoalSummary` (around line 106):
       - `id: string` — Notion page ID
       - `title: string` — meal entry name (e.g., "Chicken Stir-Fry")
       - `dayOfWeek: string | null` — "Monday", "Tuesday", etc.
       - `timeOfDay: string | null` — "Breakfast", "Lunch", "Dinner"
       - `setting: string | null` — "Home", "Dine-Out"
       - `recipeIds: string[]` — Notion page IDs from the Recipes relation (zero-cost extraction, enables J-04 prep time resolution)

    2. Add optional `meals` field to `BriefingData` interface (after `calendar`, before `lifeAreas`):
       ```
       meals?: {
         planned: MealPlanSummary[];
         today: MealPlanSummary[];
         shoppingListCount: number;
       };
       ```
       - `planned`: Full weekly meal plan (all days). The meal plan DB is a recurring weekly schedule — one unfiltered query returns everything (~14-21 entries). This gives J-03's WeeklyPlannerTab the full week without additional API calls.
       - `today`: Server-filtered subset where dayOfWeek matches the current day name (timezone-safe). Avoids every client re-deriving timezone-aware day logic.
       - `shoppingListCount`: Count of unchecked shopping list items.
       - MUST be optional (`meals?:`) — evening wrap, check-in, and weekly review extend/use BriefingData and won't populate meals in J-02.

    **BriefingBuilder.ts changes:**

    3. Add imports from schemas.ts (extend existing import block at line 31-43):
       - `MEAL_PLAN_PROPS`
       - `buildShoppingListFilter`
       Note: Do NOT import `buildMealPlanFilter` — we query ALL meals (no day filter) and filter client-side.

    4. Add import of `MealPlanSummary` from `./types` (extend existing import block at line 11-26)

    5. Add two extraction helpers alongside existing helpers (after extractCheckbox, around line 100):

       `extractRichText(prop: unknown): string`:
       ```
       function extractRichText(prop: unknown): string {
         const p = prop as { rich_text?: Array<{ plain_text?: string }> };
         return p?.rich_text?.map(t => t.plain_text || '').join('') || '';
       }
       ```
       Reason: MEAL_PLAN_PROPS.timeOfDay is rich_text type in Notion, not select. Existing extractors don't handle rich_text.

       `extractRelationIds(prop: unknown): string[]`:
       ```
       function extractRelationIds(prop: unknown): string[] {
         const p = prop as { relation?: Array<{ id?: string }> };
         return (p?.relation || []).filter(r => r.id).map(r => r.id!);
       }
       ```
       Reason: MEAL_PLAN_PROPS.recipes is a Relation property. The relation data (page IDs) is already in the meal plan page properties — extracting costs zero extra API calls. These IDs enable J-04's prep time resolution without re-querying the meal plan.

    6. Add two safe query helper functions (after `queryNotionRaw`, around line 330):

       `queryAllMealsSafe(): Promise<unknown>`:
       - Get `LIFE_OS_DATABASES.mealPlan` — if empty, return `{ results: [] }`
       - Call `queryDatabase(databaseId)` with NO filter — fetches entire weekly plan
       - Why no filter: The meal plan DB uses "Day of the week" select (Monday-Sunday), not dates. It's a recurring weekly plan with ~14-21 total entries. One unfiltered query is cheap and gives us all 7 days' meals in one shot.
       - Wrap in try/catch, return `{ results: [] }` on error (matches queryNotionRaw error pattern)
       - Log with `[BriefingBuilder]` prefix

       `queryShoppingListCountSafe(): Promise<number>`:
       - Get `LIFE_OS_DATABASES.shoppingList` — if empty, return 0
       - Call `queryDatabase(databaseId, buildShoppingListFilter({ showChecked: false }))`
       - Return `(result as { results?: unknown[] })?.results?.length || 0`
       - Wrap in try/catch, return 0 on error
       - Log with `[BriefingBuilder]` prefix

    7. Add `parseMealPlanResults(result: unknown): MealPlanSummary[]` parser (after existing parsers, around line 475):
       - Extract pages: `(result as { results?: unknown[] })?.results || []`
       - For each page, extract:
         - `id`: `p.id`
         - `title`: `extractTitle(p.properties[MEAL_PLAN_PROPS.title])`
         - `dayOfWeek`: `extractSelect(p.properties[MEAL_PLAN_PROPS.dayOfWeek]) || null`
         - `timeOfDay`: `extractSelect(p.properties[MEAL_PLAN_PROPS.timeOfDay]) || extractRichText(p.properties[MEAL_PLAN_PROPS.timeOfDay]) || null`
           (Try select first because data source API may return either format; fall back to rich_text extraction)
         - `setting`: `extractSelect(p.properties[MEAL_PLAN_PROPS.setting]) || null`
         - `recipeIds`: `extractRelationIds(p.properties[MEAL_PLAN_PROPS.recipes])`
       - Return `MealPlanSummary[]`
       - Follow exact structure of `parseTaskResults` — same defensive casting pattern

    8. Modify `buildMorningBriefing()` (lines 111-211):

       a. After timezone/date setup (line 119), compute today's day name timezone-safe:
          ```
          const todayDayName = format(parseISO(todayStr), 'EEEE');
          ```
          Uses already-imported `format` and `parseISO` from date-fns. 'EEEE' produces "Monday", "Tuesday", etc.
          Why safe: `getTodayInTimezone(timezone)` already adjusts the date to the user's timezone. The day name of a calendar date is timezone-independent (March 1 is Sunday everywhere). `parseISO` creates midnight UTC, `format(, 'EEEE')` returns the correct day name.

       b. Add two queries to the `Promise.all` array (lines 124-132):
          ```
          queryAllMealsSafe(),
          queryShoppingListCountSafe(),
          ```
          Destructure into `allMealsResult` and `shoppingListCount` alongside existing results.

       c. After existing parse calls (around line 151), add:
          ```
          const allMeals = parseMealPlanResults(allMealsResult);
          const todayMeals = allMeals.filter(m => m.dayOfWeek === todayDayName);
          ```
          Server-side filtering: compare parsed `dayOfWeek` to `todayDayName`. Exact string match (both title-case from Notion Select and date-fns 'EEEE').

       d. Add `meals` field to the `briefingData` object (lines 163-185):
          ```
          meals: {
            planned: allMeals,
            today: todayMeals,
            shoppingListCount,
          },
          ```

       e. Add to the console.log summary (lines 187-197):
          ```
          mealsPlanned: allMeals.length,
          mealsToday: todayMeals.length,
          shoppingListItems: shoppingListCount,
          ```

       f. Add `meals` to the error fallback return (lines 203-209):
          ```
          meals: { planned: [], today: [], shoppingListCount: 0 },
          ```

    **Avoid:**
    - Do NOT modify `queryNotionRaw` — it's tightly scoped to tasks/bills/habits/goals with specific routing. Adding meal/shopping cases would bloat it. Direct queryDatabase calls via safe helpers are cleaner and match the `fetchGoogleCalendarEventsSafe` pattern.
    - Do NOT modify `buildEveningWrapData` or `buildWeeklyReviewData` — meals in those briefing types is J-04 scope. The optional `meals?` field means they compile unchanged. The architecture enables trivial addition later (call queryAllMealsSafe, filter by tomorrow's day name).
    - Do NOT add meals to `buildCheckInData` — check-ins call `buildMorningBriefing()` internally, so they'll get meals for free.
    - Do NOT import `buildMealPlanFilter` — we fetch ALL meals unfiltered, then filter server-side by day name. The filter builder is for tool executors that query by specific day/meal type.
  </action>
  <verify>
    - `npm run build` passes with zero errors
    - types.ts has MealPlanSummary interface with 6 fields (including recipeIds)
    - BriefingData.meals has planned, today, and shoppingListCount
    - BriefingBuilder.ts has parseMealPlanResults, queryAllMealsSafe, queryShoppingListCountSafe
    - BriefingBuilder.ts has extractRichText and extractRelationIds helpers
    - buildMorningBriefing computes todayDayName timezone-safe
    - buildMorningBriefing Promise.all has 8 entries (was 6)
    - todayMeals is filtered from allMeals by dayOfWeek match
    - briefingData object includes meals field with planned + today + shoppingListCount
    - Error fallback includes meals field with empty defaults
  </verify>
  <done>AC-1, AC-2, AC-3 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Client-side — Store + useJarvisFetch Wiring</name>
  <files>src/lib/jarvis/stores/personalStore.ts, src/lib/jarvis/hooks/useJarvisFetch.ts</files>
  <action>
    **personalStore.ts changes:**

    1. Add `PersonalMeal` interface after `PersonalGoal` (around line 56):
       ```
       export interface PersonalMeal {
         id: string;
         name: string;
         dayOfWeek: string;
         timeOfDay: string;
         setting: string;
         recipeIds: string[];
       }
       ```
       Includes `recipeIds` — J-03's WeeklyPlannerTab can resolve recipe details (name, prepTime, kcal) from these IDs. J-04's prep time calculation uses them directly. Zero cost to carry.

    2. Add `meals: PersonalMeal[]` to `PersonalState` interface (after `health`, line 106)

    3. Add `setMeals: (meals: PersonalMeal[]) => void` to `PersonalActions` interface (after `setHealth`, line 118)

    4. Add `meals: []` to initial state in `create<PersonalStore>()` (after `health: []`, line 133)

    5. Add `setMeals: (meals) => set({ meals }),` to the store implementation (after `setHealth`, line 158)
       Pattern: Simple setter, same as `setHealth`. Meals do NOT affect `todayStats` — they're informational, not KPI items.

    **useJarvisFetch.ts changes:**

    6. Add `PersonalMeal` to the import from personalStore (line 9-10):
       ```
       import type { PersonalTask, PersonalHabit, PersonalBill, PersonalGoal, PersonalMeal } from '@/lib/jarvis/stores/personalStore';
       ```

    7. Add `transformMeals()` function after `transformCalendar()` (around line 213):
       ```
       function transformMeals(data: BriefingData): PersonalMeal[] {
         if (!data.meals) return [];
         return data.meals.planned.map((meal) => ({
           id: meal.id,
           name: meal.title,
           dayOfWeek: meal.dayOfWeek ?? '',
           timeOfDay: meal.timeOfDay ?? '',
           setting: meal.setting ?? '',
           recipeIds: meal.recipeIds,
         }));
       }
       ```
       Critical: Maps `data.meals.planned` (full weekly plan), NOT `data.meals.today`.
       The store holds ALL meals so J-03's WeeklyPlannerTab can display Monday-Sunday without additional fetches. Today-filtering for the briefing summary uses `data.meals.today` directly.
       Guard on `!data.meals` because the field is optional (evening wrap, check-in won't populate it).

    8. Add `personalStore.setMeals(transformMeals(data))` inside `refetchJarvisData()` (after `personalStore.setEvents()`, around line 244):
       ```
       personalStore.setMeals(transformMeals(data));
       ```

    9. Update `transformBriefingSummary()` (lines 86-112) to include meal data:
       After the goals block (line 108), before the return, add:
       ```
       if (data.meals) {
         const todayMeals = data.meals.today;
         if (todayMeals.length === 1) {
           const m = todayMeals[0];
           const label = m.timeOfDay ? `${m.title} for ${m.timeOfDay.toLowerCase()}` : m.title;
           parts.push(label);
         } else if (todayMeals.length === 2) {
           const labels = todayMeals.map(m =>
             m.timeOfDay ? `${m.title} for ${m.timeOfDay.toLowerCase()}` : m.title
           );
           parts.push(labels.join(', '));
         } else if (todayMeals.length > 2) {
           parts.push(`${todayMeals.length} meals planned today`);
         }
         if (data.meals.shoppingListCount > 0) {
           parts.push(`${data.meals.shoppingListCount} item${data.meals.shoppingListCount !== 1 ? 's' : ''} on shopping list`);
         }
       }
       ```
       Why rich text for 1-2: "Eggs & Toast for breakfast, Stir-Fry for dinner" is more human and useful than "2 meals planned today". At 3+ meals the names would be too long for the summary line.

    **Avoid:**
    - Do NOT add meals to `transformPriorities()` — meals are informational context, not action items. Priority stack is for things needing attention (overdue tasks, bills due). Meals in priority stack would create noise. If desired, this is J-04 scope.
    - Do NOT add meals to `transformDomainHealth()` — meal plan status doesn't determine domain health.
    - Do NOT modify `computeTodayStats()` — meals have no KPI impact (no due dates, no completion tracking in this context).
  </action>
  <verify>
    - `npm run build` passes with zero errors
    - personalStore.ts exports PersonalMeal interface with recipeIds field
    - personalStore has meals state field and setMeals action
    - useJarvisFetch has transformMeals that maps `planned` (full week, not just today)
    - refetchJarvisData calls personalStore.setMeals()
    - transformBriefingSummary shows meal names for 1-2, count for 3+, and shopping list count
  </verify>
  <done>AC-4, AC-5 satisfied</done>
</task>

<task type="auto">
  <name>Task 3: Build Verification</name>
  <files>N/A — verification only</files>
  <action>
    Run `npm run build` and verify:
    1. Zero TypeScript compilation errors
    2. No new warnings introduced
    3. Existing BriefingData consumers (EveningWrapData extends BriefingData, CheckInProgress, WeeklyReviewData) all compile without modification — the optional `meals?` field is backward-compatible
    4. All imports resolve correctly
  </action>
  <verify>`npm run build` exits with code 0</verify>
  <done>AC-6 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/notion/schemas.ts — J-01 schemas, filters, formatters are stable. J-02 only imports from this file.
- src/lib/jarvis/notion/toolExecutor.ts — J-01 tool executors are stable. Not part of briefing pipeline.
- src/lib/jarvis/intelligence/tools.ts — J-01 tool definitions are stable.
- src/lib/jarvis/notion/NotionClient.ts — queryDatabase, createPage, updatePage, archivePage are stable.
- src/lib/jarvis/executive/BriefingClient.ts — client-side fetch wrapper is unchanged (returns BriefingData, which now includes optional meals).
- src/app/api/jarvis/briefing/route.ts — API route is unchanged (passes through BriefingData as JSON).
- buildEveningWrapData() — Not modified in J-02. Meals in evening wrap is J-04 scope. Architecture enables trivial addition: call queryAllMealsSafe(), filter by tomorrow's day name.
- buildWeeklyReviewData() — Not modified in J-02. Meals in weekly review is J-04 scope.

## SCOPE LIMITS
- No UI components — MealsView.tsx is J-03 scope
- No priority stack integration — meals as priority items is J-04 scope if desired
- No prep time calculation — "start prep around 5:30 PM" is J-04 scope. recipeIds captured now enable it at zero extra query cost.
- No recipe resolution — extracting recipeIds is free (already in page properties). Resolving them to recipe names/prepTime requires extra API calls and is J-04 scope.
- No pantry low-stock surfacing in briefing — not in J-02 ROADMAP scope
- No todayStats impact — meals don't affect task/habit/bill KPIs
- No new API routes — existing /api/jarvis/briefing returns the expanded BriefingData automatically
- No system prompt update — Claude already advertises meal planning capabilities from J-01. If Claude doesn't spontaneously mention meals in briefings, that's a J-04 polish item.

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` completes with zero errors
- [ ] types.ts has MealPlanSummary interface with 6 fields (id, title, dayOfWeek, timeOfDay, setting, recipeIds)
- [ ] BriefingData.meals is optional and contains planned + today + shoppingListCount
- [ ] BriefingBuilder has extractRichText and extractRelationIds helpers
- [ ] BriefingBuilder queries ALL meals (no day filter) via queryAllMealsSafe
- [ ] BriefingBuilder queries shopping list unchecked count via queryShoppingListCountSafe
- [ ] Both queries run in parallel (inside Promise.all, 8 entries total)
- [ ] parseMealPlanResults extracts title, dayOfWeek, timeOfDay, setting, AND recipeIds
- [ ] todayMeals is server-filtered from allMeals by dayOfWeek === todayDayName (timezone-safe)
- [ ] todayDayName derived via format(parseISO(getTodayInTimezone(tz)), 'EEEE')
- [ ] Graceful degradation: empty results when env vars not configured
- [ ] Error fallback includes meals field with empty defaults (planned=[], today=[], shoppingListCount=0)
- [ ] personalStore has PersonalMeal interface with recipeIds, meals state, setMeals action
- [ ] useJarvisFetch transformMeals maps `planned` (full week) not just `today`
- [ ] refetchJarvisData calls personalStore.setMeals
- [ ] transformBriefingSummary shows meal names for 1-2, count for 3+, and shopping list count
- [ ] All acceptance criteria (AC-1 through AC-6) satisfied
</verification>

<success_criteria>
- All 3 tasks completed
- All verification checks pass
- `npm run build` exits with code 0
- No errors or warnings introduced
- Existing briefing consumers (evening wrap, check-in, weekly review) unaffected
- Meal data flows: Notion → BriefingBuilder → API → useJarvisFetch → personalStore
- personalStore.meals contains full weekly plan (all 7 days), not just today
- MealPlanSummary carries recipeIds for downstream resolution at zero query cost
- Briefing summary text includes human-readable meal info and shopping list count
- J-03 can read full weekly meal plan from personalStore without additional API calls
- J-04 can resolve recipeIds to prepTime/cookTime without re-querying the meal plan
</success_criteria>

<output>
After completion, create `.paul/phases/J-meal-planning/J-02-SUMMARY.md`
</output>
