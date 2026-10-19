const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
  }),
}));

import { CATALOG_KEY, getSession, loadCatalog, onSale, parseCatalog, parseSession } from '../catalog';

const good = {
  id: 'deep-rest', title: 'Deep rest', summary: 'A slow descent.',
  provenance: { scriptAuthor: 'A', voice: 'B', music: 'C', rightsBasis: 'own work', rightsVerified: true },
};
beforeEach(() => files.clear());

describe('hypnosis catalog', () => {
  it('is empty when nothing has been handed over', async () => {
    expect(await loadCatalog()).toEqual([]);
    expect(await getSession('deep-rest')).toBeNull();
  });
  it('drops entries missing any provenance field or with a bad slug', () => {
    for (const k of ['scriptAuthor', 'voice', 'music', 'rightsBasis']) {
      expect(parseSession({ ...good, provenance: { ...good.provenance, [k]: ' ' } })).toBeNull();
    }
    expect(parseSession({ ...good, provenance: undefined })).toBeNull();
    expect(parseSession({ ...good, id: '../x' })).toBeNull();
  });
  it('rights are unverified unless explicitly true; duplicates are dropped', () => {
    const s = parseSession({ ...good, provenance: { ...good.provenance, rightsVerified: 'yes' } });
    expect(s?.provenance.rightsVerified).toBe(false);
    expect(parseCatalog([good, good, { id: 'x' }])).toHaveLength(1);
  });
  it('loads from private storage and tolerates garbage', async () => {
    files.set(CATALOG_KEY, Buffer.from(JSON.stringify([good])));
    expect((await getSession('deep-rest'))?.title).toBe('Deep rest');
    files.set(CATALOG_KEY, Buffer.from('not json'));
    expect(await loadCatalog()).toEqual([]);
  });
  it('is not on sale while the program has no price', () => {
    expect(onSale()).toBe(false);
  });
});
