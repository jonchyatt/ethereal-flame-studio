/**
 * Ingest pipeline — handles YouTube, direct URL, and file upload sources.
 *
 * Extracts processing logic from the old inline processIngest function,
 * adapted for worker context: async JobStore, storage adapter, child
 * process ref for cancellation.
 */

import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import type { JobStore, AudioPrepJob } from '../../src/lib/jobs/types';
import { getStorageAdapter } from '../../src/lib/storage';
import { AudioAssetService } from '../../src/lib/audio-prep/AudioAssetService';
import { DEFAULT_CONFIG } from '../../src/lib/audio-prep/types';
import { probeAudio } from '../../src/lib/audio-prep/ffprobe';
import { generatePeaks } from '../../src/lib/audio-prep/peaksGenerator';
import { extractYouTubeAudio } from '../../src/lib/audio-prep/ytdlp';
import { validateUrl } from '../../src/lib/audio-prep/urlSecurity';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const config = DEFAULT_CONFIG;

/** Maximum file size in bytes. */
const MAX_FILE_SIZE_BYTES = config.maxFileSizeMB * 1024 * 1024;

/** Maximum audio duration in seconds. */
const MAX_DURATION_SECONDS = config.maxDurationMinutes * 60;

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

/**
 * Run the ingest pipeline for a single job.
 *
 * Supports three source types via `job.metadata.sourceType`:
 *   - `youtube`    — download via yt-dlp
 *   - `url`        — download via fetch with SSRF protection
 *   - `audio_file` / `video_file` — read from storage (already uploaded by API route)
 */
export async function runIngestPipeline(
  store: JobStore,
  job: AudioPrepJob,
  childRef: { current: ChildProcess | null },
): Promise<void> {
  const storage = getStorageAdapter();
  const assetService = new AudioAssetService({}, storage);
  const sourceType = job.metadata.sourceType as string;

  // Create a temp directory for this job's intermediate files
  const tmpDir = path.join(os.tmpdir(), `ingest-${job.jobId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    let audioFilePath: string;
    let originalFilename: string;
    let provenance: Record<string, unknown> = { sourceType };

    // -- Stage 1: Download / extract source audio ---------------------------

    switch (sourceType) {
      case 'youtube': {
        await store.update(job.jobId, { stage: 'downloading', progress: 10 });

        const url = job.metadata.url as string;
        const result = await extractYouTubeAudio(url, tmpDir, {
          maxFileSizeMB: config.maxFileSizeMB,
          onProgress: (pct) => {
            // Map yt-dlp progress (0-100) into our range (10-50)
            const mapped = 10 + Math.round(pct * 0.4);
            store.update(job.jobId, { stage: 'downloading', progress: mapped }).catch(() => {});
          },
        });

        audioFilePath = result.filePath;
        originalFilename = `${result.title}.${path.extname(result.filePath).replace('.', '')}`;
        provenance = {
          sourceType: 'youtube',
          sourceUrl: url,
          sourceVideoId: result.videoId,
          rightsAttestedAt: job.metadata.rightsAttested ? new Date().toISOString() : undefined,
        };
        break;
      }

      case 'url': {
        await store.update(job.jobId, { stage: 'downloading', progress: 10 });

        const url = job.metadata.url as string;

        // SSRF protection
        const validatedUrl = await validateUrl(url);

        // Download with streaming and size enforcement
        const response = await fetch(validatedUrl.href);
        if (!response.ok) {
          throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
        }

        // SEC-02: Check Content-Length header before downloading
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `File size ${(contentLength / 1024 / 1024).toFixed(1)}MB exceeds ${config.maxFileSizeMB}MB limit`,
          );
        }

        // Stream to temp file with size check
        const urlFilename = path.basename(validatedUrl.pathname) || 'download.audio';
        const downloadPath = path.join(tmpDir, urlFilename);
        const body = response.body;
        if (!body) throw new Error('Response body is null');

        let downloaded = 0;
        const chunks: Buffer[] = [];
        const reader = body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          downloaded += value.byteLength;
          if (downloaded > MAX_FILE_SIZE_BYTES) {
            throw new Error(
              `Download exceeds ${config.maxFileSizeMB}MB limit`,
            );
          }
          chunks.push(Buffer.from(value));

          // Progress: 10-50
          if (contentLength > 0) {
            const pct = 10 + Math.round((downloaded / contentLength) * 40);
            store.update(job.jobId, { stage: 'downloading', progress: Math.min(pct, 50) }).catch(() => {});
          }
        }

        await fs.writeFile(downloadPath, Buffer.concat(chunks));

        audioFilePath = downloadPath;
        originalFilename = urlFilename;
        provenance = { sourceType: 'url', sourceUrl: url };

        await store.update(job.jobId, { stage: 'downloading', progress: 50 });
        break;
      }

      case 'audio_file':
      case 'video_file': {
        await store.update(job.jobId, { stage: 'downloading', progress: 10 });

        const storageKey = job.metadata.storageKey as string;
        const fileData = await storage.get(storageKey);
        if (!fileData) {
          throw new Error(`Uploaded file not found in storage at key: ${storageKey}`);
        }

        // SEC-02: File size check
        if (fileData.byteLength > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `File size ${(fileData.byteLength / 1024 / 1024).toFixed(1)}MB exceeds ${config.maxFileSizeMB}MB limit`,
          );
        }

        const origName = (job.metadata.originalFilename as string) || 'upload.bin';
        const ext = path.extname(origName) || '.bin';
        const downloadPath = path.join(tmpDir, `upload${ext}`);
        await fs.writeFile(downloadPath, fileData);

        await store.update(job.jobId, { stage: 'downloading', progress: 20 });

        if (sourceType === 'video_file') {
          // Extract audio from video using ffmpeg
          const audioOutputPath = path.join(tmpDir, 'extracted_audio.wav');
          await new Promise<void>((resolve, reject) => {
            const proc = spawn('ffmpeg', [
              '-y', '-i', downloadPath,
              '-vn', '-acodec', 'pcm_s16le',
              audioOutputPath,
            ]);

            childRef.current = proc;

            proc.on('close', (code) => {
              childRef.current = null;
              if (code === 0) resolve();
              else reject(new Error(`ffmpeg audio extraction exited with code ${code}`));
            });

            proc.on('error', (err) => {
              childRef.current = null;
              reject(new Error(`Failed to run ffmpeg: ${err.message}`));
            });
          });

          audioFilePath = audioOutputPath;
        } else {
          audioFilePath = downloadPath;
        }

        originalFilename = origName;
        provenance = { sourceType };

        await store.update(job.jobId, { stage: 'downloading', progress: 30 });
        break;
      }

      default:
        throw new Error(`Unknown ingest source type: ${sourceType}`);
    }

    // -- Stage 2: Probe and validate ----------------------------------------

    await store.update(job.jobId, { stage: 'analyzing', progress: 55 });

    const audioInfo = await probeAudio(audioFilePath);

    // SEC-02: Duration check
    if (audioInfo.duration > MAX_DURATION_SECONDS) {
      throw new Error(
        `Audio duration ${(audioInfo.duration / 60).toFixed(1)} minutes exceeds ${config.maxDurationMinutes}-minute limit`,
      );
    }

    // SEC-02: Final file size check (post-extraction)
    const stat = await fs.stat(audioFilePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Processed file size ${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds ${config.maxFileSizeMB}MB limit`,
      );
    }

    await store.update(job.jobId, { stage: 'analyzing', progress: 60 });

    // -- Stage 3: Create asset and upload -----------------------------------

    const audioBuffer = await fs.readFile(audioFilePath);
    const asset = await assetService.createAsset(audioBuffer, originalFilename, provenance);

    // Update asset metadata with probed audio info
    await assetService.updateMetadata(asset.assetId, {
      audio: audioInfo,
    });

    await store.update(job.jobId, { stage: 'finalizing', progress: 80 });

    // -- Stage 4: Generate peaks and upload ---------------------------------

    const peaks = await generatePeaks(audioFilePath, { pixelsPerSecond: 50 });
    await storage.put(
      `assets/${asset.assetId}/peaks.json`,
      Buffer.from(JSON.stringify(peaks)),
    );

    await store.update(job.jobId, { stage: 'finalizing', progress: 95 });

    // -- Complete -----------------------------------------------------------

    await store.complete(job.jobId, {
      assetId: asset.assetId,
      metadata: {
        duration: audioInfo.duration,
        sampleRate: audioInfo.sampleRate,
        channels: audioInfo.channels,
        codec: audioInfo.codec,
        format: audioInfo.format,
        originalFilename,
      },
    });
  } finally {
    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
