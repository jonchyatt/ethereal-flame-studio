import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAutoRecutPlan } from '@/lib/creator/recut';
import { createThumbnailPlan } from '@/lib/creator/thumbnail';
import { saveContentLibraryItem, saveCreatorRenderPack, listCreatorRenderPacks } from '@/lib/creator/store';
import { generatePublishDrafts } from '@/lib/creator/metadata';
import { getBundlePreset, getExportPackPreset, SAFE_ZONE_PRESETS } from '@/lib/creator/presets';
import { ContentLibraryItemSchema, CreatorRenderPackSchema, CreatorRenderVariantSchema, CreatorTargetSchema } from '@/lib/creator/types';

export const dynamic = 'force-dynamic';

const CreateRenderPackSchema = z.object({
  source: z.object({
    audioName: z.string().min(1).max(255),
    assetId: z.string().uuid().nullable().optional(),
    audioPath: z.string().nullable().optional(),
    sourceUrl: z.string().url().nullable().optional(),
    estimatedDurationSec: z.number().positive().max(60 * 60 * 24).nullable().optional(),
  }),
  bundleId: z.string().min(1).max(64).nullable().optional(),
  exportPackIds: z.array(z.string().min(1).max(64)).default([]),
  variants: z.array(CreatorRenderVariantSchema.omit({ renderJobId: true }).extend({
    renderJobId: z.string().min(1).max(128),
  })).min(1),
  target: CreatorTargetSchema.default('cloud'),
  targetAgentId: z.string().min(1).max(128).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  tags: z.object({
    moods: z.array(z.string().min(1).max(64)).default([]),
    topics: z.array(z.string().min(1).max(64)).default([]),
    keywords: z.array(z.string().min(1).max(64)).default([]),
    bpm: z.number().int().min(1).max(300).nullable().optional(),
  }).optional(),
  channelPresetIds: z.array(z.string().min(1).max(64)).default([]),
});

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

    const now = new Date().toISOString();
    const input = parsed.data;
    const bundle = getBundlePreset(input.bundleId || undefined);
    const bundleLabel = bundle?.label || null;

    const publishDrafts = generatePublishDrafts({
      channelPresetIds: input.channelPresetIds.length > 0 ? input.channelPresetIds : (bundle?.channelPresetIds || []),
      sourceAudioName: input.source.audioName,
      tags: input.tags,
      durationSec: input.source.estimatedDurationSec ?? null,
    });

    const contentItemId = randomUUID();
    const durationForPlans = input.source.estimatedDurationSec ?? 180;

    const thumbnailPlans = Array.from(
      new Map(
        input.variants.flatMap((variant) => {
          const sid = (variant.safeZonePresetId && variant.safeZonePresetId in SAFE_ZONE_PRESETS)
            ? (variant.safeZonePresetId as keyof typeof SAFE_ZONE_PRESETS)
            : null;
          if (!sid) return [];
          const plan = createThumbnailPlan({
            platform: variant.platformTargets[0] || 'generic',
            safeZonePresetId: sid,
            durationSec: durationForPlans,
          });
          return [[`${plan.platform}:${plan.safeZonePresetId}`, plan] as const];
        }),
      ).values(),
    );

    const recutPlans = input.variants
      .filter((variant) => (variant.durationCapSec || 0) > 0)
      .map((variant) => createAutoRecutPlan({
        sourceVariantId: variant.variantId,
        platform: variant.platformTargets[0] || 'generic',
        aspectRatio: variant.outputFormat.includes('portrait')
          ? '9:16'
          : variant.outputFormat.includes('square')
            ? '1:1'
            : '16:9',
        durationCapSec: Number(variant.durationCapSec),
        durationSec: durationForPlans,
      }));

    const pack = CreatorRenderPackSchema.parse({
      packId: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      source: {
        audioName: input.source.audioName,
        assetId: input.source.assetId || null,
        audioPath: input.source.audioPath || null,
        sourceUrl: input.source.sourceUrl || null,
      },
      bundleId: input.bundleId || null,
      bundleLabel,
      exportPackIds: input.exportPackIds,
      variants: input.variants,
      recutExecutions: [],
      publishTasks: [],
      publishDrafts,
      contentLibraryItemId: contentItemId,
      target: input.target,
      targetAgentId: input.targetAgentId || null,
      metadata: input.metadata,
    });

    const contentItem = ContentLibraryItemSchema.parse({
      itemId: contentItemId,
      createdAt: now,
      updatedAt: now,
      packId: pack.packId,
      sourceAudioName: input.source.audioName,
      sourceAssetId: input.source.assetId || null,
      tags: input.tags || { moods: [], topics: [], keywords: [], bpm: null },
      variants: pack.variants,
      recutPlans,
      recutExecutions: [],
      thumbnailPlans,
      notes: null,
    });

    await Promise.all([
      saveCreatorRenderPack(pack),
      saveContentLibraryItem(contentItem),
    ]);

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
