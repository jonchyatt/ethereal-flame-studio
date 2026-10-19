import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';
import { scoreFrame, type RgbFrame } from '../score';
import { soulProblems, titleSoulProblems } from '../soul';
import { buildThumbnailOptions, pickDistinct, type ScoredFrame } from '../options';

function solid(r: number, g: number, b: number, w = 32, h = 18): RgbFrame {
  const data = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { data[i * 3] = r; data[i * 3 + 1] = g; data[i * 3 + 2] = b; }
  return { width: w, height: h, data };
}
/** Dark field with a warm glow in the middle of the frame. */
function glow(w = 32, h = 18): RgbFrame {
  const f = solid(8, 6, 20, w, h);
  for (let y = 5; y < 13; y++) for (let x = 11; x < 21; x++) { const i = (y * w + x) * 3; f.data[i] = 255; f.data[i + 1] = 170; f.data[i + 2] = 60; }
  return f;
}

describe('scoreFrame', () => {
  it('rejects black, blown-out and flat frames', () => {
    expect(scoreFrame(solid(0, 0, 0)).rejected).toMatch(/black/);
    expect(scoreFrame(solid(255, 255, 255)).rejected).toMatch(/blown/);
    expect(scoreFrame(solid(90, 90, 90)).rejected).toMatch(/flat/);
  });
  it('scores a centred glow on dark above an off-centre one', () => {
    const centred = scoreFrame(glow());
    const off = glow();
    off.data.fill(0);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) { const i = (y * 32 + x) * 3; off.data[i] = 255; off.data[i + 1] = 170; off.data[i + 2] = 60; }
    expect(centred.rejected).toBeNull();
    expect(centred.score).toBeGreaterThan(scoreFrame(off).score);
    expect(centred.subjectShare).toBeGreaterThan(0.8);
  });
  it('throws on mismatched data', () => {
    expect(() => scoreFrame({ width: 4, height: 4, data: new Uint8Array(3) })).toThrow();
  });
});

describe('soul checks (HB-8)', () => {
  it('passes plain, calm titles', () => {
    expect(titleSoulProblems("Above Life's Turmoil | What Am I Appreciating Now")).toEqual([]);
    expect(soulProblems('A Quiet Hour of Appreciation')).toEqual([]);
  });
  it.each([
    ['My morning vlog', 'vlog framing'],
    ["I found peace", 'first-person narration'],
    ["You won't believe this", 'clickbait wording'],
    ['Like and subscribe', 'engagement bait'],
    ['Calm down!', 'shouting punctuation'],
    ['Total crit fail', 'Crit Fail tone'],
    ['This cures anxiety', 'outcome or health claim'],
    ['Top 10 meditations', 'listicle or superlative bait'],
    ['PEACE AND CALM AND JOY', 'shouting in capitals'],
    ['WAIA mix', 'slug WAIA'],
  ])('flags %s', (text, why) => {
    expect(soulProblems(text).join(' ')).toContain(why);
  });
});

describe('pickDistinct', () => {
  const mk = (t: number, score: number, rejected: string | null = null): ScoredFrame => ({ timestampSec: t, frame: { score, rejected, meanLuma: 0, contrast: 0, colorfulness: 0, subjectShare: 0, reason: '' } });
  it('skips rejected frames and near-duplicates, returned in time order', () => {
    const got = pickDistinct([mk(1, 0.9), mk(2, 0.8), mk(10, 0.7), mk(20, 0.6), mk(30, 1, 'near-black frame')], 3, 5);
    expect(got.map((g) => g.timestampSec)).toEqual([1, 10, 20]);
  });
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
(hasFfmpeg ? describe : describe.skip)('buildThumbnailOptions with real ffmpeg', () => {
  it('skips the black intro, writes stills, a sheet and options.json, and picks nothing', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'thumb-'));
    const video = path.join(dir, 'in.mp4');
    const made = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=s=320x180:rate=15:end_scale=0.05,hue=h=t*20,format=yuv420p,fade=t=in:st=0:d=6:color=black', '-t', '30', video]);
    expect(made.status).toBe(0);
    const r = await buildThumbnailOptions({ videoPath: video, outDir: path.join(dir, 'out'), title: 'Above Life\'s Turmoil', samples: 12 });
    expect(r.options.length).toBeGreaterThanOrEqual(2);
    expect(r.options.every((o) => o.timestampSec > 2)).toBe(true);
    for (const o of r.options) expect(existsSync(path.join(r.outDir, o.file))).toBe(true);
    expect(existsSync(path.join(r.outDir, 'contact-sheet.png'))).toBe(true);
    expect(r.plan.selectedTimestampSec).toBeNull();
    const json = JSON.parse(readFileSync(path.join(r.outDir, 'options.json'), 'utf8'));
    expect(json.status).toMatch(/Jonathan picks/);
    expect(r.titleProblems).toEqual([]);
  }, 60000);
});
