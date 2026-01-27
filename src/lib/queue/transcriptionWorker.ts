/**
 * BullMQ worker for transcription jobs.
 * Processes audio files and stores descriptions in the database.
 *
 * Phase 4, Plan 04-05
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { TranscriptionJobData, closeTranscriptionQueue } from './transcriptionQueue';
import { transcribeFile, formatVideoDescription, checkWhisperHealth } from '../services/whisperClient';
import { updateRender } from '../db';

let worker: Worker<TranscriptionJobData> | null = null;

/**
 * Process a transcription job.
 */
async function processTranscriptionJob(job: Job<TranscriptionJobData>): Promise<void> {
  const { renderDbId, audioPath, audioName } = job.data;

  console.log(`[Transcription] Processing: ${audioName}`);

  // Check Whisper service health
  const healthy = await checkWhisperHealth();
  if (!healthy) {
    throw new Error('Whisper service unavailable');
  }

  try {
    await job.updateProgress(10);

    // Transcribe the audio
    const result = await transcribeFile(audioPath);

    await job.updateProgress(80);

    // Format as video description
    const description = formatVideoDescription(result, audioName);

    // Update database
    updateRender(renderDbId, {
      whisper_description: description,
      duration_seconds: result.durationSeconds,
    });

    await job.updateProgress(100);

    console.log(`[Transcription] Complete: ${audioName} (${result.language}, ${Math.round(result.durationSeconds)}s)`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Transcription] Failed: ${audioName} - ${message}`);

    // Don't update render status - transcription failure shouldn't mark render as failed
    // Just log and move on
    throw error;
  }
}

/**
 * Start the transcription worker.
 */
export function startTranscriptionWorker(): Worker<TranscriptionJobData> {
  if (worker) {
    console.warn('[Transcription] Worker already running');
    return worker;
  }

  worker = new Worker<TranscriptionJobData>('transcription-queue', processTranscriptionJob, {
    connection: redisConnection,
    concurrency: 1, // One transcription at a time (GPU shared with render)
    lockDuration: 600000, // 10 minutes (long audio files)
  });

  worker.on('completed', (job) => {
    console.log(`[Transcription] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Transcription] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Transcription] Worker started');
  return worker;
}

/**
 * Stop the transcription worker.
 */
export async function stopTranscriptionWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Transcription] Worker stopped');
  }
}

// Re-export closeTranscriptionQueue for convenience
export { closeTranscriptionQueue };
