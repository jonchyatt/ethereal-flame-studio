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
  MealPlanSummary,
  CheckInType,
  CheckInProgress,
  EveningWrapData,
  DayReviewData,
  TomorrowPreviewData,
  WeekSummaryData,
  LifeAreaInsights,
  WeeklyReviewData,
} from './types';
import { getLifeAreaTracker } from './LifeAreaTracker';

// Import the direct SDK query function
import { queryDatabase } from '../notion/NotionClient';
import {
  LIFE_OS_DATABASES,
  buildTaskFilter,
  buildBillFilter,
  buildHabitFilter,
  buildGoalFilter,
  buildShoppingListFilter,
  getTodayInTimezone,
  getDateInTimezone,
  TASK_PROPS,
  SUBSCRIPTION_PROPS,
  HABIT_PROPS,
  GOAL_PROPS,
  MEAL_PLAN_PROPS,
  RECIPE_PROPS,
} from '../notion/schemas';
import {
  queryGoogleCalendarEvents,
  isGoogleCalendarConfigured,
  getTimezoneOffsetString,
  type GoogleCalendarEvent,
} from '../google/GoogleCalendarClient';

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
 * Extract URL value
 */
function extractUrl(prop: unknown): string | null {
  const p = prop as { url?: string };
  return p?.url || null;
}

/**
 * Extract checkbox value
 */
function extractCheckbox(prop: unknown): boolean | null {
  const p = prop as { checkbox?: boolean };
  return typeof p?.checkbox === 'boolean' ? p.checkbox : null;
}

/**
 * Extract rich_text value (joins all text segments)
 */
function extractRichText(prop: unknown): string {
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p?.rich_text?.map(t => t.plain_text || '').join('') || '';
}

/**
 * Extract relation IDs from a Relation property
 */
function extractRelationIds(prop: unknown): string[] {
  const p = prop as { relation?: Array<{ id?: string }> };
  return (p?.relation || []).filter(r => r.id).map(r => r.id!);
}

// =============================================================================
// Briefing Data Builder
// =============================================================================

/**
 * Build complete morning briefing data by querying all databases in parallel
 * @param timezone - IANA timezone string for date calculations (e.g., 'America/New_York')
 */
export async function buildMorningBriefing(timezone?: string): Promise<BriefingData> {
  console.log('[BriefingBuilder] Building morning briefing data...', { timezone });

  try {
    // Timezone-safe date boundaries for Google Calendar (RFC 3339 compliant)
    const todayStr = getTodayInTimezone(timezone);
    const tzOffset = getTimezoneOffsetString(timezone);
    const gcalTodayStart = `${todayStr}T00:00:00${tzOffset}`;
    const gcalTodayEnd = `${todayStr}T23:59:59${tzOffset}`;
    const todayDayName = format(parseISO(todayStr), 'EEEE'); // "Monday", "Tuesday", etc.

    // Parallel queries for all data sources using Phase 4 MCP tools
    // Note: Using 'all' filter instead of 'today' to show all pending tasks
    // since many tasks may not have dates set in the 'Do Dates' field
    const [todayTasksResult, overdueTasksResult, billsResult, habitsResult, goalsResult, googleResult, allMealsResult, shoppingListCount] =
      await Promise.all([
        queryNotionRaw('tasks', { filter: 'all', status: 'pending', timezone }),
        queryNotionRaw('tasks', { filter: 'overdue', status: 'pending', timezone }),
        queryNotionRaw('bills', { timeframe: 'this_week', unpaidOnly: true, timezone }),
        queryNotionRaw('habits', { frequency: 'all' }),
        queryNotionRaw('goals', { status: 'active' }),
        fetchGoogleCalendarEventsSafe(gcalTodayStart, gcalTodayEnd, timezone),
        queryAllMealsSafe(),
        queryShoppingListCountSafe(),
      ]);

    // Parse task results with client-side status filtering
    const todayTasks = parseTaskResults(todayTasksResult, 'pending');
    const overdueTasks = parseTaskResults(overdueTasksResult, 'pending');

    // Parse bill results
    const bills = parseBillResults(billsResult, {
      timeframe: 'this_week',
      unpaidOnly: true,
      timezone,
    });
    const billTotal = bills.reduce((sum, b) => sum + b.amount, 0);

    // Parse habit results
    const habits = parseHabitResults(habitsResult);
    const streakSummary = buildStreakSummary(habits);

    // Parse goal results
    const goals = parseGoalResults(goalsResult);

    // Parse meal plan results — full weekly plan + today's subset
    const allMeals = parseMealPlanResults(allMealsResult);
    await resolveRecipeTimesForMeals(allMeals);
    const todayMeals = allMeals.filter(m => m.dayOfWeek === todayDayName);

    // Derive calendar events from tasks with specific times
    const allTodayTasks = [...todayTasks, ...overdueTasks.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)))];
    const notionCalendarEvents = deriveCalendarEvents(allTodayTasks);
    const googleCalendarEvents = transformGoogleCalendarEvents(googleResult);
    const calendarEvents = mergeCalendarEvents(notionCalendarEvents, googleCalendarEvents);

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
      meals: {
        planned: allMeals,
        today: todayMeals,
        shoppingListCount,
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
      calendarFromNotion: notionCalendarEvents.length,
      calendarFromGoogle: googleCalendarEvents.length,
      mealsPlanned: allMeals.length,
      mealsToday: todayMeals.length,
      shoppingListItems: shoppingListCount,
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
      meals: { planned: [], today: [], shoppingListCount: 0 },
    };
  }
}

/**
 * Build check-in data (for midday/evening check-ins)
 * Evening check-ins also include tomorrow's tasks for preview
 * @param timezone - IANA timezone string for date calculations
 */
export async function buildCheckInData(type: CheckInType, timezone?: string): Promise<{
  briefing: BriefingData;
  progress: CheckInProgress;
  tomorrow?: { tasks: TaskSummary[] };
}> {
  console.log(`[BriefingBuilder] Building ${type} check-in data...`, { timezone });

  // Get full briefing data
  const briefing = await buildMorningBriefing(timezone);

  // Calculate progress
  const [allTodayTasks, completedTodayTasks] = await Promise.all([
    queryNotionRaw('tasks', { filter: 'today', status: 'all', timezone }),
    queryNotionRaw('tasks', { filter: 'today', status: 'completed', timezone }),
  ]);

  const totalTasks = parseTaskResults(allTodayTasks, 'all');
  const completedTasks = parseTaskResults(completedTodayTasks, 'completed');

  const progress: CheckInProgress = {
    tasksCompletedToday: completedTasks.length,
    totalTasksToday: totalTasks.length,
    overdueCount: briefing.tasks.overdue.length,
    newCaptures: [], // Filled in during check-in flow
  };

  // For evening check-ins, also fetch tomorrow's tasks
  if (type === 'evening') {
    const tomorrowTasksResult = await queryNotionRaw('tasks', {
      filter: 'tomorrow',
      status: 'pending',
      timezone,
    });
    const tomorrowTasks = parseTaskResults(tomorrowTasksResult, 'pending');

    console.log(`[BriefingBuilder] Evening check-in includes ${tomorrowTasks.length} tomorrow tasks`);

    return {
      briefing,
      progress,
      tomorrow: { tasks: tomorrowTasks },
    };
  }

  return { briefing, progress };
}

// =============================================================================
// Raw Query Function
// =============================================================================

/**
 * Query Notion and return raw results (not formatted for speech)
 *
 * NOTE: For tasks, status filtering is done client-side because the Notion
 * dataSources.query API has issues with Status property filters on some databases.
 * The status option is preserved for client-side filtering in parseTaskResults.
 */
async function queryNotionRaw(
  database: 'tasks' | 'bills' | 'habits' | 'goals',
  options: Record<string, unknown>
): Promise<unknown> {
  // Bills are stored in the Subscriptions database, not the Budgets database
  const dbKey = database === 'bills' ? 'subscriptions' : database;
  const databaseId = LIFE_OS_DATABASES[dbKey];
  if (!databaseId) {
    console.warn(`[BriefingBuilder] Database not configured: ${dbKey}`);
    return { results: [] };
  }

  let filter: Record<string, unknown> = {};
  const timezone = options.timezone as string | undefined;

  switch (database) {
    case 'tasks':
      // Don't include status in the API filter - it causes "property not found" errors
      // on some Notion databases. We'll filter by status client-side instead.
      filter = buildTaskFilter({
        filter: options.filter as 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'all' | undefined,
        // status is intentionally omitted - will be filtered client-side
        timezone,
      });
      break;
    case 'bills':
      // Bills live in the Subscriptions database. Don't use API-level filtering
      // since property names differ from old BILL_PROPS. Filter client-side.
      filter = {};
      break;
    case 'habits':
      filter = buildHabitFilter({
        frequency: options.frequency as 'daily' | 'weekly' | 'monthly' | 'all' | undefined,
      });
      break;
    case 'goals':
      // Don't include status in the API filter - "Status" property may not exist
      // on some Notion databases. We'll filter by status client-side if needed.
      filter = buildGoalFilter({
        status: 'all', // Disable API-level filtering
      });
      break;
  }

  try {
    console.log(`[BriefingBuilder] Querying ${database}:`, { databaseId, filter });
    const result = await queryDatabase(databaseId, filter);
    console.log(`[BriefingBuilder] ${database} result count:`, (result as { results?: unknown[] })?.results?.length || 0);
    return result;
  } catch (error) {
    // Log but don't throw - return empty results so other queries can succeed
    console.error(`[BriefingBuilder] Error querying ${database}:`, error);
    return { results: [] };
  }
}

// =============================================================================
// Meal Plan & Shopping List Safe Queries
// =============================================================================

/**
 * Query ALL meal plan entries (no day filter — recurring weekly plan, ~14-21 entries)
 * Returns empty results if database not configured or on error
 */
async function queryAllMealsSafe(): Promise<unknown> {
  const databaseId = LIFE_OS_DATABASES.mealPlan;
  if (!databaseId) {
    console.log('[BriefingBuilder] Meal plan database not configured, skipping');
    return { results: [] };
  }
  try {
    const result = await queryDatabase(databaseId);
    console.log('[BriefingBuilder] Meal plan result count:', (result as { results?: unknown[] })?.results?.length || 0);
    return result;
  } catch (error) {
    console.error('[BriefingBuilder] Error querying meal plan:', error);
    return { results: [] };
  }
}

/**
 * Query unchecked shopping list items count
 * Returns 0 if database not configured or on error
 */
async function queryShoppingListCountSafe(): Promise<number> {
  const databaseId = LIFE_OS_DATABASES.shoppingList;
  if (!databaseId) {
    console.log('[BriefingBuilder] Shopping list database not configured, skipping');
    return 0;
  }
  try {
    const result = await queryDatabase(databaseId, buildShoppingListFilter({ showChecked: false }));
    return (result as { results?: unknown[] })?.results?.length || 0;
  } catch (error) {
    console.error('[BriefingBuilder] Error querying shopping list:', error);
    return 0;
  }
}

// =============================================================================
// Result Parsers
// =============================================================================

/**
 * Parse raw Notion task results into TaskSummary[]
 *
 * @param result - Raw Notion query result
 * @param filterStatus - Optional client-side status filter: 'pending' (not completed),
 *                       'completed', or undefined/all (no filter)
 */
function parseTaskResults(result: unknown, filterStatus?: 'pending' | 'completed' | 'all'): TaskSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  const tasks: TaskSummary[] = [];

  for (const page of pages) {
    const p = page as { properties: Record<string, unknown>; id: string };
    const dueDate = extractDate(p.properties[TASK_PROPS.dueDate]);
    const status = extractSelect(p.properties[TASK_PROPS.status]);

    // Client-side status filtering (API filter doesn't work reliably)
    if (filterStatus === 'pending') {
      // Exclude completed tasks (handles various completion status names)
      const isCompleted = status.toLowerCase().includes('completed') ||
                          status.toLowerCase().includes('done') ||
                          status === 'Completed';
      if (isCompleted) continue;
    } else if (filterStatus === 'completed') {
      // Only include completed tasks
      const isCompleted = status.toLowerCase().includes('completed') ||
                          status.toLowerCase().includes('done') ||
                          status === 'Completed';
      if (!isCompleted) continue;
    }
    // 'all' or undefined = no filtering

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

    tasks.push({
      id: p.id,
      title: extractTitle(p.properties[TASK_PROPS.title]),
      status,
      dueDate: dueDate?.split('T')[0] || dueDate,
      dueTime,
      priority: extractSelect(p.properties[TASK_PROPS.priority]) || null,
    });
  }

  return tasks;
}

/**
 * Parse raw Notion bill results into BillSummary[]
 */
function parseBillResults(
  result: unknown,
  options?: {
    timeframe?: 'this_week' | 'this_month' | 'overdue';
    unpaidOnly?: boolean;
    timezone?: string;
  }
): BillSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];

  // Bills are stored in the Subscriptions database with SUBSCRIPTION_PROPS
  const bills = pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const startDateRaw = extractDate(p.properties[SUBSCRIPTION_PROPS.startDate]);
    const startDate = startDateRaw ? startDateRaw.split('T')[0] : null;
    const status = extractSelect(p.properties[SUBSCRIPTION_PROPS.status]);
    const serviceLink = extractUrl(p.properties[SUBSCRIPTION_PROPS.serviceLink]);

    return {
      id: p.id,
      title: extractTitle(p.properties[SUBSCRIPTION_PROPS.title]),
      amount: extractNumber(p.properties[SUBSCRIPTION_PROPS.fees]),
      dueDate: startDate,
      status,
      serviceLink,
    };
  });

  // Filter out cancelled/inactive subscriptions when unpaidOnly is requested
  const filtered = bills.filter((bill) => {
    if (options?.unpaidOnly !== false) {
      // Skip completed/cancelled subscriptions
      const lowerStatus = bill.status?.toLowerCase() || '';
      if (lowerStatus === 'done' || lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
        return false;
      }
    }
    return true;
  });

  return filtered.map((bill) => ({
    id: bill.id,
    title: bill.title,
    amount: bill.amount,
    dueDate: bill.dueDate,
    serviceLink: bill.serviceLink,
  }));
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

/**
 * Parse raw Notion meal plan results into MealPlanSummary[]
 */
function parseMealPlanResults(result: unknown): MealPlanSummary[] {
  const pages = (result as { results?: unknown[] })?.results || [];
  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const dayRaw = extractSelect(p.properties[MEAL_PLAN_PROPS.dayOfWeek]);
    const settingRaw = extractSelect(p.properties[MEAL_PLAN_PROPS.setting]);
    // timeOfDay is rich_text in Notion, try select first (fallback), then rich_text
    const timeRaw = extractSelect(p.properties[MEAL_PLAN_PROPS.timeOfDay]);
    const timeOfDay = (timeRaw !== 'Unknown' ? timeRaw : '') || extractRichText(p.properties[MEAL_PLAN_PROPS.timeOfDay]) || null;
    const servingsRaw = extractNumber(p.properties[MEAL_PLAN_PROPS.servings]);
    return {
      id: p.id,
      title: extractTitle(p.properties[MEAL_PLAN_PROPS.title]),
      dayOfWeek: dayRaw !== 'Unknown' ? dayRaw : null,
      timeOfDay,
      setting: settingRaw !== 'Unknown' ? settingRaw : null,
      servings: servingsRaw || null,
      recipeIds: extractRelationIds(p.properties[MEAL_PLAN_PROPS.recipes]),
      prepTime: null,
      cookTime: null,
    };
  });
}

// =============================================================================
// Recipe Time Resolution
// =============================================================================

/**
 * Resolve recipe prep/cook times for meal plan entries.
 * Queries the Recipes DB ONCE and merges times onto meal objects.
 * Mutates the meals array in place. Never throws — failures leave times as null.
 */
async function resolveRecipeTimesForMeals(meals: MealPlanSummary[]): Promise<void> {
  const allRecipeIds = new Set(meals.flatMap(m => m.recipeIds));
  if (allRecipeIds.size === 0) return;

  const recipesDbId = LIFE_OS_DATABASES.recipes;
  if (!recipesDbId) return;

  try {
    const result = await queryDatabase(recipesDbId, {});
    const pages = (result as { results?: unknown[] })?.results || [];

    const recipeTimeMap = new Map<string, { prepTime: number | null; cookTime: number | null }>();
    for (const page of pages) {
      const p = page as { id: string; properties: Record<string, unknown> };
      const prepRaw = extractNumber(p.properties[RECIPE_PROPS.prepTime]);
      const cookRaw = extractNumber(p.properties[RECIPE_PROPS.cookTime]);
      recipeTimeMap.set(p.id, {
        prepTime: prepRaw || null,
        cookTime: cookRaw || null,
      });
    }

    for (const meal of meals) {
      if (meal.recipeIds.length === 0) continue;
      const times = recipeTimeMap.get(meal.recipeIds[0]);
      if (times) {
        meal.prepTime = times.prepTime;
        meal.cookTime = times.cookTime;
      }
    }
  } catch (error) {
    console.warn('[BriefingBuilder] Recipe time resolution failed, continuing without times:', error);
  }
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
        source: 'notion' as const,
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
 * @param timezone - IANA timezone string for date calculations
 */
export async function buildEveningWrapData(timezone?: string): Promise<EveningWrapData> {
  console.log('[BriefingBuilder] Building evening wrap data...', { timezone });

  try {
    // Timezone-safe date boundaries for Google Calendar (RFC 3339 compliant)
    const todayStr = getTodayInTimezone(timezone);
    const tomorrowStr = getDateInTimezone(1, timezone);
    const tzOffset = getTimezoneOffsetString(timezone);
    const gcalTodayStart = `${todayStr}T00:00:00${tzOffset}`;
    const gcalTomorrowEnd = `${tomorrowStr}T23:59:59${tzOffset}`;

    // Parallel queries for all data sources
    const [
      completedTasksResult,
      pendingTasksResult,
      tomorrowTasksResult,
      weekTasksResult,
      billsResult,
      habitsResult,
      goalsResult,
      googleResult,
    ] = await Promise.all([
      queryNotionRaw('tasks', { filter: 'today', status: 'completed', timezone }),
      queryNotionRaw('tasks', { filter: 'today', status: 'pending', timezone }),
      queryNotionRaw('tasks', { filter: 'tomorrow', status: 'all', timezone }),
      queryNotionRaw('tasks', { filter: 'this_week', status: 'all', timezone }),
      queryNotionRaw('bills', { timeframe: 'this_week', unpaidOnly: true, timezone }),
      queryNotionRaw('habits', { frequency: 'all' }),
      queryNotionRaw('goals', { status: 'active' }),
      fetchGoogleCalendarEventsSafe(gcalTodayStart, gcalTomorrowEnd, timezone),
    ]);

    // Parse task results with client-side status filtering
    const completedTasks = parseTaskResults(completedTasksResult, 'completed');
    const pendingTasks = parseTaskResults(pendingTasksResult, 'pending');
    const tomorrowTasks = parseTaskResults(tomorrowTasksResult, 'all');
    const weekTasks = parseTaskResults(weekTasksResult, 'all');

    // Build day review
    const dayReview = buildDayReview(completedTasks, pendingTasks);

    // Split Google events into today and tomorrow
    const googleTodayRaw = googleResult.filter((e) => e.startTime.startsWith(todayStr) || (e.allDay && e.startTime === todayStr));
    const googleTomorrowRaw = googleResult.filter((e) => e.startTime.startsWith(tomorrowStr) || (e.allDay && e.startTime === tomorrowStr));
    const googleTodayEvents = transformGoogleCalendarEvents(googleTodayRaw);
    const googleTomorrowEvents = transformGoogleCalendarEvents(googleTomorrowRaw);

    // TODAY's events: Notion today tasks (FIX: was using tomorrowTasks) + Google today events
    const notionTodayEvents = deriveCalendarEvents([...completedTasks, ...pendingTasks]);
    const calendarTodayEvents = mergeCalendarEvents(notionTodayEvents, googleTodayEvents);

    // TOMORROW's events: Notion tomorrow tasks + Google tomorrow events
    const notionTomorrowEvents = deriveCalendarEventsForTomorrow(tomorrowTasks);
    const tomorrowCalendarEvents = mergeCalendarEvents(notionTomorrowEvents, googleTomorrowEvents);
    const tomorrow: TomorrowPreviewData = {
      tasks: tomorrowTasks,
      events: tomorrowCalendarEvents,
    };

    // Build week summary
    const weekSummary = analyzeWeekLoad(weekTasks);

    // Parse other results
    const bills = parseBillResults(billsResult, {
      timeframe: 'this_week',
      unpaidOnly: true,
      timezone,
    });
    const billTotal = bills.reduce((sum, b) => sum + b.amount, 0);
    const habits = parseHabitResults(habitsResult);
    const streakSummary = buildStreakSummary(habits);
    const goals = parseGoalResults(goalsResult);

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
        today: calendarTodayEvents,
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
      calendarTodayFromGoogle: googleTodayEvents.length,
      calendarTomorrowFromGoogle: googleTomorrowEvents.length,
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
        source: 'notion' as const,
        sourceTaskId: t.id,
      };
    })
    .sort((a, b) => {
      const timeA = a.time.replace(/[^0-9:]/g, '');
      const timeB = b.time.replace(/[^0-9:]/g, '');
      return timeA.localeCompare(timeB);
    });
}

// =============================================================================
// Google Calendar Integration Helpers
// =============================================================================

/**
 * Transform Google Calendar API events into the briefing CalendarEvent format
 */
function transformGoogleCalendarEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const oneHourFromNow = addHours(now, 1);

  return events.map((e) => {
    const start = new Date(e.startTime);
    const end = new Date(e.endTime);
    const isUpcoming = !e.allDay && isWithinInterval(start, { start: now, end: oneHourFromNow });

    return {
      id: `gcal-${e.id}`,
      title: e.title,
      time: e.allDay ? 'All day' : format(start, 'h:mm a'),
      endTime: e.allDay ? undefined : format(end, 'h:mm a'),
      isUpcoming,
      allDay: e.allDay,
      location: e.location ?? undefined,
      source: 'google' as const,
      googleEventId: e.id,
    };
  });
}

/**
 * Merge Notion-derived and Google Calendar events, sorted by time
 */
function mergeCalendarEvents(notionEvents: CalendarEvent[], googleEvents: CalendarEvent[]): CalendarEvent[] {
  const merged = [...notionEvents, ...googleEvents];
  return merged.sort((a, b) => {
    // All-day events float to top
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    // Both all-day: alphabetical
    if (a.allDay && b.allDay) return a.title.localeCompare(b.title);
    // Both timed: sort by time string
    return a.time.localeCompare(b.time);
  });
}

/**
 * Fetch Google Calendar events with full error containment
 * NEVER throws — returns empty array on any failure
 */
async function fetchGoogleCalendarEventsSafe(
  timeMin: string,
  timeMax: string,
  timezone?: string,
): Promise<GoogleCalendarEvent[]> {
  if (!isGoogleCalendarConfigured()) return [];
  try {
    return await queryGoogleCalendarEvents({ timeMin, timeMax, timezone });
  } catch (error) {
    console.error('[BriefingBuilder] Google Calendar fetch failed, continuing without:', error);
    return [];
  }
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

// =============================================================================
// Weekly Review Data Builder (Plan 06-03)
// =============================================================================

/**
 * Build weekly review data
 * Per CONTEXT.md: very brief retrospective, then mostly forward planning
 * Retrospective is factual only (tasks completed, bills paid, project progress)
 * @param timezone - IANA timezone string for date calculations
 */
export async function buildWeeklyReviewData(timezone?: string): Promise<WeeklyReviewData> {
  console.log('[BriefingBuilder] Building weekly review data...', { timezone });

  try {
    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = addDays(now, -7);
    const sevenDaysFromNow = addDays(now, 7);
    const fourteenDaysFromNow = addDays(now, 14);
    const twentyEightDaysFromNow = addDays(now, 28);

    // Timezone-safe week boundaries for Google Calendar (RFC 3339 compliant)
    const todayStr = getTodayInTimezone(timezone);
    const weekEndStr = getDateInTimezone(7, timezone);
    const tzOffset = getTimezoneOffsetString(timezone);
    const gcalWeekStart = `${todayStr}T00:00:00${tzOffset}`;
    const gcalWeekEnd = `${weekEndStr}T23:59:59${tzOffset}`;

    // Parallel queries for all data sources
    const [
      completedTasksResult,
      paidBillsResult,
      upcomingWeekTasksResult,
      horizonTasksResult,
      horizonBillsResult,
      googleResult,
    ] = await Promise.all([
      // Retrospective: completed tasks in last 7 days
      queryNotionRaw('tasks', { filter: 'all', status: 'completed', timezone }),
      // Retrospective: bills paid in last 7 days
      queryNotionRaw('bills', { timeframe: 'this_month', unpaidOnly: false, timezone }),
      // Upcoming week: tasks due in next 7 days
      queryNotionRaw('tasks', { filter: 'this_week', status: 'all', timezone }),
      // Horizon scan: tasks due in 14-28 days
      queryNotionRaw('tasks', { filter: 'all', status: 'pending', timezone }),
      // Horizon scan: bills due in next month
      queryNotionRaw('bills', { timeframe: 'this_month', unpaidOnly: true, timezone }),
      // Google Calendar: events for upcoming week
      fetchGoogleCalendarEventsSafe(gcalWeekStart, gcalWeekEnd, timezone),
    ]);

    // Parse and filter retrospective data (last 7 days)
    const allCompletedTasks = parseTaskResults(completedTasksResult, 'completed');
    const recentCompletedTasks = allCompletedTasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueDate = parseISO(t.dueDate);
      return dueDate >= sevenDaysAgo && dueDate <= now;
    });

    const allBills = parseBillResults(paidBillsResult, {
      timeframe: 'this_month',
      unpaidOnly: false,
      timezone,
    });
    const paidBills = allBills.filter((b) => {
      // Bills marked as paid typically have a paid date or status
      // For now, count recent bills as potentially paid
      if (!b.dueDate) return false;
      const dueDate = parseISO(b.dueDate);
      return dueDate >= sevenDaysAgo && dueDate <= now;
    });

    // Extract unique project names from completed tasks (would need project relation)
    // For now, derive from task titles if they contain project indicators
    const projectsProgressed = extractProjectsFromTasks(recentCompletedTasks);

    // Parse upcoming week data
    const upcomingWeekTasks = parseTaskResults(upcomingWeekTasksResult, 'all');
    const weekAnalysis = analyzeWeekLoad(upcomingWeekTasks);
    const notionCalendarEvents = deriveCalendarEvents(upcomingWeekTasks);
    const googleCalendarEvents = transformGoogleCalendarEvents(googleResult);
    const calendarEvents = mergeCalendarEvents(notionCalendarEvents, googleCalendarEvents);

    // Parse horizon data (14-28 days out)
    const allPendingTasks = parseTaskResults(horizonTasksResult, 'pending');
    const horizonTasks = allPendingTasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueDate = parseISO(t.dueDate);
      return dueDate >= fourteenDaysFromNow && dueDate <= twentyEightDaysFromNow;
    });
    const horizonDeadlines = horizonTasks.filter(
      (t) => t.priority === 'High' || t.dueTime
    );

    const allUnpaidBills = parseBillResults(horizonBillsResult, {
      timeframe: 'this_month',
      unpaidOnly: true,
      timezone,
    });
    const horizonBills = allUnpaidBills.filter((b) => {
      if (!b.dueDate) return false;
      const dueDate = parseISO(b.dueDate);
      return dueDate >= fourteenDaysFromNow && dueDate <= twentyEightDaysFromNow;
    });

    // Get life area insights
    const lifeAreaTracker = getLifeAreaTracker();
    const lifeAreaInsights = lifeAreaTracker.getLifeAreaInsights();

    const weeklyReviewData: WeeklyReviewData = {
      retrospective: {
        tasksCompleted: recentCompletedTasks.length,
        billsPaid: paidBills.length,
        projectsProgressed,
      },
      upcomingWeek: {
        taskCount: upcomingWeekTasks.length,
        tasks: upcomingWeekTasks.slice(0, 10), // Top 10 for brevity
        events: calendarEvents,
        busyDays: weekAnalysis.busyDays,
        lightDays: weekAnalysis.lightDays,
      },
      horizon: {
        deadlines: horizonDeadlines.slice(0, 5), // Top 5
        upcomingBills: horizonBills.slice(0, 5), // Top 5
        projectMilestones: [], // Would need project milestone data from Notion
      },
      lifeAreas: lifeAreaInsights,
    };

    console.log('[BriefingBuilder] Weekly review data built:', {
      tasksCompleted: recentCompletedTasks.length,
      billsPaid: paidBills.length,
      projectsProgressed: projectsProgressed.length,
      upcomingTaskCount: upcomingWeekTasks.length,
      horizonDeadlines: horizonDeadlines.length,
      horizonBills: horizonBills.length,
      neglectedAreas: lifeAreaInsights.neglectedAreas.length,
    });

    return weeklyReviewData;
  } catch (error) {
    console.error('[BriefingBuilder] Error building weekly review data:', error);
    // Return empty data structure on error
    return {
      retrospective: {
        tasksCompleted: 0,
        billsPaid: 0,
        projectsProgressed: [],
      },
      upcomingWeek: {
        taskCount: 0,
        tasks: [],
        events: [],
        busyDays: [],
        lightDays: [],
      },
      horizon: {
        deadlines: [],
        upcomingBills: [],
        projectMilestones: [],
      },
      lifeAreas: {
        neglectedAreas: [],
        activeAreas: [],
        lastUpdated: Date.now(),
      },
    };
  }
}

/**
 * Extract project names from completed tasks
 * Simple heuristic: look for common patterns like "Project Name: Task" or "[Project] Task"
 */
function extractProjectsFromTasks(tasks: TaskSummary[]): string[] {
  const projects = new Set<string>();

  for (const task of tasks) {
    // Check for "Project: Task" pattern
    const colonMatch = task.title.match(/^([^:]+):/);
    if (colonMatch) {
      projects.add(colonMatch[1].trim());
      continue;
    }

    // Check for "[Project] Task" pattern
    const bracketMatch = task.title.match(/^\[([^\]]+)\]/);
    if (bracketMatch) {
      projects.add(bracketMatch[1].trim());
    }
  }

  return Array.from(projects);
}
