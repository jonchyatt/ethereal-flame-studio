/**
 * Messages Query Functions
 *
 * CRUD operations for the messages table + cross-session history loading.
 * Enables conversation continuity across browser sessions.
 *
 * Key design: loadConversationHistory loads PREVIOUS session context only.
 * The client already sends current session messages in the request body.
 */

import { eq, desc, lt, asc, count } from 'drizzle-orm';
import { db } from '../db';
import { messages, sessions, type MessageRow } from '../schema';

/**
 * Save a single message to the database.
 *
 * @param sessionId - Session this message belongs to
 * @param role - 'user' or 'assistant'
 * @param content - Message text content
 * @returns The inserted message row
 */
export async function saveMessage(
  sessionId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<MessageRow> {
  const result = await db
    .insert(messages)
    .values({ sessionId, role, content })
    .returning();
  return result[0];
}

/**
 * Get messages for a session, chronological order.
 *
 * @param sessionId - Session ID
 * @param limit - Max messages to return (default 50)
 * @returns Messages oldest-first
 */
export async function getSessionMessages(
  sessionId: number,
  limit = 50
): Promise<MessageRow[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
}

/**
 * Count messages in a session. Used to trigger summarization.
 *
 * @param sessionId - Session ID
 * @returns Message count
 */
export async function getSessionMessageCount(sessionId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.sessionId, sessionId));
  return result[0]?.count ?? 0;
}

/**
 * Format a relative time string like "2 hours ago" or "yesterday".
 */
function formatAge(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

/**
 * Load conversation history from PREVIOUS sessions for cross-session continuity.
 *
 * This loads only previous session context — the current session's messages
 * are already in the request body from the client's ConversationManager.
 *
 * Priority:
 * 1. Previous session summary (concise, ideal)
 * 2. Fallback: last N raw messages from previous session
 *
 * @param currentSessionId - The current session ID (excluded from results)
 * @param tokenBudget - Max tokens for history (default 2000)
 * @param maxMessages - Max raw messages to load as fallback (default 5)
 * @returns Formatted history string, or empty string if no prior session
 */
export async function loadConversationHistory(
  currentSessionId: number,
  tokenBudget: number = 2000,
  maxMessages: number = 5
): Promise<string> {
  const CHARS_PER_TOKEN = 4;
  const maxChars = tokenBudget * CHARS_PER_TOKEN;
  const lines: string[] = [];
  let charCount = 0;

  // Find previous sessions (NOT current), most recent first
  const previousSessions = await db
    .select()
    .from(sessions)
    .where(lt(sessions.id, currentSessionId))
    .orderBy(desc(sessions.id))
    .limit(3);

  if (previousSessions.length === 0) return '';

  const prevSession = previousSessions[0];

  // Use summary if available (ideal — concise)
  if (prevSession.summary) {
    const summaryLine = `Last session (${formatAge(prevSession.startedAt)}): ${prevSession.summary}`;
    if (summaryLine.length <= maxChars) {
      lines.push(summaryLine);
      charCount += summaryLine.length;
    }
  } else {
    // No summary — load last N messages from previous session as fallback
    const prevMessages = await getSessionMessages(prevSession.id, maxMessages);
    if (prevMessages.length > 0) {
      const header = `From last session (${formatAge(prevSession.startedAt)}):`;
      lines.push(header);
      charCount += header.length;

      for (const msg of prevMessages) {
        const label = msg.role === 'user' ? 'User' : 'Jarvis';
        const line = `  ${label}: ${msg.content}`;
        if (charCount + line.length > maxChars) break;
        lines.push(line);
        charCount += line.length;
      }
    }
  }

  return lines.join('\n');
}
