/**
 * Claude Chat API Route
 *
 * SSE streaming proxy to Claude API.
 * Proxies requests to keep ANTHROPIC_API_KEY server-side only.
 * Includes tool definitions for Phase 4 Notion integration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { notionTools, handleToolNotImplemented } from '@/lib/jarvis/intelligence/tools';

// Instantiate client - reads ANTHROPIC_API_KEY from environment automatically
const anthropic = new Anthropic();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
}

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

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use streaming API for low TTFT
          // Include tools for future Notion integration (handled gracefully if called)
          const response = anthropic.messages.stream({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            system: systemPrompt || 'You are a helpful assistant.',
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            tools: notionTools,
          });

          // Track if a tool was called (for post-stream handling)
          let pendingToolUse: { name: string; input: unknown } | null = null;

          // Stream events as SSE
          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({
                type: 'text',
                text: event.delta.text,
              });
              controller.enqueue(
                new TextEncoder().encode(`data: ${data}\n\n`)
              );
            }

            // Handle tool use - capture for graceful acknowledgment
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
              pendingToolUse = {
                name: event.content_block.name,
                input: {}
              };
            }

            // Capture tool input as it streams
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'input_json_delta' &&
              pendingToolUse
            ) {
              // Accumulate input JSON (for logging)
              // The SDK handles this internally, we just acknowledge
            }
          }

          // If Claude tried to use a tool, send the "coming soon" message
          if (pendingToolUse) {
            const fallbackMessage = handleToolNotImplemented(pendingToolUse.name, pendingToolUse.input);
            const toolData = JSON.stringify({
              type: 'text',
              text: ' ' + fallbackMessage,
            });
            controller.enqueue(
              new TextEncoder().encode(`data: ${toolData}\n\n`)
            );
          }

          // Signal completion
          controller.enqueue(
            new TextEncoder().encode('data: {"type":"done"}\n\n')
          );
          controller.close();
        } catch (error) {
          // Send error as SSE event
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          const errorData = JSON.stringify({
            type: 'error',
            error: errorMessage,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${errorData}\n\n`)
          );
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
    const errorMessage =
      error instanceof Error ? error.message : 'Request parsing error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
