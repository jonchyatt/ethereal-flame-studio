/**
 * Daily Logs Query Functions
 *
 * Event logging within sessions per CONTEXT.md:
 * - session_start: timestamp, source
 * - session_end: timestamp, duration, trigger
 * - tool_invocation: tool name, success/failure, brief context
 * - topic_change: new topic label when conversation shifts
 * - user_state: when user expresses sentiment
 *
 * NOT logged: every utterance, routine acknowledgments, full responses
 */

import { eq, desc, and, gt, lt } from 'drizzle-orm';
import { db } from '../db';
import { dailyLogs, type DailyLog, type NewDailyLog } from '../schema';

// Event type union per CONTEXT.md
export type EventType =
  | 'session_start'
  | 'session_end'
  | 'tool_invocation'
  | 'topic_change'
  | 'user_state';

// Event data structures for type safety
export interface SessionStartData {
  source: 'morning_briefing' | 'user_initiated' | 'return_after_gap';
}

export interface SessionEndData {
  duration: number; // minutes
  trigger: 'timeout' | 'explicit' | 'browser_close';
}

export interface ToolInvocationData {
  toolName: string;
  success: boolean;
  context?: string;
  error?: string;
}

export interface TopicChangeData {
  topic: string;
  previousTopic?: string;
}

export interface UserStateData {
  sentiment: string; // "feeling overwhelmed", "good day", etc.
  context?: string;
}

export type EventData =
  | SessionStartData
  | SessionEndData
  | ToolInvocationData
  | TopicChangeData
  | UserStateData;

/**
 * Log an event within a session.
 *
 * @param sessionId - Session this event belongs to
 * @param eventType - Type of event
 * @param eventData - Event-specific data (will be JSON stringified)
 * @returns The created log entry
 */
export async function logEvent(
  sessionId: number,
  eventType: EventType,
  eventData: EventData
): Promise<DailyLog> {
  const inserted = await db
    .insert(dailyLogs)
    .values({
      sessionId,
      eventType,
      eventData: JSON.stringify(eventData),
      // timestamp has default from schema
    })
    .returning();

  return inserted[0];
}

/**
 * Get all events for a session.
 *
 * @param sessionId - Session ID
 * @returns Array of events, chronological order
 */
export async function getSessionEvents(sessionId: number): Promise<DailyLog[]> {
  return db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.sessionId, sessionId))
    .orderBy(dailyLogs.timestamp);
}

/**
 * Get events from today (for daily summary).
 *
 * @returns Array of today's events, chronological order
 */
export async function getTodayEvents(): Promise<DailyLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  return db
    .select()
    .from(dailyLogs)
    .where(gt(dailyLogs.timestamp, todayISO))
    .orderBy(dailyLogs.timestamp);
}

/**
 * Get events by type (for analysis).
 *
 * @param eventType - Type to filter by
 * @param limit - Maximum events to return (default 50)
 * @returns Array of events of that type
 */
export async function getEventsByType(
  eventType: EventType,
  limit = 50
): Promise<DailyLog[]> {
  return db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.eventType, eventType))
    .orderBy(desc(dailyLogs.timestamp))
    .limit(limit);
}

/**
 * Parse eventData JSON back to typed object.
 * Returns null if parsing fails.
 *
 * @param eventData - JSON string from database
 * @returns Parsed data or null
 */
export function parseEventData<T extends EventData>(eventData: string | null): T | null {
  if (!eventData) {
    return null;
  }

  try {
    return JSON.parse(eventData) as T;
  } catch {
    return null;
  }
}

/**
 * Get events in a date range (for weekly review).
 *
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (exclusive)
 * @returns Array of events in range
 */
export async function getEventsInRange(
  startDate: Date,
  endDate: Date
): Promise<DailyLog[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  return db
    .select()
    .from(dailyLogs)
    .where(and(gt(dailyLogs.timestamp, startISO), lt(dailyLogs.timestamp, endISO)))
    .orderBy(dailyLogs.timestamp);
}

/**
 * Get the most recent event of a specific type.
 *
 * @param eventType - Type to find
 * @returns Most recent event or undefined
 */
export async function getLastEventOfType(
  eventType: EventType
): Promise<DailyLog | undefined> {
  const results = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.eventType, eventType))
    .orderBy(desc(dailyLogs.timestamp))
    .limit(1);

  return results[0];
}

/**
 * Get recent tool invocations for "what did you do?" queries.
 *
 * @param limit - Maximum entries to return (default 10)
 * @param sessionId - Optional filter to specific session
 * @returns Array of tool invocations with parsed data
 */
export async function getRecentToolInvocations(
  limit = 10,
  sessionId?: number
): Promise<Array<{
  toolName: string;
  success: boolean;
  context?: string;
  error?: string;
  timestamp: string;
}>> {
  // Add session filter if provided
  const results = sessionId
    ? await db
        .select()
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.eventType, 'tool_invocation'),
            eq(dailyLogs.sessionId, sessionId)
          )
        )
        .orderBy(desc(dailyLogs.timestamp))
        .limit(limit)
    : await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.eventType, 'tool_invocation'))
        .orderBy(desc(dailyLogs.timestamp))
        .limit(limit);

  return results.map(log => {
    const data = parseEventData<ToolInvocationData>(log.eventData);
    return {
      toolName: data?.toolName || 'unknown',
      success: data?.success ?? false,
      context: data?.context,
      error: data?.error,
      timestamp: log.timestamp,
    };
  });
}
