/**
 * Claude Chat API Route
 *
 * SSE streaming proxy to Claude API with tool execution loop.
 * Executes Notion tools via MCP, Memory tools via local DB, and Tutorial tools via TutorialManager.
 */

import Anthropic from '@anthropic-ai/sdk';
import { notionTools, memoryTools } from '@/lib/jarvis/intelligence/tools';
import { tutorialTools } from '@/lib/jarvis/tutorial/tutorialTools';
import { executeNotionTool } from '@/lib/jarvis/notion/toolExecutor';
import { executeMemoryTool } from '@/lib/jarvis/memory/toolExecutor';
import { executeTutorialTool, isTutorialTool } from '@/lib/jarvis/tutorial/toolExecutor';
import { getTutorialManager } from '@/lib/jarvis/tutorial/TutorialManager';
import { getJarvisConfig } from '@/lib/jarvis/config';
import {
  retrieveMemories,
  formatMemoriesForPrompt,
  getProactiveSurfacing,
  formatProactiveSurfacing,
  getEntriesByCategory,
} from '@/lib/jarvis/memory';
import { getOrCreateSession } from '@/lib/jarvis/memory/queries/sessions';
import { buildSystemPrompt } from '@/lib/jarvis/intelligence/systemPrompt';
import { saveMessage, loadConversationHistory, getSessionMessageCount } from '@/lib/jarvis/memory/queries/messages';
import { triggerSummarization, backfillSummarization } from '@/lib/jarvis/memory/summarization';

// Instantiate client - reads ANTHROPIC_API_KEY from environment automatically
const anthropic = new Anthropic();

// Maximum tool execution iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5;

// Context window monitoring (GUARD-05)
// Claude 3.5 Haiku context: 200K tokens, but we're conservative
const MAX_CONTEXT_TOKENS = 100_000;  // Conservative limit
const WARN_THRESHOLD_PERCENT = 80;
const CHARS_PER_TOKEN = 4;  // Per STATE.md decision

// Combine all tools for Claude
const allTools = [...notionTools, ...memoryTools, ...tutorialTools];

// Memory tool names for routing
const memoryToolNames = [
  'remember_fact',
  'forget_fact',
  'list_memories',
  'delete_all_memories',
  'restore_memory',
  'observe_pattern',
  'query_audit_log',
];

// Tutorial tool names for routing
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
}

// Type for Claude API messages (supports string or content blocks)
type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[];
};

export async function POST(request: Request): Promise<Response> {
  try {
    const { messages, systemPrompt } = (await request.json()) as ChatRequest;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create session for audit logging
    const session = await getOrCreateSession();
    const sessionId = session.id;

    // On new session, backfill-summarize previous session if needed (async)
    const isNewSession = Date.now() - new Date(session.startedAt).getTime() < 2000;
    const config = getJarvisConfig();
    if (isNewSession && config.enableMemoryLoading) {
      backfillSummarization(sessionId).catch(err =>
        console.error('[Chat] Backfill summarization failed:', err)
      );
    }

    // Load memory context if enabled
    let memoryContext: string | undefined;
    let proactiveSurfacing: string | undefined;
    let inferredPreferences: string[] | undefined;

    if (config.enableMemoryLoading) {
      try {
        const memories = await retrieveMemories({
          maxTokens: config.memoryTokenBudget,
          maxEntries: config.maxMemories,
        });
        memoryContext = formatMemoriesForPrompt(memories);

        // Generate proactive surfacing guidance
        const surfacing = getProactiveSurfacing(memories.entries);
        const surfacingText = formatProactiveSurfacing(surfacing);
        proactiveSurfacing = surfacingText || undefined; // Convert empty string to undefined

        // Load inferred preferences (source='jarvis_inferred', category='preference')
        const prefEntries = await getEntriesByCategory('preference');
        const inferred = prefEntries.filter(e => e.source === 'jarvis_inferred');
        if (inferred.length > 0) {
          inferredPreferences = inferred.map(e => e.content);
          console.log(`[Chat] Loaded ${inferredPreferences.length} inferred preferences`);
        }

        console.log(
          `[Chat] Loaded ${memories.entries.length} memories, ${surfacing.pendingItems.length} pending items`
        );
      } catch (error) {
        console.error('[Chat] Memory loading failed, continuing without:', error);
        // Don't fail the request, just proceed without memories
      }
    }

    // Get tutorial context (works client-side, so safe to call here)
    let tutorialContext: string | undefined;
    try {
      // Note: TutorialManager uses localStorage which only works client-side
      // For server-side, we'll pass undefined and let the client handle tutorial state
      // This is a limitation that will be addressed when we move to server-side session storage
      tutorialContext = undefined;
    } catch {
      tutorialContext = undefined;
    }

    // Load PREVIOUS session history (BEFORE saving current message)
    let conversationHistory: string | undefined;
    if (config.enableMemoryLoading) {
      try {
        const history = await loadConversationHistory(
          sessionId,
          config.historyTokenBudget,
          config.maxHistoryMessages
        );
        conversationHistory = history || undefined;
        if (history) {
          console.log(`[Chat] Loaded cross-session history: ${history.length} chars`);
        }
      } catch (error) {
        console.error('[Chat] History loading failed, continuing without:', error);
      }
    }

    // Build system prompt server-side with memory context, proactive surfacing, inferred preferences, and tutorial context
    // This ensures memory stays server-side and v1 behavior is preserved when flag is off
    const serverSystemPrompt = buildSystemPrompt({
      currentTime: new Date(),
      memoryContext,
      proactiveSurfacing,
      inferredPreferences,
      tutorialContext,
      conversationHistory,
    });

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build initial messages for Claude
          const claudeMessages: ClaudeMessage[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          // Monitor context window utilization (GUARD-05)
          const systemPromptChars = serverSystemPrompt.length;
          const messagesChars = JSON.stringify(claudeMessages).length;
          const totalChars = systemPromptChars + messagesChars;
          const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
          const utilizationPercent = (estimatedTokens / MAX_CONTEXT_TOKENS) * 100;

          console.log(`[Chat] Context utilization: ${utilizationPercent.toFixed(1)}% (${estimatedTokens} tokens estimated)`);

          if (utilizationPercent > WARN_THRESHOLD_PERCENT) {
            console.warn(`[Chat] High context utilization: ${utilizationPercent.toFixed(1)}% - consider summarizing conversation`);
            // Could add a hint to the system prompt, but per CONTEXT.md
            // we just log for now - no automatic truncation
          }

          // Persist user message (fire-and-forget, after history loading)
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg?.role === 'user') {
            saveMessage(sessionId, 'user', lastUserMsg.content).catch(err =>
              console.error('[Chat] Failed to save user message:', err)
            );
          }

          // Tool execution loop
          let iteration = 0;
          let finalResponse: Anthropic.Message | null = null;

          while (iteration < MAX_TOOL_ITERATIONS) {
            iteration++;
            console.log(`[Chat] Tool loop iteration ${iteration}`);

            // Call Claude (non-streaming to detect tool_use)
            // Use server-built system prompt with memory context
            const response = await anthropic.messages.create({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 1024,
              system: serverSystemPrompt,
              messages: claudeMessages as Anthropic.MessageParam[],
              tools: allTools,
            });

            console.log(`[Chat] Response stop_reason: ${response.stop_reason}`);

            // If no tool use, we're done - this is the final response
            if (response.stop_reason !== 'tool_use') {
              finalResponse = response;
              break;
            }

            // Extract tool use blocks from response
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
            );

            if (toolUseBlocks.length === 0) {
              // No tools to execute, use this response
              finalResponse = response;
              break;
            }

            console.log(`[Chat] Executing ${toolUseBlocks.length} tool(s)`);

            // Execute all tools in parallel
            const toolResults = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                console.log(`[Chat] Executing tool: ${toolUse.name}`, toolUse.input);

                // Stream tool_use event so tests can see which tools were called
                const toolUseData = JSON.stringify({
                  type: 'tool_use',
                  tool_name: toolUse.name,
                  tool_input: toolUse.input,
                });
                controller.enqueue(new TextEncoder().encode(`data: ${toolUseData}\n\n`));

                // Route to correct executor based on tool name
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

                // Stream tool_result event
                const toolResultData = JSON.stringify({
                  type: 'tool_result',
                  tool_name: toolUse.name,
                  result: result.slice(0, 500), // Truncate for streaming
                });
                controller.enqueue(new TextEncoder().encode(`data: ${toolResultData}\n\n`));

                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: result,
                };
              })
            );

            // Add assistant response (with tool_use) to message history
            claudeMessages.push({
              role: 'assistant',
              content: response.content,
            });

            // Add tool results as user message
            // CRITICAL: tool_result blocks must come FIRST, no text before them
            claudeMessages.push({
              role: 'user',
              content: toolResults,
            });
          }

          // If we hit max iterations without a final response, use the last one
          if (!finalResponse) {
            console.warn(`[Chat] Hit max tool iterations (${MAX_TOOL_ITERATIONS})`);
            const textData = JSON.stringify({
              type: 'text',
              text: 'I got a bit lost in my tools. Let me try a simpler approach.',
            });
            controller.enqueue(new TextEncoder().encode(`data: ${textData}\n\n`));
            controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
            controller.close();
            return;
          }

          // Stream the final text response
          for (const block of finalResponse.content) {
            if (block.type === 'text') {
              const data = JSON.stringify({
                type: 'text',
                text: block.text,
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }

          // Persist assistant response (fire-and-forget)
          const assistantText = finalResponse.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('');

          if (assistantText) {
            saveMessage(sessionId, 'assistant', assistantText).catch(err =>
              console.error('[Chat] Failed to save assistant message:', err)
            );

            // Trigger summarization if session is long (async, don't block)
            if (config.enableMemoryLoading) {
              getSessionMessageCount(sessionId).then(msgCount => {
                if (msgCount >= 20) {
                  console.log(`[Chat] Session ${msgCount} msgs, triggering summarization`);
                  triggerSummarization(sessionId).catch(err =>
                    console.error('[Chat] Summarization failed:', err)
                  );
                }
              }).catch(() => {});
            }
          }

          // Signal completion
          controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
          controller.close();
        } catch (error) {
          // Send error as SSE event
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Chat] Error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: errorMessage,
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // Handle request parsing errors
    const errorMessage = error instanceof Error ? error.message : 'Request parsing error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
