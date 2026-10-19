import fs from 'fs';
import path from 'path';

const files = new Map<string, Buffer>();
let failPut = false;
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { if (failPut) throw new Error('down'); files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (p: string) => [...files.keys()].filter((k) => k.startsWith(p)),
  }),
}));

import { NextRequest } from 'next/server';
import { EPISODES, LANDING_PATHS, DEFAULT_LANDING } from '../episodes';
import { recordClick, summarizeClicks } from '../clicks';
import { buildEpisodeLinkKit, renderKitMarkdown } from '../kit';
import { nameProblems } from '@/lib/creator/shorts/captions';
import { GET as clickRoute } from '@/app/e/[slug]/route';
import { GET as summaryRoute } from '@/app/api/episode-links/summary/route';

const storage = () => (require('@/lib/storage') as { getStorageAdapter: () => any }).getStorageAdapter();
const hit = (slug: string, qs = '', ua = 'Mozilla/5.0') =>
  clickRoute(new NextRequest(`https://www.whatamiappreciatingnow.com/e/${slug}${qs}`, { headers: { 'user-agent': ua } }), { params: Promise.resolve({ slug }) });

beforeEach(() => {
  files.clear();
  failPut = false;
  process.env.WAIA_OPERATOR_SECRET = 'operator-secret-1234';
});

describe('registry', () => {
  it('matches the ten launch episodes with unique slugs and real parents', () => {
    expect(EPISODES).toHaveLength(10);
    expect(new Set(EPISODES.map((e) => e.slug)).size).toBe(10);
    for (const e of EPISODES) {
      if (e.format === 'long') expect(e.parent).toBeUndefined();
      else expect(EPISODES.find((p) => p.slug === e.parent)?.format).toBe('long');
    }
  });
});

describe('click route', () => {
  it('counts a click and redirects to the fixed landing path', async () => {
    const res = await hit('ep01', '?s=description');
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe(DEFAULT_LANDING);
    expect(res.headers.get('set-cookie')).toBeNull();
    const s = await summarizeClicks(storage(), ['ep01']);
    expect(s.total).toBe(1);
    expect(s.episodes[0].surfaces.description).toBe(1);
  });

  it('404s an unknown slug and never redirects anywhere else', async () => {
    expect((await hit('evil')).status).toBe(404);
    const res = await hit('ep02', '?s=https://evil.example&to=https://evil.example');
    expect(new URL(res.headers.get('location')!).host).toBe('www.whatamiappreciatingnow.com');
    expect(LANDING_PATHS).toContain(DEFAULT_LANDING);
    const s = await summarizeClicks(storage(), ['ep02']);
    expect(s.total).toBe(1);
    expect(Object.values(s.episodes[0].surfaces).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('skips bots and still redirects when storage fails', async () => {
    await hit('ep01', '', 'Googlebot/2.1');
    expect((await summarizeClicks(storage(), ['ep01'])).total).toBe(0);
    failPut = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hit('ep01')).status).toBe(302);
    warn.mockRestore();
  });

  it('stores no address, agent or id', async () => {
    const req = new NextRequest('https://www.whatamiappreciatingnow.com/e/ep01', { headers: { 'user-agent': 'Mozilla/5.0 SecretAgent', 'x-forwarded-for': '203.0.113.9' } });
    await clickRoute(req, { params: Promise.resolve({ slug: 'ep01' }) });
    const stored = [...files.values()].map(String).join('');
    expect(stored).not.toMatch(/203\.0\.113|SecretAgent/);
    expect(Object.keys(JSON.parse(stored))).toEqual(['slug', 'day', 'total', 'surfaces']);
  });
});

describe('summary', () => {
  it('windows by day, sums surfaces and ranks highest first', async () => {
    const now = new Date('2026-10-20T12:00:00Z');
    await recordClick(storage(), 'ep04', 'endscreen', new Date('2026-10-10T00:00:00Z'));
    await recordClick(storage(), 'ep01', 'short', new Date('2026-10-19T09:00:00Z'));
    await recordClick(storage(), 'ep01', 'description', new Date('2026-10-20T09:00:00Z'));
    await recordClick(storage(), 'ep01', null, new Date('2026-10-20T10:00:00Z'));
    const s = await summarizeClicks(storage(), EPISODES.map((e) => e.slug), 7, now);
    expect(s).toMatchObject({ windowStart: '2026-10-14', windowEnd: '2026-10-20', total: 3 });
    expect(s.episodes[0]).toMatchObject({ slug: 'ep01', total: 3, byDay: { '2026-10-19': 1, '2026-10-20': 2 } });
    expect(s.episodes.find((e) => e.slug === 'ep04')?.total).toBe(0);
  });

  it('is operator-only', async () => {
    const url = 'https://www.whatamiappreciatingnow.com/api/episode-links/summary';
    expect((await summaryRoute(new NextRequest(url))).status).toBe(401);
    const ok = await summaryRoute(new NextRequest(url, { headers: { authorization: 'Bearer operator-secret-1234' } }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).episodes).toHaveLength(10);
  });
});

describe('link kit', () => {
  const kit = buildEpisodeLinkKit();
  it('writes the whole name, no bait, one tagged link per episode', () => {
    for (const r of kit) {
      expect(nameProblems(r.descriptionLine + r.endScreenText)).toEqual([]);
      expect(r.descriptionLine).not.toMatch(/subscribe|like|comment|follow|smash|bell/i);
      expect(r.link).toMatch(new RegExp(`/e/${r.slug}\\?s=(description|short|reel)$`));
      expect(Boolean(r.endScreenLink)).toBe(r.format === 'long');
    }
  });

  it('keeps docs/episode-links/KIT.md in step with the registry', () => {
    const file = path.join(process.cwd(), 'docs/episode-links/KIT.md');
    if (process.env.UPDATE_EPISODE_KIT) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, renderKitMarkdown());
    }
    expect(fs.readFileSync(file, 'utf8')).toBe(renderKitMarkdown());
  });
});
