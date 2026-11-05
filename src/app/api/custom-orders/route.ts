import { NextRequest, NextResponse } from 'next/server';
import { createOrder, listOrders, OrderError } from '@/lib/custom-orders/model';
import { notifyOwner } from '@/lib/subscribers/notify';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

const BRIEF_IN = 'Your brief is in. We reply by email within a few days.';

/** Public intake. Open; nothing is charged and no price is quoted. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Honeypot: a real person never fills the hidden "website" field. Answer as if it worked.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true, reference: 'ord_0000000000000000.0' }, { status: 201 });
  }
  try {
    const { order, reference } = await createOrder(body);
    await notifyOwner('WAIA: new custom-order request', `${order.id} (${order.kind}) ${order.createdAt}
Contact: ${order.contact || 'none given'}
${order.details}`);
    return NextResponse.json({ ok: true, id: order.id, reference, message: BRIEF_IN }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save the request' }, { status: 502 });
  }
}

/** Operator queue. */
export async function GET(req: NextRequest) {
  const auth = authenticateWaiaOperator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const orders = (await listOrders()).map(({ tokenHash: _t, ...rest }) => rest);
  return NextResponse.json({ orders });
}
