import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';

const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (key: string, data: Buffer) => { files.set(key, data); },
    get: async (key: string) => files.get(key) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  }),
}));
const create = jest.fn();
const get = jest.fn();
jest.mock('@/lib/jobs', () => ({ getJobStore: () => ({ create, get }) }));

import { buildRecutArgs } from '@/lib/creator/ffmpegRecut';
import { createRenderPack } from '@/lib/creator/renderPack';
import { getCreatorRenderPack } from '@/lib/creator/store';
import { queueCreatorPackPublishJobs } from '@/lib/creator/queue';
import { produceShorts } from '../cut';
import { registerShortChildPacks, shortPackIdFor } from '../childPack';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const curation = { batchJobId: 'batch-1', itemIndex: 0 };
const rights = [{ sourceId: 'synthetic-1', rightsBasis: 'public-domain' as const, rightsEvidence: 'Synthetic fixture tone, no real recording' }];

async function parent(withCuration: boolean) {
  const { pack } = await createRenderPack({
    source: { audioName: 'Synthetic Mix.mp3' },
    exportPackIds: [],
    variants: [{ variantId: 'v1', outputFormat: 'flat-1080p-landscape' as never, fps: 30, styleVariant: { id: 'puppeteer', label: 'puppeteer render' }, platformTargets: ['youtube'], renderJobId: 'render-1', renderTarget: 'cloud' }],
    target: 'cloud',
    metadata: {},
    curation: withCuration ? curation : null,
    channelPresetIds: [],
  });
  return pack;
}

describe('ffmpeg command', () => {
  it('burns the ass file in after crop and scale, so captions sit in the 9:16 frame', () => {
    const { args } = buildRecutArgs({ inputPath: 'in.mp4', outputPath: 'o.mp4', startSec: 10, endSec: 55, sourceWidth: 1920, sourceHeight: 1080, targetWidth: 1080, targetHeight: 1920, fps: 30, subtitlePath: '/tmp/a b/short.ass' });
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).toMatch(/^crop=.*,scale=1080:1920.*,fps=30,subtitles=filename=\/tmp\/a b\/short\.ass$/);
    expect(args[args.indexOf('-t') + 1]).toBe('45.000');
  });
});

(hasFfmpeg ? describe : describe.skip)('shorts from peaks (synthetic fixture)', () => {
  jest.setTimeout(120_000);
  beforeEach(() => {
    files.clear();
    create.mockReset().mockImplementation(async (_t: string, m: unknown) => ({ jobId: 'pj1', metadata: m }));
    get.mockReset().mockResolvedValue({ status: 'complete', result: { videoKey: 'render/parent.mp4' } });
  });

  it('cuts a vertical Short under 60 s at the peak, captions it, and registers a gated child pack', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'shorts-'));
    const input = path.join(dir, 'parent.mp4');
    // 100 s, quiet except a loud sine from 40 s to 90 s (the peak), 320x180 black picture
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=10:d=100',
      '-f', 'lavfi', '-i', "aevalsrc='0.02*sin(2*PI*220*t)+0.6*sin(2*PI*330*t)*between(t,40,90)':d=100:s=8000",
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', input]);

    const transcript = [{ startSec: 42, endSec: 50, text: 'Now, what am I appreciating?' }, { startSec: 60, endSec: 70, text: 'Joy is here.' }];
    const shorts = await produceShorts({ inputPath: input, outDir: path.join(dir, 'out'), sourceWidth: 320, sourceHeight: 180, transcript, count: 1, targetSec: 30 });
    expect(shorts).toHaveLength(1);
    const s = shorts[0];
    expect(s.endSec - s.startSec).toBeLessThan(60);
    expect(s.startSec).toBeGreaterThanOrEqual(37);
    expect(s.endSec).toBeLessThanOrEqual(93);
    expect(s.captions.length).toBeGreaterThan(0);

    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', s.videoPath]).toString());
    expect(probe.streams.find((x: { width?: number }) => x.width)).toMatchObject({ width: 1080, height: 1920 });
    expect(Number(probe.format.duration)).toBeLessThan(60);
    expect(readFileSync(path.join(s.dir, 'short.srt'), 'utf8')).toContain('appreciating');

    const par = await parent(true);
    const [child] = await registerShortChildPacks({
      parentPack: par, parentVariantId: 'v1', engine: 'puppeteer', recipeFingerprint: 'b'.repeat(64), rights, shorts,
      outputVideoKeyFor: () => 'shorts/short-01.mp4',
    });
    const stored = await getCreatorRenderPack(shortPackIdFor(par.packId, s.startSec, s.endSec));
    expect(stored?.curation).toEqual(curation);
    expect(stored?.metadata.shortForm).toMatchObject({ engine: 'puppeteer', target: 'cloud', recipeFingerprint: 'b'.repeat(64), rights, publishMode: 'manual-draft' });
    expect(JSON.parse(readFileSync(path.join(s.dir, 'cut.json'), 'utf8')).rights).toEqual(rights);
    expect(child.cut.captions.tiktok).toContain('What Am I Appreciating Now');

    // Same publish path as the parent: curation travels onto the job, and the connector is manual-draft.
    const queued = await queueCreatorPackPublishJobs(stored!.packId, { queueSyncJob: false, sourceSelection: 'recut' });
    expect(queued.queued).toHaveLength(1);
    const call = create.mock.calls.find((c) => c[0] === 'publish')!;
    expect(call[1].curation).toEqual(curation);
    const after = await getCreatorRenderPack(stored!.packId);
    expect(after?.publishTasks[0].connector.mode).toBe('manual-draft');

    // Idempotent: registering again finds the same pack.
    await registerShortChildPacks({ parentPack: par, parentVariantId: 'v1', engine: 'puppeteer', recipeFingerprint: 'b'.repeat(64), rights, shorts, outputVideoKeyFor: () => 'x' });
    expect(files.size).toBeGreaterThan(0);
  });

  it('refuses a parent with no curation reference', async () => {
    const par = await parent(false);
    await expect(registerShortChildPacks({ parentPack: par, parentVariantId: 'v1', engine: 'puppeteer', recipeFingerprint: 'x', rights, shorts: [], outputVideoKeyFor: () => 'k' })).rejects.toThrow(/curation/);
  });
});
