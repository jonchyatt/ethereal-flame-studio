import { NextRequest, NextResponse } from 'next/server';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';

const assetService = new AudioAssetService();

export async function GET(_request: NextRequest) {
  try {
    await assetService.init();
    const assets = await assetService.listAssets();
    const diskUsage = await assetService.getDiskUsage();

    return NextResponse.json({
      success: true,
      data: {
        assets,
        diskUsage: {
          bytes: diskUsage,
          mb: Math.round(diskUsage / 1024 / 1024 * 10) / 10,
          quotaGB: assetService.config.diskQuotaGB,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

// POST /api/audio/assets - cleanup expired assets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if ((body as any)?.action !== 'cleanup') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'POST requires { action: "cleanup" }' } },
        { status: 400 }
      );
    }

    await assetService.init();
    const deleted = await assetService.cleanupExpired();

    return NextResponse.json({
      success: true,
      data: { deletedCount: deleted },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
