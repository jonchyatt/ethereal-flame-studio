import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BriefError, createOrderFromBrief } from '@/lib/custom-orders/brief';
import { notifyOwner } from '@/lib/subscribers/notify';
import { OrderError } from '@/lib/custom-orders/model';

export const dynamic = 'force-dynamic';

const BRIEF_IN = 'Your brief is in. We reply by email within a few days.';

/** Public brief intake. Open; the contact must be an email. Nothing is charged and no price is quoted. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true, reference: 'ord_0000000000000000.0' }, { status: 201 });
  }
  const email = z.string().trim().max(200).email('Enter the email address we should reply to.').safeParse(body.contact);
  if (!email.success) return NextResponse.json({ error: 'The brief is not complete.', issues: [email.error.issues[0].message] }, { status: 400 });
  try {
    const { order, reference } = await createOrderFromBrief({ brief: body.brief, contact: email.data });
    await notifyOwner('WAIA: new custom-order brief', `${order.id} ${order.createdAt}
Email: ${order.contact}
${order.details}`);
    return NextResponse.json({ ok: true, id: order.id, reference, message: BRIEF_IN }, { status: 201 });
  } catch (e) {
    if (e instanceof BriefError) return NextResponse.json({ error: 'The brief is not complete.', issues: e.issues }, { status: 400 });
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save the request' }, { status: 502 });
  }
}
