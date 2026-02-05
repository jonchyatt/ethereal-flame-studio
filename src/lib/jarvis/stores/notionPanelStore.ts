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

interface NotionPanelState {
  isOpen: boolean;
  mode: NotionPanelMode;
  currentUrl: string;
  currentLabel: string;
  currentCluster: ClusterName | null;
  history: HistoryEntry[];
  historyIndex: number;
}

interface NotionPanelActions {
  openPanel: (url: string, label: string, mode: NotionPanelMode, cluster?: ClusterName) => void;
  closePanel: () => void;
  setMode: (mode: NotionPanelMode) => void;
  goBack: () => void;
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
      }),

    setMode: (mode) => set({ mode }),

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
  })
);
