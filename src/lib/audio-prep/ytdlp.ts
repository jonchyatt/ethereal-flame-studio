import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_DOMAINS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];

interface YtDlpOptions {
  timeoutMs?: number;
  maxFileSizeMB?: number;
  cookieFilePath?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

interface YtDlpResult {
  filePath: string;
  videoId: string;
  title: string;
  duration: number;
}

export function validateYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      return false;
    }

    if (!ALLOWED_DOMAINS.some((d) => parsed.hostname === d)) {
      return false;
    }

    // Reject playlist-only URLs
    if (parsed.pathname === '/playlist') return false;

    // youtube.com requires ?v= param
    if (parsed.hostname !== 'youtu.be') {
      if (!parsed.searchParams.has('v')) return false;
    } else {
      // youtu.be/VIDEO_ID format
      if (!parsed.pathname.match(/^\/[a-zA-Z0-9_-]{11}$/)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

export async function extractYouTubeAudio(
  url: string,
  outputDir: string,
  options: YtDlpOptions = {}
): Promise<YtDlpResult> {
  const { timeoutMs = 300000, maxFileSizeMB = 100, cookieFilePath, onProgress, signal } = options;

  if (!validateYouTubeUrl(url)) {
    throw new Error(`Invalid or disallowed YouTube URL: ${url}`);
  }

  const videoId = extractVideoId(url) ?? 'unknown';
  const outputTemplate = path.join(outputDir, '%(id)s.%(ext)s');

  const args = [
    '--extract-audio',
    '--audio-quality', '0',
    '--no-playlist',
    '--socket-timeout', '30',
    '--retries', '3',
    '--max-filesize', `${maxFileSizeMB}m`,
    '--output', outputTemplate,
    '--print-json',
    '--no-progress',
  ];

  if (cookieFilePath) {
    args.push('--cookies', cookieFilePath);
  }

  args.push(url);

  const result = await runYtDlp(args, timeoutMs, onProgress, signal);
  const info = JSON.parse(result);

  // Find the downloaded file
  const files = await fs.readdir(outputDir);
  const audioFile = files.find((f) => f.startsWith(videoId) || f.startsWith(info.id));

  if (!audioFile) {
    throw new Error('yt-dlp completed but no audio file found in output directory');
  }

  return {
    filePath: path.join(outputDir, audioFile),
    videoId: info.id ?? videoId,
    title: info.title ?? 'Unknown',
    duration: info.duration ?? 0,
  };
}

function runYtDlp(
  args: string[],
  timeoutMs: number,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new Error('yt-dlp cancelled'));
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    let settled = false;

    const safeResolve = (value: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const safeReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    // Thread AbortSignal to kill the yt-dlp process on cancel
    if (signal) {
      signal.addEventListener('abort', () => {
        proc.kill('SIGTERM');
        safeReject(new Error('yt-dlp cancelled'));
      }, { once: true });
    }

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      safeReject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      // Parse progress from stderr if available
      const match = stderr.match(/(\d+\.?\d*)%/);
      if (match && onProgress) {
        onProgress(parseFloat(match[1]));
      }
    });

    proc.on('close', (code) => {
      if (code === 0) safeResolve(stdout.trim());
      else safeReject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
    });

    proc.on('error', (err) => {
      safeReject(new Error(`Failed to run yt-dlp: ${err.message}. Is yt-dlp installed?`));
    });
  });
}
