/**
 * Local Render Manager
 *
 * Manages local render jobs by spawning render-cli processes
 * and tracking their progress via stdout parsing.
 * For local development only — state is in-memory.
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface LocalRenderJob {
  id: string;
  status: 'preparing' | 'building' | 'rendering' | 'encoding' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  message: string;
  outputPath: string | null;
  /** Storage key for the uploaded render output (e.g., "renders/{jobId}/filename.mp4") */
  storageKey: string | null;
  /** Signed download URL for the rendered video */
  downloadUrl: string | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

// Persist in-memory stores across HMR reloads in dev mode via globalThis
const globalAny = globalThis as unknown as {
  __localRenderJobs?: Map<string, LocalRenderJob>;
  __localRenderProcesses?: Map<string, ChildProcess>;
};
if (!globalAny.__localRenderJobs) globalAny.__localRenderJobs = new Map();
if (!globalAny.__localRenderProcesses) globalAny.__localRenderProcesses = new Map();
const jobs = globalAny.__localRenderJobs;
const processes = globalAny.__localRenderProcesses;

/** Strip ANSI escape codes from text */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[K/g, '').replace(/\r/g, '');
}

/**
 * Start a local render job
 */
export async function startLocalRender(params: {
  audioBase64?: string;
  audioPath?: string;
  audioFilename: string;
  format: string;
  fps: number;
  visualConfig: Record<string, unknown>;
  appUrl?: string;
}): Promise<string> {
  const jobId = randomUUID().substring(0, 8);
  const projectRoot = process.cwd();
  const tempDir = path.join(projectRoot, 'temp', `render-${jobId}`);
  const outputDir = path.join(projectRoot, 'renders');

  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  // Resolve audio file path
  let audioPath: string;
  const audioExt = path.extname(params.audioFilename) || '.mp3';
  if (params.audioPath) {
    // Asset-based: use path directly, skip base64 decode
    audioPath = params.audioPath;
  } else if (params.audioBase64) {
    // Legacy: decode base64 to temp file
    audioPath = path.join(tempDir, `audio${audioExt}`);
    const audioBuffer = Buffer.from(params.audioBase64, 'base64');
    await fs.writeFile(audioPath, audioBuffer);
  } else {
    throw new Error('Either audioBase64 or audioPath is required');
  }

  // Build config
  const baseName = path.basename(params.audioFilename, audioExt);
  const outputPath = path.join(outputDir, `${baseName}-${jobId}.mp4`);

  const config = {
    version: '1.0',
    audio: { path: audioPath },
    output: {
      path: outputPath,
      format: params.format,
      fps: params.fps,
    },
    visual: params.visualConfig,
  };

  const configPath = path.join(tempDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  // Create job entry
  const job: LocalRenderJob = {
    id: jobId,
    status: 'preparing',
    progress: 0,
    stage: 'Preparing...',
    message: 'Starting local render...',
    outputPath,
    storageKey: null,
    downloadUrl: null,
    error: null,
    createdAt: Date.now(),
    completedAt: null,
  };
  jobs.set(jobId, job);

  // Use the existing dev server (--no-server prevents render-cli
  // from trying to start its own server or run npm run build)
  const serverUrl = params.appUrl || 'http://localhost:3000';
  const child = spawn('npx', [
    'tsx', 'scripts/render-cli.ts',
    '--config', configPath,
    '--url', serverUrl,
    '--no-server',
  ], {
    cwd: projectRoot,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  processes.set(jobId, child);

  // Accumulate stderr for error diagnosis
  let stderrLog = '';

  // Parse stdout for progress
  const parseOutput = (data: Buffer) => {
    const raw = data.toString();
    const text = stripAnsi(raw);
    stderrLog += text + '\n';

    // Parse progress percentage
    const progressMatch = text.match(/(\d+)%/);
    if (progressMatch) {
      job.progress = parseInt(progressMatch[1], 10);
    }

    // Parse stage messages
    if (text.includes('Building production bundle')) {
      job.status = 'building';
      job.stage = 'Building...';
      job.message = 'Building production bundle...';
    } else if (text.includes('Using existing production build')) {
      job.stage = 'Starting server...';
      job.message = 'Using cached build...';
    } else if (text.includes('Starting production server') || text.includes('Starting render server')) {
      job.stage = 'Starting server...';
      job.message = 'Starting render server...';
    } else if (text.includes('server ready') || text.includes('Server ready') || text.includes('Ready in')) {
      job.status = 'rendering';
      job.stage = 'Rendering...';
      job.message = 'Server ready, starting render...';
    }

    if (text.includes('Stage 1') || text.includes('Analyzing audio')) {
      job.status = 'rendering';
      job.stage = 'Analyzing audio...';
      job.message = 'Analyzing audio frequencies...';
    }

    const frameMatch = text.match(/Capturing frame (\d+)\/(\d+)/);
    if (frameMatch) {
      job.stage = 'Capturing frames...';
      job.message = `Capturing frame ${frameMatch[1]}/${frameMatch[2]}`;
    }

    if (text.includes('Stage 3') || text.includes('Encoding')) {
      job.status = 'encoding';
      job.stage = 'Encoding video...';
      job.message = 'Encoding with FFmpeg...';
    }

    if (text.includes('Render complete')) {
      job.status = 'complete';
      job.progress = 100;
      job.stage = 'Complete';
      job.message = 'Render complete!';
      job.completedAt = Date.now();
    }
  };

  child.stdout?.on('data', parseOutput);
  child.stderr?.on('data', parseOutput);

  child.on('close', (code) => {
    processes.delete(jobId);
    if (code === 0 && job.status !== 'complete') {
      job.status = 'complete';
      job.progress = 100;
      job.stage = 'Complete';
      job.message = 'Render complete!';
      job.completedAt = Date.now();
    } else if (code !== 0 && job.status !== 'cancelled') {
      job.status = 'failed';
      // Include last 500 chars of output for debugging
      const tail = stderrLog.trim().slice(-500);
      job.error = `Render process exited with code ${code}${tail ? ': ' + tail : ''}`;
      job.message = 'Render failed';
      job.completedAt = Date.now();
    }

    // Upload rendered output to storage (STOR-03) then cleanup
    if (job.status === 'complete' && outputPath) {
      uploadRenderToStorage(jobId, outputPath, job).then(() => {
        // Cleanup temp dir after successful upload
        setTimeout(async () => {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch { /* Ignore cleanup errors */ }
        }, 5000);
      }).catch((err) => {
        console.warn(`[LocalRender] Failed to upload render ${jobId} to storage:`, err);
        // Don't fail the job -- the local file still exists
        // Cleanup temp dir after a delay
        setTimeout(async () => {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch { /* Ignore cleanup errors */ }
        }, 5000);
      });
    } else {
      // Cleanup temp dir after a delay (60s to allow inspection on failure)
      const cleanupDelay = job.status === 'failed' ? 60000 : 5000;
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch { /* Ignore cleanup errors */ }
      }, cleanupDelay);
    }
  });

  child.on('error', (err) => {
    job.status = 'failed';
    job.error = err.message;
    job.message = 'Failed to start render process';
    job.completedAt = Date.now();
    processes.delete(jobId);
  });

  return jobId;
}

/**
 * Upload the finished render output to storage (STOR-03).
 * Updates the job record with storageKey and downloadUrl.
 * Deletes the local output file after successful upload to avoid disk buildup.
 */
async function uploadRenderToStorage(jobId: string, outputPath: string, job: LocalRenderJob): Promise<void> {
  const { getStorageAdapter } = await import('@/lib/storage');
  const storage = getStorageAdapter();

  const renderBuffer = await fs.readFile(outputPath);
  const storageKey = `renders/${jobId}/${path.basename(outputPath)}`;

  await storage.put(storageKey, renderBuffer, { contentType: 'video/mp4' });
  job.storageKey = storageKey;

  // Generate a signed download URL for client access
  const downloadUrl = await storage.getSignedUrl(storageKey);
  job.downloadUrl = downloadUrl;

  // Clean up local output file after successful upload
  await fs.unlink(outputPath).catch(() => {});
  console.log(`[LocalRender] Uploaded render ${jobId} to storage: ${storageKey}`);
}

/** Get a job's current status */
export function getLocalRenderJob(jobId: string): LocalRenderJob | null {
  return jobs.get(jobId) || null;
}

/** Get all local render jobs */
export function getAllLocalRenderJobs(): LocalRenderJob[] {
  return Array.from(jobs.values());
}

/** Cancel a running render job */
export function cancelLocalRender(jobId: string): boolean {
  const job = jobs.get(jobId);
  const child = processes.get(jobId);

  if (job && child) {
    job.status = 'cancelled';
    job.message = 'Render cancelled';
    job.completedAt = Date.now();

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }

    processes.delete(jobId);
    return true;
  }
  return false;
}
