/**
 * Operator-only pages (tools, queues, intake forms). Their APIs already demand
 * the operator key; this keeps the page shells themselves off the public web.
 *
 * Signed in = HTTP Basic auth whose password is WAIA_OPERATOR_SECRET (any user
 * name). No secret configured → the pages answer 404, except in local dev.
 * Runs in middleware (edge), so no Node crypto here.
 */
const OPERATOR_PREFIXES = ['/operator', '/approval-queue', '/creator', '/pipeline', '/local-agents', '/store/intake'];

export type OperatorPageDecision = 'allow' | 'not-found' | 'challenge';

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isOperatorPage(hostname: string, pathname: string): boolean {
  if (OPERATOR_PREFIXES.some((p) => underPrefix(pathname, p))) return true;
  // The Jarvis app has its own host; on the public site its pages stay private.
  return underPrefix(pathname, '/jarvis') && !hostname.toLowerCase().startsWith('jarvis.');
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function basicPassword(authorization: string | null): string | null {
  if (!authorization?.startsWith('Basic ')) return null;
  try {
    const decoded = atob(authorization.slice(6).trim());
    const colon = decoded.indexOf(':');
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

export function operatorPageDecision(
  hostname: string,
  pathname: string,
  authorization: string | null,
  secret: string | undefined = process.env.WAIA_OPERATOR_SECRET,
  isDev: boolean = process.env.NODE_ENV === 'development',
): OperatorPageDecision {
  if (!isOperatorPage(hostname, pathname)) return 'allow';
  const key = secret?.trim();
  if (!key) return isDev ? 'allow' : 'not-found';
  const supplied = basicPassword(authorization);
  return supplied !== null && sameString(supplied, key) ? 'allow' : 'challenge';
}
