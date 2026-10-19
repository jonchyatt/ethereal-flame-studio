'use client';

import { useEffect } from 'react';

type Page = 'store' | 'programs' | 'program' | 'merch';

/** Counts one anonymous view (no cookie, no id). Skipped for Do Not Track and Global Privacy Control. */
export function sendCounter(kind: 'view' | 'notify', page: Page, slug?: string) {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return;
  fetch('/api/counters', {
    method: 'POST', credentials: 'omit', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, page, ...(slug ? { slug } : {}) }),
  }).catch(() => {});
}

export function CounterBeacon({ page, slug }: { page: Page; slug?: string }) {
  useEffect(() => { sendCounter('view', page, slug); }, [page, slug]);
  return null;
}
