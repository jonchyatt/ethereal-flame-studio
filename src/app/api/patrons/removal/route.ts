import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { requestRemoval } from '@/lib/patrons/intake';
import { allow, clientKey } from '@/lib/patrons/rateLimit';

export const dynamic = 'force-dynamic';

/** Public: remove a patron using their consentRef. Same answer whether or not the code exists. */
export async function POST(request: NextRequest) {
  if (!allow(`removal:${clientKey(request.headers)}`, 10)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  await requestRemoval(getStorageAdapter(), body.consentRef, body.note);
  return NextResponse.json({ ok: true });
}
