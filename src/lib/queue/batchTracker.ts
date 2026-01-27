/**
 * Batch completion tracking and notifications.
 * Detects when all jobs in a batch complete and sends notifications.
 *
 * Phase 4, Plan 04-07
 */

import { getRendersByBatch } from '../db';
import { notifyBatchComplete, notifyBatchStarted, BatchStatus } from '../services/notifications';

// Track which batches we've already notified about
const notifiedBatches = new Set<string>();

/**
 * Check if a batch has completed and send notification if so.
 *
 * @param batchId - ID of the batch to check
 * @returns Batch status if complete, null otherwise
 */
export async function checkBatchCompletion(batchId: string): Promise<BatchStatus | null> {
  // Skip if already notified
  if (notifiedBatches.has(batchId)) {
    return null;
  }

  const renders = getRendersByBatch(batchId);

  if (renders.length === 0) {
    return null;
  }

  const completed = renders.filter(r => r.status === 'completed').length;
  const failed = renders.filter(r => r.status === 'failed').length;
  const pending = renders.filter(r => r.status === 'pending' || r.status === 'processing').length;

  // Batch is complete when no jobs are pending/processing
  if (pending > 0) {
    return null;
  }

  const status: BatchStatus = {
    batchId,
    total: renders.length,
    completed,
    failed,
  };

  // Mark as notified and send notification
  notifiedBatches.add(batchId);
  await notifyBatchComplete(status);

  // Clean up old batch IDs (keep last 1000)
  if (notifiedBatches.size > 1000) {
    const toRemove = Array.from(notifiedBatches).slice(0, 100);
    toRemove.forEach(id => notifiedBatches.delete(id));
  }

  return status;
}

/**
 * Notify that a batch has been created.
 */
export async function onBatchCreated(
  batchId: string,
  fileCount: number,
  formatCount: number
): Promise<void> {
  await notifyBatchStarted(batchId, fileCount, formatCount);
}

/**
 * Clear notification state (useful for testing).
 */
export function clearNotificationState(): void {
  notifiedBatches.clear();
}
