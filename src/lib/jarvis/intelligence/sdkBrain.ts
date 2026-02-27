/**
 * SDK Brain — Jarvis v4.0 Tool Execution Engine
 *
 * Replaces the inline tool loop in chatProcessor.ts with a dedicated module.
 * Uses @anthropic-ai/sdk with multi-model routing and structured tool execution.
 *
 * Architecture (Option B — Anthropic API + MCP Connector):
 * - When MCP enabled: Notion tools via MCP Connector, local tools (memory, tutorial, panel) executed locally
 * - When MCP disabled: All tools executed locally via existing executors (Phase B behavior)
 * - Multi-model: Haiku for simple CRUD, configurable upgrade for complex reasoning
 * - Post-tool-result hook system for intelligence gem relocation (recurring tasks, etc.)
 *
 * What this replaces:
 * - The while(iteration < MAX_TOOL_ITERATIONS) loop in chatProcessor.ts
 * - Direct anthropic.messages.create() calls
 *
 * What this preserves:
 * - Parallel tool execution via Promise.all
 * - 3-way tool routing (Notion/Memory/Tutorial)
 * - SSE streaming callbacks (onToolUse, onToolResult)
 * - withRetry wrapper with error classification
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Beta } from '@anthropic-ai/sdk/resources/beta/beta';
import { withRetry } from '../resilience/withRetry';
import { getJarvisConfig } from '../config';
import type { ToolDefinition } from './tools';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum tool loop iterations before giving up */
const MAX_TOOL_ITERATIONS = 5;

/** Default model for simple CRUD operations */
const MODEL_FAST = 'claude-haiku-4-5-20251001';

/** Model for complex reasoning (when Agent Zero unavailable) */
const MODEL_DEEP = 'claude-sonnet-4-5-20250514';

/** MCP Connector beta feature flag */
const MCP_BETA: Beta.AnthropicBeta = 'mcp-client-2025-04-04';

/** Shared Anthropic client */
const anthropic = new Anthropic();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainRequest {
  /** System prompt (already assembled with personality, memory, etc.) */
  systemPrompt: string;
  /** Conversation messages */
  messages: Anthropic.MessageParam[];
  /** Available tool definitions */
  tools: ToolDefinition[];
  /** Execute a tool by name, return result string */
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  /** Use the deeper model for this request */
  useDeepModel?: boolean;
  /** Max tokens for response (default 4096) */
  maxTokens?: number;
  /** SSE callback: tool invocation started */
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  /** SSE callback: tool returned result */
  onToolResult?: (toolName: string, result: string) => void;
  /** Post-tool-result hook — fire-and-forget for intelligence gems (recurring tasks, etc.) */
  onPostToolResult?: (name: string, input: Record<string, unknown>, result: string) => Promise<void>;
}

export interface BrainResult {
  success: boolean;
  responseText: string;
  error?: string;
  toolsUsed: string[];
  model: string;
  iterations: number;
}

// ---------------------------------------------------------------------------
// MCP Connector Types (from beta API)
// ---------------------------------------------------------------------------

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaContentBlock = Anthropic.Beta.Messages.BetaContentBlock;
type BetaToolUseBlock = Anthropic.Beta.Messages.BetaToolUseBlock;
type BetaMCPToolResultBlock = Anthropic.Beta.Messages.BetaMCPToolResultBlock;
type BetaTextBlock = Anthropic.Beta.Messages.BetaTextBlock;

// ---------------------------------------------------------------------------
// Core — Standard Path (MCP off)
// ---------------------------------------------------------------------------

/**
 * Execute a chat turn with tool loop — standard local-tool-only path.
 * Identical to Phase B behavior.
 */
async function thinkLocal(request: BrainRequest): Promise<BrainResult> {
  const {
    systemPrompt,
    messages,
    tools,
    executeTool,
    useDeepModel = false,
    maxTokens = 4096,
    onToolUse,
    onToolResult,
    onPostToolResult,
  } = request;

  const model = useDeepModel ? MODEL_DEEP : MODEL_FAST;
  const toolsUsed: string[] = [];
  const claudeMessages: Anthropic.MessageParam[] = [...messages];

  let iteration = 0;
  let finalResponse: Anthropic.Message | null = null;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;
    console.log(`[Brain] Iteration ${iteration}, model: ${model}`);

    const response = await withRetry(
      () => anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: claudeMessages,
        tools: tools as Anthropic.Tool[],
      }),
      'claude',
      { maxAttempts: 2, initialDelayMs: 1000, maxDelayMs: 5000 }
    );

    console.log(`[Brain] stop_reason: ${response.stop_reason}`);

    if (response.stop_reason !== 'tool_use') {
      finalResponse = response;
      break;
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) {
      finalResponse = response;
      break;
    }

    console.log(`[Brain] Executing ${toolUseBlocks.length} tool(s)`);

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        toolsUsed.push(toolUse.name);
        console.log(`[Brain] Tool: ${toolUse.name}`, toolUse.input);
        onToolUse?.(toolUse.name, toolUse.input as Record<string, unknown>);

        let result: string;
        try {
          result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Tool execution failed';
          console.error(`[Brain] Tool ${toolUse.name} failed:`, err);
          result = `Error: ${msg}`;
        }

        onToolResult?.(toolUse.name, result);

        // Fire post-hook (fire-and-forget — never blocks the response)
        if (onPostToolResult) {
          onPostToolResult(toolUse.name, toolUse.input as Record<string, unknown>, result)
            .catch(err => console.error(`[Brain] Post-hook error for ${toolUse.name}:`, err));
        }

        return {
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      })
    );

    claudeMessages.push({ role: 'assistant', content: response.content });
    claudeMessages.push({ role: 'user', content: toolResults });
  }

  if (!finalResponse) {
    console.warn(`[Brain] Hit max iterations (${MAX_TOOL_ITERATIONS})`);
    return {
      success: false,
      responseText: 'I got a bit lost in my tools. Let me try a simpler approach.',
      toolsUsed,
      model,
      iterations: iteration,
    };
  }

  const responseText = finalResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  return { success: true, responseText, toolsUsed, model, iterations: iteration };
}

// ---------------------------------------------------------------------------
// Core — MCP Connector Path (Notion via MCP + local tools for memory/tutorial)
// ---------------------------------------------------------------------------

/**
 * Extract text from a BetaMCPToolResultBlock content field.
 */
function extractMcpResultText(content: string | BetaTextBlock[]): string {
  if (typeof content === 'string') return content;
  return content.map(b => b.text).join('');
}

/**
 * Execute a chat turn with MCP Connector for Notion + local tools for memory/tutorial/panel.
 *
 * Claude handles Notion tools natively via MCP — we only execute local tools ourselves.
 * MCP tool_use and tool_result blocks are handled automatically by the API.
 */
async function thinkWithMcp(request: BrainRequest): Promise<BrainResult> {
  const {
    systemPrompt,
    messages,
    tools,
    executeTool,
    useDeepModel = false,
    maxTokens = 4096,
    onToolUse,
    onToolResult,
    onPostToolResult,
  } = request;

  const config = getJarvisConfig();
  const model = useDeepModel ? MODEL_DEEP : MODEL_FAST;
  const toolsUsed: string[] = [];
  const claudeMessages: Anthropic.Beta.Messages.BetaMessageParam[] =
    messages.map(m => ({ role: m.role, content: m.content as string }));

  let iteration = 0;
  let finalResponse: BetaMessage | null = null;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;
    console.log(`[Brain/MCP] Iteration ${iteration}, model: ${model}`);

    const response = await withRetry(
      () => anthropic.beta.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: claudeMessages,
        tools: tools as Anthropic.Beta.Messages.BetaTool[],
        mcp_servers: [{
          type: 'url',
          url: config.notionMcpUrl,
          name: 'notion',
          authorization_token: config.notionOAuthToken,
        }],
        betas: [MCP_BETA],
      }),
      'claude',
      { maxAttempts: 2, initialDelayMs: 1000, maxDelayMs: 5000 }
    );

    console.log(`[Brain/MCP] stop_reason: ${response.stop_reason}`);

    // Check for MCP tool results in the response (Notion tools handled server-side)
    const mcpResults = response.content.filter(
      (block): block is BetaMCPToolResultBlock => block.type === 'mcp_tool_result'
    );
    for (const mcpResult of mcpResults) {
      const resultText = extractMcpResultText(mcpResult.content);
      toolsUsed.push(`mcp:${mcpResult.tool_use_id}`);
      onToolResult?.(`mcp_notion`, resultText);

      // Fire post-hook for MCP results too (for recurring task detection)
      if (onPostToolResult) {
        onPostToolResult('mcp_notion_result', {}, resultText)
          .catch(err => console.error(`[Brain/MCP] Post-hook error:`, err));
      }
    }

    // No tool use — final response
    if (response.stop_reason !== 'tool_use') {
      finalResponse = response;
      break;
    }

    // Extract LOCAL tool use blocks (type 'tool_use', not 'mcp_tool_use')
    const localToolBlocks = response.content.filter(
      (block): block is BetaToolUseBlock => block.type === 'tool_use'
    );

    if (localToolBlocks.length === 0) {
      finalResponse = response;
      break;
    }

    console.log(`[Brain/MCP] Executing ${localToolBlocks.length} local tool(s)`);

    // Execute local tools (memory, tutorial, panel)
    const toolResults = await Promise.all(
      localToolBlocks.map(async (toolUse) => {
        toolsUsed.push(toolUse.name);
        console.log(`[Brain/MCP] Local tool: ${toolUse.name}`, toolUse.input);
        onToolUse?.(toolUse.name, toolUse.input as Record<string, unknown>);

        let result: string;
        try {
          result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Tool execution failed';
          console.error(`[Brain/MCP] Local tool ${toolUse.name} failed:`, err);
          result = `Error: ${msg}`;
        }

        onToolResult?.(toolUse.name, result);

        if (onPostToolResult) {
          onPostToolResult(toolUse.name, toolUse.input as Record<string, unknown>, result)
            .catch(err => console.error(`[Brain/MCP] Post-hook error for ${toolUse.name}:`, err));
        }

        return {
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      })
    );

    // Feed results back — include full assistant content (MCP blocks + local tool_use)
    claudeMessages.push({
      role: 'assistant',
      content: response.content as Anthropic.Beta.Messages.BetaContentBlockParam[],
    });
    claudeMessages.push({
      role: 'user',
      content: toolResults,
    });
  }

  if (!finalResponse) {
    console.warn(`[Brain/MCP] Hit max iterations (${MAX_TOOL_ITERATIONS})`);
    return {
      success: false,
      responseText: 'I got a bit lost in my tools. Let me try a simpler approach.',
      toolsUsed,
      model,
      iterations: iteration,
    };
  }

  // Extract text from beta response
  const responseText = finalResponse.content
    .filter((b): b is BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  return { success: true, responseText, toolsUsed, model, iterations: iteration };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a chat turn with tool loop.
 *
 * Routes to MCP Connector path or standard local path based on config.
 *
 * The caller (chatProcessor) is responsible for:
 * - Building the system prompt (with personality, memory, preferences)
 * - Assembling the message history
 * - Agent Zero routing (complex queries)
 * - Fire-and-forget persistence
 * - Summarization triggers
 */
export async function think(request: BrainRequest): Promise<BrainResult> {
  const config = getJarvisConfig();

  // MCP path: Notion tools via MCP Connector, local tools still executed locally
  if (config.enableMcpConnector && config.notionOAuthToken) {
    console.log('[Brain] MCP Connector enabled — Notion tools via MCP');
    return thinkWithMcp(request);
  }

  // Standard path: all tools executed locally (Phase B behavior)
  return thinkLocal(request);
}
