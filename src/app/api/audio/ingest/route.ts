import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import type { AudioPrepJob } from '@/lib/jobs';

// Allow up to 5 minutes for the after() background processing (Vercel Pro/hobby limit)
export const maxDuration = 300;

const assetService = new AudioAssetService();

// Ingest accepts two content types:
// - application/json for YouTube URLs and direct URLs (small payload)
// - multipart/form-data for file uploads (video_file, audio_file) to avoid base64 memory bloat

const JsonIngestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('youtube'),
    url: z.string().url(),
    rightsAttested: z.literal(true, { message: 'You must attest to having rights to use this audio' }),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
  }),
]);

/**
 * Process a job inline (when no external worker is running).
 * Runs via next/server after() so it executes after the response is sent.
 */
async function processInline(job: AudioPrepJob): Promise<void> {
  const store = getJobStore();
  try {
    // Dynamically import pipeline to avoid bundling issues
    const { runIngestPipeline } = await import('@/lib/ingest-pipeline');
    await runIngestPipeline(store, job, { current: null });
  } catch (err) {
    console.error(`[ingest/inline] Job ${job.jobId} failed:`, err);
    try {
      await store.fail(job.jobId, err instanceof Error ? err.message : String(err));
    } catch { /* ignore secondary failure */ }
  }
}

export async function POST(request: NextRequest) {
  try {
    await assetService.init();

    // Quota check before accepting any upload
    if (!await assetService.checkQuota()) {
      return NextResponse.json(
        { success: false, error: { code: 'QUOTA_EXCEEDED', message: 'Audio asset storage quota exceeded. Delete unused assets.' } },
        { status: 413 }
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    const store = getJobStore();

    if (contentType.includes('multipart/form-data')) {
      // File upload (video_file or audio_file)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const type = formData.get('type') as string;

      if (!file || !type || !['video_file', 'audio_file'].includes(type)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Multipart upload requires "file" and "type" (video_file|audio_file)' } },
          { status: 400 }
        );
      }

      // Buffer the file to storage so the worker can access it later.
      const { randomUUID } = await import('crypto');
      const uploadId = randomUUID();
      const ext = file.name.split('.').pop() || 'bin';
      const storageKey = `ingest-uploads/${uploadId}/original.${ext}`;

      const storage = getStorageAdapter();
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await storage.put(storageKey, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
      });

      const job = await store.create('ingest', {
        sourceType: type,
        storageKey,
        originalFilename: file.name,
      });

      // Process inline via after() — runs after response is sent
      after(() => processInline(job));

      return NextResponse.json({
        success: true,
        data: { jobId: job.jobId, status: 'pending' },
      });
    } else {
      // JSON body (youtube or url)
      const body = await request.json();
      const parsed = JsonIngestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }

      const source = parsed.data;
      const metadata: Record<string, unknown> = {
        sourceType: source.type,
        url: source.url,
      };

      if (source.type === 'youtube') {
        metadata.rightsAttested = true;
      }

      const job = await store.create('ingest', metadata);

      // Process inline via after() — runs after response is sent
      after(() => processInline(job));

      return NextResponse.json({
        success: true,
        data: { jobId: job.jobId, status: 'pending' },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
