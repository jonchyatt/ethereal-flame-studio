'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/jarvis/stores/toastStore';

const SESSION_KEY = 'jarvis-health-checked';
const DELAY_MS = 3000; // Don't compete with briefing fetch

interface HealthResponse {
  db: { connected: boolean };
  brain: {
    lastEvaluation: string | null;
    evaluationCount: number;
    activeRules: number;
    lastReflection: string | null;
    lastMetaEval: { timestamp: string } | null;
  } | null;
  memory: {
    totalEntries: number;
    embeddingCount: number;
    vectorCoverage: number;
  } | null;
}

export function useHealthMonitor(): void {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // Only run once per browser session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/jarvis/health');
        if (!res.ok) return; // Silent on fetch error
        const health: HealthResponse = await res.json();
        const action = { label: 'Details', onClick: () => routerRef.current.push('/jarvis/app/settings') };

        // Check anomalies — most critical wins, only ONE toast
        if (!health.db.connected) {
          toast.error('Brain offline — database unreachable', { action, duration: 8000 });
          return;
        }

        if (health.brain?.lastReflection) {
          const hoursSince = (Date.now() - new Date(health.brain.lastReflection).getTime()) / (1000 * 60 * 60);
          if (hoursSince > 48) {
            toast.warning("Self-improvement hasn't run in 2+ days", { action, duration: 6000 });
            return;
          }
        }

        if (health.brain && health.brain.activeRules === 0 && health.brain.evaluationCount > 0) {
          toast.warning("Reflection hasn't produced rules yet", { action, duration: 6000 });
          return;
        }

        if (health.memory && health.memory.vectorCoverage === 0 && health.memory.totalEntries > 5) {
          toast.info('Memory search running in basic mode', { action, duration: 5000 });
          return;
        }

        if (health.brain && health.brain.evaluationCount === 0) {
          toast.info('Brain is new — have conversations to start learning', { action, duration: 5000 });
          return;
        }
      } catch {
        // Silent — don't toast about the health check itself failing
      }
    }, DELAY_MS);

    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- must run exactly once; router accessed via ref
}
