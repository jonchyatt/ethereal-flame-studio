/**
 * TursoJobStore — @libsql/client backed JobStore for production (Turso cloud).
 *
 * Uses raw SQL queries against the same audio_prep_jobs table schema.
 * The Drizzle ORM schema file (src/lib/db/job-schema.ts) serves as the
 * source of truth for column definitions; queries here use raw SQL for
 * simplicity and to avoid drizzle async issues with libsql.
 */

import { createClient, type Client } from '@libsql/client';
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

const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_jobs_status ON audio_prep_jobs(status)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_created ON audio_prep_jobs(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_updated ON audio_prep_jobs(updatedAt)',
];

/**
 * Parse a raw libsql result row into an AudioPrepJob object.
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
    retryCount: Number(row.retryCount ?? 0),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export class TursoJobStore implements JobStore {
  private client: Client;
  private initialized: Promise<void>;

  constructor(url: string, authToken?: string) {
    this.client = createClient({ url, authToken });

    // Run table + index creation on construction (async, awaited lazily)
    this.initialized = this._init();
  }

  private async _init(): Promise<void> {
    await this.client.execute(CREATE_TABLE_SQL);
    for (const sql of CREATE_INDEXES_SQL) {
      await this.client.execute(sql);
    }
  }

  /** Ensure the table is created before any operation. */
  private async ready(): Promise<void> {
    await this.initialized;
  }

  async create(
    type: AudioPrepJob['type'],
    metadata: Record<string, unknown>,
  ): Promise<AudioPrepJob> {
    await this.ready();

    const now = new Date().toISOString();
    const jobId = randomUUID();

    await this.client.execute({
      sql: `INSERT INTO audio_prep_jobs (jobId, type, status, progress, stage, metadata, retryCount, createdAt, updatedAt)
            VALUES (?, ?, 'pending', 0, NULL, ?, 0, ?, ?)`,
      args: [jobId, type, JSON.stringify(metadata), now, now],
    });

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
    await this.ready();

    const result = await this.client.execute({
      sql: 'SELECT * FROM audio_prep_jobs WHERE jobId = ?',
      args: [jobId],
    });

    if (result.rows.length === 0) return undefined;
    return rowToJob(result.rows[0] as unknown as Record<string, unknown>);
  }

  async update(jobId: string, updates: JobUpdate): Promise<void> {
    await this.ready();

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

    const result = await this.client.execute({
      sql: `UPDATE audio_prep_jobs SET ${sets.join(', ')} WHERE jobId = ?`,
      args: values as Array<string | number | null>,
    });

    if (result.rowsAffected === 0) throw new Error(`Job ${jobId} not found`);
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
    await this.ready();

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

    const result = await this.client.execute({
      sql: `SELECT * FROM audio_prep_jobs ${whereClause} ORDER BY createdAt DESC ${limitClause}`,
      args: values as Array<string | number | null>,
    });

    return result.rows.map((row) => rowToJob(row as unknown as Record<string, unknown>));
  }

  async claimNextPending(): Promise<AudioPrepJob | undefined> {
    await this.ready();

    const now = new Date().toISOString();

    // Use a transaction for atomic claim (SELECT + UPDATE)
    const tx = await this.client.transaction('write');
    try {
      const pending = await tx.execute({
        sql: `SELECT jobId FROM audio_prep_jobs WHERE status = 'pending' ORDER BY createdAt ASC LIMIT 1`,
        args: [],
      });

      if (pending.rows.length === 0) {
        await tx.commit();
        return undefined;
      }

      const pendingJobId = pending.rows[0].jobId as string;

      await tx.execute({
        sql: `UPDATE audio_prep_jobs SET status = 'processing', updatedAt = ? WHERE jobId = ?`,
        args: [now, pendingJobId],
      });

      const claimed = await tx.execute({
        sql: `SELECT * FROM audio_prep_jobs WHERE jobId = ?`,
        args: [pendingJobId],
      });

      await tx.commit();

      if (claimed.rows.length === 0) return undefined;
      return rowToJob(claimed.rows[0] as unknown as Record<string, unknown>);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async markStaleJobsFailed(timeoutMs: number): Promise<number> {
    await this.ready();

    const cutoff = new Date(Date.now() - timeoutMs).toISOString();
    const now = new Date().toISOString();

    const result = await this.client.execute({
      sql: `UPDATE audio_prep_jobs
            SET status = 'failed', error = 'Timeout: job exceeded processing time limit', updatedAt = ?
            WHERE status = 'processing' AND updatedAt < ?`,
      args: [now, cutoff],
    });

    return result.rowsAffected;
  }

  async getQueuePosition(jobId: string): Promise<number> {
    await this.ready();

    const job = await this.get(jobId);
    if (!job || job.status !== 'pending') return -1;

    const result = await this.client.execute({
      sql: `SELECT COUNT(*) as position FROM audio_prep_jobs
            WHERE status = 'pending' AND createdAt < ?`,
      args: [job.createdAt],
    });

    return Number(result.rows[0].position);
  }

  /** Close the libsql client connection. */
  close(): void {
    this.client.close();
  }
}
