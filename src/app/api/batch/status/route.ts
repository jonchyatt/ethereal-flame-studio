/**
 * Overall queue status API endpoint.
 * Returns summary of all jobs in the queue.
 *
 * Phase 4, Plan 04-09
 */

import { NextResponse } from 'next/server';
import { renderQueue } from '@/lib/queue/bullmqQueue';

/**
 * GET: Get overall queue status.
 */
export async function GET() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      renderQueue.getWaitingCount(),
      renderQueue.getActiveCount(),
      renderQueue.getCompletedCount(),
      renderQueue.getFailedCount(),
    ]);

    return NextResponse.json({
      queue: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
