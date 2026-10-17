import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentRequest } from '@/lib/local-agent/auth';
import { reconcileAbandonedLocalAgentAttempts } from '@/lib/local-agent/jobCallbacks';
import { getStorageAdapter } from '@/lib/storage';
import { UnityRenderPlanSchema } from '@/lib/render/waiaRenderPlan';
import {
  LocalAgentPresencePayloadSchema,
  UnityAgentCapabilitiesSchema,
  getLocalAgentJobLeaseKey,
  getLocalAgentJobLeaseTtlMs,
  getUnityProjectLeaseKey,
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
  unityPlan: UnityRenderPlanSchema.optional(),
}).passthrough().superRefine((value, context) => {
  if (value.renderEngine === 'unity' && !value.unityPlan) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Unity dispatch requires a validated Unity plan' });
  }
});

type LocalAgentDispatch = z.infer<typeof LocalAgentDispatchSchema>;

function extractLocalAgentDispatch(job: { result?: Record<string, unknown> }): LocalAgentDispatch | null {
  const dispatch = job.result?.localAgentDispatch;
  const parsed = LocalAgentDispatchSchema.safeParse(dispatch);
  return parsed.success ? parsed.data : null;
}

function unityCapabilityMatches(capabilities: unknown, dispatch: LocalAgentDispatch) {
  if (dispatch.renderEngine !== 'unity' || !dispatch.unityPlan) return null;
  if (dispatch.unityPlan.target !== dispatch.renderTarget) return null;
  const parsed = UnityAgentCapabilitiesSchema.safeParse(capabilities);
  if (!parsed.success) return null;
  const capability = parsed.data;
  if (!capability.supportedUnityFormats.includes(dispatch.unityPlan.outputFormat)) return null;
  if (!capability.supportedUnityModes.includes(dispatch.unityPlan.mode)) return null;
  if (!capability.supportedUnityPresets.includes(dispatch.unityPlan.preset)) return null;
  if (dispatch.unityPlan.requireVrMetadata && (
    !capability.spatialmediaAvailable || capability.spatialmediaVersion !== '2.1a1'
  )) return null;
  return capability;
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
      const unityCapability = dispatch.renderEngine === 'unity'
        ? unityCapabilityMatches(parsed.data.capabilities, dispatch)
        : null;
      if (dispatch.renderEngine === 'unity' && !unityCapability) continue;
      const projectLeaseKey = unityCapability
        ? getUnityProjectLeaseKey(unityCapability.unityProjectLockId)
        : undefined;
      const projectLease = projectLeaseKey
        ? await leaseStore.acquire(projectLeaseKey, `unity:${attemptId}`, jobLeaseTtlMs, {
          metadata: { jobId: job.jobId, agentId, attemptId, claimedAt: new Date().toISOString() },
        })
        : undefined;
      if (projectLeaseKey && (!projectLease?.acquired || !projectLease.lease)) continue;

      const lease = await leaseStore.acquire(getLocalAgentJobLeaseKey(job.jobId), agentId, jobLeaseTtlMs, {
        metadata: {
          jobId: job.jobId,
          agentId,
          attemptId,
          ...(projectLeaseKey && projectLease?.lease ? {
            unityProjectLeaseKey: projectLeaseKey,
            unityProjectLeaseToken: projectLease.lease.token,
            unityProjectLockId: unityCapability?.unityProjectLockId,
          } : {}),
          claimedAt: new Date().toISOString(),
        },
      });
      if (!lease.acquired || !lease.lease) {
        if (projectLeaseKey && projectLease?.lease) {
          await leaseStore.release(projectLeaseKey, projectLease.lease.token).catch(() => {});
        }
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

      try {
        await store.update(job.jobId, {
          stage: 'rendering-local-agent',
          result: mergedResult,
        });
      } catch (error) {
        await leaseStore.release(lease.lease.leaseKey, lease.lease.token).catch(() => {});
        if (projectLeaseKey && projectLease?.lease) {
          await leaseStore.release(projectLeaseKey, projectLease.lease.token).catch(() => {});
        }
        throw error;
      }

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
