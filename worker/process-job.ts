/**
 * Job processor — dispatches jobs by type, maintains heartbeat,
 * detects cancellation via polling, and handles child process
 * cleanup with SIGTERM -> SIGKILL escalation.
 *
 * Pipeline modules wired in Phase 14: ingest, preview, save.
 */

import type { ChildProcess } from 'child_process';
import type { JobStore, AudioPrepJob } from '../src/lib/jobs/types';
import { runIngestPipeline } from './pipelines/ingest';
import { runPreviewPipeline } from './pipelines/preview';
import { runSavePipeline } from './pipelines/save';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to check for cancellation (ms). */
const CANCEL_CHECK_INTERVAL_MS = 2000;

/** How often to update heartbeat (ms). */
const HEARTBEAT_INTERVAL_MS = 5000;

/** Grace period before SIGKILL after SIGTERM (ms). */
const SIGKILL_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Transient error detection
// ---------------------------------------------------------------------------

const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'EPIPE',
]);

function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code && TRANSIENT_CODES.has(code)) return true;

    // HTTP 5xx in the message
    if (/\b5\d{2}\b/.test(err.message)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Child process kill helper
// ---------------------------------------------------------------------------

/**
 * Kill a child process with SIGTERM -> SIGKILL escalation.
 * Returns when the process is confirmed dead.
 */
export function killChildProcess(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    // Already dead
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }

    let resolved = false;

    const onExit = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(killTimer);
        resolve();
      }
    };

    child.once('exit', onExit);
    child.once('error', onExit);

    // Send SIGTERM first
    child.kill('SIGTERM');

    // Escalate to SIGKILL after timeout
    const killTimer = setTimeout(() => {
      if (!resolved && child.exitCode === null && !child.killed) {
        child.kill('SIGKILL');
      }
    }, SIGKILL_TIMEOUT_MS);
  });
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

/**
 * Process a single claimed job. Maintains heartbeat, detects cancellation,
 * and handles retry logic for transient vs permanent errors.
 *
 * @param store - The JobStore instance for state updates
 * @param job - The claimed job to process
 * @param _childRef - Optional ref object to expose spawned child process
 *                     for cancellation support
 */
export async function processJob(
  store: JobStore,
  job: AudioPrepJob,
  _childRef?: { current: ChildProcess | null },
): Promise<void> {
  let cancelled = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let cancelCheckTimer: ReturnType<typeof setInterval> | null = null;

  // If no external child ref provided, create a local one
  const childRef = _childRef ?? { current: null };

  try {
    // -- Set up heartbeat --------------------------------------------------
    heartbeatTimer = setInterval(async () => {
      try {
        // Update updatedAt without changing any field — keeps reaper away
        await store.update(job.jobId, {});
      } catch {
        // Heartbeat failure is non-fatal; reaper will catch truly stuck jobs
      }
    }, HEARTBEAT_INTERVAL_MS);

    // -- Set up cancellation detection -------------------------------------
    cancelCheckTimer = setInterval(async () => {
      try {
        const current = await store.get(job.jobId);
        if (current?.status === 'cancelled') {
          cancelled = true;

          // Kill child process if one is running
          if (childRef.current) {
            console.log(
              `[Worker] Job ${job.jobId} cancelled, terminating child process`,
            );
            await killChildProcess(childRef.current);
            console.log(
              `[Worker] Job ${job.jobId} cancelled, child process terminated`,
            );
          } else {
            console.log(
              `[Worker] Job ${job.jobId} cancelled (no child process)`,
            );
          }

          // Update job state
          await store.update(job.jobId, {
            status: 'cancelled',
            stage: null,
            progress: 0,
          });
        }
      } catch {
        // Cancel check failure is non-fatal
      }
    }, CANCEL_CHECK_INTERVAL_MS);

    // -- Dispatch by job type ----------------------------------------------

    if (cancelled) return;

    console.log(
      `[Worker] Processing ${job.type} job ${job.jobId}`,
    );

    await store.update(job.jobId, { stage: 'initializing', progress: 0 });

    if (cancelled) return;

    switch (job.type) {
      case 'ingest':
        await runIngestPipeline(store, job, childRef);
        break;
      case 'preview':
        await runPreviewPipeline(store, job, childRef);
        break;
      case 'save':
        await runSavePipeline(store, job, childRef);
        break;
      default:
        throw new Error(`Unknown job type: ${(job as any).type}`);
    }
  } catch (err) {
    if (cancelled) return; // Don't retry cancelled jobs

    // -- Error handling with auto-retry ------------------------------------
    const error = err instanceof Error ? err : new Error(String(err));

    if (isTransientError(error) && job.retryCount < 1) {
      // Transient error, first attempt -> retry
      console.log(
        `[Worker] Transient error on job ${job.jobId}, scheduling retry: ${error.message}`,
      );
      await store.update(job.jobId, {
        status: 'pending',
        retryCount: job.retryCount + 1,
        stage: null,
        progress: 0,
      });
    } else {
      // Permanent error or retry exhausted -> fail
      console.error(
        `[Worker] Job ${job.jobId} failed: ${error.message}`,
      );
      await store.fail(job.jobId, error.message);
    }
  } finally {
    // -- Cleanup -----------------------------------------------------------
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (cancelCheckTimer) clearInterval(cancelCheckTimer);
  }
}
