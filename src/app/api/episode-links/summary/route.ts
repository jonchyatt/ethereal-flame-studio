import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { summarizeClicks } from '@/lib/episode-links/clicks';
import { EPISODES } from '@/lib/episode-links/episodes';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

/** Operator (Bearer): click totals per episode for the last `days` days (default 7, max 90). */
export async function GET(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const days = Number(request.nextUrl.searchParams.get('days')) || 7;
  const summary = await summarizeClicks(getStorageAdapter(), EPISODES.map((e) => e.slug), days);
  return NextResponse.json(summary);
}
