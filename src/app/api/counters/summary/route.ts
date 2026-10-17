import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { saveWeeklySummary, summarizeWeek } from '@/lib/counters/summary';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

/** Operator (Bearer): weekly summary for the seven days ending `end` (default today, UTC). `save=1` also stores it. */
export async function GET(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const end = request.nextUrl.searchParams.get('end') ?? undefined;
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return NextResponse.json({ error: 'end must be YYYY-MM-DD' }, { status: 400 });
  const storage = getStorageAdapter();
  const summary = await summarizeWeek(storage, end);
  const savedAs = request.nextUrl.searchParams.get('save') === '1' ? await saveWeeklySummary(storage, summary) : undefined;
  return NextResponse.json({ summary, savedAs });
}
