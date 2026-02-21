import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';

/**
 * Job poll response shape.
 *
 * Consumers poll this endpoint to track progress.  When `stage` is set but
 * `progress` is 0, the frontend should interpret this as an indeterminate
 * stage (no fake progress bars).
 */
export interface JobPollResponse {
  jobId: string;
  type: 'ingest' | 'preview' | 'save' | 'render';
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number; // 0-100 within current stage
  stage: string | null; // descriptive name: "downloading", "normalizing", etc.
  queuePosition: number | null; // only set when status='pending'
  result?: Record<string, unknown>; // only set when status='complete'
  error?: string; // only set when status='failed'
  downloadUrl?: string; // signed URL when job complete with storage key in result
  createdAt: string;
  updatedAt: string;
}

export async function GET(
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

    // Build response — only include optional fields when relevant
    const response: JobPollResponse = {
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      queuePosition: null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    // Queue position only meaningful for pending jobs
    if (job.status === 'pending') {
      response.queuePosition = await store.getQueuePosition(jobId);
    }

    // Result only present on completed jobs
    if (job.status === 'complete' && job.result) {
      response.result = job.result;

      // Generate a signed download URL if the result contains a storage key.
      // Workers store results with keys like previewKey, preparedKey, videoKey, or assetId.
      const storageKey =
        (job.result.videoKey as string | undefined) ||
        (job.result.previewKey as string | undefined) ||
        (job.result.preparedKey as string | undefined);

      if (storageKey) {
        try {
          const storage = getStorageAdapter();
          // Use 7-day expiry for video downloads (large files, user may return later)
          const expirySeconds = job.result.videoKey ? 7 * 24 * 3600 : undefined;
          response.downloadUrl = await storage.getSignedUrl(storageKey, expirySeconds);
        } catch {
          // Non-fatal: downloadUrl is optional. If signing fails (e.g. key
          // deleted), the poll response still returns the result object.
        }
      }
    }

    // Error only present on failed jobs
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
