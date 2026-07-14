import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { PlaylistReviewRequestSchema, PlaylistCurationConflict } from '@/lib/playlist-batch/curation';
import { reviewPlaylistItem } from '@/lib/playlist-batch/service';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth }, { status: auth.status });

  const { id, index } = await params;
  const itemIndex = Number(index);
  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Item index must be a non-negative integer' } },
      { status: 400 },
    );
  }

  try {
    const body = PlaylistReviewRequestSchema.parse(await request.json());
    const reviewed = await reviewPlaylistItem({
      store: getJobStore(),
      batchId: id,
      itemIndex,
      request: body,
      actor: auth.actor,
    });
    return NextResponse.json({ success: true, data: reviewed });
  } catch (error) {
    if (error instanceof PlaylistCurationConflict) {
      return NextResponse.json(
        { success: false, error: { code: 'REVIEW_CONFLICT', message: error.message } },
        { status: 409 },
      );
    }
    const validation = error && typeof error === 'object' && 'issues' in error;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: validation ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: validation ? 400 : 500 },
    );
  }
}
