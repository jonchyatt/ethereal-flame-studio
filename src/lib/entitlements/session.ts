import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Anonymous customer identity: an opaque id in an HMAC-signed cookie. No
 * accounts, no email. Fail-closed: without ENTITLEMENT_COOKIE_SECRET nothing
 * can be signed or verified, so nothing opens.
 */

export const CUSTOMER_COOKIE = 'waia_customer';

function secret(): string {
  const s = process.env.ENTITLEMENT_COOKIE_SECRET;
  if (!s || s.length < 16) throw new Error('ENTITLEMENT_COOKIE_SECRET is not set (16+ characters)');
  return s;
}

const sign = (id: string) => createHmac('sha256', secret()).update(id).digest('base64url');

export function newCustomerId(): string {
  return `cus_${randomBytes(16).toString('hex')}`;
}

export function signCustomerId(id: string): string {
  return `${id}.${sign(id)}`;
}

/** Returns the customer id, or null for anything missing, malformed or forged. */
export function verifyCustomerCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const i = value.lastIndexOf('.');
  if (i < 1) return null;
  const id = value.slice(0, i);
  const given = Buffer.from(value.slice(i + 1));
  const want = Buffer.from(sign(id));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return /^cus_[0-9a-f]{32}$/.test(id) ? id : null;
}
