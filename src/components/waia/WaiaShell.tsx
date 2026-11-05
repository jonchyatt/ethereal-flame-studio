'use client';

import { usePathname } from 'next/navigation';
import { WaiaHeader } from './WaiaHeader';

// Studio and operator tools keep their own chrome and never get the public shell.
const NOT_PUBLIC = ['/studio', '/create', '/pipeline', '/creator', '/jarvis', '/operator', '/approval-queue',
  '/batch', '/playlist-batches', '/local-agents', '/scenes', '/mist', '/api', '/e/'];

// Each branch opens on its own piece of our art (all files in public/waia-home/).
const BANDS: [string, string][] = [
  ['/programs', 'programs.webp'], ['/merch', 'vortex.webp'], ['/patrons', 'carving-banner.webp'],
  ['/store', 'vortex.webp'], ['/vr', 'vr-equirect.webp'],
];
const band = (path: string) => BANDS.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? 'close.webp';

/** One layout shell for every public What Am I Appreciating Now page: same ground, type and index. */
export function WaiaShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  if (NOT_PUBLIC.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`))) return <>{children}</>;
  return (
    <div className="waia-shell">
      <WaiaHeader home={path === '/'} />
      {path === '/' ? null : (
        <div className="page-band" aria-hidden="true">
          <img src={`/waia-home/${band(path)}`} alt="" decoding="async" />
        </div>
      )}
      {children}
    </div>
  );
}
