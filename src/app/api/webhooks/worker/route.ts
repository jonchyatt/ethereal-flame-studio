import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';

// ---------------------------------------------------------------------------
// Webhook payload schema
// ---------------------------------------------------------------------------

const WebhookPayloadSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['complete', 'failed']),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * Returns false if either string is empty or lengths differ.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract the client IP from the request for logging purposes.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/worker
// ---------------------------------------------------------------------------

/**
 * Webhook endpoint for worker/Modal job completion callbacks.
 *
 * Validates INTERNAL_WEBHOOK_SECRET via Bearer token in the Authorization
 * header, then updates job state through the JobStore adapter.
 */
export async function POST(request: NextRequest) {
  // 1. Secret validation (SEC-01)
  const secret = process.env.INTERNAL_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Webhook] INTERNAL_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || !safeCompare(token, secret)) {
    const ip = getClientIp(request);
    console.warn(`[Webhook] Unauthorized request from ${ip}`);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // 2. Payload processing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = WebhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobId, status, result, error } = parsed.data;

  // 3. Verify job exists
  const store = getJobStore();
  const job = await store.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: `Job ${jobId} not found` },
      { status: 404 },
    );
  }

  // 4. Update job state
  console.log(`[Webhook] Received callback for job ${jobId}: ${status}`);

  if (status === 'complete') {
    await store.complete(jobId, result ?? {});
  } else if (status === 'failed') {
    await store.fail(jobId, error ?? 'Unknown error from worker');
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
