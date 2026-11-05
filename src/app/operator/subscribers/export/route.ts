import { NextRequest, NextResponse } from 'next/server';
import { listSubscribers } from '@/lib/subscribers/store';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

function csvCell(value: string | null): string {
  const safe = value || '';
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Kept below /operator so browsers reuse the middleware's HTTP Basic scope. */
export async function GET(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  try {
    const rows = await listSubscribers();
    const body = [
      'email,source_page,created_at,unsubscribed_at',
      ...rows.map((row) => [row.email, row.sourcePage, row.createdAt, row.unsubscribedAt].map(csvCell).join(',')),
    ].join('\r\n');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waia-subscribers.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not export subscribers' }, { status: 503 });
  }
}
