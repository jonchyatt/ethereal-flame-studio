/**
 * LLM Provider Abstraction — Provider-Agnostic Tool-Use Calls
 *
 * Wraps LLM calls for the self-improvement pipeline (evaluator, reflection,
 * meta-evaluator) so they can use any provider without code changes.
 *
 * Supports:
 * - claude-code-sdk: Free on Max subscription ($0 cost)
 * - anthropic-api: Direct API (per-token billing)
 * - ollama: Local model (future)
 *
 * Environment:
 *   JARVIS_SI_PROVIDER=claude-code-sdk              # default for all SI components
 *   JARVIS_SI_EVALUATOR_PROVIDER=anthropic-api       # optional per-component override
 *   JARVIS_SI_REFLECTOR_PROVIDER=claude-code-sdk
 *   JARVIS_SI_META_PROVIDER=claude-code-sdk
 */

import Anthropic from '@anthropic-ai/sdk';
import { query } from '@anthropic-ai/claude-code';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SIProvider = 'claude-code-sdk' | 'anthropic-api' | 'ollama';
export type SIComponent = 'evaluator' | 'reflector' | 'meta';

export interface LLMCallRequest {
  /** Which SI component is calling */
  component: SIComponent;
  /** System prompt */
  systemPrompt: string;
  /** User message */
  userMessage: string;
  /** Model override for API path (e.g., 'claude-haiku-4-5-20251001') */
  model?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Tool definition for structured output */
  tool?: Anthropic.Tool;
  /** Force tool use */
  toolChoice?: { type: 'tool'; name: string };
}

export interface LLMCallResult {
  /** Extracted tool input (if tool was provided) */
  toolInput: Record<string, unknown> | null;
  /** Raw text response (if no tool) */
  text: string | null;
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

function getProviderForComponent(component: SIComponent): SIProvider {
  // Per-component override
  const envKey = `JARVIS_SI_${component.toUpperCase()}_PROVIDER`;
  const specific = process.env[envKey]?.toLowerCase();
  if (specific === 'anthropic-api' || specific === 'api') return 'anthropic-api';
  if (specific === 'claude-code-sdk' || specific === 'sdk') return 'claude-code-sdk';
  if (specific === 'ollama') return 'ollama';

  // Global SI provider
  const global = process.env.JARVIS_SI_PROVIDER?.toLowerCase();
  if (global === 'anthropic-api' || global === 'api') return 'anthropic-api';
  if (global === 'ollama') return 'ollama';

  return 'claude-code-sdk'; // default
}

// ---------------------------------------------------------------------------
// Anthropic API path
// ---------------------------------------------------------------------------

const anthropic = new Anthropic();

async function callWithApi(request: LLMCallRequest): Promise<LLMCallResult> {
  const response = await anthropic.messages.create({
    model: request.model || 'claude-haiku-4-5-20251001',
    max_tokens: request.maxTokens || 2048,
    system: request.systemPrompt,
    messages: [{ role: 'user', content: request.userMessage }],
    ...(request.tool ? { tools: [request.tool] } : {}),
    ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
  });

  // Extract tool use result if present
  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );

  if (toolBlock) {
    return { toolInput: toolBlock.input as Record<string, unknown>, text: null };
  }

  // Extract text
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  return { toolInput: null, text };
}

// ---------------------------------------------------------------------------
// Claude Code SDK path
// ---------------------------------------------------------------------------

async function callWithSdk(request: LLMCallRequest): Promise<LLMCallResult> {
  // For the SDK path, we compose the prompt to request structured JSON output
  // since the SDK doesn't support tool_choice directly
  let prompt = `${request.systemPrompt}\n\n---\n\n${request.userMessage}`;

  if (request.tool) {
    prompt += `\n\n---\n\nIMPORTANT: Respond with a JSON object matching this schema:\n${JSON.stringify(request.tool.input_schema, null, 2)}\n\nRespond with ONLY valid JSON, no markdown fencing.`;
  }

  let resultText: string | null = null;

  const conversation = query({
    prompt,
    options: {
      cwd: process.cwd(),
      allowedTools: [],
      permissionMode: 'bypassPermissions',
    },
  });

  for await (const event of conversation) {
    if (event.type === 'result' && 'result' in event && typeof event.result === 'string') {
      resultText = event.result;
    }
  }

  if (!resultText) {
    return { toolInput: null, text: null };
  }

  // If we requested structured output, try to parse as JSON
  if (request.tool) {
    try {
      // Strip markdown code fences if present
      const cleaned = resultText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleaned);
      return { toolInput: parsed, text: null };
    } catch {
      console.warn(`[LLMProvider] Failed to parse SDK response as JSON for ${request.component}`);
      return { toolInput: null, text: resultText };
    }
  }

  return { toolInput: null, text: resultText };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call an LLM with optional tool use, routing to the configured provider.
 *
 * Usage:
 *   const result = await callWithTools({ component: 'evaluator', ... });
 *   if (result.toolInput) { /* structured output * / }
 */
export async function callWithTools(request: LLMCallRequest): Promise<LLMCallResult> {
  const provider = getProviderForComponent(request.component);
  console.log(`[LLMProvider] ${request.component} using ${provider}`);

  switch (provider) {
    case 'claude-code-sdk':
      return callWithSdk(request);

    case 'anthropic-api':
      return callWithApi(request);

    case 'ollama':
      console.warn(`[LLMProvider] Ollama not yet implemented for ${request.component}, falling back to API`);
      return callWithApi(request);

    default:
      return callWithApi(request);
  }
}
