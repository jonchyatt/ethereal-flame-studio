import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClusterName } from '../notion/notionUrls';

export interface GapInfo {
  clusterId: ClusterName;
  message: string;
  suggestedLessonId: string;
}

interface CurriculumProgressState {
  completedLessons: string[];       // Lesson IDs completed by user
  discoveredGaps: GapInfo[];        // Derived from briefing data (client-side)
}

interface CurriculumProgressActions {
  completeLesson: (lessonId: string) => void;
  setDiscoveredGaps: (gaps: GapInfo[]) => void;
  clearProgress: () => void;
}

export const useCurriculumProgressStore = create<CurriculumProgressState & CurriculumProgressActions>()(
  persist(
    (set) => ({
      completedLessons: [],
      discoveredGaps: [],

      completeLesson: (lessonId) =>
        set((state) => ({
          completedLessons: state.completedLessons.includes(lessonId)
            ? state.completedLessons
            : [...state.completedLessons, lessonId],
        })),

      setDiscoveredGaps: (gaps) => set({ discoveredGaps: gaps }),

      clearProgress: () => set({ completedLessons: [], discoveredGaps: [] }),
    }),
    {
      name: 'jarvis-curriculum-progress',
      partialize: (state) => ({
        completedLessons: state.completedLessons,
        // Don't persist discoveredGaps — re-derive each session from briefing data
      }),
    }
  )
);
