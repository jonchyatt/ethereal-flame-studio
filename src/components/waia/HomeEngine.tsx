'use client';

import { useEffect } from 'react';

type ScrollCraftGlobal = { mount: (root: Element) => unknown };

/**
 * Loads the unmodified Scrollcraft engine (public/scrollcraft/scrollcraft.js)
 * and mounts it on the home page markup. The engine reads data-sc-* attributes
 * and never builds DOM, so it can drive server-rendered markup after hydration.
 * Also: one practice plays at a time.
 */
export function HomeEngine() {
  useEffect(() => {
    const root = document.getElementById('waia-home');
    if (!root || root.dataset.scMounted) return;
    const w = window as unknown as { ScrollCraft?: ScrollCraftGlobal };
    const mount = () => {
      if (!w.ScrollCraft || root.dataset.scMounted) return;
      root.dataset.scMounted = '1';
      w.ScrollCraft.mount(root);
    };
    // ponytail: the engine has no unmount; a client-side return to "/" mounts a
    // fresh instance on the new markup and the old one idles on detached nodes.
    if (w.ScrollCraft) mount();
    else {
      const s = document.createElement('script');
      s.src = '/scrollcraft/scrollcraft.js';
      s.onload = mount;
      document.body.appendChild(s);
    }
    const onPlay = (e: Event) => {
      root.querySelectorAll<HTMLVideoElement>('video[data-practice]').forEach((v) => { if (v !== e.target) v.pause(); });
    };
    root.addEventListener('play', onPlay, true);
    return () => root.removeEventListener('play', onPlay, true);
  }, []);
  return null;
}
