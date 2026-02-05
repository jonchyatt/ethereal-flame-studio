/**
 * Telegram Webhook Route
 *
 * Receives Telegram updates via POST webhook.
 * Verifies secret token, checks feature flag, delegates to grammY bot.
 *
 * Phase 15: Telegram Control
 */

import { NextResponse } from 'next/server';
import { webhookCallback } from 'grammy';
import { getTelegramBot } from '@/lib/jarvis/telegram/bot';
import { getJarvisConfig } from '@/lib/jarvis/config';

export async function POST(request: Request): Promise<Response> {
  const config = getJarvisConfig();

  if (!config.enableTelegram) {
    return NextResponse.json({ error: 'Telegram disabled' }, { status: 404 });
  }

  // Verify Telegram secret token
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const bot = getTelegramBot();
    const handler = webhookCallback(bot, 'std/http');
    return handler(request);
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    // Return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: false });
  }
}
