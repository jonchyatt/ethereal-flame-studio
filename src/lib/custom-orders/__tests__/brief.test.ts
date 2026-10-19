const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (p: string) => [...files.keys()].filter((k) => k.startsWith(p)),
  }),
}));

import { NextRequest } from 'next/server';
import { BriefSchema, createOrderFromBrief, loadBrief, summarizeBrief } from '../brief';
import { suggestQuote, SESSION_PRICING, type SessionPricing } from '../pricing';
import { listOrders, publicView } from '../model';
import { POST as intake } from '@/app/api/custom-orders/brief/route';
import { GET as operatorBrief } from '@/app/api/custom-orders/[id]/brief/route';

const hypnosis = { kind: 'hypnosis', goal: 'Sleep through the night', lengthMinutes: 30, voice: 'feminine', music: 'binaural', acknowledgeSafeUse: true };
const vr = { kind: 'vr', goal: 'Calm after work', lengthMinutes: 20, voice: 'no-preference', music: 'nature', vrScene: 'other', vrSceneNote: 'a lantern-lit pier', vrComfortFlag: true, safetyNotes: 'Mild vertigo', acknowledgeSafeUse: true };

const priced: SessionPricing = {
  currency: 'USD',
  base: { hypnosis: { 30: 4000 }, vr: { 20: 6000 } },
  addOns: { binauralTones: 500, vrCustomScene: null },
};

const post = (body: unknown) => new NextRequest('http://x/api/custom-orders/brief', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  files.clear();
  process.env.CUSTOM_ORDERS_OPEN = '1';
  process.env.WAIA_OPERATOR_SECRET = 'operator-secret-1234';
});

describe('brief schema', () => {
  it('accepts a complete hypnosis and a complete VR brief', () => {
    expect(BriefSchema.safeParse(hypnosis).success).toBe(true);
    expect(BriefSchema.safeParse(vr).success).toBe(true);
  });
  it('requires the safe-use acknowledgement, a scene for VR, and no scene for hypnosis', () => {
    expect(BriefSchema.safeParse({ ...hypnosis, acknowledgeSafeUse: false }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...vr, vrScene: undefined }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...hypnosis, vrScene: 'forest' }).success).toBe(false);
  });
  it('rejects unknown lengths, voices and over-long goals', () => {
    expect(BriefSchema.safeParse({ ...hypnosis, lengthMinutes: 7 }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...hypnosis, voice: 'robot' }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...hypnosis, goal: 'x'.repeat(301) }).success).toBe(false);
  });
  it('summary fits the order limit even at the maximum field sizes', () => {
    const big = BriefSchema.parse({ ...vr, goal: 'g'.repeat(300), safetyNotes: 's'.repeat(300), vrSceneNote: 'n'.repeat(100) });
    expect(summarizeBrief(big).length).toBeLessThanOrEqual(1000);
  });
});

describe('intake', () => {
  it('stores the brief and a summary order the existing queue can show', async () => {
    const { order, reference, brief } = await createOrderFromBrief({ brief: vr, contact: 'private@example.invalid' });
    expect((await loadBrief(order.id))).toEqual(brief);
    const [listed] = await listOrders();
    expect(listed.details).toContain('Mild vertigo');
    expect(JSON.stringify(publicView(order))).not.toContain('private@example.invalid');
    expect(reference.startsWith(order.id)).toBe(true);
  });
  it('route: 503 when closed, 400 with issues when incomplete, 201 when complete, honeypot looks successful but saves nothing', async () => {
    process.env.CUSTOM_ORDERS_OPEN = '0';
    expect((await intake(post({ brief: hypnosis }))).status).toBe(503);
    process.env.CUSTOM_ORDERS_OPEN = '1';
    const bad = await intake(post({ brief: { ...hypnosis, acknowledgeSafeUse: false } }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).issues.length).toBeGreaterThan(0);
    expect((await intake(post({ brief: hypnosis }))).status).toBe(201);
    const before = files.size;
    expect((await intake(post({ brief: hypnosis, website: 'spam' }))).status).toBe(201);
    expect(files.size).toBe(before);
  });
});

describe('quote calculator', () => {
  it('has no estimate while the shipped config is blank, and never invents a number', () => {
    const q = suggestQuote(BriefSchema.parse(hypnosis));
    expect(q.amountCents).toBeNull();
    expect(q.notes[0]).toMatch(/quote by hand/);
    expect(JSON.stringify(SESSION_PRICING)).not.toMatch(/\d{3,}/);
  });
  it('adds priced add-ons and flags unpriced ones', () => {
    expect(suggestQuote(BriefSchema.parse(hypnosis), priced)).toMatchObject({ amountCents: 4500 });
    const v = suggestQuote(BriefSchema.parse(vr), priced);
    expect(v.amountCents).toBe(6000);
    expect(v.notes.join(' ')).toMatch(/Custom VR scene.*not set/);
    expect(v.notes.join(' ')).toMatch(/Comfort flag/);
  });
});

describe('operator brief route', () => {
  it('refuses without the operator secret and returns brief plus suggestion with it', async () => {
    const { order } = await createOrderFromBrief({ brief: hypnosis });
    const ctx = { params: Promise.resolve({ id: order.id }) };
    expect((await operatorBrief(new NextRequest('http://x'), ctx)).status).toBe(401);
    const ok = await operatorBrief(new NextRequest('http://x', { headers: { authorization: 'Bearer operator-secret-1234' } }), ctx);
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.brief.goal).toBe('Sleep through the night');
    expect(body.suggestion.amountCents).toBeNull();
    const missing = await operatorBrief(new NextRequest('http://x', { headers: { authorization: 'Bearer operator-secret-1234' } }), { params: Promise.resolve({ id: 'ord_ffffffffffffffff' }) });
    expect(missing.status).toBe(404);
  });
});
