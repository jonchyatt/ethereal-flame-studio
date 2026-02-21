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
import { ServerJobStore } from '@/lib/queue/ServerJobStore';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';
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
      // Debug logging for audio input
      if (body && typeof body === 'object' && 'audio' in body) {
        const audio = (body as { audio: { type?: string; data?: string } }).audio;
        console.log('[API] Audio input type:', audio?.type);
        console.log('[API] Audio data length:', audio?.data?.length ?? 'undefined');
      }
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
    const storage = getStorageAdapter();
    const jobStore = getJobStore();

    // Generate a temporary jobId for storage key construction
    // (The real jobId is created by jobStore.create, but we need a key prefix
    //  before that — use a UUID then rename if needed. Actually, we create the
    //  job first and use its ID for the storage key.)
    //
    // Strategy: Create the job first (to get jobId), then upload audio to
    // storage keyed by that jobId, then update the job metadata with the
    // storage key. This avoids orphaned uploads.

    // -- Resolve audio input and prepare metadata for the render job -----------

    let audioName: string;
    let audioStorageKey: string | undefined;
    let audioUrl: string | undefined;

    // We need the jobId before uploading, so we create the job first with
    // placeholder metadata, then update after upload.
    const ext = resolveAudioExtension(input);

    switch (input.audio.type) {
      case 'base64':
        audioName = input.audio.filename;
        break;

      case 'url':
        audioName = input.audio.filename || extractFilenameFromUrl(input.audio.url);
        audioUrl = input.audio.url;
        break;

      case 'path':
        audioName = extractFilenameFromPath(input.audio.path);
        break;

      case 'asset':
        audioName = `asset-${input.audio.assetId}`;
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

    // Build visual config for worker pipeline
    const visualConfig = {
      mode: input.renderSettings?.visualMode || 'flame',
      skyboxPreset: input.renderSettings?.skyboxPreset || 'nebula',
      skyboxRotationSpeed: input.renderSettings?.skyboxRotationSpeed || 0,
      waterEnabled: input.renderSettings?.waterEnabled || false,
      waterColor: input.renderSettings?.waterColor || '#1a3a5c',
      waterReflectivity: input.renderSettings?.waterReflectivity || 0.5,
      layers: input.renderSettings?.particleLayers || [],
    };

    // Derive callback URL for worker to pass to Modal
    const callbackUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      'http://localhost:3000';

    // Create the render job in JobStore (pending state, worker will pick it up)
    const renderJob = await jobStore.create('render', {
      audioName,
      outputFormat: input.outputFormat,
      fps: input.fps,
      quality: input.priority,
      visualConfig,
      callbackUrl,
      // These will be set after upload:
      audioStorageKey: undefined,
      audioUrl: audioUrl,
    });

    // -- Upload audio to storage for non-URL input types ----------------------

    if (input.audio.type !== 'url') {
      const storageKey = `renders/${renderJob.jobId}/audio.${ext}`;

      try {
        let audioBuffer: Buffer;

        switch (input.audio.type) {
          case 'base64':
            audioBuffer = Buffer.from(input.audio.data, 'base64');
            break;

          case 'path': {
            const { promises: fsPromises } = await import('fs');
            audioBuffer = await fsPromises.readFile(input.audio.path);
            break;
          }

          case 'asset': {
            const { AudioAssetService } = await import('@/lib/audio-prep/AudioAssetService');
            const assetService = new AudioAssetService({}, storage);
            const assetPath = await assetService.resolveAssetPath(input.audio.assetId);
            const { promises: fsPromises } = await import('fs');
            audioBuffer = await fsPromises.readFile(assetPath);
            break;
          }

          default:
            throw new Error(`Unexpected audio type: ${(input.audio as { type: string }).type}`);
        }

        await storage.put(storageKey, audioBuffer);
        audioStorageKey = storageKey;

        console.log(`[API] Uploaded audio to storage: ${storageKey} (${audioBuffer.length} bytes)`);
      } catch (uploadError) {
        // Clean up the pending job if upload fails
        await jobStore.fail(renderJob.jobId, `Audio upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        console.error('[API] Failed to upload audio to storage:', uploadError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUDIO_UPLOAD_ERROR',
              message: 'Failed to upload audio to storage',
            },
          },
          { status: 500 }
        );
      }

      // Update job metadata with the storage key
      await jobStore.update(renderJob.jobId, {
        result: { audioStorageKey },
      });
      // Also store in metadata by re-creating via update workaround:
      // The JobStore.update only accepts JobUpdate fields (status, progress, stage, result, error, retryCount).
      // We stored audioStorageKey in result temporarily; the worker will read from both metadata and result.
      // Actually, the best approach: we set it in metadata at creation. Let's update the job's
      // metadata through a second create approach... but JobStore doesn't have updateMetadata.
      // Instead, we'll use the result field which the worker can read.
    }

    // Get queue position
    const position = await jobStore.getQueuePosition(renderJob.jobId);

    // Estimate duration (simple heuristic)
    const formatMeta = OUTPUT_FORMAT_META[input.outputFormat as keyof typeof OUTPUT_FORMAT_META];
    const estimatedDuration = formatMeta
      ? Math.round(formatMeta.estimatedFileSizeMB(180, input.fps) * 2)
      : 300;

    console.log(`[API] Render job ${renderJob.jobId} created in JobStore (worker will dispatch to Modal)`);

    return NextResponse.json({
      success: true,
      data: {
        jobId: renderJob.jobId,
        status: 'pending' as const,
        audioName,
        outputFormat: input.outputFormat,
        targetMachine: null,
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
function extractFilenameFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || 'audio.mp3';
}

/**
 * Resolve audio file extension from the input type
 */
function resolveAudioExtension(input: { audio: { type: string; filename?: string; url?: string; path?: string } }): string {
  let filename = '';
  switch (input.audio.type) {
    case 'base64':
      filename = input.audio.filename || '';
      break;
    case 'url':
      filename = input.audio.url || '';
      break;
    case 'path':
      filename = input.audio.path || '';
      break;
    default:
      return 'mp3';
  }
  const match = filename.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : 'mp3';
}
