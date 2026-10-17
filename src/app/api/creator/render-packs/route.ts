import { NextRequest, NextResponse } from 'next/server';
import { listCreatorRenderPacks } from '@/lib/creator/store';
import { getExportPackPreset } from '@/lib/creator/presets';
import { CreateRenderPackSchema, createRenderPack } from '@/lib/creator/renderPack';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get('limit') || 100);
  const items = await listCreatorRenderPacks(Math.max(1, Math.min(limit, 500)));
  return NextResponse.json({ success: true, data: { packs: items } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateRenderPackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const { pack, contentItem, bundle } = await createRenderPack(input);

    return NextResponse.json({
      success: true,
      data: {
        pack,
        contentItem,
        resolvedBundle: bundle || null,
        resolvedExportPacks: input.exportPackIds.map((id) => getExportPackPreset(id)).filter(Boolean),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
