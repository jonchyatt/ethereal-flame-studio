/**
 * Render API - Individual Job Endpoint
 *
 * GET /api/render/[id] - Get job status
 * DELETE /api/render/[id] - Cancel/delete job
 *
 * Phase 3, Plan 03-08
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory job store (shared with main route in production via module)
 * In real production, this would be a database query
 */
const serverJobs: Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: Record<string, unknown>;
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}> = new Map();

/**
 * Route segment config
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/render/[id] - Get job status
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const job = serverJobs.get(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('GET /api/render/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/render/[id] - Cancel or delete job
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const job = serverJobs.get(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If processing, mark as failed (cancel)
    if (job.status === 'processing') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        message: 'Job cancelled',
        job,
      });
    }

    // If pending, completed, or failed, delete
    serverJobs.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
    });

  } catch (error) {
    console.error('DELETE /api/render/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel/delete job' },
      { status: 500 }
    );
  }
}
