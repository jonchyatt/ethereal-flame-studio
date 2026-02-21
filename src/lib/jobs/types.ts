/**
 * JobStore — unified interface for job state persistence across local
 * SQLite (better-sqlite3) and Turso cloud database (@libsql/client).
 *
 * Mirrors the StorageAdapter pattern from Phase 12: consumers program
 * against this interface, and the backing store is swapped via the
 * JOB_STORE_BACKEND environment variable.
 */

// ---------------------------------------------------------------------------
// Job entity
// ---------------------------------------------------------------------------

export interface AudioPrepJob {
  jobId: string;
  type: 'ingest' | 'preview' | 'save';
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  stage: string | null; // descriptive stage name ("downloading", "analyzing", etc.)
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number; // auto-retry attempt counter
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Update / filter types
// ---------------------------------------------------------------------------

export type JobUpdate = Partial<
  Pick<AudioPrepJob, 'status' | 'progress' | 'stage' | 'result' | 'error' | 'retryCount'>
>;

export interface ListOptions {
  status?: AudioPrepJob['status'];
  type?: AudioPrepJob['type'];
  limit?: number;
}

// ---------------------------------------------------------------------------
// JobStore interface
// ---------------------------------------------------------------------------

export interface JobStore {
  /** Create a new job and return it. */
  create(type: AudioPrepJob['type'], metadata: Record<string, unknown>): Promise<AudioPrepJob>;

  /** Get a job by ID. Returns undefined if not found. */
  get(jobId: string): Promise<AudioPrepJob | undefined>;

  /** Update specific fields on a job. Throws if job not found. */
  update(jobId: string, updates: JobUpdate): Promise<void>;

  /** Mark a job as complete with a result object. */
  complete(jobId: string, result: Record<string, unknown>): Promise<void>;

  /** Mark a job as failed with an error message. */
  fail(jobId: string, error: string): Promise<void>;

  /** Cancel a job. No-op if the job is already in a terminal state. */
  cancel(jobId: string): Promise<void>;

  /** List jobs with optional filters. */
  list(options?: ListOptions): Promise<AudioPrepJob[]>;

  // -- Worker-specific methods --

  /** Atomically claim the oldest pending job for processing. */
  claimNextPending(): Promise<AudioPrepJob | undefined>;

  /** Mark processing jobs as failed if their updatedAt exceeds timeoutMs. Returns count affected. */
  markStaleJobsFailed(timeoutMs: number): Promise<number>;

  /** Get this job's position in the pending queue (0-based). */
  getQueuePosition(jobId: string): Promise<number>;
}
