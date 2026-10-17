import { writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { deterministicUuid } from '@/lib/playlist-batch/schema';
import { createRenderPack } from '@/lib/creator/renderPack';
import { getCreatorRenderPack, saveCreatorRenderPack } from '@/lib/creator/store';
import type { CreatorRenderPack } from '@/lib/creator/types';
import { assertWholeName } from './captions';
import { ShortCutSchema, ShortRightsSchema, type ProducedShort, type ShortCut } from './cut';
import type { z } from 'zod';

export function shortPackIdFor(parentPackId: string, startSec: number, endSec: number): string {
  return deterministicUuid(`waia-short-pack:${parentPackId}:${startSec.toFixed(2)}-${endSec.toFixed(2)}`);
}

/**
 * Registers each produced Short as a child render pack of an approved parent pack. The child copies the
 * parent's curation reference, so it meets the same publish gate; publishing is manual-draft only.
 * A parent with no curation reference (never release-approved) is refused.
 */
export async function registerShortChildPacks(input: {
  parentPack: CreatorRenderPack;
  parentVariantId: string;
  engine: string;
  recipeFingerprint: string;
  rights: Array<z.infer<typeof ShortRightsSchema>>;
  shorts: ProducedShort[];
  /** Maps a produced Short to the storage key its mp4 was uploaded to; the upload itself is not done here. */
  outputVideoKeyFor: (short: ProducedShort) => string;
}): Promise<Array<{ pack: CreatorRenderPack; cut: ShortCut }>> {
  const { parentPack } = input;
  if (!parentPack.curation) throw new Error('Parent render pack has no curation reference; Shorts need a release-approved parent');
  const variant = parentPack.variants.find((v) => v.variantId === input.parentVariantId);
  if (!variant) throw new Error(`Parent variant not found: ${input.parentVariantId}`);

  const out: Array<{ pack: CreatorRenderPack; cut: ShortCut }> = [];
  for (const short of input.shorts) {
    const cut = ShortCutSchema.parse({
      schemaVersion: 1,
      parentPackId: parentPack.packId,
      parentVariantId: variant.variantId,
      parentRenderJobId: variant.renderJobId,
      recipeFingerprint: input.recipeFingerprint,
      engine: input.engine,
      target: parentPack.target,
      startSec: short.startSec,
      endSec: short.endSec,
      peakScore: short.peakScore,
      rights: input.rights,
      captions: short.platformCaptions,
      publishMode: 'manual-draft',
    });
    await writeFile(path.join(short.dir, 'cut.json'), JSON.stringify(cut, null, 2));

    const packId = shortPackIdFor(parentPack.packId, short.startSec, short.endSec);
    const existing = await getCreatorRenderPack(packId);
    if (existing) { out.push({ pack: existing, cut }); continue; }

    const stem = parentPack.source.audioName.replace(/\.[^.]+$/, '');
    const { pack } = await createRenderPack({
      source: {
        audioName: `${stem} Short ${short.index + 1}.mp4`,
        assetId: parentPack.source.assetId ?? null,
        sourceUrl: parentPack.source.sourceUrl ?? null,
        estimatedDurationSec: short.endSec - short.startSec,
      },
      exportPackIds: [],
      variants: [{
        variantId: `${variant.variantId}-short-${short.index + 1}`,
        outputFormat: 'flat-1080p-portrait' as never,
        fps: 30,
        styleVariant: variant.styleVariant,
        platformTargets: ['youtube-shorts'],
        renderJobId: variant.renderJobId,
        renderTarget: parentPack.target,
        targetAgentId: parentPack.targetAgentId ?? null,
        safeZonePresetId: 'safe-9x16',
        durationCapSec: 59,
      } as never],
      target: parentPack.target,
      targetAgentId: parentPack.targetAgentId ?? null,
      metadata: { ...parentPack.metadata, shortForm: cut, parentPackId: parentPack.packId },
      curation: parentPack.curation,
      channelPresetIds: [],
    }, { packId });

    for (const d of pack.publishDrafts) {
      d.titleVariants.forEach(assertWholeName);
      assertWholeName(d.description);
    }
    pack.recutExecutions = [{
      recutId: randomUUID(),
      createdAt: pack.createdAt,
      updatedAt: pack.createdAt,
      sourceVariantId: pack.variants[0].variantId,
      sourceRenderJobId: variant.renderJobId,
      platform: 'youtube-shorts',
      aspectRatio: '9:16',
      startSec: short.startSec,
      endSec: short.endSec,
      score: short.peakScore,
      reason: 'Sustained energy peak',
      targetWidth: 1080,
      targetHeight: 1920,
      fps: 30,
      jobId: `short-${packId}`,
      status: 'complete',
      outputVideoKey: input.outputVideoKeyFor(short),
    }];
    await saveCreatorRenderPack(pack);
    out.push({ pack, cut });
  }
  return out;
}
