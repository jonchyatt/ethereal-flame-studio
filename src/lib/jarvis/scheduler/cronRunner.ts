/**
 * Cron Runner — Local Scheduled Tasks
 *
 * Replaces Vercel Cron with node-cron for local deployment.
 * Runs as a standalone PM2 process.
 *
 * Schedules:
 * - Daily 5:00 AM ET: Reflection loop + meta-evaluation + backfill
 * - Every 6 hours: Memory decay check
 *
 * Usage:
 *   npx tsx src/lib/jarvis/scheduler/cronRunner.ts
 */

import cron from 'node-cron';
import { runReflection } from '../intelligence/reflectionLoop';
import { runMetaEvaluation } from '../intelligence/metaEvaluator';

// ---------------------------------------------------------------------------
// Timezone
// ---------------------------------------------------------------------------

const TIMEZONE = 'America/New_York';

// ---------------------------------------------------------------------------
// Daily reflection (5:00 AM ET)
// ---------------------------------------------------------------------------

cron.schedule('0 5 * * *', async () => {
  console.log('[Cron] Starting daily reflection cycle...');

  try {
    // Run reflection loop
    const reflectionResult = await runReflection();
    console.log(`[Cron] Reflection: +${reflectionResult.rulesAdded} rules, ${reflectionResult.rulesSuperseded} superseded`);
    if (reflectionResult.summary) {
      console.log(`[Cron] Summary: ${reflectionResult.summary}`);
    }
  } catch (err) {
    console.error('[Cron] Reflection failed:', err);
  }

  try {
    // Run meta-evaluation (checks if it's been 7+ days internally)
    const metaResult = await runMetaEvaluation();
    if (metaResult?.ran) {
      console.log(`[Cron] Meta-evaluation: health ${metaResult.healthScore}/10`);
    } else if (metaResult === null) {
      console.log('[Cron] Meta-evaluation: skipped (< 7 days since last)');
    }
  } catch (err) {
    console.error('[Cron] Meta-evaluation failed:', err);
  }

  console.log('[Cron] Daily reflection cycle complete.');
}, { timezone: TIMEZONE });

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

console.log('[Cron] Jarvis cron runner started');
console.log('[Cron] Scheduled: daily reflection at 5:00 AM ET');
console.log('[Cron] Timezone:', TIMEZONE);

// Keep the process alive
process.on('SIGINT', () => {
  console.log('[Cron] Shutting down...');
  process.exit(0);
});
