import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';

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
      // Generate a temporary jobId-like key for the upload, then create
      // the job with that storage key in metadata.
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
