import { NextRequest, NextResponse } from 'next/server';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadGuidedSession } from '@/lib/entitlements/guided';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getProgram(id)?.guided) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let customerId: string | null = null;
  try { customerId = verifyCustomerCookie(req.cookies.get(CUSTOMER_COOKIE)?.value); } catch { /* secret unset: fail closed */ }
  if (!customerId || !hasAccess(await loadRecord(customerId), id)) {
    return NextResponse.json({ error: 'Subscription or purchase required' }, { status: 402 });
  }
  const session = await loadGuidedSession(id);
  if (!session) return NextResponse.json({ error: 'Session not yet handed over' }, { status: 404 });
  return NextResponse.json(session, { headers: { 'Cache-Control': 'private, no-store' } });
}
