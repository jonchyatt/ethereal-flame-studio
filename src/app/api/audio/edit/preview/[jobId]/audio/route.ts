import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';

/**
 * Serve the rendered preview audio for browser playback.
 *
 * Uses the storage adapter to read the file (local) or redirect to a signed
 * URL (R2). The preview key is stored in job.result.previewKey by the worker.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const store = getJobStore();
  const job = await store.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Job ${jobId} not found` } },
      { status: 404 }
    );
  }

  if (job.status !== 'complete' || !job.result?.previewKey) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_READY', message: 'Preview not yet complete' } },
      { status: 409 }
    );
  }

  try {
    const previewKey = job.result.previewKey as string;
    const storage = getStorageAdapter();
    const backend = process.env.STORAGE_BACKEND || 'local';

    if (backend === 'r2') {
      // For R2: redirect to a signed URL (CDN offload)
      const signedUrl = await storage.getSignedUrl(previewKey);
      return NextResponse.json({
        success: true,
        data: { downloadUrl: signedUrl },
      });
    }

    // For local storage: read the file and serve it directly
    const data = await storage.get(previewKey);
    if (!data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Preview file not found in storage' } },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(data.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Preview file not found in storage' } },
      { status: 404 }
    );
  }
}
