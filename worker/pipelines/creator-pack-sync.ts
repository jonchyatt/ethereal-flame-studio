import type { ChildProcess } from 'child_process';
import type { AudioPrepJob, JobStore } from '../../src/lib/jobs/types';
import { CreatorPackSyncJobMetadataSchema } from '../../src/lib/creator/jobs';
import { syncCreatorRenderPackStatus } from '../../src/lib/creator/sync';

export async function runCreatorPackSyncPipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const parsed = CreatorPackSyncJobMetadataSchema.safeParse(job.metadata);
  if (!parsed.success) {
    throw new Error(`Invalid creator pack sync metadata: ${parsed.error.message}`);
  }

  await store.update(job.jobId, { stage: 'syncing-pack', progress: 25 });
  const synced = await syncCreatorRenderPackStatus(parsed.data.creatorPackId);
  await store.update(job.jobId, { stage: 'synced-pack', progress: 90 });
  await store.complete(job.jobId, {
    creatorPackId: parsed.data.creatorPackId,
    summary: synced.summary,
  });
}

