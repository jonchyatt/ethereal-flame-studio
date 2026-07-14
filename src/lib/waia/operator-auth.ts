import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export type WaiaOperatorAuth =
  | { ok: true; actor: string }
  | { ok: false; status: 401 | 503; code: 'UNAUTHORIZED' | 'AUTH_NOT_CONFIGURED'; message: string };

export function authenticateWaiaOperator(request: NextRequest): WaiaOperatorAuth {
  const secret = process.env.WAIA_OPERATOR_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      code: 'AUTH_NOT_CONFIGURED',
      message: 'WAIA operator authentication is not configured',
    };
  }

  const header = request.headers.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' };
  }

  return { ok: true, actor: process.env.WAIA_OPERATOR_ID?.trim() || 'jon' };
}
