import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface AudioPrepJob {
  jobId: string;
  type: 'ingest' | 'preview' | 'save';
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class AudioPrepJobManager {
  private db: Database.Database;
  // Runtime-only: AbortControllers for in-flight jobs (not persisted)
  private controllers = new Map<string, AbortController>();

  constructor(dbPath = './audio-prep-jobs.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audio_prep_jobs (
        jobId TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress REAL NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        result TEXT,
        error TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  }

  create(type: AudioPrepJob['type'], metadata: Record<string, unknown>): AudioPrepJob {
    const now = new Date().toISOString();
    const jobId = randomUUID();

    this.db.prepare(`
      INSERT INTO audio_prep_jobs (jobId, type, status, progress, metadata, createdAt, updatedAt)
      VALUES (?, ?, 'pending', 0, ?, ?, ?)
    `).run(jobId, type, JSON.stringify(metadata), now, now);

    const controller = new AbortController();
    this.controllers.set(jobId, controller);

    return { jobId, type, status: 'pending', progress: 0, metadata, createdAt: now, updatedAt: now };
  }

  get(jobId: string): AudioPrepJob | undefined {
    const row = this.db.prepare('SELECT * FROM audio_prep_jobs WHERE jobId = ?').get(jobId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      jobId: row.jobId as string,
      type: row.type as AudioPrepJob['type'],
      status: row.status as AudioPrepJob['status'],
      progress: row.progress as number,
      metadata: JSON.parse(row.metadata as string),
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  }

  update(jobId: string, updates: Partial<Pick<AudioPrepJob, 'status' | 'progress' | 'result' | 'error'>>): void {
    const sets: string[] = ['updatedAt = ?'];
    const values: unknown[] = [new Date().toISOString()];

    if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
    if (updates.progress !== undefined) { sets.push('progress = ?'); values.push(updates.progress); }
    if (updates.result !== undefined) { sets.push('result = ?'); values.push(JSON.stringify(updates.result)); }
    if (updates.error !== undefined) { sets.push('error = ?'); values.push(updates.error); }

    values.push(jobId);
    const result = this.db.prepare(`UPDATE audio_prep_jobs SET ${sets.join(', ')} WHERE jobId = ?`).run(...values);
    if (result.changes === 0) throw new Error(`Job ${jobId} not found`);
  }

  complete(jobId: string, result: Record<string, unknown>): void {
    this.update(jobId, { status: 'complete', progress: 100, result });
    this.controllers.delete(jobId);
  }

  fail(jobId: string, error: string): void {
    this.update(jobId, { status: 'failed', error });
    this.controllers.delete(jobId);
  }

  cancel(jobId: string): void {
    // Don't overwrite terminal states
    const job = this.get(jobId);
    if (job && (job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled')) {
      return;
    }
    const controller = this.controllers.get(jobId);
    if (controller) controller.abort();
    this.controllers.delete(jobId);
    this.update(jobId, { status: 'cancelled' });
  }

  /** Get the AbortSignal for an in-flight job (runtime only). */
  getSignal(jobId: string): AbortSignal | undefined {
    return this.controllers.get(jobId)?.signal;
  }

  list(): AudioPrepJob[] {
    const rows = this.db.prepare('SELECT * FROM audio_prep_jobs ORDER BY createdAt DESC').all() as Record<string, unknown>[];
    return rows.map((row) => ({
      jobId: row.jobId as string,
      type: row.type as AudioPrepJob['type'],
      status: row.status as AudioPrepJob['status'],
      progress: row.progress as number,
      metadata: JSON.parse(row.metadata as string),
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    }));
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance for app-wide use
export const audioPrepJobs = new AudioPrepJobManager();
