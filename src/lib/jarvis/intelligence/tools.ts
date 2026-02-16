/**
 * Tool Definitions for Jarvis
 *
 * Defines Claude tool schemas for Notion, Memory, and Tutorial operations.
 *
 * Notion Tools (11 total, via SDK):
 * - 5 Read tools: query_tasks, query_bills, query_projects, query_goals, query_habits
 * - 6 Write tools: create_task, create_bill, update_task_status, mark_bill_paid, pause_task, add_project_item
 *
 * Memory Tools (5 total, via local DB):
 * - remember_fact, forget_fact, list_memories, delete_all_memories, restore_memory
 *
 * Tutorial Tools (6 total, via TutorialManager):
 * - start_tutorial, teach_topic, continue_tutorial, skip_tutorial_module, get_tutorial_progress, get_quick_reference
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
 * 6 Write tools: create_task, create_bill, update_task_status, mark_bill_paid, pause_task, add_project_item
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
          description: 'Optional due date in YYYY-MM-DD format. Use the current date from context for "today", add days for "tomorrow", etc.'
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
    name: 'create_bill',
    description: 'Create a new bill in the user\'s Notion bills tracker. Use this when the user wants to add a bill, payment, or financial obligation to track.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The bill name (e.g., "Electric bill", "Netflix subscription")'
        },
        amount: {
          type: 'number',
          description: 'The bill amount in dollars'
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format'
        },
        category: {
          type: 'string',
          description: 'Bill category (e.g., "Utilities", "Entertainment", "Insurance")'
        }
      },
      required: ['title']
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
  },
  // =========================================================================
  // Feature Pack: Recipes, Meal Planning, Subscriptions (Phase 16)
  // =========================================================================
  {
    name: 'query_recipes',
    description: 'Search recipes by name, category, difficulty, tags, or ingredients. Use when user asks about recipes, what to cook, meal ideas, or food suggestions.',
    input_schema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Recipe name, tag, or ingredient to search for'
        },
        category: {
          type: 'string',
          description: 'Filter by meal type',
          enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
        },
        difficulty: {
          type: 'string',
          description: 'Filter by difficulty level',
          enum: ['Easy', 'Medium', 'Hard']
        },
        favourites_only: {
          type: 'boolean',
          description: 'Only return favourite recipes'
        }
      }
    }
  },
  {
    name: 'add_to_meal_plan',
    description: 'Add a meal to the weekly plan. Use when user wants to plan what to eat on a specific day.',
    input_schema: {
      type: 'object',
      properties: {
        day_of_week: {
          type: 'string',
          description: 'Day of the week',
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        meal_type: {
          type: 'string',
          description: 'Which meal of the day',
          enum: ['Breakfast', 'Lunch', 'Dinner']
        },
        recipe_name: {
          type: 'string',
          description: 'What to eat (recipe name or description)'
        },
        setting: {
          type: 'string',
          description: 'Where the meal will be (optional)',
          enum: ['Home', 'Dine-Out', 'Takeout']
        }
      },
      required: ['day_of_week', 'meal_type', 'recipe_name']
    }
  },
  {
    name: 'get_subscriptions',
    description: 'Get active subscriptions with payment links. Use when user asks about bills to pay, subscriptions, recurring payments, or monthly costs.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by subscription status',
          enum: ['active', 'cancelled', 'all']
        }
      }
    }
  },
  {
    name: 'create_recurring_task',
    description: 'Create a task that repeats on a schedule. Use when user wants something done regularly (daily, weekly, monthly).',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task name/description'
        },
        frequency: {
          type: 'string',
          description: 'How often the task repeats',
          enum: ['daily', 'weekly', 'monthly']
        },
        start_date: {
          type: 'string',
          description: 'First occurrence date (YYYY-MM-DD). Uses today if not specified.'
        },
        day_of_week: {
          type: 'string',
          description: 'For weekly tasks: which day (e.g., Monday, Tuesday)',
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }
      },
      required: ['title', 'frequency']
    }
  },
  // =========================================================================
  // Panel tools (Phase T1) - open/close the Notion overlay panel
  // =========================================================================
  {
    name: 'open_notion_panel',
    description: 'Open the Notion panel overlay to show a specific database or page. Use when the user says "show me my tasks", "open my budgets", "let me see my goals", or any request to view a Notion database.',
    input_schema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description: 'The database key or label to open (e.g. "tasks", "budgets", "goals", "journal", "recipes")'
        },
        mode: {
          type: 'string',
          description: 'Panel mode: view (browse), show (guided tour), teach (tutorial)',
          enum: ['view', 'show', 'teach']
        }
      },
      required: ['database']
    }
  },
  {
    name: 'close_notion_panel',
    description: 'Close the Notion panel overlay. Use when the user says "close the panel", "hide that", or wants to dismiss the Notion view.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

// Re-export memory tools for combined tool usage
export { memoryTools } from './memoryTools';

// Re-export tutorial tools
export { tutorialTools } from '../tutorial/tutorialTools';

/**
 * Get all available tools for Claude
 */
export function getAllTools(): ToolDefinition[] {
  // Import dynamically to avoid circular dependencies
  const { memoryTools } = require('./memoryTools');
  const { tutorialTools } = require('../tutorial/tutorialTools');

  return [
    ...notionTools,
    ...memoryTools,
    ...tutorialTools
  ];
}
