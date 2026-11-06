'use client';

import { useEffect, useRef, useState } from 'react';

type Engine = { mount: (root: Element) => { layout: () => void } };
declare global { interface Window { ScrollCraft?: Engine } }

let engineReady: Promise<void> | undefined;
function loadEngine() {
  if (window.ScrollCraft) return Promise.resolve();
  if (!engineReady) engineReady = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/scrollcraft/scrollcraft.js';
    script.onload = () => resolve();
    script.onerror = () => { engineReady = undefined; script.remove(); reject(new Error('Scrollcraft unavailable')); };
    document.head.appendChild(script);
  });
  return engineReady;
}

type Action = { node: HTMLElement; label: string; href?: string; target?: string; rel?: string; disabled: boolean; visible: boolean };
const selectors = '.hero-action .primary, .player-actions > button:first-child, form button[type="submit"], [data-sc-primary], .actions > .primary, .program-hero .primary, .sc-about .primary, .vr-card .primary';

/** Motion never gates content. The dock invokes the original control, including validation. */
export function ScrollExperience() {
  const marker = useRef<HTMLSpanElement>(null);
  const [action, setAction] = useState<Action | null>(null);
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>('main');
    if (!root) return;
    let disposed = false;
    let frame = 0;
    let api: { layout: () => void } | undefined;
    const surface = root.closest('.public-site') || root;
    // The salvaged engine owns document-scoped listeners and has no destroy API.
    // Keep public links as native document navigation so it never accumulates instances.
    const nativeNavigation = (event: Event) => {
      const link = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
      if (link && new URL(link.href).pathname !== location.pathname) event.stopPropagation();
    };
    surface.addEventListener('click', nativeNavigation, true);

    void loadEngine().then(() => {
      if (disposed || root.dataset.scMounted) return;
      root.dataset.scMounted = 'true';
      api = window.ScrollCraft?.mount(root);
    }).catch(() => { /* All content and controls already work without the engine. */ });

    const rendered = (node: HTMLElement) => node.getClientRects().length > 0 && !node.closest('[hidden]');
    function update() {
      frame = 0;
      if (!root || disposed) return;
      const begunPlayer = root.querySelector('.begin-panel:not([hidden]) .player-actions > button');
      const candidates = [...root.querySelectorAll<HTMLElement>(selectors)].filter(node => rendered(node) && !(begunPlayer && node.closest('.hero-action')));
      const focusedForm = document.activeElement?.closest('form');
      const focusedSubmit = focusedForm?.querySelector<HTMLElement>('button[type="submit"]');
      const playing = [...root.querySelectorAll<HTMLMediaElement>('video,audio')].find(media => !media.paused && !media.ended);
      const playingButton = playing?.closest('.media-player')?.querySelector<HTMLElement>('.player-actions > button');
      // Prefer the current working section; keep the selected player within reach.
      const near = candidates.find(node => {
        const section = node.closest('section,article,form') || node;
        const r = section.getBoundingClientRect();
        return r.top < innerHeight * .55 && r.bottom > innerHeight * .4;
      });
      const node = playingButton || (focusedSubmit && rendered(focusedSubmit) ? focusedSubmit : near) || candidates[0];
      if (!node) { setAction(null); return; }
      const r = node.getBoundingClientRect();
      const visible = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
      const next = {
        node, visible, label: node.textContent?.replace(/\s+/g, ' ').trim() || '',
        href: node instanceof HTMLAnchorElement ? node.href : undefined,
        target: node instanceof HTMLAnchorElement ? node.target : undefined,
        rel: node instanceof HTMLAnchorElement ? node.rel : undefined,
        disabled: node instanceof HTMLButtonElement && node.disabled,
      };
      setAction(old => old && old.node === next.node && old.visible === next.visible && old.label === next.label && old.disabled === next.disabled ? old : next);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const mutations = new MutationObserver(schedule);
    // Don't observe style: the engine writes progress every frame.
    mutations.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'aria-pressed'] });
    const resize = new ResizeObserver(() => { api?.layout(); schedule(); });
    resize.observe(root);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    root.addEventListener('focusin', schedule);
    root.addEventListener('change', schedule);
    root.addEventListener('play', schedule, true);
    root.addEventListener('pause', schedule, true);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      mutations.disconnect(); resize.disconnect();
      surface.removeEventListener('click', nativeNavigation, true);
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      root.removeEventListener('focusin', schedule); root.removeEventListener('change', schedule);
      root.removeEventListener('play', schedule, true); root.removeEventListener('pause', schedule, true);
    };
  }, []);
  return (
    <>
      <span ref={marker} hidden />
      {action && !action.visible && action.label && (
        <div className="sc-action-dock" data-sc-action-dock>
          {action.href ? <a className="button primary" href={action.href} target={action.target} rel={action.rel}>{action.label}</a> : (
            <button className="button primary" type="button" disabled={action.disabled} onClick={() => {
              action.node.click();
              // Error/status and the original control remain discoverable after submission.
              requestAnimationFrame(() => {
                const active = document.activeElement;
                if (active instanceof HTMLElement && active.matches('input,textarea,select')) active.scrollIntoView({ block: 'center', behavior: 'instant' });
              });
            }}>{action.label}</button>
          )}
        </div>
      )}
    </>
  );
}
