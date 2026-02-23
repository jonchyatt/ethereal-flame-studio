import { NextRequest, NextResponse } from 'next/server';
import { listCreatorRenderPacks } from '@/lib/creator/store';
import { buildCreatorPackSyncSummary } from '@/lib/creator/sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get('limit') || 50)));
    const packs = await listCreatorRenderPacks(limit);
    const rows = await Promise.all(
      packs.map(async (pack) => ({
        pack,
        live: await buildCreatorPackSyncSummary(pack),
      })),
    );

    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc.byStatus[row.live.overallStatus] = (acc.byStatus[row.live.overallStatus] || 0) + 1;
        acc.renderTotal += row.live.render.total;
        acc.renderComplete += row.live.render.complete;
        acc.recutTotal += row.live.recut.total;
        acc.recutComplete += row.live.recut.complete;
        acc.publishTotal += row.live.publish.total;
        acc.publishComplete += row.live.publish.complete;
        acc.publishScheduled += row.live.publish.scheduled;
        return acc;
      },
      {
        total: 0,
        byStatus: {} as Record<string, number>,
        renderTotal: 0,
        renderComplete: 0,
        recutTotal: 0,
        recutComplete: 0,
        publishTotal: 0,
        publishComplete: 0,
        publishScheduled: 0,
      },
    );

    return NextResponse.json({ success: true, data: { rows, summary } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

