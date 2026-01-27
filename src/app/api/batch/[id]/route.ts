/**
 * Batch status API endpoint.
 * Returns detailed status for a specific batch.
 *
 * Phase 4, Plan 04-09
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBatchStatus } from '@/lib/queue/bullmqQueue';
import { getRendersByBatch } from '@/lib/db';

/**
 * GET: Get batch status and render details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: batchId } = await params;

  try {
    // Get queue status
    const queueStatus = await getBatchStatus(batchId);

    // Get database records for more detail
    const renders = getRendersByBatch(batchId);

    return NextResponse.json({
      batchId,
      status: queueStatus,
      renders: renders.map(r => ({
        id: r.id,
        audioName: r.audio_name,
        format: r.output_format,
        status: r.status,
        outputPath: r.output_path,
        gdriveUrl: r.gdrive_url,
        error: r.error_message,
      })),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
