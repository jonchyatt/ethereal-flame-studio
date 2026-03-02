/**
 * Tool Executor for Notion Operations
 *
 * Routes Claude tool_use calls to Notion SDK operations.
 * Handles ALL Life OS operations:
 * - Read: Tasks, Bills, Projects, Goals, Habits queries
 * - Write: Create tasks, update status, mark bills paid, pause tasks, add project items
 */

import { queryDatabase, createPage, updatePage, retrievePage, archivePage } from './NotionClient';
import { handleRecurringTaskCompletion } from './recurringHook';
import {
  LIFE_OS_DATABASES,
  LIFE_OS_DATABASE_IDS,
  buildTaskFilter,
  buildBillFilter,
  buildProjectFilter,
  buildGoalFilter,
  buildHabitFilter,
  formatTaskResults,
  formatBillResults,
  formatProjectResults,
  formatGoalResults,
  formatHabitResults,
  isValidUUID,
  buildTaskProperties,
  buildTaskStatusUpdate,
  buildBillProperties,
  buildBillUpdateProperties,
  buildBillPaidUpdate,
  buildTaskPauseUpdate,
  // Phase 16: Feature Pack
  buildRecipeFilter,
  buildSubscriptionFilter,
  formatRecipeResults,
  formatSubscriptionResults,
  formatMealPlanResults,
  MEAL_PLAN_PROPS,
  RECIPE_PROPS,
  INGREDIENT_PROPS,
  SHOPPING_LIST_PROPS,
  SUBSCRIPTION_PROPS,
  // Phase J: Meal Planning
  buildMealPlanFilter,
  buildPantryFilter,
  buildShoppingListFilter,
  formatPantryResults,
  formatShoppingListResults,
  parsePantryResults,
  PANTRY_PROPS,
} from './schemas';
import {
  cacheResults,
  findTaskByTitle,
  findBillByTitle,
  findProjectByTitle,
  findRecipeByTitle,
  CachedItem,
} from './recentResults';
import { findNotionDatabase } from './notionUrls';
import { logEvent, type ToolInvocationData } from '../memory/queries/dailyLogs';
import { trackErrorPattern } from '../resilience/errorTracking';
import Anthropic from '@anthropic-ai/sdk';

// Lazy Anthropic singleton for Claude-reasoned shopping list
let _shoppingAnthropicClient: Anthropic | null = null;
function getShoppingAnthropicClient(): Anthropic {
  if (!_shoppingAnthropicClient) {
    _shoppingAnthropicClient = new Anthropic();
  }
  return _shoppingAnthropicClient;
}

/**
 * Execute a Notion tool call by routing to SDK
 *
 * @param toolName - The Claude tool name (e.g., 'query_tasks')
 * @param input - The tool input parameters from Claude
 * @param sessionId - Optional session ID for audit logging
 * @returns Speech-friendly result string
 */
export async function executeNotionTool(
  toolName: string,
  input: Record<string, unknown>,
  sessionId?: number
): Promise<string> {
  console.log(`[ToolExecutor] Executing tool: ${toolName}`, input);

  try {
    const result = await executeNotionToolInner(toolName, input);

    // Log successful invocation
    if (sessionId) {
      await logEvent(sessionId, 'tool_invocation', {
        toolName,
        success: true,
        context: summarizeNotionContext(toolName, input),
      } as ToolInvocationData);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error);

    // Log failed invocation
    if (sessionId) {
      await logEvent(sessionId, 'tool_invocation', {
        toolName,
        success: false,
        error: errorMessage,
      } as ToolInvocationData);
    }

    // Track error pattern for self-healing (Phase 14)
    trackErrorPattern(error, 'notion', toolName, sessionId).catch(() => {});

    // Return user-friendly error messages
    if (errorMessage.includes('NOTION_TOKEN')) {
      return 'I need to be connected to Notion first. Please check the configuration.';
    }
    if (errorMessage.includes('timeout')) {
      return 'Notion took too long to respond. Please try again in a moment.';
    }
    if (errorMessage.includes('Could not find')) {
      return `I couldn't find that item in Notion. It may have been deleted or renamed.`;
    }

    return `I had trouble accessing Notion: ${errorMessage}. Please try again.`;
  }
}

/**
 * Summarize Notion tool context for audit logs
 */
function summarizeNotionContext(
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case 'create_task':
      return `Created task: "${input.title}"`;
    case 'create_bill':
      return `Created bill: "${input.title}"`;
    case 'update_task_status':
      return `Updated "${input.task_id}" to ${input.new_status}`;
    case 'mark_bill_paid':
      return `Marked "${input.bill_id}" as paid`;
    case 'update_bill':
      return `Updated bill "${input.bill_id}"`;
    case 'navigate_to_payment':
      return `Opening payment for "${input.bill_name}"`;
    case 'pause_task':
      return `Paused "${input.task_id}"`;
    case 'add_project_item':
      return `Added "${input.item}" to ${input.project_id}`;
    // Phase J: Meal Planning
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
    default:
      // Query tools
      return `Queried ${toolName.replace('query_', '')}`;
  }
}

/**
 * Inner execution logic for Notion tools (separated for logging wrapper)
 */
async function executeNotionToolInner(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    // =========================================================================
    // READ OPERATIONS (Phase 04-02)
    // =========================================================================

    case 'query_tasks': {
      const dataSourceId = LIFE_OS_DATABASES.tasks;
      if (!dataSourceId) {
        return 'Task database is not configured. Please set NOTION_TASKS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildTaskFilter({
        filter: input.filter as 'today' | 'this_week' | 'overdue' | 'all' | undefined,
        status: input.status as 'pending' | 'completed' | 'all' | undefined,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      // Cache results for follow-up operations
      cacheQueryResults(result, 'task');

      return formatTaskResults(result);
    }

    case 'query_bills': {
      const dataSourceId = LIFE_OS_DATABASES.subscriptions;
      if (!dataSourceId) {
        return 'Subscriptions database is not configured. Please set NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID.';
      }

      // Query subscriptions database (bills live here, not in the Budgets database)
      const result = await queryDatabase(dataSourceId, {});

      // Cache results for follow-up operations
      cacheQueryResults(result, 'bill');

      return formatBillResults(result);
    }

    case 'query_projects': {
      const dataSourceId = LIFE_OS_DATABASES.projects;
      if (!dataSourceId) {
        return 'Projects database is not configured. Please set NOTION_PROJECTS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildProjectFilter({
        status: input.status as 'active' | 'completed' | 'all' | undefined,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      // Cache results for follow-up operations
      cacheQueryResults(result, 'project');

      return formatProjectResults(result);
    }

    case 'query_goals': {
      const dataSourceId = LIFE_OS_DATABASES.goals;
      if (!dataSourceId) {
        return 'Goals database is not configured. Please set NOTION_GOALS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildGoalFilter({
        status: input.status as 'active' | 'achieved' | 'all' | undefined,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      // Cache results for follow-up operations
      cacheQueryResults(result, 'goal');

      return formatGoalResults(result);
    }

    case 'query_habits': {
      const dataSourceId = LIFE_OS_DATABASES.habits;
      if (!dataSourceId) {
        return 'Habits database is not configured. Please set NOTION_HABITS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildHabitFilter({
        frequency: input.frequency as 'daily' | 'weekly' | 'monthly' | 'all' | undefined,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      // Cache results for follow-up operations
      cacheQueryResults(result, 'habit');

      return formatHabitResults(result);
    }

    // =========================================================================
    // WRITE OPERATIONS (Phase 04-03)
    // =========================================================================

    case 'create_bill': {
      const databaseId = LIFE_OS_DATABASE_IDS.subscriptions;
      if (!databaseId) {
        return 'Subscriptions database is not configured. Please set NOTION_SUBSCRIPTIONS_DATABASE_ID.';
      }

      const title = input.title as string;
      const properties = buildBillProperties({
        title,
        amount: input.amount as number | undefined,
        due_date: input.due_date as string | undefined,
        category: input.category as string | undefined,
        frequency: input.frequency as string | undefined,
        service_link: input.service_link as string | undefined,
      });

      await createPage(databaseId, properties);



      let response = `Added bill: "${title}"`;
      if (input.amount) {
        response += ` for $${(input.amount as number).toFixed(2)}`;
      }
      if (input.due_date) {
        response += ` due ${input.due_date}`;
      }
      if (input.service_link) {
        response += ' with payment link';
      }
      return response;
    }

    case 'create_task': {
      // Use database_id (not data_source_id) for creating pages
      const databaseId = LIFE_OS_DATABASE_IDS.tasks;
      if (!databaseId) {
        return 'Task database is not configured. Please set NOTION_TASKS_DATABASE_ID.';
      }

      const title = input.title as string;
      const properties = buildTaskProperties({
        title,
        due_date: input.due_date as string | undefined,
        priority: input.priority as string | undefined,
      });

      await createPage(databaseId, properties);

      // Trigger dashboard refresh after task creation


      let response = `Created task: "${title}"`;
      if (input.due_date) {
        response += ` due ${input.due_date}`;
      }
      if (input.priority) {
        response += ` (${input.priority} priority)`;
      }
      return response;
    }

    case 'update_task_status': {
      // If task_id looks like a title (not UUID), try to find it
      let taskId = input.task_id as string;
      const newStatus = input.new_status as string;

      if (!isValidUUID(taskId)) {
        // First try the cache
        let foundId = findTaskByTitle(taskId);

        // If not in cache, auto-query tasks to populate cache then retry
        if (!foundId) {
          console.log('[ToolExecutor] Task not in cache, auto-querying to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.tasks;
          if (dataSourceId) {
            // Query all pending tasks to populate cache
            const filterOptions = buildTaskFilter({ filter: 'all', status: 'pending' });
            const result = await queryDatabase(dataSourceId, filterOptions);
            cacheQueryResults(result, 'task');
            // Try again after populating cache
            foundId = findTaskByTitle(taskId);
          }
        }

        if (!foundId) {
          return `I couldn't find a task matching "${taskId}". The task might be completed already or have a different name.`;
        }
        taskId = foundId;
      }

      const properties = buildTaskStatusUpdate(newStatus);

      await updatePage(taskId, properties);

      // Trigger dashboard refresh after status update


      const statusLabel =
        newStatus === 'completed'
          ? 'complete'
          : newStatus === 'in_progress'
            ? 'in progress'
            : 'to do';

      // If task was marked complete, check if it's recurring and create next instance
      if (newStatus === 'completed') {
        const nextTaskResponse = await handleRecurringTaskCompletion(taskId);
        if (nextTaskResponse) {
          return `Marked task as ${statusLabel}. ${nextTaskResponse}`;
        }
      }

      return `Marked task as ${statusLabel}.`;
    }

    case 'mark_bill_paid': {
      // If bill_id looks like a title (not UUID), try to find it
      const originalBillName = input.bill_id as string;
      let billId = originalBillName;

      if (!isValidUUID(billId)) {
        // First try the cache
        let foundId = findBillByTitle(billId);

        // If not in cache, auto-query subscriptions to populate cache then retry
        if (!foundId) {
          console.log('[ToolExecutor] Bill not in cache, auto-querying subscriptions to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.subscriptions;
          if (dataSourceId) {
            const result = await queryDatabase(dataSourceId, {});
            cacheQueryResults(result, 'bill');
            foundId = findBillByTitle(billId);
          }
        }

        if (!foundId) {
          return `I couldn't find a bill matching "${billId}". The bill might already be paid or have a different name.`;
        }
        billId = foundId;
      }

      const properties = buildBillPaidUpdate();

      await updatePage(billId, properties);

      // Trigger dashboard refresh after bill paid


      return `Marked "${originalBillName}" as paid.`;
    }

    case 'update_bill': {
      const originalName = input.bill_id as string;
      let billId = originalName;

      if (!isValidUUID(billId)) {
        let foundId = findBillByTitle(billId);

        if (!foundId) {
          console.log('[ToolExecutor] Bill not in cache, auto-querying subscriptions to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.subscriptions;
          if (dataSourceId) {
            const result = await queryDatabase(dataSourceId, {});
            cacheQueryResults(result, 'bill');
            foundId = findBillByTitle(billId);
          }
        }

        if (!foundId) {
          return `I couldn't find a bill matching "${billId}". Try the exact name as it appears in Notion.`;
        }
        billId = foundId;
      }

      const properties = buildBillUpdateProperties({
        title: input.title as string | undefined,
        amount: input.amount as number | undefined,
        due_date: input.due_date as string | undefined,
        frequency: input.frequency as string | undefined,
        category: input.category as string | undefined,
        service_link: input.service_link as string | undefined,
      });

      if (Object.keys(properties).length === 0) {
        return 'No changes specified. Tell me what to update (amount, due date, frequency, category, or payment link).';
      }

      await updatePage(billId, properties);

      const changes: string[] = [];
      if (input.title) changes.push(`name to "${input.title}"`);
      if (input.amount !== undefined) changes.push(`amount to $${(input.amount as number).toFixed(2)}`);
      if (input.due_date) changes.push(`due date to ${input.due_date}`);
      if (input.frequency) changes.push(`frequency to ${input.frequency}`);
      if (input.category) changes.push(`category to ${input.category}`);
      if (input.service_link) changes.push('payment link updated');

      return `Updated "${originalName}": ${changes.join(', ')}.`;
    }

    case 'pause_task': {
      // If task_id looks like a title (not UUID), try to find it
      let taskId = input.task_id as string;
      const until = input.until as string | undefined;

      if (!isValidUUID(taskId)) {
        // First try the cache
        let foundId = findTaskByTitle(taskId);

        // If not in cache, auto-query tasks to populate cache then retry
        if (!foundId) {
          console.log('[ToolExecutor] Task not in cache, auto-querying to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.tasks;
          if (dataSourceId) {
            const filterOptions = buildTaskFilter({ filter: 'all', status: 'pending' });
            const result = await queryDatabase(dataSourceId, filterOptions);
            cacheQueryResults(result, 'task');
            foundId = findTaskByTitle(taskId);
          }
        }

        if (!foundId) {
          return `I couldn't find a task matching "${taskId}". The task might be completed already or have a different name.`;
        }
        taskId = foundId;
      }

      const properties = buildTaskPauseUpdate(until);

      await updatePage(taskId, properties);

      // Trigger dashboard refresh after task pause


      let response = 'Paused the task.';
      if (until) {
        response = `Paused the task until ${until}.`;
      }
      return response;
    }

    case 'add_project_item': {
      // Use database_id (not data_source_id) for creating pages
      const databaseId = LIFE_OS_DATABASE_IDS.tasks;
      if (!databaseId) {
        return 'Task database is not configured. Please set NOTION_TASKS_DATABASE_ID.';
      }

      // Find project by title if needed
      let projectId = input.project_id as string;
      const item = input.item as string;

      if (!isValidUUID(projectId)) {
        // First try the cache
        let foundId = findProjectByTitle(projectId);

        // If not in cache, auto-query projects to populate cache then retry
        if (!foundId) {
          console.log('[ToolExecutor] Project not in cache, auto-querying to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.projects;
          if (dataSourceId) {
            const filterOptions = buildProjectFilter({ status: 'active' });
            const result = await queryDatabase(dataSourceId, filterOptions);
            cacheQueryResults(result, 'project');
            foundId = findProjectByTitle(projectId);
          }
        }

        if (!foundId) {
          return `I couldn't find a project matching "${projectId}". The project might be completed or have a different name.`;
        }
        projectId = foundId;
      }

      // Create a new task linked to the project
      const properties = buildTaskProperties({
        title: item,
        project_id: projectId,
      });

      await createPage(databaseId, properties);

      // Trigger dashboard refresh after adding project item


      return `Added "${item}" to the project.`;
    }

    // =========================================================================
    // FEATURE PACK: Recipes, Meal Planning, Subscriptions (Phase 16)
    // =========================================================================

    case 'query_recipes': {
      const dataSourceId = LIFE_OS_DATABASES.recipes;
      if (!dataSourceId) {
        return 'Recipes database is not configured. Please set NOTION_RECIPES_DATA_SOURCE_ID.';
      }

      const search = input.search as string | undefined;
      const ingredientIds = await resolveIngredientIds(search);

      const filterOptions = buildRecipeFilter({
        search,
        category: input.category as string | undefined,
        difficulty: input.difficulty as string | undefined,
        favouritesOnly: input.favourites_only as boolean | undefined,
        ingredientIds,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      // Cache results for follow-up operations
      cacheQueryResults(result, 'recipe');

      return formatRecipeResults(result);
    }

    case 'add_to_meal_plan': {
      const databaseId = LIFE_OS_DATABASE_IDS.mealPlan;
      if (!databaseId) {
        return 'Meal Plan database is not configured. Please set NOTION_MEAL_PLAN_DATABASE_ID.';
      }

      const dayOfWeek = input.day_of_week as string;
      const mealType = input.meal_type as string;
      const recipeName = input.recipe_name as string;
      const setting = input.setting as string | undefined;

      const recipeId = recipeName ? await resolveRecipeIdByName(recipeName) : null;

      // Build properties for meal plan entry
      const properties: Record<string, unknown> = {
        [MEAL_PLAN_PROPS.title]: {
          title: [{ text: { content: recipeName } }],
        },
        [MEAL_PLAN_PROPS.dayOfWeek]: {
          select: { name: dayOfWeek },
        },
        [MEAL_PLAN_PROPS.timeOfDay]: {
          rich_text: [{ text: { content: mealType } }],
        },
      };

      if (recipeId) {
        properties[MEAL_PLAN_PROPS.recipes] = {
          relation: [{ id: recipeId }],
        };
      }

      if (setting) {
        properties[MEAL_PLAN_PROPS.setting] = {
          select: { name: setting },
        };
      }

      await createPage(databaseId, properties);



      let response = `Added ${mealType} for ${dayOfWeek}: ${recipeName}${setting ? ` (${setting})` : ''}`;

      if (recipeId) {
        const ingredientNames = await getIngredientNamesForRecipe(recipeId);
        if (ingredientNames.length > 0) {
          const shoppingListResult = await addItemsToShoppingList(ingredientNames);
          response += ` Ingredients: ${ingredientNames.join(', ')}.`;
          if (shoppingListResult.attempted) {
            if (shoppingListResult.created > 0) {
              response += ` Added ${shoppingListResult.created} item${shoppingListResult.created > 1 ? 's' : ''} to your shopping list.`;
            } else {
              response += ' Shopping list write attempted but no items were added. Check the database and property names.';
            }
          } else {
            response += ' Set NOTION_SHOPPING_LIST_DATABASE_ID to write this list to Notion.';
          }
        }
      }

      return response;
    }

    // =========================================================================
    // MEAL PLANNING TOOLS (Phase J)
    // =========================================================================

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

    case 'update_pantry': {
      const dataSourceId = LIFE_OS_DATABASES.pantry;
      const databaseId = LIFE_OS_DATABASE_IDS.pantry;
      if (!dataSourceId || !databaseId) {
        return 'Pantry database is not configured. Please set NOTION_PANTRY_DATA_SOURCE_ID and NOTION_PANTRY_DATABASE_ID.';
      }

      const itemName = input.item_name as string;
      const quantity = input.quantity as number;

      // Search for existing item by exact name (Notion title filter is case-insensitive)
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
        return `Updated pantry: ${itemName} → ${quantity}${input.unit ? ` ${input.unit}` : ''}`;
      } else {
        properties[PANTRY_PROPS.title] = { title: [{ text: { content: itemName } }] };
        await createPage(databaseId, properties);
        return `Added to pantry: ${itemName} — ${quantity}${input.unit ? ` ${input.unit}` : ''}`;
      }
    }

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

    case 'generate_shopping_list': {
      const mealPlanSourceId = LIFE_OS_DATABASES.mealPlan;
      const shoppingListDbId = LIFE_OS_DATABASE_IDS.shoppingList;
      const shoppingListSourceId = LIFE_OS_DATABASES.shoppingList;
      if (!mealPlanSourceId) return 'Meal plan database is not configured. Please set NOTION_MEAL_PLAN_DATA_SOURCE_ID.';
      if (!shoppingListDbId) return 'Shopping list database is not configured. Please set NOTION_SHOPPING_LIST_DATABASE_ID.';

      const targetServings = input.target_servings as number | undefined;

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
          const day = extractSelectFromProp(p.properties[MEAL_PLAN_PROPS.dayOfWeek]);
          return days.includes(day);
        });
      }

      if (mealPages.length === 0) return 'No meals planned. Add meals to your plan first.';

      // 2. For each meal with a recipe relation, get RICH recipe context
      const allIngredientNames = new Set<string>();
      interface RecipeContext {
        recipeName: string;
        ingredientNames: string[];
        servings: number | null;
        category: string | null;
        difficulty: string | null;
        prepTime: number | null;
        cookTime: number | null;
      }
      const recipeContexts: RecipeContext[] = [];

      for (const page of mealPages) {
        const p = page as { properties: Record<string, unknown> };
        const titleProp = p.properties[MEAL_PLAN_PROPS.title] as { title?: Array<{ plain_text?: string }> } | undefined;
        const recipeName = titleProp?.title?.[0]?.plain_text || 'Unknown meal';
        const servingsProp = p.properties[MEAL_PLAN_PROPS.servings] as { number?: number } | undefined;
        const mealServings = targetServings || servingsProp?.number || null;
        const recipeRelation = p.properties[MEAL_PLAN_PROPS.recipes] as
          { relation?: Array<{ id: string }> } | undefined;

        const mealIngredients: string[] = [];
        let mealCategory: string | null = null;
        let mealDifficulty: string | null = null;
        let mealPrepTime: number | null = null;
        let mealCookTime: number | null = null;

        if (recipeRelation?.relation) {
          for (const rel of recipeRelation.relation) {
            const details = await getRecipeDetailsForShoppingList(rel.id);
            details.ingredientNames.forEach(n => {
              allIngredientNames.add(n.toLowerCase());
              mealIngredients.push(n);
            });
            // Use first recipe's metadata
            if (!mealCategory) mealCategory = details.category;
            if (!mealDifficulty) mealDifficulty = details.difficulty;
            if (!mealPrepTime) mealPrepTime = details.prepTime;
            if (!mealCookTime) mealCookTime = details.cookTime;
          }
        }

        if (mealIngredients.length > 0) {
          recipeContexts.push({
            recipeName,
            ingredientNames: mealIngredients,
            servings: mealServings,
            category: mealCategory,
            difficulty: mealDifficulty,
            prepTime: mealPrepTime,
            cookTime: mealCookTime,
          });
        }
      }

      if (allIngredientNames.size === 0) return 'Planned meals have no linked recipes with ingredients. Save recipes with ingredients first.';

      // 3. Call Claude Haiku for intelligent quantity reasoning
      interface ClaudeShoppingItem {
        name: string;
        quantity: number;
        unit: string;
        category: string;
      }
      let claudeItems: ClaudeShoppingItem[] | null = null;

      if (recipeContexts.length > 0) {
        try {
          const client = getShoppingAnthropicClient();
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

          const textBlock = quantityResponse.content.find(b => b.type === 'text');
          if (textBlock && textBlock.type === 'text') {
            const raw = textBlock.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.every((item: unknown) => {
              const i = item as Record<string, unknown>;
              return typeof i.name === 'string' && typeof i.quantity === 'number' && typeof i.unit === 'string' && typeof i.category === 'string';
            })) {
              claudeItems = parsed as ClaudeShoppingItem[];
            }
          }
        } catch (error) {
          console.warn('[ToolExecutor] Claude shopping reasoning failed, using fallback:', error);
          claudeItems = null;
        }
      }

      // 4. Check pantry (if enabled, default true)
      const checkPantry = (input.check_pantry as boolean) !== false;
      const pantrySourceId = LIFE_OS_DATABASES.pantry;
      let pantryMap = new Map<string, { quantity: number; unit: string | null }>();

      if (checkPantry && pantrySourceId) {
        const pantryResult = await queryDatabase(pantrySourceId, {});
        const pantryItems = parsePantryResults(pantryResult);
        pantryMap = new Map(pantryItems.map(p => [p.title.toLowerCase(), { quantity: p.quantity, unit: p.unit }]));
      }

      // 5. Check existing shopping list to avoid duplicates
      let existingNames = new Set<string>();
      if (shoppingListSourceId) {
        const existingList = await queryDatabase(shoppingListSourceId, {});
        const existingPages = (existingList as { results?: unknown[] })?.results || [];
        existingNames = new Set(
          existingPages.map((p: unknown) => {
            const page = p as { properties: Record<string, unknown> };
            return extractTitleFromProperty(page.properties[SHOPPING_LIST_PROPS.title])?.toLowerCase() || '';
          }).filter(Boolean)
        );
      }

      // 6. Create shopping list items
      if (claudeItems) {
        // Claude-reasoned path: items with quantities
        let addedCount = 0;
        let skippedFromPantry = 0;
        let skippedExisting = 0;
        const addedItems: { name: string; quantity: number; unit: string; category: string }[] = [];
        const skippedPantryNames: string[] = [];

        for (const item of claudeItems) {
          const lowerName = item.name.toLowerCase();

          // Dedup against existing shopping list
          if (existingNames.has(lowerName)) {
            skippedExisting++;
            continue;
          }

          // Quantitative pantry subtraction
          if (checkPantry) {
            const inPantry = pantryMap.get(lowerName);
            if (inPantry && inPantry.quantity > 0) {
              // Same-unit subtraction only
              if (inPantry.unit && item.unit.toLowerCase() === inPantry.unit.toLowerCase()) {
                const remaining = item.quantity - inPantry.quantity;
                if (remaining <= 0) {
                  skippedFromPantry++;
                  skippedPantryNames.push(item.name);
                  continue;
                }
                item.quantity = Math.ceil(remaining);
              } else if (!inPantry.unit) {
                // Pantry has no unit — skip if any quantity exists
                skippedFromPantry++;
                skippedPantryNames.push(item.name);
                continue;
              }
              // Different units — keep Claude's full quantity (conservative)
            }
          }

          try {
            await createPage(shoppingListDbId, {
              [SHOPPING_LIST_PROPS.title]: { title: [{ text: { content: item.name } }] },
              [SHOPPING_LIST_PROPS.quantity]: { number: item.quantity },
              [SHOPPING_LIST_PROPS.unit]: { select: { name: item.unit } },
              [SHOPPING_LIST_PROPS.category]: { select: { name: item.category } },
              [SHOPPING_LIST_PROPS.checked]: { checkbox: false },
              [SHOPPING_LIST_PROPS.source]: { select: { name: 'Meal Plan' } },
            });
            addedCount++;
            addedItems.push(item);
          } catch (error) {
            console.warn('[ToolExecutor] Failed to add shopping list item:', { item: item.name, error });
          }
        }

        // Build itemized response
        let response = `Added ${addedCount} item${addedCount !== 1 ? 's' : ''} to your shopping list:\n`;
        response += addedItems.map(i => `- ${i.name}: ${i.quantity} ${i.unit} (${i.category})`).join('\n');
        if (skippedFromPantry > 0) response += `\n\nSkipped ${skippedFromPantry} item${skippedFromPantry !== 1 ? 's' : ''} already in pantry: ${skippedPantryNames.join(', ')}`;
        if (skippedExisting > 0) response += `\nSkipped ${skippedExisting} item${skippedExisting !== 1 ? 's' : ''} already on list`;
        return response;

      } else {
        // Fallback path: name-only items (J-01 behavior)
        let skippedFromPantry = 0;
        const neededItems: string[] = [];

        for (const ingredient of allIngredientNames) {
          if (checkPantry) {
            const inPantry = pantryMap.get(ingredient);
            if (inPantry && inPantry.quantity > 0) {
              skippedFromPantry++;
              continue;
            }
          }
          neededItems.push(ingredient);
        }

        if (neededItems.length === 0) {
          return `You have everything you need! All ${allIngredientNames.size} ingredients are in your pantry.`;
        }

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
    }

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
          await archivePage(p.id);
        }
        return `Cleared ${pages.length} checked item${pages.length !== 1 ? 's' : ''} from shopping list.`;
      }

      return 'Unknown action. Use "check_all" or "clear_checked".';
    }

    case 'get_subscriptions': {
      const dataSourceId = LIFE_OS_DATABASES.subscriptions;
      if (!dataSourceId) {
        return 'Subscriptions database is not configured. Please set NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildSubscriptionFilter({
        status: (input.status as 'active' | 'cancelled' | 'all') || 'active',
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

      return formatSubscriptionResults(result);
    }

    case 'navigate_to_payment': {
      const billName = input.bill_name as string;
      const dataSourceId = LIFE_OS_DATABASES.subscriptions;
      if (!dataSourceId) {
        return 'Subscriptions database is not configured. Please set NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID.';
      }

      let foundId = findBillByTitle(billName);
      if (!foundId) {
        console.log('[ToolExecutor] Bill not in cache, auto-querying subscriptions');
        const result = await queryDatabase(dataSourceId, {});
        cacheQueryResults(result, 'bill');
        foundId = findBillByTitle(billName);
      }

      if (!foundId) {
        return `I couldn't find a subscription matching "${billName}". Try the exact name as it appears in your Notion subscriptions.`;
      }

      const page = await retrievePage(foundId);
      const props = (page as { properties: Record<string, unknown> }).properties;

      const urlProp = props[SUBSCRIPTION_PROPS.serviceLink] as { url?: string } | undefined;
      const serviceLink = urlProp?.url || null;
      const titleProp = props[SUBSCRIPTION_PROPS.title] as { title?: Array<{ plain_text?: string }> } | undefined;
      const title = titleProp?.title?.[0]?.plain_text || billName;

      if (!serviceLink) {
        return `Found "${title}" but it doesn't have a payment link saved. You can say "update ${title} payment link to https://..." to add one.`;
      }

      return JSON.stringify({
        action: 'open_payment',
        url: serviceLink,
        title,
      });
    }

    case 'create_recurring_task': {
      // Create a task with Frequency property set for Jarvis-managed recurrence
      const databaseId = LIFE_OS_DATABASE_IDS.tasks;
      if (!databaseId) {
        return 'Task database is not configured. Please set NOTION_TASKS_DATABASE_ID.';
      }

      const title = input.title as string;
      const frequency = input.frequency as 'daily' | 'weekly' | 'monthly';
      const startDate = input.start_date as string | undefined;
      const dayOfWeek = input.day_of_week as string | undefined;

      // Map frequency to Notion select value (capitalize first letter)
      const frequencyValue = frequency.charAt(0).toUpperCase() + frequency.slice(1) as 'Daily' | 'Weekly' | 'Monthly';

      // Calculate due date: use provided start_date or today, adjust for weekly day_of_week
      let dueDate = startDate || new Date().toISOString().split('T')[0];
      if (frequency === 'weekly' && dayOfWeek) {
        dueDate = getNextWeekdayDate(startDate, dayOfWeek);
      }

      const properties = buildTaskProperties({
        title,
        due_date: dueDate,
        frequency: frequencyValue,
      });

      await createPage(databaseId, properties);



      let response = `Created ${frequency} recurring task: "${title}"`;
      if (frequency === 'weekly' && dayOfWeek) {
        response += ` every ${dayOfWeek}`;
      }
      response += ` starting ${dueDate}`;
      response += `. When you complete it, I'll automatically create the next one.`;
      return response;
    }

    // =========================================================================
    // PANEL OPERATIONS (Phase T1) — return JSON for ClaudeClient to act on
    // =========================================================================

    case 'open_notion_panel': {
      const databaseKey = input.database as string;
      const mode = (input.mode as string) || 'view';
      const entry = findNotionDatabase(databaseKey);

      if (!entry) {
        return `I couldn't find a Notion database matching "${databaseKey}". Try a name like "tasks", "budgets", "journal", or "recipes".`;
      }

      return JSON.stringify({
        action: 'open_panel',
        url: entry.notionUrl,
        label: entry.label,
        mode,
        cluster: entry.cluster,
      });
    }

    case 'close_notion_panel': {
      return JSON.stringify({ action: 'close_panel' });
    }

    default:
      console.warn(`[ToolExecutor] Unknown tool: ${toolName}`);
      return `I don't have that capability yet, but I'm always learning.`;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Property name constants for extracting titles from different database types
 */
// Property names for title extraction - must match actual Notion database schema
// See schemas.ts for the source of truth
const TITLE_PROPS: Record<CachedItem['type'], string> = {
  task: 'Name',       // Jarvis Life OS uses 'Name' for task titles
  bill: 'Bill',       // Bills database uses 'Bill'
  project: 'Project', // Projects database uses 'Project'
  goal: 'Goal',       // Goals database uses 'Goal'
  habit: 'Habit',     // Habits database uses 'Habit'
  recipe: 'Name',     // Recipes database uses 'Name'
  mealPlan: 'Name',   // Meal Plan database uses 'Name'
};

/**
 * Cache query results for follow-up write operations
 *
 * Extracts id and title from each page in the query results
 * and stores them in the recent results cache.
 */
function cacheQueryResults(
  result: unknown,
  type: CachedItem['type']
): void {
  try {
    const pages = (result as { results?: unknown[] })?.results || [];
    if (pages.length === 0) return;

    const titleProp = TITLE_PROPS[type];
    const items: CachedItem[] = [];

    for (const page of pages) {
      const p = page as { id: string; properties: Record<string, unknown> };
      const id = p.id;

      // Extract title from the appropriate property
      const titlePropValue = p.properties?.[titleProp] as {
        title?: Array<{ plain_text?: string }>;
      };
      const title = titlePropValue?.title?.[0]?.plain_text || '';

      if (id && title) {
        items.push({
          id,
          title,
          type,
          cachedAt: Date.now(),
        });
      }
    }

    if (items.length > 0) {
      cacheResults(items);
    }
  } catch (error) {
    console.error('[ToolExecutor] Error caching query results:', error);
    // Don't throw - caching is best-effort
  }
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const MAX_SHOPPING_LIST_ITEMS = 40;

function getNextWeekdayDate(startDate: string | undefined, dayOfWeek: string): string {
  const baseDate = parseDateOrToday(startDate);
  const targetDay = WEEKDAY_INDEX[dayOfWeek];

  if (targetDay === undefined) {
    return formatDate(baseDate);
  }

  const currentDay = baseDate.getDay();
  let offset = targetDay - currentDay;
  if (offset < 0) {
    offset += 7;
  }

  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + offset);
  return formatDate(nextDate);
}

function parseDateOrToday(dateString?: string): Date {
  if (dateString) {
    const parsed = new Date(`${dateString}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function resolveIngredientIds(search?: string): Promise<string[]> {
  const searchTerm = search?.trim();
  if (!searchTerm) return [];

  const dataSourceId = LIFE_OS_DATABASES.ingredients;
  if (!dataSourceId) return [];

  try {
    const result = await queryDatabase(dataSourceId, {
      filter: {
        property: INGREDIENT_PROPS.title,
        title: { contains: searchTerm },
      },
    });

    const pages = (result as { results?: Array<{ id?: string }> })?.results || [];
    return pages
      .map((page) => page.id)
      .filter((id): id is string => Boolean(id));
  } catch (error) {
    console.warn('[ToolExecutor] Ingredient search failed:', error);
    return [];
  }
}

async function resolveRecipeIdByName(recipeName: string): Promise<string | null> {
  let recipeId = findRecipeByTitle(recipeName);
  if (recipeId) return recipeId;

  const dataSourceId = LIFE_OS_DATABASES.recipes;
  if (!dataSourceId) return null;

  try {
    const result = await queryDatabase(dataSourceId, buildRecipeFilter({ search: recipeName }));
    cacheQueryResults(result, 'recipe');

    recipeId = findRecipeByTitle(recipeName);
    if (recipeId) return recipeId;

    const first = (result as { results?: Array<{ id?: string }> })?.results?.[0];
    return first?.id || null;
  } catch (error) {
    console.warn('[ToolExecutor] Recipe lookup failed:', error);
    return null;
  }
}

async function getIngredientNamesForRecipe(recipeId: string): Promise<string[]> {
  if (!RECIPE_PROPS.ingredients) return [];

  try {
    const page = await retrievePage(recipeId) as { properties?: Record<string, unknown> };
    const relationProp = page?.properties?.[RECIPE_PROPS.ingredients] as
      | { relation?: Array<{ id: string }> }
      | undefined;
    const ingredientIds =
      relationProp?.relation?.map((rel) => rel.id).filter(Boolean) || [];

    if (ingredientIds.length === 0) return [];
    return await resolveIngredientNames(ingredientIds);
  } catch (error) {
    console.warn('[ToolExecutor] Failed to load recipe ingredients:', error);
    return [];
  }
}

interface RecipeDetails {
  ingredientNames: string[];
  category: string | null;
  difficulty: string | null;
  prepTime: number | null;
  cookTime: number | null;
}

async function getRecipeDetailsForShoppingList(recipeId: string): Promise<RecipeDetails> {
  if (!RECIPE_PROPS.ingredients) return { ingredientNames: [], category: null, difficulty: null, prepTime: null, cookTime: null };

  try {
    const page = await retrievePage(recipeId) as { properties?: Record<string, unknown> };
    if (!page?.properties) return { ingredientNames: [], category: null, difficulty: null, prepTime: null, cookTime: null };

    const props = page.properties;

    // Extract ingredient relation IDs
    const relationProp = props[RECIPE_PROPS.ingredients] as { relation?: Array<{ id: string }> } | undefined;
    const ingredientIds = relationProp?.relation?.map(rel => rel.id).filter(Boolean) || [];
    const ingredientNames = ingredientIds.length > 0 ? await resolveIngredientNames(ingredientIds) : [];

    // Extract rich recipe context from the same page (zero additional API calls)
    const categoryProp = props[RECIPE_PROPS.category] as { select?: { name?: string } } | undefined;
    const difficultyProp = props[RECIPE_PROPS.difficulty] as { select?: { name?: string } } | undefined;
    const prepTimeProp = props[RECIPE_PROPS.prepTime] as { number?: number } | undefined;
    const cookTimeProp = props[RECIPE_PROPS.cookTime] as { number?: number } | undefined;

    return {
      ingredientNames,
      category: categoryProp?.select?.name || null,
      difficulty: difficultyProp?.select?.name || null,
      prepTime: prepTimeProp?.number || null,
      cookTime: cookTimeProp?.number || null,
    };
  } catch (error) {
    console.warn('[ToolExecutor] Failed to load recipe details:', error);
    return { ingredientNames: [], category: null, difficulty: null, prepTime: null, cookTime: null };
  }
}

async function resolveIngredientNames(ingredientIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(ingredientIds));
  const pages = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await retrievePage(id);
      } catch (error) {
        console.warn('[ToolExecutor] Failed to load ingredient page:', error);
        return null;
      }
    })
  );

  const names = pages
    .map((page) =>
      extractTitleFromProperty(
        (page as { properties?: Record<string, unknown> })?.properties?.[INGREDIENT_PROPS.title]
      )
    )
    .filter((name): name is string => Boolean(name));

  return dedupeNames(names);
}

function extractTitleFromProperty(prop: unknown): string | null {
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text || null;
}

function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  }
  return Array.from(seen.values());
}

/**
 * Extract select value from a Notion property (local helper for toolExecutor)
 */
function extractSelectFromProp(prop: unknown): string {
  const p = prop as { status?: { name?: string }; select?: { name?: string } };
  return p?.status?.name || p?.select?.name || 'Unknown';
}

/**
 * Find or create ingredient pages in the Ingredients database.
 * Returns an array of page IDs for relation linking.
 */
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

// Recurring task completion is handled by recurringHook.ts (imported above)
