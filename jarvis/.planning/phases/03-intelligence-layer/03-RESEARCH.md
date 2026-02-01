# Phase 3: Intelligence Layer - Research

**Researched:** 2026-01-31
**Domain:** Claude API Integration, Conversation Memory, Prompt Engineering
**Confidence:** HIGH

## Summary

Phase 3 integrates Claude API to transform Jarvis from an echo test into a conversational AI partner. The implementation uses the Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with streaming responses for low-latency conversational feel. The existing VoicePipeline already supports a `responseGenerator` pattern that can be upgraded to call Claude instead of echoing.

Key architecture decisions: Use SSE streaming from a Next.js API route (matching existing STT pattern), implement sliding window context management with message summarization for cross-session persistence, and engineer a system prompt that establishes the "omnipresent guide" personality without butler characteristics.

**Primary recommendation:** Use Claude Haiku 4.5 for fastest TTFT (~360ms) within the 300ms total latency budget, with streaming to minimize perceived latency. Store conversation summaries in localStorage for cross-session memory, with structured JSON for key facts and mental models.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.61.x | Claude API client | Official Anthropic SDK with full TypeScript support |
| zod | ^3.25.0 | Schema validation | Required for `betaZodTool()` helper for type-safe tool definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eventsource-parser | ^3.0.0 | SSE parsing | If not using SDK's built-in streaming |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Haiku 4.5 | Claude Sonnet 4.5 | Sonnet is smarter but 2x slower TTFT (~640ms vs ~360ms) |
| localStorage | IndexedDB | IndexedDB for larger data, localStorage simpler for summaries |
| In-memory context | Redis | Redis for multi-instance, in-memory sufficient for single-instance |

**Installation:**
```bash
npm install @anthropic-ai/sdk zod
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── jarvis/
│           ├── stt/route.ts       # Existing STT proxy
│           └── chat/route.ts      # New Claude API proxy (SSE streaming)
├── lib/
│   └── jarvis/
│       ├── intelligence/
│       │   ├── ClaudeClient.ts    # Browser client for chat API
│       │   ├── ConversationManager.ts  # Context window management
│       │   ├── MemoryStore.ts     # Cross-session persistence
│       │   └── systemPrompt.ts    # Guide personality prompt
│       └── voice/
│           └── VoicePipeline.ts   # Update responseGenerator
```

### Pattern 1: SSE Streaming for Claude Responses
**What:** Server-side Claude API calls with SSE streaming to browser
**When to use:** Always for voice conversations (matches STT pattern, low TTFT)
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming
// src/app/api/jarvis/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { messages, systemPrompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const response = anthropic.messages.stream({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      for await (const event of response) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          const data = JSON.stringify({
            type: 'text',
            text: event.delta.text
          });
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }
      }

      controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Pattern 2: Sliding Window Context Management
**What:** Keep recent N messages in context, summarize older ones
**When to use:** Multi-turn conversations to stay within token limits
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/context-windows
interface ConversationContext {
  systemPrompt: string;
  summary: string;          // Summarized older context
  recentMessages: Message[]; // Last N messages (full detail)
  keyFacts: KeyFact[];      // Extracted important facts
}

class ConversationManager {
  private maxRecentMessages = 10;  // Configurable window size
  private maxTokens = 4000;        // Leave room for response

  buildContext(conversation: Conversation): Message[] {
    const messages: Message[] = [];

    // Add summary of older context if exists
    if (conversation.summary) {
      messages.push({
        role: 'user',
        content: `[Previous conversation summary: ${conversation.summary}]`
      });
      messages.push({
        role: 'assistant',
        content: 'I understand. I have context from our previous conversation.'
      });
    }

    // Add recent messages
    messages.push(...conversation.recentMessages.slice(-this.maxRecentMessages));

    return messages;
  }

  async summarizeOldMessages(messages: Message[]): Promise<string> {
    // Use Claude to summarize when messages exceed window
    // This is called periodically, not on every turn
  }
}
```

### Pattern 3: Tool Definition for Future Notion Operations
**What:** Define tool schemas now, implement handlers in Phase 4
**When to use:** Prepare tool calling framework without actual implementation
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
import { z } from 'zod';

// Tool definitions (schemas only - handlers added in Phase 4)
export const notionTools = [
  {
    name: 'create_task',
    description: 'Create a new task in the user\'s Notion inbox. Use when user wants to remember something, add a todo, or capture an idea.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The task title or description'
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in ISO format (YYYY-MM-DD)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority level'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'query_tasks',
    description: 'Search and retrieve tasks from the user\'s Notion workspace. Use when user asks about their tasks, todos, or what they need to do.',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['today', 'this_week', 'overdue', 'all'],
          description: 'Time-based filter for tasks'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Filter by task status'
        }
      }
    }
  },
  {
    name: 'query_bills',
    description: 'Check upcoming bills and payment status. Use when user asks about bills, payments, or financial obligations.',
    input_schema: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['this_week', 'this_month', 'overdue'],
          description: 'Time period to check'
        }
      }
    }
  }
];

// Placeholder handler that acknowledges capability gap
export function handleToolNotImplemented(toolName: string, input: unknown): string {
  return `I understand you want to ${toolName}. This capability is coming soon - I'm noting this request for the development roadmap.`;
}
```

### Anti-Patterns to Avoid
- **Full transcript storage:** Don't store raw conversation transcripts; summarize to key points and mental models
- **Blocking TTS on full response:** Stream text to TTS as it arrives for sentence-level speaking
- **Butler personality:** Avoid formal, servile language; guide is calm and knowing, not subservient
- **Ignoring context limits:** Haiku 4.5 has 200K context but practical limit for conversation is ~4K tokens for responsiveness

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Custom parser | SDK's built-in streaming or eventsource-parser | Edge cases in SSE format |
| Tool schema validation | Manual JSON parsing | Zod with betaZodTool() helper | Type safety, runtime validation |
| Token counting | Character estimation | SDK's usage field in responses | Accurate billing, context management |
| Message format | Custom object structure | SDK's MessageParam types | API compatibility, type safety |

**Key insight:** The Anthropic SDK provides helpers for streaming, tool use, and type safety. Using raw fetch() is possible but loses these benefits.

## Common Pitfalls

### Pitfall 1: API Key Exposure in Browser
**What goes wrong:** Calling Claude API directly from browser exposes API key
**Why it happens:** Desire for simpler architecture without server proxy
**How to avoid:** Always proxy through Next.js API route (like existing STT pattern)
**Warning signs:** `NEXT_PUBLIC_ANTHROPIC_API_KEY` in code (should never exist)

### Pitfall 2: Exceeding Context Window Mid-Conversation
**What goes wrong:** API returns error when conversation history too long
**Why it happens:** Not tracking token usage, no summarization strategy
**How to avoid:** Track usage from response, summarize when approaching limit (e.g., 80%)
**Warning signs:** Errors after 10+ conversation turns

### Pitfall 3: Slow TTFT Breaking Conversational Feel
**What goes wrong:** User perceives delay, breaks natural conversation rhythm
**Why it happens:** Using larger model, not streaming, large context
**How to avoid:** Use Haiku 4.5 (360ms TTFT), stream immediately, keep context lean
**Warning signs:** Noticeable pause between speaking and response starting

### Pitfall 4: Lost Context on Page Refresh
**What goes wrong:** Jarvis "forgets" everything on refresh
**Why it happens:** Only in-memory state, no persistence layer
**How to avoid:** Store summary and key facts in localStorage, restore on mount
**Warning signs:** Every conversation starts fresh

### Pitfall 5: Tool Calling Without Implementation
**What goes wrong:** Claude calls tool, app crashes or hangs
**Why it happens:** Tool defined but no handler
**How to avoid:** Always implement placeholder handlers that gracefully acknowledge gaps
**Warning signs:** `tool_use` in response with no handling code

## Code Examples

Verified patterns from official sources:

### Browser SSE Client for Claude Responses
```typescript
// Source: Custom pattern matching STT implementation
// src/lib/jarvis/intelligence/ClaudeClient.ts

interface ChatCallbacks {
  onToken: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class ClaudeClient {
  private abortController: AbortController | null = null;

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string,
    callbacks: ChatCallbacks
  ): Promise<void> {
    this.abortController = new AbortController();
    let fullText = '';

    try {
      const response = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, systemPrompt }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              fullText += data.text;
              callbacks.onToken(data.text);
            } else if (data.type === 'done') {
              callbacks.onComplete(fullText);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        callbacks.onError(error);
      }
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}
```

### System Prompt for Omnipresent Guide Personality
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts
// src/lib/jarvis/intelligence/systemPrompt.ts

export function buildSystemPrompt(context: {
  currentTime: Date;
  userName?: string;
  keyFacts?: string[];
}): string {
  const timeString = context.currentTime.toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const factsSection = context.keyFacts?.length
    ? `\n\nKey context from our conversations:\n${context.keyFacts.map(f => `- ${f}`).join('\n')}`
    : '';

  return `You are Jarvis, an omnipresent guide helping ${context.userName || 'the user'} navigate their life and work.

PERSONALITY:
- Calm, knowing, always present - like a wise friend who sees the bigger picture
- Warm and direct, never formal or servile (NOT a butler)
- Brief for simple asks, more detailed when complexity warrants
- Proactively helpful - anticipate needs, offer suggestions, remind of things

CURRENT CONTEXT:
- It is currently ${timeString}
${factsSection}

CONVERSATION STYLE:
- Speak naturally, as if thinking alongside the user
- When uncertain: admit it directly, ask clarifying questions, then offer best effort with caveat
- Reference previous conversation context when relevant ("Earlier you mentioned...")
- Keep responses conversational - this is voice interaction, not text

CAPABILITIES:
- Currently: Natural conversation, time awareness, remembering context
- Coming soon: Notion integration for tasks, projects, bills
- When asked about unimplemented features: acknowledge the limitation, note it for future development

VOICE:
- This is a voice interface - responses will be spoken aloud
- Prefer shorter, punchier sentences over long explanations
- Avoid lists and formatting that doesn't translate well to speech
- Use natural speech patterns, contractions, conversational rhythm`;
}
```

### Integration with VoicePipeline
```typescript
// Source: Existing VoicePipeline pattern
// Update to src/lib/jarvis/voice/VoicePipeline.ts

import { ClaudeClient } from '../intelligence/ClaudeClient';
import { ConversationManager } from '../intelligence/ConversationManager';
import { buildSystemPrompt } from '../intelligence/systemPrompt';

// In VoicePipeline constructor or config
const claudeClient = new ClaudeClient();
const conversationManager = new ConversationManager();

// Replace echo responseGenerator with Claude
const intelligentResponseGenerator = async (transcript: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Add user message to context
    conversationManager.addMessage({ role: 'user', content: transcript });

    // Build context for Claude
    const messages = conversationManager.getContextMessages();
    const systemPrompt = buildSystemPrompt({
      currentTime: new Date(),
      keyFacts: conversationManager.getKeyFacts()
    });

    let fullResponse = '';

    claudeClient.chat(messages, systemPrompt, {
      onToken: (text) => {
        // Could stream to TTS here for even lower latency
        fullResponse += text;
      },
      onComplete: (text) => {
        conversationManager.addMessage({ role: 'assistant', content: text });
        resolve(text);
      },
      onError: (error) => {
        reject(error);
      }
    });
  });
};

// Use in VoicePipeline config
pipeline.setResponseGenerator(intelligentResponseGenerator);
```

### Cross-Session Memory Storage
```typescript
// src/lib/jarvis/intelligence/MemoryStore.ts

interface SessionMemory {
  summary: string;
  keyFacts: string[];
  lastUpdated: string;
}

const MEMORY_KEY = 'jarvis_memory';

export class MemoryStore {
  load(): SessionMemory | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(MEMORY_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  save(memory: SessionMemory): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MEMORY_KEY, JSON.stringify({
      ...memory,
      lastUpdated: new Date().toISOString()
    }));
  }

  addKeyFact(fact: string): void {
    const memory = this.load() || { summary: '', keyFacts: [], lastUpdated: '' };
    if (!memory.keyFacts.includes(fact)) {
      memory.keyFacts.push(fact);
      // Keep only most recent 20 facts
      memory.keyFacts = memory.keyFacts.slice(-20);
      this.save(memory);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MEMORY_KEY);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full conversation in context | Sliding window + summarization | 2025 (context optimization) | 80-90% token cost reduction |
| Fixed responses | Streaming TTFT | 2024 (SDK improvements) | Sub-second perceived latency |
| Manual tool parsing | betaZodTool() helper | 2025 (SDK v0.37+) | Type-safe tool definitions |
| Single session memory | Cross-session persistence | 2025 (Memoria pattern) | Continuous user experience |

**Deprecated/outdated:**
- `stream: true` in create(): Still works but `.stream()` helper is preferred for convenience
- Manual SSE parsing: SDK handles this internally now
- Claude 3.x for voice: Haiku 4.5 offers better speed/quality tradeoff

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal context window size for voice**
   - What we know: 200K available, practical conversation is ~4K tokens
   - What's unclear: Exact threshold before TTFT degrades noticeably
   - Recommendation: Start with 10 messages (~2K tokens), measure TTFT, adjust

2. **Summarization frequency**
   - What we know: Summarize when approaching token limit
   - What's unclear: When to summarize vs. just trim old messages
   - Recommendation: Summarize at end of each "session" (5 min inactivity), trim immediately when > 80% capacity

3. **Sentence-boundary detection for streaming TTS**
   - What we know: Stream tokens arrive word-by-word
   - What's unclear: Best algorithm for detecting speakable chunks
   - Recommendation: Accumulate until sentence-ending punctuation (. ! ?), then send to TTS

## Sources

### Primary (HIGH confidence)
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) - Installation, streaming, tool use
- [Claude Messages Streaming](https://platform.claude.com/docs/en/api/messages-streaming) - SSE event format, all event types
- [Tool Use Implementation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) - Tool definitions, betaZodTool, error handling
- [Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) - Token limits, context awareness

### Secondary (MEDIUM confidence)
- [System Prompts Guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts) - Role prompting, personality
- [Reducing Latency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency) - Model selection, TTFT optimization
- [NPM @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) - Package version, installation

### Tertiary (LOW confidence)
- [Memoria Framework](https://arxiv.org/abs/2512.12686) - Cross-session memory patterns (research paper)
- [LLM Memory Guide](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) - Summarization strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK documentation verified
- Architecture: HIGH - Patterns match existing STT implementation
- Pitfalls: MEDIUM - Based on common patterns, specific thresholds need testing
- Cross-session memory: MEDIUM - Pattern established but implementation details vary

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - stable domain, SDK changes infrequent)
