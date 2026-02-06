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
 *     --callback-url https://ethereal-flame.vercel.app
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { renderVideo, RenderVideoProgress } from '../src/lib/render/renderVideo';
import { OutputFormat } from '../src/lib/render/FFmpegEncoder';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface Args {
  configPath: string;
  audioPath?: string;
  outputPath?: string;
  appUrl: string;
  jobId?: string;
  callbackUrl?: string;
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
    }
  }

  if (!result.configPath) {
    console.error('Error: --config is required');
    process.exit(1);
  }

  return result as Args;
}

// ---------------------------------------------------------------------------
// Progress reporting via callback
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

  // Resolve paths — CLI args override config values
  const audioPath = args.audioPath || config.audio?.path;
  const outputPath = args.outputPath || config.output?.path;

  if (!audioPath) {
    console.error('[modal-render] No audio path provided (--audio or config.audio.path)');
    process.exit(1);
  }
  if (!outputPath) {
    console.error('[modal-render] No output path provided (--output or config.output.path)');
    process.exit(1);
  }

  // Verify audio exists
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

  console.log(`[modal-render] Format: ${format}, FPS: ${fps}, Quality: ${quality}`);

  // Run the render pipeline
  const result = await renderVideo({
    audioPath,
    outputPath,
    template,
    visualConfig: config.visual
      ? {
          mode: config.visual.mode,
          skyboxPreset: config.visual.skyboxPreset,
          skyboxRotationSpeed: config.visual.skyboxRotationSpeed,
          waterEnabled: config.visual.waterEnabled,
          waterColor: config.visual.waterColor,
          waterReflectivity: config.visual.waterReflectivity,
          layers: config.visual.layers,
        }
      : undefined,
    format,
    fps,
    quality,
    appUrl: args.appUrl,
    headless: true,
    onProgress: (progress) => {
      // Log to stdout for the Python wrapper
      const pct = Math.round(progress.overallProgress);
      console.log(`[modal-render] [${progress.stage}] ${pct}% — ${progress.message}`);

      // Send callback to Vercel
      reportProgressCallback(args.callbackUrl, args.jobId, progress);
    },
  });

  if (result.success) {
    console.log(`[modal-render] Render complete: ${outputPath}`);
    console.log(`[modal-render] Duration: ${result.duration.toFixed(1)}s`);
    console.log(`[modal-render] Frames: ${result.stages.capture.frames}`);
    process.exit(0);
  } else {
    console.error(`[modal-render] Render failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[modal-render] Unhandled error:', err);
  process.exit(1);
});
