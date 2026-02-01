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
 * A scheduled event (briefing, check-in, or nudge)
 */
export interface ScheduledEvent {
  id: string;
  type: 'morning_briefing' | 'midday_checkin' | 'evening_checkin' | 'nudge';
  time: string; // HH:mm format (e.g., "08:00")
  enabled: boolean;
  lastTriggered?: number; // Unix timestamp of last trigger
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
 * Active nudge state for store
 */
export interface ActiveNudge {
  message: string;
  timestamp: number;
  acknowledged: boolean;
}
