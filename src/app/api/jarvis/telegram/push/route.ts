/**
 * Telegram Push Endpoint
 *
 * POST endpoint for Agent Zero's scheduler to push messages
 * to the Telegram owner. Auth via X-Jarvis-Secret header.
 */

import { NextResponse } from 'next/server';
import { getTelegramBot } from '@/lib/jarvis/telegram/bot';

export async function POST(request: Request): Promise<Response> {
  // Authenticate via shared secret
  const secret = process.env.JARVIS_API_SECRET;
  if (!secret) {
    console.error('[Telegram Push] JARVIS_API_SECRET not configured');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('X-Jarvis-Secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: { message?: string; parse_mode?: 'HTML' | 'Markdown' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { message, parse_mode } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: message' },
      { status: 400 }
    );
  }

  // Resolve owner chat ID
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId) {
    console.error('[Telegram Push] TELEGRAM_OWNER_ID not configured');
    return NextResponse.json(
      { error: 'Owner ID not configured' },
      { status: 500 }
    );
  }

  try {
    const bot = getTelegramBot();
    await bot.api.sendMessage(ownerId, message, {
      ...(parse_mode ? { parse_mode } : {}),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Telegram Push] Send failed:', error);
    return NextResponse.json(
      { error: `Failed to send message: ${errorMessage}` },
      { status: 500 }
    );
  }
}
