const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (p: string) => [...files.keys()].filter((k) => k.startsWith(p)),
  }),
}));

import { NextRequest } from 'next/server';
import { parseEvent, recordEvent, shouldCount } from '../model';
import { CONFIDENCE_VIEWS, interestBySlug, saveWeeklySummary, summarizeWeek, weekDays } from '../summary';
import { POST as beacon } from '@/app/api/counters/route';
import { GET as summaryRoute } from '@/app/api/counters/summary/route';
import { getStorageAdapter } from '@/lib/storage';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130';
const post = (body: unknown, headers: Record<string, string> = {}) =>
  beacon(new NextRequest('http://x/api/counters', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'user-agent': UA, 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
  }));

beforeEach(() => { files.clear(); process.env.WAIA_OPERATOR_SECRET = 'operator-secret-1234'; });

describe('parseEvent', () => {
  it('accepts only the allowlist', () => {
    expect(parseEvent({ kind: 'view', page: 'store' })).toEqual({ ok: true, event: { kind: 'view', page: 'store', slug: undefined } });
    expect(parseEvent({ kind: 'notify', page: 'merch', slug: 'infinity-tee' }).ok).toBe(true);
    for (const bad of [null, 'x', { kind: 'click', page: 'store' }, { kind: 'view', page: 'admin' },
      { kind: 'view', page: 'program', slug: 'A B' }, { kind: 'view', page: 'program', slug: '../x' },
      { kind: 'view', page: 'program', slug: 5 }, { kind: 'notify', page: 'merch' }]) {
      expect(parseEvent(bad).ok).toBe(false);
    }
  });
});

describe('privacy', () => {
  it('skips Do Not Track, Global Privacy Control, crawlers and missing agents', () => {
    expect(shouldCount(new Headers({ 'user-agent': UA }))).toBe(true);
    expect(shouldCount(new Headers({ 'user-agent': UA, dnt: '1' }))).toBe(false);
    expect(shouldCount(new Headers({ 'user-agent': UA, 'sec-gpc': '1' }))).toBe(false);
    expect(shouldCount(new Headers({ 'user-agent': 'Googlebot/2.1' }))).toBe(false);
    expect(shouldCount(new Headers())).toBe(false);
  });

  it('stores no address, agent or id, and the response sets no cookie', async () => {
    const res = await post({ kind: 'view', page: 'program', slug: 'yale-inversion-protocol' }, { 'x-forwarded-for': '203.0.113.77' });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toBeNull();
    const dump = JSON.stringify([...files.entries()].map(([k, v]) => [k, String(v)]));
    expect(dump).not.toContain('203.0.113.77');
    expect(dump).not.toContain('Mozilla');
    expect(files.size).toBe(1);
  });

  it('answers 204 and stores nothing for opted-out, bad or free-text events', async () => {
    expect((await post({ kind: 'view', page: 'store' }, { dnt: '1' })).status).toBe(204);
    expect((await post({ kind: 'view', page: 'store', slug: 'a@b.com' })).status).toBe(204);
    expect((await post('garbage')).status).toBe(204);
    expect(files.size).toBe(0);
  });
});

describe('summary', () => {
  const day = (d: string) => new Date(`${d}T12:00:00Z`);

  it('counts simultaneous events without losing any', async () => {
    const s = getStorageAdapter();
    await Promise.all(Array.from({ length: 50 }, () => recordEvent(s, { kind: 'view', page: 'store' }, day('2026-10-15'))));
    expect((await summarizeWeek(s, '2026-10-17')).viewsByPage.store).toBe(50);
  });

  it('rolls up pages, items, notify rate and confidence over the seven days only', async () => {
    const s = getStorageAdapter();
    const add = async (n: number, e: Parameters<typeof recordEvent>[1], d: string) => {
      for (let i = 0; i < n; i++) await recordEvent(s, e, day(d));
    };
    await add(120, { kind: 'view', page: 'merch', slug: 'infinity-tee' }, '2026-10-16');
    await add(6, { kind: 'notify', page: 'merch', slug: 'infinity-tee' }, '2026-10-17');
    await add(4, { kind: 'view', page: 'program', slug: 'yale-inversion-protocol' }, '2026-10-11');
    await add(1, { kind: 'notify', page: 'merch', slug: 'infinity-tee' }, '2026-10-10'); // outside the week
    await add(9, { kind: 'view', page: 'store' }, '2026-10-17');

    const sum = await summarizeWeek(s, '2026-10-17');
    expect(sum).toMatchObject({ proposal: true, startDay: '2026-10-11', endDay: '2026-10-17', notifyTaps: 6 });
    expect(sum.viewsByPage).toEqual({ merch: 120, program: 4, store: 9 });
    expect(sum.dailyViews.map((d) => d.views)).toEqual([4, 0, 0, 0, 0, 120, 9]);

    const tee = interestBySlug(sum)['merch/infinity-tee'];
    expect(tee).toMatchObject({ views: 120, notifyTaps: 6, notifyRate: 0.05, confident: true });
    expect(interestBySlug(sum)['program/yale-inversion-protocol']).toMatchObject({ views: 4, confident: false });
    expect(CONFIDENCE_VIEWS).toBe(100);
  });

  it('weekDays crosses month ends', () => {
    expect(weekDays('2026-11-02')[0]).toBe('2026-10-27');
  });

  it('saves the summary as a file in private storage', async () => {
    const s = getStorageAdapter();
    const key = await saveWeeklySummary(s, await summarizeWeek(s, '2026-10-17'));
    expect(key).toBe('counters/summaries/2026-10-17.json');
    expect(JSON.parse(String(files.get(key))).proposal).toBe(true);
  });
});

describe('summary route', () => {
  const get = (qs = '', token = 'operator-secret-1234') =>
    summaryRoute(new NextRequest(`http://x/api/counters/summary${qs}`, { headers: { authorization: `Bearer ${token}` } }));

  it('needs the operator secret and fails closed when unconfigured', async () => {
    expect((await get('', 'wrong-secret-12345678')).status).toBe(401);
    delete process.env.WAIA_OPERATOR_SECRET;
    expect((await get()).status).toBe(503);
  });

  it('returns and optionally saves the summary', async () => {
    await recordEvent(getStorageAdapter(), { kind: 'view', page: 'store' }, new Date('2026-10-17T01:00:00Z'));
    const body = await (await get('?end=2026-10-17&save=1')).json();
    expect(body.summary.viewsByPage.store).toBe(1);
    expect(body.savedAs).toBe('counters/summaries/2026-10-17.json');
    expect((await get('?end=nope')).status).toBe(400);
  });
});

describe('browser script', () => {
  it('honours Do Not Track and Global Privacy Control', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const c = require('../../../../public/waia-counters.js');
    expect(c.optedOut({ doNotTrack: '1' })).toBe(true);
    expect(c.optedOut({ globalPrivacyControl: true })).toBe(true);
    expect(c.optedOut({})).toBe(false);
    expect(c.ENDPOINT).toBe('/api/counters');
  });
});
