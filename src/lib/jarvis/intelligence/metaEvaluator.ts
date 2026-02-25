/**
 * Meta-Evaluator — Self-Improvement Health Monitor (Phase D-02)
 *
 * Second-order feedback loop: evaluates whether the self-improvement
 * system itself is working effectively.
 *
 * Runs weekly (checked by the same daily cron). Analyzes:
 * - Score trends: are average scores improving over time?
 * - Rule effectiveness: did scores improve after rule changes?
 * - Rule churn: healthy supersession rate vs stagnation vs instability
 * - Rule saturation: hitting the 10-rule cap?
 * - Reflection frequency: are reflections running often enough?
 *
 * Uses Opus for synthesis. Advisory only — logs diagnostics but
 * does not auto-modify pipeline parameters.
 *
 * Cost: ~1 Opus call/week = ~$0.40/month
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../memory/db';
import { conversationEvaluations, behaviorRules } from '../memory/schema';
import { sql, desc, gte, eq } from 'drizzle-orm';
import { addRule } from '../memory/queries/behaviorRules';

const MODEL_META = 'claude-opus-4-6';
const anthropic = new Anthropic();

const META_SYSTEM_PROMPT = `You are a systems analyst evaluating whether an AI assistant's self-improvement pipeline is functioning effectively.

The self-improvement system has three layers:
- Layer 1: Conversation evaluator (Haiku scores each conversation on 5 dimensions)
- Layer 2: Reflection loop (Opus synthesizes evaluations into behavioral rules)
- Layer 3: You — the meta-evaluator checking if layers 1 and 2 are actually working

You receive:
1. Weekly score averages over the last 4 weeks (trend data)
2. Rule creation/supersession history
3. Current active rules count

Diagnose the health of the self-improvement system:
- Are scores trending upward? (good) Flat? (concerning) Declining? (bad)
- Are rules being created? If not, is it because scores are already high, or because reflection is broken?
- Are rules being superseded? Zero supersession = possible stagnation. Too much = instability.
- Is the system hitting the 10-rule cap? May need quality over quantity.
- Are there long gaps between reflections?

Be honest and specific. If the system is working well, say so. If not, explain exactly what's wrong and what should change.`;

const META_TOOL: Anthropic.Tool = {
  name: 'submit_meta_evaluation',
  description: 'Submit the meta-evaluation of the self-improvement system health',
  input_schema: {
    type: 'object' as const,
    properties: {
      healthScore: {
        type: 'number',
        description: 'Overall self-improvement system health, 0-10',
      },
      diagnosis: {
        type: 'string',
        description: 'What is working well, what is not, and why',
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Actionable recommendations for improving the self-improvement system',
      },
      adjustments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            parameter: { type: 'string', description: 'Which parameter to adjust' },
            currentValue: { type: 'string', description: 'Current setting' },
            suggestedValue: { type: 'string', description: 'Suggested new setting' },
            reason: { type: 'string', description: 'Why this change would help' },
          },
          required: ['parameter', 'currentValue', 'suggestedValue', 'reason'],
        },
        description: 'Concrete parameter tuning suggestions (advisory only)',
      },
    },
    required: ['healthScore', 'diagnosis', 'recommendations', 'adjustments'],
  },
};

export interface MetaEvaluationResult {
  ran: boolean;
  healthScore?: number;
  diagnosis?: string;
  recommendations?: string[];
  error?: string;
}

/**
 * Check if meta-evaluation should run (once per week).
 */
async function shouldRunMetaEval(): Promise<boolean> {
  try {
    // Look for the most recent meta_evaluation entry
    const lastMeta = await db
      .select()
      .from(behaviorRules)
      .where(eq(behaviorRules.category, 'meta_evaluation'))
      .orderBy(desc(behaviorRules.createdAt))
      .limit(1);

    if (lastMeta.length === 0) return true; // Never run before

    const lastRunTime = new Date(lastMeta[0].createdAt);
    const daysSince = (Date.now() - lastRunTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  } catch {
    return false;
  }
}

/**
 * Get weekly score averages for the last 4 weeks.
 */
async function getWeeklyTrends(): Promise<Array<{ week: string; avgScore: number; count: number }>> {
  const weeks: Array<{ week: string; avgScore: number; count: number }> = [];

  for (let weeksAgo = 0; weeksAgo < 4; weeksAgo++) {
    const start = new Date();
    start.setDate(start.getDate() - (weeksAgo + 1) * 7);
    const end = new Date();
    end.setDate(end.getDate() - weeksAgo * 7);

    const result = await db
      .select({
        avgScore: sql<number>`avg(cast(${conversationEvaluations.overall} as real))`,
        count: sql<number>`count(*)`,
      })
      .from(conversationEvaluations)
      .where(
        sql`${conversationEvaluations.evaluatedAt} >= ${start.toISOString()} AND ${conversationEvaluations.evaluatedAt} < ${end.toISOString()}`
      );

    const row = result[0];
    if (row && row.count > 0) {
      weeks.push({
        week: `${weeksAgo === 0 ? 'This week' : `${weeksAgo} week(s) ago`}`,
        avgScore: row.avgScore,
        count: row.count,
      });
    }
  }

  return weeks;
}

/**
 * Get rule activity history for the last 30 days.
 */
async function getRuleActivity(): Promise<{ created: number; superseded: number; activeCount: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  const created = await db
    .select({ count: sql<number>`count(*)` })
    .from(behaviorRules)
    .where(gte(behaviorRules.createdAt, cutoffStr));

  const superseded = await db
    .select({ count: sql<number>`count(*)` })
    .from(behaviorRules)
    .where(
      sql`${behaviorRules.supersededAt} IS NOT NULL AND ${behaviorRules.supersededAt} >= ${cutoffStr}`
    );

  const active = await db
    .select({ count: sql<number>`count(*)` })
    .from(behaviorRules)
    .where(eq(behaviorRules.isActive, 1));

  return {
    created: created[0]?.count ?? 0,
    superseded: superseded[0]?.count ?? 0,
    activeCount: active[0]?.count ?? 0,
  };
}

/**
 * Run meta-evaluation — check if self-improvement is working.
 *
 * Returns null if not time to run yet (< 7 days since last).
 * Fire-and-forget safe.
 */
export async function runMetaEvaluation(): Promise<MetaEvaluationResult | null> {
  try {
    const shouldRun = await shouldRunMetaEval();
    if (!shouldRun) {
      return null; // Not time yet
    }

    // Gather health signals
    const weeklyTrends = await getWeeklyTrends();
    const ruleActivity = await getRuleActivity();

    // Check if we have enough data (need at least 1 week of evaluations)
    const totalEvals = weeklyTrends.reduce((sum, w) => sum + w.count, 0);
    if (totalEvals < 5) {
      console.log('[MetaEvaluator] Skipping: insufficient data (< 5 evaluations in 4 weeks)');
      return { ran: false };
    }

    // Build the analysis prompt
    const trendText = weeklyTrends.length > 0
      ? weeklyTrends.map(w => `  ${w.week}: ${w.avgScore.toFixed(1)}/10 (${w.count} evaluations)`).join('\n')
      : '  No trend data available';

    const userMessage = `Analyze the health of this self-improvement system.

WEEKLY SCORE TRENDS (last 4 weeks):
${trendText}

RULE ACTIVITY (last 30 days):
  Rules created: ${ruleActivity.created}
  Rules superseded: ${ruleActivity.superseded}
  Currently active rules: ${ruleActivity.activeCount}/10

SYSTEM PARAMETERS:
  Evaluation trigger: after conversations with 2+ tool uses or complex queries
  Reflection trigger: daily cron + after every 10 evaluations
  Meta-evaluation trigger: weekly (this check)
  Max new rules per reflection: 3
  Max supersessions per reflection: 2
  Active rule cap: 10
  Evaluation model: Haiku (cheap, fast)
  Reflection model: Opus (deep reasoning)

Is the self-improvement pipeline healthy? Are scores improving? Are rules effective?`;

    const response = await anthropic.messages.create({
      model: MODEL_META,
      max_tokens: 2048,
      system: META_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      tools: [META_TOOL],
      tool_choice: { type: 'tool', name: 'submit_meta_evaluation' },
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    if (!toolBlock) {
      return { ran: true, error: 'No tool_use block in response' };
    }

    const result = toolBlock.input as {
      healthScore: number;
      diagnosis: string;
      recommendations: string[];
      adjustments: Array<{ parameter: string; currentValue: string; suggestedValue: string; reason: string }>;
    };

    // Store the meta-evaluation as a behavior_rules entry for history tracking
    const reportContent = JSON.stringify({
      healthScore: result.healthScore,
      diagnosis: result.diagnosis,
      recommendations: result.recommendations,
      adjustments: result.adjustments,
      weeklyTrends,
      ruleActivity,
      timestamp: new Date().toISOString(),
    });

    await addRule(
      reportContent,
      'meta_evaluation',
      'reflection',
      `Meta-evaluation health score: ${result.healthScore}/10`
    );

    // Log the report
    console.log(`[MetaEvaluator] Health: ${result.healthScore}/10`);
    console.log(`[MetaEvaluator] Diagnosis: ${result.diagnosis}`);
    if (result.recommendations.length > 0) {
      console.log(`[MetaEvaluator] Recommendations:`);
      result.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    }
    if (result.adjustments.length > 0) {
      console.log(`[MetaEvaluator] Suggested adjustments:`);
      result.adjustments.forEach(a =>
        console.log(`  ${a.parameter}: ${a.currentValue} → ${a.suggestedValue} (${a.reason})`)
      );
    }

    return {
      ran: true,
      healthScore: result.healthScore,
      diagnosis: result.diagnosis,
      recommendations: result.recommendations,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MetaEvaluator] Failed (non-blocking):', error);
    return { ran: true, error: errorMessage };
  }
}
