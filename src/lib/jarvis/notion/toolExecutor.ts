/**
 * Tool Executor for Notion Operations
 *
 * Routes Claude tool_use calls to MCP operations.
 * Handles ALL Life OS operations:
 * - Read: Tasks, Bills, Projects, Goals, Habits queries
 * - Write: Create tasks, update status, mark bills paid, pause tasks, add project items
 */

import { callMCPTool } from './NotionClient';
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

/**
 * Execute a Notion tool call by routing to MCP
 *
 * @param toolName - The Claude tool name (e.g., 'query_tasks')
 * @param input - The tool input parameters from Claude
 * @returns Speech-friendly result string
 */
export async function executeNotionTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  console.log(`[ToolExecutor] Executing tool: ${toolName}`, input);

  try {
    switch (toolName) {
      // =========================================================================
      // READ OPERATIONS (Phase 04-02)
      // =========================================================================

      case 'query_tasks': {
        const databaseId = LIFE_OS_DATABASES.tasks;
        if (!databaseId) {
          return 'Task database is not configured. Please set NOTION_TASKS_DATA_SOURCE_ID.';
        }

        const filter = buildTaskFilter({
          filter: input.filter as 'today' | 'this_week' | 'overdue' | 'all' | undefined,
          status: input.status as 'pending' | 'completed' | 'all' | undefined,
        });

        const result = await callMCPTool('API-query-data-source', {
          data_source_id: databaseId,
          ...filter,
        });

        // Cache results for follow-up operations
        cacheQueryResults(result, 'task');

        return formatTaskResults(result);
      }

      case 'query_bills': {
        const databaseId = LIFE_OS_DATABASES.bills;
        if (!databaseId) {
          return 'Bills database is not configured. Please set NOTION_BILLS_DATA_SOURCE_ID.';
        }

        const filter = buildBillFilter({
          timeframe: input.timeframe as 'this_week' | 'this_month' | 'overdue' | undefined,
          unpaidOnly: input.unpaidOnly !== false,
        });

        const result = await callMCPTool('API-query-data-source', {
          data_source_id: databaseId,
          ...filter,
        });

        // Cache results for follow-up operations
        cacheQueryResults(result, 'bill');

        return formatBillResults(result);
      }

      case 'query_projects': {
        const databaseId = LIFE_OS_DATABASES.projects;
        if (!databaseId) {
          return 'Projects database is not configured. Please set NOTION_PROJECTS_DATA_SOURCE_ID.';
        }

        const filter = buildProjectFilter({
          status: input.status as 'active' | 'completed' | 'all' | undefined,
        });

        const result = await callMCPTool('API-query-data-source', {
          data_source_id: databaseId,
          ...filter,
        });

        // Cache results for follow-up operations
        cacheQueryResults(result, 'project');

        return formatProjectResults(result);
      }

      case 'query_goals': {
        const databaseId = LIFE_OS_DATABASES.goals;
        if (!databaseId) {
          return 'Goals database is not configured. Please set NOTION_GOALS_DATA_SOURCE_ID.';
        }

        const filter = buildGoalFilter({
          status: input.status as 'active' | 'achieved' | 'all' | undefined,
        });

        const result = await callMCPTool('API-query-data-source', {
          data_source_id: databaseId,
          ...filter,
        });

        // Cache results for follow-up operations
        cacheQueryResults(result, 'goal');

        return formatGoalResults(result);
      }

      case 'query_habits': {
        const databaseId = LIFE_OS_DATABASES.habits;
        if (!databaseId) {
          return 'Habits database is not configured. Please set NOTION_HABITS_DATA_SOURCE_ID.';
        }

        const filter = buildHabitFilter({
          frequency: input.frequency as 'daily' | 'weekly' | 'monthly' | 'all' | undefined,
        });

        const result = await callMCPTool('API-query-data-source', {
          data_source_id: databaseId,
          ...filter,
        });

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

        await callMCPTool('API-post-page', {
          parent: { database_id: databaseId },
          properties,
        });

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
          const foundId = findTaskByTitle(taskId);
          if (!foundId) {
            return `I couldn't find a task matching "${taskId}". Try asking "What tasks do I have?" first so I can see your task list.`;
          }
          taskId = foundId;
        }

        const properties = buildTaskStatusUpdate(newStatus);

        await callMCPTool('API-patch-page', {
          page_id: taskId,
          properties,
        });

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
          const foundId = findBillByTitle(billId);
          if (!foundId) {
            return `I couldn't find a bill matching "${billId}". Try asking "What bills are due?" first so I can see your bills.`;
          }
          billId = foundId;
        }

        const properties = buildBillPaidUpdate();

        await callMCPTool('API-patch-page', {
          page_id: billId,
          properties,
        });

        return 'Marked the bill as paid.';
      }

      case 'pause_task': {
        // If task_id looks like a title (not UUID), try to find it
        let taskId = input.task_id as string;
        const until = input.until as string | undefined;

        if (!isValidUUID(taskId)) {
          const foundId = findTaskByTitle(taskId);
          if (!foundId) {
            return `I couldn't find a task matching "${taskId}". Try asking "What tasks do I have?" first so I can see your task list.`;
          }
          taskId = foundId;
        }

        const properties = buildTaskPauseUpdate(until);

        await callMCPTool('API-patch-page', {
          page_id: taskId,
          properties,
        });

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
          const foundId = findProjectByTitle(projectId);
          if (!foundId) {
            return `I couldn't find a project matching "${projectId}". Try asking "What projects am I working on?" first so I can see your projects.`;
          }
          projectId = foundId;
        }

        // Create a new task linked to the project
        const properties = buildTaskProperties({
          title: item,
          project_id: projectId,
        });

        await callMCPTool('API-post-page', {
          parent: { database_id: databaseId },
          properties,
        });

        return `Added "${item}" to the project.`;
      }

      default:
        console.warn(`[ToolExecutor] Unknown tool: ${toolName}`);
        return `I don't have that capability yet, but I'm always learning.`;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error);

    // Return user-friendly error messages
    if (errorMessage.includes('NOTION_TOKEN')) {
      return 'I need to be connected to Notion first. Please check the configuration.';
    }
    if (errorMessage.includes('timeout')) {
      return 'Notion took too long to respond. Please try again in a moment.';
    }
    if (errorMessage.includes('not running') || errorMessage.includes('exited')) {
      return 'Lost connection to Notion. Let me try reconnecting on your next request.';
    }

    return `I had trouble accessing Notion: ${errorMessage}. Please try again.`;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Property name constants for extracting titles from different database types
 */
const TITLE_PROPS: Record<CachedItem['type'], string> = {
  task: 'Task',
  bill: 'Bill',
  project: 'Project',
  goal: 'Goal',
  habit: 'Habit',
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
