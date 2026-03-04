'use client';

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Loader2, GraduationCap, ChevronRight } from 'lucide-react';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { useChatStore, type ChatMessage } from '@/lib/jarvis/stores/chatStore';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';
import { postJarvisAPI } from '@/lib/jarvis/api/fetchWithAuth';
import { tutorialActionBus } from '@/lib/jarvis/curriculum/tutorialActionBus';
import { getLesson } from '@/lib/jarvis/curriculum/tutorialLessons';
import { useTutorialEngineContext } from './JarvisShell';
import { Input } from '../primitives/Input';
import { Button } from '../primitives/Button';

/**
 * Serializes the user's current location in the app into a short context string.
 * Injected into every chat API call — Tier 1 vision: Claude always knows where you are.
 */
function buildAppContext(pathname: string | null): string {
  if (!pathname) return '';
  const routeMap: [string, string][] = [
    ['/jarvis/app/personal', 'Personal domain (Tasks, Habits, Bills & Finance, Calendar, Meals & Kitchen, Journal, Health, Goals)'],
    ['/jarvis/app/academy', 'Learn/Academy tab (curriculum, topic list)'],
    ['/jarvis/app/settings', 'Settings page'],
    ['/jarvis/app/onboarding', 'Onboarding wizard'],
    ['/jarvis/app', 'Home tab (Quick Actions, Academy widget, Briefing — NOT tasks or habits)'],
  ];
  let location = pathname;
  for (const [route, label] of routeMap) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      location = label;
      break;
    }
  }
  return `CURRENT APP LOCATION: User is currently viewing the ${location} (path: ${pathname})`;
}

const QUICK_ACTIONS = [
  { label: "Today's tasks", message: 'What are my tasks for today?' },
  { label: 'Briefing', message: 'Give me my morning briefing' },
  { label: "What's due?", message: 'What bills or tasks are due soon?' },
  { label: 'Habits', message: 'How are my habits going?' },
];

export function ChatOverlay() {
  const pathname = usePathname();
  const isChatOpen = useShellStore((s) => s.isChatOpen);
  const closeChat = useShellStore((s) => s.closeChat);
  const toggleChat = useShellStore((s) => s.toggleChat);

  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const activeTool = useChatStore((s) => s.activeTool);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setIsTyping = useChatStore((s) => s.setIsTyping);
  const setActiveTool = useChatStore((s) => s.setActiveTool);

  const spotlight = useTutorialStore((s) => s.spotlight);
  const [input, setInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [animState, setAnimState] = useState<'entering' | 'open' | 'exiting' | 'closed'>('closed');

  const isNarrationEnabled = useTutorialStore((s) => s.isNarrationEnabled);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const audioUnlockedRef = useRef(false);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenMsgIdRef = useRef<string | null>(null);

  // Open/close lifecycle
  useEffect(() => {
    if (isChatOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimState('entering'));
      });
      const timer = setTimeout(() => setAnimState('open'), 300);
      return () => clearTimeout(timer);
    } else if (isVisible) {
      setAnimState('exiting');
      const timer = setTimeout(() => {
        setIsVisible(false);
        setAnimState('closed');
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (animState === 'open') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [animState]);

  // Scroll to bottom when chat opens — messages already exist but didn't change so
  // the messages-change effect doesn't fire. This catches the open transition.
  useEffect(() => {
    if (animState === 'open') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 50);
    }
  }, [animState]);

  // Keyboard shortcut: Cmd/Ctrl+Shift+C
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (window.matchMedia('(min-width: 768px)').matches) {
          e.preventDefault();
          toggleChat();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleChat]);

  // TTS: speak completed assistant messages aloud
  useEffect(() => {
    if (!isNarrationEnabled || !audioUnlockedRef.current) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming || !lastMsg.content) return;
    if (lastMsg.id === lastSpokenMsgIdRef.current) return;
    lastSpokenMsgIdRef.current = lastMsg.id;

    // Stop any in-flight chat audio
    if (chatAudioRef.current) {
      chatAudioRef.current.pause();
      chatAudioRef.current = null;
    }

    // Truncate very long responses — TTS works best for concise text
    const text = lastMsg.content.replace(/\*\*/g, '').replace(/\*/g, '').slice(0, 400);

    postJarvisAPI('/api/jarvis/tts', { text })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        chatAudioRef.current = audio;
        audio.play().catch(() => {});
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          chatAudioRef.current = null;
        }, { once: true });
      })
      .catch(() => {});
  }, [messages, isNarrationEnabled]);

  // Auto-send queued message (from QuickActions or programmatic open)
  useEffect(() => {
    if (animState === 'open') {
      const msg = useChatStore.getState().consumeQueuedMessage();
      if (msg) {
        // Delay slightly so the panel is fully visible before sending
        setTimeout(() => sendMessageRef.current?.(msg), 200);
      }
    }
  }, [animState]);

  // SSE send — copied faithfully from ChatPanel
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    addMessage({ role: 'user', content: text.trim() });
    setInput('');
    setIsTyping(true);
    setActiveTool(null);

    // Tutorial action bus integration
    tutorialActionBus.emit('user-sent-chat-message');
    const userMsgCount = useChatStore.getState().messages.filter((m) => m.role === 'user').length;
    if (userMsgCount >= 2) {
      tutorialActionBus.emit('user-sent-second-message');
    }

    const recentMessages = useChatStore.getState().messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      abortRef.current = new AbortController();
      const response = await postJarvisAPI('/api/jarvis/chat', {
        messages: recentMessages,
        appContext: buildAppContext(pathname),
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
              // Spotlight bridge: apply spotlight side-effects from SSE stream
              if (event.tool_name === 'spotlight_element' && event.tool_input) {
                useTutorialStore.getState().setSpotlight({
                  elementId: event.tool_input.element_id,
                  type: event.tool_input.style || 'pulse',
                  narration: event.tool_input.narration,
                });
              } else if (event.tool_name === 'clear_spotlight') {
                useTutorialStore.getState().clearSpotlight();
              }
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
  }, [addMessage, updateMessage, setIsTyping, setActiveTool, pathname]);

  // Keep ref in sync for queued message effect
  sendMessageRef.current = sendMessage;

  // Unlock iOS AudioContext on first direct user gesture.
  // Must be called synchronously inside touch/click handlers — NOT inside async callbacks.
  const unlockIOSAudio = () => {
    if (audioUnlockedRef.current) return;
    const unlock = new Audio();
    unlock.play().catch(() => {});
    audioUnlockedRef.current = true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockIOSAudio();
    sendMessage(input);
  };

  const handleQuickAction = (message: string) => {
    unlockIOSAudio();
    sendMessage(message);
  };

  // Mobile drag-to-dismiss
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !overlayRef.current) return;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    if (deltaY > 0) {
      overlayRef.current.style.transform = `translateY(${deltaY}px)`;
      overlayRef.current.style.transition = 'none';
      if (scrimRef.current) {
        const height = overlayRef.current.offsetHeight;
        scrimRef.current.style.opacity = String(Math.max(0, 1 - deltaY / (height * 0.5)));
      }
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !overlayRef.current) return;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = deltaY / elapsed;
    const height = overlayRef.current.offsetHeight;

    if (deltaY > height * 0.3 || velocity > 0.5) {
      closeChat();
    } else {
      overlayRef.current.style.transform = 'translateY(0)';
      overlayRef.current.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      if (scrimRef.current) {
        scrimRef.current.style.opacity = '1';
        scrimRef.current.style.transition = 'opacity 300ms ease';
      }
    }
    touchStartRef.current = null;
  }, [closeChat]);

  if (!isVisible) return null;

  const isEntering = animState === 'entering' || animState === 'open';

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes jarvis-chat-chip-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes jarvis-msg-right {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes jarvis-msg-left {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes jarvis-bounce-dot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Mobile scrim */}
      <div
        ref={scrimRef}
        className={`fixed inset-0 bg-black/30 z-[54] md:hidden transition-opacity duration-200 ${isEntering ? 'opacity-100' : 'opacity-0'}${spotlight ? ' pointer-events-none' : ''}`}
        onClick={closeChat}
      />

      {/* Mobile bottom sheet chat */}
      <div
        ref={overlayRef}
        className="fixed inset-x-0 bottom-0 z-[55] h-[45vh] md:hidden pointer-events-none"
        style={{
          transform: isEntering ? 'translateY(0)' : 'translateY(100%)',
          transition: animState === 'entering'
            ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : animState === 'exiting'
              ? 'transform 250ms ease-in'
              : 'none',
        }}
      >
        <div className="bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl h-full flex flex-col pointer-events-auto">
          {/* Drag handle */}
          <div
            className="w-full pt-3 pb-2 cursor-grab shrink-0"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
          </div>

          <ChatHeaderWithTutorial onClose={closeChat} />
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            activeTool={activeTool}
            onQuickAction={handleQuickAction}
            messagesEndRef={messagesEndRef}
          />
          <ChatActionsRow onAction={handleQuickAction} disabled={isTyping} messages={messages} />
          <ChatInputRow
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isTyping}
          />
        </div>
      </div>

      {/* Desktop right sidebar panel */}
      <div
        className="fixed right-0 top-14 bottom-0 w-[400px] z-[55] hidden md:flex flex-col"
        style={{
          transform: isEntering ? 'translateX(0)' : 'translateX(100%)',
          transition: isEntering
            ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'transform 250ms ease-in',
          boxShadow: isEntering ? '-8px 0 24px -4px rgba(6,182,212,0.08)' : 'none',
        }}
      >
        <div className="bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 h-full flex flex-col">
          <ChatHeaderWithTutorial onClose={closeChat} />
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            activeTool={activeTool}
            onQuickAction={handleQuickAction}
            messagesEndRef={messagesEndRef}
          />
          <ChatActionsRow onAction={handleQuickAction} disabled={isTyping} messages={messages} />
          <ChatInputRow
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isTyping}
          />
        </div>
      </div>
    </>
  );
}

/* ---- Sub-components (internal, no separate files) ---- */

/** Conditionally renders tutorial progress header or normal header */
function ChatHeaderWithTutorial({ onClose }: { onClose: () => void }) {
  const engine = useTutorialEngineContext();

  if (engine?.isActive && engine.currentLesson) {
    const progress = ((engine.currentStepIndex + 1) / engine.totalSteps) * 100;
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/90 text-xs font-medium truncate">
              {engine.currentLesson.name}
            </span>
            <span className="text-white/40 text-xs shrink-0 ml-2">
              {engine.currentStepIndex + 1}/{engine.totalSteps}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={engine.exitTutorial}
          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
          title="Exit tutorial"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
      <span className="text-white/90 text-sm font-medium">Chat with Jarvis</span>
      <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Tutorial message border colors ─────────────────────────────────────

const TUTORIAL_BORDER: Record<string, string> = {
  instruction: 'border-l-cyan-500',
  hint: 'border-l-amber-500',
  success: 'border-l-emerald-500',
  teaching: 'border-l-violet-500',
  celebration: 'border-l-emerald-500',
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  activeTool: string | null;
  onQuickAction: (msg: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatMessages({ messages, isTyping, activeTool, onQuickAction, messagesEndRef }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollBehavior: 'smooth' }}>
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-white/20 text-lg mb-1">Jarvis</p>
          <p className="text-white/40 text-sm mb-4">Ask me anything about your tasks, habits, or schedule.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={action.label}
                onClick={() => onQuickAction(action.message)}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-cyan-400/80 rounded-full border border-white/10 transition-colors"
                style={{
                  animation: 'jarvis-chat-chip-in 300ms ease-out both',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const tut = msg.tutorial;
        const isTutorial = !!tut;
        const borderClass = tut ? TUTORIAL_BORDER[tut.type] ?? '' : '';

        return (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{
              animation: msg.role === 'user'
                ? 'jarvis-msg-right 200ms ease-out both'
                : 'jarvis-msg-left 200ms ease-out both',
            }}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-cyan-600/80 text-white rounded-br-md'
                  : 'bg-white/5 text-white/90 rounded-bl-md'
                }
                ${isTutorial ? `border-l-2 ${borderClass}` : ''}`}
            >
              {isTutorial && msg.role === 'assistant' && (
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400/60 inline mr-1.5 -mt-0.5" />
              )}
              {msg.content || (msg.isStreaming ? <TypingDots /> : '')}
            </div>
          </div>
        );
      })}

      {/* Typing indicator for streaming with no content yet */}
      {isTyping && !activeTool && messages.length > 0 && messages[messages.length - 1]?.content === '' && null}

      {/* Tool execution indicator */}
      {activeTool && (
        <div className="flex items-center gap-2 text-white/40 text-xs px-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="animate-pulse">Using {activeTool.replace(/_/g, ' ')}...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-1">
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          style={{
            animation: 'jarvis-bounce-dot 600ms infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** Shows next-lesson chip during tutorial, or standard quick actions otherwise. */
function ChatActionsRow({
  onAction,
  disabled,
  messages,
}: {
  onAction: (msg: string) => void;
  disabled: boolean;
  messages: ChatMessage[];
}) {
  const engine = useTutorialEngineContext();
  const suggestedNext = useTutorialStore((s) => s.suggestedNext);

  // Between lessons — show "Continue" chip
  if (!engine?.isActive && suggestedNext) {
    const nextLesson = getLesson(suggestedNext);
    if (nextLesson) {
      return (
        <div className="px-4 py-2 flex gap-2 border-t border-white/5 shrink-0">
          <button
            onClick={() => engine?.startLesson(suggestedNext)}
            className="px-3 py-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/20 transition-colors whitespace-nowrap"
          >
            Continue: {nextLesson.name} →
          </button>
        </div>
      );
    }
  }

  // During active tutorial — always show Continue chip so user can skip current step.
  // Calls engine.skipStep() directly — NO API call, no Claude involvement.
  if (engine?.isActive) {
    return (
      <div className="px-4 py-2 flex gap-2 border-t border-white/5 shrink-0">
        <button
          onClick={() => engine.skipStep()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-full border border-cyan-500/25 transition-colors font-medium"
        >
          Continue <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Normal quick actions
  if (messages.length === 0) return null;

  return (
    <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/5 shrink-0">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.message)}
          disabled={disabled}
          className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-cyan-400/60 rounded-full border border-white/10 transition-colors whitespace-nowrap shrink-0 disabled:opacity-30"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

interface ChatInputRowProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

const ChatInputRow = forwardRef<HTMLInputElement, ChatInputRowProps>(
  function ChatInputRow({ value, onChange, onSubmit, disabled }, ref) {
    return (
      <form onSubmit={onSubmit} className="px-4 py-3 border-t border-white/10 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={ref}
              type="text"
              size="md"
              placeholder="Message Jarvis..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              data-tutorial-id="chat-input"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={disabled || !value.trim()}
            icon={<Send className="w-4 h-4" />}
            data-tutorial-id="chat-send"
          />
        </div>
      </form>
    );
  }
);
