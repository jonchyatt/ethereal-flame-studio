/**
 * Drizzle ORM schema for the audio_prep_jobs table.
 *
 * Shared source of truth for column definitions — both LocalJobStore
 * (better-sqlite3) and TursoJobStore (@libsql/client) create an
 * identical table via raw SQL matching this schema.
 */

import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const audioPrepJobs = sqliteTable(
  'audio_prep_jobs',
  {
    jobId: text('jobId').primaryKey(),
    type: text('type').notNull(), // 'ingest' | 'preview' | 'save'
    status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled'
    progress: real('progress').notNull().default(0), // percentage within current stage (0-100)
    stage: text('stage'), // descriptive string: "downloading", "analyzing", "normalizing", "encoding"
    metadata: text('metadata').notNull().default('{}'), // JSON-stringified job-specific input data
    result: text('result'), // JSON-stringified output data
    error: text('error'), // human-readable failure reason
    retryCount: integer('retryCount').notNull().default(0), // auto-retry attempt counter
    createdAt: text('createdAt').notNull(), // ISO 8601 timestamp
    updatedAt: text('updatedAt').notNull(), // ISO 8601 timestamp, used for heartbeat/reaper
  },
  (table) => [
    index('idx_jobs_status').on(table.status),
    index('idx_jobs_created').on(table.createdAt),
    index('idx_jobs_updated').on(table.updatedAt),
  ],
);

// Drizzle inferred types (for reference / optional usage)
export type AudioPrepJobRow = typeof audioPrepJobs.$inferSelect;
export type NewAudioPrepJobRow = typeof audioPrepJobs.$inferInsert;
