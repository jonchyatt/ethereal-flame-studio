/**
 * Render API - Individual Job Endpoint
 *
 * GET /api/render/[id] - Get job status and details
 * DELETE /api/render/[id] - Cancel or delete a job
 * PATCH /api/render/[id] - Update job (internal use)
 *
 * Phase 3/4 Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ServerJobStore } from '@/lib/queue/ServerJobStore';
import {
  RenderJob,
  JobStatus,
  JOB_STATUS_META,
  isTerminalState,
  isActiveState,
} from '@/lib/render/schema/types';

/**
 * Route segment config
 */
export const dynamic = 'force-dynamic';

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface GetJobResponse {
  success: true;
  data: {
    job: {
      id: string;
      batchId: string | null;
      status: JobStatus;
      statusMeta: {
        label: string;
        color: string;
        isTerminal: boolean;
        isActive: boolean;
      };
      progress: number;
      currentStage: string;

      audio: {
        name: string;
        duration: number;
        path: string;
      };

      output: {
        format: string;
        fps: number;
        estimatedCompletion: string | null;
      };

      machine: {
        id: string;
        name: string;
      } | null;

      timing: {
        createdAt: string;
        queuedAt: string | null;
        startedAt: string | null;
        completedAt: string | null;
        elapsedSeconds: number;
      };

      error: {
        message: string;
        retryable: boolean;
        attemptCount: number;
        maxAttempts: number;
      } | null;
    };

    // Additional details for completed jobs
    result?: {
      output: RenderJob['output'];
      downloadUrl: string | null;
    };
  };
}

interface DeleteJobResponse {
  success: true;
  data: {
    jobId: string;
    action: 'cancelled' | 'deleted';
    message: string;
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
// GET /api/render/[id] - Get job status and details
// =============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetJobResponse | ApiErrorResponse>> {
  try {
    const { id } = await context.params;

    // Fetch job
    const job = await ServerJobStore.get(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Job not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Modal status fallback: if the job has a modalCallId and is not yet
    // in a terminal state, poll Modal for the latest status. This is a
    // belt-and-suspenders approach — the Modal container also PATCHes
    // the job directly via callback.
    const modalCallId = (job.userMetadata as Record<string, unknown>)?.modalCallId;
    if (modalCallId && typeof modalCallId === 'string' && !isTerminalState(job.status)) {
      try {
        const { getModalJobStatus } = await import('@/lib/render/modalClient');
        const modalStatus = await getModalJobStatus(modalCallId);

        if (modalStatus.status === 'completed' && modalStatus.result) {
          const r2Key = modalStatus.result.r2_key;
          const r2Url = r2Key
            ? `https://renders.etherealflame.studio/${r2Key}`
            : undefined;

          await ServerJobStore.update(id, {
            status: 'completed',
            progress: 100,
            currentStage: 'Complete',
            completedAt: new Date().toISOString(),
            ...(r2Url
              ? {
                  output: {
                    format: job.outputFormat,
                    localPath: r2Url,
                    fileSizeBytes: 0,
                    durationSeconds: job.audioDuration || 0,
                    resolution: { width: 0, height: 0 },
                    encoding: {
                      codec: 'h264' as const,
                      bitrate: 0,
                      crf: 23,
                      preset: 'balanced',
                    },
                    gdriveUrl: null,
                    gdriveFileId: null,
                    renderStartedAt: job.startedAt || new Date().toISOString(),
                    renderCompletedAt: new Date().toISOString(),
                    uploadedAt: null,
                  },
                }
              : {}),
          });
          // Re-fetch the updated job
          const refreshed = await ServerJobStore.get(id);
          if (refreshed) {
            Object.assign(job, refreshed);
          }
        } else if (modalStatus.status === 'failed') {
          await ServerJobStore.update(id, {
            status: 'failed',
            errorMessage: modalStatus.error || 'Modal render failed',
            currentStage: 'Failed',
            completedAt: new Date().toISOString(),
          });
          const refreshed = await ServerJobStore.get(id);
          if (refreshed) {
            Object.assign(job, refreshed);
          }
        }
      } catch (modalErr) {
        // Non-fatal — just use whatever status we already have
        console.warn('[API] Modal status poll failed:', modalErr);
      }
    }

    // Calculate elapsed time
    const elapsedSeconds = calculateElapsedSeconds(job);

    // Estimate completion time for active jobs
    const estimatedCompletion = estimateCompletion(job);

    // Build response
    const response: GetJobResponse = {
      success: true,
      data: {
        job: {
          id: job.id,
          batchId: job.batchId,
          status: job.status,
          statusMeta: JOB_STATUS_META[job.status],
          progress: job.progress,
          currentStage: job.currentStage,

          audio: {
            name: job.audioName,
            duration: job.audioDuration,
            path: job.audioPath,
          },

          output: {
            format: job.outputFormat,
            fps: job.fps,
            estimatedCompletion,
          },

          machine: job.workerId ? {
            id: job.workerId,
            name: `Worker ${job.workerId.slice(-8)}`,
          } : null,

          timing: {
            createdAt: job.createdAt,
            queuedAt: job.queuedAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            elapsedSeconds,
          },

          error: job.errorMessage ? {
            message: job.errorMessage,
            retryable: job.attemptCount < job.maxAttempts,
            attemptCount: job.attemptCount,
            maxAttempts: job.maxAttempts,
          } : null,
        },
      },
    };

    // Add result for completed jobs
    if (job.status === 'completed' && job.output) {
      response.data.result = {
        output: job.output,
        downloadUrl: job.output.gdriveUrl || job.output.localPath,
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET /api/render/[id] error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get job status',
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/render/[id] - Cancel or delete a job
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteJobResponse | ApiErrorResponse>> {
  try {
    const { id } = await context.params;

    // Fetch job
    const job = await ServerJobStore.get(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Job not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Determine action based on status
    if (isTerminalState(job.status)) {
      // Job is already complete/failed/cancelled - delete it
      await ServerJobStore.delete(id);

      return NextResponse.json({
        success: true,
        data: {
          jobId: id,
          action: 'deleted',
          message: `Job ${id} deleted successfully`,
        },
      });
    }

    // Job is active or pending - cancel it
    try {
      await ServerJobStore.cancel(id);

      // In production, we would also:
      // - Remove from BullMQ queue
      // - Signal worker to stop processing
      // - Clean up temporary files

      return NextResponse.json({
        success: true,
        data: {
          jobId: id,
          action: 'cancelled',
          message: `Job ${id} cancelled successfully`,
        },
      });
    } catch (cancelError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANCEL_FAILED',
            message: cancelError instanceof Error ? cancelError.message : 'Failed to cancel job',
          },
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('DELETE /api/render/[id] error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to cancel/delete job',
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/render/[id] - Update job (for internal/worker use)
// =============================================================================

const UpdateJobSchema = z.object({
  status: z.enum([
    'pending', 'queued', 'analyzing', 'transcribing', 'rendering',
    'encoding', 'injecting', 'uploading', 'completed', 'failed',
    'cancelled', 'stalled',
  ]).optional(),
  progress: z.number().min(0).max(100).optional(),
  currentStage: z.string().optional(),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  workerId: z.string().optional(),
  output: z.object({
    format: z.string(),
    localPath: z.string(),
    fileSizeBytes: z.number(),
    durationSeconds: z.number(),
    resolution: z.object({
      width: z.number(),
      height: z.number(),
    }),
    encoding: z.object({
      codec: z.enum(['h264', 'h265', 'vp9']),
      bitrate: z.number(),
      crf: z.number(),
      preset: z.string(),
    }),
    gdriveUrl: z.string().nullable(),
    gdriveFileId: z.string().nullable(),
    vrMetadata: z.object({
      injected: z.boolean(),
      spherical: z.boolean(),
      stereoMode: z.enum(['mono', 'top-bottom']).nullable(),
      projectionType: z.literal('equirectangular'),
    }).optional(),
    renderStartedAt: z.string(),
    renderCompletedAt: z.string(),
    uploadedAt: z.string().nullable(),
  }).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    // Parse request body
    const body = await request.json();

    // Validate
    const parseResult = UpdateJobSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: parseResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // Check job exists
    const job = await ServerJobStore.get(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Job not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Parameters<typeof ServerJobStore.update>[1] = {};
    const data = parseResult.data;

    if (data.status !== undefined) {
      updates.status = data.status;

      // Set timestamps based on status transitions
      const now = new Date().toISOString();
      if (data.status === 'queued' && !job.queuedAt) {
        updates.queuedAt = now;
      }
      if (isActiveState(data.status) && !job.startedAt) {
        updates.startedAt = now;
      }
      if (isTerminalState(data.status) && !job.completedAt) {
        updates.completedAt = now;
      }
    }

    if (data.progress !== undefined) updates.progress = data.progress;
    if (data.currentStage !== undefined) updates.currentStage = data.currentStage;
    if (data.errorMessage !== undefined) updates.errorMessage = data.errorMessage;
    if (data.errorStack !== undefined) updates.errorStack = data.errorStack;
    if (data.workerId !== undefined) updates.workerId = data.workerId;
    if (data.output !== undefined) updates.output = data.output as RenderJob['output'];

    // Update job
    const updated = await ServerJobStore.update(id, updates);

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: updated.id,
          status: updated.status,
          progress: updated.progress,
          currentStage: updated.currentStage,
          updatedAt: updated.updatedAt,
        },
      },
    });

  } catch (error) {
    console.error('PATCH /api/render/[id] error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update job',
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
 * Calculate elapsed seconds since job started
 */
function calculateElapsedSeconds(job: RenderJob): number {
  const startTime = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
  const endTime = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();

  return Math.floor((endTime - startTime) / 1000);
}

/**
 * Estimate completion time for active jobs
 */
function estimateCompletion(job: RenderJob): string | null {
  if (!isActiveState(job.status) || job.progress <= 0) {
    return null;
  }

  const elapsed = calculateElapsedSeconds(job);
  if (elapsed <= 0) return null;

  // Estimate total time based on current progress
  const estimatedTotal = (elapsed / job.progress) * 100;
  const remaining = estimatedTotal - elapsed;

  if (remaining <= 0) return null;

  const completionTime = new Date(Date.now() + remaining * 1000);
  return completionTime.toISOString();
}
