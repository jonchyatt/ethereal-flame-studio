/**
 * Behavior Rules — System Prompt Integration (Phase D)
 *
 * Loads active behavioral rules from the database and formats
 * them for injection into the system prompt.
 *
 * Rules are created by the reflection loop (D-02) or manually.
 * They shape how Jarvis responds — evolved from self-evaluation.
 */

import { getActiveRules } from '../memory/queries/behaviorRules';

/**
 * Load active behavior rules for system prompt injection.
 * Returns array of rule strings, or empty array if none exist.
 */
export async function loadBehaviorRulesForPrompt(): Promise<string[]> {
  try {
    const rules = await getActiveRules();
    return rules.map(r => r.rule);
  } catch (error) {
    console.error('[BehaviorRules] Failed to load rules:', error);
    return [];
  }
}
