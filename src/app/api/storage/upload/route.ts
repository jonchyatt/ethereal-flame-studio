import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const uploadRequestSchema = z.object({
  key: z
    .string()
    .min(1, 'key is required')
    .max(1024, 'key must be at most 1024 characters')
    .refine((k) => k.startsWith('assets/') || k.startsWith('renders/'), {
      message: 'key must start with "assets/" or "renders/"',
    })
    .refine((k) => !k.includes('..'), {
      message: 'key must not contain ".." (path traversal)',
    }),
  contentType: z.string().optional().default('application/octet-stream'),
  size: z
    .number()
    .int()
    .positive('size must be positive')
    .max(MAX_FILE_SIZE, `size must be at most ${MAX_FILE_SIZE} bytes (500 MB)`),
});

// ---------------------------------------------------------------------------
// POST /api/storage/upload — Generate presigned upload URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = uploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Validation failed',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const { key, contentType, size: _size } = parsed.data;
    const storage = getStorageAdapter();

    const uploadUrl = await storage.getUploadUrl(key, {
      contentType,
      maxSizeBytes: MAX_FILE_SIZE,
      expiresInSeconds: 3600, // 1 hour
    });

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        method: 'PUT',
        key,
      },
    });
  } catch (err) {
    console.error('[storage/upload] POST error:', err);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to generate upload URL' },
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/storage/upload — Direct file upload (local dev equivalent)
//
// In local mode, the presigned URL points here. The browser PUTs the file
// directly to this endpoint with the key as a query parameter.
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: { message: 'key query parameter is required' } },
        { status: 400 },
      );
    }

    // Validate key shape
    if (!key.startsWith('assets/') && !key.startsWith('renders/')) {
      return NextResponse.json(
        { success: false, error: { message: 'key must start with "assets/" or "renders/"' } },
        { status: 400 },
      );
    }

    if (key.includes('..')) {
      return NextResponse.json(
        { success: false, error: { message: 'key must not contain ".."' } },
        { status: 400 },
      );
    }

    // Read raw body
    const body = await request.arrayBuffer();
    const buffer = Buffer.from(body);

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { message: `File size exceeds ${MAX_FILE_SIZE} bytes (500 MB)` } },
        { status: 400 },
      );
    }

    const contentType =
      request.headers.get('content-type') || 'application/octet-stream';
    const storage = getStorageAdapter();

    await storage.put(key, buffer, { contentType });

    return NextResponse.json({ success: true, data: { key } });
  } catch (err) {
    console.error('[storage/upload] PUT error:', err);
    return NextResponse.json(
      { success: false, error: { message: 'Upload failed' } },
      { status: 500 },
    );
  }
}
