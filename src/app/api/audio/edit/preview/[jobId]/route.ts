import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const store = getJobStore();
    const job = await store.get(jobId);

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Job ${jobId} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

const TERMINAL_STATES = new Set(['complete', 'failed', 'cancelled']);

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const store = getJobStore();
    const job = await store.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (TERMINAL_STATES.has(job.status)) {
      return NextResponse.json(
        { error: 'Job already in terminal state', status: job.status },
        { status: 409 }
      );
    }

    await store.cancel(jobId);

    return NextResponse.json({
      jobId,
      status: 'cancelled',
      message: 'Job cancellation requested',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
