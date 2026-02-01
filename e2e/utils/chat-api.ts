import { APIRequestContext } from '@playwright/test';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SSEEvent {
  type: string;
  text?: string;
  data?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  error?: string;
}

/**
 * Build a simple system prompt for tests
 */
function buildTestSystemPrompt(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeString = `${day}, ${hours}:${minutes} ${ampm}`;

  return `You are Jarvis, an omnipresent guide - calm, knowing, and always present.

CURRENT CONTEXT:
- Current time: ${timeString}

CAPABILITIES:
You have access to Notion tools for managing tasks, bills, projects, goals, and habits.
Use these tools when the user asks about their tasks, bills, or wants to create/update items.

TOOLS:
- query_tasks: Search for tasks
- query_bills: Search for bills
- query_projects: Search for projects
- query_goals: Search for goals
- query_habits: Search for habits
- create_task: Create a new task
- update_task_status: Update task status (complete, in-progress, to-do)
- mark_bill_paid: Mark a bill as paid
- pause_task: Put a task on hold
- add_project_item: Add an item to a project

VOICE INTERFACE:
- Keep responses conversational and brief
- Avoid lists and formatting that doesn't translate to speech`;
}

/**
 * Send a message to the Jarvis chat API and parse SSE response
 */
export async function sendChatMessage(
  request: APIRequestContext,
  message: string,
  history: ChatMessage[] = []
): Promise<{ text: string; events: SSEEvent[]; toolCalls: SSEEvent[] }> {
  // Build messages array: history + new user message
  const messages: ChatMessage[] = [
    ...history,
    { role: 'user', content: message }
  ];

  const response = await request.post('/api/jarvis/chat', {
    data: {
      messages,
      systemPrompt: buildTestSystemPrompt(),
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Chat API error ${response.status()}: ${errorText}`);
  }

  const body = await response.text();
  return parseSSEResponse(body);
}

/**
 * Parse SSE response into structured events
 */
export function parseSSEResponse(body: string): {
  text: string;
  events: SSEEvent[];
  toolCalls: SSEEvent[];
} {
  const events: SSEEvent[] = [];
  const toolCalls: SSEEvent[] = [];
  let text = '';

  const lines = body.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6);
      if (jsonStr === '[DONE]') continue;

      try {
        const event = JSON.parse(jsonStr) as SSEEvent;
        events.push(event);

        if (event.type === 'text' && event.text) {
          text += event.text;
        } else if (event.type === 'tool_use') {
          toolCalls.push(event);
        }
      } catch {
        // Skip non-JSON lines
      }
    }
  }

  return { text, events, toolCalls };
}

/**
 * Send a conversation (multiple messages maintaining history)
 */
export async function sendConversation(
  request: APIRequestContext,
  messages: string[]
): Promise<{ text: string; events: SSEEvent[]; toolCalls: SSEEvent[] }[]> {
  const results: { text: string; events: SSEEvent[]; toolCalls: SSEEvent[] }[] = [];
  const history: ChatMessage[] = [];

  for (const message of messages) {
    const result = await sendChatMessage(request, message, history);
    results.push(result);

    // Add to history for next message
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: result.text });
  }

  return results;
}
