/**
 * Which static WAIA page (if any) a request should be rewritten to.
 *
 * "/store" is the store page on every host except the jarvis subdomain. "/" is
 * no longer rewritten: it is the React home page (src/app/page.tsx) inside the
 * one public layout shell. The old static front door stays reachable, noindex,
 * at /preview/front-door so older review links work. The flame visualizer
 * lives at /studio.
 */
export const FRONT_DOOR_PAGE = '/waia-front-door.html';
export const STORE_PAGE = '/waia-store.html';
export const FRONT_DOOR_PREVIEW_PATH = '/preview/front-door';

export interface FrontDoorRewrite {
  page: string;
  /** Preview responses are marked noindex so search engines never list them. */
  noindex: boolean;
}

export function frontDoorRewrite(hostname: string, pathname: string): FrontDoorRewrite | null {
  if (hostname.toLowerCase().startsWith('jarvis.')) return null;
  if (pathname === FRONT_DOOR_PREVIEW_PATH) return { page: FRONT_DOOR_PAGE, noindex: true };
  if (pathname === '/store') return { page: STORE_PAGE, noindex: false };
  return null;
}
