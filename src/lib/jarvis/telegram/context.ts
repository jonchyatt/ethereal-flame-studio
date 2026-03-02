/**
 * System Prompt Context Builder
 *
 * Builds the full SystemPromptContext for a session.
 * Shared by web chat route and Telegram bot.
 *
 * Phase 15: Telegram Control
 */

import { getJarvisConfig } from '../config';
import {
  retrieveMemories,
  formatMemoriesForPrompt,
  getProactiveSurfacing,
  formatProactiveSurfacing,
  getEntriesByCategory,
} from '../memory';
import { loadConversationHistory } from '../memory/queries/messages';
import { loadBehaviorRulesForPrompt } from '../intelligence/behaviorRules';
import { getServiceHealth } from '../resilience/CircuitBreaker';
import { isAcademyConfigured } from '../academy/githubReader';
import { getAllAcademyProgress } from '../academy/queries';
import { queryDatabase, retrievePage } from '../notion/NotionClient';
import { LIFE_OS_DATABASES, MEAL_PLAN_PROPS, RECIPE_PROPS } from '../notion/schemas';
import type { SystemPromptContext } from '../intelligence/systemPrompt';

export interface ContextOptions {
  /** Client timezone (e.g., 'America/Chicago'). Falls back to UTC. */
  timezone?: string;
  /** Client type for prompt adaptation */
  clientType?: 'text' | 'voice' | 'telegram';
}

// =============================================================================
// Weekly Meal Context for System Prompt
// =============================================================================

const MEAL_TIME_ORDER: Record<string, number> = { Breakfast: 0, Lunch: 1, Dinner: 2 };
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Build a full-week meal context string for the system prompt.
 * Returns null if no meals are planned at all (section omitted entirely).
 */
async function fetchWeeklyMealContext(timezone?: string): Promise<string | null> {
  const mealPlanDbId = LIFE_OS_DATABASES.mealPlan;
  if (!mealPlanDbId) return null;

  try {
    // Step A: today + ordered day list
    const tz = timezone || 'UTC';
    const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
    const todayIdx = WEEK_DAYS.indexOf(todayDayName);
    const orderedDays = todayIdx >= 0
      ? [...WEEK_DAYS.slice(todayIdx), ...WEEK_DAYS.slice(0, todayIdx)]
      : WEEK_DAYS;

    // Step B: query all meals (one call)
    const result = await queryDatabase(mealPlanDbId, {});
    const pages = (result as { results?: unknown[] })?.results || [];

    interface SimpleMeal {
      title: string;
      dayOfWeek: string;
      timeOfDay: string;
      setting: string | null;
      servings: number | null;
      recipeIds: string[];
    }

    const meals: SimpleMeal[] = pages.map((page: unknown) => {
      const p = page as { properties: Record<string, unknown> };
      const dayRaw = extractSelectLocal(p.properties[MEAL_PLAN_PROPS.dayOfWeek]);
      const settingRaw = extractSelectLocal(p.properties[MEAL_PLAN_PROPS.setting]);
      const timeRaw = extractSelectLocal(p.properties[MEAL_PLAN_PROPS.timeOfDay]);
      const timeOfDay = (timeRaw !== 'Unknown' ? timeRaw : '') || extractRichTextLocal(p.properties[MEAL_PLAN_PROPS.timeOfDay]) || '';
      const servingsRaw = extractNumberLocal(p.properties[MEAL_PLAN_PROPS.servings]);
      const recipeRelation = p.properties[MEAL_PLAN_PROPS.recipes] as { relation?: Array<{ id: string }> } | undefined;

      return {
        title: extractTitleLocal(p.properties[MEAL_PLAN_PROPS.title]),
        dayOfWeek: dayRaw !== 'Unknown' ? dayRaw : '',
        timeOfDay,
        setting: settingRaw !== 'Unknown' ? settingRaw : null,
        servings: servingsRaw || null,
        recipeIds: (recipeRelation?.relation || []).filter(r => r.id).map(r => r.id),
      };
    });

    if (meals.length === 0) return null;

    // Group by day
    const mealsByDay = new Map<string, SimpleMeal[]>();
    for (const day of WEEK_DAYS) mealsByDay.set(day, []);
    for (const meal of meals) {
      const existing = mealsByDay.get(meal.dayOfWeek);
      if (existing) existing.push(meal);
    }

    // Step C: resolve recipe times for today's dinner only
    const todayMeals = mealsByDay.get(todayDayName) || [];
    const todayDinner = todayMeals.find(m => m.timeOfDay.toLowerCase().includes('dinner'));
    let dinnerPrepTime: number | null = null;
    let dinnerCookTime: number | null = null;

    if (todayDinner && todayDinner.recipeIds.length > 0) {
      try {
        const recipePage = await retrievePage(todayDinner.recipeIds[0]) as { properties?: Record<string, unknown> };
        if (recipePage?.properties) {
          const prepRaw = extractNumberLocal(recipePage.properties[RECIPE_PROPS.prepTime]);
          const cookRaw = extractNumberLocal(recipePage.properties[RECIPE_PROPS.cookTime]);
          dinnerPrepTime = prepRaw || null;
          dinnerCookTime = cookRaw || null;
        }
      } catch {
        // Recipe lookup failed — proceed without times
      }
    }

    // Step D: format the full week
    const dayLines: string[] = [];
    for (const day of orderedDays) {
      const dayMeals = (mealsByDay.get(day) || [])
        .sort((a, b) => (MEAL_TIME_ORDER[a.timeOfDay] ?? 99) - (MEAL_TIME_ORDER[b.timeOfDay] ?? 99));

      const isToday = day === todayDayName;
      const prefix = isToday ? `${day} (today)` : day;

      if (dayMeals.length === 0) {
        dayLines.push(`- ${prefix}: (nothing planned)`);
      } else {
        const mealDescs = dayMeals.map(m => {
          let desc = m.title;
          if (m.timeOfDay) desc += ` (${m.timeOfDay.toLowerCase()}`;
          if (m.setting) desc += `, ${m.setting}`;
          desc += m.timeOfDay ? ')' : '';
          return desc;
        });
        dayLines.push(`- ${prefix}: ${mealDescs.join(', ')}`);
      }
    }

    // Step E: tonight's dinner detail
    let tonightDetail = '';
    if (todayDinner) {
      const setting = todayDinner.setting || 'Home';
      const totalTime = (dinnerPrepTime ?? 0) + (dinnerCookTime ?? 0);
      const servingsStr = todayDinner.servings ? ` (${todayDinner.servings} servings)` : '';

      if (setting === 'Home' || !todayDinner.setting) {
        tonightDetail = `\nTonight's dinner: ${todayDinner.title}${servingsStr}`;
        if (totalTime > 0) {
          tonightDetail += ` — ${totalTime}min total (${dinnerPrepTime ?? 0}min prep + ${dinnerCookTime ?? 0}min cook). Home cooking: consider when to start prep given current time.`;
        } else {
          tonightDetail += `. Home cooking.`;
        }
      } else if (setting === 'Dine-Out') {
        tonightDetail = `\nTonight's dinner: ${todayDinner.title}${servingsStr} — dining out. Consider travel time and reservation.`;
      } else if (setting === 'Takeout') {
        tonightDetail = `\nTonight's dinner: ${todayDinner.title}${servingsStr} — takeout. Consider order lead time.`;
      }
    }

    return `Week overview (starting today):\n${dayLines.join('\n')}${tonightDetail}`;
  } catch (error) {
    console.error('[Context] Meal context failed:', error);
    return null;
  }
}

// Inline extraction helpers (BriefingBuilder's aren't exported)
function extractTitleLocal(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text || 'Untitled';
}
function extractSelectLocal(prop: unknown): string {
  const p = prop as { status?: { name?: string }; select?: { name?: string } };
  return p?.status?.name || p?.select?.name || 'Unknown';
}
function extractNumberLocal(prop: unknown): number {
  const p = prop as { number?: number };
  return p?.number || 0;
}
function extractRichTextLocal(prop: unknown): string {
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p?.rich_text?.map(t => t.plain_text || '').join('') || '';
}

/**
 * Build the full SystemPromptContext for a session.
 * Shared by web chat route and Telegram bot.
 */
export async function buildSystemPromptContext(
  sessionId: number,
  options?: ContextOptions
): Promise<SystemPromptContext> {
  const config = getJarvisConfig();

  let memoryContext: string | undefined;
  let proactiveSurfacing: string | undefined;
  let inferredPreferences: string[] | undefined;
  let conversationHistory: string | undefined;
  let serviceHealth: Record<string, 'degraded' | 'down'> | undefined;
  let behaviorRules: string[] | undefined;

  // Launch all independent data fetches in parallel
  const [memoryResult, historyResult, preferencesResult, rulesResult, mealContextResult, academyProgressResult] = await Promise.all([
    // 1. Memory retrieval + proactive surfacing
    config.enableMemoryLoading
      ? retrieveMemories({ maxTokens: config.memoryTokenBudget, maxEntries: config.maxMemories })
          .catch(err => { console.error('[Context] Memory retrieval failed:', err); return null; })
      : Promise.resolve(null),

    // 2. Conversation history (independent of memory)
    config.enableMemoryLoading
      ? loadConversationHistory(sessionId, config.historyTokenBudget, config.maxHistoryMessages)
          .catch(err => { console.error('[Context] History loading failed:', err); return null; })
      : Promise.resolve(null),

    // 3. Inferred preferences (independent query)
    config.enableMemoryLoading
      ? getEntriesByCategory('preference')
          .catch(err => { console.error('[Context] Preferences loading failed:', err); return []; })
      : Promise.resolve([]),

    // 4. Behavioral rules (independent of memory)
    config.enableSelfImprovement
      ? loadBehaviorRulesForPrompt()
          .catch(err => { console.error('[Context] Behavior rules loading failed:', err); return []; })
      : Promise.resolve([]),

    // 5. Weekly meal context (independent — one Notion query + 0-1 recipe lookups)
    fetchWeeklyMealContext(options?.timezone)
      .catch(err => { console.error('[Context] Meal context failed:', err); return null; }),

    // 6. Academy progress (independent — for system prompt student progress section)
    isAcademyConfigured()
      ? getAllAcademyProgress()
          .catch(err => { console.error('[Context] Academy progress failed:', err); return []; })
      : Promise.resolve([]),
  ]);

  // Process memory results
  if (memoryResult) {
    memoryContext = formatMemoriesForPrompt(memoryResult);
    const surfacing = getProactiveSurfacing(memoryResult.entries);
    const surfacingText = formatProactiveSurfacing(surfacing);
    proactiveSurfacing = surfacingText || undefined;
  }

  // Process conversation history
  conversationHistory = historyResult || undefined;

  // Process inferred preferences
  if (preferencesResult && preferencesResult.length > 0) {
    const inferred = preferencesResult.filter(e => e.source === 'jarvis_inferred');
    if (inferred.length > 0) {
      inferredPreferences = inferred.map(e => e.content);
    }
  }

  // Process behavior rules
  if (rulesResult && rulesResult.length > 0) {
    behaviorRules = rulesResult;
  }

  // Service health (synchronous — no DB call)
  if (config.enableSelfHealing) {
    const health = getServiceHealth();
    const issues: Record<string, 'degraded' | 'down'> = {};
    for (const [service, state] of Object.entries(health)) {
      if (state.state === 'OPEN') issues[service] = 'down';
      else if (state.state === 'HALF_OPEN') issues[service] = 'degraded';
    }
    if (Object.keys(issues).length > 0) serviceHealth = issues;
  }

  const now = new Date();
  const timezone = options?.timezone || 'UTC';

  return {
    currentTime: now,
    timezone,
    userName: 'Jonathan',
    clientType: options?.clientType || 'text',
    memoryContext,
    proactiveSurfacing,
    inferredPreferences,
    conversationHistory,
    serviceHealth,
    behaviorRules,
    mealContext: mealContextResult || undefined,
    academyConfigured: isAcademyConfigured(),
    academyProgress: academyProgressResult && academyProgressResult.length > 0 ? academyProgressResult : undefined,
  };
}
