/**
 * Jarvis Memory System - Database Schema
 *
 * Three tables:
 * - memory_entries: Contextual facts for briefings/nudges/check-ins
 * - sessions: Conversation session tracking
 * - daily_logs: Significant events within sessions
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Memory entries - Facts that help Jarvis do its job
 *
 * Categories: preference, fact, pattern
 * Sources: user_explicit (user said "remember X"), jarvis_inferred
 *
 * Deduplication: content_hash enables silent updates when same fact restated
 */
export const memoryEntries = sqliteTable('memory_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(), // SHA-256 of normalized content
  category: text('category').notNull(), // 'preference' | 'fact' | 'pattern'
  source: text('source').notNull(), // 'user_explicit' | 'jarvis_inferred'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastAccessed: text('last_accessed'),
  deletedAt: text('deleted_at'),  // null = active, ISO string = soft deleted
});

/**
 * Sessions - Conversation session boundaries
 *
 * Session ends when: 30+ min inactivity, explicit close, browser close
 * New session: User returns after gap, morning briefing, explicit greeting after closure
 */
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  endedAt: text('ended_at'),
  endTrigger: text('end_trigger'), // 'timeout' | 'explicit' | 'browser_close'
  summary: text('summary'), // Optional, for weekly review
});

/**
 * Daily logs - Significant events within sessions (not verbatim transcripts)
 *
 * Event types per CONTEXT.md:
 * - session_start: timestamp, source
 * - session_end: timestamp, duration, trigger
 * - tool_invocation: tool name, success/failure
 * - topic_change: new topic label
 * - user_state: sentiment expressions
 */
export const dailyLogs = sqliteTable('daily_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').references(() => sessions.id),
  eventType: text('event_type').notNull(),
  eventData: text('event_data'), // JSON string
  timestamp: text('timestamp').notNull().$defaultFn(() => new Date().toISOString()),
});

/**
 * Observations - Behavioral patterns tracked before becoming preferences
 *
 * When Jarvis notices consistent behavior (e.g., user always asks for brief responses),
 * record an observation. After threshold observations of same pattern, infer preference.
 *
 * Pattern types: communication_style, scheduling, topic_interest, workflow
 */
export const observations = sqliteTable('observations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pattern: text('pattern').notNull(),        // Normalized pattern identifier (e.g., "prefers_brief_responses")
  patternType: text('pattern_type').notNull(), // 'communication_style' | 'scheduling' | 'topic_interest' | 'workflow'
  evidence: text('evidence'),                 // What triggered this observation
  sessionId: integer('session_id').references(() => sessions.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports for use in queries
export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type NewMemoryEntry = typeof memoryEntries.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type Observation = typeof observations.$inferSelect;
export type NewObservation = typeof observations.$inferInsert;
