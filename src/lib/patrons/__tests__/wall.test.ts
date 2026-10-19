import type { StorageAdapter } from '@/lib/storage';
import { decideIntake, requestRemoval, submitIntake } from '../intake';
import { publishWallSnapshot, readPublicWall, WALL_KEY } from '../wall';
import { TIERS } from '../tiers';

function memoryStorage(): StorageAdapter & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (k: string, d: Buffer | Uint8Array) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  } as unknown as StorageAdapter & { files: Map<string, Buffer> };
}

async function approved(s: StorageAdapter, displayName: string, tier = 'glowing') {
  const r = await submitIntake(s, { displayName, tier, consent: true, adult: true });
  if (!r.ok) throw new Error('submit failed');
  await decideIntake(s, r.consentRef, 'approve');
  return r.consentRef;
}

test('empty wall before anything is published', async () => {
  expect(await readPublicWall(memoryStorage())).toEqual({ publishedAt: null, patrons: [] });
});

test('only approved patrons are published; pending and rejected never show', async () => {
  const s = memoryStorage();
  await approved(s, 'Ada');
  await submitIntake(s, { displayName: 'Pending', tier: 'plain', consent: true, adult: true });
  const rej = await submitIntake(s, { displayName: 'Rejected', tier: 'plain', consent: true, adult: true });
  if (rej.ok) await decideIntake(s, rej.consentRef, 'reject');
  await publishWallSnapshot(s);
  const wall = await readPublicWall(s);
  expect(wall.patrons.map((p) => p.displayName)).toEqual(['Ada']);
});

test('names approved after publishing do not appear until the next publish', async () => {
  const s = memoryStorage();
  await approved(s, 'Ada');
  await publishWallSnapshot(s);
  await approved(s, 'Bo');
  expect((await readPublicWall(s)).patrons.map((p) => p.displayName)).toEqual(['Ada']);
});

test('a removal request hides the patron at once, without waiting for a new publish', async () => {
  const s = memoryStorage();
  const ref = await approved(s, 'Ada');
  await publishWallSnapshot(s);
  await requestRemoval(s, ref);
  expect((await readPublicWall(s)).patrons).toEqual([]);
});

test('a tampered or malformed snapshot fails closed to an empty wall', async () => {
  const s = memoryStorage();
  await approved(s, 'Ada');
  await publishWallSnapshot(s);
  const wall = JSON.parse(s.files.get(WALL_KEY)!.toString());
  wall.list.patrons[0].displayName = 'Mallory';
  s.files.set(WALL_KEY, Buffer.from(JSON.stringify(wall)));
  expect((await readPublicWall(s)).patrons).toEqual([]);
  s.files.set(WALL_KEY, Buffer.from('not json'));
  expect((await readPublicWall(s)).patrons).toEqual([]);
});

test('public entries carry no dates or approval flags, and tiers list benefits with no price', async () => {
  const s = memoryStorage();
  await approved(s, 'Ada');
  await publishWallSnapshot(s);
  expect(Object.keys((await readPublicWall(s)).patrons[0]).sort()).toEqual(['consentRef', 'displayName', 'tier']);
  for (const t of TIERS) {
    expect(t.benefits.length).toBeGreaterThan(0);
    expect(t.priceCents).toBeNull();
  }
});
