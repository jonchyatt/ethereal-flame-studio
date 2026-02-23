import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getContentLibraryItem, saveContentLibraryItem } from '@/lib/creator/store';

export const dynamic = 'force-dynamic';

const UpdateRecutReviewSchema = z.object({
  itemId: z.string().uuid(),
  planIndex: z.number().int().min(0),
  segmentIndex: z.number().int().min(0),
  reviewStatus: z.enum(['pending', 'accepted', 'rejected']),
  reviewNotes: z.string().max(500).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateRecutReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const item = await getContentLibraryItem(parsed.data.itemId);
    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content library item not found' } },
        { status: 404 },
      );
    }

    const plan = item.recutPlans[parsed.data.planIndex];
    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recut plan not found' } },
        { status: 404 },
      );
    }
    const segment = plan.segments[parsed.data.segmentIndex];
    if (!segment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recut segment not found' } },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const nextItem = {
      ...item,
      updatedAt: now,
      recutPlans: item.recutPlans.map((recutPlan, pIdx) =>
        pIdx !== parsed.data.planIndex
          ? recutPlan
          : {
              ...recutPlan,
              segments: recutPlan.segments.map((recutSegment, sIdx) =>
                sIdx !== parsed.data.segmentIndex
                  ? recutSegment
                  : {
                      ...recutSegment,
                      reviewStatus: parsed.data.reviewStatus,
                      reviewedAt: now,
                      reviewNotes: parsed.data.reviewNotes ?? null,
                    },
              ),
            },
      ),
    };

    await saveContentLibraryItem(nextItem);
    return NextResponse.json({
      success: true,
      data: {
        item: nextItem,
        updatedSegment: nextItem.recutPlans[parsed.data.planIndex]?.segments?.[parsed.data.segmentIndex] || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

