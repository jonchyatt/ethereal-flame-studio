import { randomUUID } from 'crypto';
import { getJobStore } from '@/lib/jobs';
import type { AudioPrepJob } from '@/lib/jobs/types';
import { OUTPUT_FORMAT_META, type OutputFormat } from '@/lib/render/schema/types';
import {
  CreatorPublishTaskSchema,
  CreatorRecutExecutionSchema,
  type ContentLibraryItem,
  type CreatorPublishTask,
  type CreatorRenderPack,
  type RecutPlan,
} from './types';
import {
  getContentLibraryItem,
  getCreatorRenderPack,
  saveContentLibraryItem,
  saveCreatorRenderPack,
} from './store';

function nowIso(): string {
  return new Date().toISOString();
}

function resolveOutputVideoKey(job: AudioPrepJob | undefined): string | undefined {
  if (!job?.result) return undefined;
  for (const key of ['videoKey', 'r2_key', 'r2Key', 'storageKey']) {
    const value = job.result[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function mapPlatformToProvider(platform: string): 'youtube' | 'tiktok' | 'instagram' | null {
  if (platform.startsWith('youtube')) return 'youtube';
  if (platform === 'tiktok') return 'tiktok';
  if (platform.startsWith('instagram')) return 'instagram';
  return null;
}

function normalizeAspectRatio(aspect: string): '16:9' | '9:16' | '1:1' {
  const normalized = aspect.replace(/\s+/g, '');
  if (normalized === '9:16') return '9:16';
  if (normalized === '1:1') return '1:1';
  return '16:9';
}

function getTargetResolutionForAspect(aspectRatio: string): { width: number; height: number } {
  switch (normalizeAspectRatio(aspectRatio)) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1920, height: 1080 };
  }
}

function scoreSegment(plan: RecutPlan, index: number): number {
  return typeof plan.segments[index]?.score === 'number' ? Number(plan.segments[index].score) : 0;
}

function sortSegmentIndexes(plan: RecutPlan): number[] {
  return plan.segments
    .map((_, index) => index)
    .sort((a, b) => {
      const sb = scoreSegment(plan, b);
      const sa = scoreSegment(plan, a);
      if (sb !== sa) return sb - sa;
      return plan.segments[a].startSec - plan.segments[b].startSec;
    });
}

function matchingRecutExecutionExists(
  executions: CreatorRenderPack['recutExecutions'],
  candidate: {
    sourceVariantId: string;
    platform: string;
    aspectRatio: string;
    startSec: number;
    endSec: number;
    targetWidth: number;
    targetHeight: number;
    fps: 30 | 60;
  },
): boolean {
  return (executions || []).some((execution) =>
    execution.sourceVariantId === candidate.sourceVariantId &&
    execution.platform === candidate.platform &&
    execution.aspectRatio === candidate.aspectRatio &&
    Math.abs(execution.startSec - candidate.startSec) < 0.001 &&
    Math.abs(execution.endSec - candidate.endSec) < 0.001 &&
    execution.targetWidth === candidate.targetWidth &&
    execution.targetHeight === candidate.targetHeight &&
    execution.fps === candidate.fps &&
    !['failed', 'cancelled'].includes(execution.status),
  );
}

async function loadRenderJobMap(pack: CreatorRenderPack): Promise<Map<string, AudioPrepJob | undefined>> {
  const store = getJobStore();
  const ids = Array.from(new Set(pack.variants.map((variant) => variant.renderJobId)));
  const entries = await Promise.all(ids.map(async (id) => [id, await store.get(id)] as const));
  return new Map(entries);
}

function clonePackAndContent(
  pack: CreatorRenderPack,
  contentItem: ContentLibraryItem | null,
): { nextPack: CreatorRenderPack; nextContentItem: ContentLibraryItem | null } {
  return {
    nextPack: {
      ...pack,
      updatedAt: nowIso(),
      recutExecutions: [...(pack.recutExecutions || [])],
      publishTasks: [...(pack.publishTasks || [])],
    },
    nextContentItem: contentItem
      ? {
          ...contentItem,
          updatedAt: nowIso(),
          recutExecutions: [...(contentItem.recutExecutions || [])],
        }
      : null,
  };
}

export async function queueCreatorPackSyncJob(creatorPackId: string, requestedBy?: string) {
  const store = getJobStore();
  return store.create('creator-pack-sync', {
    creatorPackId,
    requestedBy: requestedBy || 'api',
  });
}

export async function queueCreatorPackRecutJobs(
  creatorPackId: string,
  options: {
    mode?: 'top' | 'all';
    maxPerPlan?: number;
    includePlatforms?: string[];
    reviewFilter?: 'all' | 'accepted-only' | 'accepted-or-unreviewed';
    overwriteExisting?: boolean;
    queueSyncJob?: boolean;
  } = {},
) {
  const pack = await getCreatorRenderPack(creatorPackId);
  if (!pack) throw new Error(`Creator render pack not found: ${creatorPackId}`);
  const contentItem = pack.contentLibraryItemId ? await getContentLibraryItem(pack.contentLibraryItemId) : null;
  if (!contentItem) throw new Error(`Content library item not found for creator pack ${creatorPackId}`);

  const renderJobMap = await loadRenderJobMap(pack);
  const jobStore = getJobStore();
  const { nextPack, nextContentItem } = clonePackAndContent(pack, contentItem);
  if (!nextContentItem) {
    throw new Error(`Content library item not found for creator pack ${creatorPackId}`);
  }
  const mode = options.mode || 'top';
  const maxPerPlan = Math.max(1, Math.min(20, options.maxPerPlan || 1));
  const includePlatforms = new Set((options.includePlatforms || []).filter(Boolean));
  const reviewFilter = options.reviewFilter || 'accepted-or-unreviewed';

  const queued: Array<{ recutId: string; jobId: string; platform: string; sourceVariantId: string }> = [];
  const skipped: Array<{ reason: string; platform?: string; sourceVariantId?: string }> = [];

  for (const plan of contentItem.recutPlans) {
    if (includePlatforms.size > 0 && !includePlatforms.has(plan.platform)) {
      continue;
    }

    const sourceVariant =
      (plan.sourceVariantId && pack.variants.find((variant) => variant.variantId === plan.sourceVariantId)) ||
      pack.variants.find((variant) => (variant.platformTargets[0] || 'generic') === plan.platform);
    if (!sourceVariant) {
      skipped.push({ reason: 'source-variant-not-found', platform: plan.platform, sourceVariantId: plan.sourceVariantId || undefined });
      continue;
    }

    const sourceJob = renderJobMap.get(sourceVariant.renderJobId);
    if (!sourceJob || sourceJob.status !== 'complete') {
      skipped.push({ reason: 'render-not-complete', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
      continue;
    }

    const sourceVideoKey = resolveOutputVideoKey(sourceJob);
    if (!sourceVideoKey) {
      skipped.push({ reason: 'render-output-missing', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
      continue;
    }

    const formatMeta = OUTPUT_FORMAT_META[sourceVariant.outputFormat as OutputFormat];
    if (!formatMeta) {
      skipped.push({ reason: 'unsupported-output-format', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
      continue;
    }

    const target = getTargetResolutionForAspect(plan.aspectRatio);
    const sortedIndexes = sortSegmentIndexes(plan);
    const selectedIndexes = mode === 'all' ? sortedIndexes : sortedIndexes.slice(0, maxPerPlan);

    for (const idx of selectedIndexes) {
      const segment = plan.segments[idx];
      if (!segment) continue;
      const reviewStatus = segment.reviewStatus || 'pending';
      if (reviewFilter === 'accepted-only' && reviewStatus !== 'accepted') {
        skipped.push({ reason: 'segment-not-accepted', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
        continue;
      }
      if (reviewFilter === 'accepted-or-unreviewed' && reviewStatus === 'rejected') {
        skipped.push({ reason: 'segment-rejected', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
        continue;
      }
      const duplicateExists = matchingRecutExecutionExists(nextPack.recutExecutions, {
        sourceVariantId: sourceVariant.variantId,
        platform: plan.platform,
        aspectRatio: plan.aspectRatio,
        startSec: segment.startSec,
        endSec: segment.endSec,
        targetWidth: target.width,
        targetHeight: target.height,
        fps: sourceVariant.fps,
      });
      if (duplicateExists && !options.overwriteExisting) {
        skipped.push({ reason: 'duplicate-recut-execution', platform: plan.platform, sourceVariantId: sourceVariant.variantId });
        continue;
      }

      const recutId = randomUUID();
      const recutJob = await jobStore.create('creator-recut', {
        creatorPackId,
        contentLibraryItemId: contentItem.itemId,
        recutId,
        sourceVariantId: sourceVariant.variantId,
        sourceRenderJobId: sourceVariant.renderJobId,
        sourceOutputFormat: sourceVariant.outputFormat,
        sourceVideoKey,
        sourceWidth: formatMeta.width,
        sourceHeight: formatMeta.height,
        platform: plan.platform,
        aspectRatio: plan.aspectRatio,
        startSec: segment.startSec,
        endSec: segment.endSec,
        targetWidth: target.width,
        targetHeight: target.height,
        fps: sourceVariant.fps,
        score: segment.score,
        reason: segment.reason,
      });

      const recutExecution = CreatorRecutExecutionSchema.parse({
        recutId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        sourceVariantId: sourceVariant.variantId,
        sourceRenderJobId: sourceVariant.renderJobId,
        platform: plan.platform,
        aspectRatio: plan.aspectRatio,
        startSec: segment.startSec,
        endSec: segment.endSec,
        score: segment.score,
        reason: segment.reason,
        targetWidth: target.width,
        targetHeight: target.height,
        fps: sourceVariant.fps,
        jobId: recutJob.jobId,
        status: 'queued',
      });

      nextPack.recutExecutions.push(recutExecution);
      nextContentItem.recutExecutions.push(recutExecution);
      queued.push({ recutId, jobId: recutJob.jobId, platform: plan.platform, sourceVariantId: sourceVariant.variantId });
    }
  }

  nextPack.updatedAt = nowIso();
  nextContentItem.updatedAt = nowIso();
  await Promise.all([
    saveCreatorRenderPack(nextPack),
    saveContentLibraryItem(nextContentItem),
  ]);

  const syncJob = options.queueSyncJob === false ? null : await queueCreatorPackSyncJob(creatorPackId, 'recut-queue').catch(() => null);
  return {
    pack: nextPack,
    contentItem: nextContentItem,
    queued,
    skipped,
    syncJobId: syncJob?.jobId || null,
  };
}

function choosePublishDraftForPlatform(pack: CreatorRenderPack, platform: string) {
  return pack.publishDrafts.find((draft) => draft.platform === platform) || null;
}

function buildFallbackPublishDraft(pack: CreatorRenderPack, platform: string) {
  const baseTitle = `${pack.source.audioName.replace(/\.[^.]+$/, '')} • ${platform}`;
  return {
    channelPresetId: 'fallback',
    platform,
    titleVariants: [baseTitle.slice(0, 180)],
    description: `Auto-generated publish draft for ${platform}.`,
    hashtags: [],
    ctas: [],
    keywordPacks: [],
  };
}

type PublishSourceCandidate = {
  sourceKind: 'render' | 'recut';
  sourceVariantId: string;
  sourceRenderJobId: string;
  sourceRecutJobId: string | null;
  sourceVideoKey: string;
  platform: string;
};

function findCompletedRecutsForVariant(pack: CreatorRenderPack, variantId: string, platform: string): CreatorRenderPack['recutExecutions'] {
  return (pack.recutExecutions || []).filter((recut) =>
    recut.sourceVariantId === variantId &&
    recut.platform === platform &&
    recut.status === 'complete' &&
    !!recut.outputVideoKey,
  );
}

function existingPublishTaskDuplicate(
  tasks: CreatorPublishTask[],
  candidate: {
    platform: string;
    sourceVariantId: string;
    sourceRecutJobId: string | null;
    sourceRenderJobId: string;
    mode: 'draft' | 'schedule';
    scheduledFor: string | null;
  },
): boolean {
  return tasks.some((task) =>
    task.platform === candidate.platform &&
    task.sourceVariantId === candidate.sourceVariantId &&
    task.sourceRenderJobId === candidate.sourceRenderJobId &&
    (task.sourceRecutJobId || null) === candidate.sourceRecutJobId &&
    task.mode === candidate.mode &&
    (task.scheduledFor || null) === candidate.scheduledFor &&
    !['failed', 'cancelled'].includes(task.status),
  );
}

export async function queueCreatorPackPublishJobs(
  creatorPackId: string,
  options: {
    mode?: 'draft' | 'schedule';
    scheduledFor?: string | null;
    includePlatforms?: string[];
    sourceSelection?: 'render' | 'recut' | 'prefer-recut';
    titleVariantIndex?: number;
    overwriteExisting?: boolean;
    queueSyncJob?: boolean;
  } = {},
) {
  const pack = await getCreatorRenderPack(creatorPackId);
  if (!pack) throw new Error(`Creator render pack not found: ${creatorPackId}`);
  const renderJobMap = await loadRenderJobMap(pack);
  const recutJobIds = Array.from(new Set((pack.recutExecutions || []).map((recut) => recut.jobId)));
  const jobStore = getJobStore();
  const recutJobEntries = await Promise.all(recutJobIds.map(async (id) => [id, await jobStore.get(id)] as const));
  const recutJobMap = new Map(recutJobEntries);

  const nextPack: CreatorRenderPack = {
    ...pack,
    updatedAt: nowIso(),
    publishTasks: [...(pack.publishTasks || [])],
  };
  const includePlatforms = new Set((options.includePlatforms || []).filter(Boolean));
  const sourceSelection = options.sourceSelection || 'render';
  const mode = options.mode || 'draft';
  const scheduledFor = mode === 'schedule' ? (options.scheduledFor || null) : null;
  const titleVariantIndex = Math.max(0, Math.min(10, options.titleVariantIndex || 0));

  const queued: Array<{ publishId: string; publishJobId: string; platform: string; sourceKind: string }> = [];
  const skipped: Array<{ reason: string; platform?: string; sourceVariantId?: string }> = [];

  for (const variant of pack.variants) {
    const renderJob = renderJobMap.get(variant.renderJobId);
    if (!renderJob || renderJob.status !== 'complete') {
      skipped.push({ reason: 'render-not-complete', sourceVariantId: variant.variantId });
      continue;
    }
    const renderVideoKey = resolveOutputVideoKey(renderJob);
    if (!renderVideoKey) {
      skipped.push({ reason: 'render-output-missing', sourceVariantId: variant.variantId });
      continue;
    }

    for (const platform of variant.platformTargets) {
      if (includePlatforms.size > 0 && !includePlatforms.has(platform)) continue;
      const provider = mapPlatformToProvider(platform);
      if (!provider) {
        skipped.push({ reason: 'unsupported-platform', platform, sourceVariantId: variant.variantId });
        continue;
      }

      const completedRecuts = findCompletedRecutsForVariant(pack, variant.variantId, platform)
        .filter((recut) => {
          const recutJob = recutJobMap.get(recut.jobId);
          return recutJob?.status === 'complete' && resolveOutputVideoKey(recutJob) || recut.outputVideoKey;
        })
        .sort((a, b) => {
          const sa = typeof a.score === 'number' ? a.score : 0;
          const sb = typeof b.score === 'number' ? b.score : 0;
          return sb - sa;
        });

      const publishSources: PublishSourceCandidate[] = [];
      if (sourceSelection === 'recut') {
        for (const recut of completedRecuts) {
          publishSources.push({
            sourceKind: 'recut',
            sourceVariantId: variant.variantId,
            sourceRenderJobId: variant.renderJobId,
            sourceRecutJobId: recut.jobId,
            sourceVideoKey: recut.outputVideoKey || resolveOutputVideoKey(recutJobMap.get(recut.jobId)) || '',
            platform,
          });
        }
      } else if (sourceSelection === 'prefer-recut' && completedRecuts.length > 0) {
        const recut = completedRecuts[0];
        publishSources.push({
          sourceKind: 'recut',
          sourceVariantId: variant.variantId,
          sourceRenderJobId: variant.renderJobId,
          sourceRecutJobId: recut.jobId,
          sourceVideoKey: recut.outputVideoKey || resolveOutputVideoKey(recutJobMap.get(recut.jobId)) || '',
          platform,
        });
      } else {
        publishSources.push({
          sourceKind: 'render',
          sourceVariantId: variant.variantId,
          sourceRenderJobId: variant.renderJobId,
          sourceRecutJobId: null,
          sourceVideoKey: renderVideoKey,
          platform,
        });
      }

      for (const source of publishSources) {
        if (!source.sourceVideoKey) {
          skipped.push({ reason: 'publish-source-output-missing', platform, sourceVariantId: variant.variantId });
          continue;
        }
        const duplicate = existingPublishTaskDuplicate(nextPack.publishTasks, {
          platform,
          sourceVariantId: source.sourceVariantId,
          sourceRecutJobId: source.sourceRecutJobId,
          sourceRenderJobId: source.sourceRenderJobId,
          mode,
          scheduledFor,
        });
        if (duplicate && !options.overwriteExisting) {
          skipped.push({ reason: 'duplicate-publish-task', platform, sourceVariantId: variant.variantId });
          continue;
        }

        const draft = choosePublishDraftForPlatform(pack, platform) || buildFallbackPublishDraft(pack, platform);
        const publishId = randomUUID();
        const title = draft.titleVariants[Math.min(titleVariantIndex, Math.max(0, draft.titleVariants.length - 1))] || draft.titleVariants[0] || `${pack.source.audioName} ${platform}`;
        const hashtags = Array.from(new Set(draft.hashtags.map((h) => h.trim()).filter(Boolean)));
        const publishJob = await jobStore.create('publish', {
          creatorPackId,
          publishId,
          platform,
          provider,
          mode,
          scheduledFor,
          sourceKind: source.sourceKind,
          sourceVariantId: source.sourceVariantId,
          sourceRenderJobId: source.sourceRenderJobId,
          sourceRecutJobId: source.sourceRecutJobId,
          sourceVideoKey: source.sourceVideoKey,
          title,
          description: draft.description,
          hashtags,
          cta: draft.ctas[0] || null,
          keywords: draft.keywordPacks || [],
          channelPresetId: draft.channelPresetId || null,
        });

        const publishTask = CreatorPublishTaskSchema.parse({
          publishId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          platform,
          mode,
          scheduledFor,
          sourceKind: source.sourceKind,
          sourceVariantId: source.sourceVariantId,
          sourceRenderJobId: source.sourceRenderJobId,
          sourceRecutJobId: source.sourceRecutJobId,
          sourceVideoKey: source.sourceVideoKey,
          title,
          description: draft.description,
          hashtags,
          cta: draft.ctas[0] || null,
          keywords: draft.keywordPacks || [],
          channelPresetId: draft.channelPresetId || null,
          publishJobId: publishJob.jobId,
          status: 'queued',
          connector: {
            provider,
            mode: 'manual-draft',
          },
        });

        nextPack.publishTasks.push(publishTask);
        queued.push({ publishId, publishJobId: publishJob.jobId, platform, sourceKind: source.sourceKind });
      }
    }
  }

  nextPack.updatedAt = nowIso();
  await saveCreatorRenderPack(nextPack);
  const syncJob = options.queueSyncJob === false ? null : await queueCreatorPackSyncJob(creatorPackId, 'publish-queue').catch(() => null);
  return {
    pack: nextPack,
    queued,
    skipped,
    syncJobId: syncJob?.jobId || null,
  };
}
