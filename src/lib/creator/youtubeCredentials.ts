export type YoutubeCredentialSlot = 'primary' | 'waia' | 'critfail';

export function resolveYoutubeCredentialSlot(metadata: { channelKey?: string }): YoutubeCredentialSlot {
  const key = metadata.channelKey ?? 'primary';
  if (key !== 'primary' && key !== 'waia' && key !== 'critfail') {
    throw new Error('Unknown YouTube channelKey; expected primary, waia, or critfail');
  }
  return key;
}

export function youtubeEnvName(slot: YoutubeCredentialSlot, suffix: string): string {
  return `YOUTUBE_PUBLISH_${slot === 'primary' ? '' : `${slot.toUpperCase()}_`}${suffix}`;
}

export function youtubeEnv(slot: YoutubeCredentialSlot, suffix: string): string | undefined {
  return process.env[youtubeEnvName(slot, suffix)]?.trim() || undefined;
}

/** A refresh token takes precedence; never borrow another channel's client or token. */
export function requireYoutubeCredentials(slot: YoutubeCredentialSlot): void {
  if (!youtubeEnv(slot, 'REFRESH_TOKEN') && youtubeEnv(slot, 'ACCESS_TOKEN')) return;
  const missing = ['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN']
    .filter((suffix) => !youtubeEnv(slot, suffix))
    .map((suffix) => youtubeEnvName(slot, suffix));
  if (missing.length) {
    throw new Error(`YouTube ${slot} credentials missing: ${missing.join(', ')}`);
  }
}

export function youtubeCategoryId(slot: YoutubeCredentialSlot): string {
  return youtubeEnv(slot, 'DEFAULT_CATEGORY_ID')
    ?? ({ primary: '10', waia: '22', critfail: '23' } as const)[slot];
}
