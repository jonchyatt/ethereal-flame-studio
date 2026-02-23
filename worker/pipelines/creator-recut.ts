import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import type { ChildProcess } from 'child_process';
import type { AudioPrepJob, JobStore } from '../../src/lib/jobs/types';
import { getStorageAdapter } from '../../src/lib/storage';
import { CreatorRecutJobMetadataSchema } from '../../src/lib/creator/jobs';
import { runFfmpegRecut } from '../../src/lib/creator/ffmpegRecut';
import {
  getContentLibraryItem,
  getCreatorRenderPack,
  saveContentLibraryItem,
  saveCreatorRenderPack,
} from '../../src/lib/creator/store';

function nowIso(): string {
  return new Date().toISOString();
}

async function patchCreatorRecutExecutionState(
  creatorPackId: string,
  recutId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const [pack, contentItem] = await Promise.all([
    getCreatorRenderPack(creatorPackId),
    (async () => {
      const p = await getCreatorRenderPack(creatorPackId);
      if (!p?.contentLibraryItemId) return null;
      return getContentLibraryItem(p.contentLibraryItemId);
    })(),
  ]);

  if (pack) {
    const nextPack = {
      ...pack,
      updatedAt: nowIso(),
      recutExecutions: (pack.recutExecutions || []).map((execution) =>
        execution.recutId === recutId
          ? { ...execution, ...patch, updatedAt: nowIso() }
          : execution,
      ),
    };
    await saveCreatorRenderPack(nextPack);
  }

  if (contentItem) {
    const nextItem = {
      ...contentItem,
      updatedAt: nowIso(),
      recutExecutions: (contentItem.recutExecutions || []).map((execution) =>
        execution.recutId === recutId
          ? { ...execution, ...patch, updatedAt: nowIso() }
          : execution,
      ),
    };
    await saveContentLibraryItem(nextItem);
  }
}

export async function runCreatorRecutPipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const parsed = CreatorRecutJobMetadataSchema.safeParse(job.metadata);
  if (!parsed.success) {
    throw new Error(`Invalid creator recut metadata: ${parsed.error.message}`);
  }
  const metadata = parsed.data;
  const storage = getStorageAdapter();
  const tmpDir = path.join(os.tmpdir(), `creator-recut-${job.jobId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  await patchCreatorRecutExecutionState(metadata.creatorPackId, metadata.recutId, {
    status: 'processing',
    error: null,
  }).catch(() => {});

  try {
    await store.update(job.jobId, { stage: 'downloading-source', progress: 5 });
    const sourceData = await storage.get(metadata.sourceVideoKey);
    if (!sourceData) {
      throw new Error(`Source video not found: ${metadata.sourceVideoKey}`);
    }
    const sourcePath = path.join(tmpDir, 'source.mp4');
    await fs.writeFile(sourcePath, sourceData);

    await store.update(job.jobId, { stage: 'ffmpeg-recut', progress: 25 });
    const outputPath = path.join(tmpDir, 'recut.mp4');
    const ffmpegResult = await runFfmpegRecut({
      inputPath: sourcePath,
      outputPath,
      startSec: metadata.startSec,
      endSec: metadata.endSec,
      sourceWidth: metadata.sourceWidth,
      sourceHeight: metadata.sourceHeight,
      targetWidth: metadata.targetWidth,
      targetHeight: metadata.targetHeight,
      fps: metadata.fps,
    });
    if (!ffmpegResult.success) {
      throw new Error(ffmpegResult.error || ffmpegResult.stderrTail || 'FFmpeg recut failed');
    }

    await store.update(job.jobId, { stage: 'uploading-recut', progress: 80 });
    const outputBuffer = await fs.readFile(outputPath);
    const outputStorageKey = `creator/recuts/${metadata.creatorPackId}/${metadata.sourceVariantId}/${metadata.recutId}.mp4`;
    await storage.put(outputStorageKey, outputBuffer, { contentType: 'video/mp4' });

    const fileSizeBytes = outputBuffer.length;
    const result = {
      recutId: metadata.recutId,
      creatorPackId: metadata.creatorPackId,
      sourceRenderJobId: metadata.sourceRenderJobId,
      sourceVariantId: metadata.sourceVariantId,
      outputVideoKey: outputStorageKey,
      durationSeconds: Number(Math.max(0, metadata.endSec - metadata.startSec).toFixed(3)),
      startSec: metadata.startSec,
      endSec: metadata.endSec,
      targetWidth: metadata.targetWidth,
      targetHeight: metadata.targetHeight,
      aspectRatio: metadata.aspectRatio,
      platform: metadata.platform,
      ffmpegCommand: ffmpegResult.ffmpegCommand,
      fileSizeBytes,
    };

    await patchCreatorRecutExecutionState(metadata.creatorPackId, metadata.recutId, {
      status: 'complete',
      outputVideoKey: outputStorageKey,
      fileSizeBytes,
      error: null,
    }).catch(() => {});

    await store.complete(job.jobId, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchCreatorRecutExecutionState(metadata.creatorPackId, metadata.recutId, {
      status: 'failed',
      error: message,
    }).catch(() => {});
    throw error;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

