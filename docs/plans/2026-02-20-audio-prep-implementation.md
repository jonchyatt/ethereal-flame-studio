# Audio Prep MVP - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship audio ingest (YouTube/video/URL/file), non-destructive editing (trim/split/join/reorder/fade/volume/normalize), WaveSurfer editor UI, and unified render integration.

**Architecture:** Server-side FFmpeg + yt-dlp for all audio processing. WaveSurfer.js in browser for waveform visualization and region editing. Non-destructive edit recipes stored as JSON, materialized to WAV on explicit save. Unified `type: "asset"` render contract replaces mock File objects.

**Tech Stack:** Next.js 15 (App Router), FFmpeg (system), yt-dlp (system), WaveSurfer.js, Zustand, Zod, Jest

**Design Doc:** `docs/plans/2026-02-20-audio-prep-design.md`

---

## Phase 1: Backend Infrastructure

### Task 1: Install Dependencies & Create Directory Structure

**Files:**
- Modify: `package.json`
- Create: `src/lib/audio-prep/` directory structure

**Step 1: Install wavesurfer.js**

```bash
npm install wavesurfer.js
```

**Step 2: Create service directory structure**

```bash
mkdir -p src/lib/audio-prep
mkdir -p src/lib/audio-prep/__tests__
mkdir -p audio-assets
```

**Step 3: Add audio-assets to .gitignore**

Append to `.gitignore`:
```
# Audio prep assets (local storage)
audio-assets/
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: install wavesurfer.js and scaffold audio-prep structure"
```

---

### Task 2: Audio Asset Service (Core Storage Layer)

**Files:**
- Create: `src/lib/audio-prep/AudioAssetService.ts`
- Create: `src/lib/audio-prep/types.ts`
- Test: `src/lib/audio-prep/__tests__/AudioAssetService.test.ts`

**Step 1: Define types**

Create `src/lib/audio-prep/types.ts`:

```typescript
import { z } from 'zod';

// --- Asset Metadata ---

export const AudioMetadataSchema = z.object({
  duration: z.number(),
  sampleRate: z.number(),
  channels: z.number(),
  codec: z.string(),
  bitrate: z.number(),
  format: z.string(),
});

export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;

export const AssetProvenanceSchema = z.object({
  sourceType: z.enum(['youtube', 'video_file', 'audio_file', 'url']),
  sourceUrl: z.string().optional(),
  sourceVideoId: z.string().optional(),
  rightsAttestedAt: z.string().optional(),
  ingestToolVersions: z.record(z.string()).optional(),
});

export type AssetProvenance = z.infer<typeof AssetProvenanceSchema>;

export const AssetMetadataSchema = z.object({
  assetId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  audio: AudioMetadataSchema,
  provenance: AssetProvenanceSchema,
  sourceHash: z.string().optional(),
  originalFilename: z.string().optional(),
});

export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;

// --- Edit Recipe ---

export const ClipSchema = z.object({
  id: z.string(),
  sourceAssetId: z.string().uuid(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  volume: z.number().min(0).max(2).default(1),
  fadeIn: z.number().min(0).default(0),
  fadeOut: z.number().min(0).default(0),
});

export type Clip = z.infer<typeof ClipSchema>;

export const EditRecipeSchema = z.object({
  version: z.literal(1),
  assetId: z.string().uuid(),
  clips: z.array(ClipSchema).min(1).max(50),
  normalize: z.boolean().default(false),
  outputFormat: z.enum(['wav', 'aac']).default('wav'),
  outputSampleRate: z.number().default(44100),
});

export type EditRecipe = z.infer<typeof EditRecipeSchema>;

// --- Ingest Job ---

export type IngestSource =
  | { type: 'youtube'; url: string; rightsAttested: boolean }
  | { type: 'video_file'; base64: string; filename: string }
  | { type: 'audio_file'; base64: string; filename: string }
  | { type: 'url'; url: string };

export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';

export interface IngestJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  source: IngestSource;
  assetId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  type: 'preview' | 'save';
  recipe: EditRecipe;
  outputPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Config ---

export interface AudioPrepConfig {
  assetsDir: string;
  maxFileSizeMB: number;
  maxDurationMinutes: number;
  maxClipsPerRecipe: number;
  diskQuotaGB: number;
  ttlDays: number;
  youtubeAllowedDomains: string[];
  cookieFilePath?: string;
}

export const DEFAULT_CONFIG: AudioPrepConfig = {
  assetsDir: './audio-assets',
  maxFileSizeMB: 100,
  maxDurationMinutes: 30,
  maxClipsPerRecipe: 50,
  diskQuotaGB: 5,
  ttlDays: 30,
  youtubeAllowedDomains: ['youtube.com', 'youtu.be', 'www.youtube.com'],
  cookieFilePath: undefined,
};
```

**Step 2: Write failing test for AudioAssetService**

Create `src/lib/audio-prep/__tests__/AudioAssetService.test.ts`:

```typescript
import { AudioAssetService } from '../AudioAssetService';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('AudioAssetService', () => {
  let service: AudioAssetService;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `audio-prep-test-${Date.now()}`);
    service = new AudioAssetService({ assetsDir: testDir });
    await service.init();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('init creates assets directory', async () => {
    const stat = await fs.stat(testDir);
    expect(stat.isDirectory()).toBe(true);
  });

  test('createAsset stores file and returns metadata', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const result = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    expect(result.assetId).toBeDefined();
    expect(result.assetId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    const assetDir = path.join(testDir, result.assetId);
    const stat = await fs.stat(assetDir);
    expect(stat.isDirectory()).toBe(true);

    const originalFile = await fs.readFile(path.join(assetDir, 'original.wav'));
    expect(originalFile.toString()).toBe('fake-audio-data');
  });

  test('getAsset returns stored metadata', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const created = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    const retrieved = await service.getAsset(created.assetId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.assetId).toBe(created.assetId);
  });

  test('getAsset returns null for nonexistent ID', async () => {
    const result = await service.getAsset('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  test('deleteAsset removes asset directory', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const created = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    await service.deleteAsset(created.assetId);

    const retrieved = await service.getAsset(created.assetId);
    expect(retrieved).toBeNull();
  });

  test('listAssets returns all assets', async () => {
    await service.createAsset(Buffer.from('a'), 'a.wav', { sourceType: 'audio_file' });
    await service.createAsset(Buffer.from('b'), 'b.wav', { sourceType: 'audio_file' });

    const assets = await service.listAssets();
    expect(assets).toHaveLength(2);
  });

  test('resolveAssetPath returns prepared.wav path', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    // Write a fake prepared.wav
    const preparedPath = path.join(testDir, created.assetId, 'prepared.wav');
    await fs.writeFile(preparedPath, 'prepared-audio');

    const resolved = await service.resolveAssetPath(created.assetId);
    expect(resolved).toBe(preparedPath);
  });

  test('resolveAssetPath throws when prepared.wav missing', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    await expect(service.resolveAssetPath(created.assetId)).rejects.toThrow(
      /prepared asset not found/i
    );
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx jest src/lib/audio-prep/__tests__/AudioAssetService.test.ts --verbose
```

Expected: FAIL (AudioAssetService module not found)

**Step 4: Implement AudioAssetService**

Create `src/lib/audio-prep/AudioAssetService.ts`:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { AssetMetadata, AssetProvenance, AudioPrepConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export class AudioAssetService {
  private config: AudioPrepConfig;

  constructor(config: Partial<AudioPrepConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    await fs.mkdir(this.config.assetsDir, { recursive: true });
  }

  async createAsset(
    audioBuffer: Buffer,
    filename: string,
    provenance: Partial<AssetProvenance>
  ): Promise<AssetMetadata> {
    const assetId = uuid();
    const ext = path.extname(filename) || '.wav';
    const assetDir = path.join(this.config.assetsDir, assetId);

    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, `original${ext}`), audioBuffer);

    const now = new Date().toISOString();
    const metadata: AssetMetadata = {
      assetId,
      createdAt: now,
      updatedAt: now,
      audio: {
        duration: 0,
        sampleRate: 0,
        channels: 0,
        codec: 'unknown',
        bitrate: 0,
        format: ext.replace('.', ''),
      },
      provenance: {
        sourceType: provenance.sourceType ?? 'audio_file',
        ...provenance,
      },
      originalFilename: filename,
    };

    await fs.writeFile(
      path.join(assetDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    return metadata;
  }

  async getAsset(assetId: string): Promise<AssetMetadata | null> {
    const metadataPath = path.join(this.config.assetsDir, assetId, 'metadata.json');
    try {
      const raw = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(raw) as AssetMetadata;
    } catch {
      return null;
    }
  }

  async listAssets(): Promise<AssetMetadata[]> {
    try {
      const entries = await fs.readdir(this.config.assetsDir, { withFileTypes: true });
      const assets: AssetMetadata[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const asset = await this.getAsset(entry.name);
          if (asset) assets.push(asset);
        }
      }
      return assets;
    } catch {
      return [];
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    const assetDir = path.join(this.config.assetsDir, assetId);
    await fs.rm(assetDir, { recursive: true, force: true });
  }

  async resolveAssetPath(assetId: string): Promise<string> {
    const preparedPath = path.join(this.config.assetsDir, assetId, 'prepared.wav');
    try {
      await fs.access(preparedPath);
      return preparedPath;
    } catch {
      throw new Error(`Prepared asset not found for ${assetId}. Save edits first.`);
    }
  }

  async updateMetadata(assetId: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const existing = await this.getAsset(assetId);
    if (!existing) throw new Error(`Asset ${assetId} not found`);

    const updated: AssetMetadata = {
      ...existing,
      ...updates,
      assetId: existing.assetId, // Never override ID
      updatedAt: new Date().toISOString(),
    };

    const metadataPath = path.join(this.config.assetsDir, assetId, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2));
    return updated;
  }

  getAssetDir(assetId: string): string {
    return path.join(this.config.assetsDir, assetId);
  }
}
```

**Step 5: Run tests to verify pass**

```bash
npx jest src/lib/audio-prep/__tests__/AudioAssetService.test.ts --verbose
```

Expected: All 7 tests PASS

**Step 6: Commit**

```bash
git add src/lib/audio-prep/types.ts src/lib/audio-prep/AudioAssetService.ts src/lib/audio-prep/__tests__/AudioAssetService.test.ts
git commit -m "feat(audio-prep): add AudioAssetService with storage, metadata, and lifecycle"
```

---

### Task 3: FFprobe Wrapper

**Files:**
- Create: `src/lib/audio-prep/ffprobe.ts`
- Test: `src/lib/audio-prep/__tests__/ffprobe.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/ffprobe.test.ts`:

```typescript
import { probeAudio } from '../ffprobe';
import path from 'path';

describe('probeAudio', () => {
  test('probes a real audio file and returns metadata', async () => {
    // Use any audio file from the audio/ directory
    const testFile = path.resolve('audio/SirAnthony.mp3');
    const result = await probeAudio(testFile);

    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBeGreaterThan(0);
    expect(result.channels).toBeGreaterThanOrEqual(1);
    expect(result.codec).toBeDefined();
    expect(result.bitrate).toBeGreaterThan(0);
    expect(result.format).toBeDefined();
  });

  test('throws for nonexistent file', async () => {
    await expect(probeAudio('/nonexistent/file.wav')).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx jest src/lib/audio-prep/__tests__/ffprobe.test.ts --verbose
```

**Step 3: Implement ffprobe wrapper**

Create `src/lib/audio-prep/ffprobe.ts`:

```typescript
import { spawn } from 'child_process';
import type { AudioMetadata } from './types';

export async function probeAudio(filePath: string): Promise<AudioMetadata> {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-select_streams', 'a:0',
    filePath,
  ];

  const result = await runProcess('ffprobe', args);
  const data = JSON.parse(result);

  const stream = data.streams?.[0];
  const format = data.format;

  if (!stream && !format) {
    throw new Error(`No audio stream found in ${filePath}`);
  }

  return {
    duration: parseFloat(format?.duration ?? stream?.duration ?? '0'),
    sampleRate: parseInt(stream?.sample_rate ?? '0', 10),
    channels: stream?.channels ?? 0,
    codec: stream?.codec_name ?? 'unknown',
    bitrate: parseInt(format?.bit_rate ?? stream?.bit_rate ?? '0', 10),
    format: format?.format_name ?? 'unknown',
  };
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run ${command}: ${err.message}`));
    });
  });
}
```

**Step 4: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/ffprobe.test.ts --verbose
```

Expected: PASS (requires ffprobe in PATH)

**Step 5: Commit**

```bash
git add src/lib/audio-prep/ffprobe.ts src/lib/audio-prep/__tests__/ffprobe.test.ts
git commit -m "feat(audio-prep): add ffprobe wrapper for audio metadata extraction"
```

---

### Task 4: Waveform Peaks Generator

**Files:**
- Create: `src/lib/audio-prep/peaksGenerator.ts`
- Test: `src/lib/audio-prep/__tests__/peaksGenerator.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/peaksGenerator.test.ts`:

```typescript
import { generatePeaks } from '../peaksGenerator';
import path from 'path';

describe('generatePeaks', () => {
  test('generates peaks array from audio file', async () => {
    const testFile = path.resolve('audio/SirAnthony.mp3');
    const peaks = await generatePeaks(testFile, { pixelsPerSecond: 50 });

    expect(peaks.length).toBeGreaterThan(0);
    // Peaks should be normalized -1 to 1
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(-1);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  test('generates multiple zoom levels', async () => {
    const testFile = path.resolve('audio/SirAnthony.mp3');
    const result = await generatePeaks(testFile, {
      zoomLevels: [25, 50, 100],
    });

    expect(result).toHaveProperty('25');
    expect(result).toHaveProperty('50');
    expect(result).toHaveProperty('100');
    // Higher zoom = more peaks
    expect(result['100'].length).toBeGreaterThan(result['25'].length);
  });
});
```

**Step 2: Implement peaks generator**

Create `src/lib/audio-prep/peaksGenerator.ts`:

Uses `ffmpeg` to decode audio to raw PCM, then computes min/max peaks per pixel bucket.

```typescript
import { spawn } from 'child_process';

interface PeaksOptions {
  pixelsPerSecond?: number;
  zoomLevels?: number[];
}

export async function generatePeaks(
  filePath: string,
  options: PeaksOptions & { zoomLevels: number[] }
): Promise<Record<string, number[]>>;
export async function generatePeaks(
  filePath: string,
  options: PeaksOptions & { pixelsPerSecond: number }
): Promise<number[]>;
export async function generatePeaks(
  filePath: string,
  options: PeaksOptions
): Promise<number[] | Record<string, number[]>> {
  if (options.zoomLevels) {
    const result: Record<string, number[]> = {};
    for (const pps of options.zoomLevels) {
      result[String(pps)] = await generateSingleLevel(filePath, pps);
    }
    return result;
  }
  return generateSingleLevel(filePath, options.pixelsPerSecond ?? 50);
}

async function generateSingleLevel(filePath: string, pixelsPerSecond: number): Promise<number[]> {
  // Decode to raw 16-bit PCM mono at target sample rate
  const sampleRate = pixelsPerSecond * 256; // 256 samples per pixel bucket
  const args = [
    '-i', filePath,
    '-f', 's16le',
    '-ac', '1',
    '-ar', String(Math.min(sampleRate, 44100)),
    '-acodec', 'pcm_s16le',
    'pipe:1',
  ];

  const rawPcm = await runProcessBuffer('ffmpeg', args);
  const samples = new Int16Array(rawPcm.buffer, rawPcm.byteOffset, rawPcm.byteLength / 2);

  // Compute actual samples per pixel
  const actualSampleRate = Math.min(sampleRate, 44100);
  const samplesPerPixel = Math.floor(actualSampleRate / pixelsPerSecond);
  const peaks: number[] = [];

  for (let i = 0; i < samples.length; i += samplesPerPixel) {
    let min = 0;
    let max = 0;
    const end = Math.min(i + samplesPerPixel, samples.length);
    for (let j = i; j < end; j++) {
      const val = samples[j] / 32768;
      if (val < min) min = val;
      if (val > max) max = val;
    }
    peaks.push(min, max);
  }

  return peaks;
}

function runProcessBuffer(command: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on('data', () => {}); // Discard ffmpeg stderr progress

    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`${command} exited with code ${code}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to run ${command}: ${err.message}`)));
  });
}
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/peaksGenerator.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/peaksGenerator.ts src/lib/audio-prep/__tests__/peaksGenerator.test.ts
git commit -m "feat(audio-prep): add waveform peaks generator with multi-zoom support"
```

---

### Task 5: yt-dlp Wrapper

**Files:**
- Create: `src/lib/audio-prep/ytdlp.ts`
- Test: `src/lib/audio-prep/__tests__/ytdlp.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/ytdlp.test.ts`:

```typescript
import { extractYouTubeAudio, validateYouTubeUrl } from '../ytdlp';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

describe('validateYouTubeUrl', () => {
  test('accepts youtube.com watch URLs', () => {
    expect(validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtu.be short URLs', () => {
    expect(validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  test('rejects non-YouTube URLs', () => {
    expect(validateYouTubeUrl('https://vimeo.com/12345')).toBe(false);
  });

  test('rejects playlist URLs', () => {
    expect(validateYouTubeUrl('https://youtube.com/playlist?list=PLtest')).toBe(false);
  });
});

describe('extractYouTubeAudio', () => {
  // This test requires yt-dlp and internet. Mark as integration test.
  test.skip('downloads audio from YouTube URL', async () => {
    const outputDir = path.join(os.tmpdir(), `ytdlp-test-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      const result = await extractYouTubeAudio(
        'https://www.youtube.com/watch?v=jNQXAC9IVRw', // "Me at the zoo" (18s)
        outputDir,
        { timeoutMs: 60000 }
      );

      expect(result.filePath).toBeDefined();
      const stat = await fs.stat(result.filePath);
      expect(stat.size).toBeGreaterThan(0);
      expect(result.videoId).toBe('jNQXAC9IVRw');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});
```

**Step 2: Implement yt-dlp wrapper**

Create `src/lib/audio-prep/ytdlp.ts`:

```typescript
import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_DOMAINS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];

interface YtDlpOptions {
  timeoutMs?: number;
  maxFileSizeMB?: number;
  cookieFilePath?: string;
  onProgress?: (percent: number) => void;
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
    const domain = parsed.hostname.replace(/^www\./, '');

    if (!ALLOWED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname === `www.${d}`)) {
      return false;
    }

    // Reject playlist-only URLs
    if (parsed.pathname === '/playlist') return false;
    if (!parsed.searchParams.has('v') && !parsed.pathname.match(/^\/[a-zA-Z0-9_-]{11}$/)) {
      // youtu.be/VIDEO_ID format
      if (domain !== 'youtu.be') return false;
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
  const { timeoutMs = 300000, maxFileSizeMB = 100, cookieFilePath, onProgress } = options;

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

  const result = await runYtDlp(args, timeoutMs, onProgress);
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
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
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
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to run yt-dlp: ${err.message}. Is yt-dlp installed?`));
    });
  });
}
```

**Step 3: Run unit tests (skip integration)**

```bash
npx jest src/lib/audio-prep/__tests__/ytdlp.test.ts --verbose
```

Expected: validateYouTubeUrl tests PASS, integration test SKIPPED

**Step 4: Commit**

```bash
git add src/lib/audio-prep/ytdlp.ts src/lib/audio-prep/__tests__/ytdlp.test.ts
git commit -m "feat(audio-prep): add yt-dlp wrapper with URL validation and timeout support"
```

---

### Task 6: SSRF Protection for URL Ingest

**Files:**
- Create: `src/lib/audio-prep/urlSecurity.ts`
- Test: `src/lib/audio-prep/__tests__/urlSecurity.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/urlSecurity.test.ts`:

```typescript
import { validateUrl } from '../urlSecurity';

describe('validateUrl', () => {
  test('accepts HTTPS URLs', () => {
    expect(() => validateUrl('https://example.com/audio.mp3')).not.toThrow();
  });

  test('rejects HTTP URLs', () => {
    expect(() => validateUrl('http://example.com/audio.mp3')).toThrow(/HTTPS required/);
  });

  test('rejects private IP 10.x', () => {
    expect(() => validateUrl('https://10.0.0.1/audio.mp3')).toThrow(/private/i);
  });

  test('rejects private IP 192.168.x', () => {
    expect(() => validateUrl('https://192.168.1.1/audio.mp3')).toThrow(/private/i);
  });

  test('rejects private IP 172.16-31.x', () => {
    expect(() => validateUrl('https://172.16.0.1/audio.mp3')).toThrow(/private/i);
  });

  test('rejects localhost', () => {
    expect(() => validateUrl('https://127.0.0.1/audio.mp3')).toThrow(/private/i);
    expect(() => validateUrl('https://localhost/audio.mp3')).toThrow(/private/i);
  });

  test('rejects non-URL strings', () => {
    expect(() => validateUrl('not-a-url')).toThrow();
  });
});
```

**Step 2: Implement URL security**

Create `src/lib/audio-prep/urlSecurity.ts`:

```typescript
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const BLOCKED_HOSTNAMES = ['localhost', 'metadata.google.internal'];

export function validateUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`HTTPS required. Got: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Private/blocked hostname: ${hostname}`);
  }

  // Check if hostname looks like an IP
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || hostname.includes(':')) {
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new Error(`Private IP address not allowed: ${hostname}`);
      }
    }
  }

  return parsed;
}
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/urlSecurity.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/urlSecurity.ts src/lib/audio-prep/__tests__/urlSecurity.test.ts
git commit -m "feat(audio-prep): add SSRF protection for URL ingest"
```

---

### Task 7: Recipe Validation

**Files:**
- Create: `src/lib/audio-prep/recipeValidator.ts`
- Test: `src/lib/audio-prep/__tests__/recipeValidator.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/recipeValidator.test.ts`:

```typescript
import { validateRecipe, RecipeValidationError } from '../recipeValidator';
import type { EditRecipe } from '../types';

const validRecipe: EditRecipe = {
  version: 1,
  assetId: '00000000-0000-0000-0000-000000000001',
  clips: [
    {
      id: 'clip-1',
      sourceAssetId: '00000000-0000-0000-0000-000000000001',
      startTime: 0,
      endTime: 10,
      volume: 1,
      fadeIn: 0.5,
      fadeOut: 0.5,
    },
  ],
  normalize: false,
  outputFormat: 'wav',
  outputSampleRate: 44100,
};

const sourceDurations: Record<string, number> = {
  '00000000-0000-0000-0000-000000000001': 60,
};

describe('validateRecipe', () => {
  test('accepts valid recipe', () => {
    expect(() => validateRecipe(validRecipe, sourceDurations)).not.toThrow();
  });

  test('rejects endTime > sourceDuration', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], endTime: 100 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(RecipeValidationError);
  });

  test('rejects startTime >= endTime', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 10, endTime: 5 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(RecipeValidationError);
  });

  test('rejects fadeIn + fadeOut > clip duration', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 0, endTime: 1, fadeIn: 0.8, fadeOut: 0.8 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/fade/i);
  });

  test('rejects clip shorter than 0.1s', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 5, endTime: 5.05 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/minimum/i);
  });

  test('rejects volume out of range', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], volume: 3 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/volume/i);
  });

  test('rejects more than 50 clips', () => {
    const clips = Array.from({ length: 51 }, (_, i) => ({
      ...validRecipe.clips[0],
      id: `clip-${i}`,
      startTime: i,
      endTime: i + 0.5,
    }));
    const recipe = { ...validRecipe, clips };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/maximum/i);
  });

  test('calculates total duration', () => {
    const result = validateRecipe(validRecipe, sourceDurations);
    expect(result.totalDuration).toBe(10);
  });
});
```

**Step 2: Implement recipe validator**

Create `src/lib/audio-prep/recipeValidator.ts`:

```typescript
import type { EditRecipe } from './types';

export class RecipeValidationError extends Error {
  constructor(message: string, public clipId?: string) {
    super(message);
    this.name = 'RecipeValidationError';
  }
}

interface ValidationResult {
  totalDuration: number;
  clipDurations: Record<string, number>;
}

export function validateRecipe(
  recipe: EditRecipe,
  sourceDurations: Record<string, number>
): ValidationResult {
  if (recipe.clips.length > 50) {
    throw new RecipeValidationError('Maximum 50 clips per recipe');
  }

  if (recipe.clips.length === 0) {
    throw new RecipeValidationError('Recipe must have at least 1 clip');
  }

  let totalDuration = 0;
  const clipDurations: Record<string, number> = {};

  for (const clip of recipe.clips) {
    const sourceDuration = sourceDurations[clip.sourceAssetId];
    if (sourceDuration === undefined) {
      throw new RecipeValidationError(
        `Source asset ${clip.sourceAssetId} not found`,
        clip.id
      );
    }

    if (clip.startTime < 0) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: startTime must be >= 0`,
        clip.id
      );
    }

    if (clip.startTime >= clip.endTime) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: startTime must be < endTime`,
        clip.id
      );
    }

    if (clip.endTime > sourceDuration) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: endTime (${clip.endTime}) exceeds source duration (${sourceDuration})`,
        clip.id
      );
    }

    const clipDuration = clip.endTime - clip.startTime;

    if (clipDuration < 0.1) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: minimum clip length is 0.1 seconds`,
        clip.id
      );
    }

    if (clip.fadeIn + clip.fadeOut > clipDuration) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: fadeIn + fadeOut (${clip.fadeIn + clip.fadeOut}s) exceeds clip duration (${clipDuration}s)`,
        clip.id
      );
    }

    if (clip.volume < 0 || clip.volume > 2) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: volume must be 0.0-2.0, got ${clip.volume}`,
        clip.id
      );
    }

    clipDurations[clip.id] = clipDuration;
    totalDuration += clipDuration;
  }

  if (totalDuration > 30 * 60) {
    throw new RecipeValidationError(
      `Total output duration (${(totalDuration / 60).toFixed(1)} min) exceeds 30 minute limit`
    );
  }

  return { totalDuration, clipDurations };
}
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/recipeValidator.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/recipeValidator.ts src/lib/audio-prep/__tests__/recipeValidator.test.ts
git commit -m "feat(audio-prep): add recipe validation with bounds checking"
```

---

### Task 8: FFmpeg Filter Complex Builder

**Files:**
- Create: `src/lib/audio-prep/filterComplexBuilder.ts`
- Test: `src/lib/audio-prep/__tests__/filterComplexBuilder.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/filterComplexBuilder.test.ts`:

```typescript
import { buildFilterComplex } from '../filterComplexBuilder';
import type { EditRecipe } from '../types';

describe('buildFilterComplex', () => {
  test('builds single-clip trim with volume and fades', () => {
    const recipe: EditRecipe = {
      version: 1,
      assetId: 'asset-1',
      clips: [
        {
          id: 'clip-1',
          sourceAssetId: 'asset-1',
          startTime: 5,
          endTime: 15,
          volume: 0.8,
          fadeIn: 1,
          fadeOut: 0.5,
        },
      ],
      normalize: false,
      outputFormat: 'wav',
      outputSampleRate: 44100,
    };

    const result = buildFilterComplex(recipe, { 'asset-1': '/path/to/audio.wav' });

    expect(result.inputs).toContain('/path/to/audio.wav');
    expect(result.filterComplex).toContain('atrim=');
    expect(result.filterComplex).toContain('volume=0.8');
    expect(result.filterComplex).toContain('afade=t=in');
    expect(result.filterComplex).toContain('afade=t=out');
  });

  test('builds multi-clip join with concat', () => {
    const recipe: EditRecipe = {
      version: 1,
      assetId: 'asset-1',
      clips: [
        { id: 'c1', sourceAssetId: 'asset-1', startTime: 0, endTime: 5, volume: 1, fadeIn: 0, fadeOut: 0 },
        { id: 'c2', sourceAssetId: 'asset-1', startTime: 10, endTime: 20, volume: 1, fadeIn: 0, fadeOut: 0 },
      ],
      normalize: false,
      outputFormat: 'wav',
      outputSampleRate: 44100,
    };

    const result = buildFilterComplex(recipe, { 'asset-1': '/path/to/audio.wav' });

    expect(result.filterComplex).toContain('concat=n=2');
  });
});
```

**Step 2: Implement filter complex builder**

Create `src/lib/audio-prep/filterComplexBuilder.ts`:

```typescript
import type { EditRecipe, Clip } from './types';

interface FilterComplexResult {
  inputs: string[];
  filterComplex: string;
  outputLabel: string;
}

export function buildFilterComplex(
  recipe: EditRecipe,
  assetPaths: Record<string, string>
): FilterComplexResult {
  // Deduplicate input files
  const uniqueAssetIds = [...new Set(recipe.clips.map((c) => c.sourceAssetId))];
  const inputIndexMap: Record<string, number> = {};
  const inputs: string[] = [];

  for (const assetId of uniqueAssetIds) {
    const filePath = assetPaths[assetId];
    if (!filePath) throw new Error(`Missing path for asset ${assetId}`);
    inputIndexMap[assetId] = inputs.length;
    inputs.push(filePath);
  }

  const filters: string[] = [];
  const clipOutputLabels: string[] = [];

  for (let i = 0; i < recipe.clips.length; i++) {
    const clip = recipe.clips[i];
    const inputIdx = inputIndexMap[clip.sourceAssetId];
    let currentLabel = `[${inputIdx}:a]`;
    const chainParts: string[] = [];

    // Trim
    chainParts.push(`atrim=start=${clip.startTime}:end=${clip.endTime}`);
    chainParts.push(`asetpts=PTS-STARTPTS`);

    // Volume (skip if default 1.0)
    if (clip.volume !== 1) {
      chainParts.push(`volume=${clip.volume}`);
    }

    // Fade in
    if (clip.fadeIn > 0) {
      chainParts.push(`afade=t=in:d=${clip.fadeIn}`);
    }

    // Fade out
    if (clip.fadeOut > 0) {
      const clipDuration = clip.endTime - clip.startTime;
      const fadeStart = clipDuration - clip.fadeOut;
      chainParts.push(`afade=t=out:st=${fadeStart}:d=${clip.fadeOut}`);
    }

    const outputLabel = `[clip${i}]`;
    clipOutputLabels.push(outputLabel);
    filters.push(`${currentLabel}${chainParts.join(',')}${outputLabel}`);
  }

  let finalOutput: string;

  if (recipe.clips.length === 1) {
    finalOutput = clipOutputLabels[0];
  } else {
    // Concat all clips
    const concatInput = clipOutputLabels.join('');
    const concatLabel = '[joined]';
    filters.push(`${concatInput}concat=n=${recipe.clips.length}:v=0:a=1${concatLabel}`);
    finalOutput = concatLabel;
  }

  // Normalize (1-pass for preview, caller handles 2-pass for save)
  if (recipe.normalize) {
    const normLabel = '[norm]';
    filters.push(`${finalOutput}loudnorm${normLabel}`);
    finalOutput = normLabel;
  }

  // Resample
  const resampleLabel = '[out]';
  filters.push(`${finalOutput}aresample=${recipe.outputSampleRate}${resampleLabel}`);
  finalOutput = resampleLabel;

  return {
    inputs,
    filterComplex: filters.join(';'),
    outputLabel: finalOutput,
  };
}
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/filterComplexBuilder.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/filterComplexBuilder.ts src/lib/audio-prep/__tests__/filterComplexBuilder.test.ts
git commit -m "feat(audio-prep): add FFmpeg filter_complex builder for edit recipes"
```

---

### Task 9: Audio Renderer (Execute Recipes via FFmpeg)

**Files:**
- Create: `src/lib/audio-prep/audioRenderer.ts`
- Test: `src/lib/audio-prep/__tests__/audioRenderer.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/audioRenderer.test.ts`:

```typescript
import { renderRecipe } from '../audioRenderer';
import type { EditRecipe } from '../types';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

describe('renderRecipe', () => {
  const testAudio = path.resolve('audio/SirAnthony.mp3');

  test('renders a trim recipe to WAV file', async () => {
    const outputDir = path.join(os.tmpdir(), `render-test-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'output.wav');

    try {
      const recipe: EditRecipe = {
        version: 1,
        assetId: '00000000-0000-0000-0000-000000000001',
        clips: [
          {
            id: 'clip-1',
            sourceAssetId: '00000000-0000-0000-0000-000000000001',
            startTime: 0,
            endTime: 2,
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
          },
        ],
        normalize: false,
        outputFormat: 'wav',
        outputSampleRate: 44100,
      };

      await renderRecipe(recipe, {
        '00000000-0000-0000-0000-000000000001': testAudio,
      }, outputPath);

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  }, 30000);

  test('renders a preview as low-quality MP3', async () => {
    const outputDir = path.join(os.tmpdir(), `render-test-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'preview.mp3');

    try {
      const recipe: EditRecipe = {
        version: 1,
        assetId: '00000000-0000-0000-0000-000000000001',
        clips: [
          {
            id: 'clip-1',
            sourceAssetId: '00000000-0000-0000-0000-000000000001',
            startTime: 0,
            endTime: 2,
            volume: 1,
            fadeIn: 0.3,
            fadeOut: 0.3,
          },
        ],
        normalize: false,
        outputFormat: 'wav',
        outputSampleRate: 44100,
      };

      await renderRecipe(recipe, {
        '00000000-0000-0000-0000-000000000001': testAudio,
      }, outputPath, { preview: true });

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  }, 30000);
});
```

**Step 2: Implement audio renderer**

Create `src/lib/audio-prep/audioRenderer.ts`:

```typescript
import { spawn } from 'child_process';
import { buildFilterComplex } from './filterComplexBuilder';
import type { EditRecipe } from './types';

interface RenderOptions {
  preview?: boolean;
  twoPassNormalize?: boolean;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function renderRecipe(
  recipe: EditRecipe,
  assetPaths: Record<string, string>,
  outputPath: string,
  options: RenderOptions = {}
): Promise<void> {
  const { preview = false, twoPassNormalize = false, signal } = options;

  const { inputs, filterComplex, outputLabel } = buildFilterComplex(recipe, assetPaths);

  const args: string[] = ['-y']; // Overwrite output

  // Add inputs
  for (const input of inputs) {
    args.push('-i', input);
  }

  // Add filter_complex
  args.push('-filter_complex', filterComplex);

  // Map output
  args.push('-map', outputLabel);

  if (preview) {
    // Low-quality MP3 for preview
    args.push('-codec:a', 'libmp3lame', '-b:a', '128k');
  } else {
    // High-quality output
    if (outputPath.endsWith('.wav')) {
      args.push('-codec:a', 'pcm_s16le');
    } else {
      args.push('-codec:a', 'aac', '-b:a', '384k');
    }
  }

  args.push(outputPath);

  await runFFmpeg(args, signal);

  // 2-pass loudnorm for save (not preview)
  if (twoPassNormalize && recipe.normalize) {
    await twoPassLoudnorm(outputPath, signal);
  }
}

async function twoPassLoudnorm(filePath: string, signal?: AbortSignal): Promise<void> {
  // Pass 1: Measure loudness
  const measureArgs = [
    '-i', filePath,
    '-af', 'loudnorm=print_format=json',
    '-f', 'null',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
  ];

  const measureOutput = await runFFmpeg(measureArgs, signal, true);

  // Parse loudnorm JSON from stderr
  const jsonMatch = measureOutput.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (!jsonMatch) return; // Skip if can't parse

  const stats = JSON.parse(jsonMatch[0]);

  // Pass 2: Apply measured loudness
  const tempPath = filePath.replace(/(\.\w+)$/, '_normalized$1');
  const normalizeArgs = [
    '-y', '-i', filePath,
    '-af', `loudnorm=measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:linear=true`,
    '-codec:a', 'pcm_s16le',
    tempPath,
  ];

  await runFFmpeg(normalizeArgs, signal);

  // Replace original with normalized
  const { promises: fs } = await import('fs');
  await fs.rename(tempPath, filePath);
}

function runFFmpeg(args: string[], signal?: AbortSignal, captureStderr = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    if (signal) {
      signal.addEventListener('abort', () => proc.kill('SIGTERM'), { once: true });
    }

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(captureStderr ? stderr : '');
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to run ffmpeg: ${err.message}`)));
  });
}
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/audioRenderer.test.ts --verbose --testTimeout=30000
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/audioRenderer.ts src/lib/audio-prep/__tests__/audioRenderer.test.ts
git commit -m "feat(audio-prep): add audio renderer with filter_complex execution and 2-pass loudnorm"
```

---

### Task 10: Job Manager (Async Job Tracking)

**Files:**
- Create: `src/lib/audio-prep/JobManager.ts`
- Test: `src/lib/audio-prep/__tests__/JobManager.test.ts`

**Step 1: Write failing test**

Create `src/lib/audio-prep/__tests__/JobManager.test.ts`:

```typescript
import { AudioPrepJobManager } from '../JobManager';

describe('AudioPrepJobManager', () => {
  let manager: AudioPrepJobManager;

  beforeEach(() => {
    manager = new AudioPrepJobManager();
  });

  test('creates and retrieves a job', () => {
    const job = manager.create('ingest', { type: 'youtube', url: 'https://youtube.com' });
    expect(job.jobId).toBeDefined();
    expect(job.status).toBe('pending');

    const retrieved = manager.get(job.jobId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.jobId).toBe(job.jobId);
  });

  test('updates job status and progress', () => {
    const job = manager.create('ingest', {});
    manager.update(job.jobId, { status: 'processing', progress: 50 });

    const updated = manager.get(job.jobId);
    expect(updated!.status).toBe('processing');
    expect(updated!.progress).toBe(50);
  });

  test('completes a job with result', () => {
    const job = manager.create('ingest', {});
    manager.complete(job.jobId, { assetId: 'abc-123' });

    const completed = manager.get(job.jobId);
    expect(completed!.status).toBe('complete');
    expect(completed!.result).toEqual({ assetId: 'abc-123' });
  });

  test('fails a job with error', () => {
    const job = manager.create('ingest', {});
    manager.fail(job.jobId, 'Download timeout');

    const failed = manager.get(job.jobId);
    expect(failed!.status).toBe('failed');
    expect(failed!.error).toBe('Download timeout');
  });

  test('cancels a job', () => {
    const job = manager.create('ingest', {});
    manager.cancel(job.jobId);

    const cancelled = manager.get(job.jobId);
    expect(cancelled!.status).toBe('cancelled');
  });
});
```

**Step 2: Implement JobManager**

Create `src/lib/audio-prep/JobManager.ts`:

```typescript
import { v4 as uuid } from 'uuid';

export interface AudioPrepJob {
  jobId: string;
  type: 'ingest' | 'preview' | 'save';
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  abortController?: AbortController;
  createdAt: string;
  updatedAt: string;
}

export class AudioPrepJobManager {
  private jobs = new Map<string, AudioPrepJob>();

  create(type: AudioPrepJob['type'], metadata: Record<string, unknown>): AudioPrepJob {
    const now = new Date().toISOString();
    const job: AudioPrepJob = {
      jobId: uuid(),
      type,
      status: 'pending',
      progress: 0,
      metadata,
      createdAt: now,
      updatedAt: now,
      abortController: new AbortController(),
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  get(jobId: string): AudioPrepJob | undefined {
    return this.jobs.get(jobId);
  }

  update(jobId: string, updates: Partial<Pick<AudioPrepJob, 'status' | 'progress' | 'result' | 'error'>>): void {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
  }

  complete(jobId: string, result: Record<string, unknown>): void {
    this.update(jobId, { status: 'complete', progress: 100, result });
  }

  fail(jobId: string, error: string): void {
    this.update(jobId, { status: 'failed', error });
  }

  cancel(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job?.abortController) job.abortController.abort();
    this.update(jobId, { status: 'cancelled' });
  }

  list(): AudioPrepJob[] {
    return [...this.jobs.values()];
  }
}

// Singleton instance
export const audioPrepJobs = new AudioPrepJobManager();
```

**Step 3: Run tests**

```bash
npx jest src/lib/audio-prep/__tests__/JobManager.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/lib/audio-prep/JobManager.ts src/lib/audio-prep/__tests__/JobManager.test.ts
git commit -m "feat(audio-prep): add async job manager for ingest/edit operations"
```

---

## Phase 2: API Routes

### Task 11: Ingest API Route

**Files:**
- Create: `src/app/api/audio/ingest/route.ts`
- Create: `src/app/api/audio/ingest/[jobId]/route.ts`

**Step 1: Create ingest POST route**

Create `src/app/api/audio/ingest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audioPrepJobs } from '@/lib/audio-prep/JobManager';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { probeAudio } from '@/lib/audio-prep/ffprobe';
import { generatePeaks } from '@/lib/audio-prep/peaksGenerator';
import { extractYouTubeAudio, validateYouTubeUrl } from '@/lib/audio-prep/ytdlp';
import { validateUrl } from '@/lib/audio-prep/urlSecurity';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const assetService = new AudioAssetService();

const IngestRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('youtube'),
    url: z.string().url(),
    rightsAttested: z.boolean(),
  }),
  z.object({
    type: z.literal('video_file'),
    base64: z.string().min(1),
    filename: z.string().min(1),
  }),
  z.object({
    type: z.literal('audio_file'),
    base64: z.string().min(1),
    filename: z.string().min(1),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = IngestRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const source = parsed.data;
    await assetService.init();
    const job = audioPrepJobs.create('ingest', source);

    // Run ingest async (don't await)
    processIngest(job.jobId, source).catch((err) => {
      audioPrepJobs.fail(job.jobId, err.message);
    });

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

async function processIngest(jobId: string, source: z.infer<typeof IngestRequestSchema>) {
  const job = audioPrepJobs.get(jobId)!;
  audioPrepJobs.update(jobId, { status: 'processing', progress: 10 });

  const tempDir = path.join(os.tmpdir(), `audio-ingest-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    let audioFilePath: string;
    let provenance: Record<string, unknown> = { sourceType: source.type };

    switch (source.type) {
      case 'youtube': {
        if (!validateYouTubeUrl(source.url)) {
          throw new Error('Invalid YouTube URL');
        }
        audioPrepJobs.update(jobId, { progress: 20 });

        const result = await extractYouTubeAudio(source.url, tempDir, {
          onProgress: (p) => audioPrepJobs.update(jobId, { progress: 20 + p * 0.4 }),
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
        // Write base64 to temp, extract audio
        const videoPath = path.join(tempDir, source.filename);
        await fs.writeFile(videoPath, Buffer.from(source.base64, 'base64'));
        audioPrepJobs.update(jobId, { progress: 30 });

        // Extract audio from video
        audioFilePath = path.join(tempDir, 'extracted.wav');
        await extractAudioFromVideo(videoPath, audioFilePath);
        provenance.originalFilename = source.filename;
        break;
      }

      case 'audio_file': {
        audioFilePath = path.join(tempDir, source.filename);
        await fs.writeFile(audioFilePath, Buffer.from(source.base64, 'base64'));
        provenance.originalFilename = source.filename;
        break;
      }

      case 'url': {
        validateUrl(source.url);
        audioPrepJobs.update(jobId, { progress: 20 });

        const response = await fetch(source.url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const contentType = response.headers.get('content-type') ?? '';
        const ext = contentType.includes('wav') ? '.wav' :
                    contentType.includes('mpeg') ? '.mp3' :
                    contentType.includes('ogg') ? '.ogg' : '.audio';

        audioFilePath = path.join(tempDir, `download${ext}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(audioFilePath, buffer);
        provenance.sourceUrl = source.url;
        break;
      }
    }

    audioPrepJobs.update(jobId, { progress: 60 });

    // Probe audio metadata
    const audioMeta = await probeAudio(audioFilePath);
    audioPrepJobs.update(jobId, { progress: 70 });

    // Create asset
    const audioBuffer = await fs.readFile(audioFilePath);
    const filename = path.basename(audioFilePath);
    const asset = await assetService.createAsset(audioBuffer, filename, provenance as any);

    // Update metadata with probed info
    await assetService.updateMetadata(asset.assetId, { audio: audioMeta });
    audioPrepJobs.update(jobId, { progress: 80 });

    // Generate peaks
    const peaks = await generatePeaks(
      path.join(assetService.getAssetDir(asset.assetId), `original${path.extname(filename)}`),
      { zoomLevels: [25, 50, 100, 200] }
    );
    await fs.writeFile(
      path.join(assetService.getAssetDir(asset.assetId), 'peaks.json'),
      JSON.stringify(peaks)
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

async function extractAudioFromVideo(videoPath: string, outputPath: string): Promise<void> {
  const { spawn } = await import('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', videoPath, '-vn', '-ar', '44100', '-ac', '1', '-sample_fmt', 's16', outputPath]);
    let stderr = '';
    proc.stderr.on('data', (c) => { stderr += c; });
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg: ${stderr.slice(-300)}`)));
    proc.on('error', (err) => reject(err));
  });
}
```

**Step 2: Create status polling route**

Create `src/app/api/audio/ingest/[jobId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { audioPrepJobs } from '@/lib/audio-prep/JobManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = audioPrepJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Job ${jobId} not found` } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = audioPrepJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Job ${jobId} not found` } },
      { status: 404 }
    );
  }

  audioPrepJobs.cancel(jobId);

  return NextResponse.json({ success: true, data: { jobId, status: 'cancelled' } });
}
```

**Step 3: Commit**

```bash
git add src/app/api/audio/ingest/route.ts src/app/api/audio/ingest/\[jobId\]/route.ts
git commit -m "feat(audio-prep): add ingest API routes with YouTube/video/URL/file support"
```

---

### Task 12: Edit API Routes (Preview + Save)

**Files:**
- Create: `src/app/api/audio/edit/preview/route.ts`
- Create: `src/app/api/audio/edit/preview/[jobId]/route.ts`
- Create: `src/app/api/audio/edit/save/route.ts`
- Create: `src/app/api/audio/edit/save/[jobId]/route.ts`

These follow the same async job pattern as ingest. See design doc Section 3 for the edit recipe format.

The POST handler validates the recipe with `recipeValidator.ts`, looks up source asset durations, calls `renderRecipe()` from `audioRenderer.ts`, and tracks progress via `JobManager`.

Preview uses `{ preview: true }` (low-quality MP3). Save uses `{ twoPassNormalize: true }` and writes to `audio-assets/{id}/prepared.wav`.

Cache by SHA256 hash of recipe JSON - if hash matches existing output, return immediately.

**Implementation follows the exact same pattern as Task 11's ingest route. Key differences:**
- Request body is an `EditRecipe` (validated by `EditRecipeSchema` from types.ts)
- Processing calls `validateRecipe()` then `renderRecipe()`
- Preview output: `audio-assets/{id}/preview_{hash}.mp3`
- Save output: `audio-assets/{id}/prepared.wav`

**Step 1: Create both routes (code follows ingest pattern)**

**Step 2: Commit**

```bash
git add src/app/api/audio/edit/
git commit -m "feat(audio-prep): add edit preview and save API routes with recipe caching"
```

---

### Task 13: Assets API Routes (List, Get, Delete)

**Files:**
- Create: `src/app/api/audio/assets/route.ts`
- Create: `src/app/api/audio/assets/[id]/route.ts`

**Step 1: Create list/get/delete routes**

`GET /api/audio/assets` - calls `assetService.listAssets()`
`GET /api/audio/assets/[id]` - calls `assetService.getAsset(id)`, includes peaks URL
`DELETE /api/audio/assets/[id]` - reference-aware delete via `assetService.deleteAsset(id)`

Follows the same response format pattern as existing render API routes.

**Step 2: Commit**

```bash
git add src/app/api/audio/assets/
git commit -m "feat(audio-prep): add asset CRUD API routes"
```

---

## Phase 3: Render Integration

### Task 14: Update AudioInput Schema

**Files:**
- Modify: `src/lib/render/schema/types.ts` (lines 501-517)

**Step 1: Add 'asset' type to AudioInputSchema**

In `src/lib/render/schema/types.ts`, add to the `AudioInputSchema` discriminated union:

```typescript
z.object({
  type: z.literal('asset'),
  assetId: z.string().uuid(),
}),
```

**Step 2: Update render route to resolve asset**

In `src/app/api/render/route.ts`, add a case in the audio input switch:

```typescript
case 'asset': {
  const assetService = new AudioAssetService();
  const resolvedPath = await assetService.resolveAssetPath(input.audio.assetId);
  audioPath = resolvedPath;
  audioName = `asset-${input.audio.assetId}`;
  break;
}
```

**Step 3: Update local render route**

In `src/app/api/render/local/route.ts`, accept `assetId` alongside `audioBase64`:

```typescript
const { audioBase64, audioFilename, assetId, format, fps, visualConfig } = body;

if (assetId) {
  const assetService = new AudioAssetService();
  const audioPath = await assetService.resolveAssetPath(assetId);
  // Pass resolved path to startLocalRender
} else if (audioBase64) {
  // Existing base64 handling
}
```

**Step 4: Run existing tests to verify backward compatibility**

```bash
npx jest --verbose
```

**Step 5: Commit**

```bash
git add src/lib/render/schema/types.ts src/app/api/render/route.ts src/app/api/render/local/route.ts
git commit -m "feat(audio-prep): add type:'asset' to unified render contract"
```

---

### Task 15: Update audioStore and ControlPanel

**Files:**
- Modify: `src/lib/stores/audioStore.ts`
- Modify: `src/components/ui/ControlPanel.tsx` (lines 41-42, 250-287)

**Step 1: Add preparedAssetId to audioStore**

In `audioStore.ts`, add to the interface:

```typescript
preparedAssetId: string | null;
setPreparedAssetId: (id: string | null) => void;
```

Add to default state: `preparedAssetId: null`
Add action: `setPreparedAssetId: (id) => set({ preparedAssetId: id })`

**Step 2: Update ControlPanel render button**

In `ControlPanel.tsx` line 42, add:
```typescript
const preparedAssetId = useAudioStore((state) => state.preparedAssetId);
```

At line 250, change `disabled={!audioFile}` to:
```typescript
disabled={!audioFile && !preparedAssetId}
```

Update conditional styling and help text similarly.

**Step 3: Update RenderDialog**

In `RenderDialog.tsx`, modify `handleSubmit` (line 337-357) and `handleLocalRender` (line 221-231) to check `preparedAssetId` first and send `{ type: 'asset', assetId }` when available.

**Step 4: Commit**

```bash
git add src/lib/stores/audioStore.ts src/components/ui/ControlPanel.tsx src/components/ui/RenderDialog.tsx
git commit -m "feat(audio-prep): wire render flow to accept prepared asset ID"
```

---

## Phase 4: WaveSurfer Editor UI

### Task 16: Create audioPrepStore (Zustand)

**Files:**
- Create: `src/lib/stores/audioPrepStore.ts`

See design doc Section 4 for the full interface. Implements clips array, selected clip, normalize toggle, fade defaults, job tracking, and unsaved changes detection.

**Step 1: Implement store**

**Step 2: Commit**

```bash
git add src/lib/stores/audioPrepStore.ts
git commit -m "feat(audio-prep): add audioPrepStore for editor state management"
```

---

### Task 17: AudioPrepEditor Shell Component

**Files:**
- Create: `src/components/ui/AudioPrepEditor.tsx`

**Step 1: Create the shell**

Build the overall layout matching the wireframe in design doc Section 4:
- Import section (file upload, URL input, YouTube URL, rights attestation checkbox)
- WaveSurfer waveform container (empty initially, populated when asset loaded)
- Playback controls (play/pause, current time, zoom)
- Clip list (renders `clips` from `audioPrepStore`)
- Global controls (fade in/out sliders, normalize checkbox)
- Action buttons (Preview, Save as Render Audio)
- Total duration display, unsaved changes indicator

Uses Tailwind CSS for styling, matching existing component patterns in the project.

**Step 2: Add "Open Audio Prep" button to AudioControls**

In `src/components/ui/AudioControls.tsx`, add a button that opens the AudioPrepEditor dialog.

**Step 3: Commit**

```bash
git add src/components/ui/AudioPrepEditor.tsx src/components/ui/AudioControls.tsx
git commit -m "feat(audio-prep): add AudioPrepEditor shell with import and clip list UI"
```

---

### Task 18: WaveSurfer Waveform Integration

**Files:**
- Modify: `src/components/ui/AudioPrepEditor.tsx`

**Step 1: Initialize WaveSurfer**

```typescript
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

// In component:
const waveformRef = useRef<HTMLDivElement>(null);
const wsRef = useRef<WaveSurfer | null>(null);

useEffect(() => {
  if (!waveformRef.current || !activeAsset) return;

  const ws = WaveSurfer.create({
    container: waveformRef.current,
    waveColor: '#4a9eff',
    progressColor: '#1e3a5f',
    cursorColor: '#ffffff',
    barWidth: 2,
    barGap: 1,
    height: 128,
    peaks: activeAsset.peaks, // Precomputed from server
    duration: activeAsset.audio.duration,
  });

  const regions = ws.registerPlugin(RegionsPlugin.create());
  wsRef.current = ws;

  return () => ws.destroy();
}, [activeAsset]);
```

**Step 2: Wire regions to clip list**

- When user drags on waveform, create a region → add clip to store
- When clip is modified in list, update region on waveform
- Bidirectional sync between WaveSurfer regions and `audioPrepStore.clips`

**Step 3: Add keyboard shortcuts**

- Space: play/pause
- S: split at playhead
- Delete: remove selected clip
- Ctrl+Z: undo last recipe change

**Step 4: Commit**

```bash
git add src/components/ui/AudioPrepEditor.tsx
git commit -m "feat(audio-prep): integrate WaveSurfer with regions and keyboard shortcuts"
```

---

### Task 19: Clip List with Drag Reorder

**Files:**
- Modify: `src/components/ui/AudioPrepEditor.tsx`

**Step 1: Implement drag-and-drop reorder**

Use HTML5 drag API (no extra dependency needed):
- Each clip row has a drag handle
- `onDragStart`, `onDragOver`, `onDrop` to reorder `clips` array in store
- Per-clip controls: volume slider, split button, delete button
- Visual feedback for drag target

**Step 2: Commit**

```bash
git add src/components/ui/AudioPrepEditor.tsx
git commit -m "feat(audio-prep): add clip list with drag reorder and per-clip controls"
```

---

### Task 20: Preview & Save Buttons with Job Polling

**Files:**
- Modify: `src/components/ui/AudioPrepEditor.tsx`

**Step 1: Implement preview**

- Click Preview → build recipe from store → POST `/api/audio/edit/preview`
- Poll status → when complete, play MP3 in browser via Audio element
- Show progress bar during rendering
- "Latest job wins" - if user clicks preview again, cancel previous job

**Step 2: Implement save**

- Click "Save as Render Audio" → POST `/api/audio/edit/save`
- Poll status → when complete, set `preparedAssetId` in audioStore
- Show success state with duration of prepared audio
- Enable render button in ControlPanel

**Step 3: Commit**

```bash
git add src/components/ui/AudioPrepEditor.tsx
git commit -m "feat(audio-prep): add preview playback and save-as-render-audio with job polling"
```

---

## Phase 5: QA & Polish

### Task 21: QA Test Matrix

**Test combinations:**

| Audio Length | Format | Operations | Expected |
|-------------|--------|------------|----------|
| 30s | MP3 | Trim 10-20s | 10s output |
| 60s | WAV | Trim + normalize | Normalized output |
| 61s | M4A | Split at 30s, join both | 61s output |
| 5min | MP3 | Trim to 30s, fade in/out | 30s with fades |
| YouTube (short) | auto | Full video → trim | Trimmed clip |

**Render verification:**
- Render with `preparedAssetId` when `audioFile` is null → succeeds
- Render with `audioFile` (legacy upload) → still works
- Both local and cloud render accept `type: "asset"`

**Edge cases:**
- Cancel in-progress ingest job
- Network failure during YouTube download
- Invalid YouTube URL (playlist, private without cookies)
- Recipe with 0 clips → rejected
- Fade longer than clip → rejected

---

## File Summary

### New Files Created
```
src/lib/audio-prep/
├── types.ts                    (Task 2)
├── AudioAssetService.ts        (Task 2)
├── ffprobe.ts                  (Task 3)
├── peaksGenerator.ts           (Task 4)
├── ytdlp.ts                    (Task 5)
├── urlSecurity.ts              (Task 6)
├── recipeValidator.ts          (Task 7)
├── filterComplexBuilder.ts     (Task 8)
├── audioRenderer.ts            (Task 9)
├── JobManager.ts               (Task 10)
└── __tests__/
    ├── AudioAssetService.test.ts
    ├── ffprobe.test.ts
    ├── peaksGenerator.test.ts
    ├── ytdlp.test.ts
    ├── urlSecurity.test.ts
    ├── recipeValidator.test.ts
    ├── filterComplexBuilder.test.ts
    ├── audioRenderer.test.ts
    └── JobManager.test.ts

src/app/api/audio/
├── ingest/
│   ├── route.ts                (Task 11)
│   └── [jobId]/route.ts        (Task 11)
├── edit/
│   ├── preview/
│   │   ├── route.ts            (Task 12)
│   │   └── [jobId]/route.ts    (Task 12)
│   └── save/
│       ├── route.ts            (Task 12)
│       └── [jobId]/route.ts    (Task 12)
└── assets/
    ├── route.ts                (Task 13)
    └── [id]/route.ts           (Task 13)

src/lib/stores/audioPrepStore.ts  (Task 16)
src/components/ui/AudioPrepEditor.tsx (Tasks 17-20)
```

### Modified Files
```
package.json                           (Task 1: add wavesurfer.js)
.gitignore                             (Task 1: add audio-assets/)
src/lib/render/schema/types.ts         (Task 14: add 'asset' to AudioInputSchema)
src/app/api/render/route.ts            (Task 14: handle type:'asset')
src/app/api/render/local/route.ts      (Task 14: handle assetId)
src/lib/stores/audioStore.ts           (Task 15: add preparedAssetId)
src/components/ui/ControlPanel.tsx     (Task 15: enable render for prepared assets)
src/components/ui/RenderDialog.tsx     (Task 15: send type:'asset' when available)
src/components/ui/AudioControls.tsx    (Task 17: add "Open Audio Prep" button)
```

### System Dependencies Required
- `ffmpeg` (already present)
- `ffprobe` (bundled with ffmpeg)
- `yt-dlp` (must be installed: `pip install yt-dlp` or download binary)
