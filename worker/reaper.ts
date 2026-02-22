/**
 * Stale job reaper — marks processing jobs as failed if their
 * updatedAt timestamp exceeds the configured timeout threshold.
 *
 * Runs periodically from the worker's main loop. Iterates per-type
 * timeouts first (ingest, preview, save, etc.), then sweeps remaining
 * types with the default timeout.
 */

import type { JobStore } from '../src/lib/jobs/types';

/**
 * Run a reaper pass: mark stale processing jobs as failed.
 *
 * Iterates per-type timeouts first (ingest, preview, save, etc.), then
 * sweeps remaining types with the default timeout.
 *
 * @param store - The JobStore to query and update
 * @param timeouts - Per-type timeout map; 'default' key used as fallback
 * @returns Total number of jobs marked as failed
 */
export async function runReaper(
  store: JobStore,
  timeouts: Record<string, number>,
): Promise<number> {
  let total = 0;

  // Pass 1: Per-type timeouts
  for (const [type, timeoutMs] of Object.entries(timeouts)) {
    if (type === 'default') continue;
    const count = await store.markStaleJobsFailed(timeoutMs, type as 'ingest' | 'preview' | 'save' | 'render');
    total += count;
  }

  // Pass 2: Default timeout for any remaining types not explicitly configured
  const defaultTimeout = timeouts.default || 600_000;
  const remainingCount = await store.markStaleJobsFailed(defaultTimeout);
  // Pass 1 marks matching jobs as failed (status changes from 'processing'
  // to 'failed'), so Pass 2's WHERE status='processing' won't re-match them.
  // The default pass only catches types not in the map (e.g., render if not
  // configured) or future types added later.
  total += remainingCount;

  if (total > 0) {
    console.log(`[Reaper] Marked ${total} stale job(s) as failed`);
  }

  return total;
}
