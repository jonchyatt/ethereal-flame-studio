import { NextRequest, NextResponse } from 'next/server';
import { getContentLibraryItem, getCreatorRenderPack } from '@/lib/creator/store';
import { buildCreatorPackSyncSummary, syncCreatorRenderPackStatus } from '@/lib/creator/sync';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const syncMode = request.nextUrl.searchParams.get('sync') || 'live';

    if (syncMode === 'persist') {
      const { pack, summary } = await syncCreatorRenderPackStatus(id);
      const contentItem = pack.contentLibraryItemId ? await getContentLibraryItem(pack.contentLibraryItemId) : null;
      return NextResponse.json({ success: true, data: { pack, contentItem, live: summary } });
    }

    const pack = await getCreatorRenderPack(id);
    if (!pack) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Creator render pack not found' } },
        { status: 404 },
      );
    }

    const [contentItem, live] = await Promise.all([
      pack.contentLibraryItemId ? getContentLibraryItem(pack.contentLibraryItemId) : Promise.resolve(null),
      buildCreatorPackSyncSummary(pack),
    ]);

    return NextResponse.json({ success: true, data: { pack, contentItem, live } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

