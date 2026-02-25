/**
 * Reflection Cron Endpoint — Self-Improvement (Phase D-02)
 *
 * Vercel Cron hits this daily at 5 AM UTC.
 * Runs the reflection loop (evaluate → synthesize → evolve rules).
 * Also runs weekly meta-evaluation to monitor self-improvement health.
 *
 * Secured with CRON_SECRET to prevent unauthorized access.
 */

import { NextResponse } from 'next/server';
import { runReflection } from '@/lib/jarvis/intelligence/reflectionLoop';
import { runMetaEvaluation } from '@/lib/jarvis/intelligence/metaEvaluator';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Run reflection loop
  const reflectionResult = await runReflection();
  results.reflection = reflectionResult;

  // Run meta-evaluation (weekly — metaEvaluator checks internally)
  try {
    const metaResult = await runMetaEvaluation();
    if (metaResult) {
      results.metaEvaluation = metaResult;
    }
  } catch (err) {
    console.error('[Reflect Route] Meta-evaluation failed:', err);
    results.metaEvaluation = { error: 'failed' };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
