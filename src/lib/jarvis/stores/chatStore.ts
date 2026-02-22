/**
 * Chat Store - Zustand store for Jarvis text chat
 *
 * Manages chat messages, typing state, panel visibility,
 * and SSE connection to /api/jarvis/chat.
 *
 * Phase 1: Make Web UI Actually Useful
 */

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** Tool currently being executed (shown as indicator) */
  toolName?: string;
  /** Whether this message is still streaming */
  isStreaming?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  isTyping: boolean;
  isPanelOpen: boolean;
  /** Active tool being executed */
  activeTool: string | null;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setIsTyping: (typing: boolean) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setActiveTool: (tool: string | null) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isTyping: false,
  isPanelOpen: false,
  activeTool: null,

  addMessage: (msg) => {
    const id = `msg-${++messageCounter}-${Date.now()}`;
    const message: ChatMessage = { ...msg, id, timestamp: Date.now() };
    set((state) => ({ messages: [...state.messages, message] }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  setIsTyping: (typing) => set({ isTyping: typing }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  clearMessages: () => set({ messages: [], activeTool: null }),
}));
