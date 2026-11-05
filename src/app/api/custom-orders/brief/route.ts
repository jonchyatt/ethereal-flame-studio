import { NextRequest, NextResponse } from 'next/server';
import { BriefError, createOrderFromBrief } from '@/lib/custom-orders/brief';
import { OrderError } from '@/lib/custom-orders/model';

export const dynamic = 'force-dynamic';

const CLOSED_BRIEF_MESSAGE =
  'Coming soon. Requests are not open yet, so this was not saved or sent anywhere, and nothing has been charged. Keep a copy if you want it. You can also email support@whatamiappreciatingnow.com.';

/** Public brief intake. Same gate as the plain request form: closed until CUSTOM_ORDERS_OPEN=1. Nothing is charged. */
export async function POST(req: NextRequest) {
  if (process.env.CUSTOM_ORDERS_OPEN !== '1') {
    return NextResponse.json({ error: CLOSED_BRIEF_MESSAGE }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true, reference: 'ord_0000000000000000.0' }, { status: 201 });
  }
  try {
    const { order, reference } = await createOrderFromBrief({ brief: body.brief, contact: body.contact });
    return NextResponse.json({ ok: true, id: order.id, reference }, { status: 201 });
  } catch (e) {
    if (e instanceof BriefError) return NextResponse.json({ error: 'The brief is not complete.', issues: e.issues }, { status: 400 });
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save the request' }, { status: 502 });
  }
}
