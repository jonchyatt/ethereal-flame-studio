/**
 * Tool Executor for Notion Operations
 *
 * Routes Claude tool_use calls to Notion SDK operations.
 * Handles ALL Life OS operations:
 * - Read: Tasks, Bills, Projects, Goals, Habits queries
 * - Write: Create tasks, update status, mark bills paid, pause tasks, add project items
 */

import { queryDatabase, createPage, updatePage } from './NotionClient';
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
  buildBillPaidUpdate,
  buildTaskPauseUpdate,
} from './schemas';
import {
  cacheResults,
  findTaskByTitle,
  findBillByTitle,
  findProjectByTitle,
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
      const dataSourceId = LIFE_OS_DATABASES.bills;
      if (!dataSourceId) {
        return 'Bills database is not configured. Please set NOTION_BILLS_DATA_SOURCE_ID.';
      }

      const filterOptions = buildBillFilter({
        timeframe: input.timeframe as 'this_week' | 'this_month' | 'overdue' | undefined,
        unpaidOnly: input.unpaidOnly !== false,
      });

      const result = await queryDatabase(dataSourceId, filterOptions);

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
