import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/subscribers/store';
export const dynamic = 'force-dynamic';
/** Keep old email links working and give every outcome the shared public shell. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    try {
      await unsubscribeByToken(token);
    } catch {
      const retry = new URL('/email-preferences', request.url);
      retry.searchParams.set('status', 'retry');
      retry.searchParams.set('token', token);
      return NextResponse.redirect(retry, 303);
    }
  }
  return NextResponse.redirect(
    new URL('/email-preferences?status=unsubscribed', request.url),
    303,
  );
}
