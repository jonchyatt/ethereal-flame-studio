import { NextRequest, NextResponse } from 'next/server';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { getStorageAdapter } from '@/lib/storage';

const assetService = new AudioAssetService();

/**
 * Stream the original audio file for WaveSurfer playback.
 *
 * Redirects to the storage adapter's signed URL, which works transparently in
 * both environments:
 * - LocalStorageAdapter: returns a local API route URL with Range support
 *   (implemented in plan 12-03)
 * - R2StorageAdapter: returns a presigned S3 URL that offloads bandwidth to
 *   Cloudflare's CDN
 */
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

    // Find the original file key via storage adapter listing
    const storage = getStorageAdapter();
    const keys = await storage.list(`assets/${id}/`);
    const originalKey = keys.find(k => {
      const filename = k.split('/').pop() || '';
      return filename.startsWith('original');
    });

    if (!originalKey) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Original audio file not found' } },
        { status: 404 }
      );
    }

    // Redirect to the adapter's signed URL (works for both local and R2)
    const signedUrl = await storage.getSignedUrl(originalKey);
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
