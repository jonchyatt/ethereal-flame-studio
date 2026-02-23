import { spawn } from 'child_process';

const DEFAULT_ALLOWED_DOMAINS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];

export interface YouTubePlaylistEntry {
  videoId: string;
  title: string;
  url: string;
  durationSeconds?: number;
}

export interface YouTubePlaylistResult {
  playlistId?: string;
  playlistTitle: string;
  entries: YouTubePlaylistEntry[];
}

interface ListYouTubePlaylistOptions {
  maxItems?: number;
  timeoutMs?: number;
  allowedDomains?: string[];
  signal?: AbortSignal;
}

export function validateYouTubePlaylistUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsed = new URL(url);
    const domains = allowedDomains ?? DEFAULT_ALLOWED_DOMAINS;
    if (parsed.protocol !== 'https:') return false;
    if (!domains.some((d) => parsed.hostname === d || parsed.hostname === `www.${d}`)) return false;

    const listId = parsed.searchParams.get('list');
    if (!listId) return false;

    // Accept /playlist or watch URLs with a list query param.
    return parsed.pathname === '/playlist' || parsed.pathname === '/watch';
  } catch {
    return false;
  }
}

export async function listYouTubePlaylistEntries(
  playlistUrl: string,
  options: ListYouTubePlaylistOptions = {},
): Promise<YouTubePlaylistResult> {
  const { maxItems = 20, timeoutMs = 120_000, allowedDomains, signal } = options;

  if (!validateYouTubePlaylistUrl(playlistUrl, allowedDomains)) {
    throw new Error(`Invalid or disallowed YouTube playlist URL: ${playlistUrl}`);
  }

  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--skip-download',
    '--playlist-end', String(maxItems),
    '--no-warnings',
    playlistUrl,
  ];

  const stdout = await runYtDlp(args, timeoutMs, signal);
  const parsed = JSON.parse(stdout) as {
    id?: string;
    title?: string;
    entries?: Array<Record<string, unknown>>;
  };

  const listId = new URL(playlistUrl).searchParams.get('list') || undefined;
  const entriesRaw = Array.isArray(parsed.entries) ? parsed.entries : [];
  const entries: YouTubePlaylistEntry[] = [];

  for (let idx = 0; idx < entriesRaw.length; idx++) {
    const entry = entriesRaw[idx];
    const id = typeof entry.id === 'string' ? entry.id : null;
    if (!id) continue;

    const title =
      (typeof entry.title === 'string' && entry.title.trim()) ||
      `YouTube video ${idx + 1}`;
    const durationValue = typeof entry.duration === 'number' ? entry.duration : undefined;

    entries.push({
      videoId: id,
      title,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${listId ? `&list=${encodeURIComponent(listId)}` : ''}`,
      durationSeconds: durationValue,
    });
  }

  if (entries.length === 0) {
    throw new Error('No playlist entries found (playlist may be empty, private, or unavailable)');
  }

  return {
    playlistId: (typeof parsed.id === 'string' && parsed.id) || listId,
    playlistTitle: (typeof parsed.title === 'string' && parsed.title.trim()) || 'YouTube Playlist',
    entries,
  };
}

function runYtDlp(args: string[], timeoutMs: number, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new Error('yt-dlp playlist listing cancelled'));
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        proc.kill('SIGTERM');
        finish(() => reject(new Error('yt-dlp playlist listing cancelled')));
      }, { once: true });
    }

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      finish(() => reject(new Error(`yt-dlp playlist listing timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        finish(() => resolve(stdout.trim()));
      } else {
        finish(() => reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`)));
      }
    });

    proc.on('error', (err) => {
      finish(() => reject(new Error(`Failed to run yt-dlp: ${err.message}. Is yt-dlp installed?`)));
    });
  });
}

