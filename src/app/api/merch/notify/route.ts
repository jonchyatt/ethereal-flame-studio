import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { recordTap } from '@/lib/merch/notify';
import { allow, clientKey } from '@/lib/patrons/rateLimit';

export const dynamic = 'force-dynamic';

/** Public: count one "notify me" tap for a product (and optionally a size). Stores nothing about the person. */
export async function POST(request: NextRequest) {
  if (!allow(`merch-notify:${clientKey(request.headers)}`, 20)) {
    return NextResponse.json({ ok: false, error: 'Too many taps. Please come back a little later.' }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  try {
    const result = await recordTap(getStorageAdapter(), body);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not count that right now.' }, { status: 503 });
  }
}
