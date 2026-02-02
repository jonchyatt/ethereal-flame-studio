/**
 * Claude Chat API Route
 *
 * SSE streaming proxy to Claude API with tool execution loop.
 * Executes Notion tools via MCP and Memory tools via local DB.
 */

import Anthropic from '@anthropic-ai/sdk';
import { notionTools, memoryTools } from '@/lib/jarvis/intelligence/tools';
import { executeNotionTool } from '@/lib/jarvis/notion/toolExecutor';
import { executeMemoryTool } from '@/lib/jarvis/memory/toolExecutor';
import { getJarvisConfig } from '@/lib/jarvis/config';
import {
  retrieveMemories,
  formatMemoriesForPrompt,
  getProactiveSurfacing,
  formatProactiveSurfacing,
} from '@/lib/jarvis/memory';
import { buildSystemPrompt } from '@/lib/jarvis/intelligence/systemPrompt';

// Instantiate client - reads ANTHROPIC_API_KEY from environment automatically
const anthropic = new Anthropic();

// Maximum tool execution iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5;

// Combine all tools for Claude
const allTools = [...notionTools, ...memoryTools];

// Memory tool names for routing
const memoryToolNames = [
  'remember_fact',
  'forget_fact',
  'list_memories',
  'delete_all_memories',
  'restore_memory',
  'observe_pattern',
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

    // Load memory context if enabled
    let memoryContext: string | undefined;
    let proactiveSurfacing: string | undefined;
    const config = getJarvisConfig();

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

        console.log(
          `[Chat] Loaded ${memories.entries.length} memories, ${surfacing.pendingItems.length} pending items`
        );
      } catch (error) {
        console.error('[Chat] Memory loading failed, continuing without:', error);
        // Don't fail the request, just proceed without memories
      }
    }

    // Build system prompt server-side with memory context and proactive surfacing
    // This ensures memory stays server-side and v1 behavior is preserved when flag is off
    const serverSystemPrompt = buildSystemPrompt({
      currentTime: new Date(),
      memoryContext, // undefined when flag is off or loading failed
      proactiveSurfacing, // undefined when flag is off, loading failed, or nothing to surface
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
                if (memoryToolNames.includes(toolUse.name)) {
                  result = await executeMemoryTool(
                    toolUse.name,
                    toolUse.input as Record<string, unknown>
                  );
                } else {
                  result = await executeNotionTool(
                    toolUse.name,
                    toolUse.input as Record<string, unknown>
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
