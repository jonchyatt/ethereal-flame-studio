/**
 * Stale job reaper — stub for Task 1 compilation.
 * Full implementation in Task 2.
 */

import type { JobStore } from '../src/lib/jobs/types';

export async function runReaper(
  store: JobStore,
  timeouts: Record<string, number>,
): Promise<void> {
  // Placeholder — implemented in Task 2
  const count = await store.markStaleJobsFailed(timeouts.default || 600000);
  if (count > 0) {
    console.log(`[Reaper] Marked ${count} stale job(s) as failed`);
  }
}
