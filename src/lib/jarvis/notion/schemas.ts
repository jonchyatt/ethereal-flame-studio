/**
 * Notion Database Schemas for Life OS Bundle
 *
 * Type definitions and query builders for ALL Life OS databases:
 * - Tasks (To-Do management)
 * - Bills (Financial tracking)
 * - Projects (Project management)
 * - Goals (Objective tracking)
 * - Habits (Routine tracking)
 *
 * IMPORTANT: Property names are case-sensitive and must match your Notion setup.
 * Run `npm run discover-notion` to find your exact property names.
 *
 * v2 EXTENSION POINT: Client & Content OS databases commented below.
 */

// =============================================================================
// Database Configuration
// =============================================================================

/**
 * v1: Life OS Bundle database IDs
 * These are populated from environment variables after running discovery script.
 */
// Data source IDs for queries (API-query-data-source)
export const LIFE_OS_DATABASES = {
  tasks: process.env.NOTION_TASKS_DATA_SOURCE_ID || '',
  bills: process.env.NOTION_BILLS_DATA_SOURCE_ID || '',
  projects: process.env.NOTION_PROJECTS_DATA_SOURCE_ID || '',
  goals: process.env.NOTION_GOALS_DATA_SOURCE_ID || '',
  habits: process.env.NOTION_HABITS_DATA_SOURCE_ID || '',
  // Feature Pack databases (Phase 16)
  recipes: process.env.NOTION_RECIPES_DATA_SOURCE_ID || '',
  mealPlan: process.env.NOTION_MEAL_PLAN_DATA_SOURCE_ID || '',
  subscriptions: process.env.NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID || '',
  ingredients: process.env.NOTION_INGREDIENTS_DATA_SOURCE_ID || '',
} as const;

// Database IDs for creates (API-post-page) - different from data_source_id!
export const LIFE_OS_DATABASE_IDS = {
  tasks: process.env.NOTION_TASKS_DATABASE_ID || '',
  bills: process.env.NOTION_BILLS_DATABASE_ID || '',
  mealPlan: process.env.NOTION_MEAL_PLAN_DATABASE_ID || '',
  shoppingList: process.env.NOTION_SHOPPING_LIST_DATABASE_ID || '',
} as const;

/**
 * v2 EXTENSION POINT: Client & Content OS databases
 * Uncomment and configure when implementing EXE-ADV-04
 *
 * export const CLIENT_OS_DATABASES = {
 *   clients: process.env.NOTION_CLIENTS_DATA_SOURCE_ID || '',
 *   content: process.env.NOTION_CONTENT_DATA_SOURCE_ID || '',
 * } as const;
 */

// =============================================================================
// Property Name Constants
// =============================================================================

/**
 * Task database property names
 * Update these to match your Life OS setup (case-sensitive!)
 */
export const TASK_PROPS = {
  title: 'Name', // Title property (was 'Task' but this database uses 'Name')
  status: 'Status', // Status property (Not started, In progress, etc.)
  dueDate: 'Do Dates', // Date property (this database uses 'Do Dates' not 'Due Date')
  project: 'Project', // Relation to Projects database
  priority: 'Daily Priority', // Select property (this database uses 'Daily Priority')
  frequency: 'Frequency', // Select property (One-time, Daily, Weekly, Monthly) for recurring tasks
} as const;

/**
 * Bill database property names
 */
export const BILL_PROPS = {
  title: 'Bill', // or 'Name'
  amount: 'Amount', // Number property
  dueDate: 'Due Date', // Date property
  paid: 'Paid', // Checkbox property
  category: 'Category', // Select property
} as const;

/**
 * Project database property names
 */
export const PROJECT_PROPS = {
  title: 'Project', // or 'Name'
  status: 'Status', // Select: Active, On Hold, Completed
  area: 'Area', // Relation to Life Areas
  timeline: 'Timeline', // Date range property
  priority: 'Priority', // Select: Low, Medium, High
  tasks: 'Tasks', // Relation to Tasks database
} as const;

/**
 * Goal database property names
 */
export const GOAL_PROPS = {
  title: 'Goal', // or 'Name', 'Objective'
  status: 'Status', // Select: Not Started, In Progress, Achieved
  targetDate: 'Target Date', // Date property
  progress: 'Progress', // Number (percent) or formula
  area: 'Area', // Relation to Life Areas
} as const;

/**
 * Habit database property names
 */
export const HABIT_PROPS = {
  title: 'Habit', // or 'Name', 'Routine'
  frequency: 'Frequency', // Select: Daily, Weekly, Monthly
  streak: 'Streak', // Number property (rollup or formula)
  lastCompleted: 'Last Completed', // Date property
  area: 'Area', // Relation to Life Areas
} as const;

// =============================================================================
// Feature Pack: Recipes, Meal Planning, Subscriptions (Phase 16)
// =============================================================================

/**
 * Recipe database property names
 * Data Source ID: 13902093-f0b3-8244-96cd-07f874f9f93d
 */
export const RECIPE_PROPS = {
  title: 'Name',           // Title property
  category: 'Category',    // Select: Breakfast, Lunch, Dinner, Snack, etc.
  difficulty: 'Difficulty', // Select: Easy, Medium, Hard
  rating: 'Rating',        // Select: stars or number
  prepTime: 'Prep Time (min)', // Number
  cookTime: 'Cook Time (min)', // Number
  url: 'Recipe Link',      // URL to external recipe
  favourite: 'Favourite',  // Checkbox
  kcal: 'Kcal',           // Number
  tags: 'Tags',            // Multi-select (optional)
  ingredients: 'Ingredients', // Relation to Ingredients (optional)
} as const;

/**
 * Weekly Meal Plan database property names
 * Data Source ID: 56102093-f0b3-83d5-a18c-07da9a50e696
 */
export const MEAL_PLAN_PROPS = {
  title: 'Name',           // Title property (meal entry name)
  dayOfWeek: 'Day of the week', // Select: Monday, Tuesday, etc.
  recipes: 'Recipes',      // Relation to Recipes database
  timeOfDay: 'Time of Day', // Rich text (Breakfast, Lunch, Dinner)
  setting: 'Setting',      // Select (e.g., Home, Dine-Out)
} as const;

/**
 * Subscriptions database property names
 * Data Source ID: 2e802093-f0b3-830e-b600-0711d4fa493f
 */
export const SUBSCRIPTION_PROPS = {
  title: 'Bill',           // Title property (subscription name)
  fees: 'Fees',            // Number (monthly/yearly cost)
  frequency: 'Frequency',  // Select: Monthly, Yearly, etc.
  status: 'Status',        // Status property
  serviceLink: 'Service Link', // URL to payment portal
  nextPaymentDate: 'Next Payment Date', // Formula (calculated)
  category: 'Category',    // Select
  startDate: 'Start Date', // Date
} as const;

/**
 * Ingredient database property names
 */
export const INGREDIENT_PROPS = {
  title: 'Name', // Title property
} as const;

/**
 * Shopping List database property names
 */
export const SHOPPING_LIST_PROPS = {
  title: 'Name', // Title property
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Notion filter structure for database queries
 */
export interface NotionFilter {
  property?: string;
  and?: NotionFilter[];
  or?: NotionFilter[];
  [key: string]:
    | string
    | number
    | boolean
    | NotionFilter[]
    | { equals?: string | number | boolean }
    | { does_not_equal?: string | number | boolean }
    | { contains?: string }
    | { before?: string; on_or_before?: string; equals?: string }
    | { name?: string }
    | undefined;
}

/**
 * Task properties from Notion
 */
export interface TaskProperties {
  id: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Completed' | string;
  dueDate: string | null;
  project: string | null;
  priority: 'Low' | 'Medium' | 'High' | null;
  frequency: 'One-time' | 'Daily' | 'Weekly' | 'Monthly' | null;
}

/**
 * Bill properties from Notion
 */
export interface BillProperties {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
  paid: boolean;
  category: string | null;
}

/**
 * Project properties from Notion
 */
export interface ProjectProperties {
  id: string;
  title: string;
  status: 'Active' | 'On Hold' | 'Completed' | string;
  area: string | null;
  timeline: { start: string | null; end: string | null } | null;
  priority: 'Low' | 'Medium' | 'High' | null;
}

/**
 * Goal properties from Notion
 */
export interface GoalProperties {
  id: string;
  title: string;
  status: 'Not Started' | 'In Progress' | 'Achieved' | string;
  targetDate: string | null;
  progress: number | null;
  area: string | null;
}

/**
 * Habit properties from Notion
 */
export interface HabitProperties {
  id: string;
  title: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | string;
  streak: number;
  lastCompleted: string | null;
  area: string | null;
}

/**
 * Recipe properties from Notion (Phase 16)
 */
export interface RecipeProperties {
  id: string;
  title: string;
  category: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string | null;
  rating: string | null;
  prepTime: number | null;
  cookTime: number | null;
  url: string | null;
  favourite: boolean;
}

/**
 * Meal Plan entry properties from Notion (Phase 16)
 */
export interface MealPlanProperties {
  id: string;
  title: string;
  dayOfWeek: string | null;
  timeOfDay: string | null;
  setting: string | null;
}

/**
 * Subscription properties from Notion (Phase 16)
 */
export interface SubscriptionProperties {
  id: string;
  title: string;
  fees: number | null;
  frequency: 'Monthly' | 'Yearly' | string | null;
  status: string | null;
  serviceLink: string | null;
  nextPaymentDate: string | null;
  category: string | null;
}

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Get today's date in the specified timezone.
 * Falls back to server time if timezone is invalid.
 *
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'Europe/London')
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone?: string): string {
  const now = new Date();

  if (timezone) {
    try {
      // Use Intl.DateTimeFormat to get the date in the user's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(now);
    } catch {
      // Invalid timezone, fall back to server time
      console.warn(`[schemas] Invalid timezone: ${timezone}, using server time`);
    }
  }

  return now.toISOString().split('T')[0];
}

/**
 * Get a date relative to today in the specified timezone.
 *
 * @param daysOffset - Number of days from today (positive = future, negative = past)
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInTimezone(daysOffset: number, timezone?: string): string {
  const today = getTodayInTimezone(timezone);
  const date = new Date(today + 'T00:00:00');
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Build a filter for task queries
 *
 * @param options.filter - Date filter: 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'all'
 * @param options.status - Status filter: 'pending' | 'completed' | 'all'
 * @param options.timezone - IANA timezone for date calculations (from X-Timezone header)
 */
export function buildTaskFilter(options: {
  filter?: 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'all';
  status?: 'pending' | 'completed' | 'all';
  timezone?: string;
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  const today = getTodayInTimezone(options.timezone);

  // Status filter (Jarvis Life OS uses 'Done' not 'Completed')
  if (options.status && options.status !== 'all') {
    if (options.status === 'pending') {
      filters.push({
        property: TASK_PROPS.status,
        status: { does_not_equal: 'Done' },
      });
    } else if (options.status === 'completed') {
      filters.push({
        property: TASK_PROPS.status,
        status: { equals: 'Done' },
      });
    }
  }

  // Date filter
  if (options.filter === 'today') {
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { equals: today },
    });
  } else if (options.filter === 'tomorrow') {
    const tomorrow = getDateInTimezone(1, options.timezone);
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { equals: tomorrow },
    });
  } else if (options.filter === 'this_week') {
    const nextWeek = getDateInTimezone(7, options.timezone);
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { on_or_before: nextWeek },
    });
  } else if (options.filter === 'overdue') {
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { before: today },
    });
    // Only incomplete tasks for overdue (Jarvis Life OS uses 'Done')
    filters.push({
      property: TASK_PROPS.status,
      status: { does_not_equal: 'Done' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for bill queries
 *
 * @param options.timeframe - 'this_week' | 'this_month' | 'overdue'
 * @param options.unpaidOnly - Filter to unpaid bills only (default true)
 * @param options.timezone - IANA timezone for date calculations (from X-Timezone header)
 */
export function buildBillFilter(options: {
  timeframe?: 'this_week' | 'this_month' | 'overdue';
  unpaidOnly?: boolean;
  timezone?: string;
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  const today = getTodayInTimezone(options.timezone);

  // Default to unpaid only
  if (options.unpaidOnly !== false) {
    filters.push({
      property: BILL_PROPS.paid,
      checkbox: { equals: false },
    });
  }

  if (options.timeframe === 'this_week') {
    const nextWeek = getDateInTimezone(7, options.timezone);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextWeek },
    });
  } else if (options.timeframe === 'this_month') {
    const nextMonth = getDateInTimezone(30, options.timezone);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextMonth },
    });
  } else if (options.timeframe === 'overdue') {
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { before: today },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for project queries
 */
export function buildProjectFilter(options: {
  status?: 'active' | 'completed' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  if (options.status === 'active') {
    filters.push({
      property: PROJECT_PROPS.status,
      status: { equals: 'Active' },
    });
  } else if (options.status === 'completed') {
    filters.push({
      property: PROJECT_PROPS.status,
      status: { equals: 'Completed' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for goal queries
 */
export function buildGoalFilter(options: {
  status?: 'active' | 'achieved' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  if (options.status === 'active') {
    filters.push({
      property: GOAL_PROPS.status,
      status: { does_not_equal: 'Achieved' },
    });
  } else if (options.status === 'achieved') {
    filters.push({
      property: GOAL_PROPS.status,
      status: { equals: 'Achieved' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for habit queries
 */
export function buildHabitFilter(options: {
  frequency?: 'daily' | 'weekly' | 'monthly' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  if (options.frequency && options.frequency !== 'all') {
    const frequencyMap: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };
    filters.push({
      property: HABIT_PROPS.frequency,
      select: { equals: frequencyMap[options.frequency] },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

// =============================================================================
// Result Formatters (Speech-Friendly Output)
// =============================================================================

/**
 * Property extractors for Notion API responses
 */
function extractTitle(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text || 'Untitled';
}

function extractSelect(prop: unknown): string {
  const p = prop as { status?: { name?: string }; select?: { name?: string } };
  return p?.status?.name || p?.select?.name || 'Unknown';
}

function extractDate(prop: unknown): string | null {
  const p = prop as { date?: { start?: string } };
  return p?.date?.start || null;
}

function extractNumber(prop: unknown): number {
  const p = prop as { number?: number };
  return p?.number || 0;
}

function extractCheckbox(prop: unknown): boolean {
  const p = prop as { checkbox?: boolean };
  return p?.checkbox || false;
}

function extractDateRange(
  prop: unknown
): { start: string | null; end: string | null } | null {
  const p = prop as { date?: { start?: string; end?: string } };
  if (!p?.date) return null;
  return { start: p.date.start || null, end: p.date.end || null };
}

/**
 * Format task query results for speech output
 * Includes page IDs for follow-up operations
 */
export function formatTaskResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No tasks found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[TASK_PROPS.title]);
    const status = extractSelect(p.properties[TASK_PROPS.status]);
    const dueDate = extractDate(p.properties[TASK_PROPS.dueDate]);

    let line = `- ${title} (${status})`;
    if (dueDate) {
      line += ` - Due: ${formatDateForSpeech(dueDate)}`;
    }
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format bill query results for speech output
 */
export function formatBillResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No bills due.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[BILL_PROPS.title]);
    const amount = extractNumber(p.properties[BILL_PROPS.amount]);
    const dueDate = extractDate(p.properties[BILL_PROPS.dueDate]);
    const paid = extractCheckbox(p.properties[BILL_PROPS.paid]);

    let line = `- ${title}: $${amount.toFixed(2)}`;
    if (dueDate) {
      line += ` - Due: ${formatDateForSpeech(dueDate)}`;
    }
    line += paid ? ' (paid)' : ' (unpaid)';
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format project query results for speech output
 */
export function formatProjectResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No projects found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[PROJECT_PROPS.title]);
    const status = extractSelect(p.properties[PROJECT_PROPS.status]);
    const priority = extractSelect(p.properties[PROJECT_PROPS.priority]);

    let line = `- ${title} (${status})`;
    if (priority && priority !== 'Unknown') {
      line += ` - ${priority} priority`;
    }
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format goal query results for speech output
 */
export function formatGoalResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No goals found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[GOAL_PROPS.title]);
    const status = extractSelect(p.properties[GOAL_PROPS.status]);
    const progress = extractNumber(p.properties[GOAL_PROPS.progress]);
    const targetDate = extractDate(p.properties[GOAL_PROPS.targetDate]);

    let line = `- ${title} (${status})`;
    if (progress > 0) {
      line += ` - ${progress}% complete`;
    }
    if (targetDate) {
      line += ` - Target: ${formatDateForSpeech(targetDate)}`;
    }
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format habit query results for speech output
 */
export function formatHabitResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No habits found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[HABIT_PROPS.title]);
    const frequency = extractSelect(p.properties[HABIT_PROPS.frequency]);
    const streak = extractNumber(p.properties[HABIT_PROPS.streak]);
    const lastCompleted = extractDate(p.properties[HABIT_PROPS.lastCompleted]);

    let line = `- ${title} (${frequency})`;
    if (streak > 0) {
      line += ` - ${streak} day streak`;
    }
    if (lastCompleted) {
      line += ` - Last: ${formatDateForSpeech(lastCompleted)}`;
    }
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format date for natural speech
 * Converts "2026-02-01" to "February 1st"
 */
function formatDateForSpeech(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const daysDiff = Math.floor(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'tomorrow';
    if (daysDiff === -1) return 'yesterday';
    if (daysDiff < -1) return `${Math.abs(daysDiff)} days ago`;
    if (daysDiff <= 7) return `in ${daysDiff} days`;

    // Format as "February 1st"
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? 'st'
        : day === 2 || day === 22
          ? 'nd'
          : day === 3 || day === 23
            ? 'rd'
            : 'th';

    return `${month} ${day}${suffix}`;
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Write Operation Helpers (Phase 04-03)
// =============================================================================

/**
 * Check if a string is a valid UUID (Notion page ID format)
 */
export function isValidUUID(str: string): boolean {
  // Notion uses UUIDs with or without dashes
  const uuidRegex =
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Map user-friendly status values to Notion status names
 */
export function mapTaskStatus(
  status: 'pending' | 'in_progress' | 'completed' | string
): string {
  // Note: Jarvis Life OS database uses 'Done' not 'Completed'
  const statusMap: Record<string, string> = {
    pending: 'Not started',
    in_progress: 'In progress',
    completed: 'Done',  // Jarvis Life OS uses 'Done'
    paused: 'On Hold',
    // Also accept the Notion values directly
    'Not started': 'Not started',
    'In progress': 'In progress',
    Done: 'Done',
    Completed: 'Done',  // Map legacy 'Completed' to 'Done'
    'On Hold': 'On Hold',
  };
  return statusMap[status] || 'Not started';
}

/**
 * Map priority values to Notion select names
 */
export function mapPriority(
  priority: 'low' | 'medium' | 'high' | string | undefined
): string | undefined {
  if (!priority) return undefined;
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    // Accept Notion values directly
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
  };
  return priorityMap[priority];
}

/**
 * Build Notion properties object for task creation
 */
export function buildTaskProperties(input: {
  title: string;
  due_date?: string;
  priority?: string;
  project_id?: string;
  frequency?: 'One-time' | 'Daily' | 'Weekly' | 'Monthly';
}): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [TASK_PROPS.title]: {
      title: [{ text: { content: input.title } }],
    },
    // Set default status to "Not started" so queries can find the task
    [TASK_PROPS.status]: {
      status: { name: 'Not started' },
    },
  };

  // Add due date if provided
  if (input.due_date) {
    properties[TASK_PROPS.dueDate] = {
      date: { start: input.due_date },
    };
  }

  // Add priority if provided
  const mappedPriority = mapPriority(input.priority);
  if (mappedPriority) {
    properties[TASK_PROPS.priority] = {
      select: { name: mappedPriority },
    };
  }

  // Add project relation if provided
  if (input.project_id) {
    properties[TASK_PROPS.project] = {
      relation: [{ id: input.project_id }],
    };
  }

  // Add frequency for recurring tasks (default to One-time)
  if (input.frequency) {
    properties[TASK_PROPS.frequency] = {
      select: { name: input.frequency },
    };
  }

  return properties;
}

/**
 * Calculate the next due date based on frequency
 * @param currentDate - Current due date in YYYY-MM-DD format
 * @param frequency - Task frequency (Daily, Weekly, Monthly)
 * @returns Next due date in YYYY-MM-DD format
 */
export function calculateNextDueDate(
  currentDate: string | null,
  frequency: 'Daily' | 'Weekly' | 'Monthly'
): string {
  // If no current date, use today
  const baseDate = currentDate ? new Date(currentDate + 'T00:00:00') : new Date();
  baseDate.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'Daily':
      baseDate.setDate(baseDate.getDate() + 1);
      break;
    case 'Weekly':
      baseDate.setDate(baseDate.getDate() + 7);
      break;
    case 'Monthly':
      baseDate.setMonth(baseDate.getMonth() + 1);
      break;
  }

  return baseDate.toISOString().split('T')[0];
}

/**
 * Build Notion properties for task status update
 */
export function buildTaskStatusUpdate(status: string): Record<string, unknown> {
  return {
    [TASK_PROPS.status]: {
      status: { name: mapTaskStatus(status) },
    },
  };
}

/**
 * Build Notion properties for marking bill as paid
 */
export function buildBillPaidUpdate(): Record<string, unknown> {
  return {
    [BILL_PROPS.paid]: {
      checkbox: true,
    },
  };
}

/**
 * Build Notion properties object for bill creation
 */
export function buildBillProperties(input: {
  title: string;
  amount?: number;
  due_date?: string;
  category?: string;
}): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [BILL_PROPS.title]: {
      title: [{ text: { content: input.title } }],
    },
  };

  if (input.amount !== undefined) {
    properties[BILL_PROPS.amount] = {
      number: input.amount,
    };
  }

  if (input.due_date) {
    properties[BILL_PROPS.dueDate] = {
      date: { start: input.due_date },
    };
  }

  if (input.category) {
    properties[BILL_PROPS.category] = {
      select: { name: input.category },
    };
  }

  // New bills start unpaid
  properties[BILL_PROPS.paid] = {
    checkbox: false,
  };

  return properties;
}

/**
 * Build Notion properties for pausing a task
 */
export function buildTaskPauseUpdate(
  until?: string
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [TASK_PROPS.status]: {
      status: { name: 'On Hold' },
    },
  };

  // If a "resume" date is provided, set it as the new due date
  // This is a common pattern for "table until next week"
  if (until) {
    properties[TASK_PROPS.dueDate] = {
      date: { start: until },
    };
  }

  return properties;
}

// =============================================================================
// Feature Pack: Query Builders & Formatters (Phase 16)
// =============================================================================

/**
 * Build a filter for recipe queries
 */
export function buildRecipeFilter(options: {
  search?: string;
  category?: string;
  difficulty?: string;
  favouritesOnly?: boolean;
  ingredientIds?: string[];
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  const searchTerm = options.search?.trim();

  if (options.category) {
    filters.push({
      property: RECIPE_PROPS.category,
      select: { equals: options.category },
    });
  }

  if (options.difficulty) {
    filters.push({
      property: RECIPE_PROPS.difficulty,
      select: { equals: options.difficulty },
    });
  }

  if (options.favouritesOnly) {
    filters.push({
      property: RECIPE_PROPS.favourite,
      checkbox: { equals: true },
    });
  }

  if (searchTerm || (options.ingredientIds && options.ingredientIds.length > 0)) {
    const orFilters: NotionFilter[] = [];

    if (searchTerm) {
      orFilters.push({
        property: RECIPE_PROPS.title,
        title: { contains: searchTerm },
      });

      if (RECIPE_PROPS.tags) {
        orFilters.push({
          property: RECIPE_PROPS.tags,
          multi_select: { contains: searchTerm },
        });
      }
    }

    if (RECIPE_PROPS.ingredients && options.ingredientIds) {
      for (const ingredientId of options.ingredientIds) {
        orFilters.push({
          property: RECIPE_PROPS.ingredients,
          relation: { contains: ingredientId },
        });
      }
    }

    if (orFilters.length > 0) {
      filters.push({ or: orFilters });
    }
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for subscription queries
 */
export function buildSubscriptionFilter(options: {
  status?: 'active' | 'cancelled' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  if (options.status === 'active') {
    // Live subscriptions only
    filters.push({
      property: SUBSCRIPTION_PROPS.status,
      status: { equals: 'Live' },
    });
  } else if (options.status === 'cancelled') {
    filters.push({
      property: SUBSCRIPTION_PROPS.status,
      status: { equals: 'Cancelled' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Format recipe query results for speech output
 */
export function formatRecipeResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No recipes found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[RECIPE_PROPS.title]);
    const category = extractSelect(p.properties[RECIPE_PROPS.category]);
    const difficulty = extractSelect(p.properties[RECIPE_PROPS.difficulty]);
    const rating = extractSelect(p.properties[RECIPE_PROPS.rating]);
    const prepTime = extractNumber(p.properties[RECIPE_PROPS.prepTime]);
    const cookTime = extractNumber(p.properties[RECIPE_PROPS.cookTime]);

    let line = `- ${title}`;
    if (category && category !== 'Unknown') line += ` (${category})`;
    if (difficulty && difficulty !== 'Unknown') line += ` - ${difficulty}`;
    if (rating && rating !== 'Unknown') line += ` ${rating}`;
    if (prepTime || cookTime) {
      const totalTime = (prepTime || 0) + (cookTime || 0);
      if (totalTime > 0) line += ` - ${totalTime} min`;
    }
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format subscription query results for speech output
 * Includes payment links for easy access
 */
export function formatSubscriptionResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No subscriptions found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[SUBSCRIPTION_PROPS.title]);
    const fees = extractNumber(p.properties[SUBSCRIPTION_PROPS.fees]);
    const frequency = extractSelect(p.properties[SUBSCRIPTION_PROPS.frequency]);
    const status = extractSelect(p.properties[SUBSCRIPTION_PROPS.status]);
    const serviceLink = extractUrl(p.properties[SUBSCRIPTION_PROPS.serviceLink]);
    const nextPayment = extractFormula(p.properties[SUBSCRIPTION_PROPS.nextPaymentDate]);

    let line = `- ${title}`;
    if (fees) line += `: $${fees.toFixed(2)}`;
    if (frequency && frequency !== 'Unknown') line += ` ${frequency}`;
    if (status && status !== 'Unknown') line += ` (${status})`;
    if (nextPayment) line += ` - Next: ${nextPayment}`;
    if (serviceLink) line += ` - [Pay here](${serviceLink})`;
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

/**
 * Format meal plan results for speech output
 */
export function formatMealPlanResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No meal plan entries found.';

  const formatted = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties[MEAL_PLAN_PROPS.title]);
    const day = extractSelect(p.properties[MEAL_PLAN_PROPS.dayOfWeek]);
    const timeOfDay = extractRichText(p.properties[MEAL_PLAN_PROPS.timeOfDay]);
    const setting = extractSelect(p.properties[MEAL_PLAN_PROPS.setting]);

    let line = `- ${day || 'Day'}`;
    if (timeOfDay) line += ` ${timeOfDay}`;
    line += `: ${title}`;
    if (setting && setting !== 'Unknown') line += ` (${setting})`;
    line += ` [id:${p.id}]`;
    return line;
  });

  return formatted.join('\n');
}

// Helper extractors for new property types
function extractUrl(prop: unknown): string | null {
  const p = prop as { url?: string };
  return p?.url || null;
}

function extractFormula(prop: unknown): string | null {
  const p = prop as { formula?: { string?: string; number?: number; date?: { start?: string } } };
  if (p?.formula?.string) return p.formula.string;
  if (p?.formula?.number) return String(p.formula.number);
  if (p?.formula?.date?.start) return p.formula.date.start;
  return null;
}

function extractRichText(prop: unknown): string | null {
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p?.rich_text?.[0]?.plain_text || null;
}
