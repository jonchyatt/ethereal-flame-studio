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
import type { SystemPromptContext } from '../intelligence/systemPrompt';

export interface ContextOptions {
  /** Client timezone (e.g., 'America/Chicago'). Falls back to UTC. */
  timezone?: string;
  /** Client type for prompt adaptation */
  clientType?: 'text' | 'voice' | 'telegram';
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
  const [memoryResult, historyResult, preferencesResult, rulesResult] = await Promise.all([
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
    academyConfigured: isAcademyConfigured(),
  };
}
