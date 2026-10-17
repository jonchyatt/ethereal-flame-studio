import { patronSchema, patronsFileSchema, DISPLAY_NAME_MAX, MESSAGE_MAX } from '../schema';
import { moderatePatron, loadRenderablePatrons, containsUrl, containsBlockedTerm } from '../moderation';

const base = { displayName: 'Ada', tier: 'plain', since: '2026-10-17', approved: true, consentRef: 'consent_0001' } as const;

describe('patron schema', () => {
  it('accepts a minimal patron and all tiers', () => {
    for (const tier of ['plain', 'sparkly', 'glowing', 'ethereal'] as const) {
      expect(patronSchema.safeParse({ ...base, tier }).success).toBe(true);
    }
  });
  it('rejects unknown tier, empty name, bad date, missing approved', () => {
    expect(patronSchema.safeParse({ ...base, tier: 'gold' }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, displayName: '  ' }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, since: 'yesterday' }).success).toBe(false);
    const { approved: _a, ...noApproved } = base;
    expect(patronSchema.safeParse(noApproved).success).toBe(false);
  });
  it('enforces length caps', () => {
    expect(patronSchema.safeParse({ ...base, displayName: 'x'.repeat(DISPLAY_NAME_MAX + 1) }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, message: 'x'.repeat(MESSAGE_MAX + 1) }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, message: 'x'.repeat(MESSAGE_MAX) }).success).toBe(true);
  });
  it('validates a file as an array', () => {
    expect(patronsFileSchema.safeParse([base, base]).success).toBe(true);
    expect(patronsFileSchema.safeParse({ patrons: [] }).success).toBe(false);
  });
});

describe('moderation', () => {
  it('never renders approved=false', () => {
    expect(moderatePatron({ ...base, approved: false })).toEqual({ ok: false, reason: 'not approved' });
  });
  it('passes clean text', () => {
    expect(moderatePatron({ ...base, message: 'Thank you for the light. Keep shining!' }).ok).toBe(true);
    expect(moderatePatron({ ...base, displayName: 'Scunthorpe Class', message: 'Pass the assassin a cocktail' }).ok).toBe(true);
  });
  it('rejects URLs in name or message', () => {
    for (const t of ['http://x.io', 'visit www.example', 'my site.com', 'me@mail.com', 'bit.ly/abc']) {
      expect(containsUrl(t)).toBe(true);
    }
    expect(moderatePatron({ ...base, message: 'see example.com' }).ok).toBe(false);
    expect(moderatePatron({ ...base, displayName: 'https://spam' }).ok).toBe(false);
  });
  it('rejects blocklisted terms including leetspeak and spacing evasion', () => {
    for (const t of ['SHIT', 'sh1t', 'f u c k', 'fuuuck', 'what a b!tch', 'Kill Yourself']) {
      expect(containsBlockedTerm(t)).toBe(true);
    }
    expect(moderatePatron({ ...base, message: 'f.u.c.k this' }).ok).toBe(false);
  });
  it('loadRenderablePatrons returns only renderable entries and reports rejects', () => {
    const out = loadRenderablePatrons([
      base,
      { ...base, displayName: 'Hidden', approved: false },
      { ...base, displayName: 'Spam', message: 'buy at spam.com' },
    ]);
    expect(out.renderable.map((p) => p.displayName)).toEqual(['Ada']);
    expect(out.rejected.map((r) => r.index)).toEqual([1, 2]);
  });
  it('loadRenderablePatrons throws on an invalid file', () => {
    expect(() => loadRenderablePatrons([{ displayName: 'x' }])).toThrow();
  });
});

import { buildPatronRenderList, hashPatronRenderList } from '../renderList';
import { buildPatronCardHtml } from '../card';

describe('render list and card', () => {
  const raw = [
    { ...base, message: 'Shine on' },
    { ...base, displayName: 'Hidden', approved: false },
    { ...base, displayName: '<b>Zed</b>', tier: 'ethereal' },
  ];
  it('contains only approved moderated entries and no approval flag', () => {
    const list = buildPatronRenderList(raw);
    expect(list.patrons.map((p) => p.displayName)).toEqual(['Ada', '<b>Zed</b>']);
    expect(JSON.stringify(list)).not.toContain('approved');
  });
  it('hash is stable and changes with content', () => {
    const a = hashPatronRenderList(buildPatronRenderList(raw));
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPatronRenderList(buildPatronRenderList(raw))).toBe(a);
    expect(hashPatronRenderList(buildPatronRenderList(raw.slice(0, 1)))).not.toBe(a);
  });
  it('card escapes html and omits hidden patrons', () => {
    const html = buildPatronCardHtml(buildPatronRenderList(raw));
    expect(html).toContain('&lt;b&gt;Zed&lt;/b&gt;');
    expect(html).not.toContain('Hidden');
    expect(html).toContain('class="ethereal"');
  });
});

import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';
import { assertOutsideRepo, serializePatronRenderList, verifyPatronSnapshotFile } from '../renderList';

describe('consent and snapshot freezing', () => {
  it('rejects emails/billing identity as consentRef and unknown keys', () => {
    expect(patronSchema.safeParse({ ...base, consentRef: 'a@b.com' }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, consentRef: 'short' }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, email: 'a@b.com' }).success).toBe(false);
    expect(patronSchema.safeParse({ ...base, stripeCustomerId: 'cus_123' }).success).toBe(false);
    const { consentRef: _c, ...noRef } = base;
    expect(patronSchema.safeParse(noRef).success).toBe(false);
  });
  it('carries consentRef into the render list and nothing else private', () => {
    const list = buildPatronRenderList([base]);
    expect(list.patrons[0]).toEqual({ displayName: 'Ada', tier: 'plain', consentRef: 'consent_0001' });
  });
  it('refuses patron data paths inside the repo', () => {
    expect(() => assertOutsideRepo('/repo/data/patrons.json', '/repo')).toThrow();
    expect(() => assertOutsideRepo('/secure/patrons.json', '/repo')).not.toThrow();
  });
  describe('verifyPatronSnapshotFile', () => {
    let dir: string;
    beforeEach(async () => { dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'patrons-')); });
    afterEach(async () => { await fsp.rm(dir, { recursive: true, force: true }); });
    const write = async (text: string) => {
      const f = path.join(dir, 'snap.json');
      await fsp.writeFile(f, text);
      return f;
    };
    it('accepts the frozen bytes', async () => {
      const list = buildPatronRenderList([base]);
      const f = await write(serializePatronRenderList(list));
      const res = await verifyPatronSnapshotFile(f, hashPatronRenderList(list));
      expect(res.ok).toBe(true);
    });
    it('rejects changed text with a reason', async () => {
      const list = buildPatronRenderList([base]);
      const hash = hashPatronRenderList(list);
      const f = await write(serializePatronRenderList({ ...list, patrons: [{ ...list.patrons[0], displayName: 'Eve' }] }));
      const res = await verifyPatronSnapshotFile(f, hash);
      expect(res).toEqual({ ok: false, reason: expect.stringContaining('hash mismatch') });
    });
    it('rejects an approved-hash snapshot whose text fails moderation', async () => {
      const bad = { schemaVersion: 'efs-patron-wall-v1' as const, patrons: [{ displayName: 'spam.com', tier: 'plain' as const, consentRef: 'consent_0002' }] };
      const f = await write(serializePatronRenderList(bad));
      const res = await verifyPatronSnapshotFile(f, hashPatronRenderList(bad));
      expect(res).toEqual({ ok: false, reason: expect.stringContaining('URL') });
    });
  });
});
