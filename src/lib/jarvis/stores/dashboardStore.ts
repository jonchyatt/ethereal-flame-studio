import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SectionState {
  visible: boolean;
  expanded: boolean;
}

interface DashboardState {
  isVisible: boolean;
  sections: {
    tasks: SectionState;
    calendar: SectionState;
    habits: SectionState;
    bills: SectionState;
  };
  pinnedItems: string[]; // page IDs for pinned items
  defaultView: 'minimal' | 'moderate' | 'full';
  refreshCounter: number; // Incremented to trigger data refetch
}

interface DashboardActions {
  setIsVisible: (visible: boolean) => void;
  toggleSection: (section: keyof DashboardState['sections']) => void;
  toggleSectionExpanded: (section: keyof DashboardState['sections']) => void;
  pinItem: (pageId: string) => void;
  unpinItem: (pageId: string) => void;
  setDefaultView: (view: DashboardState['defaultView']) => void;
  triggerRefresh: () => void; // Called after Notion writes
}

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set) => ({
      // Default state - moderate view per CONTEXT.md
      isVisible: true,
      sections: {
        tasks: { visible: true, expanded: true },
        calendar: { visible: true, expanded: false },
        habits: { visible: true, expanded: false },
        bills: { visible: true, expanded: false },
      },
      pinnedItems: [],
      defaultView: 'moderate',
      refreshCounter: 0,

      // Actions
      setIsVisible: (isVisible) => set({ isVisible }),

      toggleSection: (section) =>
        set((state) => ({
          sections: {
            ...state.sections,
            [section]: {
              ...state.sections[section],
              visible: !state.sections[section].visible,
            },
          },
        })),

      toggleSectionExpanded: (section) =>
        set((state) => ({
          sections: {
            ...state.sections,
            [section]: {
              ...state.sections[section],
              expanded: !state.sections[section].expanded,
            },
          },
        })),

      pinItem: (pageId) =>
        set((state) => ({
          pinnedItems: [...state.pinnedItems, pageId],
        })),

      unpinItem: (pageId) =>
        set((state) => ({
          pinnedItems: state.pinnedItems.filter((id) => id !== pageId),
        })),

      setDefaultView: (defaultView) => set({ defaultView }),

      triggerRefresh: () =>
        set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
    }),
    {
      name: 'jarvis-dashboard',
      partialize: (state) => ({
        isVisible: state.isVisible,
        sections: state.sections,
        pinnedItems: state.pinnedItems,
        defaultView: state.defaultView,
        // Don't persist refreshCounter
      }),
    }
  )
);
