'use client';

/**
 * ChatPanel - Slide-up text chat panel for Jarvis
 *
 * Features:
 * - Text input + send button
 * - Scrollable message history (user/assistant bubbles)
 * - Tool execution indicators
 * - Quick-action chips: "Today's tasks", "Briefing", "What's due?"
 * - Connects to /api/jarvis/chat SSE endpoint via postJarvisAPI
 *
 * Phase 1: Make Web UI Actually Useful
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';
import { postJarvisAPI } from '@/lib/jarvis/api/fetchWithAuth';

const QUICK_ACTIONS = [
  { label: "Today's tasks", message: "What are my tasks for today?" },
  { label: 'Briefing', message: 'Give me my morning briefing' },
  { label: "What's due?", message: "What bills or tasks are due soon?" },
  { label: 'Habits', message: "How are my habits going?" },
];

export function ChatPanel() {
  const {
    messages,
    isTyping,
    isPanelOpen,
    activeTool,
    addMessage,
    updateMessage,
    setIsTyping,
    togglePanel,
    setActiveTool,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isPanelOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addMessage({ role: 'user', content: text.trim() });
    setInput('');
    setIsTyping(true);
    setActiveTool(null);

    // Build messages array for API (last 20 messages for context)
    const recentMessages = useChatStore.getState().messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Create assistant placeholder
    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      abortRef.current = new AbortController();
      const response = await postJarvisAPI('/api/jarvis/chat', {
        messages: recentMessages,
        systemPrompt: '', // Server builds its own system prompt
      }, { signal: abortRef.current.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const event = JSON.parse(json);

            if (event.type === 'tool_use') {
              setActiveTool(event.tool_name);
            } else if (event.type === 'tool_result') {
              setActiveTool(null);
            } else if (event.type === 'text') {
              updateMessage(assistantId, {
                content: event.text,
                isStreaming: false,
              });
            } else if (event.type === 'done') {
              // Stream complete
            } else if (event.type === 'error') {
              updateMessage(assistantId, {
                content: event.error || 'Something went wrong.',
                isStreaming: false,
              });
            }
          } catch {
            // Ignore malformed SSE events
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateMessage(assistantId, {
        content: `Sorry, I ran into a problem: ${errorMsg}`,
        isStreaming: false,
      });
    } finally {
      setIsTyping(false);
      setActiveTool(null);
      abortRef.current = null;
    }
  }, [addMessage, updateMessage, setIsTyping, setActiveTool]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-cyan-600 hover:bg-cyan-500
                   rounded-full shadow-lg flex items-center justify-center transition-all
                   md:bottom-8 md:right-8"
        aria-label={isPanelOpen ? 'Close chat' : 'Open chat'}
      >
        {isPanelOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out
                    ${isPanelOpen ? 'translate-y-0' : 'translate-y-full'}
                    md:inset-x-auto md:right-4 md:bottom-4 md:w-96 md:rounded-2xl md:max-h-[600px]`}
      >
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10
                        rounded-t-2xl md:rounded-2xl flex flex-col
                        h-[70vh] md:h-[500px] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-white/90 text-sm font-medium">Chat with Jarvis</h3>
            <button
              onClick={togglePanel}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm mb-4">Ask me anything about your tasks, habits, or schedule.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.message)}
                      className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10
                                 text-cyan-400/80 rounded-full border border-white/10
                                 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-cyan-600/80 text-white rounded-br-md'
                      : 'bg-white/5 text-white/90 rounded-bl-md'
                    }
                    ${msg.isStreaming ? 'animate-pulse' : ''}`}
                >
                  {msg.content || (msg.isStreaming ? '...' : '')}
                </div>
              </div>
            ))}

            {/* Tool execution indicator */}
            {activeTool && (
              <div className="flex items-center gap-2 text-white/40 text-xs px-1">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Using {activeTool.replace(/_/g, ' ')}...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions row (shown when there are messages) */}
          {messages.length > 0 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.message)}
                  disabled={isTyping}
                  className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10
                             text-cyan-400/60 rounded-full border border-white/10
                             transition-colors whitespace-nowrap shrink-0
                             disabled:opacity-30"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isTyping}
                className="flex-1 bg-white/5 text-white text-sm rounded-xl px-4 py-2.5
                           border border-white/10 focus:border-cyan-500/50 focus:outline-none
                           placeholder:text-white/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700
                           text-white text-sm rounded-xl transition-colors
                           disabled:text-zinc-400"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
