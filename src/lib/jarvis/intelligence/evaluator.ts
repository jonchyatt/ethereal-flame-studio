/**
 * Conversation Evaluator — Self-Improvement Critic (Phase D)
 *
 * After each substantive conversation, evaluates Jarvis's performance
 * on 5 dimensions adapted from Agent Zero's proven rubric.
 *
 * Uses Haiku (cheap, fast) to evaluate. Fire-and-forget — errors
 * are logged but never affect the user's experience.
 *
 * Dimensions:
 * - Completeness: Did Jarvis fully address the request?
 * - Accuracy: Were statements and tool results correct?
 * - Efficiency: Minimal unnecessary steps or tool calls?
 * - Tone: Matched personality (concise, warm, not servile)?
 * - Satisfaction: Proxy signals from user response
 */

import Anthropic from '@anthropic-ai/sdk';
import { storeEvaluation, type EvaluationScores } from '../memory/queries/evaluations';
import { getActiveRules } from '../memory/queries/behaviorRules';
import type { ChatMessage } from './chatProcessor';

const MODEL_CRITIC = 'claude-haiku-4-5-20251001';
const anthropic = new Anthropic();

const CRITIC_SYSTEM_PROMPT = `You are a conversation quality critic. Evaluate the assistant's performance in this conversation.

Score each dimension 0-10. Every score MUST include specific evidence (a quote or description from the conversation).

Dimensions:
- completeness: Did the assistant fully address the user's request? Were all parts handled?
- accuracy: Were statements, tool results, and recommendations correct?
- efficiency: Did the assistant reach the solution without unnecessary steps, redundant tool calls, or over-explaining?
- tone: Was communication concise, warm, and direct? Not servile ("Sure thing!"), not verbose, not ending with unnecessary questions?
- satisfaction: Proxy signals — did the user accept the result, proceed with their day, express thanks? Or did they correct, re-ask, or express frustration?

Rules:
- A score without evidence is invalid
- Be honest — don't inflate scores
- Skip trivial conversations (greetings, single-word exchanges) by returning skipped=true
- Focus on actionable improvements, not vague suggestions`;

const EVALUATION_TOOL: Anthropic.Tool = {
  name: 'submit_evaluation',
  description: 'Submit the structured conversation evaluation',
  input_schema: {
    type: 'object' as const,
    properties: {
      skipped: {
        type: 'boolean',
        description: 'True if conversation is too trivial to evaluate',
      },
      skip_reason: {
        type: 'string',
        description: 'Why the conversation was skipped (if skipped=true)',
      },
      scores: {
        type: 'object',
        properties: {
          completeness: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-10' },
              evidence: { type: 'string' },
            },
            required: ['score', 'evidence'],
          },
          accuracy: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-10' },
              evidence: { type: 'string' },
            },
            required: ['score', 'evidence'],
          },
          efficiency: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-10' },
              evidence: { type: 'string' },
            },
            required: ['score', 'evidence'],
          },
          tone: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-10' },
              evidence: { type: 'string' },
            },
            required: ['score', 'evidence'],
          },
          satisfaction: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-10' },
              evidence: { type: 'string' },
            },
            required: ['score', 'evidence'],
          },
        },
        required: ['completeness', 'accuracy', 'efficiency', 'tone', 'satisfaction'],
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Top 1-3 things the assistant did well',
      },
      improvements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Top 1-3 actionable improvements',
      },
    },
    required: ['skipped'],
  },
};

/**
 * Evaluate a conversation using Haiku as critic.
 *
 * Fire-and-forget: entire function is wrapped in try/catch.
 * Errors are logged, never thrown.
 */
export async function evaluateConversation(
  sessionId: number,
  messages: ChatMessage[],
  toolsUsed?: string[]
): Promise<void> {
  try {
    // Skip short conversations (< 3 messages = too little to evaluate)
    if (messages.length < 3) {
      console.log(`[Evaluator] Skipping session ${sessionId}: only ${messages.length} messages`);
      return;
    }

    // Snapshot which behavioral rules were active during this conversation.
    // This enables causality tracking: "Did Rule #7 actually improve scores?"
    const activeRules = await getActiveRules().catch(() => []);
    const activeRuleIds = activeRules.map(r => r.id);

    // Format conversation for the critic
    const transcript = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Include tool usage context so the critic can score efficiency accurately
    const toolContext = toolsUsed && toolsUsed.length > 0
      ? `\n\nTOOLS USED (${toolsUsed.length} calls): ${toolsUsed.join(', ')}`
      : '';

    // Teaching-enriched evaluation: when Academy tools were used, add teaching-specific criteria
    const academyToolsUsed = toolsUsed?.filter(t => t.startsWith('academy_')) || [];
    const teachingContext = academyToolsUsed.length > 0
      ? `\n\nTEACHING CONTEXT: This was a teaching conversation using Academy tools (${academyToolsUsed.join(', ')}). In addition to the standard 5 dimensions, consider teaching quality: Was the explanation anchored in real code before abstractions? Was the pace appropriate? Did the teacher verify understanding before advancing? Were aha moments created from complexity?`
      : '';

    const response = await anthropic.messages.create({
      model: MODEL_CRITIC,
      max_tokens: 1024,
      system: CRITIC_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Evaluate this conversation:\n\n${transcript}${toolContext}${teachingContext}`,
      }],
      tools: [EVALUATION_TOOL],
      tool_choice: { type: 'tool', name: 'submit_evaluation' },
    });

    // Extract tool use result
    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    if (!toolBlock) {
      console.warn('[Evaluator] No tool_use block in response');
      return;
    }

    const result = toolBlock.input as {
      skipped?: boolean;
      skip_reason?: string;
      scores?: EvaluationScores;
      strengths?: string[];
      improvements?: string[];
    };

    if (result.skipped) {
      console.log(`[Evaluator] Skipped session ${sessionId}: ${result.skip_reason || 'trivial'}`);
      return;
    }

    if (!result.scores || !result.strengths || !result.improvements) {
      console.warn('[Evaluator] Incomplete evaluation result');
      return;
    }

    // Calculate overall score (average of 5 dimensions, clamped to 0-10)
    const scores = result.scores;
    const clamp = (n: number) => Math.max(0, Math.min(10, Number(n) || 0));
    scores.completeness.score = clamp(scores.completeness.score);
    scores.accuracy.score = clamp(scores.accuracy.score);
    scores.efficiency.score = clamp(scores.efficiency.score);
    scores.tone.score = clamp(scores.tone.score);
    scores.satisfaction.score = clamp(scores.satisfaction.score);

    const overall = (
      scores.completeness.score +
      scores.accuracy.score +
      scores.efficiency.score +
      scores.tone.score +
      scores.satisfaction.score
    ) / 5;

    // Store evaluation with active rule snapshot for causality tracking
    await storeEvaluation(
      sessionId,
      scores,
      overall,
      result.strengths,
      result.improvements,
      MODEL_CRITIC,
      activeRuleIds.length > 0 ? activeRuleIds : undefined
    );

    console.log(
      `[Evaluator] Session ${sessionId} scored ${overall.toFixed(1)}/10` +
      ` | C:${scores.completeness.score} A:${scores.accuracy.score}` +
      ` E:${scores.efficiency.score} T:${scores.tone.score} S:${scores.satisfaction.score}`
    );
  } catch (error) {
    // Fire-and-forget: never throw, only log
    console.error('[Evaluator] Evaluation failed (non-blocking):', error);
  }
}
