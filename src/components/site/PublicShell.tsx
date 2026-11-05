'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AudioAtmosphere } from './AudioAtmosphere';
import { CHANNEL, SITE_NAME } from '@/lib/site/content';

const links = [
  ['/listen', 'Listen'],
  ['/programs', 'Programs'],
  ['/vr', '360°'],
  ['/store', 'Store'],
  ['/merch', 'Merch'],
] as const;
const privatePaths = [
  '/jarvis',
  '/operator',
  '/studio',
  '/create',
  '/pipeline',
  '/creator',
  '/approval-queue',
  '/batch',
  '/playlist-batches',
  '/local-agents',
  '/mist',
  '/scenes',
  '/store/intake',
  '/store/prices',
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    nav.current?.querySelector('a')?.focus();
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  if (
    privatePaths.some(
      (path) => pathname === path || pathname.startsWith(path + '/'),
    ) ||
    pathname.includes('/preview')
  )
    return <>{children}</>;
  return (
    <AudioAtmosphere>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="identity" href="/" aria-label={`${SITE_NAME} — Home`}>
            <img src="/brand/carving/04.png" alt="" width="64" height="64" />
            <span>
              What Am I<br />
              Appreciating Now
            </span>
          </a>
          <button
            ref={toggle}
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <nav
            ref={nav}
            id="primary-nav"
            className={open ? 'primary-nav is-open' : 'primary-nav'}
            aria-label="Main navigation"
          >
            {links.map(([href, text]) => (
              <a
                key={href}
                href={href}
                aria-current={
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'page'
                    : undefined
                }
              >
                {text}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <a className="identity footer-identity" href="/">
              <img src="/brand/carving/04.png" width="56" height="56" alt="" />
              <span>{SITE_NAME}</span>
            </a>
            <p>A question to return to. A moment to notice.</p>
            <p className="meta">Jonathan Hyatt · Operated by Hyatt Studio</p>
          </div>
          <nav aria-label="Explore">
            <a href="/">Home</a>
            {links.map(([href, text]) => (
              <a key={href} href={href}>
                {text}
              </a>
            ))}
            <a href="/about">About</a>
          </nav>
          <nav aria-label="Help and policies">
            <a href="/support">Support</a>
            <a href="/programs/manage">Manage access</a>
            <a href="/legal/terms">Terms</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/refunds">Refunds</a>
            <a href={CHANNEL}>YouTube channel ↗</a>
            <a href="https://resetbiology.com/">Free Reset Biology tools ↗</a>
          </nav>
        </div>
      </footer>
    </AudioAtmosphere>
  );
}
