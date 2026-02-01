/**
 * ServerJobStore - Server-side job persistence
 *
 * In-memory store with optional BullMQ integration.
 * In production, this would use SQLite or PostgreSQL.
 *
 * Phase 3/4 Integration
 */

import {
  RenderJob,
  RenderJobSummary,
  JobStatus,
  JobId,
  createJobId,
  RenderSettings,
  OutputFormat,
  OUTPUT_FORMAT_META,
} from '../render/schema/types';

/**
 * Job creation input
 */
export interface CreateJobInput {
  audioName: string;
  audioPath: string;
  audioHash?: string;
  audioDuration?: number;
  outputFormat: OutputFormat;
  fps: 30 | 60;
  renderSettings?: Partial<RenderSettings>;
  priority?: number;
  userMetadata?: Record<string, unknown>;
}

/**
 * Job update input
 */
export interface UpdateJobInput {
  status?: JobStatus;
  progress?: number;
  currentStage?: string;
  audioPath?: string;
  audioHash?: string;
  audioDuration?: number;
  audioAnalysisPath?: string;
  output?: RenderJob['output'];
  errorMessage?: string;
  errorStack?: string;
  workerId?: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount?: number;
}

/**
 * Default render settings
 */
const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  templateId: null,
  visualMode: 'flame',
  intensity: 1.0,
  skyboxPreset: 'nebula',
  skyboxRotationSpeed: 0.0,
  waterEnabled: false,
  waterColor: '#1a3a5c',
  waterReflectivity: 0.5,
  particleLayers: [],
};

/**
 * Server-side job store (singleton)
 */
class ServerJobStoreClass {
  private jobs: Map<JobId, RenderJob> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the store
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[ServerJobStore] Initialized');
  }

  /**
   * Create a new job
   */
  async create(input: CreateJobInput): Promise<RenderJob> {
    await this.init();

    const now = new Date().toISOString();
    const jobId = createJobId();

    const job: RenderJob = {
      id: jobId,
      batchId: null,
      status: 'pending',
      progress: 0,
      currentStage: 'Waiting in queue',

      // Audio
      audioName: input.audioName,
      audioPath: input.audioPath,
      audioHash: input.audioHash || '',
      audioDuration: input.audioDuration || 0,

      // Config
      outputFormat: input.outputFormat,
      fps: input.fps,
      renderSettings: {
        ...DEFAULT_RENDER_SETTINGS,
        ...input.renderSettings,
      },
      targetMachineId: null,

      // Outputs
      output: null,
      audioAnalysisPath: null,

      // Metadata
      priority: input.priority || 5,
      attemptCount: 0,
      maxAttempts: 3,
      errorMessage: null,
      errorStack: null,
      workerId: null,

      // Timestamps
      createdAt: now,
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      updatedAt: now,

      // External
      userMetadata: input.userMetadata || {},
    };

    this.jobs.set(jobId, job);
    console.log(`[ServerJobStore] Created job ${jobId}`);

    return job;
  }

  /**
   * Get a job by ID
   */
  async get(id: string): Promise<RenderJob | null> {
    await this.init();
    return this.jobs.get(id as JobId) || null;
  }

  /**
   * Update a job
   */
  async update(id: string, updates: UpdateJobInput): Promise<RenderJob> {
    await this.init();

    const job = this.jobs.get(id as JobId);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    const now = new Date().toISOString();
    const updated: RenderJob = {
      ...job,
      ...updates,
      updatedAt: now,
    };

    this.jobs.set(id as JobId, updated);
    console.log(`[ServerJobStore] Updated job ${id}: status=${updated.status}, progress=${updated.progress}`);

    return updated;
  }

  /**
   * Delete a job
   */
  async delete(id: string): Promise<boolean> {
    await this.init();

    const existed = this.jobs.has(id as JobId);
    this.jobs.delete(id as JobId);

    if (existed) {
      console.log(`[ServerJobStore] Deleted job ${id}`);
    }

    return existed;
  }

  /**
   * List jobs with filters and pagination
   */
  async list(options: {
    status?: JobStatus;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'priority';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ jobs: RenderJobSummary[]; total: number }> {
    await this.init();

    const {
      status,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Filter
    let filtered = Array.from(this.jobs.values());
    if (status) {
      filtered = filtered.filter((job) => job.status === status);
    }

    const total = filtered.length;

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
        case 'updatedAt':
          comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const paginated = filtered.slice(offset, offset + limit);

    // Convert to summaries
    const summaries: RenderJobSummary[] = paginated.map((job) => ({
      id: job.id,
      batchId: job.batchId,
      status: job.status,
      progress: job.progress,
      currentStage: job.currentStage,
      audioName: job.audioName,
      outputFormat: job.outputFormat,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    }));

    return { jobs: summaries, total };
  }

  /**
   * Get status counts
   */
  async getStatusCounts(): Promise<Record<JobStatus, number>> {
    await this.init();

    const counts: Record<JobStatus, number> = {
      pending: 0,
      queued: 0,
      analyzing: 0,
      transcribing: 0,
      rendering: 0,
      encoding: 0,
      injecting: 0,
      uploading: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      stalled: 0,
    };

    for (const job of this.jobs.values()) {
      counts[job.status]++;
    }

    return counts;
  }

  /**
   * Get queue position for a job
   */
  async getQueuePosition(jobId: string): Promise<number> {
    await this.init();

    const job = this.jobs.get(jobId as JobId);
    if (!job || job.status !== 'pending') {
      return 0;
    }

    // Count pending jobs created before this one
    let position = 1;
    for (const j of this.jobs.values()) {
      if (j.status === 'pending' && j.createdAt < job.createdAt) {
        position++;
      }
    }

    return position;
  }

  /**
   * Estimate duration for a job based on format and audio duration
   */
  estimateDuration(outputFormat: OutputFormat, audioDuration: number, fps: 30 | 60): number {
    const meta = OUTPUT_FORMAT_META[outputFormat];

    // Base estimate: 2-10x realtime depending on format
    let multiplier = 2; // 1080p
    if (meta.width >= 3840) multiplier = 4; // 4K
    if (meta.is360) multiplier = 6; // 360
    if (meta.isStereo) multiplier = 10; // Stereo

    // Adjust for FPS
    if (fps === 60) multiplier *= 1.5;

    return Math.ceil(audioDuration * multiplier);
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<RenderJob> {
    const job = await this.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    // Can only cancel pending, queued, or active jobs
    const cancelableStatuses: JobStatus[] = [
      'pending', 'queued', 'analyzing', 'transcribing',
      'rendering', 'encoding', 'injecting', 'uploading'
    ];

    if (!cancelableStatuses.includes(job.status)) {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    return this.update(id, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      currentStage: 'Cancelled by user',
    });
  }

  /**
   * Cleanup old completed/failed jobs
   */
  async cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.init();

    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        new Date(job.createdAt).getTime() < cutoff
      ) {
        this.jobs.delete(id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[ServerJobStore] Cleaned up ${deleted} old jobs`);
    }

    return deleted;
  }

  /**
   * Clear all jobs (for testing)
   */
  async clear(): Promise<void> {
    this.jobs.clear();
    console.log('[ServerJobStore] Cleared all jobs');
  }
}

// Export singleton instance
export const ServerJobStore = new ServerJobStoreClass();
