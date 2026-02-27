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
 * Returns array of rule strings (with examples when available).
 */
export async function loadBehaviorRulesForPrompt(): Promise<string[]> {
  try {
    const rules = await getActiveRules();
    // Filter out meta_evaluation entries — those are health reports, not behavioral rules
    return rules
      .filter(r => r.category !== 'meta_evaluation')
      .map(r => r.example ? `${r.rule} (Example: ${r.example})` : r.rule);
  } catch (error) {
    console.error('[BehaviorRules] Failed to load rules:', error);
    return [];
  }
}
