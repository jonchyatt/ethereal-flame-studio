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
import { backfillEmbeddings } from '@/lib/jarvis/memory/embeddings';

export const maxDuration = 45;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret — MUST be configured in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
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

  // Backfill embeddings for memories missing vectors
  try {
    const backfillResult = await backfillEmbeddings();
    results.embeddingBackfill = backfillResult;
  } catch (err) {
    console.error('[Reflect Route] Embedding backfill failed:', err);
    results.embeddingBackfill = { total: 0, processed: 0, failed: 0 };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
