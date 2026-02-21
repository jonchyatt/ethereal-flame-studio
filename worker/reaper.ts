/**
 * Stale job reaper — marks processing jobs as failed if their
 * updatedAt timestamp exceeds the configured timeout threshold.
 *
 * Runs periodically from the worker's main loop. Uses a single
 * max timeout for Phase 13 simplicity. Per-job-type timeouts can
 * be added in Phase 14 if needed.
 */

import type { JobStore } from '../src/lib/jobs/types';

/**
 * Run a reaper pass: mark stale processing jobs as failed.
 *
 * @param store - The JobStore to query and update
 * @param timeouts - Per-type timeout map; uses `default` key (10 min fallback)
 * @returns Number of jobs marked as failed
 */
export async function runReaper(
  store: JobStore,
  timeouts: Record<string, number>,
): Promise<number> {
  const timeoutMs = timeouts.default || 600_000; // 10 minutes fallback

  const count = await store.markStaleJobsFailed(timeoutMs);

  if (count > 0) {
    console.log(`[Reaper] Marked ${count} stale job(s) as failed`);
  }

  return count;
}
