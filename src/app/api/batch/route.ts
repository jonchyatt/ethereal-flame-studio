/**
 * Batch job creation API endpoint.
 * Handles file upload and job queue submission.
 *
 * Phase 4, Plan 04-09
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { addBatchJob } from '@/lib/queue/bullmqQueue';
import { onBatchCreated } from '@/lib/queue/batchTracker';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';

/**
 * GET: Show API documentation.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/batch',
    methods: {
      POST: {
        description: 'Create batch render job',
        contentType: 'multipart/form-data',
        fields: {
          files: 'File[] - Audio files to render',
          template: 'string - Template name (flame, mist)',
          formats: 'string[] - Output formats (1080p, 4k, 360mono, 360stereo)',
        },
      },
    },
  });
}

/**
 * POST: Create a new batch job.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get template and formats
    const template = formData.get('template') as string;
    const formats = formData.getAll('formats') as string[];

    if (!template) {
      return NextResponse.json(
        { error: 'Template required' },
        { status: 400 }
      );
    }

    if (formats.length === 0) {
      return NextResponse.json(
        { error: 'At least one output format required' },
        { status: 400 }
      );
    }

    // Get audio files
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one audio file required' },
        { status: 400 }
      );
    }

    // Create upload directory
    const batchDir = join(UPLOAD_DIR, uuid());
    await mkdir(batchDir, { recursive: true });

    // Save files and build audio file list
    const audioFiles = await Promise.all(
      files.map(async (file) => {
        const id = uuid();
        const path = join(batchDir, `${id}_${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path, buffer);

        return {
          id,
          path,
          originalName: file.name,
        };
      })
    );

    // Create batch job
    const { batchId, jobIds } = await addBatchJob(audioFiles, template, formats);

    // Notify batch started
    await onBatchCreated(batchId, audioFiles.length, formats.length);

    return NextResponse.json({
      success: true,
      batchId,
      fileCount: audioFiles.length,
      formatCount: formats.length,
      totalJobs: jobIds.length,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
