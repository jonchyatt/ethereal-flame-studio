/**
 * Brain Health API — Intelligence Observatory (G-04)
 *
 * GET /api/jarvis/health
 * Returns lightweight stats about DB connectivity, brain activity, and memory state.
 * No auth required — read-only aggregate stats, single-user system.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/jarvis/memory/db';
import { conversationEvaluations, behaviorRules, memoryEntries } from '@/lib/jarvis/memory/schema';
import { sql, eq, desc, and, isNull } from 'drizzle-orm';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  // ── DB connectivity ──────────────────────────────────────────────────
  let dbConnected = false;
  let db;
  try {
    db = getDb();
    // Lightweight connectivity check
    await db.all(sql`SELECT 1`);
    dbConnected = true;
  } catch (err) {
    console.error('[Health] DB connection failed:', err);
    return NextResponse.json({
      db: { connected: false },
      brain: null,
      memory: null,
      timestamp,
    });
  }

  // ── Brain stats ──────────────────────────────────────────────────────
  let brain = null;
  try {
    // Evaluation count + latest timestamp
    const evalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationEvaluations);
    const evaluationCount = evalCountResult[0]?.count ?? 0;

    const latestEval = await db
      .select({ evaluatedAt: conversationEvaluations.evaluatedAt })
      .from(conversationEvaluations)
      .orderBy(desc(conversationEvaluations.evaluatedAt))
      .limit(1);

    // Active rules count
    const activeRulesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(behaviorRules)
      .where(eq(behaviorRules.isActive, 1));
    const activeRules = activeRulesResult[0]?.count ?? 0;

    // Last reflection = latest behavior rule created (reflection creates rules)
    const latestRule = await db
      .select({ createdAt: behaviorRules.createdAt })
      .from(behaviorRules)
      .orderBy(desc(behaviorRules.createdAt))
      .limit(1);

    // Meta-eval: read the actual meta-evaluator findings from behavior_rules
    // (meta-evaluator stores reports with category='meta_evaluation')
    let lastMetaEval = null;
    try {
      const metaRows = await db
        .select()
        .from(behaviorRules)
        .where(eq(behaviorRules.category, 'meta_evaluation'))
        .orderBy(desc(behaviorRules.createdAt))
        .limit(1);
      if (metaRows.length > 0) {
        const report = JSON.parse(metaRows[0].rule) as {
          healthScore: number;
          diagnosis: string;
          recommendations: string[];
          adjustments: Array<{ parameter: string; currentValue: string; suggestedValue: string; reason: string }>;
          timestamp: string;
        };
        lastMetaEval = {
          healthScore: report.healthScore,
          diagnosis: report.diagnosis,
          recommendations: report.recommendations,
          adjustments: report.adjustments,
          timestamp: report.timestamp || metaRows[0].createdAt,
        };
      }
    } catch {
      // No meta-evaluation data yet — that's fine
    }

    brain = {
      lastEvaluation: latestEval[0]?.evaluatedAt ?? null,
      evaluationCount,
      activeRules,
      lastReflection: latestRule[0]?.createdAt ?? null,
      lastMetaEval,
    };
  } catch (err) {
    console.error('[Health] Brain stats query failed:', err);
    brain = { error: 'query_failed' };
  }

  // ── Memory stats ─────────────────────────────────────────────────────
  let memory = null;
  try {
    // Total active memory entries
    const memCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(memoryEntries)
      .where(isNull(memoryEntries.deletedAt));
    const totalEntries = memCountResult[0]?.count ?? 0;

    // Embedding count (raw SQL — memory_embeddings is outside Drizzle)
    let embeddingCount = 0;
    try {
      const embResult = await db.all(
        sql`SELECT count(*) as count FROM memory_embeddings`
      ) as Array<{ count: number }>;
      embeddingCount = embResult[0]?.count ?? 0;
    } catch {
      // Table may not exist yet
    }

    const vectorCoverage = totalEntries > 0
      ? Math.round((embeddingCount / totalEntries) * 100)
      : 0;

    memory = {
      totalEntries,
      embeddingCount,
      vectorCoverage,
    };
  } catch (err) {
    console.error('[Health] Memory stats query failed:', err);
    memory = { error: 'query_failed' };
  }

  return NextResponse.json({
    db: { connected: dbConnected },
    brain,
    memory,
    timestamp,
  });
}
