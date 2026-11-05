import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { notifyOwnerOfNewSubscriber } from '@/lib/subscribers/notify';
import { allowSubscribe, subscriberClientKey } from '@/lib/subscribers/rateLimit';
import { saveSubscriber } from '@/lib/subscribers/store';

export const dynamic = 'force-dynamic';

const emailSchema = z.string().trim().email('Please enter a valid email address.').transform((email) => email.toLowerCase());
const THANK_YOU = 'Thanks — you’re on the list.';

function sourcePage(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const page = value.trim();
  return page.startsWith('/') && !page.startsWith('//') && !/[\r\n]/.test(page) && page.length <= 200 ? page : 'unknown';
}

function userAgent(request: NextRequest): string | null {
  const value = request.headers.get('user-agent')?.trim();
  return value ? value.slice(0, 500) : null;
}

/** Public email capture. Successful submissions deliberately have one identical response. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  // Honeypot: do not disclose whether a bot field was detected.
  if (typeof input.website === 'string' && input.website.trim()) {
    return NextResponse.json({ ok: true, message: THANK_YOU });
  }

  if (!allowSubscribe(subscriberClientKey(request.headers))) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Please try again in an hour.' }, { status: 429 });
  }

  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const page = sourcePage(input.sourcePage);
  try {
    const saved = await saveSubscriber({ email: parsedEmail.data, sourcePage: page, userAgent: userAgent(request) });
    if (saved.created) await notifyOwnerOfNewSubscriber(page);
    return NextResponse.json({ ok: true, message: THANK_YOU });
  } catch {
    // Do not log request bodies: they contain the visitor's email address.
    return NextResponse.json({ ok: false, error: 'We could not save that right now. Please try again shortly.' }, { status: 503 });
  }
}
