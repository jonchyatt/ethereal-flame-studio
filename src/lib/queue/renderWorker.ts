/**
 * BullMQ worker for processing render jobs.
 * Processes jobs from the queue, updates database, and handles post-processing.
 *
 * Phase 4, Plan 04-03
 * Updated Phase 5, Plan 05-03: Added webhook notification
 * Updated: Integrated actual Puppeteer render pipeline
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { RenderJobData } from './types';
import { insertRender } from '../db';
import { postProcessRender, markRenderFailed, markRenderProcessing } from './postProcessor';
import { notifyRenderComplete, buildWebhookPayload } from '../services/webhookNotifier';
import { renderVideo, RenderVideoProgress } from '../render/renderVideo';
import { OutputFormat } from '../render/FFmpegEncoder';

/**
 * Log worker messages with timestamp
 */
function workerLog(message: string): void {
  console.log(`[Worker] ${message}`);
}

let worker: Worker<RenderJobData> | null = null;

/**
 * Process a single render job.
 */
async function processRenderJob(job: Job<RenderJobData>): Promise<void> {
  const { batchId, audioFile, template, outputFormat } = job.data;

  // Log to file for debugging
  workerLog(`Processing job ${job.id}: ${audioFile.originalName} -> ${outputFormat}`);

  // Create database record if not exists
  let renderDbId = job.data.renderDbId;
  if (!renderDbId) {
    const render = insertRender({
      batch_id: batchId,
      audio_name: audioFile.originalName.replace(/\.[^/.]+$/, ''), // Remove extension
      audio_path: audioFile.path,
      template,
      output_format: outputFormat,
    });
    renderDbId = render.id;

    // Update job data with DB ID for potential retries
    await job.updateData({ ...job.data, renderDbId });
  }

  try {
    // Mark as processing
    await markRenderProcessing(renderDbId);
    await job.updateProgress(5);

    // Generate temp output path - use proper Windows temp directory
    const tempDir = process.env.RENDER_OUTPUT_DIR || process.env.TEMP || 'C:/temp';
    const tempOutputPath = `${tempDir}/render_${renderDbId}_${Date.now()}.mp4`;

    // Run the actual render pipeline
    workerLog(`Starting render: ${audioFile.originalName} -> ${template} -> ${outputFormat}`);
    workerLog(`Audio path: ${audioFile.path}`);
    workerLog(`Output path: ${tempOutputPath}`);

    let lastStage = '';
    const renderResult = await renderVideo({
      audioPath: audioFile.path,
      outputPath: tempOutputPath,
      template,
      format: outputFormat as OutputFormat,
      fps: 30,
      quality: 'balanced',
      onProgress: (progress: RenderVideoProgress) => {
        // Map render progress (0-100) to job progress (5-90)
        const jobProgress = 5 + (progress.overallProgress * 0.85);
        job.updateProgress(Math.round(jobProgress));

        // Log only when stage changes
        if (progress.stage !== lastStage) {
          workerLog(`${progress.stage}: ${progress.message}`);
          lastStage = progress.stage;
        }
      },
    });

    if (!renderResult.success) {
      throw new Error(`Render failed: ${renderResult.error}`);
    }

    workerLog(`Render complete in ${renderResult.duration.toFixed(1)}s (${renderResult.stages.capture.frames} frames)`);
    await job.updateProgress(90);

    // Post-process: rename, update metadata
    const result = await postProcessRender(renderDbId, tempOutputPath);

    await job.updateProgress(100);

    workerLog(`Completed: ${result.fileName} (${(result.fileSizeBytes / 1024 / 1024).toFixed(1)} MB)`);

    // Queue transcription job (will be implemented in 04-05)
    try {
      const { addTranscriptionJob } = await import('./transcriptionQueue');
      await addTranscriptionJob({
        renderDbId,
        audioPath: audioFile.path,
        audioName: audioFile.originalName.replace(/\.[^/.]+$/, ''),
      });
      workerLog(`Queued transcription for: ${audioFile.originalName}`);
    } catch {
      // Transcription module not available yet - skip
      workerLog('Transcription skipped (module not available)');
    }

    // Check batch completion and notify (will be implemented in 04-07)
    if (batchId) {
      try {
        const { checkBatchCompletion } = await import('./batchTracker');
        await checkBatchCompletion(batchId);
      } catch {
        // Batch tracker not available yet - skip
      }
    }

    // Send webhook notification for n8n automation (Phase 5)
    // Fire and forget - don't block the queue
    const webhookPayload = buildWebhookPayload(job.id || renderDbId, 'complete', {
      audioFile: audioFile.originalName,
      outputPath: result.finalPath,
      outputFormat,
      driveUrl: result.gdriveUrl,
      template,
      duration: renderResult.duration,
      batchId,
    });
    notifyRenderComplete(webhookPayload).catch((err) => {
      workerLog(`Webhook notification failed: ${err}`);
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workerLog(`FAILED job ${job.id}: ${message}`);
    await markRenderFailed(renderDbId, message);

    // Send individual failure notification (will be implemented in 04-07)
    try {
      const { notifyJobFailed } = await import('../services/notifications');
      await notifyJobFailed(job.id || 'unknown', audioFile.originalName, message);
    } catch {
      // Notifications not available yet - skip
    }

    // Send failure webhook notification for n8n (Phase 5)
    // Fire and forget - don't block the queue
    const failurePayload = buildWebhookPayload(job.id || renderDbId, 'failed', {
      audioFile: audioFile.originalName,
      template,
      batchId,
      errorMessage: message,
    });
    notifyRenderComplete(failurePayload).catch((err) => {
      workerLog(`Failure webhook notification failed: ${err}`);
    });

    throw error; // Re-throw for BullMQ retry handling
  }
}


/**
 * Start the render worker.
 * Processes one job at a time (GPU-bound).
 */
export function startWorker(): Worker<RenderJobData> {
  if (worker) {
    console.warn('[Worker] Already running');
    return worker;
  }

  worker = new Worker<RenderJobData>('render-queue', processRenderJob, {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time (GPU-bound)
    lockDuration: 300000, // 5 minutes lock (long renders)
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
  });

  console.log('[Worker] Started, waiting for jobs...');
  return worker;
}

/**
 * Stop the render worker gracefully.
 */
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker] Stopped');
  }
}
