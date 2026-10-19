const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
  }),
}));

import { GuidedSessionSchema, loadGuidedSession } from '../guided';

// Synthetic fixtures only: no protocol words are ever in this repo.
const fixture = {
  title: 'Fixture session',
  steps: [
    { id: 'a', title: 'Fixture step one', body: 'placeholder' },
    { id: 'b', title: 'Fixture prompt', kind: 'prompt', noteLabel: 'note', seconds: 30 },
    { id: 'c', title: 'Fixture pause', kind: 'silence', seconds: 30 },
  ],
};
const put = (id: string, v: unknown) => files.set(`programs/${id}.session.json`, Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)));
beforeEach(() => files.clear());

describe('guided session', () => {
  it('returns null until Jonathan hands the file over', async () => {
    expect(await loadGuidedSession('yale-inversion-protocol')).toBeNull();
  });
  it('loads a valid session and fills defaults', async () => {
    put('yale-inversion-protocol', fixture);
    const s = await loadGuidedSession('yale-inversion-protocol');
    expect(s?.steps).toHaveLength(3);
    expect(s?.steps[0].kind).toBe('read');
    expect(s?.preface).toBe('');
  });
  it('only programs marked guided can load one', async () => {
    put('advanced-hypnosis-sessions', fixture);
    put('peptide-tracker', fixture);
    expect(await loadGuidedSession('advanced-hypnosis-sessions')).toBeNull();
    expect(await loadGuidedSession('peptide-tracker')).toBeNull();
  });
  it('fails closed on malformed, empty or duplicate-id files', async () => {
    put('yale-inversion-protocol', '{not json');
    expect(await loadGuidedSession('yale-inversion-protocol')).toBeNull();
    put('yale-inversion-protocol', { title: 't', steps: [] });
    expect(await loadGuidedSession('yale-inversion-protocol')).toBeNull();
    expect(GuidedSessionSchema.safeParse({ title: 't', steps: [{ id: 'x', title: 'a' }, { id: 'x', title: 'b' }] }).success).toBe(false);
  });
});
