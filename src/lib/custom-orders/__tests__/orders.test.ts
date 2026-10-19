const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (p: string) => [...files.keys()].filter((k) => k.startsWith(p)),
  }),
}));

import { NextRequest } from 'next/server';
import { createOrder, listOrders, openWithReference, OrderError, publicView, updateOrder } from '../model';
import { GET as listRoute, POST as intakeRoute } from '@/app/api/custom-orders/route';
import { GET as statusRoute, PATCH as patchRoute } from '@/app/api/custom-orders/[id]/route';

beforeEach(() => {
  files.clear();
  process.env.CUSTOM_ORDERS_OPEN = '1';
  process.env.WAIA_OPERATOR_SECRET = 'operator-secret-1234';
});

describe('model', () => {
  it('rejects a bad kind or empty details, and caps length', async () => {
    await expect(createOrder({ kind: 'x', details: 'a' })).rejects.toBeInstanceOf(OrderError);
    await expect(createOrder({ kind: 'vr', details: '   ' })).rejects.toBeInstanceOf(OrderError);
    const { order } = await createOrder({ kind: 'vr', details: 'a'.repeat(5000), contact: 'c'.repeat(500) });
    expect(order.details).toHaveLength(1000);
    expect(order.contact).toHaveLength(200);
  });

  it('stores only a token hash and opens only with the exact reference', async () => {
    const { order, reference } = await createOrder({ kind: 'hypnosis', details: 'calm' });
    expect(JSON.stringify([...files.values()].map(String))).not.toContain(reference.split('.')[1]);
    expect((await openWithReference(reference))?.id).toBe(order.id);
    expect(await openWithReference(`${order.id}.${'0'.repeat(32)}`)).toBeNull();
    expect(await openWithReference(order.id)).toBeNull();
    expect(await openWithReference(null)).toBeNull();
  });

  it('walks received -> in_review -> quoted -> accepted -> closed and refuses skips', async () => {
    const { order } = await createOrder({ kind: 'hypnosis', details: 'calm' });
    await expect(updateOrder(order.id, { status: 'quoted', by: 'jon' })).rejects.toMatchObject({ code: 'BAD_TRANSITION' });
    await expect(updateOrder(order.id, { quote: { amountCents: 100 }, by: 'jon' })).rejects.toMatchObject({ code: 'BAD_TRANSITION' });
    await updateOrder(order.id, { status: 'in_review', by: 'jon' });
    await expect(updateOrder(order.id, { status: 'quoted', by: 'jon' })).rejects.toMatchObject({ code: 'QUOTE_REQUIRED' });
    await updateOrder(order.id, { quote: { amountCents: 4500, note: 'one session' }, by: 'jon' });
    const quoted = await updateOrder(order.id, { status: 'quoted', by: 'jon' });
    expect(quoted.quote).toMatchObject({ amountCents: 4500, currency: 'USD' });
    await updateOrder(order.id, { status: 'accepted', by: 'customer' });
    await expect(updateOrder(order.id, { status: 'declined', by: 'jon' })).rejects.toMatchObject({ code: 'BAD_TRANSITION' });
    const closed = await updateOrder(order.id, { status: 'closed', by: 'jon' });
    expect(closed.history.map((h) => h.status)).toEqual(['received', 'in_review', 'quoted', 'accepted', 'closed']);
    await expect(updateOrder(order.id, { status: 'received', by: 'jon' })).rejects.toBeInstanceOf(OrderError);
  });

  it('hides the quote until one is offered, and never exposes contact', async () => {
    const { order } = await createOrder({ kind: 'vr', details: 'forest', contact: 'private@example.invalid' });
    const v = publicView(order) as Record<string, unknown>;
    expect(JSON.stringify(v)).not.toContain('private@example.invalid');
    expect(v).not.toHaveProperty('tokenHash');
    expect(v.quote).toBeNull();
  });

  it('lists newest first', async () => {
    await createOrder({ kind: 'vr', details: 'one', now: new Date('2026-10-01') });
    await createOrder({ kind: 'vr', details: 'two', now: new Date('2026-10-02') });
    expect((await listOrders()).map((o) => o.details)).toEqual(['two', 'one']);
  });
});

const json = (url: string, init: { method: string; body?: unknown; headers?: Record<string, string> }) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const op = { authorization: 'Bearer operator-secret-1234' };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('routes', () => {
  it('intake is closed (503) until CUSTOM_ORDERS_OPEN=1', async () => {
    delete process.env.CUSTOM_ORDERS_OPEN;
    const res = await intakeRoute(json('/api/custom-orders', { method: 'POST', body: { kind: 'vr', details: 'x' } }));
    expect(res.status).toBe(503);
    expect(files.size).toBe(0);
  });

  it('honeypot answers 201 but stores nothing; bad input is 400', async () => {
    const bot = await intakeRoute(json('/api/custom-orders', { method: 'POST', body: { kind: 'vr', details: 'x', website: 'http://spam' } }));
    expect(bot.status).toBe(201);
    expect(files.size).toBe(0);
    const bad = await intakeRoute(json('/api/custom-orders', { method: 'POST', body: { kind: 'vr', details: '' } }));
    expect(bad.status).toBe(400);
  });

  it('full flow: submit, operator quotes, customer accepts, no payment anywhere', async () => {
    const made = await intakeRoute(json('/api/custom-orders', { method: 'POST', body: { kind: 'hypnosis', details: 'sleep', contact: 'x' } }));
    expect(made.status).toBe(201);
    const { id, reference } = await made.json();

    const seen = await statusRoute(json(`/api/custom-orders/${id}?t=${reference}`, { method: 'GET' }), ctx(id));
    expect((await seen.json()).order.status).toBe('received');
    const wrong = await statusRoute(json(`/api/custom-orders/${id}?t=${id}.bad`, { method: 'GET' }), ctx(id));
    expect(wrong.status).toBe(404);

    expect((await listRoute(json('/api/custom-orders', { method: 'GET' }))).status).toBe(401);
    const q = await listRoute(json('/api/custom-orders', { method: 'GET', headers: op }));
    const { orders } = await q.json();
    expect(orders).toHaveLength(1);
    expect(orders[0]).not.toHaveProperty('tokenHash');

    // customer cannot accept before a quote exists
    const early = await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', body: { reference, status: 'accepted' } }), ctx(id));
    expect(early.status).toBe(400);
    // customer cannot use the operator path without the secret
    const forged = await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', headers: { authorization: 'Bearer nope' }, body: { status: 'in_review' } }), ctx(id));
    expect(forged.status).toBe(401);

    await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', headers: op, body: { status: 'in_review' } }), ctx(id));
    await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', headers: op, body: { quote: { amountCents: 6000, note: 'ok' } } }), ctx(id));
    const hidden = await statusRoute(json(`/api/custom-orders/${id}?t=${reference}`, { method: 'GET' }), ctx(id));
    expect((await hidden.json()).order.quote).toBeNull();
    await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', headers: op, body: { status: 'quoted' } }), ctx(id));
    const shown = await statusRoute(json(`/api/custom-orders/${id}?t=${reference}`, { method: 'GET' }), ctx(id));
    expect((await shown.json()).order.quote.amountCents).toBe(6000);

    const done = await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', body: { reference, status: 'accepted' } }), ctx(id));
    expect(done.status).toBe(200);
    expect((await done.json()).order.status).toBe('accepted');
    // a customer can only accept or decline, never close or re-open
    const cheat = await patchRoute(json(`/api/custom-orders/${id}`, { method: 'PATCH', body: { reference, status: 'closed' } }), ctx(id));
    expect(cheat.status).toBe(400);
  });

  it('takes no payment: no stripe or checkout code in the flow', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs'); const path = require('path');
    const dirs = ['src/lib/custom-orders', 'src/app/api/custom-orders', 'src/app/store/custom-order', 'src/app/operator/custom-orders'];
    const text = (d: string): string => fs.readdirSync(d, { withFileTypes: true }).map((e: { name: string; isDirectory(): boolean }) =>
      e.isDirectory() ? text(path.join(d, e.name)) : e.name.endsWith('.test.ts') ? '' : fs.readFileSync(path.join(d, e.name), 'utf8')).join('\n');
    for (const d of dirs) expect(text(path.resolve(__dirname, '../../../..', d))).not.toMatch(/stripe|checkout|paymentIntent|card/i);
  });
});
