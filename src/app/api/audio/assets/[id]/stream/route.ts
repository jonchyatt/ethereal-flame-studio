import { NextRequest, NextResponse } from 'next/server';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { getStorageAdapter } from '@/lib/storage';

const assetService = new AudioAssetService();

/** Valid audio variants that can be streamed. */
type AudioVariant = 'original' | 'prepared';

/**
 * Stream audio for WaveSurfer playback.
 *
 * Supports an optional `?variant=prepared` query parameter to stream either
 * the raw upload (`original`, default) or the edited output (`prepared`).
 *
 * Redirects to the storage adapter's signed URL, which works transparently in
 * both environments:
 * - LocalStorageAdapter: returns a local API route URL with Range support
 *   (implemented in plan 12-03)
 * - R2StorageAdapter: returns a presigned S3 URL that offloads bandwidth to
 *   Cloudflare's CDN
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Determine which audio variant to stream (default: original)
    const variantParam = request.nextUrl.searchParams.get('variant') || 'original';
    const variant: AudioVariant = variantParam === 'prepared' ? 'prepared' : 'original';

    const asset = await assetService.getAsset(id);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Asset ${id} not found` } },
        { status: 404 }
      );
    }

    // Find the requested variant's file key via storage adapter listing
    const storage = getStorageAdapter();
    const keys = await storage.list(`assets/${id}/`);
    const matchingKey = keys.find(k => {
      const filename = k.split('/').pop() || '';
      return filename.startsWith(variant);
    });

    if (!matchingKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Audio file not found for this asset (variant: ${variant})`,
          },
        },
        { status: 404 }
      );
    }

    // Redirect to the adapter's signed URL (works for both local and R2)
    const signedUrl = await storage.getSignedUrl(matchingKey);

    // The signed URL itself handles access control, so caching the redirect
    // for a short duration is safe and avoids redundant signed URL generation.
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
