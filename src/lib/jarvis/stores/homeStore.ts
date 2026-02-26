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
}

interface HomeActions {
  setPriorityItems: (items: PriorityItem[]) => void;
  setDomainHealth: (items: DomainHealthItem[]) => void;
  pinWidget: (widgetId: string) => void;
  unpinWidget: (widgetId: string) => void;
  reorderWidgets: (widgets: PinnedWidget[]) => void;
  setBriefingSummary: (summary: string | null) => void;
  setLastFetched: (date: Date | null) => void;
}

type HomeStore = HomeState & HomeActions;

const MAX_PINNED_WIDGETS = 4;

// ── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PRIORITIES: PriorityItem[] = [
  {
    id: 'mock-1',
    domainId: 'personal',
    title: 'Electric bill overdue',
    subtitle: '2 days past due — $142.50',
    urgency: 'critical',
    urgencyScore: 100,
    quickActionLabel: 'Mark paid',
  },
  {
    id: 'mock-2',
    domainId: 'personal',
    title: '3 tasks due today',
    subtitle: 'Review notes, Schedule dentist, Update budget',
    urgency: 'warning',
    urgencyScore: 80,
    quickActionLabel: 'View tasks',
  },
  {
    id: 'mock-3',
    domainId: 'personal',
    title: 'Morning habits incomplete',
    subtitle: 'Meditation, Exercise',
    urgency: 'routine',
    urgencyScore: 60,
    quickActionLabel: 'Mark done',
  },
  {
    id: 'mock-4',
    domainId: 'personal',
    title: 'Weekly review Sunday 7 PM',
    subtitle: null,
    urgency: 'info',
    urgencyScore: 20,
    quickActionLabel: null,
  },
];

const MOCK_HEALTH: DomainHealthItem[] = [
  {
    domainId: 'personal',
    status: 'green',
    metric: '3 tasks',
    summary: '0 overdue, 2 habits tracked',
  },
];

// ── Store Implementation ───────────────────────────────────────────────────

export const useHomeStore = create<HomeStore>()(
  persist(
    (set) => ({
      priorityItems: MOCK_PRIORITIES,
      domainHealth: MOCK_HEALTH,
      pinnedWidgets: DEFAULT_PINNED_WIDGETS,
      briefingSummary: 'Good morning — 3 tasks today, no overdue bills, habit streak at 5 days.',
      lastFetched: new Date(),

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
    }),
    {
      name: 'jarvis-home',
      partialize: (state) => ({
        pinnedWidgets: state.pinnedWidgets,
      }),
    }
  )
);
