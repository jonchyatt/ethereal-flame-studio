import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/subscribers/store';

export const dynamic = 'force-dynamic';

const MESSAGE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Email preferences</title></head><body style="max-width:38rem;margin:3rem auto;padding:0 1rem;font-family:system-ui,sans-serif"><h1>You are unsubscribed.</h1><p>You will not receive further new-session emails from What Am I Appreciating Now.</p></body></html>';

/** A token is intentionally answered generically so it cannot be used to probe the list. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    try { await unsubscribeByToken(token); } catch { /* keep the response generic */ }
  }
  return new NextResponse(MESSAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
