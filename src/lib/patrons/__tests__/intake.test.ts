import type { StorageAdapter } from '@/lib/storage';
import { buildPatronsFile, decideIntake, listIntake, requestRemoval, submitIntake } from '../intake';
import { loadRenderablePatrons } from '../moderation';
import { allow } from '../rateLimit';

function memoryStorage(): StorageAdapter & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (k: string, d: Buffer | Uint8Array) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  } as unknown as StorageAdapter & { files: Map<string, Buffer> };
}

const good = { displayName: 'Ada', tier: 'glowing', consent: true, adult: true };

test('a valid submission writes a consent record first and a pending intake with an opaque ref', async () => {
  const s = memoryStorage();
  const r = await submitIntake(s, good);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.consentRef).toMatch(/^consent_[0-9a-f]{24}$/);
  const consent = JSON.parse(s.files.get(`patrons/consent/${r.consentRef}.json`)!.toString());
  expect(consent.shown).toEqual({ displayName: 'Ada', message: null, tier: 'glowing' });
  expect(consent.consentText).toMatch(/displayed publicly/);
  const [rec] = await listIntake(s);
  expect(rec.status).toBe('pending');
  expect(JSON.stringify(rec)).not.toMatch(/@|email/);
});

test('consent and adult confirmation are required', async () => {
  const s = memoryStorage();
  expect((await submitIntake(s, { ...good, consent: false })).ok).toBe(false);
  expect((await submitIntake(s, { ...good, adult: false })).ok).toBe(false);
  expect(s.files.size).toBe(0);
});

test('extra keys such as email are rejected, not carried along', async () => {
  const r = await submitIntake(memoryStorage(), { ...good, email: 'a@b.co' });
  expect(r.ok).toBe(false);
});

test('urls, emails and blocked words are refused with a plain message', async () => {
  const s = memoryStorage();
  for (const displayName of ['visit evil.com', 'a@b.co', 'sh1t', 'f u c k']) {
    const r = await submitIntake(s, { ...good, displayName });
    expect(r.ok).toBe(false);
  }
  expect(s.files.size).toBe(0);
});

test('only the ethereal tier may carry a message; length caps hold', async () => {
  const s = memoryStorage();
  const no = await submitIntake(s, { ...good, message: 'Shine on' });
  expect(no.ok).toBe(false);
  const yes = await submitIntake(s, { ...good, tier: 'ethereal', message: 'Shine on' });
  expect(yes.ok).toBe(true);
  expect((await submitIntake(s, { ...good, displayName: 'x'.repeat(41) })).ok).toBe(false);
  expect((await submitIntake(s, { ...good, tier: 'ethereal', message: 'x'.repeat(121) })).ok).toBe(false);
});

test('pending never exports; approval does; the output passes the render-side loader', async () => {
  const s = memoryStorage();
  const r = await submitIntake(s, good);
  if (!r.ok) throw new Error('setup');
  expect(buildPatronsFile(await listIntake(s))).toEqual([]);
  const d = await decideIntake(s, r.consentRef, 'approve');
  expect(d.ok).toBe(true);
  const file = buildPatronsFile(await listIntake(s));
  expect(file).toHaveLength(1);
  expect(file[0]).toMatchObject({ displayName: 'Ada', approved: true, consentRef: r.consentRef });
  expect(loadRenderablePatrons(file).renderable).toHaveLength(1);
});

test('rejected and withdrawn entries do not export', async () => {
  const s = memoryStorage();
  const a = await submitIntake(s, good);
  const b = await submitIntake(s, { ...good, displayName: 'Bo' });
  if (!a.ok || !b.ok) throw new Error('setup');
  await decideIntake(s, a.consentRef, 'reject');
  await decideIntake(s, b.consentRef, 'approve');
  await decideIntake(s, b.consentRef, 'withdraw');
  expect(buildPatronsFile(await listIntake(s))).toEqual([]);
});

test('a removal request drops an approved patron from the next export and blocks re-approval', async () => {
  const s = memoryStorage();
  const r = await submitIntake(s, good);
  if (!r.ok) throw new Error('setup');
  await decideIntake(s, r.consentRef, 'approve');
  await requestRemoval(s, r.consentRef, 'please remove');
  expect(buildPatronsFile(await listIntake(s))).toEqual([]);
  const again = await decideIntake(s, r.consentRef, 'approve');
  expect(again.ok).toBe(false);
});

test('removal with an unknown or malformed code is a silent no-op', async () => {
  const s = memoryStorage();
  await requestRemoval(s, '../../etc/passwd');
  await requestRemoval(s, 'consent_000000000000000000000000');
  await requestRemoval(s, 42);
  expect(s.files.size).toBe(0);
});

test('deciding on an unknown ref is a 404', async () => {
  const d = await decideIntake(memoryStorage(), 'consent_000000000000000000000000', 'approve');
  expect(d).toMatchObject({ ok: false, status: 404 });
});

test('rate limiter blocks after the cap and recovers after the window', () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) expect(allow('k', 3, 1000, t)).toBe(true);
  expect(allow('k', 3, 1000, t)).toBe(false);
  expect(allow('k', 3, 1000, t + 2000)).toBe(true);
});
