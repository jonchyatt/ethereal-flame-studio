import { NextRequest, NextResponse } from 'next/server';
import { grantAccess, revokeAccess } from '@/lib/entitlements/model';
import { actionForEvent, verifyWebhook, type StripeEvent } from '@/lib/entitlements/stripe';

export const dynamic = 'force-dynamic';

/** Stripe test-mode webhook. Unsigned or stale requests are rejected before parsing. */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }
  const ev = JSON.parse(payload) as StripeEvent;
  const action = actionForEvent(ev);
  if (action.op === 'grant') {
    await grantAccess({ ...action, eventId: ev.id });
  } else if (action.op === 'revoke') {
    await revokeAccess(action.customerId, action.programId, { eventId: ev.id });
  }
  return NextResponse.json({ received: true, action: action.op });
}
