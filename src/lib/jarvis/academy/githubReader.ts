/**
 * GitHub API Client for Academy
 *
 * Reads source code from Jonathan's project repos via GitHub REST API.
 * Used by Academy tools to give Jarvis access to external codebases.
 *
 * Requires env vars: GITHUB_TOKEN (PAT), GITHUB_OWNER (username)
 */

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_LINES_PER_FILE = 300;

// Simple in-memory cache (survives within a single serverless invocation)
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

export function getConfig(): { token: string; owner: string } {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  if (!token || !owner) {
    throw new Error('Academy not configured. Set GITHUB_TOKEN and GITHUB_OWNER in environment variables.');
  }
  return { token, owner };
}

export async function githubFetch(path: string): Promise<Response> {
  const { token } = getConfig();
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

export interface FileReadResult {
  path: string;
  content: string;
  totalLines: number;
  linesShown: string; // e.g. "1-300"
  truncated: boolean;
}

export async function readFile(
  repo: string,
  filePath: string,
  lineStart?: number,
  lineEnd?: number
): Promise<FileReadResult> {
  const { owner } = getConfig();
  const cacheKey = `file:${owner}/${repo}/${filePath}`;
  let rawContent = getCached<string>(cacheKey);

  if (rawContent === null) {
    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${filePath}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`File not found: ${filePath}`);
      throw new Error(`GitHub API error ${res.status} reading ${filePath}`);
    }
    const data = await res.json();
    if (data.type !== 'file') throw new Error(`${filePath} is a directory, not a file. Use listDirectory instead.`);
    rawContent = Buffer.from(data.content, 'base64').toString('utf-8');
    setCache(cacheKey, rawContent);
  }

  const lines = rawContent.split('\n');
  const totalLines = lines.length;
  const start = Math.max(0, (lineStart || 1) - 1);
  const maxEnd = Math.min(start + MAX_LINES_PER_FILE, totalLines);
  const end = lineEnd ? Math.min(lineEnd, maxEnd) : maxEnd;
  const sliced = lines.slice(start, end);

  const numbered = sliced.map((line, i) => `${start + i + 1}: ${line}`).join('\n');

  return {
    path: filePath,
    content: numbered,
    totalLines,
    linesShown: `${start + 1}-${start + sliced.length}`,
    truncated: end < totalLines,
  };
}

export interface DirEntry {
  name: string;
  type: 'file' | 'dir';
  size?: number;
}

export async function listDirectory(
  repo: string,
  dirPath: string = ''
): Promise<DirEntry[]> {
  const { owner } = getConfig();
  const cacheKey = `dir:${owner}/${repo}/${dirPath}`;
  const cached = getCached<DirEntry[]>(cacheKey);
  if (cached) return cached;

  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${dirPath}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Directory not found: ${dirPath || '(root)'}`);
    throw new Error(`GitHub API error ${res.status} listing ${dirPath || '(root)'}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`${dirPath} is a file, not a directory. Use readFile instead.`);

  const entries: DirEntry[] = data.map((item: { name: string; type: string; size: number }) => ({
    name: item.name,
    type: item.type === 'dir' ? 'dir' as const : 'file' as const,
    size: item.type === 'dir' ? undefined : item.size,
  }));

  setCache(cacheKey, entries);
  return entries;
}

export async function searchCode(
  repo: string,
  query: string
): Promise<string[]> {
  const { owner } = getConfig();
  const res = await githubFetch(
    `/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}&per_page=15`
  );
  if (!res.ok) {
    if (res.status === 422) return []; // Repo not indexed or bad query
    throw new Error(`GitHub search error ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map((item: { path: string }) => item.path);
}

/** Invalidate cache for a file and its parent directory after a write */
export function invalidateCacheForFile(repo: string, filePath: string): void {
  const { owner } = getConfig();
  cache.delete(`file:${owner}/${repo}/${filePath}`);
  // Also invalidate parent directory listing
  const parentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
  cache.delete(`dir:${owner}/${repo}/${parentDir}`);
}

/** Check if Academy is configured (GITHUB_TOKEN + GITHUB_OWNER are set) */
export function isAcademyConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER);
}
