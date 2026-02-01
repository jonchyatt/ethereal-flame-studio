/**
 * Tool Definitions for Jarvis
 *
 * Defines Claude tool schemas for Notion operations.
 * Handlers acknowledge capability gap gracefully until Phase 4.
 */

/**
 * Tool definition following Claude's tool format
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

/**
 * Notion tool definitions for Phase 4 integration
 *
 * These define the schemas for Claude to understand what actions are available.
 * Actual handlers are implemented in Phase 4.
 */
export const notionTools: ToolDefinition[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the user\'s Notion inbox. Use this when the user wants to add a todo, reminder, or action item.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The task title/description'
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in YYYY-MM-DD format'
        },
        priority: {
          type: 'string',
          description: 'Task priority level',
          enum: ['low', 'medium', 'high']
        }
      },
      required: ['title']
    }
  },
  {
    name: 'query_tasks',
    description: 'Search and retrieve tasks from Notion. Use this when the user asks about their todos, upcoming tasks, or overdue items.',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Time-based filter for tasks',
          enum: ['today', 'this_week', 'overdue', 'all']
        },
        status: {
          type: 'string',
          description: 'Filter by completion status',
          enum: ['pending', 'completed', 'all']
        }
      },
      required: ['filter']
    }
  },
  {
    name: 'query_bills',
    description: 'Check upcoming bills and payment status. Use this when the user asks about bills due, payments, or financial obligations.',
    input_schema: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time range for bill lookup',
          enum: ['this_week', 'this_month', 'overdue']
        }
      },
      required: ['timeframe']
    }
  },
  {
    name: 'update_task_status',
    description: 'Mark a task as complete, in progress, or pending. Use this when the user wants to update a task\'s status.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The Notion task ID to update'
        },
        new_status: {
          type: 'string',
          description: 'The new status for the task',
          enum: ['pending', 'in_progress', 'completed']
        }
      },
      required: ['task_id', 'new_status']
    }
  },
  {
    name: 'mark_bill_paid',
    description: 'Mark a bill as paid. Use this when the user confirms they\'ve paid a bill.',
    input_schema: {
      type: 'object',
      properties: {
        bill_id: {
          type: 'string',
          description: 'The Notion bill ID to mark as paid'
        }
      },
      required: ['bill_id']
    }
  }
];

/**
 * Map of tool names to human-readable actions
 */
const toolActionDescriptions: Record<string, string> = {
  create_task: 'create a task',
  query_tasks: 'check your tasks',
  query_bills: 'look up your bills',
  update_task_status: 'update a task',
  mark_bill_paid: 'mark a bill as paid'
};

/**
 * Handle calls to tools that aren't yet implemented
 *
 * Returns a friendly message acknowledging what the user wanted
 * and noting the capability is coming soon.
 *
 * @param toolName - The tool that was called
 * @param input - The input parameters (logged for future roadmap)
 * @returns A friendly message for the user
 */
export function handleToolNotImplemented(toolName: string, input: unknown): string {
  // Log the request for roadmap visibility
  console.log(`[Tools] Unimplemented tool called: ${toolName}`, input);

  const action = toolActionDescriptions[toolName] || `do that (${toolName})`;

  return `I understand you want me to ${action}. ` +
    `Notion integration is coming soon - I'll be able to help with that in the next update. ` +
    `For now, I can help you think through it or remind you to do it manually.`;
}
