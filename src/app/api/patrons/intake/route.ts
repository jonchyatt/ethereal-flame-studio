import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';
import { buildPatronsFile, decideIntake, listIntake, submitIntake } from '@/lib/patrons/intake';
import { allow, clientKey } from '@/lib/patrons/rateLimit';

export const dynamic = 'force-dynamic';

/** Public: submit name, message, tier and consent. Nothing is shown anywhere until Jonathan approves. */
export async function POST(request: NextRequest) {
  if (!allow(`intake:${clientKey(request.headers)}`)) {
    return NextResponse.json({ ok: false, errors: ['Too many tries. Please come back a little later.'] }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errors: ['Could not read the form'] }, { status: 400 });
  }
  // Honeypot: a hidden field real people leave empty. Pretend success to bots.
  if (typeof body.website === 'string' && body.website.length > 0) {
    return NextResponse.json({ ok: true, consentRef: 'consent_not-recorded' });
  }
  const { website: _w, ...input } = body;
  const result = await submitIntake(getStorageAdapter(), input);
  if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: result.status });
  return NextResponse.json({ ok: true, consentRef: result.consentRef });
}

/** Operator: list submissions, or `?format=patrons` for the render-step patrons.json content. */
export async function GET(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const records = await listIntake(getStorageAdapter());
  if (request.nextUrl.searchParams.get('format') === 'patrons') {
    return NextResponse.json(buildPatronsFile(records));
  }
  return NextResponse.json({ records });
}

/** Operator: { consentRef, decision: 'approve' | 'reject' | 'withdraw' }. */
export async function PATCH(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (typeof body.consentRef !== 'string' || !['approve', 'reject', 'withdraw'].includes(body.decision)) {
    return NextResponse.json({ error: 'consentRef and decision (approve|reject|withdraw) required' }, { status: 400 });
  }
  const res = await decideIntake(getStorageAdapter(), body.consentRef, body.decision);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  return NextResponse.json({ record: res.record });
}
