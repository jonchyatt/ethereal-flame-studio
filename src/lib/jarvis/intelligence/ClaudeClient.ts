/**
 * ClaudeClient - Browser-side client for Claude chat API
 *
 * Handles SSE streaming from /api/jarvis/chat and invokes callbacks
 * as tokens arrive for low-latency conversational experience.
 */

import { fetchJarvisAPI } from '../api/fetchWithAuth';
import { useDashboardStore } from '../stores/dashboardStore';
import { useNotionPanelStore } from '../stores/notionPanelStore';

// Tools that modify data and should trigger a dashboard refresh
const WRITE_TOOLS = [
  'create_task',
  'update_task_status',
  'mark_bill_paid',
  'pause_task',
  'add_project_item',
  'open_notion_panel',
  'close_notion_panel',
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCallbacks {
  /** Called for each text token as it arrives */
  onToken: (text: string) => void;
  /** Called when response is complete with full accumulated text */
  onComplete: (fullText: string) => void;
  /** Called on error (not called for abort) */
  onError: (error: Error) => void;
}

/**
 * Client for streaming chat with Claude via the /api/jarvis/chat endpoint.
 *
 * @example
 * ```ts
 * const client = new ClaudeClient();
 *
 * await client.chat(
 *   [{ role: 'user', content: 'Hello!' }],
 *   'You are a helpful assistant.',
 *   {
 *     onToken: (text) => console.log('Token:', text),
 *     onComplete: (fullText) => console.log('Complete:', fullText),
 *     onError: (err) => console.error('Error:', err),
 *   }
 * );
 *
 * // To cancel:
 * client.abort();
 * ```
 */
export class ClaudeClient {
  private abortController: AbortController | null = null;
  private isStreaming = false;

  /**
   * Send messages to Claude and receive streaming response.
   *
   * @param messages - Conversation history
   * @param systemPrompt - System prompt for Claude
   * @param callbacks - Callbacks for streaming events
   */
  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    callbacks: ChatCallbacks
  ): Promise<void> {
    // Abort any existing request
    this.abort();

    this.abortController = new AbortController();
    this.isStreaming = true;
    let fullText = '';

    try {
      // Use authenticated fetch wrapper
      const response = await fetchJarvisAPI('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, systemPrompt }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Chat API error ${response.status}: ${errorBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        // Keep incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                fullText += data.text;
                callbacks.onToken(data.text);
              } else if (data.type === 'tool_result') {
                // Check if this was a write operation that succeeded
                const toolName = data.tool_name;
                const result = data.result || '';
                const isWriteTool = WRITE_TOOLS.includes(toolName);
                const isSuccess = !result.includes('trouble') && !result.includes("couldn't find");

                // Handle panel tools — parse JSON actions
                if (toolName === 'open_notion_panel' && isSuccess) {
                  try {
                    const parsed = JSON.parse(result);
                    if (parsed.action === 'open_panel') {
                      console.log('[ClaudeClient] Opening Notion panel:', parsed.label);
                      useNotionPanelStore.getState().openPanel(
                        parsed.url,
                        parsed.label,
                        parsed.mode || 'view',
                        parsed.cluster
                      );
                    }
                  } catch {
                    // Not JSON — tool returned an error string, skip
                  }
                } else if (toolName === 'close_notion_panel') {
                  console.log('[ClaudeClient] Closing Notion panel');
                  useNotionPanelStore.getState().closePanel();
                }

                if (isWriteTool && isSuccess) {
                  // Trigger dashboard refresh on client
                  console.log('[ClaudeClient] Write operation succeeded, refreshing dashboard');
                  useDashboardStore.getState().triggerRefresh();
                }
              } else if (data.type === 'done') {
                callbacks.onComplete(fullText);
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Unknown server error');
              }
            } catch (parseError) {
              // Skip malformed JSON lines (shouldn't happen)
              console.warn('Failed to parse SSE data:', line, parseError);
            }
          }
        }
      }

      // If we exit loop without done event, complete anyway
      if (fullText && this.isStreaming) {
        callbacks.onComplete(fullText);
      }
    } catch (error) {
      // Don't call onError for abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, no error callback
        return;
      }

      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  /**
   * Abort the current streaming request.
   * Safe to call even if no request is in progress.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming = false;
  }

  /**
   * Check if a request is currently streaming.
   */
  get streaming(): boolean {
    return this.isStreaming;
  }
}
