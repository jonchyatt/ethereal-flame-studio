import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentRequest } from '@/lib/local-agent/auth';
import { reconcileAbandonedLocalAgentAttempts } from '@/lib/local-agent/jobCallbacks';
import { getStorageAdapter } from '@/lib/storage';
import {
  LocalAgentPresencePayloadSchema,
  getLocalAgentJobLeaseKey,
  getLocalAgentJobLeaseTtlMs,
  isLocalAgentDisabled,
  upsertLocalAgentPresence,
} from '@/lib/local-agent/registry';

export const dynamic = 'force-dynamic';

const PollSchema = LocalAgentPresencePayloadSchema.extend({
  acceptUnassigned: z.boolean().default(true),
});

const LocalAgentDispatchSchema = z.object({
  schemaVersion: z.number().int().positive(),
  jobId: z.string().uuid(),
  audioSignedUrl: z.string().url(),
  renderEngine: z.enum(['puppeteer', 'unity']),
  renderTarget: z.enum(['home', 'local-agent']),
  inputArtifact: z.object({
    storageKey: z.string().min(1).max(1024),
    sizeBytes: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  }),
  renderConfig: z.record(z.string(), z.unknown()),
  appUrl: z.string().url(),
  targetAgentId: z.string().min(1).max(128).nullable(),
  createdAt: z.string().datetime(),
}).passthrough();

type LocalAgentDispatch = z.infer<typeof LocalAgentDispatchSchema>;

function extractLocalAgentDispatch(job: { result?: Record<string, unknown> }): LocalAgentDispatch | null {
  const dispatch = job.result?.localAgentDispatch;
  const parsed = LocalAgentDispatchSchema.safeParse(dispatch);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedLocalAgentRequest(request)) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = PollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
    }

    const { agentId, acceptUnassigned } = parsed.data;
    const leaseStore = getLeaseStore();
    const disabledState = await isLocalAgentDisabled(leaseStore, agentId);
    if (disabledState.disabled) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AGENT_DISABLED', message: 'This local agent is disabled' },
          data: { disabled: true, disabledMeta: disabledState.metadata || {} },
        },
        { status: 403 },
      );
    }

    await upsertLocalAgentPresence(leaseStore, parsed.data);

    const store = getJobStore();
    await reconcileAbandonedLocalAgentAttempts({ jobs: store, leases: leaseStore, storage: getStorageAdapter() });
    const jobs = await store.list({ type: 'render' });
    const eligible = jobs
      .filter((job) => job.status === 'processing' && job.stage === 'awaiting-local-agent')
      .filter((job) => {
        const target = job.metadata.renderTarget;
        if (target !== 'home' && target !== 'local-agent') return false;
        const targetAgentId = job.metadata.targetAgentId as string | undefined;
        if (targetAgentId) return targetAgentId === agentId;
        return acceptUnassigned;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const jobLeaseTtlMs = getLocalAgentJobLeaseTtlMs();

    for (const job of eligible) {
      const dispatch = extractLocalAgentDispatch(job);
      if (!dispatch) continue;
      const renderEngines = parsed.data.capabilities?.renderEngines;
      if (!Array.isArray(renderEngines) || !renderEngines.includes(dispatch.renderEngine)) continue;
      const attemptId = randomUUID();

      const lease = await leaseStore.acquire(getLocalAgentJobLeaseKey(job.jobId), agentId, jobLeaseTtlMs, {
        metadata: {
          jobId: job.jobId,
          agentId,
          attemptId,
          claimedAt: new Date().toISOString(),
        },
      });
      if (!lease.acquired || !lease.lease) {
        continue;
      }

      const mergedResult = {
        ...(job.result || {}),
        localAgentDispatch: {
          ...dispatch,
          claimedByAgentId: agentId,
          claimedAttemptId: attemptId,
          claimedAt: new Date().toISOString(),
        },
      };

      await store.update(job.jobId, {
        stage: 'rendering-local-agent',
        result: mergedResult,
      });

      return NextResponse.json({
        success: true,
        data: {
          job: {
            jobId: job.jobId,
            attemptId,
            leaseKey: lease.lease.leaseKey,
            leaseToken: lease.lease.token,
            leaseExpiresAt: lease.lease.expiresAt,
            leaseTtlMs: jobLeaseTtlMs,
            dispatch: mergedResult.localAgentDispatch,
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: { job: null } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
