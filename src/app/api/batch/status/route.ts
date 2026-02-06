/**
 * Overall queue status API endpoint.
 * Returns summary of all jobs in the queue.
 *
 * Phase 4, Plan 04-09
 */

import { NextResponse } from 'next/server';
import { getRenderQueue } from '@/lib/queue/bullmqQueue';

/**
 * GET: Get overall queue status.
 */
export async function GET() {
  try {
    const queue = getRenderQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
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
