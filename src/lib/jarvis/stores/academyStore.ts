/**
 * Academy Store — Zustand (no persist)
 *
 * Tracks curriculum progress loaded from the DB via API.
 * No persist middleware — progress lives in the database.
 * Store is populated on Academy page mount via loadProgress().
 */

import { create } from 'zustand';
import { getAllProjects } from '../academy/projects';
import { getJarvisAPI, postJarvisAPI } from '../api/fetchWithAuth';
import type { AcademyProgressRow } from '../memory/schema';

// Re-export getNextSuggested for components
export { getNextSuggested } from '../academy/curriculum';

export interface TopicProgress {
  projectId: string;
  topicId: string;
  status: 'not_started' | 'explored' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  interactionCount: number;
}

interface AcademyState {
  progress: Record<string, TopicProgress>;  // key: "projectId:topicId"
  activeProject: string | null;
  isLoaded: boolean;
}

interface AcademyActions {
  loadProgress: () => Promise<void>;
  markExplored: (projectId: string, topicId: string) => Promise<void>;
  setActiveProject: (id: string) => void;
  refreshFromServer: (rows: AcademyProgressRow[]) => void;
}

type AcademyStore = AcademyState & AcademyActions;

function rowToProgress(row: AcademyProgressRow): TopicProgress {
  return {
    projectId: row.projectId,
    topicId: row.topicId,
    status: row.status as TopicProgress['status'],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    interactionCount: row.interactionCount,
  };
}

function rowsToRecord(rows: AcademyProgressRow[]): Record<string, TopicProgress> {
  const record: Record<string, TopicProgress> = {};
  for (const row of rows) {
    record[`${row.projectId}:${row.topicId}`] = rowToProgress(row);
  }
  return record;
}

export const useAcademyStore = create<AcademyStore>((set, get) => ({
  progress: {},
  activeProject: null,
  isLoaded: false,

  loadProgress: async () => {
    try {
      const res = await getJarvisAPI('/api/jarvis/academy/progress');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = (data.progress || []) as AcademyProgressRow[];
      set({ progress: rowsToRecord(rows), isLoaded: true });
    } catch (err) {
      console.error('[AcademyStore] Failed to load progress:', err);
      set({ isLoaded: true }); // Mark loaded even on error to avoid infinite retry
    }
  },

  markExplored: async (projectId: string, topicId: string) => {
    const key = `${projectId}:${topicId}`;
    const existing = get().progress[key];

    // Don't demote completed topics — only increment interaction count
    if (existing?.status === 'completed') {
      set((s) => ({
        progress: {
          ...s.progress,
          [key]: {
            ...existing,
            interactionCount: existing.interactionCount + 1,
          },
        },
      }));

      postJarvisAPI('/api/jarvis/academy/progress', {
          projectId,
          topicId,
          incrementInteraction: true,
        }).catch(err => console.error('[AcademyStore] Failed to save progress:', err));
      return;
    }

    // Optimistic update for non-completed topics
    set((s) => ({
      progress: {
        ...s.progress,
        [key]: {
          projectId,
          topicId,
          status: 'explored' as const,
          startedAt: existing?.startedAt || new Date().toISOString(),
          completedAt: existing?.completedAt || null,
          interactionCount: (existing?.interactionCount || 0) + 1,
        },
      },
    }));

    // Persist to server in background
    postJarvisAPI('/api/jarvis/academy/progress', {
        projectId,
        topicId,
        status: 'explored',
        incrementInteraction: true,
      }).catch(err => console.error('[AcademyStore] Failed to save progress:', err));
  },

  setActiveProject: (id: string) => set({ activeProject: id }),

  refreshFromServer: (rows: AcademyProgressRow[]) => {
    set({ progress: rowsToRecord(rows), isLoaded: true });
  },
}));

// ── Selectors ──────────────────────────────────────────────────────────────

export const selectProjectProgress = (projectId: string) => (s: AcademyState) =>
  Object.values(s.progress).filter(p => p.projectId === projectId);

export const selectCompletedCount = (projectId: string) => (s: AcademyState) =>
  Object.values(s.progress).filter(p => p.projectId === projectId && p.status === 'completed').length;

export const selectTotalAcademyCompleted = (s: AcademyState) =>
  Object.values(s.progress).filter(p => p.status === 'completed').length;

/** Static count — projects are a const registry. Not a Zustand selector. */
export const getTotalAcademyTopics = () =>
  getAllProjects().reduce((sum, p) => sum + (p.curriculum?.length || 0), 0);
