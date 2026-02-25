/**
 * Behavior Rules Query Functions
 *
 * CRUD for versioned behavioral rules from self-improvement.
 * Active rules are injected into the system prompt.
 */

import { eq, desc, and, ne } from 'drizzle-orm';
import { db } from '../db';
import { behaviorRules, type BehaviorRule } from '../schema';

export type RuleCategory = 'communication' | 'workflow' | 'tone' | 'task_handling' | 'meta_evaluation';
export type RuleSource = 'reflection' | 'manual' | 'seed';

/**
 * Get all active behavior rules (excludes meta_evaluation entries).
 */
export async function getActiveRules(): Promise<BehaviorRule[]> {
  return db
    .select()
    .from(behaviorRules)
    .where(and(
      eq(behaviorRules.isActive, 1),
      ne(behaviorRules.category, 'meta_evaluation')
    ))
    .orderBy(desc(behaviorRules.createdAt));
}

/**
 * Add a new active behavior rule.
 */
export async function addRule(
  rule: string,
  category: RuleCategory,
  source: RuleSource,
  rationale: string
): Promise<BehaviorRule> {
  const inserted = await db
    .insert(behaviorRules)
    .values({
      rule,
      category,
      source,
      rationale,
    })
    .returning();

  return inserted[0];
}

/**
 * Supersede a rule (deactivate it, record when it was replaced).
 */
export async function supersedeRule(id: number): Promise<void> {
  await db
    .update(behaviorRules)
    .set({
      isActive: 0,
      supersededAt: new Date().toISOString(),
    })
    .where(eq(behaviorRules.id, id));
}

/**
 * Get full rule history (active and superseded) for review.
 */
export async function getRuleHistory(limit = 20): Promise<BehaviorRule[]> {
  return db
    .select()
    .from(behaviorRules)
    .orderBy(desc(behaviorRules.createdAt))
    .limit(limit);
}
