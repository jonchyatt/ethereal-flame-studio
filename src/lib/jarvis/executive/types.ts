/**
 * Executive Function Types
 *
 * Type definitions for scheduling, briefings, and proactive nudges.
 * Part of Phase 5: Executive Function Core
 */

// =============================================================================
// Scheduling Types
// =============================================================================

/**
 * Scheduled event types
 */
export type ScheduledEventType =
  | 'morning_briefing'
  | 'midday_checkin'
  | 'evening_checkin'
  | 'evening_wrap'
  | 'weekly_review_reminder'
  | 'nudge';

/**
 * A scheduled event (briefing, check-in, wrap, or nudge)
 */
export interface ScheduledEvent {
  id: string;
  type: ScheduledEventType;
  time: string; // HH:mm format (e.g., "08:00")
  enabled: boolean;
  lastTriggered?: number; // Unix timestamp of last trigger
  dayOfWeek?: number; // 0=Sunday, 6=Saturday (for weekly events like weekly_review_reminder)
}

/**
 * Nudge event for time-based reminders (Plan 02)
 */
export interface NudgeEvent {
  id: string;
  source: 'calendar' | 'task' | 'bill' | 'habit';
  sourceId: string; // ID of the item triggering the nudge
  message: string;
  scheduledFor: number; // Unix timestamp
  leadTimeMinutes: number; // How far in advance to nudge
  acknowledged: boolean;
  acknowledgedAt?: number;
}

// =============================================================================
// Briefing Types
// =============================================================================

/**
 * Sections available in a briefing
 */
export type BriefingSection =
  | 'outline'
  | 'tasks'
  | 'calendar'
  | 'bills'
  | 'habits'
  | 'complete';

/**
 * Summary of a task for briefing (minimal fields for speech)
 */
export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  dueTime: string | null; // HH:mm format, null if just a date
  priority: string | null;
}

/**
 * Summary of a bill for briefing
 */
export interface BillSummary {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
}

/**
 * Summary of a habit for briefing
 */
export interface HabitSummary {
  id: string;
  title: string;
  frequency: string;
  streak: number;
  lastCompleted: string | null;
}

/**
 * Summary of a goal for briefing
 */
export interface GoalSummary {
  id: string;
  title: string;
  status: string;
  progress: number | null;
}

/**
 * Calendar event derived from tasks with specific due times
 */
export interface CalendarEvent {
  id: string;
  title: string;
  time: string; // Formatted time like "9:00 AM"
  isUpcoming: boolean; // Within the next hour
  sourceTaskId?: string; // If derived from a task
}

/**
 * Complete briefing data aggregated from Notion
 */
export interface BriefingData {
  tasks: {
    today: TaskSummary[];
    overdue: TaskSummary[];
  };
  bills: {
    thisWeek: BillSummary[];
    total: number;
  };
  habits: {
    active: HabitSummary[];
    streakSummary: string;
  };
  goals: {
    active: GoalSummary[];
  };
  calendar: {
    today: CalendarEvent[];
  };
  lifeAreas?: {
    insights: LifeAreaInsights;
  };
}

// =============================================================================
// Check-in Types (Plan 02)
// =============================================================================

/**
 * Check-in type for midday and evening reviews
 */
export type CheckInType = 'midday' | 'evening';

/**
 * Progress data for check-ins
 */
export interface CheckInProgress {
  tasksCompletedToday: number;
  totalTasksToday: number;
  overdueCount: number;
  newCaptures: string[]; // User-added items during check-in
}

// =============================================================================
// Active Briefing/Nudge State
// =============================================================================

/**
 * Active nudge state for store (displayed in NudgeOverlay)
 */
export interface NudgeState {
  id: string;
  message: string;
  type: 'calendar' | 'deadline' | 'bill' | 'business';
  timestamp: number;
  acknowledged: boolean;
}

/**
 * @deprecated Use NudgeState instead
 */
export interface ActiveNudge {
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// =============================================================================
// Evening Wrap Types (Plan 06-01)
// =============================================================================

/**
 * Sections available in an evening wrap
 */
export type EveningWrapSection =
  | 'outline'
  | 'dayReview'
  | 'taskUpdates'
  | 'newCaptures'
  | 'tomorrowPreview'
  | 'weekSummary'
  | 'financeCheck'
  | 'closing'
  | 'complete';

/**
 * Day review data for evening wrap
 */
export interface DayReviewData {
  completedTasks: TaskSummary[];
  incompleteTasks: TaskSummary[];
  completionRate: number; // 0-100 percentage
}

/**
 * Tomorrow preview data for evening wrap
 */
export interface TomorrowPreviewData {
  tasks: TaskSummary[];
  events: CalendarEvent[];
}

/**
 * Week summary data for evening wrap
 */
export interface WeekSummaryData {
  busyDays: string[]; // Day names with >5 tasks
  lightDays: string[]; // Day names with <2 tasks
  upcomingDeadlines: TaskSummary[]; // Tasks due within 7 days
}

/**
 * Complete evening wrap data
 */
export interface EveningWrapData extends BriefingData {
  dayReview: DayReviewData;
  tomorrow: TomorrowPreviewData;
  weekSummary: WeekSummaryData;
}

/**
 * Info about a missed scheduled prompt
 */
export interface MissedPromptInfo {
  type: 'evening_wrap' | 'weekly_review';
  missedDate: string; // YYYY-MM-DD format
}

// =============================================================================
// Life Area Types (Plan 06-02)
// =============================================================================

/**
 * Configuration for a life area
 * User-set importance and expected activity baseline
 */
export interface LifeAreaConfig {
  id: string;
  name: string;
  userPriority: number; // User-set importance (1-5)
  expectedActivityPerWeek: number; // User-set baseline tasks/week
  color?: string; // For visual display
}

/**
 * Activity history for a life area
 * Tracks daily activity counts for rolling window calculation
 */
export interface LifeAreaActivity {
  areaId: string;
  activityCounts: Record<string, number>; // ISO date (YYYY-MM-DD) -> count
}

/**
 * Neglect calculation result for a life area
 * Used to generate gentle awareness nudges
 */
export interface LifeAreaNeglect {
  areaId: string;
  areaName: string;
  neglectScore: number; // 0-1, higher = more neglected
  recentActivity: number; // Tasks in last 7 days
  baseline: number; // Expected tasks/week
  suggestedMessage: string; // "Health has been quiet this week"
}

/**
 * Complete life area insights for briefings
 */
export interface LifeAreaInsights {
  neglectedAreas: LifeAreaNeglect[];
  activeAreas: string[]; // Area names at or above baseline
  lastUpdated: number; // Unix timestamp
}

// =============================================================================
// Weekly Review Types (Plan 06-03)
// =============================================================================

/**
 * Sections available in a weekly review
 * Per CONTEXT.md: very brief retrospective, then mostly forward planning
 */
export type WeeklyReviewSection =
  | 'intro'
  | 'retrospective'
  | 'checkpoint1'      // "Anything to add about this week?"
  | 'upcomingWeek'
  | 'checkpoint2'      // "Anything to adjust?"
  | 'horizonScan'
  | 'checkpoint3'      // "Anything to add?"
  | 'lifeAreas'
  | 'closing'
  | 'complete';

/**
 * Complete weekly review data
 * Per CONTEXT.md: factual retrospective (no scorecard, no judgment), forward planning focus
 */
export interface WeeklyReviewData {
  retrospective: {
    tasksCompleted: number;
    billsPaid: number;
    projectsProgressed: string[];  // Project names that had activity
  };
  upcomingWeek: {
    taskCount: number;
    tasks: TaskSummary[];
    events: CalendarEvent[];
    busyDays: string[];
    lightDays: string[];
  };
  horizon: {
    deadlines: TaskSummary[];       // Due in 2-4 weeks
    upcomingBills: BillSummary[];   // Due in 2-4 weeks
    projectMilestones: string[];    // Notable upcoming items
  };
  lifeAreas: LifeAreaInsights;
}

/**
 * Configuration for weekly review scheduling
 */
export interface WeeklyReviewConfig {
  dayOfWeek: number;  // 0=Sunday, 6=Saturday (user-configurable)
  time: string;       // HH:mm format
}
