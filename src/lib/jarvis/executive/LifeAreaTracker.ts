/**
 * LifeAreaTracker - Service for life area activity tracking and neglect calculation
 *
 * Calculates neglect relative to user baseline, surfaces gentle awareness nudges
 * per CONTEXT.md: "gentle nudge only - awareness, not aggressive prioritization"
 *
 * Rolling window approach per RESEARCH.md:
 * - 28-day (4-week) window for baseline calculation
 * - 7-day window for recent activity comparison
 * - Neglect threshold: relative to user's baseline activity pattern
 */

import { useLifeAreaStore } from '../stores/lifeAreaStore';
import type {
  LifeAreaNeglect,
  LifeAreaInsights,
  LifeAreaConfig,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

/** Rolling window for baseline calculation (4 weeks) */
const ROLLING_WINDOW_DAYS = 28;

/** Recent window for activity comparison (1 week) */
const RECENT_WINDOW_DAYS = 7;

/** Minimum neglect score to report (0.3 = 30% below baseline) */
const NEGLECT_THRESHOLD = 0.3;

/** Maximum number of neglected areas to surface (avoid overwhelm) */
const MAX_NEGLECTED_AREAS = 3;

// =============================================================================
// LifeAreaTracker Class
// =============================================================================

export class LifeAreaTracker {
  /**
   * Calculate neglect for a specific life area
   *
   * @param areaId - The life area ID
   * @returns LifeAreaNeglect if significantly neglected, null otherwise
   */
  calculateNeglect(areaId: string): LifeAreaNeglect | null {
    const store = useLifeAreaStore.getState();
    const areas = store.getAreas();
    const area = areas[areaId];

    if (!area) {
      console.warn(`[LifeAreaTracker] Unknown area: ${areaId}`);
      return null;
    }

    // Get recent activity (last 7 days)
    const recentActivity = store.getActivityForArea(areaId, RECENT_WINDOW_DAYS);

    // Get rolling window activity (last 28 days)
    const rollingActivity = store.getActivityForArea(areaId, ROLLING_WINDOW_DAYS);

    // Calculate baselines
    // Calculated baseline: 4-week rolling average, scaled to weekly
    const calculatedBaseline = (rollingActivity / ROLLING_WINDOW_DAYS) * 7;

    // Use user baseline if set, otherwise calculated baseline
    const effectiveBaseline = area.expectedActivityPerWeek || calculatedBaseline;

    // If baseline is 0 or very low, can't calculate meaningful neglect
    if (effectiveBaseline < 0.5) {
      return null;
    }

    // Calculate neglect score: how far below baseline
    // Formula: (baseline - recent) / baseline
    // Range: 0 (at or above baseline) to 1 (no activity at all)
    const neglectScore = Math.max(
      0,
      (effectiveBaseline - recentActivity) / effectiveBaseline
    );

    // Only report if significantly neglected
    if (neglectScore < NEGLECT_THRESHOLD) {
      return null;
    }

    // Generate suggested message based on score
    const suggestedMessage = this.generateMessage(area.name, neglectScore);

    return {
      areaId,
      areaName: area.name,
      neglectScore,
      recentActivity,
      baseline: effectiveBaseline,
      suggestedMessage,
    };
  }

  /**
   * Get all neglected life areas, sorted by neglect score
   *
   * @returns Array of neglected areas (max 3 to avoid overwhelm)
   */
  getNeglectedAreas(): LifeAreaNeglect[] {
    const store = useLifeAreaStore.getState();
    const areas = store.getAreas();

    const neglectedAreas: LifeAreaNeglect[] = [];

    for (const areaId of Object.keys(areas)) {
      const neglect = this.calculateNeglect(areaId);
      if (neglect) {
        neglectedAreas.push(neglect);
      }
    }

    // Sort by neglect score descending (most neglected first)
    neglectedAreas.sort((a, b) => b.neglectScore - a.neglectScore);

    // Return top 3 to avoid overwhelming the user
    return neglectedAreas.slice(0, MAX_NEGLECTED_AREAS);
  }

  /**
   * Get complete life area insights for briefings
   *
   * @returns LifeAreaInsights with neglected and active areas
   */
  getLifeAreaInsights(): LifeAreaInsights {
    const store = useLifeAreaStore.getState();
    const areas = store.getAreas();

    const neglectedAreas = this.getNeglectedAreas();
    const neglectedIds = new Set(neglectedAreas.map((a) => a.areaId));

    // Find active areas (at or above baseline)
    const activeAreas: string[] = [];

    for (const areaId of Object.keys(areas)) {
      if (neglectedIds.has(areaId)) continue;

      const area = areas[areaId];
      const recentActivity = store.getActivityForArea(areaId, RECENT_WINDOW_DAYS);
      const baseline = area.expectedActivityPerWeek || 1;

      // Consider active if at or above 70% of baseline
      if (recentActivity >= baseline * 0.7) {
        activeAreas.push(area.name);
      }
    }

    return {
      neglectedAreas,
      activeAreas,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Record task completion for a life area
   *
   * @param taskId - The task ID (for idempotency)
   * @param areaId - The life area ID (optional - could infer from task)
   */
  recordTaskCompletion(taskId: string, areaId?: string): void {
    if (!areaId) {
      // Future: Could infer area from task's Area relation in Notion
      console.log(`[LifeAreaTracker] No areaId provided for task ${taskId}, skipping`);
      return;
    }

    const store = useLifeAreaStore.getState();
    const areas = store.getAreas();

    if (!areas[areaId]) {
      console.warn(`[LifeAreaTracker] Unknown area: ${areaId}`);
      return;
    }

    // Record activity (idempotent per taskId + date)
    store.recordActivity(areaId, taskId);
    console.log(`[LifeAreaTracker] Recorded completion for ${areaId}: ${taskId}`);
  }

  /**
   * Get all configured life areas
   *
   * @returns Record of area configs keyed by areaId
   */
  getAreas(): Record<string, LifeAreaConfig> {
    return useLifeAreaStore.getState().getAreas();
  }

  /**
   * Generate a gentle suggested message based on neglect score
   *
   * Per CONTEXT.md: gentle nudge only - awareness, not aggressive prioritization
   *
   * @param areaName - Name of the life area
   * @param neglectScore - Neglect score (0-1)
   * @returns A gentle awareness message
   */
  private generateMessage(areaName: string, neglectScore: number): string {
    if (neglectScore >= 0.7) {
      // High neglect: gentle but noticeable
      return `${areaName} hasn't seen activity recently`;
    } else if (neglectScore >= 0.5) {
      // Medium neglect: subtle awareness
      return `${areaName} could use some attention`;
    } else {
      // Low neglect (0.3-0.5): very gentle
      return `${areaName} has been quiet this week`;
    }
  }

  /**
   * Perform maintenance tasks (prune old data)
   * Should be called periodically (e.g., once per day)
   */
  performMaintenance(): void {
    const store = useLifeAreaStore.getState();
    store.clearOldActivity();
    console.log('[LifeAreaTracker] Maintenance complete');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: LifeAreaTracker | null = null;

/**
 * Get the singleton LifeAreaTracker instance
 */
export function getLifeAreaTracker(): LifeAreaTracker {
  if (!instance) {
    instance = new LifeAreaTracker();
  }
  return instance;
}

/**
 * Destroy the singleton (for testing)
 */
export function destroyLifeAreaTracker(): void {
  instance = null;
}
