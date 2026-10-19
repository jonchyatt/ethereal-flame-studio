import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { parseEvent, recordEvent, shouldCount } from '@/lib/counters/model';
import { allow, clientKey } from '@/lib/patrons/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Public beacon. Always answers 204 with no body and sets no cookie, whether or not the
 * event was counted, so the response reveals nothing. The caller's address is used only
 * for the in-memory rate limit and is never stored.
 */
export async function POST(request: NextRequest) {
  const quiet = new NextResponse(null, { status: 204 });
  if (!shouldCount(request.headers)) return quiet;
  if (!allow(`counters:${clientKey(request.headers)}`, 120, 60 * 60 * 1000)) return quiet;
  const parsed = parseEvent(await request.json().catch(() => null));
  if (!parsed.ok) return quiet;
  try {
    await recordEvent(getStorageAdapter(), parsed.event);
  } catch { /* a counter must never break a page */ }
  return quiet;
}
