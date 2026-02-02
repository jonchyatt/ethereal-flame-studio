/**
 * Tool Definitions for Jarvis
 *
 * Defines Claude tool schemas for Notion and Memory operations.
 *
 * Notion Tools (10 total, via MCP):
 * - 5 Read tools: query_tasks, query_bills, query_projects, query_goals, query_habits
 * - 5 Write tools: create_task, update_task_status, mark_bill_paid, pause_task, add_project_item
 *
 * Memory Tools (5 total, via local DB):
 * - remember_fact, forget_fact, list_memories, delete_all_memories, restore_memory
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
 * Notion tool definitions for Life OS integration
 *
 * 5 Read tools: query_tasks, query_bills, query_projects, query_goals, query_habits
 * 5 Write tools: create_task, update_task_status, mark_bill_paid, pause_task, add_project_item
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
  },
  // =========================================================================
  // NEW: Projects, Goals, Habits read tools (Phase 04-02)
  // =========================================================================
  {
    name: 'query_projects',
    description: 'Get projects from Notion. Use when user asks about their projects, what they are working on, or project status.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by project status',
          enum: ['active', 'paused', 'completed', 'all']
        }
      }
    }
  },
  {
    name: 'query_goals',
    description: 'Get goals from Notion. Use when user asks about their goals, objectives, or what they are working towards.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by goal status',
          enum: ['active', 'achieved', 'all']
        }
      }
    }
  },
  {
    name: 'query_habits',
    description: 'Get habits and their progress from Notion. Use when user asks about habits, routines, streaks, or consistency.',
    input_schema: {
      type: 'object',
      properties: {
        frequency: {
          type: 'string',
          description: 'Filter by habit frequency',
          enum: ['daily', 'weekly', 'monthly', 'all']
        }
      }
    }
  },
  // =========================================================================
  // Write tools (Phase 04-03)
  // =========================================================================
  {
    name: 'pause_task',
    description: 'Pause or defer a task for later. Use when user wants to postpone a task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The Notion task ID to pause'
        },
        until: {
          type: 'string',
          description: 'Optional date to resume (YYYY-MM-DD format)'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'add_project_item',
    description: 'Add an item to a project\'s needs list. Use when user wants to add requirements, sub-tasks, or notes to a project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'The project ID or title'
        },
        item: {
          type: 'string',
          description: 'The item to add'
        },
        type: {
          type: 'string',
          description: 'Type of item',
          enum: ['need', 'task', 'note']
        }
      },
      required: ['project_id', 'item']
    }
  }
];

// Re-export memory tools for combined tool usage
export { memoryTools } from './memoryTools';
