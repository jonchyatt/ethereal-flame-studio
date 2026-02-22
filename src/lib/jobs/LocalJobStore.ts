/**
 * LocalJobStore — better-sqlite3 backed JobStore for local development.
 *
 * Wraps synchronous better-sqlite3 calls in async methods to satisfy
 * the JobStore interface (which must be async for Turso compatibility).
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { JobStore, AudioPrepJob, JobUpdate, ListOptions } from './types';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS audio_prep_jobs (
    jobId TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress REAL NOT NULL DEFAULT 0,
    stage TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    result TEXT,
    error TEXT,
    retryCount INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`;

const CREATE_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON audio_prep_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_created ON audio_prep_jobs(createdAt);
  CREATE INDEX IF NOT EXISTS idx_jobs_updated ON audio_prep_jobs(updatedAt);
`;

/**
 * Parse a raw database row into an AudioPrepJob object.
 */
function rowToJob(row: Record<string, unknown>): AudioPrepJob {
  return {
    jobId: row.jobId as string,
    type: row.type as AudioPrepJob['type'],
    status: row.status as AudioPrepJob['status'],
    progress: row.progress as number,
    stage: (row.stage as string) ?? null,
    metadata: JSON.parse(row.metadata as string),
    result: row.result ? JSON.parse(row.result as string) : undefined,
    error: (row.error as string) ?? undefined,
    retryCount: (row.retryCount as number) ?? 0,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export class LocalJobStore implements JobStore {
  private db: Database.Database;

  constructor(dbPath = './audio-prep-jobs.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(CREATE_TABLE_SQL);
    this.db.exec(CREATE_INDEXES_SQL);
  }

  async create(
    type: AudioPrepJob['type'],
    metadata: Record<string, unknown>,
  ): Promise<AudioPrepJob> {
    const now = new Date().toISOString();
    const jobId = randomUUID();

    this.db
      .prepare(
        `INSERT INTO audio_prep_jobs (jobId, type, status, progress, stage, metadata, retryCount, createdAt, updatedAt)
         VALUES (?, ?, 'pending', 0, NULL, ?, 0, ?, ?)`,
      )
      .run(jobId, type, JSON.stringify(metadata), now, now);

    return {
      jobId,
      type,
      status: 'pending',
      progress: 0,
      stage: null,
      metadata,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async get(jobId: string): Promise<AudioPrepJob | undefined> {
    const row = this.db
      .prepare('SELECT * FROM audio_prep_jobs WHERE jobId = ?')
      .get(jobId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToJob(row);
  }

  async update(jobId: string, updates: JobUpdate): Promise<void> {
    const sets: string[] = ['updatedAt = ?'];
    const values: unknown[] = [new Date().toISOString()];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      sets.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.stage !== undefined) {
      sets.push('stage = ?');
      values.push(updates.stage);
    }
    if (updates.result !== undefined) {
      sets.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }
    if (updates.error !== undefined) {
      sets.push('error = ?');
      values.push(updates.error);
    }
    if (updates.retryCount !== undefined) {
      sets.push('retryCount = ?');
      values.push(updates.retryCount);
    }

    values.push(jobId);
    const result = this.db
      .prepare(`UPDATE audio_prep_jobs SET ${sets.join(', ')} WHERE jobId = ?`)
      .run(...values);

    if (result.changes === 0) throw new Error(`Job ${jobId} not found`);
  }

  async complete(jobId: string, result: Record<string, unknown>): Promise<void> {
    await this.update(jobId, { status: 'complete', progress: 100, result });
  }

  async fail(jobId: string, error: string): Promise<void> {
    await this.update(jobId, { status: 'failed', error });
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.get(jobId);
    if (
      job &&
      (job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled')
    ) {
      return; // no-op on terminal states
    }
    await this.update(jobId, { status: 'cancelled' });
  }

  async list(options?: ListOptions): Promise<AudioPrepJob[]> {
    const wheres: string[] = [];
    const values: unknown[] = [];

    if (options?.status) {
      wheres.push('status = ?');
      values.push(options.status);
    }
    if (options?.type) {
      wheres.push('type = ?');
      values.push(options.type);
    }

    const whereClause = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    const limitClause = options?.limit ? `LIMIT ${options.limit}` : '';

    const rows = this.db
      .prepare(
        `SELECT * FROM audio_prep_jobs ${whereClause} ORDER BY createdAt DESC ${limitClause}`,
      )
      .all(...values) as Record<string, unknown>[];

    return rows.map(rowToJob);
  }

  async claimNextPending(): Promise<AudioPrepJob | undefined> {
    const now = new Date().toISOString();

    // Atomic claim: UPDATE ... WHERE jobId = (SELECT oldest pending) RETURNING *
    const row = this.db
      .prepare(
        `UPDATE audio_prep_jobs
         SET status = 'processing', updatedAt = ?
         WHERE jobId = (
           SELECT jobId FROM audio_prep_jobs
           WHERE status = 'pending'
           ORDER BY createdAt ASC
           LIMIT 1
         )
         RETURNING *`,
      )
      .get(now) as Record<string, unknown> | undefined;

    if (!row) return undefined;
    return rowToJob(row);
  }

  async markStaleJobsFailed(timeoutMs: number, type?: AudioPrepJob['type']): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMs).toISOString();
    const now = new Date().toISOString();

    let sql = `UPDATE audio_prep_jobs
      SET status = 'failed', error = 'Timeout: job exceeded processing time limit', updatedAt = ?
      WHERE status = 'processing' AND updatedAt < ?`;
    const params: unknown[] = [now, cutoff];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    const result = this.db.prepare(sql).run(...params);
    return result.changes;
  }

  async getQueuePosition(jobId: string): Promise<number> {
    const job = await this.get(jobId);
    if (!job || job.status !== 'pending') return -1;

    const row = this.db
      .prepare(
        `SELECT COUNT(*) as position FROM audio_prep_jobs
         WHERE status = 'pending' AND createdAt < ?`,
      )
      .get(job.createdAt) as { position: number };

    return row.position;
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
