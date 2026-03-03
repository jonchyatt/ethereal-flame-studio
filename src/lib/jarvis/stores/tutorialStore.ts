import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompletionRecord {
  lessonId: string;
  completedAt: string;
  stepCount: number;
  mistakeCount: number;
  durationSeconds: number;
}

export interface SpotlightTarget {
  elementId: string;
  type: 'pulse' | 'ring';
  narration?: string;
}

interface TutorialState {
  progress: Record<string, CompletionRecord>;
  currentLesson: string | null;
  currentStep: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  spotlight: SpotlightTarget | null;
  suggestedNext: string | null;
  isNarrationEnabled: boolean;
}

interface TutorialActions {
  startLesson: (lessonId: string) => void;
  advanceStep: () => void;
  completeLesson: (record: Omit<CompletionRecord, 'lessonId'>) => void;
  setSpotlight: (target: SpotlightTarget) => void;
  clearSpotlight: () => void;
  setSuggestedNext: (lessonId: string | null) => void;
  setSkillLevel: (level: TutorialState['skillLevel']) => void;
  toggleNarration: () => void;
}

type TutorialStore = TutorialState & TutorialActions;

/** Selector: derive totalCompleted from progress (do NOT use a getter inside Zustand state) */
export const selectTotalCompleted = (s: TutorialState) => Object.keys(s.progress).length;

// ── Store ──────────────────────────────────────────────────────────────────

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      progress: {},
      currentLesson: null,
      currentStep: 0,
      skillLevel: 'beginner',
      spotlight: null,
      suggestedNext: null,
      isNarrationEnabled: true,

      startLesson: (lessonId) =>
        set({ currentLesson: lessonId, currentStep: 0, spotlight: null }),

      advanceStep: () =>
        set((state) => ({ currentStep: state.currentStep + 1, spotlight: null })),

      completeLesson: (record) =>
        set((state) => {
          const lessonId = state.currentLesson;
          if (!lessonId) return state;
          return {
            progress: {
              ...state.progress,
              [lessonId]: { ...record, lessonId },
            },
            currentLesson: null,
            currentStep: 0,
            spotlight: null,
          };
        }),

      setSpotlight: (target) => set({ spotlight: target }),
      clearSpotlight: () => set({ spotlight: null }),
      setSuggestedNext: (lessonId) => set({ suggestedNext: lessonId }),
      setSkillLevel: (level) => set({ skillLevel: level }),
      toggleNarration: () => set((s) => ({ isNarrationEnabled: !s.isNarrationEnabled })),
    }),
    {
      name: 'jarvis-tutorials',
      partialize: (state) => ({
        progress: state.progress,
        skillLevel: state.skillLevel,
        isNarrationEnabled: state.isNarrationEnabled,
      }),
    }
  )
);
