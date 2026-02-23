import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getContentLibraryItem, listContentLibraryItems, saveContentLibraryItem } from '@/lib/creator/store';

export const dynamic = 'force-dynamic';

const UpdateContentItemSchema = z.object({
  itemId: z.string().uuid(),
  tags: z.object({
    moods: z.array(z.string().min(1).max(64)).optional(),
    topics: z.array(z.string().min(1).max(64)).optional(),
    keywords: z.array(z.string().min(1).max(64)).optional(),
    bpm: z.number().int().min(1).max(300).nullable().optional(),
  }).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get('limit') || 200);
  const items = await listContentLibraryItems(Math.max(1, Math.min(limit, 1000)));
  return NextResponse.json({ success: true, data: { items } });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateContentItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const existing = await getContentLibraryItem(parsed.data.itemId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content library item not found' } },
        { status: 404 },
      );
    }

    const updated = {
      ...existing,
      updatedAt: new Date().toISOString(),
      tags: {
        ...existing.tags,
        ...(parsed.data.tags || {}),
      },
      notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
    };

    await saveContentLibraryItem(updated);
    return NextResponse.json({ success: true, data: { item: updated } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
