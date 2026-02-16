/**
 * Tool Executor for Notion Operations
 *
 * Routes Claude tool_use calls to Notion SDK operations.
 * Handles ALL Life OS operations:
 * - Read: Tasks, Bills, Projects, Goals, Habits queries
 * - Write: Create tasks, update status, mark bills paid, pause tasks, add project items
 */

import { queryDatabase, createPage, updatePage, retrievePage } from './NotionClient';
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
  buildBillPaidUpdate,
  buildTaskPauseUpdate,
  calculateNextDueDate,
  TASK_PROPS,
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
import { useDashboardStore } from '../stores/dashboardStore';
import { logEvent, type ToolInvocationData } from '../memory/queries/dailyLogs';
import { trackErrorPattern } from '../resilience/errorTracking';

/**
 * Trigger dashboard refresh after write operations
 * Uses setTimeout to ensure it runs after current call stack
 */
function triggerDashboardRefresh(): void {
  setTimeout(() => {
    try {
      useDashboardStore.getState().triggerRefresh();
      console.log('[ToolExecutor] Triggered dashboard refresh');
    } catch (error) {
      // Silently fail if store not available (e.g., SSR)
      console.warn('[ToolExecutor] Could not trigger dashboard refresh:', error);
    }
  }, 100);
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
    case 'pause_task':
      return `Paused "${input.task_id}"`;
    case 'add_project_item':
      return `Added "${input.item}" to ${input.project_id}`;
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
      });

      await createPage(databaseId, properties);

      triggerDashboardRefresh();

      let response = `Added bill: "${title}"`;
      if (input.amount) {
        response += ` for $${(input.amount as number).toFixed(2)}`;
      }
      if (input.due_date) {
        response += ` due ${input.due_date}`;
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
      triggerDashboardRefresh();

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
      triggerDashboardRefresh();

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
      let billId = input.bill_id as string;

      if (!isValidUUID(billId)) {
        // First try the cache
        let foundId = findBillByTitle(billId);

        // If not in cache, auto-query bills to populate cache then retry
        if (!foundId) {
          console.log('[ToolExecutor] Bill not in cache, auto-querying to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.bills;
          if (dataSourceId) {
            const filterOptions = buildBillFilter({ timeframe: 'this_month', unpaidOnly: true });
            const result = await queryDatabase(dataSourceId, filterOptions);
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
      triggerDashboardRefresh();

      return 'Marked the bill as paid.';
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
      triggerDashboardRefresh();

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
      triggerDashboardRefresh();

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

      triggerDashboardRefresh();

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

      triggerDashboardRefresh();

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

async function addItemsToShoppingList(
  items: string[]
): Promise<{ attempted: boolean; created: number }> {
  const databaseId = LIFE_OS_DATABASE_IDS.shoppingList;
  if (!databaseId) {
    return { attempted: false, created: 0 };
  }

  const uniqueItems = dedupeNames(items).slice(0, MAX_SHOPPING_LIST_ITEMS);
  let created = 0;

  for (const item of uniqueItems) {
    try {
      await createPage(databaseId, {
        [SHOPPING_LIST_PROPS.title]: {
          title: [{ text: { content: item } }],
        },
      });
      created += 1;
    } catch (error) {
      console.warn('[ToolExecutor] Failed to add shopping list item:', { item, error });
    }
  }

  return { attempted: true, created };
}

/**
 * Handle recurring task completion - auto-create next instance
 *
 * When a recurring task (Daily/Weekly/Monthly) is marked complete,
 * automatically create the next instance with updated due date.
 *
 * @param taskId - The completed task's ID
 * @returns Response message if next task was created, null otherwise
 */
async function handleRecurringTaskCompletion(taskId: string): Promise<string | null> {
  try {
    // Fetch the completed task's properties
    const page = await retrievePage(taskId) as {
      properties: Record<string, unknown>;
    };

    if (!page?.properties) {
      console.log('[ToolExecutor] Could not retrieve task properties for recurrence check');
      return null;
    }

    // Extract frequency
    const frequencyProp = page.properties[TASK_PROPS.frequency] as {
      select?: { name?: string };
    };
    const frequency = frequencyProp?.select?.name;

    // If no frequency or One-time, no recurrence needed
    if (!frequency || frequency === 'One-time') {
      console.log('[ToolExecutor] Task is not recurring, skipping auto-creation');
      return null;
    }

    // Only handle Daily, Weekly, Monthly
    if (!['Daily', 'Weekly', 'Monthly'].includes(frequency)) {
      console.log(`[ToolExecutor] Unknown frequency: ${frequency}, skipping`);
      return null;
    }

    // Extract title
    const titleProp = page.properties[TASK_PROPS.title] as {
      title?: Array<{ plain_text?: string }>;
    };
    const title = titleProp?.title?.[0]?.plain_text || 'Recurring Task';

    // Extract current due date
    const dueDateProp = page.properties[TASK_PROPS.dueDate] as {
      date?: { start?: string };
    };
    const currentDueDate = dueDateProp?.date?.start || null;

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      currentDueDate,
      frequency as 'Daily' | 'Weekly' | 'Monthly'
    );

    // Extract priority (to preserve it)
    const priorityProp = page.properties[TASK_PROPS.priority] as {
      select?: { name?: string };
    };
    const priority = priorityProp?.select?.name;

    // Extract project relation (to preserve it)
    const projectProp = page.properties[TASK_PROPS.project] as {
      relation?: Array<{ id: string }>;
    };
    const projectId = projectProp?.relation?.[0]?.id;

    // Create the next instance
    const databaseId = LIFE_OS_DATABASE_IDS.tasks;
    if (!databaseId) {
      console.error('[ToolExecutor] Task database ID not configured');
      return null;
    }

    const newProperties = buildTaskProperties({
      title,
      due_date: nextDueDate,
      frequency: frequency as 'Daily' | 'Weekly' | 'Monthly',
      priority,
      project_id: projectId,
    });

    await createPage(databaseId, newProperties);

    console.log(`[ToolExecutor] Created next ${frequency} instance of "${title}" due ${nextDueDate}`);

    return `Created next ${frequency.toLowerCase()} occurrence due ${nextDueDate}.`;
  } catch (error) {
    console.error('[ToolExecutor] Error handling recurring task completion:', error);
    // Don't throw - recurrence creation is best-effort
    return null;
  }
}
