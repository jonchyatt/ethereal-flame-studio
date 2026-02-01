/**
 * Tool Executor for Notion Operations
 *
 * Routes Claude tool_use calls to MCP operations.
 * Handles ALL Life OS read operations (Tasks, Bills, Projects, Goals, Habits)
 * Write operations are placeholders for Plan 04-03.
 */

import { callMCPTool } from './NotionClient';
import {
  LIFE_OS_DATABASES,
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
} from './schemas';

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

        return formatHabitResults(result);
      }

      // =========================================================================
      // WRITE OPERATIONS (Placeholders for Phase 04-03)
      // =========================================================================

      case 'create_task':
        return 'Creating tasks is coming soon. For now, I can help you think through what needs to be done.';

      case 'update_task_status':
        return 'Updating task status is coming soon. I noted which task you want to update.';

      case 'mark_bill_paid':
        return 'Marking bills as paid is coming soon. I can remind you to do it manually.';

      case 'pause_task':
        return 'Pausing tasks is coming soon. Let me know if you need help prioritizing.';

      case 'add_project_item':
        return 'Adding items to projects is coming soon. I can help you think through what to add.';

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
