let warnedAboutMissingNotificationConfig = false;

/** Optional best-effort owner alert. It never changes the visitor's result. */
export async function notifyOwnerOfNewSubscriber(sourcePage: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = process.env.WAIA_NOTIFY_TO?.trim();
  if (!apiKey || !recipient) {
    if (!warnedAboutMissingNotificationConfig) {
      console.info('[Subscribers] Owner notifications are disabled until RESEND_API_KEY and WAIA_NOTIFY_TO are set.');
      warnedAboutMissingNotificationConfig = true;
    }
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WAIA <onboarding@resend.dev>',
        to: [recipient],
        subject: 'WAIA: new subscriber',
        text: `New subscriber from ${sourcePage}`,
      }),
    });
    if (!response.ok) console.error('[Subscribers] Owner notification request was not accepted.');
  } catch {
    console.error('[Subscribers] Owner notification request failed.');
  }
}
