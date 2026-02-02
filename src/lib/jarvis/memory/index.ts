/**
 * Jarvis Memory System - Public Facade
 *
 * Single entry point for all memory operations.
 * Re-exports database, schema, and query functions.
 * Provides MemoryService class with convenient static methods.
 */

// Re-export database client
export { db } from './db';

// Re-export schema and types
export * from './schema';

// Re-export query functions
export * from './queries/memoryEntries';
export * from './queries/sessions';
export * from './queries/dailyLogs';

// Import for MemoryService implementation
import {
  storeMemoryEntry,
  type MemoryCategory,
  type MemorySource,
} from './queries/memoryEntries';
import {
  startSession,
  endSession,
  getOrCreateSession,
  type EndTrigger,
} from './queries/sessions';
import {
  logEvent,
  type EventType,
  type EventData,
  type SessionStartData,
  type SessionEndData,
  type ToolInvocationData,
  type TopicChangeData,
  type UserStateData,
} from './queries/dailyLogs';

/**
 * MemoryService - High-level facade for common memory operations
 *
 * Simplifies the most frequent use cases:
 * - Session management (init/close)
 * - Storing facts
 * - Logging events
 */
export class MemoryService {
  /**
   * Initialize or resume a session.
   * Gets existing active session or creates a new one.
   * Logs session_start event if new session created.
   *
   * @param source - What triggered this session
   * @returns Session ID
   */
  static async initSession(
    source: SessionStartData['source'] = 'user_initiated'
  ): Promise<number> {
    const session = await getOrCreateSession();

    // Check if this is a newly created session (no events yet)
    // If startedAt is within last second, it's new
    const isNew =
      new Date().getTime() - new Date(session.startedAt).getTime() < 1000;

    if (isNew) {
      await logEvent(session.id, 'session_start', { source });
    }

    return session.id;
  }

  /**
   * Close the current session.
   * Logs session_end event and updates session record.
   *
   * @param sessionId - Session to close
   * @param trigger - What ended the session
   * @param summary - Optional summary for weekly review
   */
  static async closeSession(
    sessionId: number,
    trigger: EndTrigger,
    summary?: string
  ): Promise<void> {
    // Calculate duration from session start
    const { getSessionById, calculateSessionDuration } = await import(
      './queries/sessions'
    );
    const session = await getSessionById(sessionId);

    if (session) {
      const startTime = new Date(session.startedAt).getTime();
      const duration = Math.round((Date.now() - startTime) / 60000);

      await logEvent(sessionId, 'session_end', { duration, trigger });
      await endSession(sessionId, trigger, summary);
    }
  }

  /**
   * Store a fact that Jarvis should remember.
   * Handles deduplication automatically.
   *
   * @param content - The fact to remember
   * @param category - Type of fact
   * @param source - How the fact was learned
   * @returns The stored entry (new or existing)
   */
  static async remember(
    content: string,
    category: MemoryCategory = 'fact',
    source: MemorySource = 'user_explicit'
  ) {
    return storeMemoryEntry(content, category, source);
  }

  /**
   * Log a significant event in the current session.
   *
   * @param sessionId - Session this event belongs to
   * @param eventType - Type of event
   * @param eventData - Event-specific data
   */
  static async logSessionEvent(
    sessionId: number,
    eventType: EventType,
    eventData: EventData
  ) {
    return logEvent(sessionId, eventType, eventData);
  }

  /**
   * Log a tool invocation.
   *
   * @param sessionId - Session ID
   * @param toolName - Name of the tool
   * @param success - Whether the invocation succeeded
   * @param context - Optional context
   * @param error - Optional error message
   */
  static async logToolUse(
    sessionId: number,
    toolName: string,
    success: boolean,
    context?: string,
    error?: string
  ) {
    const data: ToolInvocationData = {
      toolName,
      success,
      ...(context && { context }),
      ...(error && { error }),
    };
    return logEvent(sessionId, 'tool_invocation', data);
  }

  /**
   * Log a topic change.
   *
   * @param sessionId - Session ID
   * @param topic - New topic
   * @param previousTopic - Previous topic (optional)
   */
  static async logTopicChange(
    sessionId: number,
    topic: string,
    previousTopic?: string
  ) {
    const data: TopicChangeData = {
      topic,
      ...(previousTopic && { previousTopic }),
    };
    return logEvent(sessionId, 'topic_change', data);
  }

  /**
   * Log user state/sentiment.
   *
   * @param sessionId - Session ID
   * @param sentiment - User's expressed state
   * @param context - Optional context
   */
  static async logUserState(
    sessionId: number,
    sentiment: string,
    context?: string
  ) {
    const data: UserStateData = {
      sentiment,
      ...(context && { context }),
    };
    return logEvent(sessionId, 'user_state', data);
  }
}
