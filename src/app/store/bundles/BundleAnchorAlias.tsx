'use client';

import { useEffect } from 'react';

// Old links to a renamed bundle anchor still land on it. Kept in this client chunk, not the page HTML.
const OLD_ANCHORS: Record<string, string> = { 'yale-guided-process-gift': 'belief-lock-in-gift' };

export function BundleAnchorAlias() {
  useEffect(() => {
    const to = OLD_ANCHORS[window.location.hash.slice(1)];
    if (to) window.location.replace(`#${to}`);
  }, []);
  return null;
}
