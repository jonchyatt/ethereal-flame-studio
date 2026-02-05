/**
 * Preference Inference Module
 *
 * Tracks behavioral observations and infers preferences when
 * consistent patterns are observed (threshold = 3 within 7 days).
 */

import {
  recordObservation as dbRecordObservation,
  countObservations,
  clearObservations,
  type PatternType,
} from './queries/observations';
import { storeMemoryEntry } from './queries/memoryEntries';
import type { MemoryEntry } from './schema';

// Inference threshold: require 3 consistent observations within 7 days
export const OBSERVATION_THRESHOLD = 3;
export const OBSERVATION_WINDOW_DAYS = 7;

/**
 * Map pattern identifiers to human-readable preferences.
 */
const PATTERN_TO_PREFERENCE: Record<string, string> = {
  prefers_brief_responses: 'Prefers brief, concise responses',
  prefers_detailed_responses: 'Prefers detailed explanations',
  prefers_bullet_points: 'Prefers bullet point formatting',
  prefers_morning_tasks: 'Prefers tackling tasks in the morning',
  prefers_end_of_day_planning: 'Prefers planning at end of day',
  interested_in_productivity: 'Interested in productivity and workflow',
  interested_in_health: 'Interested in health and wellness topics',
  uses_informal_language: 'Prefers informal conversational tone',
  uses_formal_language: 'Prefers formal professional tone',
  // Error patterns (Phase 14)
  notion_transient_error: 'Notion API has been experiencing intermittent failures',
  claude_transient_error: 'Claude API has been experiencing intermittent failures',
  turso_transient_error: 'Database has been experiencing intermittent failures',
};

/**
 * Map pattern types to memory categories.
 */
const PATTERN_TYPE_TO_CATEGORY: Record<PatternType, string> = {
  communication_style: 'preference',
  scheduling: 'fact',
  topic_interest: 'preference',
  workflow: 'preference',
  error_pattern: 'pattern',
};

/**
 * Record an observation and check if threshold is met for inference.
 *
 * @returns The inferred preference if threshold met, null otherwise
 */
export async function observeAndInfer(
  pattern: string,
  patternType: PatternType,
  evidence: string,
  sessionId?: number
): Promise<MemoryEntry | null> {
  // Record the observation
  await dbRecordObservation(pattern, patternType, evidence, sessionId);

  // Check count within window
  const count = await countObservations(pattern, OBSERVATION_WINDOW_DAYS);

  console.log(`[Inference] Pattern "${pattern}" observed ${count} times`);

  if (count >= OBSERVATION_THRESHOLD) {
    // Threshold met - infer preference
    const preferenceContent = PATTERN_TO_PREFERENCE[pattern] || pattern;
    const category = PATTERN_TYPE_TO_CATEGORY[patternType] || 'preference';

    console.log(`[Inference] Threshold met for "${pattern}", storing preference: "${preferenceContent}"`);

    // Store as inferred preference
    const entry = await storeMemoryEntry(
      preferenceContent,
      category as 'preference' | 'fact' | 'pattern',
      'jarvis_inferred'
    );

    // Clear observations now that preference is stored
    await clearObservations(pattern);

    return entry;
  }

  return null;
}

/**
 * Check if a pattern would trigger inference without recording.
 * Useful for testing or dry-run scenarios.
 */
export async function wouldInfer(pattern: string): Promise<boolean> {
  const count = await countObservations(pattern, OBSERVATION_WINDOW_DAYS);
  return count >= OBSERVATION_THRESHOLD - 1; // One more would trigger
}

/**
 * Get all pending patterns that are close to inference threshold.
 */
export async function getPendingInferences(): Promise<{ pattern: string; count: number; needed: number }[]> {
  const { getPatternCounts } = await import('./queries/observations');
  const counts = await getPatternCounts();

  return counts
    .filter(c => c.count > 0 && c.count < OBSERVATION_THRESHOLD)
    .map(c => ({
      pattern: c.pattern,
      count: c.count,
      needed: OBSERVATION_THRESHOLD - c.count,
    }));
}
