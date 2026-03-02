---
phase: J-meal-planning
plan: 04
type: execute
wave: 1
depends_on: ["J-03"]
files_modified:
  - src/lib/jarvis/executive/types.ts
  - src/lib/jarvis/executive/BriefingBuilder.ts
  - src/lib/jarvis/stores/personalStore.ts
  - src/lib/jarvis/hooks/useJarvisFetch.ts
  - src/components/jarvis/personal/MealsView.tsx
  - src/components/jarvis/personal/PersonalDashboard.tsx
  - src/lib/jarvis/telegram/context.ts
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/lib/jarvis/intelligence/tools.ts
  - src/lib/jarvis/notion/toolExecutor.ts
autonomous: true
---

<objective>
## Goal

Complete v4.2 with three intelligence upgrades:

1. **Recipe detail resolution** — prep and cook times flow from Notion recipes through the entire pipeline to the UI, with the dashboard showing tonight's dinner at a glance
2. **Full-week meal awareness** — every chat conversation includes the entire week's meal status with setting-aware temporal hints, enabling proactive suggestions for empty days and dinner timing reasoning
3. **Claude-reasoned shopping quantities** — `generate_shopping_list` produces items with real quantities intelligently scaled by servings using rich recipe context, returns itemized results, not just a count

## Purpose

Transform the meal system from data display to intelligence. Jarvis doesn't just know WHAT meals are planned — it knows HOW LONG they take, sees which days are empty and can suggest filling them, reasons about WHEN to start cooking, and generates shopping lists with REAL quantities scaled to actual servings. This is the difference between a database viewer and a mind.

The setting field (`Home`/`Dine-Out`/`Takeout`) already exists in the data model. J-04 activates it — three completely different temporal patterns from one field:
- **Home:** prep + cook time → "consider starting around 5:30"
- **Dine-Out:** reservation + travel → "leave by 6:15"
- **Takeout:** order lead time → "place the order by 5:45"

## Output

- MealsView displays prep + cook time per meal (clock icon, total minutes)
- PersonalDashboard stat shows tonight's dinner name + prep time instead of generic count
- System prompt includes THIS WEEK'S MEALS section with full week status + tonight's detail
- `generate_shopping_list` produces items with Claude Haiku-reasoned quantities using rich recipe context
- Shopping list items have quantity, unit, and category populated in Notion
- Tool returns itemized list with quantities for Claude to present meaningfully
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/J-meal-planning/J-03-SUMMARY.md
- J-01: 7 tools deployed, schemas/filters/formatters built
- J-02: MealPlanSummary with servings, meals in BriefingData, store wiring
- J-03: 4-tab MealsView, MealRow with servings display, chat CTAs on empty states
- Servings already wired end-to-end: MEAL_PLAN_PROPS → MealPlanSummary → PersonalMeal → MealRow

## Source Files
@src/lib/jarvis/executive/types.ts — MealPlanSummary (lines 111-119), BriefingData (lines 140-167)
@src/lib/jarvis/executive/BriefingBuilder.ts — parseMealPlanResults (lines 558-578), buildMorningBriefing (lines 130-216), queryAllMealsSafe(), imports queryDatabase from NotionClient
@src/lib/jarvis/stores/personalStore.ts — PersonalMeal interface
@src/lib/jarvis/hooks/useJarvisFetch.ts — transformMeals function
@src/components/jarvis/personal/MealsView.tsx — MealRow (lines 105-132), DaySection, WeeklyPlannerContent
@src/components/jarvis/personal/PersonalDashboard.tsx — Meals card stat (lines 72-79), reads meals from personalStore
@src/lib/jarvis/telegram/context.ts — buildSystemPromptContext (lines 35-126), 4 parallel fetches in Promise.all
@src/lib/jarvis/intelligence/systemPrompt.ts — SystemPromptContext interface (lines 11-38), buildSystemPrompt (13 sections)
@src/lib/jarvis/intelligence/tools.ts — generate_shopping_list tool definition (lines 432-448)
@src/lib/jarvis/notion/toolExecutor.ts — generate_shopping_list impl (lines 786-890), getIngredientNamesForRecipe (lines 1211-1228) calls retrievePage per recipe then extracts only ingredient relations, RECIPE_PROPS imported
@src/lib/jarvis/notion/NotionClient.ts — retrievePage (line 206), queryDatabase (exported)
@src/lib/jarvis/notion/schemas.ts — RECIPE_PROPS with prepTime ('Prep Time (min)'), cookTime ('Cook Time (min)'), category, difficulty; SHOPPING_LIST_PROPS with quantity/unit/category; LIFE_OS_DATABASES, LIFE_OS_DATABASE_IDS
</context>

<acceptance_criteria>

## AC-1: Recipe Details Flow Through Pipeline
```gherkin
Given a meal plan entry with linked recipes that have prepTime and cookTime set
When the briefing loads and MealsView renders
Then each meal displays total time (prepTime + cookTime) with a clock icon next to the servings display
And meals without linked recipes or without time data show no time indicator (graceful null)
And the PersonalDashboard Meals card stat shows tonight's dinner name + time instead of generic count
```

## AC-2: Full-Week Meal Awareness in Every Chat
```gherkin
Given a week with some meals planned and some days empty
When the user starts any chat conversation (web or Telegram)
Then the system prompt includes a THIS WEEK'S MEALS section showing every day's status
And tonight's dinner has full detail (name, setting, prep/cook time, servings)
And empty days are explicitly listed (enabling Jarvis to suggest meal planning)
And setting-aware hints guide Claude's reasoning (Home → prep timing, Dine-Out → travel, Takeout → order lead)
And Jarvis does NOT volunteer meal info unprompted — the context is for reasoning, not announcing
And days with zero meals across the entire week produce no section at all
```

## AC-3: Claude-Reasoned Shopping Quantities with Rich Context
```gherkin
Given a user asks to generate a shopping list
When generate_shopping_list executes
Then Claude Haiku receives rich recipe context (name, category, difficulty, prep/cook time, ingredients, servings)
And Claude reasons about quantities with intelligent scaling (spices sub-linear, proteins linear)
And shopping list items in Notion have quantity (number), unit (select), and category (select) populated
And pantry stock with matching items reduces the generated quantity (quantitative subtraction)
And existing shopping list items are still deduplicated by name
And the tool returns an itemized list with quantities (not just "Added N items")
```

## AC-4: Graceful Degradation at Every Layer
```gherkin
Given missing data at any point (no recipes linked, no prep times stored, no servings set, Claude reasoning fails, Recipes DB empty)
When any J-04 feature encounters the gap
Then it falls back to J-01–J-03 behavior (no errors, no broken UI, no blocked pipelines)
And specifically: recipe DB query failure doesn't block briefing loading (meals still show, just without times)
And specifically: Claude reasoning failure falls back to name-only shopping items (current J-01 behavior)
And specifically: missing meal context returns null, system prompt omits the section entirely
And specifically: PersonalDashboard degrades to "X planned today" if no dinner found
```

## AC-5: Build Passes
```gherkin
Given all J-04 changes are complete
When npm run build executes
Then zero errors and zero warnings
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Recipe Detail Resolution + Prep Time Display + Dashboard Enrichment</name>
  <files>
    src/lib/jarvis/executive/types.ts,
    src/lib/jarvis/executive/BriefingBuilder.ts,
    src/lib/jarvis/stores/personalStore.ts,
    src/lib/jarvis/hooks/useJarvisFetch.ts,
    src/components/jarvis/personal/MealsView.tsx,
    src/components/jarvis/personal/PersonalDashboard.tsx
  </files>
  <action>
    **1. Extend MealPlanSummary (types.ts, line ~118):**
    Add two fields after `servings`:
    - `prepTime: number | null` — minutes from recipe's "Prep Time (min)" property
    - `cookTime: number | null` — minutes from recipe's "Cook Time (min)" property

    **2. Resolve recipe details in BriefingBuilder (BriefingBuilder.ts):**

    **IMPORTANT: Query the Recipes DB ONCE, not per-recipe retrievePage calls.**
    BriefingBuilder already imports `queryDatabase` from `'../notion/NotionClient'`. Use it.

    - Import `RECIPE_PROPS` and `LIFE_OS_DATABASES` from `'../notion/schemas'` (LIFE_OS_DATABASES may already be imported — check)
    - Create helper function `resolveRecipeTimesForMeals(meals: MealPlanSummary[]): Promise<void>`:
      - Collect all unique recipe IDs across all meals (`new Set(meals.flatMap(m => m.recipeIds))`)
      - If none, return immediately (zero API calls)
      - Query the ENTIRE Recipes database in ONE call: `queryDatabase(LIFE_OS_DATABASES.recipes, {})` — household Recipes DB is small (under 100 entries), one call replaces 10-15 individual retrievePage calls
      - If `LIFE_OS_DATABASES.recipes` is not configured, return immediately
      - Parse the results: build `Map<recipeId, { prepTime: number | null, cookTime: number | null }>` by iterating pages, extracting `extractNumber(page.properties[RECIPE_PROPS.prepTime])` and `extractNumber(page.properties[RECIPE_PROPS.cookTime])` — use the `extractNumber()` helper already in the file
      - For each meal with recipeIds: look up the FIRST recipe ID in the map, merge its prepTime/cookTime onto the meal object
      - Any failure in the query → log warning, return (meals proceed with null times)
    - Call `resolveRecipeTimesForMeals(allMeals)` after `parseMealPlanResults()` (line ~176), BEFORE filtering to todayMeals
    - Wrap in try/catch: if resolution fails entirely, meals still proceed with null times
    - Do NOT add this to the existing parallel Promise.all (it depends on parseMealPlanResults output — must run sequentially after it)

    **3. Extend PersonalMeal (personalStore.ts):**
    Add `prepTime: number | null` and `cookTime: number | null` to the PersonalMeal interface

    **4. Flow through transformMeals (useJarvisFetch.ts):**
    In the transformMeals function, map `meal.prepTime ?? null` and `meal.cookTime ?? null`

    **5. Display in MealRow (MealsView.tsx):**
    - Import `Clock` from lucide-react
    - After the servings display block (the `{meal.servings != null && ...}` span around line 124-129):
      - Calculate: `const totalTime = (meal.prepTime ?? 0) + (meal.cookTime ?? 0)`
      - If `totalTime > 0`: render `<span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0"><Clock size={12} />{totalTime}m</span>`
      - Same styling as the servings display (consistent visual weight)
    - Do NOT change tab structure, empty states, or DaySection layout

    **6. Enrich PersonalDashboard stat (PersonalDashboard.tsx):**
    The current Meals card stat (line ~72-79) shows `"${todayMeals} planned today"` or `"No meals planned"`.
    Replace with dinner-aware logic:
    - Find tonight's dinner: `const dinner = meals.filter(m => m.dayOfWeek === todayDayName).find(m => m.timeOfDay?.toLowerCase().includes('dinner'))`
    - Calculate total time: `const totalTime = dinner ? (dinner.prepTime ?? 0) + (dinner.cookTime ?? 0) : 0`
    - Stat logic:
      - If dinner found: `"${dinner.name}${totalTime > 0 ? ` — ${totalTime}m` : ''}"` (e.g., "Stir-Fry — 45m")
      - Else if todayMeals > 0: `"${todayMeals} planned today"` (fallback to current)
      - Else: `"No meals planned"` (current)
    - `todayDayName` can be computed the same way as MealsView does it (check existing pattern in the file for getting the current day name)
  </action>
  <verify>npm run build — zero errors; MealPlanSummary has prepTime + cookTime; MealRow renders time; PersonalDashboard shows dinner name</verify>
  <done>AC-1 satisfied: prep + cook times flow from Notion recipes through BriefingBuilder → store → MealsView + PersonalDashboard. AC-4 partially satisfied: null handling at every layer, recipe DB failure doesn't block briefing, dashboard degrades to count.</done>
</task>

<task type="auto">
  <name>Task 2: Full-Week Meal Awareness in Chat System Prompt</name>
  <files>
    src/lib/jarvis/telegram/context.ts,
    src/lib/jarvis/intelligence/systemPrompt.ts
  </files>
  <action>
    **1. Add mealContext to SystemPromptContext (systemPrompt.ts, line ~37):**
    Add field: `mealContext?: string | null` with JSDoc: `/** This week's meal plan context for proactive awareness */`

    **2. Create fetchWeeklyMealContext helper (context.ts):**
    - Import `queryDatabase` from `'../notion/NotionClient'`
    - Import `LIFE_OS_DATABASES`, `MEAL_PLAN_PROPS`, `RECIPE_PROPS` from `'../notion/schemas'`
    - Create async function `fetchWeeklyMealContext(timezone?: string): Promise<string | null>`:

      **Step A — Get today's day name and ordered day list:**
      - Use `new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone || 'UTC' })` for today
      - Build ordered days array starting from today: e.g., if today is Wednesday → [Wednesday, Thursday, Friday, Saturday, Sunday, Monday, Tuesday]

      **Step B — Query all meals (one call):**
      - If `LIFE_OS_DATABASES.mealPlan` not configured, return null
      - Query entire meal plan DB: `queryDatabase(LIFE_OS_DATABASES.mealPlan, {})` (same pattern as BriefingBuilder's queryAllMealsSafe)
      - Parse results into simplified meal objects: `{ title, dayOfWeek, timeOfDay, setting, servings, recipeIds }` using same property extraction pattern as BriefingBuilder (extractTitle, extractSelect, extractNumber, extractRelationIds — inline the extraction since these helpers aren't exported from BriefingBuilder)

      **Step C — Resolve recipe times for today's meals only (lightweight):**
      - Filter to today's meals
      - Collect unique recipeIds from today's meals only (1-3 recipes max)
      - For each, call `retrievePage(recipeId)` via Promise.allSettled (import from NotionClient)
      - Extract prepTime + cookTime from RECIPE_PROPS
      - This is 1-3 API calls, acceptable for chat latency

      **Step D — Format the full week:**
      - For each day in the ordered list:
        - Find meals for that day, sorted by TIME_ORDER (Breakfast=0, Lunch=1, Dinner=2)
        - If today: format with full detail including resolved prep/cook times and setting-aware hints
        - If other day with meals: format with name + setting only (e.g., "Pasta Carbonara (dinner, Home)")
        - If day has no meals: format as "(nothing planned)"
      - Format today's dinner separately with setting-aware detail:
        - **Home (or null setting):** `"Tonight's dinner: {title} ({servings} servings) — {totalTime}min total ({prepTime}min prep + {cookTime}min cook). Home cooking: consider when to start prep given current time."`
        - **Dine-Out:** `"Tonight's dinner: {title} ({servings} people) — dining out. Consider travel time and reservation."`
        - **Takeout:** `"Tonight's dinner: {title} ({servings} servings) — takeout. Consider order lead time."`
        - Omit details that are null (no servings → skip, no times → skip timing)
      - If ZERO meals across the entire week: return null (no section at all)

      **Step E — Combine into context string:**
      ```
      Week overview (starting today):
      - Wednesday: Chicken Stir-Fry (dinner, Home)
      - Thursday: (nothing planned)
      - Friday: Pasta Carbonara (dinner, Home), Smoothie Bowl (breakfast)
      ...

      Tonight's dinner: Chicken Stir-Fry (4 servings) — 45min total (15min prep + 30min cook). Home cooking: consider when to start prep given current time.
      ```
      - Return the combined string
      - Entire function wrapped in try/catch → return null on any failure

    **3. Add 5th parallel fetch to buildSystemPromptContext (context.ts, line ~49):**
    - Add `fetchWeeklyMealContext(options?.timezone)` to the Promise.all array
    - Destructure as 5th result: `mealContextResult`
    - Add `mealContext: mealContextResult || undefined` to the returned object (line ~113)
    - Match the existing error-handling pattern: `.catch(err => { console.error('[Context] Meal context failed:', err); return null; })`

    **4. Add THIS WEEK'S MEALS section to buildSystemPrompt (systemPrompt.ts):**
    - Place after CURRENT CONTEXT section (around line 137) and before CONVERSATION STYLE
    - Only render when `context.mealContext` is truthy:
      ```
      ## THIS WEEK'S MEALS
      ${context.mealContext}

      IMPORTANT: Do NOT volunteer meal information unprompted. This context is for YOUR reasoning, not for announcing. Use it when:
      - The user asks about evening plans, cooking, timing, or "what's for dinner"
      - The user discusses scheduling and meal prep time is relevant
      - You notice empty days and the user is in a meal-planning conversation
      For Home meals, think about when prep should start given the current time. For empty days, you can suggest filling them — but only when the conversation is about meals or planning.
      ```
    - Do NOT render an empty section or "no meals this week" — absence means no data, silence is correct

    **Architectural notes:**
    - One Notion query for all meals + 1-3 retrievePage calls for today's recipes = lightweight
    - Runs in parallel with 4 other fetches — adds zero sequential latency
    - Full week context enables an entire class of proactive behavior (suggesting meals for empty days, noticing variety, upcoming Dine-Out reminders) that tonight-only context cannot
    - The explicit "don't announce" guardrail prevents Jarvis from being annoying — the context is a quiet awareness, not a trigger
  </action>
  <verify>npm run build — zero errors; SystemPromptContext has mealContext; THIS WEEK'S MEALS section renders conditionally with full week + tonight detail</verify>
  <done>AC-2 satisfied: every chat includes full week meal context with setting-aware hints and explicit non-announcement guardrail. AC-4 partially satisfied: failures return null, chat unaffected.</done>
</task>

<task type="auto">
  <name>Task 3: Claude-Reasoned Shopping List with Rich Context + Itemized Response</name>
  <files>
    src/lib/jarvis/intelligence/tools.ts,
    src/lib/jarvis/notion/toolExecutor.ts
  </files>
  <action>
    **1. Add target_servings parameter to tool definition (tools.ts, line ~432-448):**
    - Add to generate_shopping_list's input_schema.properties:
      ```
      target_servings: {
        type: 'number',
        description: 'Target servings to scale recipes to. Overrides individual meal plan servings for quantity calculations.'
      }
      ```
    - Keep existing parameters (days, check_pantry) unchanged

    **2. Enhance generate_shopping_list in toolExecutor (toolExecutor.ts, lines 786-890):**

    **2a. Extract RICH recipe context from already-retrieved pages (modify lines 814-825):**

    The current loop calls `getIngredientNamesForRecipe(rel.id)` which already calls `retrievePage(recipeId)` internally to get the recipe page — but it only extracts ingredient relations and discards everything else. Refactor to extract more:

    - Create a new helper `getRecipeDetailsForShoppingList(recipeId: string): Promise<{ ingredientNames: string[], category: string | null, difficulty: string | null, prepTime: number | null, cookTime: number | null }>`:
      - Calls `retrievePage(recipeId)` (same as getIngredientNamesForRecipe does)
      - Extracts ingredient names (same logic as current getIngredientNamesForRecipe — resolve relation → resolveIngredientNames)
      - ALSO extracts from the same page: `RECIPE_PROPS.category` (select), `RECIPE_PROPS.difficulty` (select), `RECIPE_PROPS.prepTime` (number), `RECIPE_PROPS.cookTime` (number)
      - Returns all of it. Zero additional API calls — same retrievePage, more extraction.
      - Try/catch: on failure, return `{ ingredientNames: [], category: null, difficulty: null, prepTime: null, cookTime: null }`

    - Modify the extraction loop (lines 814-825) to collect per-recipe context:
      - Instead of just `allIngredientNames: Set<string>`, also build:
        ```typescript
        interface RecipeContext {
          recipeName: string;       // from meal page title
          ingredientNames: string[];
          servings: number | null;  // from meal plan servings or target_servings param
          category: string | null;  // from recipe page
          difficulty: string | null;
          prepTime: number | null;
          cookTime: number | null;
        }
        const recipeContexts: RecipeContext[] = [];
        ```
      - For each meal page: extract title and servings from MEAL_PLAN_PROPS
      - For each recipe in the meal: call `getRecipeDetailsForShoppingList(rel.id)` instead of `getIngredientNamesForRecipe(rel.id)`
      - Still populate allIngredientNames (for fallback path)
      - target_servings param overrides individual meal servings when provided
      - Combine ingredient names from all recipes of the same meal into one RecipeContext entry

    **2b. Call Claude Haiku for intelligent quantity reasoning:**
    - Use lazy Anthropic singleton. Check if one exists in the codebase (search for `new Anthropic()` in `src/lib/jarvis/memory/consolidation.ts` or `summarization.ts`). If a `getAnthropicClient()` helper or lazy singleton exists, import and reuse it. If not, create the pattern locally:
      ```typescript
      let anthropicClient: Anthropic | null = null;
      function getAnthropicClient(): Anthropic {
        if (!anthropicClient) anthropicClient = new Anthropic();
        return anthropicClient;
      }
      ```
    - After building recipeContexts and before pantry check, call Claude:
      ```typescript
      const client = getAnthropicClient();
      const quantityResponse = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: `You are a professional chef generating a consolidated shopping list. Given recipes with context, produce a shopping list with accurate quantities.

Rules:
1. Aggregate identical ingredients across recipes (e.g., onions needed for 2 recipes → combined total).
2. Spices and seasonings scale SUB-LINEARLY — do NOT double garlic or cumin for double servings. Use chef's intuition.
3. Proteins, carbs, and produce scale linearly with servings.
4. Round to practical shopping quantities (nobody buys 2.3 onions — round to 3).
5. Use common units: g, kg, ml, L, pieces, cans, bunches, heads, cloves, tbsp, tsp.
6. Assign each item a category from EXACTLY these options: Produce, Dairy, Meat, Pantry Staples, Frozen, Spices, Beverages, Condiments, Grains, Other.

Respond with ONLY a JSON array, no other text:
[{"name": "...", "quantity": N, "unit": "...", "category": "..."}]`,
        messages: [{
          role: 'user',
          content: `Generate a shopping list for these meals:\n\n${recipeContexts.map(r => {
            let desc = `- ${r.recipeName}`;
            if (r.servings) desc += ` (${r.servings} servings)`;
            if (r.category) desc += ` [${r.category}]`;
            if (r.prepTime || r.cookTime) desc += ` (${r.prepTime ?? 0}+${r.cookTime ?? 0}min)`;
            desc += `: ${r.ingredientNames.join(', ')}`;
            return desc;
          }).join('\n')}`
        }]
      });
      ```
    - Parse the response: extract text content block, strip markdown code fences if present (`content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()`), `JSON.parse`
    - Validate: must be array, each item must have name (string), quantity (number), unit (string), category (string)
    - If valid: set `claudeItems = parsed` (use for shopping list creation)
    - If invalid or any error: log warning, set `claudeItems = null` (fall back to current name-only behavior)

    **2c. Apply quantitative pantry subtraction (enhance lines 830-850):**
    - If `claudeItems` is available (Claude reasoning succeeded):
      - Build pantry map same as current (line 838): `Map<lowercase name, PantryItem>`
      - For each Claude item:
        - Check pantry by name (case-insensitive)
        - If pantry has item AND units are compatible (same unit string, case-insensitive): subtract pantry quantity from Claude quantity. If result <= 0: mark as skipped (fully stocked). If result > 0: use reduced quantity.
        - If pantry has item but units differ: keep Claude's full quantity (conservative — don't guess unit conversion)
        - If pantry doesn't have item: keep Claude's full quantity
      - Track: `skippedFromPantry` count, `adjustedItems` array (items to create)
    - If `claudeItems` is null (fallback): use current boolean pantry check unchanged (lines 840-847)

    **2d. Dedup against existing shopping list (enhance lines 856-867):**
    - Same name-based dedup as current, applied to both Claude items and fallback items

    **2e. Create shopping list items with quantities (enhance lines 870-883):**
    - If Claude items available: when calling `createPage`, set ALL properties:
      ```typescript
      {
        [SHOPPING_LIST_PROPS.title]: { title: [{ text: { content: item.name } }] },
        [SHOPPING_LIST_PROPS.quantity]: { number: item.quantity },
        [SHOPPING_LIST_PROPS.unit]: { select: { name: item.unit } },
        [SHOPPING_LIST_PROPS.category]: { select: { name: item.category } },
        [SHOPPING_LIST_PROPS.checked]: { checkbox: false },
        [SHOPPING_LIST_PROPS.source]: { select: { name: 'Meal Plan' } },
      }
      ```
    - If fallback mode: use current behavior (Name + Checked + Source only)
    - Track added items for the response

    **2f. Return ITEMIZED response (enhance lines 886-889):**
    - If Claude items were used, return a rich response:
      ```
      Added {N} items to your shopping list:
      {for each added item: "- {name}: {quantity} {unit} ({category})"}

      {if skippedFromPantry > 0: "Skipped {N} items already in pantry: {names}"}
      {if skippedExisting > 0: "Skipped {N} items already on list"}
      ```
    - If fallback mode: use current response format (backward compatible)
    - This gives the outer Claude rich material to present to the user

    **2g. Wrap entire Claude reasoning path in try/catch:**
    - Any error in steps 2b-2f → log warning `[ToolExecutor] Claude shopping reasoning failed, using fallback:`, set `claudeItems = null`, continue with current J-01 behavior
    - The tool NEVER fails because of Claude reasoning — it always degrades gracefully

    **Avoid:**
    - Changing the overall flow structure (query → extract → pantry → dedup → create)
    - Modifying other meal tools (query_meal_plan, create_recipe, etc.)
    - Adding new tool definitions (target_servings goes on existing tool)
    - Removing existing getIngredientNamesForRecipe (keep it, other code may use it)
  </action>
  <verify>npm run build — zero errors; generate_shopping_list tool has target_servings param; toolExecutor extracts rich recipe context from already-retrieved pages; calls Claude Haiku; creates items with quantities; returns itemized list</verify>
  <done>AC-3 satisfied: shopping list items have Claude-reasoned quantities from rich recipe context with intelligent scaling and itemized response. AC-4 satisfied: Claude failure gracefully falls back to name-only items with current response format.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Tab structure in MealsView (4 tabs: Weekly, Shopping, Pantry, Recipes)
- Empty state CTAs (polished in J-03 — chat prompts, button text, icons)
- Existing 6 meal tools (query_meal_plan, create_recipe, query_shopping_list, update_pantry, query_pantry, clear_shopping_list)
- Chat route structure (src/app/api/jarvis/chat/route.ts) — context flows through existing buildSystemPromptContext
- Briefing API route (src/app/api/jarvis/briefing/route.ts)
- PersonalDashboard card layout/structure (only the stat string changes)
- Any non-meal code (bills, tasks, calendar, habits, memory, self-improvement)
- getIngredientNamesForRecipe function (keep it, add new helper alongside it)

## SCOPE LIMITS
- Vision input framework is v4.4 scope — do NOT add image handling
- Proactive notifications (Telegram push for meal timing) are future scope — system prompt context only
- Phase D meal preference learning is future scope — no rule creation or evaluation changes
- Meal editing in UI is not in scope — display remains read-only
- Shopping list item management (check/uncheck in UI) is not in scope
- Full recipe browser/detail views in UI are not in scope
- Recipe quantity storage in Notion (per-recipe ingredient amounts) is not in scope — Claude reasons from recipe name + ingredient names + rich context
- Unit conversion between pantry and shopping list is not in scope — conservative approach (same-unit subtraction only)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` — zero errors, zero warnings
- [ ] MealPlanSummary interface has prepTime and cookTime fields
- [ ] PersonalMeal interface has prepTime and cookTime fields
- [ ] BriefingBuilder queries Recipes DB ONCE (not N retrievePage calls) and merges prep/cook times
- [ ] MealRow displays total time with Clock icon when data exists, nothing when null
- [ ] PersonalDashboard stat shows dinner name + time when available, degrades to count
- [ ] SystemPromptContext interface has mealContext field
- [ ] buildSystemPromptContext fetches weekly meal context as 5th parallel operation
- [ ] buildSystemPrompt renders THIS WEEK'S MEALS section when mealContext is truthy
- [ ] Full week is shown (all 7 days starting from today), empty days marked
- [ ] Tonight's dinner has full setting-aware detail (Home/Dine-Out/Takeout formatting)
- [ ] Explicit "do NOT volunteer meal info unprompted" guardrail in prompt
- [ ] generate_shopping_list tool definition includes target_servings parameter
- [ ] getRecipeDetailsForShoppingList extracts category, difficulty, prepTime, cookTime from already-retrieved pages (zero additional API calls)
- [ ] toolExecutor calls Claude Haiku with rich recipe context
- [ ] Shopping list items created with quantity, unit, and category from Claude output
- [ ] Tool returns itemized list with quantities and categories
- [ ] Fallback: recipe DB query failure → null times, meals still load
- [ ] Fallback: meal context fetch failure → null, system prompt omits section
- [ ] Fallback: Claude reasoning failure → name-only shopping items + current response format (J-01 behavior)
</verification>

<success_criteria>
- All 3 tasks completed
- All 5 acceptance criteria satisfied
- Build clean (zero errors, zero warnings)
- No regressions to J-01 through J-03 functionality
- Graceful degradation verified at all three new integration points
- v4.2 milestone ready for completion
</success_criteria>

<output>
After completion, create `.paul/phases/J-meal-planning/J-04-SUMMARY.md`
</output>
