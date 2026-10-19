const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
  }),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/programs/[id]/audio/[track]/route';
import { loadAudioManifest } from '../audio';
import { fixtureWav, parseRange, parseResume, resumeSeconds, sleepVolume } from '../audio-logic';
import { grantAccess } from '../model';
import { CUSTOMER_COOKIE, newCustomerId, signCustomerId } from '../session';

const PID = 'advanced-hypnosis-sessions';
const wav = fixtureWav(1);
const manifest = { tracks: [{ id: 'fixture', title: 'Fixture', file: 'fixture.wav', contentType: 'audio/wav' }] };

beforeEach(() => {
  files.clear();
  process.env.ENTITLEMENT_COOKIE_SECRET = 'x'.repeat(32);
  files.set(`programs/${PID}/audio.json`, Buffer.from(JSON.stringify(manifest)));
  files.set(`programs/${PID}/audio/fixture.wav`, wav);
});

const call = (cookie: string | null, track = 'fixture', range?: string, id = PID) => {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `${CUSTOMER_COOKIE}=${cookie}`;
  if (range) headers.range = range;
  return GET(new NextRequest(`http://x/api/programs/${id}/audio/${track}`, { headers }), { params: Promise.resolve({ id, track }) });
};

describe('gated audio route', () => {
  it('refuses with no cookie, a forged cookie, and without a grant', async () => {
    expect((await call(null)).status).toBe(402);
    expect((await call('cus_' + 'a'.repeat(32) + '.forged')).status).toBe(402);
    const cus = newCustomerId();
    expect((await call(signCustomerId(cus))).status).toBe(402);
  });
  it('refuses when the cookie secret is unset (fail closed)', async () => {
    const cus = newCustomerId();
    const cookie = signCustomerId(cus);
    delete process.env.ENTITLEMENT_COOKIE_SECRET;
    expect((await call(cookie)).status).toBe(402);
  });
  it('a grant for another program does not open this one', async () => {
    const cus = newCustomerId();
    await grantAccess({ customerId: cus, programId: 'yale-inversion-protocol' });
    expect((await call(signCustomerId(cus))).status).toBe(402);
  });
  it('serves the whole file, then ranges, to a granted customer', async () => {
    const cus = newCustomerId();
    await grantAccess({ customerId: cus, programId: PID, expiresAt: '2099-01-01T00:00:00.000Z' });
    const c = signCustomerId(cus);
    const full = await call(c);
    expect(full.status).toBe(200);
    expect(full.headers.get('content-type')).toBe('audio/wav');
    expect(full.headers.get('cache-control')).toBe('private, no-store');
    expect(Buffer.from(await full.arrayBuffer()).equals(wav)).toBe(true);
    const part = await call(c, 'fixture', 'bytes=10-19');
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe(`bytes 10-19/${wav.length}`);
    expect(Buffer.from(await part.arrayBuffer()).equals(wav.subarray(10, 20))).toBe(true);
    expect((await call(c, 'fixture', `bytes=${wav.length}-`)).status).toBe(416);
  });
  it('404s unknown tracks and unhanded files; unknown program 404s', async () => {
    const cus = newCustomerId();
    await grantAccess({ customerId: cus, programId: PID, expiresAt: '2099-01-01T00:00:00.000Z' });
    const c = signCustomerId(cus);
    expect((await call(c, 'nope')).status).toBe(404);
    files.delete(`programs/${PID}/audio/fixture.wav`);
    expect((await call(c)).status).toBe(404);
    expect((await call(c, 'fixture', undefined, 'peptide-tracker')).status).toBe(404);
  });
  it('rejects a manifest that points outside the audio folder', async () => {
    files.set(`programs/${PID}/audio.json`, Buffer.from(JSON.stringify({ tracks: [{ ...manifest.tracks[0], file: '../../entitlements/x.json' }] })));
    expect(await loadAudioManifest(PID)).toEqual([]);
    files.set(`programs/${PID}/audio.json`, Buffer.from('not json'));
    expect(await loadAudioManifest(PID)).toEqual([]);
  });
});

describe('parseRange', () => {
  it('handles open, suffix, clamped and bad ranges', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=5-2', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(parseRange('items=0-1', 100)).toBeNull();
  });
});

describe('player logic', () => {
  it('sleep timer holds full volume, fades over the last 20 s, then silences', () => {
    const end = 1_000_000;
    expect(sleepVolume(end - 60_000, end)).toBe(1);
    expect(sleepVolume(end - 10_000, end)).toBeCloseTo(0.5);
    expect(sleepVolume(end, end)).toBe(0);
    expect(sleepVolume(end + 5, end)).toBe(0);
  });
  it('resume skips the first 5 s, the last 10 s and other tracks', () => {
    const saved = { trackId: 'a', seconds: 120 };
    expect(resumeSeconds(saved, 'a', 600)).toBe(120);
    expect(resumeSeconds(saved, 'b', 600)).toBe(0);
    expect(resumeSeconds({ trackId: 'a', seconds: 3 }, 'a', 600)).toBe(0);
    expect(resumeSeconds({ trackId: 'a', seconds: 595 }, 'a', 600)).toBe(0);
    expect(resumeSeconds(null, 'a', 600)).toBe(0);
  });
  it('parseResume ignores junk', () => {
    expect(parseResume('{"trackId":"a","seconds":12}')).toEqual({ trackId: 'a', seconds: 12 });
    expect(parseResume('x')).toBeNull();
    expect(parseResume('{"trackId":1}')).toBeNull();
  });
  it('fixture is a valid RIFF/WAVE of the right size', () => {
    const w = fixtureWav(1);
    expect(w.toString('ascii', 0, 4)).toBe('RIFF');
    expect(w.toString('ascii', 8, 12)).toBe('WAVE');
    expect(w.length).toBe(44 + 8000 * 2);
  });
});
