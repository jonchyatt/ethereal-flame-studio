import { NextRequest, NextResponse } from 'next/server';
import { loadBrief } from '@/lib/custom-orders/brief';
import { suggestQuote } from '@/lib/custom-orders/pricing';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

/** Operator only: the full brief and the calculator's suggested quote. The suggestion is never sent to the customer. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateWaiaOperator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;
  const brief = await loadBrief(id);
  if (!brief) return NextResponse.json({ error: 'No brief for that order' }, { status: 404 });
  return NextResponse.json({ brief, suggestion: suggestQuote(brief) });
}
