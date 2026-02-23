import { z } from 'zod';
import type { LeaseStore } from '@/lib/leases';

export const LocalAgentPresencePayloadSchema = z.object({
  agentId: z.string().min(1).max(128),
  label: z.string().max(200).optional(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
});

export type LocalAgentPresencePayload = z.infer<typeof LocalAgentPresencePayloadSchema>;

export function getLocalAgentPresenceLeaseKey(agentId: string): string {
  return `local-agent:presence:${agentId}`;
}

export function getLocalAgentJobLeaseKey(jobId: string): string {
  return `local-agent:job:${jobId}`;
}

export function getLocalAgentDisabledLeaseKey(agentId: string): string {
  return `local-agent:disabled:${agentId}`;
}

export function getLocalAgentPresenceTtlMs(): number {
  return Number(process.env.LOCAL_AGENT_PRESENCE_TTL_MS) || 90_000;
}

export function getLocalAgentJobLeaseTtlMs(): number {
  // Short default lease so dead agents are recovered quickly; agent renews while rendering.
  return Number(process.env.LOCAL_AGENT_JOB_LEASE_TTL_MS) || 10 * 60 * 1000;
}

export function getLocalAgentDisabledFlagTtlMs(): number {
  return Number(process.env.LOCAL_AGENT_DISABLED_TTL_MS) || 365 * 24 * 60 * 60 * 1000;
}

function buildPresenceMetadata(payload: LocalAgentPresencePayload): Record<string, unknown> {
  return {
    agentId: payload.agentId,
    label: payload.label || null,
    capabilities: payload.capabilities || {},
    lastSeenAt: new Date().toISOString(),
  };
}

export async function upsertLocalAgentPresence(
  leaseStore: LeaseStore,
  payload: LocalAgentPresencePayload,
) {
  const ttlMs = getLocalAgentPresenceTtlMs();
  return leaseStore.acquire(getLocalAgentPresenceLeaseKey(payload.agentId), payload.agentId, ttlMs, {
    metadata: buildPresenceMetadata(payload),
  });
}

export async function isLocalAgentDisabled(leaseStore: LeaseStore, agentId: string): Promise<{
  disabled: boolean;
  metadata?: Record<string, unknown>;
}> {
  const lease = await leaseStore.get(getLocalAgentDisabledLeaseKey(agentId));
  if (!lease) return { disabled: false };
  const expired = new Date(lease.expiresAt).getTime() <= Date.now();
  if (expired) return { disabled: false };
  return { disabled: true, metadata: lease.metadata || {} };
}

export async function setLocalAgentDisabled(
  leaseStore: LeaseStore,
  agentId: string,
  disabled: boolean,
  details?: { reason?: string | null; actorId?: string | null },
): Promise<{ disabled: boolean; expiresAt: string | null; metadata?: Record<string, unknown> }> {
  const leaseKey = getLocalAgentDisabledLeaseKey(agentId);

  if (!disabled) {
    const existing = await leaseStore.get(leaseKey);
    if (existing) {
      await leaseStore.release(leaseKey, existing.token).catch(() => {});
    }
    return { disabled: false, expiresAt: null };
  }

  const acquired = await leaseStore.acquire(leaseKey, details?.actorId || `admin:${agentId}`, getLocalAgentDisabledFlagTtlMs(), {
    metadata: {
      agentId,
      reason: details?.reason || null,
      disabledAt: new Date().toISOString(),
      disabledBy: details?.actorId || 'admin',
    },
  });

  return {
    disabled: true,
    expiresAt: acquired.lease?.expiresAt || null,
    metadata: acquired.lease?.metadata || undefined,
  };
}
