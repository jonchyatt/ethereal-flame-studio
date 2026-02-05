/**
 * Claude Chat API Route
 *
 * SSE streaming proxy to Claude API with tool execution loop.
 * Uses shared chatProcessor for tool execution (shared with Telegram).
 * Adds SSE streaming callbacks and context window monitoring.
 */

import { processChatMessage } from '@/lib/jarvis/intelligence/chatProcessor';
import { buildSystemPromptContext } from '@/lib/jarvis/telegram/context';
import { buildSystemPrompt } from '@/lib/jarvis/intelligence/systemPrompt';
import { getOrCreateSession } from '@/lib/jarvis/memory/queries/sessions';
import { getJarvisConfig } from '@/lib/jarvis/config';
import { backfillSummarization } from '@/lib/jarvis/memory/summarization';

// Context window monitoring (GUARD-05)
const MAX_CONTEXT_TOKENS = 100_000;
const WARN_THRESHOLD_PERCENT = 80;
const CHARS_PER_TOKEN = 4;

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

    // Build system prompt context (shared with Telegram)
    const promptContext = await buildSystemPromptContext(sessionId);
    const serverSystemPrompt = buildSystemPrompt(promptContext);

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Monitor context window utilization (GUARD-05)
          const systemPromptChars = serverSystemPrompt.length;
          const messagesChars = JSON.stringify(messages).length;
          const totalChars = systemPromptChars + messagesChars;
          const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
          const utilizationPercent = (estimatedTokens / MAX_CONTEXT_TOKENS) * 100;

          console.log(`[Chat] Context utilization: ${utilizationPercent.toFixed(1)}% (${estimatedTokens} tokens estimated)`);

          if (utilizationPercent > WARN_THRESHOLD_PERCENT) {
            console.warn(`[Chat] High context utilization: ${utilizationPercent.toFixed(1)}% - consider summarizing conversation`);
          }

          // Process through shared chat processor with SSE callbacks
          const result = await processChatMessage({
            sessionId,
            systemPrompt: serverSystemPrompt,
            messages,
            onToolUse: (name, input) => {
              const data = JSON.stringify({ type: 'tool_use', tool_name: name, tool_input: input });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            },
            onToolResult: (name, res) => {
              const data = JSON.stringify({ type: 'tool_result', tool_name: name, result: res.slice(0, 500) });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            },
          });

          // Stream final response
          if (result.success) {
            const data = JSON.stringify({ type: 'text', text: result.responseText });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          } else {
            const errorText = result.error
              ? result.error
              : result.responseText || 'Something went wrong.';
            const data = JSON.stringify({ type: 'text', text: errorText });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }

          // Signal completion
          controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Chat] Error:', error);
          const errorData = JSON.stringify({ type: 'error', error: errorMessage });
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
    const errorMessage = error instanceof Error ? error.message : 'Request parsing error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
