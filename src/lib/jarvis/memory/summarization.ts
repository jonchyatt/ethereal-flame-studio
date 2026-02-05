/**
 * Conversation Summarization
 *
 * Async summarization of session conversations via Claude Haiku.
 * Used to create concise session summaries for cross-session continuity.
 *
 * Both functions are fire-and-forget — they never block the response.
 */

import Anthropic from '@anthropic-ai/sdk';
import { eq, lt, desc } from 'drizzle-orm';
import { db } from './db';
import { sessions } from './schema';
import { getSessionMessages, getSessionMessageCount } from './queries/messages';

const SUMMARIZATION_MIN_MESSAGES = 15;

/**
 * Summarize a session's conversation and store the result.
 *
 * Skips if:
 * - Session already has a summary
 * - Session has fewer than 15 messages (not enough to summarize)
 *
 * @param sessionId - Session to summarize
 */
export async function triggerSummarization(sessionId: number): Promise<void> {
  // Check if already summarized
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.summary) return;

  // Check message count
  const msgCount = await getSessionMessageCount(sessionId);
  if (msgCount < SUMMARIZATION_MIN_MESSAGES) return;

  // Load messages (up to 40)
  const msgs = await getSessionMessages(sessionId, 40);
  if (msgs.length === 0) return;

  // Format as transcript
  const transcript = msgs
    .map(m => `${m.role === 'user' ? 'User' : 'Jarvis'}: ${m.content}`)
    .join('\n');

  // Call Claude Haiku for summarization
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 256,
    system: 'You are a conversation summarizer. Output ONLY the summary, nothing else.',
    messages: [{
      role: 'user',
      content: `Summarize this conversation between a user and their AI assistant Jarvis. Focus on key topics discussed, decisions made, tasks mentioned, and important facts learned. 2-4 sentences.\n\n${transcript}`,
    }],
  });

  const summary = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  if (!summary) return;

  // Save summary to session
  await db
    .update(sessions)
    .set({ summary })
    .where(eq(sessions.id, sessionId));

  console.log(`[Summarization] Session ${sessionId} summarized: ${summary.length} chars`);
}

/**
 * Backfill-summarize the previous session if it was missed.
 *
 * Called when a new session starts. Checks if the most recent previous session
 * has enough messages but no summary, and triggers summarization if so.
 *
 * This covers the case where a user had 18 messages, closed the browser,
 * and the 20-message threshold was never hit during that session.
 *
 * @param currentSessionId - The just-created session ID
 */
export async function backfillSummarization(currentSessionId: number): Promise<void> {
  // Find most recent session before current
  const [prevSession] = await db
    .select()
    .from(sessions)
    .where(lt(sessions.id, currentSessionId))
    .orderBy(desc(sessions.id))
    .limit(1);

  if (!prevSession) return;

  // Only backfill if no summary exists
  if (prevSession.summary) return;

  await triggerSummarization(prevSession.id);
}
