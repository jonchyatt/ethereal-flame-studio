/**
 * BullMQ queue for transcription jobs.
 * Processes audio after renders complete to generate video descriptions.
 *
 * Phase 4, Plan 04-05
 */

import { Queue } from 'bullmq';
import { redisConnection } from './connection';

/**
 * Data for a transcription job.
 */
export interface TranscriptionJobData {
  renderDbId: string;
  audioPath: string;
  audioName: string;
}

/**
 * Transcription queue - processes audio files for descriptions.
 */
export const transcriptionQueue = new Queue<TranscriptionJobData>('transcription-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    attempts: 2, // Transcription is less critical, fewer retries
    backoff: {
      type: 'fixed',
      delay: 30000, // 30s between retries
    },
  },
});

/**
 * Add a transcription job to the queue.
 */
export async function addTranscriptionJob(data: TranscriptionJobData): Promise<string> {
  const job = await transcriptionQueue.add('transcribe', data, {
    jobId: `transcribe-${data.renderDbId}`,
  });
  return job.id || '';
}

/**
 * Close the transcription queue.
 */
export async function closeTranscriptionQueue(): Promise<void> {
  await transcriptionQueue.close();
}
