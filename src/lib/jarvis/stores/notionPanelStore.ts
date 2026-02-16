/**
 * Notion Panel Store
 *
 * Ephemeral Zustand store for the Notion panel overlay state.
 * No persistence — panel state resets on page refresh.
 */

import { create } from 'zustand';
import type { ClusterName } from '../notion/notionUrls';

export type NotionPanelMode = 'view' | 'show' | 'teach';

interface HistoryEntry {
  url: string;
  label: string;
  cluster: ClusterName | null;
}

export interface TeachContent {
  lessonId: string;
  title: string;
  intro: string;
  steps: Array<{ title: string; narration: string; panelNote?: string }>;
  outro: string;
  currentStep: number; // -1 = intro, 0..N-1 = steps, N = outro
}

interface NotionPanelState {
  isOpen: boolean;
  mode: NotionPanelMode;
  currentUrl: string;
  currentLabel: string;
  currentCluster: ClusterName | null;
  history: HistoryEntry[];
  historyIndex: number;
  teachContent: TeachContent | null;
}

interface NotionPanelActions {
  openPanel: (url: string, label: string, mode: NotionPanelMode, cluster?: ClusterName) => void;
  closePanel: () => void;
  setMode: (mode: NotionPanelMode) => void;
  goBack: () => void;
  setTeachContent: (content: TeachContent | null) => void;
  advanceStep: () => boolean; // returns true if lesson is now complete
  prevStep: () => void;
}

const MAX_HISTORY = 20;

export const useNotionPanelStore = create<NotionPanelState & NotionPanelActions>(
  (set, get) => ({
    isOpen: false,
    mode: 'view',
    currentUrl: '',
    currentLabel: '',
    currentCluster: null,
    history: [],
    historyIndex: -1,
    teachContent: null,

    openPanel: (url, label, mode, cluster) => {
      const state = get();
      let nextHistory = state.history;

      // If panel is already open with a URL, push current page to history
      if (state.isOpen && state.currentUrl) {
        nextHistory = [
          ...state.history,
          {
            url: state.currentUrl,
            label: state.currentLabel,
            cluster: state.currentCluster,
          },
        ].slice(-MAX_HISTORY);
      }

      set({
        isOpen: true,
        currentUrl: url,
        currentLabel: label,
        mode,
        currentCluster: cluster ?? null,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      });
    },

    closePanel: () =>
      set({
        isOpen: false,
        currentUrl: '',
        currentLabel: '',
        currentCluster: null,
        history: [],
        historyIndex: -1,
        teachContent: null,
      }),

    setMode: (mode) => set({ mode }),

    setTeachContent: (content) => set({ teachContent: content }),

    goBack: () => {
      const state = get();
      if (state.history.length === 0) return;

      const prev = state.history[state.history.length - 1];
      set({
        currentUrl: prev.url,
        currentLabel: prev.label,
        currentCluster: prev.cluster,
        history: state.history.slice(0, -1),
        historyIndex: state.history.length - 2,
      });
    },

    advanceStep: () => {
      const state = get();
      if (!state.teachContent) return false;
      const maxStep = state.teachContent.steps.length; // outro index
      const next = state.teachContent.currentStep + 1;
      if (next > maxStep) return true; // already past outro
      set({
        teachContent: { ...state.teachContent, currentStep: next },
      });
      return next > maxStep;
    },

    prevStep: () => {
      const state = get();
      if (!state.teachContent) return;
      const prev = Math.max(-1, state.teachContent.currentStep - 1);
      set({
        teachContent: { ...state.teachContent, currentStep: prev },
      });
    },
  })
);
