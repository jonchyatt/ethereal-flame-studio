/**
 * Worker entry point — standalone Render.com background worker.
 *
 * Polls Turso for pending jobs, processes them one at a time,
 * runs a periodic reaper for stale jobs, and shuts down gracefully
 * on SIGTERM/SIGINT.
 */

import 'dotenv/config';
import { TursoJobStore } from '../src/lib/jobs/TursoJobStore';
import { processJob } from './process-job';
import { runReaper } from './reaper';
import type { JobStore } from '../src/lib/jobs/types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS =
  Number(process.env.WORKER_POLL_INTERVAL_MS) || 3000; // 3 seconds

const REAPER_INTERVAL_MS =
  Number(process.env.WORKER_REAPER_INTERVAL_MS) || 30000; // 30 seconds

/** Per-job-type timeout configuration (milliseconds). */
const JOB_TIMEOUTS: Record<string, number> = {
  ingest: Number(process.env.WORKER_INGEST_TIMEOUT_MS) || 10 * 60 * 1000,   // 10 min
  preview: Number(process.env.WORKER_PREVIEW_TIMEOUT_MS) || 5 * 60 * 1000,  // 5 min
  save: Number(process.env.WORKER_SAVE_TIMEOUT_MS) || 15 * 60 * 1000,       // 15 min
  default: Number(process.env.WORKER_DEFAULT_TIMEOUT_MS) || 10 * 60 * 1000, // 10 min
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let shuttingDown = false;
let currentJobPromise: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reaperTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl) {
    console.error('[Worker] TURSO_DATABASE_URL is required');
    process.exit(1);
  }

  const store: JobStore = new TursoJobStore(dbUrl, authToken);

  console.log(
    `[Worker] Started, polling every ${POLL_INTERVAL_MS}ms`,
  );

  // -- Poll loop ----------------------------------------------------------

  pollTimer = setInterval(async () => {
    if (shuttingDown || currentJobPromise) return;

    try {
      const job = await store.claimNextPending();

      if (job) {
        console.log(`[Worker] Claimed job ${job.jobId} (${job.type})`);

        currentJobPromise = processJob(store, job)
          .then(() => {
            console.log(`[Worker] Finished job ${job.jobId}`);
          })
          .catch((err) => {
            console.error(
              `[Worker] Unhandled error processing job ${job.jobId}:`,
              err,
            );
          })
          .finally(() => {
            currentJobPromise = null;
          });
      }
    } catch (err) {
      console.error('[Worker] Error during poll cycle:', err);
    }
  }, POLL_INTERVAL_MS);

  // -- Reaper loop --------------------------------------------------------

  reaperTimer = setInterval(async () => {
    if (shuttingDown) return;

    try {
      await runReaper(store, JOB_TIMEOUTS);
    } catch (err) {
      console.error('[Worker] Reaper error:', err);
    }
  }, REAPER_INTERVAL_MS);

  // -- Graceful shutdown ---------------------------------------------------

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return; // prevent double shutdown
    shuttingDown = true;

    console.log(
      `[Worker] ${signal} received, finishing current job...`,
    );

    // Clear intervals so no new work is picked up
    if (pollTimer) clearInterval(pollTimer);
    if (reaperTimer) clearInterval(reaperTimer);

    // Wait for in-flight job to finish
    if (currentJobPromise) {
      console.log('[Worker] Waiting for current job to complete...');
      try {
        await currentJobPromise;
      } catch {
        // Error already logged in the promise chain
      }
    }

    // Close database connection
    if ('close' in store && typeof (store as TursoJobStore).close === 'function') {
      (store as TursoJobStore).close();
    }

    console.log('[Worker] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
