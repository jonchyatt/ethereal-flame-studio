/**
 * Provider Router — Swappable Brain Backend
 *
 * Routes chat requests to the configured brain provider:
 * - claude-code-sdk: Free on Max subscription, Opus 4.6, agent capabilities
 * - anthropic-api: Direct API (sdkBrain.ts), per-token billing, Haiku/Sonnet
 * - ollama: Local model (future)
 *
 * Environment:
 *   JARVIS_BRAIN_PROVIDER=claude-code-sdk  (default)
 *   Options: claude-code-sdk | anthropic-api | ollama
 */

import { think as thinkApi, type BrainRequest, type BrainResult } from './sdkBrain';
import { thinkWithSdk, type CCodeBrainRequest } from './ccodeBrain';
import type { ChatMessage, ProcessChatOptions } from './chatProcessor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrainProvider = 'claude-code-sdk' | 'anthropic-api' | 'ollama';

export interface RouterRequest {
  systemPrompt: string;
  messages: ChatMessage[];
  /** Tool executor for API path */
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  /** Tools for API path */
  tools: import('./tools').ToolDefinition[];
  /** Use deeper model (API path only) */
  useDeepModel?: boolean;
  /** Claude Code SDK session ID for resumption */
  sdkSessionId?: string;
  /** SSE callbacks */
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string) => void;
  /** Post-tool hook for API path */
  onPostToolResult?: (name: string, input: Record<string, unknown>, result: string) => Promise<void>;
}

export interface RouterResult {
  success: boolean;
  responseText: string;
  error?: string;
  toolsUsed: string[];
  /** SDK session ID for resumption (only from claude-code-sdk) */
  sdkSessionId?: string;
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

export function getBrainProvider(): BrainProvider {
  const env = process.env.JARVIS_BRAIN_PROVIDER?.toLowerCase();
  if (env === 'anthropic-api' || env === 'api') return 'anthropic-api';
  if (env === 'ollama') return 'ollama';
  return 'anthropic-api'; // default: safe for Vercel serverless (PM2 sets sdk explicitly)
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function routeToProvider(request: RouterRequest): Promise<RouterResult> {
  const provider = getBrainProvider();
  console.log(`[Router] Using provider: ${provider}`);

  switch (provider) {
    case 'claude-code-sdk':
      return routeToCCodeSdk(request);

    case 'anthropic-api':
      return routeToApi(request);

    case 'ollama':
      // Future: route to local Ollama
      console.warn('[Router] Ollama not yet implemented, falling back to API');
      return routeToApi(request);

    default:
      return routeToApi(request);
  }
}

// ---------------------------------------------------------------------------
// Claude Code SDK path
// ---------------------------------------------------------------------------

async function routeToCCodeSdk(request: RouterRequest): Promise<RouterResult> {
  // Extract user message from the messages array
  const lastUserMsg = request.messages[request.messages.length - 1];
  if (!lastUserMsg || lastUserMsg.role !== 'user') {
    return {
      success: false,
      responseText: 'No user message found.',
      toolsUsed: [],
    };
  }

  const result = await thinkWithSdk({
    systemPrompt: request.systemPrompt,
    userMessage: lastUserMsg.content,
    sessionId: request.sdkSessionId,
    onToolUse: request.onToolUse,
    onToolResult: request.onToolResult,
  });

  return {
    success: result.success,
    responseText: result.responseText,
    error: result.error,
    toolsUsed: result.toolsUsed,
    sdkSessionId: result.sessionId,
  };
}

// ---------------------------------------------------------------------------
// Anthropic API path (existing sdkBrain.ts)
// ---------------------------------------------------------------------------

async function routeToApi(request: RouterRequest): Promise<RouterResult> {
  const apiRequest: BrainRequest = {
    systemPrompt: request.systemPrompt,
    messages: request.messages.map(m => ({ role: m.role, content: m.content })),
    tools: request.tools,
    executeTool: request.executeTool,
    useDeepModel: request.useDeepModel,
    onToolUse: request.onToolUse,
    onToolResult: request.onToolResult,
    onPostToolResult: request.onPostToolResult,
  };

  const result = await thinkApi(apiRequest);

  return {
    success: result.success,
    responseText: result.responseText,
    error: result.error,
    toolsUsed: result.toolsUsed,
  };
}
