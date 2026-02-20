import { NextRequest, NextResponse } from 'next/server';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';

const assetService = new AudioAssetService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await assetService.getAsset(id);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Asset ${id} not found` } },
        { status: 404 }
      );
    }

    // Load peaks if available via storage adapter
    const storage = assetService.getStorage();
    let peaks: Record<string, number[]> | null = null;
    try {
      const peaksData = await storage.get(`${assetService.getAssetPrefix(id)}peaks.json`);
      if (peaksData) peaks = JSON.parse(peaksData.toString('utf-8'));
    } catch { /* no peaks file */ }

    // Load saved edits if available via storage adapter
    let edits = null;
    try {
      const editsData = await storage.get(`${assetService.getAssetPrefix(id)}edits.json`);
      if (editsData) edits = JSON.parse(editsData.toString('utf-8'));
    } catch { /* no edits file */ }

    return NextResponse.json({
      success: true,
      data: { ...asset, peaks, edits },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const force = request.nextUrl.searchParams.get('force') === 'true';

    const asset = await assetService.getAsset(id);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Asset ${id} not found` } },
        { status: 404 }
      );
    }

    await assetService.deleteAssetSafe(id, force);

    return NextResponse.json({
      success: true,
      data: { deleted: id },
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('referenced') ? 409 : 500;
    return NextResponse.json(
      { success: false, error: { code: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status }
    );
  }
}
