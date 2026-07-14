/**
 * Render pipeline -- uploads audio to R2, generates a signed URL,
 * and dispatches the render job to Modal.
 *
 * Unlike other pipelines (ingest, preview, save), this pipeline does
 * NOT complete the job. It dispatches to Modal and leaves the job in
 * 'processing' status with stage 'dispatched-to-modal'. The webhook
 * callback from Modal will mark the job complete.
 */

import type { ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import type { JobStore, AudioPrepJob } from '../../src/lib/jobs/types';
import { getStorageAdapter } from '../../src/lib/storage';
import { submitToModal } from '../../src/lib/render/modalClient';
import { buildUnityRenderPlan } from '../../src/lib/render/waiaRenderPlan';

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

/**
 * Run the render pipeline for a single job.
 *
 * Steps:
 *   1. Resolve audio from storage or URL to a local temp file
 *   2. Ensure audio is uploaded to R2 at the canonical key
 *   3. Generate a signed download URL for Modal
 *   4. Build render config from job metadata
 *   5. Dispatch to Modal via submitToModal
 *   6. Store Modal call_id and leave job in 'dispatched-to-modal' stage
 *
 * The pipeline returns after dispatch. Modal calls the webhook on completion.
 */
export async function runRenderPipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const requestedEngine = (job.metadata.renderEngine as string | undefined) || 'puppeteer';
  if (requestedEngine !== 'puppeteer' && requestedEngine !== 'unity') {
    throw new Error(`Render engine ${requestedEngine} is unsupported`);
  }
  if (requestedEngine === 'unity' && process.env.WAIA_UNITY_RENDER_ENABLED !== 'true') {
    throw new Error('Unity render dispatch is disabled by WAIA_UNITY_RENDER_ENABLED');
  }
  const storage = getStorageAdapter();

  const tmpDir = path.join(os.tmpdir(), `render-${job.jobId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    // -- Step 1: Resolve audio ------------------------------------------------

    await store.update(job.jobId, { stage: 'resolving-audio', progress: 5 });

    const audioStorageKey = (job.metadata.audioStorageKey as string) ||
      (job.result?.audioStorageKey as string | undefined);
    const audioUrl = job.metadata.audioUrl as string | undefined;
    const audioName = (job.metadata.audioName as string) || 'audio.mp3';

    let localAudioPath: string | undefined;
    let resolvedStorageKey: string = audioStorageKey || `renders/${job.jobId}/audio.${extFromName(audioName)}`;

    if (audioStorageKey) {
      // Audio already in storage -- download to temp for potential re-upload check
      const data = await storage.get(audioStorageKey);
      if (!data) {
        throw new Error(`Audio not found in storage at key: ${audioStorageKey}`);
      }
      localAudioPath = path.join(tmpDir, path.basename(audioStorageKey));
      await fs.writeFile(localAudioPath, data);
      resolvedStorageKey = audioStorageKey;
    } else if (audioUrl) {
      // Download from URL to temp
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio from URL: HTTP ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = extFromName(audioUrl);
      localAudioPath = path.join(tmpDir, `audio.${ext}`);
      await fs.writeFile(localAudioPath, buffer);
      resolvedStorageKey = `renders/${job.jobId}/audio.${ext}`;
    } else {
      throw new Error('Render job has neither audioStorageKey nor audioUrl in metadata');
    }

    await store.update(job.jobId, { stage: 'resolving-audio', progress: 10 });

    // -- Step 2: Ensure audio is in R2 ----------------------------------------

    await store.update(job.jobId, { stage: 'uploading-audio', progress: 12 });

    const existsInStorage = await storage.exists(resolvedStorageKey);

    if (!existsInStorage && localAudioPath) {
      // Upload to storage
      const audioBuffer = await fs.readFile(localAudioPath);
      await storage.put(resolvedStorageKey, audioBuffer);
      console.log(`[Render] Uploaded audio to storage: ${resolvedStorageKey}`);
    }

    await store.update(job.jobId, { stage: 'uploading-audio', progress: 20 });

    // -- Step 3: Generate signed URL ------------------------------------------

    await store.update(job.jobId, { stage: 'generating-url', progress: 22 });

    const signedUrl = await storage.getSignedUrl(resolvedStorageKey, 3600);

    await store.update(job.jobId, { stage: 'generating-url', progress: 25 });

    // -- Step 4: Build render config ------------------------------------------

    const outputFormat = (job.metadata.outputFormat as string) || 'flat-1080p-landscape';
    const fps = (job.metadata.fps as number) || 30;
    const visualConfig = (job.metadata.visualConfig as Record<string, unknown>) || {};
    const renderTarget = (job.metadata.renderTarget as string | undefined) || 'cloud';
    const targetAgentId = job.metadata.targetAgentId as string | undefined;
    const unityPlan = requestedEngine === 'unity'
      ? buildUnityRenderPlan({
        target: renderTarget as 'cloud' | 'home' | 'local-agent',
        targetAgentId,
        outputFormat,
        fps: fps as 30 | 60,
        visualConfig,
        outputName: job.jobId,
      })
      : undefined;

    const renderConfig = {
      version: '1.0',
      audio: { path: 'provided-via-signed-url' },
      output: {
        path: '/tmp/output/render.mp4',
        format: outputFormat,
        fps,
      },
      visual: visualConfig,
      ...(unityPlan ? { unity: unityPlan } : {}),
    };

    const callbackBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (renderTarget === 'home' || renderTarget === 'local-agent') {
      if (!localAudioPath) throw new Error('Resolved audio path is missing');
      const inputBytes = await fs.readFile(localAudioPath);
      const inputArtifact = {
        storageKey: resolvedStorageKey,
        sizeBytes: inputBytes.length,
        sha256: createHash('sha256').update(inputBytes).digest('hex'),
      };
      const approvedSha256 = job.metadata.approvedInputSha256 as string | undefined;
      const approvedSizeBytes = job.metadata.approvedInputSizeBytes as number | undefined;
      if (requestedEngine === 'unity' && (!approvedSha256 || approvedSizeBytes === undefined)) {
        throw new Error('Unity render requires an approved input SHA-256 and byte size');
      }
      if (approvedSha256 && approvedSha256.toLowerCase() !== inputArtifact.sha256) {
        throw new Error('Resolved audio SHA-256 does not match the approved input artifact');
      }
      if (approvedSizeBytes !== undefined && approvedSizeBytes !== inputArtifact.sizeBytes) {
        throw new Error('Resolved audio byte size does not match the approved input artifact');
      }
      await store.update(job.jobId, { stage: 'awaiting-local-agent', progress: 28 });
      await store.update(job.jobId, {
        stage: 'awaiting-local-agent',
        progress: 30,
        result: {
          ...(job.result || {}),
          localAgentDispatch: {
            schemaVersion: 1,
            jobId: job.jobId,
            renderEngine: requestedEngine,
            renderTarget,
            audioSignedUrl: signedUrl,
            inputArtifact,
            renderConfig,
            ...(unityPlan ? { unityPlan } : {}),
            appUrl: (job.metadata.callbackUrl as string | undefined) || callbackBase,
            targetAgentId: targetAgentId || null,
            createdAt: new Date().toISOString(),
          },
        },
      });
      console.log(`[Render] Job ${job.jobId} staged for local agent dispatch (targetAgentId=${targetAgentId || 'any'})`);
      return;
    }

    // -- Step 5: Dispatch to Modal --------------------------------------------

    await store.update(job.jobId, { stage: 'dispatching', progress: 27 });

    const webhookUrl = `${
      callbackBase
    }/api/webhooks/worker`;

    const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET;

    const modalResponse = await submitToModal({
      config: renderConfig,
      jobId: job.jobId,
      audioSignedUrl: signedUrl,
      webhookUrl,
      webhookSecret,
    });

    console.log(
      `[Render] Job ${job.jobId} dispatched to Modal (call_id=${modalResponse.call_id}, gpu=${modalResponse.gpu})`,
    );

    // -- Step 6: Store Modal call_id and set dispatched stage ------------------
    // Do NOT call store.complete() -- the webhook callback will do that.

    await store.update(job.jobId, {
      stage: 'dispatched-to-modal',
      progress: 30,
      result: {
        ...(job.result || {}),
        modalCallId: modalResponse.call_id,
      },
    });
  } finally {
    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract file extension from a filename or URL, defaulting to 'mp3'.
 */
function extFromName(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : 'mp3';
}
