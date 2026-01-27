/**
 * RenderQueue - Job queue with persistence for render jobs
 *
 * Manages the lifecycle of render jobs from submission to completion.
 * Works with JobStore for persistence and ExportPipeline for execution.
 *
 * Phase 3, Plan 03-08
 */

import { JobStore, RenderJob, JobStatus, CreateJobInput } from './JobStore';
import { ExportPipeline, ExportConfig, ExportResult } from '../render/ExportPipeline';

/**
 * Queue event types
 */
export type QueueEventType =
  | 'job-submitted'
  | 'job-started'
  | 'job-progress'
  | 'job-completed'
  | 'job-failed'
  | 'job-cancelled';

/**
 * Queue event data
 */
export interface QueueEvent {
  type: QueueEventType;
  job: RenderJob;
  data?: unknown;
}

/**
 * Queue event listener
 */
export type QueueEventListener = (event: QueueEvent) => void;

/**
 * Queue status summary
 */
export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
}

export class RenderQueue {
  private store: JobStore;
  private pipeline: ExportPipeline | null;
  private isProcessing: boolean = false;
  private currentJobId: string | null = null;
  private currentAbortController: AbortController | null = null;
  private listeners: Set<QueueEventListener> = new Set();

  constructor(store: JobStore, pipeline: ExportPipeline | null = null) {
    this.store = store;
    this.pipeline = pipeline;
  }

  /**
   * Initialize the queue
   */
  async init(): Promise<void> {
    await this.store.init();

    // Check for any jobs stuck in 'processing' state (from crash/refresh)
    const processingJobs = await this.store.list('processing');
    for (const job of processingJobs) {
      // Mark as pending to retry
      await this.store.update(job.id, {
        status: 'pending',
        progress: 0,
        startedAt: undefined,
      });
    }
  }

  /**
   * Submit a new render job
   */
  async submit(config: ExportConfig): Promise<string> {
    const input: CreateJobInput = {
      status: 'pending',
      config,
    };

    const job = await this.store.create(input);

    this.emit({
      type: 'job-submitted',
      job,
    });

    // Auto-start processing if not already running
    if (!this.isProcessing && this.pipeline) {
      this.processNext();
    }

    return job.id;
  }

  /**
   * Cancel a pending or processing job
   */
  async cancel(jobId: string): Promise<void> {
    const job = await this.store.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    // If currently processing this job, abort it
    if (this.currentJobId === jobId && this.currentAbortController) {
      this.currentAbortController.abort();
    }

    const updated = await this.store.update(jobId, {
      status: 'cancelled',
      completedAt: new Date(),
    });

    this.emit({
      type: 'job-cancelled',
      job: updated,
    });
  }

  /**
   * Get status of a specific job
   */
  async getStatus(jobId: string): Promise<RenderJob | null> {
    return this.store.get(jobId);
  }

  /**
   * List all jobs
   */
  async listJobs(status?: JobStatus): Promise<RenderJob[]> {
    return this.store.list(status);
  }

  /**
   * Get queue status summary
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const counts = await this.store.getStatusCounts();
    return {
      pending: counts.pending,
      processing: counts.processing,
      completed: counts.completed,
      failed: counts.failed + counts.cancelled,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Process the next pending job
   */
  async processNext(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    if (!this.pipeline) {
      console.warn('RenderQueue: No pipeline configured');
      return;
    }

    const pendingJobs = await this.store.list('pending');
    if (pendingJobs.length === 0) {
      return; // No pending jobs
    }

    // Get oldest pending job
    const job = pendingJobs[pendingJobs.length - 1];

    this.isProcessing = true;
    this.currentJobId = job.id;
    this.currentAbortController = new AbortController();

    try {
      // Update job to processing
      const processingJob = await this.store.update(job.id, {
        status: 'processing',
        startedAt: new Date(),
        progress: 0,
      });

      this.emit({
        type: 'job-started',
        job: processingJob,
      });

      // Execute the export
      const result = await this.pipeline.export({
        ...job.config,
        onProgress: async (percent, stage) => {
          const updatedJob = await this.store.update(job.id, { progress: percent });
          this.emit({
            type: 'job-progress',
            job: updatedJob,
            data: { percent, stage },
          });
        },
        signal: this.currentAbortController.signal,
      });

      if (result.success) {
        // Create blob URL if frames available
        let outputUrl: string | undefined;
        if (result.frames && result.frames.length > 0) {
          // In production, this would be a video blob URL
          // For now, we just note that frames are available
          outputUrl = `frames:${result.frames.length}`;
        }

        const completedJob = await this.store.update(job.id, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          outputPath: result.outputPath,
          outputUrl,
        });

        this.emit({
          type: 'job-completed',
          job: completedJob,
        });
      } else {
        const failedJob = await this.store.update(job.id, {
          status: 'failed',
          completedAt: new Date(),
          error: result.error,
        });

        this.emit({
          type: 'job-failed',
          job: failedJob,
        });
      }

    } catch (error) {
      // Handle abort or other errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Job was cancelled - already handled in cancel()
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const failedJob = await this.store.update(job.id, {
          status: 'failed',
          completedAt: new Date(),
          error: errorMessage,
        });

        this.emit({
          type: 'job-failed',
          job: failedJob,
        });
      }
    } finally {
      this.isProcessing = false;
      this.currentJobId = null;
      this.currentAbortController = null;

      // Process next job if any
      const remaining = await this.store.list('pending');
      if (remaining.length > 0) {
        // Use setTimeout to avoid stack overflow with many jobs
        setTimeout(() => this.processNext(), 100);
      }
    }
  }

  /**
   * Delete a job from the queue
   */
  async deleteJob(jobId: string): Promise<void> {
    const job = await this.store.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'processing' && this.currentJobId === jobId) {
      throw new Error('Cannot delete job while processing. Cancel first.');
    }

    await this.store.delete(jobId);
  }

  /**
   * Clean up old jobs
   */
  async cleanup(maxAge?: number): Promise<number> {
    return this.store.cleanup(maxAge);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: QueueEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: QueueEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: QueueEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('RenderQueue: Event listener error:', error);
      }
    }
  }

  /**
   * Close the queue
   */
  close(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.store.close();
  }
}
