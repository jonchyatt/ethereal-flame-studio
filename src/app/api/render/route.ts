/**
 * Render API - Job Submission and List Endpoint
 *
 * POST /api/render - Submit a new render job
 * GET /api/render - List all render jobs with pagination
 *
 * Phase 3/4 Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { ServerJobStore } from '@/lib/queue/ServerJobStore';
import { addRenderJob } from '@/lib/queue/bullmqQueue';
import {
  SubmitRenderRequestSchema,
  ListJobsQuerySchema,
  OUTPUT_FORMAT_META,
  JobStatus,
  RenderJobSummary,
} from '@/lib/render/schema/types';

/**
 * Route segment config - force dynamic for API routes
 */
export const dynamic = 'force-dynamic';

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface SubmitRenderResponse {
  success: true;
  data: {
    jobId: string;
    status: 'pending';
    audioName: string;
    outputFormat: string;
    targetMachine: string | null;
    estimatedDuration: number;
    position: number;
  };
}

interface ListJobsResponse {
  success: true;
  data: {
    jobs: RenderJobSummary[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    summary: Record<JobStatus, number>;
  };
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// POST /api/render - Submit a new render job
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SubmitRenderResponse | ApiErrorResponse>> {
  try {
    // Parse request body
    let body: unknown;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data for file uploads
      const formData = await request.formData();
      body = formDataToObject(formData);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be application/json or multipart/form-data',
          },
        },
        { status: 400 }
      );
    }

    // Validate request body with Zod
    const parseResult = SubmitRenderRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: formatZodError(parseResult.error),
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Extract audio information based on input type
    let audioName: string;
    let audioPath: string;
    let audioDuration: number | undefined;

    switch (input.audio.type) {
      case 'base64':
        audioName = input.audio.filename;
        // In production, we would decode and save the base64 data
        // For now, we create a placeholder path
        audioPath = `/tmp/uploads/${Date.now()}_${audioName}`;
        break;

      case 'url':
        audioName = input.audio.filename || extractFilenameFromUrl(input.audio.url);
        audioPath = input.audio.url;
        break;

      case 'path':
        audioPath = input.audio.path;
        audioName = extractFilenameFromPath(input.audio.path);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_AUDIO_INPUT',
              message: 'Invalid audio input type',
            },
          },
          { status: 400 }
        );
    }

    // Create the job
    const job = await ServerJobStore.create({
      audioName,
      audioPath,
      audioDuration,
      outputFormat: input.outputFormat,
      fps: input.fps,
      renderSettings: input.renderSettings,
      priority: input.priority,
      userMetadata: {
        ...input.metadata,
        transcribe: input.transcribe,
        upload: input.upload,
        driveFolderId: input.driveFolderId,
        notifications: input.notifications,
      },
    });

    // Get queue position
    const position = await ServerJobStore.getQueuePosition(job.id);

    // Estimate duration
    const estimatedDuration = ServerJobStore.estimateDuration(
      input.outputFormat,
      job.audioDuration || 180, // Default to 3 minutes if unknown
      input.fps
    );

    // Add job to BullMQ render queue
    try {
      const { jobId: bullmqJobId, batchId } = await addRenderJob(
        {
          id: uuid(),
          path: audioPath,
          originalName: audioName,
          duration: audioDuration,
        },
        input.renderSettings?.template || 'flame',
        input.outputFormat,
        {
          fps: input.fps,
          transcribe: input.transcribe,
          uploadToGDrive: input.upload,
          priority: input.priority,
        }
      );

      console.log(`[API] Job ${job.id} submitted to BullMQ as ${bullmqJobId}`);
    } catch (queueError) {
      console.warn('[API] Failed to add job to BullMQ (queue may not be available):', queueError);
      // Continue without failing - job is tracked in ServerJobStore
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'pending',
        audioName: job.audioName,
        outputFormat: job.outputFormat,
        targetMachine: input.targetMachine || null,
        estimatedDuration,
        position,
      },
    });

  } catch (error) {
    console.error('POST /api/render error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit job',
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/render - List jobs with pagination
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<ListJobsResponse | ApiErrorResponse>> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    // Validate query parameters
    const parseResult = ListJobsQuerySchema.safeParse(queryParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: formatZodError(parseResult.error),
          },
        },
        { status: 400 }
      );
    }

    const query = parseResult.data;

    // Fetch jobs
    const { jobs, total } = await ServerJobStore.list({
      status: query.status,
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    // Get status counts for summary
    const summary = await ServerJobStore.getStatusCounts();

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + jobs.length < total,
        },
        summary,
      },
    });

  } catch (error) {
    console.error('GET /api/render error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list jobs',
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert FormData to a plain object for validation
 */
function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    // Handle nested objects via JSON strings
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        obj[key] = JSON.parse(value);
        continue;
      } catch {
        // Not JSON, treat as string
      }
    }

    // Handle file uploads
    if (value instanceof File) {
      // For now, we convert to base64 format
      // In production, we would handle this differently
      obj[key] = {
        type: 'file',
        filename: value.name,
        mimeType: value.type,
        size: value.size,
      };
      continue;
    }

    // Handle boolean strings
    if (value === 'true') {
      obj[key] = true;
      continue;
    }
    if (value === 'false') {
      obj[key] = false;
      continue;
    }

    // Handle number strings
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      obj[key] = num;
      continue;
    }

    obj[key] = value;
  }

  return obj;
}

/**
 * Format Zod errors for API response
 */
function formatZodError(error: z.ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return details;
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    return filename || 'audio.mp3';
  } catch {
    return 'audio.mp3';
  }
}

/**
 * Extract filename from file path
 */
function extractFilenameFromPath(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || 'audio.mp3';
}
