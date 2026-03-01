# J-01: Backend Foundation — Meal Planning Tools

```yaml
---
phase: J-meal-planning
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/notion/schemas.ts
  - src/lib/jarvis/intelligence/tools.ts
  - src/lib/jarvis/notion/toolExecutor.ts
  - src/lib/jarvis/notion/recentResults.ts
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - .env.example
autonomous: false
---
```

## Goal

Enable conversational meal planning in Jarvis — save recipes, plan weekly meals, manage a shopping list, and track pantry inventory — all through natural language with Claude tools.

## What Exists (Verified Against Current Codebase)

The codebase is ~60% ready. Here's what's real:

**schemas.ts — Already exists:**
- `RECIPE_PROPS` (L127-139): title, category, difficulty, rating, prepTime, cookTime, url, favourite, kcal, tags, ingredients
- `MEAL_PLAN_PROPS` (L145-151): title, dayOfWeek, recipes, timeOfDay, setting
- `INGREDIENT_PROPS` (L171-173): title only
- `SHOPPING_LIST_PROPS` (L178-180): title only — **needs enhancement** (quantity, unit, category, checked, source)
- `LIFE_OS_DATABASES` (L26-37): has recipes, mealPlan, subscriptions, ingredients — **missing pantry, shoppingList**
- `LIFE_OS_DATABASE_IDS` (L40-45): has tasks, subscriptions, mealPlan, shoppingList — **missing pantry, ingredients, recipes**
- `RecipeProperties` (L270-280): exists
- `MealPlanProperties` (L285-291): exists
- `buildRecipeFilter()` (L1023-1087): exists
- `formatRecipeResults()` (L1116-1142): exists
- `formatMealPlanResults()` (L1177-1197): exists
- Property extractors (L511-543): extractTitle, extractSelect, extractDate, extractNumber, extractCheckbox, extractUrl, extractFormula, extractRichText — all exist

**schemas.ts — Missing (must build):**
- `PANTRY_PROPS` constant
- `PantryProperties` interface
- `ShoppingListProperties` interface
- `buildMealPlanFilter()` — filter by day/meal type
- `buildPantryFilter()` — filter by category/search
- `buildShoppingListFilter()` — filter by checked status
- `formatPantryResults()` — speech-friendly pantry output
- `formatShoppingListResults()` — checklist-style output
- `parsePantryResults()` — structured data for generate_shopping_list

**tools.ts — Already exists:**
- `query_recipes` (L298-324): read tool, fully defined
- `add_to_meal_plan` (L325-353): write tool, fully defined
- `getAllTools()` (L477-484): returns `[...notionTools, ...calendarTools, ...memoryTools, ...tutorialTools]`

**tools.ts — Missing (must build):**
- 7 new tool definitions: query_meal_plan, create_recipe, query_shopping_list, update_pantry, query_pantry, generate_shopping_list, clear_shopping_list

**toolExecutor.ts — Already exists:**
- `query_recipes` handler (L542-565): queries recipes DB, uses buildRecipeFilter, caches results
- `add_to_meal_plan` handler (L567-629): creates meal plan entry, resolves recipe by name, auto-adds ingredients to shopping list
- `resolveRecipeIdByName()` (L894-914): finds recipe in cache or queries DB
- `getIngredientNamesForRecipe()` (L916-933): extracts ingredient relation from recipe
- `resolveIngredientNames()` (L935-957): fetches ingredient page details
- `resolveIngredientIds()` (L869-892): searches ingredients by name
- `addItemsToShoppingList()` (L977-1002): writes string[] to shopping list — **needs enhancement** for rich objects
- `cacheQueryResults()` (L780-818): caches query results by type
- `TITLE_PROPS` map (L765-772): maps type → property name — **needs expansion** for new types
- `summarizeNotionContext()` (L118-143): audit log context — **needs new tool cases**

**toolExecutor.ts — Missing (must build):**
- 7 new case handlers in `executeNotionToolInner()`
- `findOrCreateIngredients()` helper for recipe creation

**recentResults.ts — Current state:**
- `CachedItem.type` (L13-17): `'task' | 'bill' | 'project' | 'goal' | 'habit' | 'recipe'` — **needs 'mealPlan'**
- Finder functions: findTaskByTitle, findBillByTitle, findProjectByTitle, findGoalByTitle, findHabitByTitle, findRecipeByTitle

**systemPrompt.ts — Current state:**
- `CAPABILITIES` section (L289-294): lists tasks, bills, projects, goals, habits — **no meal planning mentioned**

**.env.example — Current state (L159-184):**
- Has: NOTION_RECIPES_DATA_SOURCE_ID, NOTION_MEAL_PLAN_DATA_SOURCE_ID, NOTION_MEAL_PLAN_DATABASE_ID, NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID, NOTION_INGREDIENTS_DATA_SOURCE_ID, NOTION_SHOPPING_LIST_DATABASE_ID
- **Missing:** NOTION_RECIPES_DATABASE_ID, NOTION_INGREDIENTS_DATABASE_ID, NOTION_SHOPPING_LIST_DATA_SOURCE_ID, NOTION_PANTRY_DATA_SOURCE_ID, NOTION_PANTRY_DATABASE_ID

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Pantry as new Notion database | No existing DB tracks inventory. Properties: Name, Quantity, Unit, Category, Expiry Date, Low Stock Threshold |
| Shopping list enhanced, not replaced | Existing `addItemsToShoppingList()` upgraded from bare names to `{ name, quantity, unit, category }` |
| `generate_shopping_list` = killer feature | Queries meal plan ingredients, subtracts pantry stock, writes the delta |
| `create_recipe` with ingredient auto-linking | Parses comma-separated ingredients, find-or-create each in Ingredients DB, sets relation |
| Upsert pattern for pantry | `update_pantry` searches by name first (fuzzy), updates if found, creates if not. "We're out of milk" = quantity 0, not delete |
| Reuse existing infrastructure | `query_recipes` and `add_to_meal_plan` work — only add what's missing |
| No `servings` property | RECIPE_PROPS doesn't have servings. Dropping from create_recipe tool to match Notion schema |
| Sequential Notion API in generate_shopping_list | Notion rate limits are tight; shopping list generation is not latency-sensitive |
| Type safety via existing patterns | All Notion results cast through `(result as { results?: unknown[] })?.results || []` — matching codebase convention |

## Blocker (Human Action Required Before Execution)

Jonathan must:

1. **Create Pantry database in Notion** with properties:
   - Name (title)
   - Quantity (number)
   - Unit (select: g, kg, oz, lb, ml, L, cups, pieces, cans, bottles)
   - Category (select: Produce, Dairy, Meat, Pantry Staples, Frozen, Spices, Beverages, Condiments, Grains, Other)
   - Expiry Date (date)
   - Low Stock Threshold (number)

2. **Verify Shopping List database** has these properties (create if missing):
   - Name (title) — exists
   - Quantity (number) — may need to add
   - Unit (select) — may need to add
   - Category (select: Produce, Dairy, Meat, etc.) — may need to add
   - Checked (checkbox) — may need to add
   - Source (select: Manual, Meal Plan) — may need to add

3. **Grant Jarvis integration access** to: Pantry (new), Shopping List, Recipes, Meal Plan, Ingredients

4. **Set env vars in Vercel:**
   - `NOTION_RECIPES_DATABASE_ID` — for createPage writes to Recipes
   - `NOTION_INGREDIENTS_DATABASE_ID` — for find-or-create ingredient pages
   - `NOTION_SHOPPING_LIST_DATA_SOURCE_ID` — for queryDatabase reads of Shopping List
   - `NOTION_PANTRY_DATA_SOURCE_ID` — for queryDatabase reads of Pantry
   - `NOTION_PANTRY_DATABASE_ID` — for createPage/updatePage writes to Pantry

**Resume signal:** Type "done" when databases are created and env vars are set. Or "skip" to proceed with code — tools will gracefully degrade until configured.

## Tasks

### Task 1: Extend Notion Schemas

**File: `src/lib/jarvis/notion/schemas.ts`**

**1a. Add PANTRY_PROPS constant** (after SHOPPING_LIST_PROPS, ~L180):
```typescript
export const PANTRY_PROPS = {
  title: 'Name',
  quantity: 'Quantity',
  unit: 'Unit',
  category: 'Category',
  expiryDate: 'Expiry Date',
  lowStockThreshold: 'Low Stock Threshold',
} as const;
```

**1b. Enhance SHOPPING_LIST_PROPS** (replace L178-180):
```typescript
export const SHOPPING_LIST_PROPS = {
  title: 'Name',
  quantity: 'Quantity',
  unit: 'Unit',
  category: 'Category',
  checked: 'Checked',
  source: 'Source',
} as const;
```

**1c. Add PantryProperties interface** (after MealPlanProperties, ~L291):
```typescript
export interface PantryProperties {
  id: string;
  title: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  lowStockThreshold: number;
}
```

**1d. Add ShoppingListProperties interface** (after PantryProperties):
```typescript
export interface ShoppingListProperties {
  id: string;
  title: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
  source: string | null;
}
```

**1e. Add to LIFE_OS_DATABASES** (L26-37, add after `ingredients`):
```typescript
pantry: process.env.NOTION_PANTRY_DATA_SOURCE_ID || '',
shoppingList: process.env.NOTION_SHOPPING_LIST_DATA_SOURCE_ID || '',
```

**1f. Add to LIFE_OS_DATABASE_IDS** (L40-45, add after `shoppingList`):
```typescript
pantry: process.env.NOTION_PANTRY_DATABASE_ID || '',
ingredients: process.env.NOTION_INGREDIENTS_DATABASE_ID || '',
recipes: process.env.NOTION_RECIPES_DATABASE_ID || '',
```

**1g. Add buildMealPlanFilter()** (after buildRecipeFilter, ~L1087):
```typescript
export function buildMealPlanFilter(options: {
  dayOfWeek?: string;
  timeOfDay?: string;
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  if (options.dayOfWeek) {
    filters.push({
      property: MEAL_PLAN_PROPS.dayOfWeek,
      select: { equals: options.dayOfWeek },
    });
  }
  if (options.timeOfDay) {
    filters.push({
      property: MEAL_PLAN_PROPS.timeOfDay,
      rich_text: { contains: options.timeOfDay },
    });
  }
  return filters.length > 0 ? { filter: { and: filters } } : {};
}
```

**1h. Add buildPantryFilter()** (after buildMealPlanFilter):
```typescript
export function buildPantryFilter(options: {
  category?: string;
  search?: string;
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  if (options.category) {
    filters.push({
      property: PANTRY_PROPS.category,
      select: { equals: options.category },
    });
  }
  if (options.search) {
    filters.push({
      property: PANTRY_PROPS.title,
      title: { contains: options.search },
    });
  }
  return filters.length > 0 ? { filter: { and: filters } } : {};
}
```

**1i. Add buildShoppingListFilter()** (after buildPantryFilter):
```typescript
export function buildShoppingListFilter(options: {
  showChecked?: boolean;
}): { filter?: { property: string; checkbox: { equals: boolean } } } | Record<string, never> {
  if (options.showChecked === false) {
    return {
      filter: {
        property: SHOPPING_LIST_PROPS.checked,
        checkbox: { equals: false },
      },
    };
  }
  return {};
}
```

**1j. Add formatPantryResults()** (after formatMealPlanResults, ~L1197):
```typescript
export function formatPantryResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'Pantry is empty.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[PANTRY_PROPS.title]);
    const quantity = extractNumber(p.properties[PANTRY_PROPS.quantity]);
    const unit = extractSelect(p.properties[PANTRY_PROPS.unit]);
    const category = extractSelect(p.properties[PANTRY_PROPS.category]);
    const threshold = extractNumber(p.properties[PANTRY_PROPS.lowStockThreshold]);
    const lowStock = threshold > 0 && quantity <= threshold;

    let line = `- ${title}: ${quantity}`;
    if (unit && unit !== 'Unknown') line += ` ${unit}`;
    if (category && category !== 'Unknown') line += ` (${category})`;
    if (lowStock) line += ' — LOW STOCK';
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}
```

**1k. Add formatShoppingListResults()** (after formatPantryResults):
```typescript
export function formatShoppingListResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'Shopping list is empty.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[SHOPPING_LIST_PROPS.title]);
    const quantity = extractNumber(p.properties[SHOPPING_LIST_PROPS.quantity]);
    const unit = extractSelect(p.properties[SHOPPING_LIST_PROPS.unit]);
    const category = extractSelect(p.properties[SHOPPING_LIST_PROPS.category]);
    const checked = extractCheckbox(p.properties[SHOPPING_LIST_PROPS.checked]);

    const quantityStr = quantity > 0 ? `${quantity}${unit && unit !== 'Unknown' ? ` ${unit}` : ''}` : '';
    let line = `- [${checked ? 'x' : ' '}] ${title}`;
    if (quantityStr) line += ` (${quantityStr})`;
    if (category && category !== 'Unknown') line += ` — ${category}`;
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}
```

**1l. Add parsePantryResults()** (after formatShoppingListResults — returns structured data for generate_shopping_list):
```typescript
export function parsePantryResults(result: unknown): PantryProperties[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const unitVal = extractSelect(p.properties[PANTRY_PROPS.unit]);
    const categoryVal = extractSelect(p.properties[PANTRY_PROPS.category]);
    return {
      id: p.id,
      title: extractTitle(p.properties[PANTRY_PROPS.title]),
      quantity: extractNumber(p.properties[PANTRY_PROPS.quantity]),
      unit: unitVal !== 'Unknown' ? unitVal : null,
      category: categoryVal !== 'Unknown' ? categoryVal : null,
      expiryDate: extractDate(p.properties[PANTRY_PROPS.expiryDate]),
      lowStockThreshold: extractNumber(p.properties[PANTRY_PROPS.lowStockThreshold]),
    };
  });
}
```

**File: `.env.example`** — Add after existing Notion vars (~L184):
```
NOTION_RECIPES_DATABASE_ID=              # For createPage() writes to Recipes
NOTION_INGREDIENTS_DATABASE_ID=          # For find-or-create ingredient pages
NOTION_SHOPPING_LIST_DATA_SOURCE_ID=     # For queryDatabase() reads of Shopping List
NOTION_PANTRY_DATA_SOURCE_ID=            # For queryDatabase() reads of Pantry
NOTION_PANTRY_DATABASE_ID=               # For createPage()/updatePage() writes to Pantry
```

---

### Task 2: Add 7 New Claude Tool Definitions

**File: `src/lib/jarvis/intelligence/tools.ts`**

Add 7 new tool definitions to the `notionTools[]` array, after the existing `add_to_meal_plan` definition (L353) and before `get_subscriptions` (L354). This groups all meal planning tools together.

**2a. query_meal_plan** — Read tool:
```typescript
{
  name: 'query_meal_plan',
  description: 'Check what meals are planned. Use when the user asks "what\'s for dinner?", "what\'s on the meal plan?", "what are we eating this week?", or any question about planned meals.',
  input_schema: {
    type: 'object',
    properties: {
      day_of_week: {
        type: 'string',
        description: 'Filter by day. Omit to see the full week.',
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      meal_type: {
        type: 'string',
        description: 'Filter by meal type.',
        enum: ['Breakfast', 'Lunch', 'Dinner']
      }
    }
  }
},
```

**2b. create_recipe** — Write tool (critical bootstrapping tool):
```typescript
{
  name: 'create_recipe',
  description: 'Save a new recipe to the recipe database. Use when the user shares a recipe, says "save this recipe", "remember this recipe", or describes a dish they want to keep. Extract all details from their description.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Recipe name' },
      category: { type: 'string', description: 'Meal category', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] },
      difficulty: { type: 'string', description: 'Cooking difficulty', enum: ['Easy', 'Medium', 'Hard'] },
      prep_time: { type: 'number', description: 'Prep time in minutes' },
      cook_time: { type: 'number', description: 'Cook time in minutes' },
      kcal: { type: 'number', description: 'Calories per serving (if known)' },
      url: { type: 'string', description: 'Recipe URL or source link (if from web)' },
      favourite: { type: 'boolean', description: 'Mark as favourite' },
      tags: { type: 'string', description: 'Comma-separated tags (e.g., "quick,healthy,meal-prep")' },
      ingredients: { type: 'string', description: 'Comma-separated ingredient names (e.g., "chicken breast, soy sauce, garlic, rice")' }
    },
    required: ['name']
  }
},
```

**2c. query_shopping_list** — Read tool:
```typescript
{
  name: 'query_shopping_list',
  description: 'Check the shopping list. Use when the user asks "what do I need to buy?", "what\'s on the shopping list?", "grocery list", or anything about shopping.',
  input_schema: {
    type: 'object',
    properties: {
      show_checked: {
        type: 'boolean',
        description: 'Include already-checked items. Default false (only show unchecked).'
      }
    }
  }
},
```

**2d. update_pantry** — Write tool (upsert):
```typescript
{
  name: 'update_pantry',
  description: 'Update pantry inventory. Use when the user says "we bought X", "add X to pantry", "we\'re out of X", "we have X", or mentions restocking groceries. Set quantity to 0 for items they\'ve run out of.',
  input_schema: {
    type: 'object',
    properties: {
      item_name: { type: 'string', description: 'Ingredient/item name' },
      quantity: { type: 'number', description: 'Amount in stock (use 0 for out-of-stock)' },
      unit: { type: 'string', description: 'Unit of measurement', enum: ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'cups', 'pieces', 'cans', 'bottles'] },
      category: { type: 'string', description: 'Storage category', enum: ['Produce', 'Dairy', 'Meat', 'Pantry Staples', 'Frozen', 'Spices', 'Beverages', 'Condiments', 'Grains', 'Other'] },
      expiry_date: { type: 'string', description: 'Expiry date in YYYY-MM-DD format (for perishables)' }
    },
    required: ['item_name', 'quantity']
  }
},
```

**2e. query_pantry** — Read tool:
```typescript
{
  name: 'query_pantry',
  description: 'Check what\'s in the pantry/kitchen inventory. Use when the user asks "what do we have?", "do we have eggs?", "what\'s in the fridge?", "what\'s running low?", or asks about available ingredients.',
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category', enum: ['Produce', 'Dairy', 'Meat', 'Pantry Staples', 'Frozen', 'Spices', 'Beverages', 'Condiments', 'Grains', 'Other'] },
      low_stock_only: { type: 'boolean', description: 'Only show items at or below their low stock threshold' },
      search: { type: 'string', description: 'Search for a specific item by name' }
    }
  }
},
```

**2f. generate_shopping_list** — Smart compound tool:
```typescript
{
  name: 'generate_shopping_list',
  description: 'Generate a smart shopping list from the meal plan. Queries all planned recipes\' ingredients, subtracts what\'s already in the pantry, and adds only what\'s needed to the shopping list. Use when the user says "generate shopping list", "what do I need to buy for this week?", or "make a grocery list from the meal plan".',
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'string',
        description: 'Comma-separated days to generate for (e.g., "Monday,Tuesday,Wednesday"). Omit for the full week.'
      },
      check_pantry: {
        type: 'boolean',
        description: 'Subtract pantry stock from needed ingredients. Default true.'
      }
    }
  }
},
```

**2g. clear_shopping_list** — Write tool:
```typescript
{
  name: 'clear_shopping_list',
  description: 'Manage shopping list items. Use when the user says "clear checked items", "mark everything as bought", or "reset shopping list".',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'What to do',
        enum: ['check_all', 'clear_checked']
      }
    },
    required: ['action']
  }
},
```

---

### Task 3: Implement Tool Executors

**File: `src/lib/jarvis/notion/toolExecutor.ts`**

**3a. Add imports** — extend the imports from `./schemas` (L12-43):

Add to the existing import block:
```typescript
buildMealPlanFilter,
buildPantryFilter,
buildShoppingListFilter,
formatPantryResults,
formatShoppingListResults,
parsePantryResults,
PANTRY_PROPS,
PantryProperties,
```

**3b. Update summarizeNotionContext()** (L118-143) — add cases for new tools:
```typescript
case 'query_meal_plan':
  return `Queried meal plan${input.day_of_week ? ` for ${input.day_of_week}` : ''}`;
case 'create_recipe':
  return `Created recipe: "${input.name}"`;
case 'query_shopping_list':
  return 'Queried shopping list';
case 'update_pantry':
  return `Updated pantry: "${input.item_name}" → ${input.quantity}`;
case 'query_pantry':
  return `Queried pantry${input.search ? ` for "${input.search}"` : ''}`;
case 'generate_shopping_list':
  return 'Generated shopping list from meal plan';
case 'clear_shopping_list':
  return `Shopping list: ${input.action}`;
```

**3c. Expand TITLE_PROPS map** (L765-772) — add new cache types:
```typescript
const TITLE_PROPS: Record<CachedItem['type'], string> = {
  task: 'Name',
  bill: 'Bill',
  project: 'Project',
  goal: 'Goal',
  habit: 'Habit',
  recipe: 'Name',
  mealPlan: 'Name',   // <-- ADD
};
```

**3d. Add 7 case handlers** in `executeNotionToolInner()` (L148-753), after the `add_to_meal_plan` handler (L629) and before `get_subscriptions` (L631):

**query_meal_plan:**
```typescript
case 'query_meal_plan': {
  const dataSourceId = LIFE_OS_DATABASES.mealPlan;
  if (!dataSourceId) {
    return 'Meal plan database is not configured. Please set NOTION_MEAL_PLAN_DATA_SOURCE_ID.';
  }

  const filterOptions = buildMealPlanFilter({
    dayOfWeek: input.day_of_week as string | undefined,
    timeOfDay: input.meal_type as string | undefined,
  });

  const result = await queryDatabase(dataSourceId, filterOptions);
  cacheQueryResults(result, 'mealPlan');
  return formatMealPlanResults(result);
}
```

**create_recipe:**
```typescript
case 'create_recipe': {
  const databaseId = LIFE_OS_DATABASE_IDS.recipes;
  if (!databaseId) {
    return 'Recipes database is not configured. Please set NOTION_RECIPES_DATABASE_ID.';
  }

  const name = input.name as string;
  const properties: Record<string, unknown> = {
    [RECIPE_PROPS.title]: { title: [{ text: { content: name } }] },
  };

  if (input.category) properties[RECIPE_PROPS.category] = { select: { name: input.category as string } };
  if (input.difficulty) properties[RECIPE_PROPS.difficulty] = { select: { name: input.difficulty as string } };
  if (input.prep_time) properties[RECIPE_PROPS.prepTime] = { number: input.prep_time as number };
  if (input.cook_time) properties[RECIPE_PROPS.cookTime] = { number: input.cook_time as number };
  if (input.kcal) properties[RECIPE_PROPS.kcal] = { number: input.kcal as number };
  if (input.url) properties[RECIPE_PROPS.url] = { url: input.url as string };
  if (input.favourite !== undefined) properties[RECIPE_PROPS.favourite] = { checkbox: input.favourite as boolean };
  if (input.tags) {
    const tags = (input.tags as string).split(',').map(t => ({ name: t.trim() }));
    properties[RECIPE_PROPS.tags] = { multi_select: tags };
  }

  // Handle ingredients: find-or-create each in Ingredients DB, then set relation
  let ingredientCount = 0;
  if (input.ingredients) {
    const ingredientNames = (input.ingredients as string).split(',').map(i => i.trim()).filter(Boolean);
    const ingredientPageIds = await findOrCreateIngredients(ingredientNames);
    if (ingredientPageIds.length > 0) {
      properties[RECIPE_PROPS.ingredients] = { relation: ingredientPageIds.map(id => ({ id })) };
      ingredientCount = ingredientPageIds.length;
    }
  }

  await createPage(databaseId, properties);
  return `Saved recipe: "${name}"${ingredientCount > 0 ? ` (${ingredientCount} ingredients linked)` : ''}`;
}
```

**query_shopping_list:**
```typescript
case 'query_shopping_list': {
  const dataSourceId = LIFE_OS_DATABASES.shoppingList;
  if (!dataSourceId) {
    return 'Shopping list database is not configured. Please set NOTION_SHOPPING_LIST_DATA_SOURCE_ID.';
  }

  const filterOptions = buildShoppingListFilter({
    showChecked: (input.show_checked as boolean) ?? false,
  });

  const result = await queryDatabase(dataSourceId, filterOptions);
  return formatShoppingListResults(result);
}
```

**update_pantry (upsert pattern):**
```typescript
case 'update_pantry': {
  const dataSourceId = LIFE_OS_DATABASES.pantry;
  const databaseId = LIFE_OS_DATABASE_IDS.pantry;
  if (!dataSourceId || !databaseId) {
    return 'Pantry database is not configured. Please set NOTION_PANTRY_DATA_SOURCE_ID and NOTION_PANTRY_DATABASE_ID.';
  }

  const itemName = input.item_name as string;
  const quantity = input.quantity as number;

  // Search for existing item by exact name
  const searchResult = await queryDatabase(dataSourceId, {
    filter: { property: PANTRY_PROPS.title, title: { equals: itemName } },
  });
  const existingPages = (searchResult as { results?: unknown[] })?.results || [];

  const properties: Record<string, unknown> = {
    [PANTRY_PROPS.quantity]: { number: quantity },
  };
  if (input.unit) properties[PANTRY_PROPS.unit] = { select: { name: input.unit as string } };
  if (input.category) properties[PANTRY_PROPS.category] = { select: { name: input.category as string } };
  if (input.expiry_date) properties[PANTRY_PROPS.expiryDate] = { date: { start: input.expiry_date as string } };

  if (existingPages.length > 0) {
    const existingId = (existingPages[0] as { id: string }).id;
    await updatePage(existingId, properties);
    return `Updated pantry: ${itemName} \u2192 ${quantity}${input.unit ? ` ${input.unit}` : ''}`;
  } else {
    properties[PANTRY_PROPS.title] = { title: [{ text: { content: itemName } }] };
    await createPage(databaseId, properties);
    return `Added to pantry: ${itemName} \u2014 ${quantity}${input.unit ? ` ${input.unit}` : ''}`;
  }
}
```

**query_pantry:**
```typescript
case 'query_pantry': {
  const dataSourceId = LIFE_OS_DATABASES.pantry;
  if (!dataSourceId) {
    return 'Pantry database is not configured. Please set NOTION_PANTRY_DATA_SOURCE_ID.';
  }

  const filterOptions = buildPantryFilter({
    category: input.category as string | undefined,
    search: input.search as string | undefined,
  });

  const result = await queryDatabase(dataSourceId, filterOptions);

  // Client-side low stock filtering (Notion can't compare two properties)
  if (input.low_stock_only) {
    const parsed = parsePantryResults(result);
    const lowStock = parsed.filter(p => p.lowStockThreshold > 0 && p.quantity <= p.lowStockThreshold);
    if (lowStock.length === 0) return 'No items are running low.';
    return lowStock.map(p =>
      `- ${p.title}: ${p.quantity}${p.unit ? ` ${p.unit}` : ''} (threshold: ${p.lowStockThreshold})`
    ).join('\n');
  }

  return formatPantryResults(result);
}
```

**generate_shopping_list (the killer feature):**
```typescript
case 'generate_shopping_list': {
  const mealPlanSourceId = LIFE_OS_DATABASES.mealPlan;
  const shoppingListDbId = LIFE_OS_DATABASE_IDS.shoppingList;
  const shoppingListSourceId = LIFE_OS_DATABASES.shoppingList;
  if (!mealPlanSourceId) return 'Meal plan database is not configured. Please set NOTION_MEAL_PLAN_DATA_SOURCE_ID.';
  if (!shoppingListDbId) return 'Shopping list database is not configured. Please set NOTION_SHOPPING_LIST_DATABASE_ID.';

  // 1. Query meal plan for specified days (or all)
  const days = input.days ? (input.days as string).split(',').map(d => d.trim()) : [];
  let mealPlanFilter = {};
  if (days.length === 1) {
    mealPlanFilter = buildMealPlanFilter({ dayOfWeek: days[0] });
  }
  const mealPlanResult = await queryDatabase(mealPlanSourceId, mealPlanFilter);
  let mealPages = (mealPlanResult as { results?: unknown[] })?.results || [];

  // Client-side filter if multiple specific days requested
  if (days.length > 1) {
    mealPages = mealPages.filter((page: unknown) => {
      const p = page as { properties: Record<string, unknown> };
      const day = extractSelect(p.properties[MEAL_PLAN_PROPS.dayOfWeek]);
      return days.includes(day);
    });
  }

  if (mealPages.length === 0) return 'No meals planned. Add meals to your plan first.';

  // 2. For each meal with a recipe relation, get ingredient names
  const allIngredientNames = new Set<string>();
  for (const page of mealPages) {
    const p = page as { properties: Record<string, unknown> };
    const recipeRelation = p.properties[MEAL_PLAN_PROPS.recipes] as
      { relation?: Array<{ id: string }> } | undefined;
    if (recipeRelation?.relation) {
      for (const rel of recipeRelation.relation) {
        const names = await getIngredientNamesForRecipe(rel.id);
        names.forEach(n => allIngredientNames.add(n.toLowerCase()));
      }
    }
  }

  if (allIngredientNames.size === 0) return 'Planned meals have no linked recipes with ingredients. Save recipes with ingredients first.';

  // 3. Check pantry (if enabled, default true)
  const checkPantry = (input.check_pantry as boolean) !== false;
  let skippedFromPantry = 0;
  const neededItems: string[] = [];
  const pantrySourceId = LIFE_OS_DATABASES.pantry;

  if (checkPantry && pantrySourceId) {
    const pantryResult = await queryDatabase(pantrySourceId, {});
    const pantryItems = parsePantryResults(pantryResult);
    const pantryMap = new Map(pantryItems.map(p => [p.title.toLowerCase(), p]));

    for (const ingredient of allIngredientNames) {
      const inPantry = pantryMap.get(ingredient);
      if (inPantry && inPantry.quantity > 0) {
        skippedFromPantry++;
      } else {
        neededItems.push(ingredient);
      }
    }
  } else {
    neededItems.push(...allIngredientNames);
  }

  if (neededItems.length === 0) {
    return `You have everything you need! All ${allIngredientNames.size} ingredients are in your pantry.`;
  }

  // 4. Check existing shopping list to avoid duplicates
  let existingNames = new Set<string>();
  if (shoppingListSourceId) {
    const existingList = await queryDatabase(shoppingListSourceId, {});
    const existingPages = (existingList as { results?: unknown[] })?.results || [];
    existingNames = new Set(
      existingPages.map((p: unknown) => {
        const page = p as { properties: Record<string, unknown> };
        return extractTitle(page.properties[SHOPPING_LIST_PROPS.title]).toLowerCase();
      })
    );
  }

  // 5. Write needed items to shopping list
  let addedCount = 0;
  for (const item of neededItems) {
    if (existingNames.has(item)) continue;
    try {
      await createPage(shoppingListDbId, {
        [SHOPPING_LIST_PROPS.title]: { title: [{ text: { content: item } }] },
        [SHOPPING_LIST_PROPS.checked]: { checkbox: false },
        [SHOPPING_LIST_PROPS.source]: { select: { name: 'Meal Plan' } },
      });
      addedCount++;
    } catch (error) {
      console.warn('[ToolExecutor] Failed to add shopping list item:', { item, error });
    }
  }

  const skippedExisting = neededItems.length - addedCount;
  let response = `Added ${addedCount} item${addedCount !== 1 ? 's' : ''} to your shopping list`;
  if (skippedFromPantry > 0) response += ` (skipped ${skippedFromPantry} already in pantry)`;
  if (skippedExisting > 0) response += ` (${skippedExisting} already on list)`;
  return response + '.';
}
```

**clear_shopping_list:**
```typescript
case 'clear_shopping_list': {
  const dataSourceId = LIFE_OS_DATABASES.shoppingList;
  if (!dataSourceId) return 'Shopping list database is not configured. Please set NOTION_SHOPPING_LIST_DATA_SOURCE_ID.';

  const action = input.action as string;

  if (action === 'check_all') {
    const result = await queryDatabase(dataSourceId, {
      filter: { property: SHOPPING_LIST_PROPS.checked, checkbox: { equals: false } },
    });
    const pages = (result as { results?: unknown[] })?.results || [];
    for (const page of pages) {
      const p = page as { id: string };
      await updatePage(p.id, { [SHOPPING_LIST_PROPS.checked]: { checkbox: true } });
    }
    return `Marked ${pages.length} item${pages.length !== 1 ? 's' : ''} as bought.`;
  }

  if (action === 'clear_checked') {
    const result = await queryDatabase(dataSourceId, {
      filter: { property: SHOPPING_LIST_PROPS.checked, checkbox: { equals: true } },
    });
    const pages = (result as { results?: unknown[] })?.results || [];
    for (const page of pages) {
      const p = page as { id: string };
      await updatePage(p.id, { archived: true });
    }
    return `Cleared ${pages.length} checked item${pages.length !== 1 ? 's' : ''} from shopping list.`;
  }

  return 'Unknown action. Use "check_all" or "clear_checked".';
}
```

**3e. Add findOrCreateIngredients() helper** (after existing `dedupeNames()`, ~L975):
```typescript
async function findOrCreateIngredients(names: string[]): Promise<string[]> {
  const ingredientDbId = LIFE_OS_DATABASE_IDS.ingredients;
  const ingredientSourceId = LIFE_OS_DATABASES.ingredients;
  if (!ingredientDbId || !ingredientSourceId) return [];

  const ids: string[] = [];
  for (const name of dedupeNames(names)) {
    try {
      // Try to find existing ingredient by exact name
      const searchResult = await queryDatabase(ingredientSourceId, {
        filter: { property: INGREDIENT_PROPS.title, title: { equals: name } },
      });
      const pages = (searchResult as { results?: Array<{ id: string }> })?.results || [];

      if (pages.length > 0) {
        ids.push(pages[0].id);
      } else {
        // Create new ingredient
        const newPage = await createPage(ingredientDbId, {
          [INGREDIENT_PROPS.title]: { title: [{ text: { content: name } }] },
        });
        ids.push((newPage as { id: string }).id);
      }
    } catch (error) {
      console.warn(`[ToolExecutor] Failed to find/create ingredient "${name}":`, error);
    }
  }
  return ids;
}
```

**3f. Enhance addItemsToShoppingList()** (L977-1002) — accept rich objects alongside strings:

Replace the function signature and body to support both `string` and `{ name, quantity?, unit?, category? }`:
```typescript
async function addItemsToShoppingList(
  items: Array<string | { name: string; quantity?: number; unit?: string; category?: string }>
): Promise<{ attempted: boolean; created: number }> {
  const databaseId = LIFE_OS_DATABASE_IDS.shoppingList;
  if (!databaseId) {
    return { attempted: false, created: 0 };
  }

  const uniqueNames = new Set<string>();
  const uniqueItems: typeof items = [];
  for (const item of items) {
    const name = typeof item === 'string' ? item : item.name;
    const key = name.trim().toLowerCase();
    if (!key || uniqueNames.has(key)) continue;
    uniqueNames.add(key);
    uniqueItems.push(item);
  }

  let created = 0;
  for (const item of uniqueItems.slice(0, MAX_SHOPPING_LIST_ITEMS)) {
    const name = typeof item === 'string' ? item : item.name;
    try {
      const properties: Record<string, unknown> = {
        [SHOPPING_LIST_PROPS.title]: { title: [{ text: { content: name } }] },
        [SHOPPING_LIST_PROPS.checked]: { checkbox: false },
        [SHOPPING_LIST_PROPS.source]: { select: { name: 'Meal Plan' } },
      };
      if (typeof item !== 'string') {
        if (item.quantity) properties[SHOPPING_LIST_PROPS.quantity] = { number: item.quantity };
        if (item.unit) properties[SHOPPING_LIST_PROPS.unit] = { select: { name: item.unit } };
        if (item.category) properties[SHOPPING_LIST_PROPS.category] = { select: { name: item.category } };
      }
      await createPage(databaseId, properties);
      created += 1;
    } catch (error) {
      console.warn('[ToolExecutor] Failed to add shopping list item:', { name, error });
    }
  }

  return { attempted: true, created };
}
```

**File: `src/lib/jarvis/notion/recentResults.ts`**

**3g. Extend CachedItem type** (L13-17):
```typescript
export interface CachedItem {
  id: string;
  title: string;
  type: 'task' | 'bill' | 'project' | 'goal' | 'habit' | 'recipe' | 'mealPlan';
  cachedAt: number;
}
```

---

### Task 4: Update System Prompt + Build Verification

**File: `src/lib/jarvis/intelligence/systemPrompt.ts`**

**4a. Update CAPABILITIES section** (L289-294):
```typescript
sections.push(`CAPABILITIES:
- Notion integration: tasks, bills, projects, goals, habits, recipes, meal plan, shopping list, pantry
- Create tasks, mark complete, pause tasks, mark bills paid
- Meal planning: save recipes, plan weekly meals, generate shopping lists, track pantry inventory
- Smart shopping: generates list from meal plan ingredients minus what's already in the pantry
- Query any of your Life OS databases by voice
- Time awareness and conversation memory
- Tutorial system: "start tutorial", "teach me about X", "what can you do?"`);
```

**4b. Build verification:**
```bash
npm run build
```
Must pass with zero type errors.

---

## Acceptance Criteria

### AC-1: Recipe Creation via Conversation
- User: "Save this recipe: Chicken Stir Fry, easy, dinner, 20 min prep, 15 min cook, ingredients: chicken breast, soy sauce, garlic, ginger, rice, sesame oil"
- Claude calls `create_recipe` with all properties
- Recipe created in Recipes DB with correct properties
- Each ingredient find-or-created in Ingredients DB
- Recipe's Ingredients relation links all ingredient pages
- Response: "Saved recipe: Chicken Stir Fry (6 ingredients linked)"

### AC-2: Meal Plan Querying
- User: "What's for dinner tonight?" / "Show me this week's meal plan"
- Claude calls `query_meal_plan` with appropriate filters
- Formatted results grouped by day and meal type

### AC-3: Pantry Management (Upsert)
- "We bought 2 lbs of chicken breast" → `update_pantry(item_name="chicken breast", quantity=2, unit="lb")` → creates or updates
- "We're out of milk" → `update_pantry(item_name="milk", quantity=0)` → sets quantity to 0 (not deleted)
- "What do we have?" → `query_pantry` → categorized inventory

### AC-4: Smart Shopping List Generation
- Meal plan has 3 dinners with linked recipes
- Pantry has chicken breast (2 lbs) and rice (5 lbs)
- "Generate my shopping list" → `generate_shopping_list`
- Queries all meal plan recipe ingredients
- Subtracts pantry items with quantity > 0
- Writes only needed items to Shopping List DB
- Response: "Added 8 items to your shopping list (skipped 3 already in pantry)"

### AC-5: Shopping List Operations
- "What's on my shopping list?" → `query_shopping_list` → formatted checklist
- "Clear the checked items" → `clear_shopping_list(action='clear_checked')` → archives checked pages

### AC-6: Graceful Degradation
- Any unconfigured database returns clear message ("Pantry database is not configured. Please set NOTION_PANTRY_DATA_SOURCE_ID.")
- No throws, no crashes, chat continues

### AC-7: Build Passes
- `npm run build` → zero type errors, zero build errors

## Boundaries

### DO NOT CHANGE
- Existing `query_recipes` and `add_to_meal_plan` tool definitions/executors — they work
- `src/lib/jarvis/notion/NotionClient.ts` — stable, import and use
- `src/lib/jarvis/intelligence/chatProcessor.ts` — tool routing already sends all notionTools to executeNotionTool; new tools route automatically
- `src/lib/jarvis/memory/*` — memory system is stable
- `src/lib/jarvis/intelligence/sdkBrain.ts` — brain module is stable
- `src/lib/jarvis/resilience/*` — use them, don't modify
- `src/components/*` — no UI changes (that's J-03)
- `src/lib/jarvis/executive/*` — no briefing changes (that's J-02)

### SCOPE LIMITS
- Backend tools ONLY — no UI, no briefing integration
- No new npm dependencies
- Notion property names must match EXACTLY what's in the databases
- `generate_shopping_list` does sequential Notion API calls — rate limits are tight, feature is not latency-sensitive
- No `servings` property — doesn't exist in current RECIPE_PROPS schema

## Verification Checklist

- [ ] `npm run build` passes with zero errors
- [ ] All 7 new tool definitions in tools.ts
- [ ] All 7 case handlers in toolExecutor.ts
- [ ] `summarizeNotionContext()` has cases for all 7 new tools
- [ ] `TITLE_PROPS` map includes 'mealPlan'
- [ ] `PANTRY_PROPS` constant defined
- [ ] Enhanced `SHOPPING_LIST_PROPS` with quantity/unit/category/checked/source
- [ ] `PantryProperties` and `ShoppingListProperties` interfaces defined
- [ ] `LIFE_OS_DATABASES` has pantry + shoppingList
- [ ] `LIFE_OS_DATABASE_IDS` has pantry + ingredients + recipes
- [ ] `buildMealPlanFilter()`, `buildPantryFilter()`, `buildShoppingListFilter()` functions work
- [ ] `formatPantryResults()`, `formatShoppingListResults()`, `parsePantryResults()` functions work
- [ ] `create_recipe` uses `findOrCreateIngredients()` for auto-linking
- [ ] `update_pantry` uses upsert pattern (search → update or create)
- [ ] `generate_shopping_list` subtracts pantry + deduplicates against existing list
- [ ] `addItemsToShoppingList()` enhanced to accept rich `{ name, quantity, unit, category }` objects
- [ ] `CachedItem.type` includes 'mealPlan'
- [ ] System prompt CAPABILITIES includes meal planning
- [ ] `.env.example` has all 5 new env var slots
- [ ] Graceful degradation: clear error messages when databases not configured
- [ ] No existing functionality broken
