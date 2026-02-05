/**
 * Notion Panel Store
 *
 * Ephemeral Zustand store for the Notion panel overlay state.
 * No persistence — panel state resets on page refresh.
 */

import { create } from 'zustand';
import type { ClusterName } from '../notion/notionUrls';

export type NotionPanelMode = 'view' | 'show' | 'teach';

interface NotionPanelState {
  isOpen: boolean;
  mode: NotionPanelMode;
  currentUrl: string;
  currentLabel: string;
  currentCluster: ClusterName | null;
}

interface NotionPanelActions {
  openPanel: (url: string, label: string, mode: NotionPanelMode, cluster?: ClusterName) => void;
  closePanel: () => void;
  setMode: (mode: NotionPanelMode) => void;
}

export const useNotionPanelStore = create<NotionPanelState & NotionPanelActions>(
  (set) => ({
    isOpen: false,
    mode: 'view',
    currentUrl: '',
    currentLabel: '',
    currentCluster: null,

    openPanel: (url, label, mode, cluster) =>
      set({
        isOpen: true,
        currentUrl: url,
        currentLabel: label,
        mode,
        currentCluster: cluster ?? null,
      }),

    closePanel: () =>
      set({
        isOpen: false,
        currentUrl: '',
        currentLabel: '',
        currentCluster: null,
      }),

    setMode: (mode) => set({ mode }),
  })
);
