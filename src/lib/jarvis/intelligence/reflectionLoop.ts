/**
 * Reflection Loop — Self-Improvement Synthesis (Phase D-02)
 *
 * Reads accumulated conversation evaluations, identifies patterns,
 * and synthesizes them into behavioral rules that shape future responses.
 *
 * Uses Opus (best reasoning) to analyze evaluation data and propose
 * rule changes. Fire-and-forget — errors logged, never thrown to callers.
 *
 * Triggers:
 * - Vercel Cron: daily at 5 AM UTC
 * - Interaction count: after every 10 new evaluations
 *
 * Guard rails:
 * - Max 3 new rules per reflection
 * - Max 2 supersessions per reflection
 * - Skip if < 5 new evaluations since last reflection
 * - Cap total active rules at 10
 */

import Anthropic from '@anthropic-ai/sdk';
import { callWithTools } from './llmProvider';
import { getRecentEvaluations, getAverageScores } from '../memory/queries/evaluations';
import {
  getActiveRules,
  addRule,
  supersedeRule,
  type RuleCategory,
} from '../memory/queries/behaviorRules';
import { db } from '../memory/db';
import { conversationEvaluations, behaviorRules } from '../memory/schema';
import { desc, sql, gt, eq } from 'drizzle-orm';
import type { ConversationEvaluation, BehaviorRule } from '../memory/schema';

const MODEL_REFLECTOR = 'claude-opus-4-6';

const REFLECTION_SYSTEM_PROMPT = `You are a self-improvement analyst for an AI assistant called Jarvis. Your job is to analyze conversation evaluation data and propose behavioral rules that will improve Jarvis's performance.

You receive:
1. Recent conversation evaluations (scores on 5 dimensions + strengths/improvements)
2. Current active behavioral rules
3. Average score trends

Your task:
- Identify PATTERNS across evaluations (not one-off issues)
- Propose NEW rules only when a clear, recurring pattern exists
- Propose SUPERSESSIONS when an existing rule should be refined or replaced
- Each rule must be specific and actionable (not vague like "be better")
- Each rule needs a rationale explaining what evidence led to it

Rule categories:
- communication: How Jarvis communicates (brevity, tone, formatting)
- workflow: How Jarvis handles tasks (tool usage, efficiency, ordering)
- tone: Voice and personality adjustments
- task_handling: How Jarvis approaches specific task types

Guidelines:
- Only propose rules backed by evidence from multiple evaluations
- Prefer fewer, high-quality rules over many low-quality ones
- If scores are consistently high (8+) in a dimension, don't propose rules for it
- Focus on dimensions scoring below 7 or with declining trends
- When superseding a rule, the replacement must be clearly better
- If everything looks good, propose zero changes — that's fine
- Every rule MUST include a concrete example from the evaluations — abstract rules without examples are ineffective for LLM instruction`;

const REFLECTION_TOOL: Anthropic.Tool = {
  name: 'submit_reflection',
  description: 'Submit the reflection analysis with proposed rule changes',
  input_schema: {
    type: 'object' as const,
    properties: {
      newRules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rule: { type: 'string', description: 'The behavioral rule text — specific and actionable' },
            category: { type: 'string', enum: ['communication', 'workflow', 'tone', 'task_handling'] },
            rationale: { type: 'string', description: 'Evidence from evaluations that led to this rule' },
            example: { type: 'string', description: 'A concrete example from the evaluations showing what good behavior looks like. E.g. "When marking a task complete, just say: Done — next instance created for Thursday."' },
          },
          required: ['rule', 'category', 'rationale', 'example'],
        },
        description: 'New rules to add (max 3)',
      },
      supersede: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ruleId: { type: 'number', description: 'ID of the rule to supersede' },
            reason: { type: 'string', description: 'Why the old rule needs replacing' },
            replacement: { type: 'string', description: 'The new, improved rule text' },
            category: { type: 'string', enum: ['communication', 'workflow', 'tone', 'task_handling'] },
            rationale: { type: 'string', description: 'Evidence supporting the change' },
            example: { type: 'string', description: 'A concrete example showing what the improved rule looks like in practice' },
          },
          required: ['ruleId', 'reason', 'replacement', 'category', 'rationale', 'example'],
        },
        description: 'Rules to supersede with improved versions (max 2)',
      },
      summary: {
        type: 'string',
        description: 'Human-readable summary of the reflection analysis',
      },
    },
    required: ['newRules', 'supersede', 'summary'],
  },
};

export interface ReflectionResult {
  success: boolean;
  rulesAdded: number;
  rulesSuperseded: number;
  summary: string;
  error?: string;
}

/**
 * Get the last evaluation ID that was reflected on.
 * Queries DB for the most recent reflection rule's timestamp.
 */
async function getLastReflectedEvalId(): Promise<number> {
  try {
    // Find the most recent reflection-sourced rule — its creation time
    // approximates when we last reflected. Use the max eval ID at that time.
    const lastReflectionRule = await db
      .select()
      .from(behaviorRules)
      .where(eq(behaviorRules.source, 'reflection'))
      .orderBy(desc(behaviorRules.createdAt))
      .limit(1);

    if (lastReflectionRule.length === 0) {
      return 0; // No reflection has ever run — reflect on everything
    }

    // Find the max eval ID that existed at the time of last reflection
    const reflectionTime = lastReflectionRule[0].createdAt;
    const maxEvalAtReflection = await db
      .select({ maxId: sql<number>`max(${conversationEvaluations.id})` })
      .from(conversationEvaluations)
      .where(sql`${conversationEvaluations.evaluatedAt} <= ${reflectionTime}`);

    return maxEvalAtReflection[0]?.maxId ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Count evaluations since last reflection.
 */
async function countNewEvaluations(): Promise<number> {
  const lastId = await getLastReflectedEvalId();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationEvaluations)
    .where(gt(conversationEvaluations.id, lastId));

  return result[0]?.count ?? 0;
}

/**
 * Check if reflection should run (10+ new evaluations since last reflection).
 */
export async function shouldReflect(): Promise<boolean> {
  try {
    const newCount = await countNewEvaluations();
    return newCount >= 10;
  } catch {
    return false;
  }
}

/**
 * Format evaluations for the reflection prompt.
 */
function formatEvaluationsForPrompt(evaluations: ConversationEvaluation[]): string {
  return evaluations.map((eval_, i) => {
    const scores = JSON.parse(eval_.scores) as Record<string, { score: number; evidence: string }>;
    const strengths = JSON.parse(eval_.strengths) as string[];
    const improvements = JSON.parse(eval_.improvements) as string[];

    const scoreLines = Object.entries(scores)
      .map(([dim, s]) => `  ${dim}: ${s.score}/10 — ${s.evidence}`)
      .join('\n');

    return `Evaluation ${i + 1} (overall: ${eval_.overall}/10, session: ${eval_.sessionId}):
Scores:
${scoreLines}
Strengths: ${strengths.join('; ')}
Improvements: ${improvements.join('; ')}`;
  }).join('\n\n');
}

/**
 * Format active rules for the reflection prompt.
 */
function formatRulesForPrompt(rules: BehaviorRule[]): string {
  if (rules.length === 0) return 'No active rules yet.';

  return rules.map(r =>
    `Rule #${r.id} [${r.category}]: "${r.rule}" (rationale: ${r.rationale || 'none'})`
  ).join('\n');
}

/**
 * Run the reflection loop — synthesize evaluations into behavioral rules.
 *
 * Fire-and-forget safe: entire function wrapped in try/catch.
 */
export async function runReflection(): Promise<ReflectionResult> {
  try {
    // Check if enough new evaluations exist
    const newCount = await countNewEvaluations();
    if (newCount < 5) {
      return {
        success: true,
        rulesAdded: 0,
        rulesSuperseded: 0,
        summary: `Skipped: only ${newCount} new evaluations (need 5+)`,
      };
    }

    // Gather data
    const evaluations = await getRecentEvaluations(20);
    const avgScores = await getAverageScores(7);
    const activeRules = await getActiveRules();

    if (evaluations.length === 0) {
      return {
        success: true,
        rulesAdded: 0,
        rulesSuperseded: 0,
        summary: 'Skipped: no evaluations found',
      };
    }

    // Build the synthesis prompt
    const evalText = formatEvaluationsForPrompt(evaluations);
    const rulesText = formatRulesForPrompt(activeRules);
    const trendText = avgScores
      ? `7-day average: ${avgScores.avgOverall.toFixed(1)}/10 across ${avgScores.count} evaluations`
      : 'No 7-day trend data available yet';

    const userMessage = `Analyze these conversation evaluations and propose behavioral rule changes.

CURRENT ACTIVE RULES (${activeRules.length}/10 max):
${rulesText}

7-DAY TREND:
${trendText}

RECENT EVALUATIONS (${evaluations.length}):
${evalText}

Based on patterns across these evaluations:
1. Propose new rules for recurring issues (max 3)
2. Propose supersessions for rules that should be refined (max 2)
3. If everything looks healthy, propose zero changes

Remember: only propose rules backed by evidence from MULTIPLE evaluations.`;

    // Call LLM for reflection (routed via provider abstraction)
    const llmResult = await callWithTools({
      component: 'reflector',
      systemPrompt: REFLECTION_SYSTEM_PROMPT,
      userMessage,
      model: MODEL_REFLECTOR,
      maxTokens: 2048,
      tool: REFLECTION_TOOL,
      toolChoice: { type: 'tool', name: 'submit_reflection' },
    });

    if (!llmResult.toolInput) {
      return { success: false, rulesAdded: 0, rulesSuperseded: 0, summary: '', error: 'No structured response from LLM' };
    }

    const result = llmResult.toolInput as {
      newRules: Array<{ rule: string; category: RuleCategory; rationale: string; example: string }>;
      supersede: Array<{ ruleId: number; reason: string; replacement: string; category: RuleCategory; rationale: string; example: string }>;
      summary: string;
    };

    // Apply guard rails
    const newRules = result.newRules.slice(0, 3);
    const supersessions = result.supersede.slice(0, 2);

    let rulesAdded = 0;
    let rulesSuperseded = 0;

    // Execute supersessions first (replace old rule with improved version)
    for (const sup of supersessions) {
      try {
        await supersedeRule(sup.ruleId);
        await addRule(sup.replacement, sup.category, 'reflection', sup.rationale, sup.example);
        rulesSuperseded++;
        console.log(`[Reflection] Superseded rule #${sup.ruleId}: ${sup.reason}`);
      } catch (err) {
        console.error(`[Reflection] Failed to supersede rule #${sup.ruleId}:`, err);
      }
    }

    // Add genuinely new rules
    for (const nr of newRules) {
      try {
        await addRule(nr.rule, nr.category, 'reflection', nr.rationale, nr.example);
        rulesAdded++;
        console.log(`[Reflection] Added rule [${nr.category}]: "${nr.rule}"`);
      } catch (err) {
        console.error(`[Reflection] Failed to add rule:`, err);
      }
    }

    // Enforce active rule cap (max 10)
    const updatedRules = await getActiveRules();
    if (updatedRules.length > 10) {
      // Supersede oldest rules beyond the cap
      const toRemove = updatedRules.slice(10); // getActiveRules returns desc by createdAt, so oldest are last
      for (const rule of toRemove) {
        await supersedeRule(rule.id);
        console.log(`[Reflection] Auto-superseded rule #${rule.id} (cap enforcement)`);
      }
    }

    console.log(
      `[Reflection] Complete: +${rulesAdded} new, ${rulesSuperseded} superseded | ${result.summary}`
    );

    return {
      success: true,
      rulesAdded,
      rulesSuperseded,
      summary: result.summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Reflection] Failed (non-blocking):', error);
    return { success: false, rulesAdded: 0, rulesSuperseded: 0, summary: '', error: errorMessage };
  }
}
