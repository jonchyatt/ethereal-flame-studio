import { NextRequest, NextResponse } from 'next/server';
import { getProgram } from '@/lib/entitlements/catalog';
import { CUSTOMER_COOKIE, newCustomerId, signCustomerId, verifyCustomerCookie } from '@/lib/entitlements/session';
import { createCheckoutSession, PaymentsNotConfigured } from '@/lib/entitlements/stripe';

export const dynamic = 'force-dynamic';

/** Test-mode checkout. Returns 503 until a Stripe test key is configured. */
export async function POST(req: NextRequest) {
  const { programId } = (await req.json().catch(() => ({}))) as { programId?: string };
  const program = programId ? getProgram(programId) : null;
  if (!program) return NextResponse.json({ error: 'Unknown program' }, { status: 404 });

  let customerId: string | null = null;
  let isNew = false;
  try {
    customerId = verifyCustomerCookie(req.cookies.get(CUSTOMER_COOKIE)?.value);
    if (!customerId) { customerId = newCustomerId(); isNew = true; }
    const origin = req.nextUrl.origin;
    const session = await createCheckoutSession({
      program,
      customerId,
      successUrl: `${origin}/programs/${program.id}?checkout=success`,
      cancelUrl: `${origin}/programs?checkout=cancelled`,
    });
    const res = NextResponse.json({ url: session.url });
    if (isNew) {
      res.cookies.set(CUSTOMER_COOKIE, signCustomerId(customerId), {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 * 2,
      });
    }
    return res;
  } catch (e) {
    if (e instanceof PaymentsNotConfigured || (e as Error).message.includes('ENTITLEMENT_COOKIE_SECRET')) {
      return NextResponse.json({ error: 'Not yet on sale' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 502 });
  }
}
