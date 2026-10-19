/**
 * Which static WAIA page (if any) a request should be rewritten to.
 *
 * The bare apex always serves the front door and store page. The www host
 * serves them only when WAIA_WWW_FRONT_DOOR is "on"; otherwise www keeps the
 * flame visualizer at "/". The private preview path works on www whatever the
 * flag says, so the page can be reviewed before the public homepage flips.
 */
const APEX = 'whatamiappreciatingnow.com';
const WWW = `www.${APEX}`;

export const FRONT_DOOR_PAGE = '/waia-front-door.html';
export const STORE_PAGE = '/waia-store.html';
export const FRONT_DOOR_PREVIEW_PATH = '/preview/front-door';

export function wwwFrontDoorEnabled(flag: string | undefined = process.env.WAIA_WWW_FRONT_DOOR): boolean {
  return (flag ?? '').trim().toLowerCase() === 'on';
}

export interface FrontDoorRewrite {
  page: string;
  /** Preview responses are marked noindex so search engines never list them. */
  noindex: boolean;
}

export function frontDoorRewrite(
  hostname: string,
  pathname: string,
  flag: string | undefined = process.env.WAIA_WWW_FRONT_DOOR,
): FrontDoorRewrite | null {
  const host = hostname.toLowerCase().replace(/:\d+$/, '');
  const isApex = host === APEX;
  const isWww = host === WWW;
  if (!isApex && !isWww) return null;

  if (isWww && pathname === FRONT_DOOR_PREVIEW_PATH) return { page: FRONT_DOOR_PAGE, noindex: true };

  const live = isApex || wwwFrontDoorEnabled(flag);
  if (!live) return null;
  if (pathname === '/') return { page: FRONT_DOOR_PAGE, noindex: false };
  if (pathname === '/store') return { page: STORE_PAGE, noindex: false };
  return null;
}
