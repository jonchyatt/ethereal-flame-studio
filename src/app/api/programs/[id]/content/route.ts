import { NextRequest, NextResponse } from 'next/server';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadProgramContent } from '@/lib/entitlements/content';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getProgram(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let customerId: string | null = null;
  try { customerId = verifyCustomerCookie(req.cookies.get(CUSTOMER_COOKIE)?.value); } catch { /* secret unset: fail closed */ }
  if (!customerId || !hasAccess(await loadRecord(customerId), id)) {
    return NextResponse.json({ error: 'Subscription or purchase required' }, { status: 402 });
  }
  const content = await loadProgramContent(id);
  if (!content) return NextResponse.json({ error: 'Content not yet handed over' }, { status: 404 });
  return new NextResponse(content, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
