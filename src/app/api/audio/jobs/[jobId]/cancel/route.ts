import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';

/**
 * POST /api/audio/jobs/[jobId]/cancel
 *
 * Sets a job's status to 'cancelled' in the database.  The actual process
 * termination (SIGTERM to child process) is handled by the worker in plan
 * 13-03 — the worker detects `status === 'cancelled'` on its next poll
 * cycle and kills the child process.
 *
 * Returns 409 if the job is already in a terminal state (complete, failed,
 * cancelled) since re-cancelling is a no-op.
 */

const TERMINAL_STATES = new Set(['complete', 'failed', 'cancelled']);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const store = getJobStore();
    const job = await store.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 },
      );
    }

    if (TERMINAL_STATES.has(job.status)) {
      return NextResponse.json(
        { error: 'Job already in terminal state', status: job.status },
        { status: 409 },
      );
    }

    // Transition to cancelled — worker handles actual process cleanup
    await store.cancel(jobId);

    return NextResponse.json({
      jobId,
      status: 'cancelled' as const,
      message: 'Job cancellation requested',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
