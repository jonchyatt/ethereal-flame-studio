/**
 * Render API - Job Submission and List Endpoint
 *
 * POST /api/render - Submit a new render job
 * GET /api/render - List all render jobs
 *
 * Phase 3, Plan 03-08
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Export configuration from request body
 */
interface RenderJobRequest {
  type: string;
  fps: 30 | 60;
  templateId?: string;
  outputName: string;
  // audioFile is handled separately via FormData
}

/**
 * In-memory job store for server-side API
 * In production, this would use Redis, SQLite, or PostgreSQL
 */
const serverJobs: Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: RenderJobRequest;
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}> = new Map();

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/render - Submit new render job
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RenderJobRequest;

    // Validate required fields
    if (!body.type || !body.outputName) {
      return NextResponse.json(
        { error: 'Missing required fields: type, outputName' },
        { status: 400 }
      );
    }

    // Validate export type
    const validTypes = [
      'flat-1080p-landscape', 'flat-1080p-portrait',
      'flat-4k-landscape', 'flat-4k-portrait',
      '360-mono-4k', '360-mono-6k', '360-mono-8k',
      '360-stereo-8k',
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid export type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create job
    const jobId = generateJobId();
    const job = {
      id: jobId,
      status: 'pending' as const,
      config: body,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    serverJobs.set(jobId, job);

    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Job submitted successfully',
    });

  } catch (error) {
    console.error('POST /api/render error:', error);
    return NextResponse.json(
      { error: 'Failed to submit job' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/render - List all jobs
 */
export async function GET(): Promise<NextResponse> {
  try {
    const jobs = Array.from(serverJobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate summary
    const summary = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };

    return NextResponse.json({
      jobs,
      summary,
    });

  } catch (error) {
    console.error('GET /api/render error:', error);
    return NextResponse.json(
      { error: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
