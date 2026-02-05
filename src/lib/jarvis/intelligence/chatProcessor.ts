/**
 * Chat Processor - Core Claude Tool Execution Loop
 *
 * Extracted from chat/route.ts for reuse by both:
 * - Web SSE route (with streaming callbacks)
 * - Telegram webhook (final text only)
 *
 * Phase 15: Telegram Control
 */

import Anthropic from '@anthropic-ai/sdk';
import { notionTools, memoryTools } from './tools';
import { tutorialTools } from '../tutorial/tutorialTools';
import { executeNotionTool } from '../notion/toolExecutor';
import { executeMemoryTool } from '../memory/toolExecutor';
import { executeTutorialTool } from '../tutorial/toolExecutor';
import { withRetry } from '../resilience/withRetry';
import { saveMessage, getSessionMessageCount } from '../memory/queries/messages';
import { triggerSummarization } from '../memory/summarization';
import { getJarvisConfig } from '../config';

const anthropic = new Anthropic();
const MAX_TOOL_ITERATIONS = 5;
const allTools = [...notionTools, ...memoryTools, ...tutorialTools];

// Tool name sets for routing
const memoryToolNames = [
  'remember_fact',
  'forget_fact',
  'list_memories',
  'delete_all_memories',
  'restore_memory',
  'observe_pattern',
  'query_audit_log',
];

const tutorialToolNames = [
  'start_tutorial',
  'teach_topic',
  'continue_tutorial',
  'skip_tutorial_module',
  'get_tutorial_progress',
  'get_quick_reference',
  'get_curriculum_status',
  'start_lesson',
  'complete_lesson',
];

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
 * Process a chat message through Claude with full tool execution loop.
 * Returns the final text response after all tool iterations.
 *
 * Used by both:
 * - Web SSE route (with onToolUse/onToolResult callbacks for streaming)
 * - Telegram webhook (no callbacks, just final text)
 */
export async function processChatMessage(options: ProcessChatOptions): Promise<ProcessChatResult> {
  const { sessionId, systemPrompt, messages, onToolUse, onToolResult } = options;
  const config = getJarvisConfig();
  const toolsUsed: string[] = [];

  try {
    const claudeMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Persist user message (fire-and-forget)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      saveMessage(sessionId, 'user', lastUserMsg.content).catch(err =>
        console.error('[ChatProcessor] Failed to save user message:', err)
      );
    }

    // Tool execution loop
    let iteration = 0;
    let finalResponse: Anthropic.Message | null = null;

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;
      console.log(`[ChatProcessor] Tool loop iteration ${iteration}`);

      // Call Claude with retry (Phase 14)
      const response = await withRetry(
        () => anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: claudeMessages,
          tools: allTools,
        }),
        'claude',
        { maxAttempts: 2, initialDelayMs: 1000, maxDelayMs: 5000 }
      );

      console.log(`[ChatProcessor] Response stop_reason: ${response.stop_reason}`);

      // If no tool use, we're done
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

      console.log(`[ChatProcessor] Executing ${toolUseBlocks.length} tool(s)`);

      // Execute tools in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          toolsUsed.push(toolUse.name);
          console.log(`[ChatProcessor] Executing tool: ${toolUse.name}`, toolUse.input);
          onToolUse?.(toolUse.name, toolUse.input as Record<string, unknown>);

          let result: string;
          if (tutorialToolNames.includes(toolUse.name)) {
            const tutorialResult = await executeTutorialTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>
            );
            result = tutorialResult.content || tutorialResult.error || 'Tutorial operation completed';
          } else if (memoryToolNames.includes(toolUse.name)) {
            result = await executeMemoryTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              sessionId
            );
          } else {
            result = await executeNotionTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              sessionId
            );
          }

          onToolResult?.(toolUse.name, result);

          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        })
      );

      // Add to message history for next iteration
      claudeMessages.push({ role: 'assistant', content: response.content });
      claudeMessages.push({ role: 'user', content: toolResults });
    }

    if (!finalResponse) {
      console.warn(`[ChatProcessor] Hit max tool iterations (${MAX_TOOL_ITERATIONS})`);
      return {
        success: false,
        responseText: 'I got a bit lost in my tools. Let me try a simpler approach.',
        toolsUsed,
      };
    }

    const assistantText = finalResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Persist assistant message + trigger summarization (fire-and-forget)
    if (assistantText) {
      saveMessage(sessionId, 'assistant', assistantText).catch(() => {});
      if (config.enableMemoryLoading) {
        getSessionMessageCount(sessionId).then(count => {
          if (count >= 20) {
            console.log(`[ChatProcessor] Session ${count} msgs, triggering summarization`);
            triggerSummarization(sessionId).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    return { success: true, responseText: assistantText, toolsUsed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ChatProcessor] Error:', error);
    return { success: false, responseText: '', error: errorMessage, toolsUsed };
  }
}
