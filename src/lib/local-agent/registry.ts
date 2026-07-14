import { z } from 'zod';
import type { LeaseStore } from '@/lib/leases';

export const EFS_UNITY_EDITOR_VERSION = '2021.2.8f1' as const;
export const EFS_UNITY_PROJECT_CONTRACT_VERSION = 'efs-path-b-v1' as const;

const SafeAgentTokenSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const UnityPresetSchema = z.enum(['meditation', 'ambient', 'fire_cinema', 'edm']);
const UnityModeSchema = z.enum(['flat', '360mono', '360stereo']);
const UnityOutputFormatSchema = z.enum([
  'flat-1080p-landscape',
  'flat-4k-landscape',
  '360-mono-4k',
  '360-mono-6k',
  '360-mono-8k',
  '360-stereo-8k',
]);

export const UnityAgentCapabilitiesSchema = z.object({
  renderEngines: z.array(z.enum(['puppeteer', 'unity'])).min(1),
  unityEditorVersion: z.literal(EFS_UNITY_EDITOR_VERSION),
  unityProjectContractVersion: z.literal(EFS_UNITY_PROJECT_CONTRACT_VERSION),
  unityProjectLockId: SafeAgentTokenSchema,
  unityExecutionMode: z.enum(['batch', 'headed']),
  bashAvailable: z.literal(true),
  ffmpegAvailable: z.literal(true),
  ffprobeAvailable: z.literal(true),
  spatialmediaAvailable: z.boolean(),
  spatialmediaVersion: z.literal('2.1a1').nullable(),
  supportedUnityPresets: z.array(UnityPresetSchema).min(1),
  supportedUnityFormats: z.array(UnityOutputFormatSchema).min(1),
  supportedUnityModes: z.array(UnityModeSchema).min(1),
}).passthrough().refine((value) => value.renderEngines.includes('unity'), {
  message: 'Unity capability attestation must include the unity engine',
});

export type UnityAgentCapabilities = z.infer<typeof UnityAgentCapabilitiesSchema>;

export const LocalAgentPresencePayloadSchema = z.object({
  agentId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
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

export function getUnityProjectLeaseKey(projectLockId: string): string {
  return `local-agent:unity-project:${SafeAgentTokenSchema.parse(projectLockId)}`;
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
