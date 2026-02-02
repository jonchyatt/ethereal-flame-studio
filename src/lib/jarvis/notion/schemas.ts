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
} as const;

// Database IDs for creates (API-post-page) - different from data_source_id!
export const LIFE_OS_DATABASE_IDS = {
  tasks: process.env.NOTION_TASKS_DATABASE_ID || '',
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
// Type Definitions
// =============================================================================

/**
 * Notion filter structure for database queries
 */
export interface NotionFilter {
  property: string;
  [key: string]:
    | string
    | number
    | boolean
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

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Build a filter for task queries
 */
export function buildTaskFilter(options: {
  filter?: 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'all';
  status?: 'pending' | 'completed' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Status filter
  if (options.status && options.status !== 'all') {
    if (options.status === 'pending') {
      filters.push({
        property: TASK_PROPS.status,
        status: { does_not_equal: 'Completed' },
      });
    } else if (options.status === 'completed') {
      filters.push({
        property: TASK_PROPS.status,
        status: { equals: 'Completed' },
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { equals: tomorrow.toISOString().split('T')[0] },
    });
  } else if (options.filter === 'this_week') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { on_or_before: nextWeek.toISOString().split('T')[0] },
    });
  } else if (options.filter === 'overdue') {
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { before: today },
    });
    // Only incomplete tasks for overdue
    filters.push({
      property: TASK_PROPS.status,
      status: { does_not_equal: 'Completed' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

/**
 * Build a filter for bill queries
 */
export function buildBillFilter(options: {
  timeframe?: 'this_week' | 'this_month' | 'overdue';
  unpaidOnly?: boolean;
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Default to unpaid only
  if (options.unpaidOnly !== false) {
    filters.push({
      property: BILL_PROPS.paid,
      checkbox: { equals: false },
    });
  }

  if (options.timeframe === 'this_week') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextWeek.toISOString().split('T')[0] },
    });
  } else if (options.timeframe === 'this_month') {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextMonth.toISOString().split('T')[0] },
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
  const statusMap: Record<string, string> = {
    pending: 'Not started',
    in_progress: 'In progress',
    completed: 'Completed',
    paused: 'On Hold',
    // Also accept the Notion values directly
    'Not started': 'Not started',
    'In progress': 'In progress',
    Completed: 'Completed',
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

  return properties;
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
