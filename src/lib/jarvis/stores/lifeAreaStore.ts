/**
 * Life Area Store - Zustand store for life area weights and activity tracking
 *
 * Persists user-configured life area priorities and activity history
 * for rolling window neglect calculation.
 *
 * Per RESEARCH.md:
 * - Uses skipHydration: true to avoid SSR hydration issues
 * - Activity recording is idempotent per (taskId, date) pair
 * - Rolling 28-day window for baseline calculation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LifeAreaConfig, LifeAreaActivity } from '../executive/types';

// =============================================================================
// Default Life Areas
// =============================================================================

/**
 * Default life area configurations
 * These can be extended from Notion later
 */
const DEFAULT_LIFE_AREAS: Record<string, LifeAreaConfig> = {
  health: {
    id: 'health',
    name: 'Health',
    userPriority: 4,
    expectedActivityPerWeek: 5,
    color: '#22c55e', // green
  },
  work: {
    id: 'work',
    name: 'Work',
    userPriority: 4,
    expectedActivityPerWeek: 15,
    color: '#3b82f6', // blue
  },
  relationships: {
    id: 'relationships',
    name: 'Relationships',
    userPriority: 4,
    expectedActivityPerWeek: 3,
    color: '#ec4899', // pink
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    userPriority: 3,
    expectedActivityPerWeek: 2,
    color: '#eab308', // yellow
  },
  personal: {
    id: 'personal',
    name: 'Personal Growth',
    userPriority: 3,
    expectedActivityPerWeek: 3,
    color: '#a855f7', // purple
  },
  home: {
    id: 'home',
    name: 'Home',
    userPriority: 3,
    expectedActivityPerWeek: 3,
    color: '#f97316', // orange
  },
};

// =============================================================================
// Store State & Actions
// =============================================================================

interface LifeAreaState {
  /** Life area configurations (keyed by areaId) */
  areas: Record<string, LifeAreaConfig>;

  /** Activity history per area */
  activityHistory: LifeAreaActivity[];

  /**
   * Track which (taskId, date) pairs have been recorded
   * Prevents double-counting per RESEARCH.md pitfall #3
   * Format: "taskId:YYYY-MM-DD"
   */
  recordedActivities: Set<string>;
}

interface LifeAreaActions {
  /** Update configuration for a life area */
  setAreaConfig: (areaId: string, config: Partial<LifeAreaConfig>) => void;

  /**
   * Record activity for a life area (idempotent per taskId + date)
   * @param areaId - The life area ID
   * @param taskId - The task ID (for idempotency)
   */
  recordActivity: (areaId: string, taskId: string) => void;

  /**
   * Get activity count for an area over a number of days
   * @param areaId - The life area ID
   * @param days - Number of days to sum (e.g., 7 for last week)
   */
  getActivityForArea: (areaId: string, days: number) => number;

  /**
   * Prune activity data older than 30 days
   * Called periodically to keep storage lean
   */
  clearOldActivity: () => void;

  /** Get all configured areas */
  getAreas: () => Record<string, LifeAreaConfig>;

  /** Add a new life area */
  addArea: (config: LifeAreaConfig) => void;

  /** Remove a life area */
  removeArea: (areaId: string) => void;
}

type LifeAreaStore = LifeAreaState & LifeAreaActions;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get ISO date string for today (YYYY-MM-DD)
 */
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get ISO date string for N days ago
 */
function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date string is within the last N days
 */
function isWithinDays(dateISO: string, days: number): boolean {
  const cutoff = getDateNDaysAgo(days);
  return dateISO >= cutoff;
}

// =============================================================================
// Store Creation
// =============================================================================

export const useLifeAreaStore = create<LifeAreaStore>()(
  persist(
    (set, get) => ({
      // Initial state
      areas: { ...DEFAULT_LIFE_AREAS },
      activityHistory: [],
      recordedActivities: new Set<string>(),

      // Actions
      setAreaConfig: (areaId, config) =>
        set((state) => ({
          areas: {
            ...state.areas,
            [areaId]: {
              ...state.areas[areaId],
              ...config,
            },
          },
        })),

      recordActivity: (areaId, taskId) => {
        const today = getTodayISO();
        const recordKey = `${taskId}:${today}`;

        // Check if already recorded (idempotency)
        if (get().recordedActivities.has(recordKey)) {
          console.log(`[LifeAreaStore] Activity already recorded: ${recordKey}`);
          return;
        }

        set((state) => {
          // Find or create activity record for this area
          const existingIndex = state.activityHistory.findIndex(
            (a) => a.areaId === areaId
          );

          let newActivityHistory: LifeAreaActivity[];

          if (existingIndex >= 0) {
            // Update existing record
            const existing = state.activityHistory[existingIndex];
            const newCounts = {
              ...existing.activityCounts,
              [today]: (existing.activityCounts[today] || 0) + 1,
            };

            newActivityHistory = [
              ...state.activityHistory.slice(0, existingIndex),
              { ...existing, activityCounts: newCounts },
              ...state.activityHistory.slice(existingIndex + 1),
            ];
          } else {
            // Create new record
            newActivityHistory = [
              ...state.activityHistory,
              {
                areaId,
                activityCounts: { [today]: 1 },
              },
            ];
          }

          // Mark as recorded
          const newRecordedActivities = new Set(state.recordedActivities);
          newRecordedActivities.add(recordKey);

          return {
            activityHistory: newActivityHistory,
            recordedActivities: newRecordedActivities,
          };
        });

        console.log(`[LifeAreaStore] Recorded activity for ${areaId}: ${taskId}`);
      },

      getActivityForArea: (areaId, days) => {
        const state = get();
        const activity = state.activityHistory.find((a) => a.areaId === areaId);

        if (!activity) return 0;

        // Sum activity counts within the date range
        let total = 0;
        const cutoff = getDateNDaysAgo(days);

        for (const [dateISO, count] of Object.entries(activity.activityCounts)) {
          if (dateISO >= cutoff) {
            total += count;
          }
        }

        return total;
      },

      clearOldActivity: () => {
        const MAX_DAYS = 30;

        set((state) => {
          // Clean activity counts
          const newActivityHistory = state.activityHistory.map((activity) => {
            const newCounts: Record<string, number> = {};

            for (const [dateISO, count] of Object.entries(activity.activityCounts)) {
              if (isWithinDays(dateISO, MAX_DAYS)) {
                newCounts[dateISO] = count;
              }
            }

            return { ...activity, activityCounts: newCounts };
          });

          // Clean recorded activities set
          const newRecordedActivities = new Set<string>();
          const cutoff = getDateNDaysAgo(MAX_DAYS);

          for (const key of state.recordedActivities) {
            const dateISO = key.split(':').pop() || '';
            if (dateISO >= cutoff) {
              newRecordedActivities.add(key);
            }
          }

          return {
            activityHistory: newActivityHistory,
            recordedActivities: newRecordedActivities,
          };
        });

        console.log('[LifeAreaStore] Cleared old activity data');
      },

      getAreas: () => get().areas,

      addArea: (config) =>
        set((state) => ({
          areas: {
            ...state.areas,
            [config.id]: config,
          },
        })),

      removeArea: (areaId) =>
        set((state) => {
          const newAreas = { ...state.areas };
          delete newAreas[areaId];
          return { areas: newAreas };
        }),
    }),
    {
      name: 'jarvis-life-areas',
      storage: createJSONStorage(() => localStorage),
      // Use skipHydration to avoid SSR hydration issues per RESEARCH.md
      skipHydration: true,
      partialize: (state) => ({
        areas: state.areas,
        activityHistory: state.activityHistory,
        // Convert Set to Array for JSON serialization
        recordedActivities: Array.from(state.recordedActivities),
      }),
      // Restore Set from Array when loading
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<LifeAreaState> & {
          recordedActivities?: string[];
        };

        return {
          ...current,
          ...persistedState,
          recordedActivities: new Set(persistedState.recordedActivities || []),
        };
      },
    }
  )
);

// =============================================================================
// Hydration Helper
// =============================================================================

/**
 * Manually trigger hydration from localStorage
 * Call this in useEffect on the client side
 */
export function hydrateLifeAreaStore(): void {
  useLifeAreaStore.persist.rehydrate();
}
