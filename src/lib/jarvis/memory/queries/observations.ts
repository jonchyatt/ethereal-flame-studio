/**
 * Observation Query Functions
 *
 * Track behavioral patterns for preference inference.
 * After threshold observations of same pattern, infer preference.
 */

import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { observations, type Observation, type NewObservation } from '../schema';

export type PatternType = 'communication_style' | 'scheduling' | 'topic_interest' | 'workflow' | 'error_pattern';

/**
 * Record a new observation of a behavioral pattern.
 */
export async function recordObservation(
  pattern: string,
  patternType: PatternType,
  evidence: string,
  sessionId?: number
): Promise<Observation> {
  const inserted = await db
    .insert(observations)
    .values({
      pattern,
      patternType,
      evidence,
      sessionId: sessionId ?? null,
    })
    .returning();

  return inserted[0];
}

/**
 * Count observations of a specific pattern within time window.
 *
 * @param pattern - The pattern identifier
 * @param withinDays - Only count observations from last N days (default: 7)
 */
export async function countObservations(
  pattern: string,
  withinDays = 7
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);
  const cutoffStr = cutoff.toISOString();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(observations)
    .where(
      and(
        eq(observations.pattern, pattern),
        gte(observations.createdAt, cutoffStr)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Get recent observations for a pattern (for debugging/display).
 */
export async function getObservationsForPattern(
  pattern: string,
  limit = 10
): Promise<Observation[]> {
  return db
    .select()
    .from(observations)
    .where(eq(observations.pattern, pattern))
    .orderBy(desc(observations.createdAt))
    .limit(limit);
}

/**
 * Clear observations for a pattern (after inference or rejection).
 */
export async function clearObservations(pattern: string): Promise<void> {
  await db.delete(observations).where(eq(observations.pattern, pattern));
}

/**
 * Get all unique patterns with observation counts.
 */
export async function getPatternCounts(): Promise<{ pattern: string; count: number }[]> {
  const result = await db
    .select({
      pattern: observations.pattern,
      count: sql<number>`count(*)`,
    })
    .from(observations)
    .groupBy(observations.pattern);

  return result;
}
