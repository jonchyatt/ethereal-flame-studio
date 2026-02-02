/**
 * BriefingBuilder - Aggregates Notion data for briefings
 *
 * Collects data from all Life OS databases in parallel
 * and formats it for morning briefings and check-ins.
 *
 * Uses existing Phase 4 tools via the toolExecutor.
 */

import { format, isWithinInterval, addHours, addDays, parseISO, isToday, isBefore, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import type {
  BriefingData,
  TaskSummary,
  BillSummary,
  HabitSummary,
  GoalSummary,
  CalendarEvent,
  CheckInType,
  CheckInProgress,
  EveningWrapData,
  DayReviewData,
  TomorrowPreviewData,
  WeekSummaryData,
  LifeAreaInsights,
} from './types';
import { getLifeAreaTracker } from './LifeAreaTracker';

// Import the internal query function that returns raw results
import { callMCPTool } from '../notion/NotionClient';
import {
  LIFE_OS_DATABASES,
  buildTaskFilter,
  buildBillFilter,
  buildHabitFilter,
  buildGoalFilter,
  TASK_PROPS,
  BILL_PROPS,
  HABIT_PROPS,
  GOAL_PROPS,
} from '../notion/schemas';

// =============================================================================
// Raw Data Extraction Helpers
// =============================================================================

/**
 * Extract title from Notion property
 */
function extractTitle(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text || 'Untitled';
}

/**
 * Extract select/status value
 */
function extractSelect(prop: unknown): string {
  const p = prop as { status?: { name?: string }; select?: { name?: string } };
  return p?.status?.name || p?.select?.name || 'Unknown';
}

/**
 * Extract date start value
 */
function extractDate(prop: unknown): string | null {
  const p = prop as { date?: { start?: string } };
  return p?.date?.start || null;
}

/**
 * Extract number value
 */
function extractNumber(prop: unknown): number {
  const p = prop as { number?: number };
  return p?.number || 0;
}

/**
 * Extract checkbox value
 */
function extractCheckbox(prop: unknown): boolean {
  const p = prop as { checkbox?: boolean };
  return p?.checkbox || false;
}

// =============================================================================
// Briefing Data Builder
// =============================================================================

/**
 * Build complete morning briefing data by querying all databases in parallel
 */
export async function buildMorningBriefing(): Promise<BriefingData> {
  console.log('[BriefingBuilder] Building morning briefing data...');

  try {
    // Parallel queries for all data sources using Phase 4 MCP tools
    const [todayTasksResult, overdueTasksResult, billsResult, habitsResult, goalsResult] =
      await Promise.all([
        queryNotionRaw('tasks', { filter: 'today', status: 'pending' }),
        queryNotionRaw('tasks', { filter: 'overdue', status: 'pending' }),
        queryNotionRaw('bills', { timeframe: 'this_week', unpaidOnly: true }),
        queryNotionRaw('habits', { frequency: 'all' }),
        queryNotionRaw('goals', { status: 'active' }),
      ]);

    // Parse task results
    const todayTasks = parseTaskResults(todayTasksResult);
    const overdueTasks = parseTaskResults(overdueTasksResult);

    // Parse bill results
    const bills = parseBillResults(billsResult);
    const billTotal = bills.reduce((sum, b) => sum + b.amount, 0);

    // Parse habit results
    const habits = parseHabitResults(habitsResult);
    const streakSummary = buildStreakSummary(habits);

    // Parse goal results
    const goals = parseGoalResults(goalsResult);

    // Derive calendar events from tasks with specific times
    const allTodayTasks = [...todayTasks, ...overdueTasks.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)))];
    const calendarEvents = deriveCalendarEvents(allTodayTasks);

    // Get life area insights for gentle awareness nudges
    const lifeAreaTracker = getLifeAreaTracker();
    const lifeAreaInsights = lifeAreaTracker.getLifeAreaInsights();

    const briefingData: BriefingData = {
      tasks: {
        today: todayTasks,
        overdue: overdueTasks,
      },
      bills: {
        thisWeek: bills,
        total: billTotal,
      },
      habits: {
        active: habits,
        streakSummary,
      },
      goals: {
        active: goals,
      },
      calendar: {
        today: calendarEvents,
      },
      lifeAreas: {
        insights: lifeAreaInsights,
      },
    };

    console.log('[BriefingBuilder] Briefing data built:', {
      tasksToday: todayTasks.length,
      tasksOverdue: overdueTasks.length,
      bills: bills.length,
      habits: habits.length,
      goals: goals.length,
      calendarEvents: calendarEvents.length,
      neglectedAreas: lifeAreaInsights.neglectedAreas.length,
    });

    return briefingData;
  } catch (error) {
    console.error('[BriefingBuilder] Error building briefing:', error);
    // Return empty data structure on error
    return {
      tasks: { today: [], overdue: [] },
      bills: { thisWeek: [], total: 0 },
      habits: { active: [], streakSummary: 'Unable to load habit data.' },
      goals: { active: [] },
      calendar: { today: [] },
    };
  }
}

/**
 * Build check-in data (for midday/evening check-ins)
 */
export async function buildCheckInData(type: CheckInType): Promise<{
  briefing: BriefingData;
  progress: CheckInProgress;
}> {
  console.log(`[BriefingBuilder] Building ${type} check-in data...`);

  // Get full briefing data
  const briefing = await buildMorningBriefing();

  // Calculate progress
  const [allTodayTasks, completedTodayTasks] = await Promise.all([
    queryNotionRaw('tasks', { filter: 'today', status: 'all' }),
    queryNotionRaw('tasks', { filter: 'today', status: 'completed' }),
  ]);

  const totalTasks = parseTaskResults(allTodayTasks);
  const completedTasks = parseTaskResults(completedTodayTasks);

  const progress: CheckInProgress = {
    tasksCompletedToday: completedTasks.length,
    totalTasksToday: totalTasks.length,
    overdueCount: briefing.tasks.overdue.length,
    newCaptures: [], // Filled in during check-in flow
  };

  return { briefing, progress };
}

// =============================================================================
// Raw Query Function
// =============================================================================

/**
 * Query Notion and return raw results (not formatted for speech)
 */
async function queryNotionRaw(
  database: 'tasks' | 'bills' | 'habits' | 'goals',
  options: Record<string, unknown>
): Promise<unknown> {
  const databaseId = LIFE_OS_DATABASES[database];
  if (!databaseId) {
    console.warn(`[BriefingBuilder] Database not configured: ${database}`);
    return { results: [] };
  }

  let filter: Record<string, unknown> = {};

  switch (database) {
    case 'tasks':
      filter = buildTaskFilter({
        filter: options.filter as 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'all' | undefined,
        status: options.status as 'pending' | 'completed' | 'all' | undefined,
      });
      break;
    case 'bills':
      filter = buildBillFilter({
        timeframe: options.timeframe as 'this_week' | 'this_month' | 'overdue' | undefined,
        unpaidOnly: options.unpaidOnly as boolean | undefined,
      });
      break;
    case 'habits':
      filter = buildHabitFilter({
        frequency: options.frequency as 'daily' | 'weekly' | 'monthly' | 'all' | undefined,
      });
      break;
    case 'goals':
      filter = buildGoalFilter({
        status: options.status as 'active' | 'achieved' | 'all' | undefined,
      });
      break;
  }

  return callMCPTool('API-query-data-source', {
    data_source_id: databaseId,
    ...filter,
  });
}

// =============================================================================
// Result Parsers
// =============================================================================

/**
 * Parse raw Notion task results into TaskSummary[]
 */
function parseTaskResults(result: unknown): TaskSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const dueDate = extractDate(p.properties[TASK_PROPS.dueDate]);

    // Extract time from due date if it includes time (ISO format with T)
    let dueTime: string | null = null;
    if (dueDate && dueDate.includes('T')) {
      try {
        const date = parseISO(dueDate);
        dueTime = format(date, 'HH:mm');
      } catch {
        // No valid time
      }
    }

    return {
      id: p.id,
      title: extractTitle(p.properties[TASK_PROPS.title]),
      status: extractSelect(p.properties[TASK_PROPS.status]),
      dueDate: dueDate?.split('T')[0] || dueDate,
      dueTime,
      priority: extractSelect(p.properties[TASK_PROPS.priority]) || null,
    };
  });
}

/**
 * Parse raw Notion bill results into BillSummary[]
 */
function parseBillResults(result: unknown): BillSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    return {
      id: p.id,
      title: extractTitle(p.properties[BILL_PROPS.title]),
      amount: extractNumber(p.properties[BILL_PROPS.amount]),
      dueDate: extractDate(p.properties[BILL_PROPS.dueDate]),
    };
  });
}

/**
 * Parse raw Notion habit results into HabitSummary[]
 */
function parseHabitResults(result: unknown): HabitSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    return {
      id: p.id,
      title: extractTitle(p.properties[HABIT_PROPS.title]),
      frequency: extractSelect(p.properties[HABIT_PROPS.frequency]),
      streak: extractNumber(p.properties[HABIT_PROPS.streak]),
      lastCompleted: extractDate(p.properties[HABIT_PROPS.lastCompleted]),
    };
  });
}

/**
 * Parse raw Notion goal results into GoalSummary[]
 */
function parseGoalResults(result: unknown): GoalSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    return {
      id: p.id,
      title: extractTitle(p.properties[GOAL_PROPS.title]),
      status: extractSelect(p.properties[GOAL_PROPS.status]),
      progress: extractNumber(p.properties[GOAL_PROPS.progress]) || null,
    };
  });
}

// =============================================================================
// Calendar Event Derivation
// =============================================================================

/**
 * Derive calendar events from tasks with specific due times
 */
function deriveCalendarEvents(tasks: TaskSummary[]): CalendarEvent[] {
  const now = new Date();
  const oneHourFromNow = addHours(now, 1);

  return tasks
    .filter((t) => t.dueTime) // Only tasks with specific times
    .map((t) => {
      // Parse the time
      const [hours, minutes] = t.dueTime!.split(':').map(Number);
      const eventTime = new Date();
      eventTime.setHours(hours, minutes, 0, 0);

      // Check if within next hour
      const isUpcoming = isWithinInterval(eventTime, { start: now, end: oneHourFromNow });

      return {
        id: `cal-${t.id}`,
        title: t.title,
        time: format(eventTime, 'h:mm a'), // "9:00 AM"
        isUpcoming,
        sourceTaskId: t.id,
      };
    })
    .sort((a, b) => {
      // Sort by time
      const timeA = a.time.replace(/[^0-9:]/g, '');
      const timeB = b.time.replace(/[^0-9:]/g, '');
      return timeA.localeCompare(timeB);
    });
}

// =============================================================================
// Streak Summary Builder
// =============================================================================

/**
 * Build a speech-friendly habit streak summary
 */
export function buildStreakSummary(habits: HabitSummary[]): string {
  if (habits.length === 0) {
    return 'No active habits tracked.';
  }

  // Count habits by streak status
  const onTrack = habits.filter((h) => h.streak > 0).length;
  const needsAttention = habits.filter((h) => h.streak === 0).length;

  // Find longest streak
  const maxStreak = Math.max(...habits.map((h) => h.streak));
  const longestStreakHabit = habits.find((h) => h.streak === maxStreak);

  // Build summary
  const parts: string[] = [];

  if (onTrack > 0) {
    parts.push(`${onTrack} habit${onTrack > 1 ? 's' : ''} on track`);
  }

  if (needsAttention > 0) {
    parts.push(`${needsAttention} need${needsAttention === 1 ? 's' : ''} attention`);
  }

  if (longestStreakHabit && maxStreak > 1) {
    parts.push(`${longestStreakHabit.title} has a ${maxStreak}-day streak`);
  }

  return parts.join('. ') + '.';
}

// =============================================================================
// Evening Wrap Data Builder (Plan 06-01)
// =============================================================================

/**
 * Build complete evening wrap data
 * Includes day review, tomorrow preview, and week summary
 */
export async function buildEveningWrapData(): Promise<EveningWrapData> {
  console.log('[BriefingBuilder] Building evening wrap data...');

  try {
    // Parallel queries for all data sources
    const [
      completedTasksResult,
      pendingTasksResult,
      tomorrowTasksResult,
      weekTasksResult,
      billsResult,
      habitsResult,
      goalsResult,
    ] = await Promise.all([
      queryNotionRaw('tasks', { filter: 'today', status: 'completed' }),
      queryNotionRaw('tasks', { filter: 'today', status: 'pending' }),
      queryNotionRaw('tasks', { filter: 'tomorrow', status: 'all' }),
      queryNotionRaw('tasks', { filter: 'this_week', status: 'all' }),
      queryNotionRaw('bills', { timeframe: 'this_week', unpaidOnly: true }),
      queryNotionRaw('habits', { frequency: 'all' }),
      queryNotionRaw('goals', { status: 'active' }),
    ]);

    // Parse task results
    const completedTasks = parseTaskResults(completedTasksResult);
    const pendingTasks = parseTaskResults(pendingTasksResult);
    const tomorrowTasks = parseTaskResults(tomorrowTasksResult);
    const weekTasks = parseTaskResults(weekTasksResult);

    // Build day review
    const dayReview = buildDayReview(completedTasks, pendingTasks);

    // Build tomorrow preview
    const tomorrow = buildTomorrowPreview(tomorrowTasks);

    // Build week summary
    const weekSummary = analyzeWeekLoad(weekTasks);

    // Parse other results
    const bills = parseBillResults(billsResult);
    const billTotal = bills.reduce((sum, b) => sum + b.amount, 0);
    const habits = parseHabitResults(habitsResult);
    const streakSummary = buildStreakSummary(habits);
    const goals = parseGoalResults(goalsResult);
    const calendarEvents = deriveCalendarEvents(tomorrowTasks);

    const eveningWrapData: EveningWrapData = {
      // Base BriefingData
      tasks: {
        today: pendingTasks,
        overdue: pendingTasks.filter(t => t.dueDate && isBefore(parseISO(t.dueDate), startOfDay(new Date()))),
      },
      bills: {
        thisWeek: bills,
        total: billTotal,
      },
      habits: {
        active: habits,
        streakSummary,
      },
      goals: {
        active: goals,
      },
      calendar: {
        today: calendarEvents,
      },
      // Evening wrap specific
      dayReview,
      tomorrow,
      weekSummary,
    };

    console.log('[BriefingBuilder] Evening wrap data built:', {
      completedToday: completedTasks.length,
      pendingToday: pendingTasks.length,
      tomorrowTasks: tomorrowTasks.length,
      completionRate: dayReview.completionRate,
    });

    return eveningWrapData;
  } catch (error) {
    console.error('[BriefingBuilder] Error building evening wrap:', error);
    // Return empty data structure on error
    return {
      tasks: { today: [], overdue: [] },
      bills: { thisWeek: [], total: 0 },
      habits: { active: [], streakSummary: 'Unable to load habit data.' },
      goals: { active: [] },
      calendar: { today: [] },
      dayReview: { completedTasks: [], incompleteTasks: [], completionRate: 0 },
      tomorrow: { tasks: [], events: [] },
      weekSummary: { busyDays: [], lightDays: [], upcomingDeadlines: [] },
    };
  }
}

/**
 * Build day review data (completed vs incomplete tasks)
 */
function buildDayReview(completed: TaskSummary[], incomplete: TaskSummary[]): DayReviewData {
  const total = completed.length + incomplete.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  return {
    completedTasks: completed,
    incompleteTasks: incomplete,
    completionRate,
  };
}

/**
 * Build tomorrow preview data (tasks and calendar events)
 */
function buildTomorrowPreview(tomorrowTasks: TaskSummary[]): TomorrowPreviewData {
  const events = deriveCalendarEventsForTomorrow(tomorrowTasks);

  return {
    tasks: tomorrowTasks,
    events,
  };
}

/**
 * Derive calendar events for tomorrow (tasks with specific due times)
 */
function deriveCalendarEventsForTomorrow(tasks: TaskSummary[]): CalendarEvent[] {
  const tomorrow = addDays(new Date(), 1);

  return tasks
    .filter((t) => t.dueTime) // Only tasks with specific times
    .map((t) => {
      const [hours, minutes] = t.dueTime!.split(':').map(Number);
      const eventTime = new Date(tomorrow);
      eventTime.setHours(hours, minutes, 0, 0);

      return {
        id: `cal-${t.id}`,
        title: t.title,
        time: format(eventTime, 'h:mm a'),
        isUpcoming: false, // Not upcoming since it's tomorrow
        sourceTaskId: t.id,
      };
    })
    .sort((a, b) => {
      const timeA = a.time.replace(/[^0-9:]/g, '');
      const timeB = b.time.replace(/[^0-9:]/g, '');
      return timeA.localeCompare(timeB);
    });
}

/**
 * Analyze week load (busy days, light days, upcoming deadlines)
 */
function analyzeWeekLoad(weekTasks: TaskSummary[]): WeekSummaryData {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group tasks by day
  const tasksByDay: Record<string, TaskSummary[]> = {};
  const deadlines: TaskSummary[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(now, i);
    const dayKey = format(day, 'yyyy-MM-dd');
    tasksByDay[dayKey] = [];
  }

  for (const task of weekTasks) {
    if (!task.dueDate) continue;

    const dueDate = parseISO(task.dueDate);
    const dayKey = format(dueDate, 'yyyy-MM-dd');

    if (tasksByDay[dayKey]) {
      tasksByDay[dayKey].push(task);
    }

    // Check if it's a deadline (high priority or has specific time)
    if (task.priority === 'High' || task.dueTime) {
      deadlines.push(task);
    }
  }

  // Identify busy days (>5 tasks) and light days (<2 tasks)
  const busyDays: string[] = [];
  const lightDays: string[] = [];

  for (const [dayKey, tasks] of Object.entries(tasksByDay)) {
    const date = parseISO(dayKey);
    const dayName = dayNames[date.getDay()];

    if (tasks.length > 5) {
      busyDays.push(dayName);
    } else if (tasks.length < 2) {
      lightDays.push(dayName);
    }
  }

  return {
    busyDays,
    lightDays,
    upcomingDeadlines: deadlines.slice(0, 5), // Top 5 deadlines
  };
}
