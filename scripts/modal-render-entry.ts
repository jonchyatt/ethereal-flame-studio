#!/usr/bin/env npx tsx
/**
 * Modal Container Render Entry Point
 *
 * Simplified version of render-cli.ts for headless Linux containers.
 * No Windows code, no interactive preview, no server management.
 * Expects the Next.js server to already be running at --app-url.
 *
 * Reuses renderVideo() from src/lib/render/renderVideo.ts.
 *
 * Usage:
 *   npx tsx scripts/modal-render-entry.ts \
 *     --config /tmp/config.json \
 *     --audio /tmp/audio.mp3 \
 *     --output /tmp/output/video.mp4 \
 *     --app-url http://localhost:3000 \
 *     --job-id job_123 \
 *     --callback-url https://ethereal-flame.vercel.app \
 *     --audio-signed-url "https://r2-presigned-url..." \
 *     --webhook-url https://app.vercel.app/api/webhooks/worker \
 *     --webhook-secret "secret_token" \
 *     --r2-upload-key renders/job_123/output.mp4
 */

import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderVideo, RenderVideoProgress } from '../src/lib/render/renderVideo';
import { OutputFormat } from '../src/lib/render/FFmpegEncoder';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface Args {
  configPath: string;
  audioPath?: string;
  audioSignedUrl?: string;
  outputPath?: string;
  appUrl: string;
  jobId?: string;
  callbackUrl?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  r2UploadKey?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const result: Partial<Args> = { appUrl: 'http://localhost:3000' };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--config':
      case '-c':
        result.configPath = argv[++i];
        break;
      case '--audio':
      case '-a':
        result.audioPath = argv[++i];
        break;
      case '--audio-signed-url':
        result.audioSignedUrl = argv[++i];
        break;
      case '--output':
      case '-o':
        result.outputPath = argv[++i];
        break;
      case '--app-url':
        result.appUrl = argv[++i];
        break;
      case '--job-id':
        result.jobId = argv[++i];
        break;
      case '--callback-url':
        result.callbackUrl = argv[++i];
        break;
      case '--webhook-url':
        result.webhookUrl = argv[++i];
        break;
      case '--webhook-secret':
        result.webhookSecret = argv[++i];
        break;
      case '--r2-upload-key':
        result.r2UploadKey = argv[++i];
        break;
    }
  }

  if (!result.configPath) {
    console.error('Error: --config is required');
    process.exit(1);
  }

  return result as Args;
}

// ---------------------------------------------------------------------------
// R2 upload helper (standalone, not using StorageAdapter)
// ---------------------------------------------------------------------------

/**
 * Upload a file to R2 using the S3-compatible API.
 * Reads R2 credentials from environment variables set in the Modal container.
 */
async function uploadToR2(filePath: string, r2Key: string): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      '[modal-render] R2 env vars not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)',
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const fileData = await fs.readFile(filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: fileData,
      ContentType: 'video/mp4',
    }),
  );
}

// ---------------------------------------------------------------------------
// Audio download from signed URL
// ---------------------------------------------------------------------------

/**
 * Download audio from a presigned R2 URL to a local temp file.
 * Returns the path to the downloaded file.
 */
async function downloadAudioFromSignedUrl(signedUrl: string): Promise<string> {
  // Determine extension from URL path, default to .mp3
  let ext = '.mp3';
  try {
    const urlPath = new URL(signedUrl).pathname;
    const urlExt = path.extname(urlPath);
    if (urlExt) ext = urlExt;
  } catch {
    // Keep default extension
  }

  const tempPath = `/tmp/audio${ext}`;

  console.log(`[modal-render] Downloading audio from signed URL to ${tempPath}`);

  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(
      `[modal-render] Failed to download audio: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error('[modal-render] Audio download response has no body');
  }

  // Pipe the response body to a file
  const nodeStream = Readable.fromWeb(response.body as any);
  const fileStream = createWriteStream(tempPath);
  await pipeline(nodeStream, fileStream);

  console.log(`[modal-render] Audio downloaded to ${tempPath}`);
  return tempPath;
}

// ---------------------------------------------------------------------------
// Webhook callback
// ---------------------------------------------------------------------------

/**
 * Call the webhook endpoint to report final render status (complete or failed).
 * Silently logs and continues if the webhook call fails.
 */
async function callWebhook(
  webhookUrl: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${webhookSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[modal-render] Webhook callback failed (${response.status}): ${text}`);
    } else {
      console.log(`[modal-render] Webhook callback sent successfully`);
    }
  } catch (err) {
    console.error(`[modal-render] Webhook callback error: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Progress reporting via callback (backward compat PATCH)
// ---------------------------------------------------------------------------

async function reportProgressCallback(
  callbackUrl: string | undefined,
  jobId: string | undefined,
  progress: RenderVideoProgress,
): Promise<void> {
  if (!callbackUrl || !jobId) return;

  // Only send callbacks at 10% intervals to avoid flooding
  const rounded = Math.floor(progress.overallProgress / 10) * 10;
  if (rounded === 0 || rounded === (reportProgressCallback as any)._lastReported) return;
  (reportProgressCallback as any)._lastReported = rounded;

  const body: Record<string, unknown> = {
    progress: Math.round(progress.overallProgress),
    currentStage: progress.message,
  };

  // Map stage to job status
  const stageToStatus: Record<string, string> = {
    analyzing: 'analyzing',
    capturing: 'rendering',
    encoding: 'encoding',
    metadata: 'injecting',
    complete: 'completed',
    error: 'failed',
  };
  if (stageToStatus[progress.stage]) {
    body.status = stageToStatus[progress.stage];
  }

  try {
    const url = `${callbackUrl}/api/render/${jobId}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Silently ignore callback failures
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('[modal-render] Starting render...');
  console.log(`[modal-render] Config: ${args.configPath}`);
  console.log(`[modal-render] App URL: ${args.appUrl}`);

  // Load config
  let config: any;
  try {
    const raw = await fs.readFile(args.configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`[modal-render] Failed to load config: ${err}`);
    process.exit(1);
  }

  // Resolve audio path — signed URL download takes priority over local path
  let audioPath = args.audioPath || config.audio?.path;

  if (args.audioSignedUrl && !args.audioPath) {
    // Download audio from R2 signed URL to a temp file
    audioPath = await downloadAudioFromSignedUrl(args.audioSignedUrl);
  }

  const outputPath = args.outputPath || config.output?.path;

  if (!audioPath) {
    console.error('[modal-render] No audio source provided (--audio, --audio-signed-url, or config.audio.path)');
    process.exit(1);
  }
  if (!outputPath) {
    console.error('[modal-render] No output path provided (--output or config.output.path)');
    process.exit(1);
  }

  // Verify audio exists (already downloaded if from signed URL)
  try {
    await fs.access(audioPath);
  } catch {
    console.error(`[modal-render] Audio file not found: ${audioPath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Determine format and settings
  const format = (config.output?.format || 'flat-1080p-landscape') as OutputFormat;
  const fps = config.output?.fps || 30;
  const quality = config.options?.quality || 'balanced';
  const template = config.visual?.mode || 'flame';

  // Derive R2 upload key if not explicitly provided
  const r2UploadKey = args.r2UploadKey || (args.jobId ? `renders/${args.jobId}/output.mp4` : undefined);

  console.log(`[modal-render] Format: ${format}, FPS: ${fps}, Quality: ${quality}`);
  if (r2UploadKey) {
    console.log(`[modal-render] R2 upload key: ${r2UploadKey}`);
  }

  // Run the render pipeline
  let result: any;
  try {
    result = await renderVideo({
      audioPath,
      outputPath,
      template,
      visualConfig: config.visual,
      format,
      fps,
      quality,
      appUrl: args.appUrl,
      headless: true,
      onProgress: (progress) => {
        // Log to stdout for the Python wrapper
        const pct = Math.round(progress.overallProgress);
        console.log(`[modal-render] [${progress.stage}] ${pct}% -- ${progress.message}`);

        // Send progress callback to Vercel (backward compat PATCH)
        reportProgressCallback(args.callbackUrl, args.jobId, progress);
      },
    });
  } catch (renderErr) {
    const errorMessage = renderErr instanceof Error ? renderErr.message : String(renderErr);
    console.error(`[modal-render] Render failed: ${errorMessage}`);

    // Call webhook with failure status
    if (args.webhookUrl && args.webhookSecret && args.jobId) {
      await callWebhook(args.webhookUrl, args.webhookSecret, {
        jobId: args.jobId,
        status: 'failed',
        error: errorMessage,
      });
    }

    process.exit(1);
  }

  if (result.success) {
    console.log(`[modal-render] Render complete: ${outputPath}`);
    console.log(`[modal-render] Duration: ${result.duration.toFixed(1)}s`);
    console.log(`[modal-render] Frames: ${result.stages.capture.frames}`);

    // Upload to R2 if configured
    if (r2UploadKey) {
      try {
        await uploadToR2(outputPath, r2UploadKey);
        console.log(`[modal-render] Uploaded video to R2: ${r2UploadKey}`);
      } catch (uploadErr) {
        const errorMessage = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        console.error(`[modal-render] R2 upload failed: ${errorMessage}`);

        // Call webhook with failure status
        if (args.webhookUrl && args.webhookSecret && args.jobId) {
          await callWebhook(args.webhookUrl, args.webhookSecret, {
            jobId: args.jobId,
            status: 'failed',
            error: `R2 upload failed: ${errorMessage}`,
          });
        }

        process.exit(1);
      }
    }

    // Call webhook with success status
    if (args.webhookUrl && args.webhookSecret && args.jobId) {
      await callWebhook(args.webhookUrl, args.webhookSecret, {
        jobId: args.jobId,
        status: 'complete',
        result: {
          videoKey: r2UploadKey || null,
          format,
          durationSeconds: result.duration,
        },
      });
    }

    process.exit(0);
  } else {
    console.error(`[modal-render] Render failed: ${result.error}`);

    // Call webhook with failure status
    if (args.webhookUrl && args.webhookSecret && args.jobId) {
      await callWebhook(args.webhookUrl, args.webhookSecret, {
        jobId: args.jobId,
        status: 'failed',
        error: result.error || 'Unknown render error',
      });
    }

    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('[modal-render] Unhandled error:', err);

  // Attempt to parse args for webhook info (best effort)
  try {
    const args = parseArgs();
    if (args.webhookUrl && args.webhookSecret && args.jobId) {
      await callWebhook(args.webhookUrl, args.webhookSecret, {
        jobId: args.jobId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } catch {
    // Ignore -- we're already in error handler
  }

  process.exit(1);
});
