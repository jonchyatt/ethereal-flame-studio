import { getJobStore } from '@/lib/jobs';
import type { AudioPrepJob, JobStore } from '@/lib/jobs/types';
import type { CreatorPublishTask, CreatorRecutExecution, CreatorRenderPack } from './types';
import { getCreatorRenderPack, saveCreatorRenderPack } from './store';

type JobState = 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled' | 'missing';

export type CreatorVariantLiveStatus = {
  variantId: string;
  renderJobId: string;
  outputFormat: string;
  platformTargets: string[];
  styleLabel: string;
  status: JobState;
  progress: number;
  stage: string | null;
  outputVideoKey?: string;
  error?: string;
};

export type CreatorPackSyncSummary = {
  packId: string;
  syncedAt: string;
  render: {
    total: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
    cancelled: number;
    missing: number;
  };
  recut: {
    total: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
    cancelled: number;
    missing: number;
  };
  publish: {
    total: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
    cancelled: number;
    missing: number;
    scheduled: number;
  };
  overallStatus: 'queued' | 'partial' | 'complete' | 'failed';
  progressPct: number;
  variants: CreatorVariantLiveStatus[];
};

function resolveOutputVideoKey(job: AudioPrepJob | undefined): string | undefined {
  if (!job?.result) return undefined;
  for (const key of ['videoKey', 'r2_key', 'r2Key', 'storageKey']) {
    const value = job.result[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function mapJobState(job: AudioPrepJob | undefined): JobState {
  if (!job) return 'missing';
  switch (job.status) {
    case 'pending':
      return 'queued';
    case 'processing':
      return 'processing';
    case 'complete':
      return 'complete';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'missing';
  }
}

function emptyCounts() {
  return {
    total: 0,
    queued: 0,
    processing: 0,
    complete: 0,
    failed: 0,
    cancelled: 0,
    missing: 0,
  };
}

function countTaskState<T extends { status?: string; jobId?: string; publishJobId?: string }>(
  task: T,
  job: AudioPrepJob | undefined,
  counts: ReturnType<typeof emptyCounts>,
): void {
  counts.total += 1;
  const state = mapJobState(job);
  counts[state] += 1;
}

async function loadJobMap(store: JobStore, ids: string[]): Promise<Map<string, AudioPrepJob | undefined>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const entries = await Promise.all(uniqueIds.map(async (id) => [id, await store.get(id)] as const));
  return new Map(entries);
}

export async function buildCreatorPackSyncSummary(
  pack: CreatorRenderPack,
  store: JobStore = getJobStore(),
): Promise<CreatorPackSyncSummary> {
  const renderJobIds = pack.variants.map((variant) => variant.renderJobId);
  const recutJobIds = (pack.recutExecutions || []).map((recut) => recut.jobId);
  const publishJobIds = (pack.publishTasks || []).map((task) => task.publishJobId);
  const jobMap = await loadJobMap(store, [...renderJobIds, ...recutJobIds, ...publishJobIds]);

  const renderCounts = emptyCounts();
  const recutCounts = emptyCounts();
  const publishCounts = { ...emptyCounts(), scheduled: 0 };

  const variants: CreatorVariantLiveStatus[] = pack.variants.map((variant) => {
    const job = jobMap.get(variant.renderJobId);
    const state = mapJobState(job);
    renderCounts.total += 1;
    renderCounts[state] += 1;
    return {
      variantId: variant.variantId,
      renderJobId: variant.renderJobId,
      outputFormat: variant.outputFormat,
      platformTargets: variant.platformTargets,
      styleLabel: variant.styleVariant.label,
      status: state,
      progress: typeof job?.progress === 'number' ? Math.round(job.progress) : 0,
      stage: job?.stage || null,
      outputVideoKey: resolveOutputVideoKey(job),
      error: job?.error,
    };
  });

  for (const recut of (pack.recutExecutions || []) as CreatorRecutExecution[]) {
    countTaskState(recut, jobMap.get(recut.jobId), recutCounts);
  }

  for (const task of (pack.publishTasks || []) as CreatorPublishTask[]) {
    publishCounts.total += 1;
    if (task.status === 'scheduled') {
      publishCounts.scheduled += 1;
    }
    const state = mapJobState(jobMap.get(task.publishJobId));
    publishCounts[state] += 1;
  }

  const renderProgress =
    renderCounts.total > 0
      ? ((renderCounts.complete + renderCounts.failed + renderCounts.cancelled) / renderCounts.total) * 100
      : 100;
  const recutProgress =
    recutCounts.total > 0
      ? ((recutCounts.complete + recutCounts.failed + recutCounts.cancelled) / recutCounts.total) * 100
      : 100;
  const publishProgress =
    publishCounts.total > 0
      ? ((publishCounts.complete + publishCounts.scheduled + publishCounts.failed + publishCounts.cancelled) / publishCounts.total) * 100
      : 100;

  const weightedProgress = Math.round((renderProgress * 0.6) + (recutProgress * 0.2) + (publishProgress * 0.2));

  let overallStatus: CreatorPackSyncSummary['overallStatus'] = 'queued';
  const hasFailures = renderCounts.failed + recutCounts.failed + publishCounts.failed > 0;
  const renderDone = renderCounts.total > 0 && renderCounts.total === renderCounts.complete;
  const recutDone = recutCounts.total === 0 || recutCounts.total === recutCounts.complete;
  const publishDone =
    publishCounts.total === 0 ||
    (publishCounts.complete + publishCounts.scheduled === publishCounts.total);
  const allDone = renderDone && recutDone && publishDone;

  if (allDone && !hasFailures) {
    overallStatus = 'complete';
  } else if (hasFailures) {
    overallStatus = 'failed';
  } else if (
    renderCounts.complete > 0 ||
    renderCounts.processing > 0 ||
    recutCounts.total > 0 ||
    publishCounts.total > 0
  ) {
    overallStatus = 'partial';
  }

  return {
    packId: pack.packId,
    syncedAt: new Date().toISOString(),
    render: renderCounts,
    recut: recutCounts,
    publish: publishCounts,
    overallStatus,
    progressPct: Math.max(0, Math.min(100, weightedProgress)),
    variants,
  };
}

export async function syncCreatorRenderPackStatus(packId: string): Promise<{
  pack: CreatorRenderPack;
  summary: CreatorPackSyncSummary;
}> {
  const pack = await getCreatorRenderPack(packId);
  if (!pack) {
    throw new Error(`Creator render pack not found: ${packId}`);
  }

  const summary = await buildCreatorPackSyncSummary(pack);
  const nextPack: CreatorRenderPack = {
    ...pack,
    updatedAt: new Date().toISOString(),
    status: summary.overallStatus,
    metadata: {
      ...(pack.metadata || {}),
      creatorSync: summary,
    },
  };
  await saveCreatorRenderPack(nextPack);

  return {
    pack: nextPack,
    summary,
  };
}
