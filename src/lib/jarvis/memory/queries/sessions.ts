/**
 * Sessions Query Functions
 *
 * Session lifecycle management for Jarvis conversations.
 * Session boundaries per CONTEXT.md:
 * - Ends: 30+ min inactivity, explicit close, browser close
 * - Starts: User returns after gap, morning briefing, explicit greeting
 */

import { eq, desc, isNull, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { sessions, type Session, type NewSession } from '../schema';

// End trigger type union (matches schema comments)
export type EndTrigger = 'timeout' | 'explicit' | 'browser_close';

/**
 * Start a new session.
 *
 * @returns The new session with ID
 */
export async function startSession(): Promise<Session> {
  const inserted = await db
    .insert(sessions)
    .values({
      // startedAt has default from schema
    })
    .returning();

  return inserted[0];
}

/**
 * End a session.
 *
 * @param sessionId - Session ID to end
 * @param trigger - What caused the session to end
 * @param summary - Optional summary for weekly review
 */
export async function endSession(
  sessionId: number,
  trigger: EndTrigger,
  summary?: string
): Promise<void> {
  await db
    .update(sessions)
    .set({
      endedAt: new Date().toISOString(),
      endTrigger: trigger,
      summary,
    })
    .where(eq(sessions.id, sessionId));
}

/**
 * Get the currently active session (no endedAt).
 *
 * @returns Active session or null if none
 */
export async function getActiveSession(): Promise<Session | null> {
  const results = await db
    .select()
    .from(sessions)
    .where(isNull(sessions.endedAt))
    .orderBy(desc(sessions.startedAt))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Get or create an active session.
 * If no active session exists, creates a new one.
 *
 * @returns Active or newly created session
 */
export async function getOrCreateSession(): Promise<Session> {
  const active = await getActiveSession();
  if (active) {
    return active;
  }
  return startSession();
}

/**
 * Get recent sessions (for weekly review, debugging).
 *
 * @param limit - Maximum sessions to return (default 10)
 * @returns Array of sessions, most recent first
 */
export async function getRecentSessions(limit = 10): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
}

/**
 * Get session by ID.
 *
 * @param id - Session ID
 * @returns Session or undefined
 */
export async function getSessionById(id: number): Promise<Session | undefined> {
  const results = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  return results[0];
}

/**
 * Get sessions from today (for daily summary).
 *
 * @returns Array of today's sessions
 */
export async function getTodaySessions(): Promise<Session[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  return db
    .select()
    .from(sessions)
    .where(gt(sessions.startedAt, todayISO))
    .orderBy(desc(sessions.startedAt));
}

/**
 * Calculate session duration in minutes.
 *
 * @param session - Session to calculate duration for
 * @returns Duration in minutes, or null if session still active
 */
export function calculateSessionDuration(session: Session): number | null {
  if (!session.endedAt) {
    return null;
  }

  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt).getTime();
  return Math.round((end - start) / 60000); // Convert ms to minutes
}
