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
import { getServiceHealth } from '../resilience/CircuitBreaker';
import type { SystemPromptContext } from '../intelligence/systemPrompt';

/**
 * Build the full SystemPromptContext for a session.
 * Shared by web chat route and Telegram bot.
 */
export async function buildSystemPromptContext(
  sessionId: number
): Promise<SystemPromptContext> {
  const config = getJarvisConfig();

  let memoryContext: string | undefined;
  let proactiveSurfacing: string | undefined;
  let inferredPreferences: string[] | undefined;
  let conversationHistory: string | undefined;
  let serviceHealth: Record<string, 'degraded' | 'down'> | undefined;

  if (config.enableMemoryLoading) {
    try {
      const memories = await retrieveMemories({
        maxTokens: config.memoryTokenBudget,
        maxEntries: config.maxMemories,
      });
      memoryContext = formatMemoriesForPrompt(memories);

      const surfacing = getProactiveSurfacing(memories.entries);
      const surfacingText = formatProactiveSurfacing(surfacing);
      proactiveSurfacing = surfacingText || undefined;

      const prefEntries = await getEntriesByCategory('preference');
      const inferred = prefEntries.filter(e => e.source === 'jarvis_inferred');
      if (inferred.length > 0) {
        inferredPreferences = inferred.map(e => e.content);
      }

      const history = await loadConversationHistory(
        sessionId, config.historyTokenBudget, config.maxHistoryMessages
      );
      conversationHistory = history || undefined;
    } catch (error) {
      console.error('[Context] Memory loading failed:', error);
    }
  }

  if (config.enableSelfHealing) {
    const health = getServiceHealth();
    const issues: Record<string, 'degraded' | 'down'> = {};
    for (const [service, state] of Object.entries(health)) {
      if (state.state === 'OPEN') issues[service] = 'down';
      else if (state.state === 'HALF_OPEN') issues[service] = 'degraded';
    }
    if (Object.keys(issues).length > 0) serviceHealth = issues;
  }

  return {
    currentTime: new Date(),
    memoryContext,
    proactiveSurfacing,
    inferredPreferences,
    conversationHistory,
    serviceHealth,
  };
}
