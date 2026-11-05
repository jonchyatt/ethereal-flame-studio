'use client';

import { usePathname } from 'next/navigation';
import { WaiaHeader } from './WaiaHeader';

// Studio and operator tools keep their own chrome and never get the public shell.
const NOT_PUBLIC = ['/studio', '/create', '/pipeline', '/creator', '/jarvis', '/operator', '/approval-queue',
  '/batch', '/playlist-batches', '/local-agents', '/scenes', '/mist', '/api', '/e/'];

/** One layout shell for every public What Am I Appreciating Now page: same ground, type and index. */
export function WaiaShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  if (NOT_PUBLIC.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`))) return <>{children}</>;
  return (
    <div className="waia-shell">
      <WaiaHeader home={path === '/'} />
      {children}
    </div>
  );
}
