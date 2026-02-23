import type { ChildProcess } from 'child_process';
import type { AudioPrepJob, JobStore } from '../../src/lib/jobs/types';
import { getStorageAdapter } from '../../src/lib/storage';
import { CreatorPublishJobMetadataSchema } from '../../src/lib/creator/jobs';
import { getCreatorRenderPack, saveCreatorRenderPack } from '../../src/lib/creator/store';
import { runPublishConnector } from '../../src/lib/creator/publishConnectors';

function nowIso(): string {
  return new Date().toISOString();
}

async function patchPublishTask(
  creatorPackId: string,
  publishId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const pack = await getCreatorRenderPack(creatorPackId);
  if (!pack) return;
  const nextPack = {
    ...pack,
    updatedAt: nowIso(),
    publishTasks: (pack.publishTasks || []).map((task) =>
      task.publishId === publishId
        ? { ...task, ...patch, updatedAt: nowIso() }
        : task,
    ),
  };
  await saveCreatorRenderPack(nextPack);
}

export async function runPublishPipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const parsed = CreatorPublishJobMetadataSchema.safeParse(job.metadata);
  if (!parsed.success) {
    throw new Error(`Invalid publish metadata: ${parsed.error.message}`);
  }
  const metadata = parsed.data;
  const storage = getStorageAdapter();

  await patchPublishTask(metadata.creatorPackId, metadata.publishId, {
    status: 'processing',
    error: null,
  }).catch(() => {});

  try {
    await store.update(job.jobId, { stage: 'resolving-media', progress: 10 });
    const sourceStat = await storage.stat(metadata.sourceVideoKey);
    if (!sourceStat) {
      throw new Error(`Publish source video not found: ${metadata.sourceVideoKey}`);
    }
    const mediaSignedUrl = await storage.getSignedUrl(metadata.sourceVideoKey, 60 * 60 * 6);

    await store.update(job.jobId, { stage: 'dispatching-connector', progress: 40 });
    const connectorResult = await runPublishConnector({
      provider: metadata.provider,
      metadata,
      mediaSignedUrl,
    });

    const taskStatus =
      metadata.mode === 'schedule'
        ? 'scheduled'
        : 'complete';

    await patchPublishTask(metadata.creatorPackId, metadata.publishId, {
      status: taskStatus,
      connector: {
        provider: metadata.provider,
        mode: connectorResult.mode,
      },
      providerStatus: connectorResult.providerStatus,
      externalId: connectorResult.externalId || null,
      providerUrl: connectorResult.providerUrl || null,
      draftManifestKey: connectorResult.draftManifestKey || null,
      error: null,
    }).catch(() => {});

    await store.complete(job.jobId, {
      publishId: metadata.publishId,
      creatorPackId: metadata.creatorPackId,
      provider: metadata.provider,
      platform: metadata.platform,
      mode: metadata.mode,
      scheduledFor: metadata.scheduledFor || null,
      sourceVideoKey: metadata.sourceVideoKey,
      connector: connectorResult,
      sourceSizeBytes: sourceStat.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchPublishTask(metadata.creatorPackId, metadata.publishId, {
      status: 'failed',
      error: message,
    }).catch(() => {});
    throw error;
  }
}

