import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audioPrepJobs } from '@/lib/audio-prep/JobManager';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { probeAudio } from '@/lib/audio-prep/ffprobe';
import { generatePeaks } from '@/lib/audio-prep/peaksGenerator';
import { extractYouTubeAudio, validateYouTubeUrl } from '@/lib/audio-prep/ytdlp';
import { validateUrl } from '@/lib/audio-prep/urlSecurity';
import type { IngestSource } from '@/lib/audio-prep/types';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const assetService = new AudioAssetService();

// Ingest accepts two content types:
// - application/json for YouTube URLs and direct URLs (small payload)
// - multipart/form-data for file uploads (video_file, audio_file) to avoid base64 memory bloat

const JsonIngestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('youtube'),
    url: z.string().url(),
    rightsAttested: z.literal(true, { message: 'You must attest to having rights to use this audio' }),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    await assetService.init();

    // Quota check before accepting any upload
    if (!await assetService.checkQuota()) {
      return NextResponse.json(
        { success: false, error: { code: 'QUOTA_EXCEEDED', message: 'Audio asset storage quota exceeded. Delete unused assets.' } },
        { status: 413 }
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    let source: IngestSource;

    if (contentType.includes('multipart/form-data')) {
      // File upload (video_file or audio_file)
      // Known limitation: request.formData() may buffer the full body in memory
      // depending on the runtime. For MVP (local Node), this is acceptable since
      // maxFileSizeMB (100MB) is bounded. For production, consider a streaming
      // multipart parser (e.g. busboy) if memory pressure becomes an issue.
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const type = formData.get('type') as string;

      if (!file || !type || !['video_file', 'audio_file'].includes(type)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Multipart upload requires "file" and "type" (video_file|audio_file)' } },
          { status: 400 }
        );
      }

      source = { type: type as 'video_file' | 'audio_file', file, filename: file.name };
    } else {
      // JSON body (youtube or url)
      const body = await request.json();
      const parsed = JsonIngestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }
      source = parsed.data as IngestSource;
    }

    const job = audioPrepJobs.create('ingest', { type: source.type });

    // Execute ingest with proper lifecycle management.
    const ingestPromise = processIngest(job.jobId, source).catch((err) => {
      // Guard: don't overwrite 'cancelled' with 'failed'
      const current = audioPrepJobs.get(job.jobId);
      if (current && current.status !== 'cancelled') {
        audioPrepJobs.fail(job.jobId, err instanceof Error ? err.message : String(err));
      }
    });

    // For serverless environments (Vercel), use waitUntil to extend function lifetime.
    // For local dev, the Node process persists so fire-and-forget is safe.
    if (typeof (globalThis as any).waitUntil === 'function') {
      (globalThis as any).waitUntil(ingestPromise);
    }

    return NextResponse.json({
      success: true,
      data: { jobId: job.jobId, status: job.status },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

// Sanitize filename: strip path separators and null bytes to prevent path traversal
function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\:\0]/g, '_').replace(/^\.+/, '_');
}

async function processIngest(jobId: string, source: IngestSource) {
  const signal = audioPrepJobs.getSignal(jobId);
  audioPrepJobs.update(jobId, { status: 'processing', progress: 10 });

  const tempDir = path.join(os.tmpdir(), `audio-ingest-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    let audioFilePath: string;
    let provenance: Record<string, unknown> = { sourceType: source.type };

    switch (source.type) {
      case 'youtube': {
        if (!validateYouTubeUrl(source.url, assetService.config.youtubeAllowedDomains)) {
          throw new Error('Invalid YouTube URL');
        }
        audioPrepJobs.update(jobId, { progress: 20 });

        const result = await extractYouTubeAudio(source.url, tempDir, {
          onProgress: (p) => audioPrepJobs.update(jobId, { progress: 20 + p * 0.4 }),
          signal,
          maxFileSizeMB: assetService.config.maxFileSizeMB,
          cookieFilePath: assetService.config.cookieFilePath,
          allowedDomains: assetService.config.youtubeAllowedDomains,
        });
        audioFilePath = result.filePath;
        provenance = {
          ...provenance,
          sourceUrl: source.url,
          sourceVideoId: result.videoId,
          rightsAttestedAt: source.rightsAttested ? new Date().toISOString() : undefined,
        };
        break;
      }

      case 'video_file': {
        const safeName = sanitizeFilename(source.filename);
        const videoPath = path.join(tempDir, safeName);
        await streamFileToDisk(source.file, videoPath, signal);
        audioPrepJobs.update(jobId, { progress: 30 });

        audioFilePath = path.join(tempDir, 'extracted.wav');
        await extractAudioFromVideo(videoPath, audioFilePath, signal);
        provenance.originalFilename = source.filename;
        break;
      }

      case 'audio_file': {
        const safeName = sanitizeFilename(source.filename);
        audioFilePath = path.join(tempDir, safeName);
        await streamFileToDisk(source.file, audioFilePath, signal);
        provenance.originalFilename = source.filename;
        break;
      }

      case 'url': {
        await validateUrl(source.url);
        audioPrepJobs.update(jobId, { progress: 20 });

        // Fetch with redirect: 'manual' at every hop to re-validate each target against SSRF.
        let currentUrl = source.url;
        let response: Response | undefined;
        for (let redirects = 0; redirects < 5; redirects++) {
          response = await fetch(currentUrl, { signal, redirect: 'manual' });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) break;
            const resolvedUrl = new URL(location, currentUrl).href;
            await validateUrl(resolvedUrl);
            currentUrl = resolvedUrl;
          } else {
            break;
          }
        }
        if (!response || !response.ok) throw new Error(`Fetch failed: ${response?.status ?? 'no response'}`);

        // Check Content-Length header first (fast reject)
        const maxBytes = assetService.config.maxFileSizeMB * 1024 * 1024;
        const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
        if (contentLength > maxBytes) {
          throw new Error(`File too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB exceeds ${assetService.config.maxFileSizeMB}MB limit`);
        }

        const respContentType = response.headers.get('content-type') ?? '';
        const ext = respContentType.includes('wav') ? '.wav' :
                    respContentType.includes('mpeg') ? '.mp3' :
                    respContentType.includes('ogg') ? '.ogg' : '.audio';

        audioFilePath = path.join(tempDir, `download${ext}`);

        if (!response.body) {
          throw new Error('URL response has no body');
        }

        // Stream to disk with backpressure + abort support
        const { createWriteStream } = await import('fs');
        const fileStream = createWriteStream(audioFilePath);
        let bytesWritten = 0;
        const reader = response.body.getReader();

        try {
          while (true) {
            if (signal?.aborted) {
              reader.cancel();
              fileStream.destroy();
              throw new Error('Download aborted');
            }

            const { done, value } = await reader.read();
            if (done) break;
            bytesWritten += value.byteLength;
            if (bytesWritten > maxBytes) {
              reader.cancel();
              fileStream.destroy();
              throw new Error(`Download exceeded ${assetService.config.maxFileSizeMB}MB limit`);
            }
            const canContinue = fileStream.write(Buffer.from(value));
            if (!canContinue) {
              await new Promise<void>((resolve) => fileStream.once('drain', resolve));
            }
          }
        } catch (err) {
          fileStream.destroy();
          throw err;
        }

        fileStream.end();
        await new Promise<void>((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });

        provenance.sourceUrl = source.url;
        break;
      }
    }

    audioPrepJobs.update(jobId, { progress: 60 });

    // Probe audio metadata
    const audioMeta = await probeAudio(audioFilePath);
    audioPrepJobs.update(jobId, { progress: 70 });

    // Enforce duration cap from config
    const maxDurationSec = assetService.config.maxDurationMinutes * 60;
    if (audioMeta.duration > maxDurationSec) {
      throw new Error(`Audio duration ${(audioMeta.duration / 60).toFixed(1)} min exceeds ${assetService.config.maxDurationMinutes} min limit`);
    }

    // Enforce file size cap from config
    const fileStat = await fs.stat(audioFilePath);
    const maxSizeBytes = assetService.config.maxFileSizeMB * 1024 * 1024;
    if (fileStat.size > maxSizeBytes) {
      throw new Error(`File size ${(fileStat.size / 1024 / 1024).toFixed(1)}MB exceeds ${assetService.config.maxFileSizeMB}MB limit`);
    }

    // Create asset
    const audioBuffer = await fs.readFile(audioFilePath);
    const filename = path.basename(audioFilePath);
    const asset = await assetService.createAsset(audioBuffer, filename, provenance as any);

    // Update metadata with probed info
    await assetService.updateMetadata(asset.assetId, { audio: audioMeta });
    audioPrepJobs.update(jobId, { progress: 80 });

    // Generate peaks from the temp file (still on disk before cleanup)
    const peaks = await generatePeaks(audioFilePath, { zoomLevels: [25, 50, 100, 200] });
    const storage = assetService.getStorage();
    await storage.put(
      `${assetService.getAssetPrefix(asset.assetId)}peaks.json`,
      Buffer.from(JSON.stringify(peaks))
    );
    audioPrepJobs.update(jobId, { progress: 95 });

    audioPrepJobs.complete(jobId, {
      assetId: asset.assetId,
      metadata: { ...asset, audio: audioMeta },
    });
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Stream a Web API File to disk in chunks instead of loading into memory. */
async function streamFileToDisk(file: File, destPath: string, signal?: AbortSignal): Promise<void> {
  const { createWriteStream } = await import('fs');
  const ws = createWriteStream(destPath);
  const reader = file.stream().getReader();

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        ws.destroy();
        throw new Error('Upload aborted');
      }

      const { done, value } = await reader.read();
      if (done) break;

      const canContinue = ws.write(Buffer.from(value));
      if (!canContinue) {
        await new Promise<void>((resolve) => ws.once('drain', resolve));
      }
    }
  } catch (err) {
    ws.destroy();
    throw err;
  }

  ws.end();
  await new Promise<void>((resolve, reject) => {
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function extractAudioFromVideo(videoPath: string, outputPath: string, signal?: AbortSignal): Promise<void> {
  const { spawn } = await import('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', videoPath, '-vn', '-ar', '44100', '-ac', '1', '-sample_fmt', 's16', outputPath]);
    let stderr = '';
    if (signal) signal.addEventListener('abort', () => proc.kill('SIGTERM'), { once: true });
    proc.stderr.on('data', (c: Buffer) => { stderr += c; });
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg: ${stderr.slice(-300)}`)));
    proc.on('error', (err) => reject(err));
  });
}
