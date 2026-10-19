/**
 * Which static WAIA page (if any) a request should be rewritten to.
 *
 * "/" is the front door and "/store" the store page on every host except the
 * jarvis subdomain (which has its own "/"). The flame visualizer lives at
 * /studio. /preview/front-door is kept, noindex, so older review links work.
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
  if (pathname === '/') return { page: FRONT_DOOR_PAGE, noindex: false };
  if (pathname === '/store') return { page: STORE_PAGE, noindex: false };
  return null;
}
