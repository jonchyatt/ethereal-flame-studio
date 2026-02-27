/**
 * Conversation Evaluation Query Functions
 *
 * Store and retrieve self-improvement critic evaluations.
 * Each evaluation scores a conversation on 5 dimensions.
 */

import { desc, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { conversationEvaluations, type ConversationEvaluation } from '../schema';

export interface EvaluationScores {
  completeness: { score: number; evidence: string };
  accuracy: { score: number; evidence: string };
  efficiency: { score: number; evidence: string };
  tone: { score: number; evidence: string };
  satisfaction: { score: number; evidence: string };
}

/**
 * Store a conversation evaluation.
 */
export async function storeEvaluation(
  sessionId: number,
  scores: EvaluationScores,
  overall: number,
  strengths: string[],
  improvements: string[],
  model: string,
  activeRuleIds?: number[]
): Promise<ConversationEvaluation> {
  const inserted = await db
    .insert(conversationEvaluations)
    .values({
      sessionId,
      scores: JSON.stringify(scores),
      overall: overall.toFixed(1),
      strengths: JSON.stringify(strengths),
      improvements: JSON.stringify(improvements),
      model,
      activeRuleIds: activeRuleIds ? JSON.stringify(activeRuleIds) : null,
    })
    .returning();

  return inserted[0];
}

/**
 * Get recent evaluations for the reflection loop.
 */
export async function getRecentEvaluations(
  limit = 10
): Promise<ConversationEvaluation[]> {
  return db
    .select()
    .from(conversationEvaluations)
    .orderBy(desc(conversationEvaluations.evaluatedAt))
    .limit(limit);
}

/**
 * Get average scores across recent evaluations (for pattern detection).
 */
export async function getAverageScores(
  sinceDays = 7
): Promise<{ avgOverall: number; count: number } | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - sinceDays);
  const cutoffStr = cutoff.toISOString();

  const result = await db
    .select({
      avgOverall: sql<number>`avg(cast(${conversationEvaluations.overall} as real))`,
      count: sql<number>`count(*)`,
    })
    .from(conversationEvaluations)
    .where(gte(conversationEvaluations.evaluatedAt, cutoffStr));

  const row = result[0];
  if (!row || row.count === 0) return null;
  return { avgOverall: row.avgOverall, count: row.count };
}
