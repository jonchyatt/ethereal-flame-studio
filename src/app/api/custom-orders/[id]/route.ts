import { NextRequest, NextResponse } from 'next/server';
import { openWithReference, OrderError, publicView, STATUSES, updateOrder } from '@/lib/custom-orders/model';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

/** Customer status by reference (`ord_….secret`), sent as the `t` query value. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reference = req.nextUrl.searchParams.get('t');
  const order = reference?.startsWith(`${id}.`) ? await openWithReference(reference) : null;
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ order: publicView(order) });
}

/**
 * Customer: `{ reference, status: 'accepted' | 'declined' }` on a quoted order.
 * Operator (Bearer): `{ status?, quote? }`.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    reference?: string; status?: string; quote?: { amountCents: number; currency?: string; note?: string };
  };
  const status = STATUSES.find((s) => s === body.status);
  try {
    if (req.headers.get('authorization')) {
      const auth = authenticateWaiaOperator(req);
      if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
      if (body.status && !status) return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
      const order = await updateOrder(id, { status, quote: body.quote, by: auth.actor });
      return NextResponse.json({ order: { ...order, tokenHash: undefined } });
    }
    const order = body.reference?.startsWith(`${id}.`) ? await openWithReference(body.reference) : null;
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.status !== 'quoted' || (status !== 'accepted' && status !== 'declined')) {
      return NextResponse.json({ error: 'Only a quoted order can be accepted or declined' }, { status: 400 });
    }
    const updated = await updateOrder(id, { status, by: 'customer' });
    return NextResponse.json({ order: publicView(updated) });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 502 });
  }
}
