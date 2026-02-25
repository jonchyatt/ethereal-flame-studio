/**
 * Chat Processor — Orchestrator Layer
 *
 * v4.0: Delegates tool execution to sdkBrain.ts (the new brain module).
 * This file remains the orchestrator responsible for:
 * - Agent Zero routing (Gem #8: complex query detection)
 * - Tool executor routing (3-way: Notion/Memory/Tutorial)
 * - Fire-and-forget message persistence
 * - Summarization triggers
 *
 * Routing:
 * - Simple CRUD → sdkBrain (Claude Haiku with tools)
 * - Complex reasoning → Agent Zero first, fallback to sdkBrain (Claude Sonnet)
 * - Agent Zero down → sdkBrain with deep model
 *
 * Used by both:
 * - Web SSE route (with streaming callbacks)
 * - Telegram webhook (final text only)
 */

import { think } from './sdkBrain';
import { notionTools, memoryTools } from './tools';
import { tutorialTools } from '../tutorial/tutorialTools';
import { executeNotionTool } from '../notion/toolExecutor';
import { executeMemoryTool } from '../memory/toolExecutor';
import { executeTutorialTool } from '../tutorial/toolExecutor';
import { handleRecurringTaskCompletion } from '../notion/recurringHook';
import { saveMessage, getSessionMessageCount } from '../memory/queries/messages';
import { triggerSummarization } from '../memory/summarization';
import { getJarvisConfig } from '../config';
import { sendMessage as sendToAgentZero, getStatus as getAgentZeroStatus } from '../agentZero/client';

const allTools = [...notionTools, ...memoryTools, ...tutorialTools];

// Local-only tools (memory, tutorial) — these are always executed locally even when MCP is enabled
const localOnlyTools = [...memoryTools, ...tutorialTools];

// Tool name sets for routing
const memoryToolNames = new Set([
  'remember_fact',
  'forget_fact',
  'list_memories',
  'delete_all_memories',
  'restore_memory',
  'observe_pattern',
  'query_audit_log',
]);

const tutorialToolNames = new Set([
  'start_tutorial',
  'teach_topic',
  'continue_tutorial',
  'skip_tutorial_module',
  'get_tutorial_progress',
  'get_quick_reference',
  'get_curriculum_status',
  'start_lesson',
  'complete_lesson',
]);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProcessChatOptions {
  sessionId: number;
  systemPrompt: string;
  messages: ChatMessage[];
  /** Called when a tool is invoked (for SSE streaming) */
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  /** Called when a tool returns a result (for SSE streaming) */
  onToolResult?: (toolName: string, result: string) => void;
}

export interface ProcessChatResult {
  success: boolean;
  responseText: string;
  error?: string;
  toolsUsed: string[];
}

/**
 * Patterns that suggest complex multi-step reasoning best handled by Agent Zero.
 * Simple CRUD (show tasks, create task, mark done) stays with Claude Haiku.
 *
 * Gem #8: Complex query routing
 */
const COMPLEX_REASONING_PATTERNS = [
  /reorgani[sz]e/i,
  /analy[sz]e/i,
  /plan\s+(my|the)\s+(week|month|day)/i,
  /what\s+should\s+i\s+(focus|prioriti[sz]e)/i,
  /review\s+(my|the)\s+(week|month|progress)/i,
  /spending\s+(trend|pattern|analysis)/i,
  /suggest\s+(a\s+)?(plan|schedule|routine)/i,
  /how\s+(can|should)\s+i\s+(improve|optimize)/i,
  /compare\s+(my|the)/i,
  /trend/i,
  /correlation/i,
  /pattern\s+in\s+my/i,
];

function isComplexQuery(text: string): boolean {
  return COMPLEX_REASONING_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Route a tool call to the correct executor.
 *
 * 3-way routing preserves existing tool execution logic:
 * - Tutorial tools → executeTutorialTool
 * - Memory tools → executeMemoryTool (with sessionId for audit logging)
 * - Everything else → executeNotionTool (with sessionId for audit logging)
 */
function createToolExecutor(sessionId: number) {
  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    if (tutorialToolNames.has(name)) {
      const tutorialResult = await executeTutorialTool(name, input);
      return tutorialResult.content || tutorialResult.error || 'Tutorial operation completed';
    }

    if (memoryToolNames.has(name)) {
      return executeMemoryTool(name, input, sessionId);
    }

    return executeNotionTool(name, input, sessionId);
  };
}

/**
 * Post-tool-result hook for intelligence gem relocation.
 *
 * Fires after every tool result (MCP or local). Detects:
 * - Task completion → checks for recurring frequency → creates next instance (Gem #13)
 *
 * Fire-and-forget: errors are logged, never block the response.
 */
function createPostToolHook(sessionId: number) {
  return async (name: string, input: Record<string, unknown>, result: string): Promise<void> => {
    // Detect task completion patterns
    // Local path: complete_task tool was called directly
    // MCP path: result contains completion indicators
    const isTaskCompletion =
      name === 'complete_task' ||
      (name === 'mcp_notion_result' && /completed|done|checked off/i.test(result));

    if (!isTaskCompletion) return;

    // Extract task ID from input (local) or result (MCP)
    const taskId = (input.task_id as string) || (input.page_id as string) || null;

    if (taskId) {
      console.log(`[PostHook] Task completion detected (${name}), checking recurrence for ${taskId}`);
      const hookResult = await handleRecurringTaskCompletion(taskId);
      if (hookResult) {
        console.log(`[PostHook] Session ${sessionId}: ${hookResult}`);
      }
    }
  };
}

/**
 * Process a chat message with intelligent routing.
 *
 * Routing:
 * 1. Complex reasoning → try Agent Zero first
 * 2. Agent Zero down or simple query → sdkBrain with tools
 */
export async function processChatMessage(options: ProcessChatOptions): Promise<ProcessChatResult> {
  const { sessionId, systemPrompt, messages, onToolUse, onToolResult } = options;
  const config = getJarvisConfig();

  // Persist user message (fire-and-forget — Gem: async persistence)
  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.role === 'user') {
    saveMessage(sessionId, 'user', lastUserMsg.content).catch(err =>
      console.error('[ChatProcessor] Failed to save user message:', err)
    );
  }

  // Route complex queries to Agent Zero if available (Gem #8)
  const isComplex = lastUserMsg?.role === 'user' && isComplexQuery(lastUserMsg.content);

  if (isComplex) {
    console.log('[ChatProcessor] Complex query detected, trying Agent Zero');
    onToolUse?.('agent_zero_reasoning', { query: lastUserMsg.content });

    const a0Status = await getAgentZeroStatus();
    if (a0Status.available) {
      const a0Result = await sendToAgentZero(lastUserMsg.content, { sessionId });
      onToolResult?.('agent_zero_reasoning', a0Result.message || '');

      if (a0Result.success && a0Result.message) {
        saveMessage(sessionId, 'assistant', a0Result.message).catch(() => {});
        return {
          success: true,
          responseText: a0Result.message,
          toolsUsed: ['agent_zero_reasoning'],
        };
      }
      console.warn('[ChatProcessor] Agent Zero failed, falling back to deep model');
    } else {
      console.log('[ChatProcessor] Agent Zero unavailable, using deep model');
      onToolResult?.('agent_zero_reasoning', 'Agent Zero unavailable, using local reasoning');
    }
  }

  try {
    // When MCP is enabled, only pass local tools (memory/tutorial) — Notion tools come from MCP
    const toolsForBrain = config.enableMcpConnector && config.notionOAuthToken
      ? localOnlyTools
      : allTools;

    // Delegate to sdkBrain for tool execution
    const result = await think({
      systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tools: toolsForBrain,
      executeTool: createToolExecutor(sessionId),
      useDeepModel: isComplex, // Complex queries get Sonnet when A0 is down
      onToolUse,
      onToolResult,
      onPostToolResult: createPostToolHook(sessionId),
    });

    // Persist assistant message + trigger summarization (fire-and-forget)
    if (result.responseText) {
      saveMessage(sessionId, 'assistant', result.responseText).catch(() => {});
      if (config.enableMemoryLoading) {
        getSessionMessageCount(sessionId).then(count => {
          if (count >= 20) {
            console.log(`[ChatProcessor] Session ${count} msgs, triggering summarization`);
            triggerSummarization(sessionId).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    return {
      success: result.success,
      responseText: result.responseText,
      error: result.error,
      toolsUsed: result.toolsUsed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ChatProcessor] Error:', error);
    return { success: false, responseText: '', error: errorMessage, toolsUsed: [] };
  }
}
