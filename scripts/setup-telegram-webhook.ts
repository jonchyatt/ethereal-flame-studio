/**
 * Register Telegram Webhook URL
 *
 * Run: npx tsx scripts/setup-telegram-webhook.ts
 *
 * Requires environment variables:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_WEBHOOK_URL: Full URL to webhook endpoint
 * - TELEGRAM_WEBHOOK_SECRET: (optional) Secret token for verification
 *
 * Phase 15: Telegram Control
 */

(async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = process.env.TELEGRAM_WEBHOOK_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) { console.error('Set TELEGRAM_BOT_TOKEN'); process.exit(1); }
  if (!url) { console.error('Set TELEGRAM_WEBHOOK_URL'); process.exit(1); }

  const params = new URLSearchParams({
    url,
    allowed_updates: JSON.stringify(['message']),
  });
  if (secret) params.append('secret_token', secret);

  console.log(`Registering webhook: ${url}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params}`);
  const data = await res.json();

  if (data.ok) {
    console.log('Webhook registered successfully.');
    console.log('Description:', data.description);
  } else {
    console.error('Failed to register webhook:', data);
    process.exit(1);
  }
})();
