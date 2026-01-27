/**
 * JobStore - Persistent storage for render jobs
 *
 * Uses IndexedDB for browser-side persistence.
 * Jobs survive page refreshes and browser restarts.
 *
 * Phase 3, Plan 03-08
 */

import type { ExportConfig } from '../render/ExportPipeline';

/**
 * Render job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Render job data structure
 */
export interface RenderJob {
  id: string;
  status: JobStatus;
  config: ExportConfig;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputPath?: string;
  outputUrl?: string;  // Blob URL for download
  error?: string;
}

/**
 * Job creation input (without auto-generated fields)
 */
export type CreateJobInput = Omit<RenderJob, 'id' | 'createdAt' | 'progress'>;

// IndexedDB configuration
const DB_NAME = 'ethereal-flame-render-jobs';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';

/**
 * Open or create the IndexedDB database
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create jobs store with id as key
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for querying
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Serialize job for storage (convert Dates to ISO strings, Files to metadata)
 */
function serializeJob(job: RenderJob): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...job };

  // Convert Dates to ISO strings
  if (job.createdAt) serialized.createdAt = job.createdAt.toISOString();
  if (job.startedAt) serialized.startedAt = job.startedAt.toISOString();
  if (job.completedAt) serialized.completedAt = job.completedAt.toISOString();

  // Handle config.audioFile - store metadata only (actual file handled separately)
  if (job.config.audioFile instanceof File) {
    serialized.config = {
      ...job.config,
      audioFileName: job.config.audioFile.name,
      audioFileType: job.config.audioFile.type,
      audioFile: null, // Don't store File object in IndexedDB
    };
  }

  return serialized;
}

/**
 * Deserialize job from storage (convert ISO strings back to Dates)
 */
function deserializeJob(data: Record<string, unknown>): RenderJob {
  const job = { ...data } as unknown as RenderJob;

  // Convert ISO strings to Dates
  if (typeof data.createdAt === 'string') {
    job.createdAt = new Date(data.createdAt);
  }
  if (typeof data.startedAt === 'string') {
    job.startedAt = new Date(data.startedAt);
  }
  if (typeof data.completedAt === 'string') {
    job.completedAt = new Date(data.completedAt);
  }

  return job;
}

/**
 * JobStore class for managing render jobs in IndexedDB
 */
export class JobStore {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the store (open database)
   */
  async init(): Promise<void> {
    if (!this.db) {
      this.db = await openDatabase();
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await openDatabase();
    }
    return this.db;
  }

  /**
   * Create a new job
   */
  async create(input: CreateJobInput): Promise<RenderJob> {
    const db = await this.ensureDb();

    const job: RenderJob = {
      id: generateJobId(),
      status: input.status,
      config: input.config,
      progress: 0,
      createdAt: new Date(),
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      outputPath: input.outputPath,
      outputUrl: input.outputUrl,
      error: input.error,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(serializeJob(job));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(job);
    });
  }

  /**
   * Update an existing job
   */
  async update(id: string, updates: Partial<RenderJob>): Promise<RenderJob> {
    const db = await this.ensureDb();
    const existing = await this.get(id);

    if (!existing) {
      throw new Error(`Job not found: ${id}`);
    }

    const updated: RenderJob = { ...existing, ...updates };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(serializeJob(updated));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updated);
    });
  }

  /**
   * Get a job by ID
   */
  async get(id: string): Promise<RenderJob | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve(deserializeJob(request.result));
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * List all jobs, optionally filtered by status
   */
  async list(status?: JobStatus): Promise<RenderJob[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let request: IDBRequest;

      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const jobs = (request.result as Record<string, unknown>[])
          .map(deserializeJob)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first
        resolve(jobs);
      };
    });
  }

  /**
   * Delete a job by ID
   */
  async delete(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get count of jobs by status
   */
  async getStatusCounts(): Promise<Record<JobStatus, number>> {
    const jobs = await this.list();

    const counts: Record<JobStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const job of jobs) {
      counts[job.status]++;
    }

    return counts;
  }

  /**
   * Clean up old completed/failed jobs (older than maxAge in ms)
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const jobs = await this.list();
    const now = Date.now();
    let deleted = 0;

    for (const job of jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt &&
        now - job.createdAt.getTime() > maxAge
      ) {
        await this.delete(job.id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
