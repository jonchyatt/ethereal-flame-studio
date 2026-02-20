import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Content-Type detection
// ---------------------------------------------------------------------------

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function getContentType(key: string): string {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateKey(key: string | null): string | null {
  if (!key || key.trim().length === 0) return 'key query parameter is required';
  if (!key.startsWith('assets/') && !key.startsWith('renders/'))
    return 'key must start with "assets/" or "renders/"';
  if (key.includes('..')) return 'key must not contain ".."';
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/storage/download?key={key}
//
// R2 mode:  Returns JSON with a signed download URL (7-day expiry).
// Local mode:  Serves the file directly with Content-Type detection and
//              Range request support (important for audio streaming).
// ---------------------------------------------------------------------------

/** 7 days in seconds (per locked user decision). */
const DOWNLOAD_EXPIRY_SECONDS = 604_800;

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    const validationError = validateKey(key);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: { message: validationError } },
        { status: 400 },
      );
    }

    const storage = getStorageAdapter();
    const backend = process.env.STORAGE_BACKEND || 'local';

    // ----- R2 mode: return signed URL -----
    if (backend === 'r2') {
      const downloadUrl = await storage.getSignedUrl(key!, DOWNLOAD_EXPIRY_SECONDS);
      const expiresAt = new Date(
        Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000,
      ).toISOString();

      return NextResponse.json({
        success: true,
        data: { downloadUrl, expiresAt },
      });
    }

    // ----- Local mode: serve file directly -----
    const data = await storage.get(key!);

    if (!data) {
      return NextResponse.json(
        { success: false, error: { message: 'File not found' } },
        { status: 404 },
      );
    }

    const contentType = getContentType(key!);
    const rangeHeader = request.headers.get('range');

    // Range request support (important for WaveSurfer audio streaming)
    if (rangeHeader) {
      return handleRangeRequest(data, rangeHeader, contentType);
    }

    // Full response — convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[storage/download] GET error:', err);
    return NextResponse.json(
      { success: false, error: { message: 'Download failed' } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Range request handler (206 Partial Content)
// ---------------------------------------------------------------------------

function handleRangeRequest(
  data: Buffer,
  rangeHeader: string,
  contentType: string,
): NextResponse {
  const total = data.length;

  // Parse "bytes=start-end"
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    return new NextResponse('Invalid Range header', {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : total - 1;

  // Clamp to valid bounds
  if (start >= total) {
    return new NextResponse('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  end = Math.min(end, total - 1);
  const chunkLength = end - start + 1;
  const chunk = data.subarray(start, end + 1);

  return new NextResponse(new Uint8Array(chunk), {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(chunkLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
