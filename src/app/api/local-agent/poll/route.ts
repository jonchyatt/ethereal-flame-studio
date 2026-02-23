import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentRequest } from '@/lib/local-agent/auth';
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

type LocalAgentDispatch = {
  schemaVersion: number;
  jobId: string;
  audioSignedUrl: string;
  renderConfig: Record<string, unknown>;
  appUrl: string;
  targetAgentId: string | null;
  createdAt: string;
  [key: string]: unknown;
};

function extractLocalAgentDispatch(job: { result?: Record<string, unknown> }): LocalAgentDispatch | null {
  const dispatch = job.result?.localAgentDispatch;
  if (!dispatch || typeof dispatch !== 'object') return null;
  const d = dispatch as Record<string, unknown>;
  if (typeof d.jobId !== 'string' || typeof d.audioSignedUrl !== 'string' || typeof d.appUrl !== 'string') {
    return null;
  }
  if (!d.renderConfig || typeof d.renderConfig !== 'object') {
    return null;
  }
  return d as unknown as LocalAgentDispatch;
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
    const jobs = await store.list({ type: 'render' });
    const eligible = jobs
      .filter((job) => job.status === 'processing' && job.stage === 'awaiting-local-agent')
      .filter((job) => {
        const target = job.metadata.renderTarget;
        if (target !== 'local-agent') return false;
        const targetAgentId = job.metadata.targetAgentId as string | undefined;
        if (targetAgentId) return targetAgentId === agentId;
        return acceptUnassigned;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const jobLeaseTtlMs = getLocalAgentJobLeaseTtlMs();

    for (const job of eligible) {
      const dispatch = extractLocalAgentDispatch(job);
      if (!dispatch) continue;

      const lease = await leaseStore.acquire(getLocalAgentJobLeaseKey(job.jobId), agentId, jobLeaseTtlMs, {
        metadata: {
          jobId: job.jobId,
          agentId,
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
