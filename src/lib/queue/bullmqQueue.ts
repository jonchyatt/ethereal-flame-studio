/**
 * BullMQ queue for batch render jobs.
 * Handles job creation, status queries, and queue management.
 *
 * This provides Redis-backed job persistence for server-side batch processing,
 * complementing the browser-side RenderQueue from Phase 3.
 *
 * Phase 4, Plan 04-02
 */

import { Queue, QueueEvents } from 'bullmq';
import { v4 as uuid } from 'uuid';
import { redisConnection } from './connection';
import { RenderJobData, AudioFile } from './types';

/**
 * Lazy singleton for the render queue.
 * Created on first access to avoid Redis connection at module import time.
 * This is critical for Vercel where Redis is not available.
 */
let _renderQueue: Queue<RenderJobData> | null = null;

export function getRenderQueue(): Queue<RenderJobData> {
  if (!_renderQueue) {
    _renderQueue = new Queue<RenderJobData>('render-queue', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 100 }, // Keep last 100 completed
        removeOnFail: { count: 500 },     // Keep failed for debugging
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s initial, then 20s, 40s
        },
      },
    });
  }
  return _renderQueue;
}

/**
 * Lazy singleton for queue events listener.
 */
let _queueEvents: QueueEvents | null = null;

export function getQueueEvents(): QueueEvents {
  if (!_queueEvents) {
    _queueEvents = new QueueEvents('render-queue', {
      connection: redisConnection,
    });
  }
  return _queueEvents;
}


/**
 * Add a batch of render jobs for multiple audio files and formats.
 *
 * @param audioFiles - Array of audio files to process
 * @param template - Visual template to use (flame, mist)
 * @param outputFormats - Array of output formats (1080p, 4k, etc.)
 * @returns Batch ID and array of created job IDs
 */
export async function addBatchJob(
  audioFiles: AudioFile[],
  template: string,
  outputFormats: string[]
): Promise<{ batchId: string; jobIds: string[] }> {
  const batchId = uuid();
  const jobIds: string[] = [];

  // Create individual render jobs for each audio/format combination
  for (const audioFile of audioFiles) {
    for (const format of outputFormats) {
      const job = await getRenderQueue().add(
        'render',
        {
          batchId,
          audioFile,
          template,
          outputFormat: format,
          renderDbId: '', // Set by worker after DB insert
        },
        {
          jobId: `${batchId}-${audioFile.id}-${format}`,
        }
      );
      jobIds.push(job.id || '');
    }
  }

  return { batchId, jobIds };
}

/**
 * Get the status of a specific job.
 */
export async function getJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  failedReason?: string;
} | null> {
  const job = await getRenderQueue().getJob(jobId);
  if (!job) return null;

  return {
    state: await job.getState(),
    progress: job.progress as number || 0,
    failedReason: job.failedReason,
  };
}

/**
 * Get the status of all jobs in a batch.
 */
export async function getBatchStatus(batchId: string): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
}> {
  const jobs = await getRenderQueue().getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
  const batchJobs = jobs.filter(j => j.data.batchId === batchId);

  const states = await Promise.all(batchJobs.map(j => j.getState()));

  return {
    total: batchJobs.length,
    completed: states.filter(s => s === 'completed').length,
    failed: states.filter(s => s === 'failed').length,
    pending: states.filter(s => s === 'waiting' || s === 'delayed').length,
    processing: states.filter(s => s === 'active').length,
  };
}

/**
 * Add a single render job to the queue.
 *
 * @param audioFile - Audio file to process
 * @param template - Visual template to use (flame, mist)
 * @param outputFormat - Output format (flat-1080p, 360-mono-4k, etc.)
 * @param options - Additional options
 * @returns Job ID
 */
export async function addRenderJob(
  audioFile: AudioFile,
  template: string,
  outputFormat: string,
  options?: {
    fps?: number;
    transcribe?: boolean;
    uploadToGDrive?: boolean;
    priority?: number;
  }
): Promise<{ jobId: string; batchId: string }> {
  const batchId = uuid();

  const job = await getRenderQueue().add(
    'render',
    {
      batchId,
      audioFile,
      template,
      outputFormat,
      renderDbId: '', // Set by worker after DB insert
      options: {
        fps: options?.fps || 30,
        transcribe: options?.transcribe ?? true,
        uploadToGDrive: options?.uploadToGDrive ?? false,
      },
    },
    {
      jobId: `${batchId}-${audioFile.id}-${outputFormat}`,
      priority: options?.priority,
    }
  );

  return { jobId: job.id || '', batchId };
}

/**
 * Close queue connections gracefully.
 */
export async function closeQueue(): Promise<void> {
  if (_renderQueue) await _renderQueue.close();
  if (_queueEvents) await _queueEvents.close();
  _renderQueue = null;
  _queueEvents = null;
}
