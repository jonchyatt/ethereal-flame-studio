import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PinnedWidget } from '@/lib/jarvis/widgets/types';
import { DEFAULT_PINNED_WIDGETS } from '@/lib/jarvis/widgets/registry';

// ── Types ──────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'critical' | 'warning' | 'routine' | 'info';
export type HealthStatus = 'red' | 'amber' | 'green' | 'gray';

export interface PriorityItem {
  id: string;
  domainId: string;
  title: string;
  subtitle: string | null;
  urgency: UrgencyLevel;
  urgencyScore: number; // overdue=100, due_today=80, due_soon=60, info=20
  quickActionLabel: string | null;
}

export interface DomainHealthItem {
  domainId: string;
  status: HealthStatus;
  metric: string;
  summary: string;
}

// ── Store ──────────────────────────────────────────────────────────────────

interface HomeState {
  priorityItems: PriorityItem[];
  domainHealth: DomainHealthItem[];
  pinnedWidgets: PinnedWidget[];
  briefingSummary: string | null;
  lastFetched: Date | null;
  isLoading: boolean;
  fetchError: string | null;
}

interface HomeActions {
  setPriorityItems: (items: PriorityItem[]) => void;
  setDomainHealth: (items: DomainHealthItem[]) => void;
  pinWidget: (widgetId: string) => void;
  unpinWidget: (widgetId: string) => void;
  reorderWidgets: (widgets: PinnedWidget[]) => void;
  setBriefingSummary: (summary: string | null) => void;
  setLastFetched: (date: Date | null) => void;
  setLoading: (loading: boolean) => void;
  setFetchError: (error: string | null) => void;
}

type HomeStore = HomeState & HomeActions;

const MAX_PINNED_WIDGETS = 4;

// ── Store Implementation ───────────────────────────────────────────────────

export const useHomeStore = create<HomeStore>()(
  persist(
    (set) => ({
      priorityItems: [],
      domainHealth: [],
      pinnedWidgets: DEFAULT_PINNED_WIDGETS,
      briefingSummary: null,
      lastFetched: null,
      isLoading: true,
      fetchError: null,

      setPriorityItems: (items) => set({ priorityItems: items }),
      setDomainHealth: (items) => set({ domainHealth: items }),

      pinWidget: (widgetId) =>
        set((state) => {
          if (state.pinnedWidgets.length >= MAX_PINNED_WIDGETS) return state;
          if (state.pinnedWidgets.some((w) => w.widgetId === widgetId)) return state;
          const position = state.pinnedWidgets.length;
          return { pinnedWidgets: [...state.pinnedWidgets, { widgetId, position }] };
        }),

      unpinWidget: (widgetId) =>
        set((state) => ({
          pinnedWidgets: state.pinnedWidgets
            .filter((w) => w.widgetId !== widgetId)
            .map((w, i) => ({ ...w, position: i })),
        })),

      reorderWidgets: (widgets) => set({ pinnedWidgets: widgets.slice(0, MAX_PINNED_WIDGETS) }),
      setBriefingSummary: (summary) => set({ briefingSummary: summary }),
      setLastFetched: (date) => set({ lastFetched: date }),
      setLoading: (loading) => set({ isLoading: loading }),
      setFetchError: (error) => set({ fetchError: error }),
    }),
    {
      name: 'jarvis-home',
      partialize: (state) => ({
        pinnedWidgets: state.pinnedWidgets,
      }),
    }
  )
);
