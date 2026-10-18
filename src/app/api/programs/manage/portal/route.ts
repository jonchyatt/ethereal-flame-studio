import { NextRequest, NextResponse } from 'next/server';
import { loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { createPortalSession, PaymentsNotConfigured } from '@/lib/entitlements/stripe';

export const dynamic = 'force-dynamic';

/** Test-mode billing portal link for the signed-in (cookie) customer. Cancel, update card, invoices live there. */
export async function POST(req: NextRequest) {
  try {
    const customerId = verifyCustomerCookie(req.cookies.get(CUSTOMER_COOKIE)?.value);
    if (!customerId) return NextResponse.json({ error: 'No purchases found on this browser' }, { status: 404 });
    const rec = await loadRecord(customerId);
    if (!rec.providerCustomerId) return NextResponse.json({ error: 'No subscription to manage' }, { status: 404 });
    const { url } = await createPortalSession(rec.providerCustomerId, `${req.nextUrl.origin}/programs/manage`);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof PaymentsNotConfigured || (e as Error).message.includes('ENTITLEMENT_COOKIE_SECRET')) {
      return NextResponse.json({ error: 'Not yet on sale' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Portal unavailable' }, { status: 502 });
  }
}
