import crypto from 'crypto';
import { NextRequest } from 'next/server';

export function getLocalAgentSharedSecret(): string {
  const secret = process.env.LOCAL_AGENT_SHARED_SECRET;
  if (!secret) {
    throw new Error('LOCAL_AGENT_SHARED_SECRET is not configured');
  }
  return secret;
}

export function getLocalAgentAdminSecret(): string {
  if (process.env.LOCAL_AGENT_ADMIN_SECRET) {
    return process.env.LOCAL_AGENT_ADMIN_SECRET;
  }
  if (process.env.LOCAL_AGENT_SHARED_SECRET) {
    console.warn('[local-agent/auth] LOCAL_AGENT_ADMIN_SECRET not set — falling back to LOCAL_AGENT_SHARED_SECRET for admin auth. Any agent token can access admin endpoints.');
    return process.env.LOCAL_AGENT_SHARED_SECRET;
  }
  throw new Error('LOCAL_AGENT_ADMIN_SECRET (or LOCAL_AGENT_SHARED_SECRET fallback) is not configured');
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isAuthorizedLocalAgentRequest(request: NextRequest): boolean {
  const secret = process.env.LOCAL_AGENT_SHARED_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return !!token && safeCompare(token, secret);
}

export function isAuthorizedLocalAgentAdminRequest(request: NextRequest): boolean {
  const secret = process.env.LOCAL_AGENT_ADMIN_SECRET || process.env.LOCAL_AGENT_SHARED_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return !!token && safeCompare(token, secret);
}
