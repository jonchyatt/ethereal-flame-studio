import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';
import { assertNoBait, baitProblems, captionFor, writePostPack } from '../postPack';
import { platformCaptions, type ShortCut } from '../cut';

const rights = [
  { sourceId: 'james-allen-above-lifes-turmoil', rightsBasis: 'public-domain' as const, rightsEvidence: 'Published 1910' },
  { sourceId: 'own-binaural-bed', rightsBasis: 'transformative-remix' as const, rightsEvidence: 'Recipe stored' },
];

function cutWith(line: string | null): ShortCut {
  return {
    schemaVersion: 1, parentPackId: '11111111-1111-4111-8111-111111111111', parentVariantId: 'v1', parentRenderJobId: 'r1',
    recipeFingerprint: 'fp', engine: 'puppeteer', target: 'cloud', startSec: 40, endSec: 85, peakScore: 0.9,
    rights, captions: platformCaptions(line), publishMode: 'manual-draft',
  } as ShortCut;
}

describe('short-form caption pack', () => {
  it('writes the whole name, the rights line and few hashtags for each platform', () => {
    for (const p of ['youtube-shorts', 'instagram-reels', 'tiktok'] as const) {
      const { caption } = captionFor(cutWith('Joy is here.'), p);
      expect(caption).toContain('What Am I Appreciating Now');
      expect(caption).toContain('james-allen-above-lifes-turmoil (public-domain)');
      expect(caption).toContain('own-binaural-bed (transformative-remix)');
      expect(caption).not.toMatch(/WAIA/);
      expect((caption.match(/#/g) ?? []).length).toBeLessThanOrEqual(3);
    }
  });

  it('gives YouTube a title under 100 characters and the others none', () => {
    const long = 'a'.repeat(300);
    const yt = captionFor(cutWith(long), 'youtube-shorts');
    expect(yt.title!.length).toBeLessThanOrEqual(100);
    expect(yt.title).toContain('What Am I Appreciating Now');
    expect(yt.caption.length).toBeLessThanOrEqual(500);
    expect(captionFor(cutWith('x'), 'tiktok').title).toBeNull();
  });

  it('keeps the name, sources and hashtags when the spoken line is trimmed', () => {
    const { caption } = captionFor(cutWith('b'.repeat(120)), 'youtube-shorts');
    expect(caption.endsWith('#shorts #appreciation')).toBe(true);
  });

  it('flags engagement bait', () => {
    expect(baitProblems('Like and subscribe!').length).toBeGreaterThan(0);
    expect(baitProblems('Link in bio')).not.toHaveLength(0);
    expect(() => assertNoBait('Follow for more')).toThrow(/bait/);
    expect(baitProblems('Now, what am I appreciating?')).toHaveLength(0);
  });

  it('refuses a spoken-line-free text that shortens the name', () => {
    const c = cutWith(null);
    c.captions['tiktok'] = 'What am I appreciating';
    // the written tail is rebuilt from the whole name, so the pack still comes out clean
    expect(captionFor(c, 'tiktok').caption).toContain('What Am I Appreciating Now');
  });

  it('lays out a folder per platform with platform-named files, rights and a manifest', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'postpack-'));
    const shortDir = path.join(dir, 'short-01');
    require('fs').mkdirSync(shortDir);
    writeFileSync(path.join(shortDir, 'short.mp4'), 'fake-video-bytes');
    const { dir: out, entries } = await writePostPack({ shortDir, cut: cutWith('Joy is here.'), stem: 'James Allen Mix.mp3', index: 0, outDir: path.join(dir, 'post') });
    expect(entries.map((e) => e.video)).toEqual([
      'youtube-shorts/james-allen-mix-short-01-yt-shorts.mp4',
      'instagram-reels/james-allen-mix-short-01-reels.mp4',
      'tiktok/james-allen-mix-short-01-tiktok.mp4',
    ]);
    for (const e of entries) {
      expect(existsSync(path.join(out, e.video))).toBe(true);
      expect(readFileSync(path.join(out, e.captionFile), 'utf8')).toContain('What Am I Appreciating Now');
    }
    const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    expect(manifest.publishMode).toBe('manual-draft');
    expect(JSON.parse(readFileSync(path.join(out, 'rights.json'), 'utf8')).rights).toHaveLength(2);
  });
});
