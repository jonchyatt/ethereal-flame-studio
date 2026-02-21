/**
 * Job processor — stub for Task 1 compilation.
 * Full implementation in Task 2.
 */

import type { JobStore, AudioPrepJob } from '../src/lib/jobs/types';

export async function processJob(store: JobStore, job: AudioPrepJob): Promise<void> {
  // Placeholder — implemented in Task 2
  console.log(`[Worker] Processing ${job.type} job ${job.jobId} — stub`);
  await store.complete(job.jobId, { placeholder: true });
}
