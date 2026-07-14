import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import type { AudioPrepJob, JobStore } from '@/lib/jobs';
import type { LeaseRecord, LeaseStore } from '@/lib/leases';
import type { StorageAdapter } from '@/lib/storage';
import {
  abortR2MultipartUpload,
  completeR2MultipartUpload,
  createR2MultipartUpload,
  getLocalAgentMultipartPartSizeBytes,
  getLocalAgentMultipartThresholdBytes,
  isR2MultipartAvailable,
  type MultipartPartETag,
} from '@/lib/storage/r2Multipart';
import { getLocalAgentJobLeaseKey, getLocalAgentJobLeaseTtlMs } from './registry';

const SafeAgentIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const AttemptIdSchema = z.string().uuid();
const LeaseTokenSchema = z.string().min(16).max(256);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const SafeMp4FilenameSchema = z.string().min(5).max(180).regex(/^[A-Za-z0-9_.-]+\.mp4$/i);
const StorageKeySchema = z.string().min(1).max(1024).regex(/^renders\/[0-9a-f-]+\/[0-9a-f-]+\/[A-Za-z0-9_.-]+\.mp4$/i);
const UploadIdSchema = z.string().min(1).max(1024);
const MAX_UPLOAD_BYTES = Number(process.env.STORAGE_UPLOAD_MAX_BYTES) || 500 * 1024 * 1024;

export const LocalAgentAttemptSchema = z.object({
  agentId: SafeAgentIdSchema,
  leaseToken: LeaseTokenSchema,
  attemptId: AttemptIdSchema,
});
export type LocalAgentAttempt = z.infer<typeof LocalAgentAttemptSchema>;

export const LocalAgentUploadRequestSchema = LocalAgentAttemptSchema.extend({
  filename: SafeMp4FilenameSchema,
  contentType: z.literal('video/mp4'),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const LocalAgentMultipartCompleteSchema = LocalAgentAttemptSchema.extend({
  storageKey: StorageKeySchema,
  uploadId: UploadIdSchema,
  parts: z.array(z.object({
    partNumber: z.number().int().positive().max(10_000),
    etag: z.string().min(1).max(1024),
  })).min(1).max(10_000),
});

export const LocalAgentMultipartAbortSchema = LocalAgentAttemptSchema.extend({
  storageKey: StorageKeySchema,
  uploadId: UploadIdSchema,
});

export const LocalAgentCompleteSchema = LocalAgentAttemptSchema.extend({
  storageKey: StorageKeySchema,
  fileSizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  fileSha256: Sha256Schema,
  acceptanceReceipt: z.record(z.string(), z.unknown()).optional(),
});

export const LocalAgentFailSchema = LocalAgentAttemptSchema.extend({
  error: z.string().min(1).max(4000),
});

export type LocalAgentCallbackDeps = {
  jobs: JobStore;
  leases: LeaseStore;
  storage: StorageAdapter;
};

type LocalAgentUploadState = {
  attemptId: string;
  agentId: string;
  storageKey: string;
  sizeBytes: number;
  contentType: 'video/mp4';
  strategy: 'single-put' | 'multipart';
  status: 'reserved' | 'uploaded' | 'aborted';
  uploadId?: string;
  createdAt: string;
  updatedAt: string;
};

type OwnedAttempt = {
  job: AudioPrepJob;
  lease: LeaseRecord;
  identity: LocalAgentAttempt;
};

export class LocalAgentCallbackError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function leaseTokenHash(token: string): string {
  return sha256(token);
}

function attemptPrefix(jobId: string, attemptId: string): string {
  return `renders/${jobId}/${attemptId}`;
}

function expectedStorageKey(jobId: string, attemptId: string, filename: string): string {
  return `${attemptPrefix(jobId, attemptId)}/${filename}`;
}

function uploadState(job: AudioPrepJob): LocalAgentUploadState | undefined {
  const state = job.result?.localAgentUpload;
  return state && typeof state === 'object' ? state as LocalAgentUploadState : undefined;
}

function withResult(job: AudioPrepJob, additions: Record<string, unknown>): Record<string, unknown> {
  return { ...(job.result || {}), ...additions };
}

async function loadOwnedAttempt(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  rawIdentity: unknown,
): Promise<OwnedAttempt> {
  const identity = LocalAgentAttemptSchema.parse(rawIdentity);
  const job = await deps.jobs.get(jobId);
  if (!job || job.type !== 'render') {
    throw new LocalAgentCallbackError('NOT_FOUND', 'Render job not found', 404);
  }
  const lease = await deps.leases.get(getLocalAgentJobLeaseKey(jobId));
  if (!lease) throw new LocalAgentCallbackError('LEASE_NOT_FOUND', 'Job lease is missing or expired', 409);
  if (new Date(lease.expiresAt).getTime() <= Date.now()) {
    throw new LocalAgentCallbackError('LEASE_EXPIRED', 'Job lease is expired', 409);
  }
  if (lease.ownerId !== identity.agentId || !safeEqual(lease.token, identity.leaseToken)) {
    throw new LocalAgentCallbackError('LEASE_MISMATCH', 'Job lease does not belong to this agent', 403);
  }
  if (lease.metadata?.attemptId !== identity.attemptId) {
    throw new LocalAgentCallbackError('ATTEMPT_MISMATCH', 'Job lease does not bind this attempt', 409);
  }
  if (job.status === 'cancelled') {
    await cleanupAttempt(deps, job, identity);
    const reservation = uploadState(job);
    if (reservation) {
      await deps.jobs.update(jobId, {
        result: withResult(job, {
          localAgentUpload: { ...reservation, status: 'aborted', updatedAt: new Date().toISOString() },
        }),
      });
    }
    await releaseAttempt(deps, jobId, identity.leaseToken);
    throw new LocalAgentCallbackError('JOB_CANCELLED', 'Render job was cancelled; attempt artifacts were cleaned', 409);
  }
  if (job.status !== 'processing' || !['awaiting-local-agent', 'rendering-local-agent'].includes(job.stage || '')) {
    throw new LocalAgentCallbackError('INVALID_JOB_STATE', `Render job cannot accept agent callbacks from ${job.status}/${job.stage}`, 409);
  }
  return { job, lease, identity };
}

function assertReservation(
  job: AudioPrepJob,
  identity: LocalAgentAttempt,
  storageKey: string,
  uploadId?: string,
): LocalAgentUploadState {
  const reservation = uploadState(job);
  if (!reservation || reservation.attemptId !== identity.attemptId || reservation.agentId !== identity.agentId) {
    throw new LocalAgentCallbackError('UPLOAD_NOT_RESERVED', 'No upload reservation exists for this attempt', 409);
  }
  if (reservation.storageKey !== storageKey) {
    throw new LocalAgentCallbackError('STORAGE_KEY_MISMATCH', 'Storage key does not bind this attempt', 409);
  }
  if (uploadId !== undefined && reservation.uploadId !== uploadId) {
    throw new LocalAgentCallbackError('UPLOAD_ID_MISMATCH', 'Multipart upload ID does not bind this attempt', 409);
  }
  return reservation;
}

async function cleanupAttempt(
  deps: LocalAgentCallbackDeps,
  job: AudioPrepJob,
  identity: LocalAgentAttempt,
): Promise<void> {
  const reservation = uploadState(job);
  if (reservation?.strategy === 'multipart' && reservation.uploadId) {
    await abortR2MultipartUpload({ key: reservation.storageKey, uploadId: reservation.uploadId }).catch(() => {});
  }
  await deps.storage.deletePrefix(attemptPrefix(job.jobId, identity.attemptId)).catch(() => {});
}

async function releaseAttempt(deps: LocalAgentCallbackDeps, jobId: string, token: string): Promise<void> {
  const lease = await deps.leases.get(getLocalAgentJobLeaseKey(jobId));
  if (lease && safeEqual(lease.token, token)) {
    const projectLeaseKey = lease.metadata?.unityProjectLeaseKey;
    const projectLeaseToken = lease.metadata?.unityProjectLeaseToken;
    if (typeof projectLeaseKey === 'string' && typeof projectLeaseToken === 'string') {
      await deps.leases.release(projectLeaseKey, projectLeaseToken).catch(() => {});
    }
  }
  await deps.leases.release(getLocalAgentJobLeaseKey(jobId), token).catch(() => {});
}

export async function reconcileAbandonedLocalAgentAttempts(
  deps: LocalAgentCallbackDeps,
): Promise<{ scanned: number; cleaned: number; requeued: number }> {
  const jobs = await deps.jobs.list({ type: 'render' });
  let cleaned = 0;
  let requeued = 0;

  for (const job of jobs) {
    const reservation = uploadState(job);
    const dispatch = job.result?.localAgentDispatch as Record<string, unknown> | undefined;
    const claimedAttemptId = typeof dispatch?.claimedAttemptId === 'string' ? dispatch.claimedAttemptId : undefined;
    const claimedAgentId = typeof dispatch?.claimedByAgentId === 'string' ? dispatch.claimedByAgentId : undefined;
    const attemptId = reservation?.attemptId || claimedAttemptId;
    const agentId = reservation?.agentId || claimedAgentId;
    if (!attemptId || !agentId) continue;

    const completion = job.result?.localAgentCompletion as Record<string, unknown> | undefined;
    if (
      reservation &&
      job.status === 'complete' &&
      completion?.attemptId === reservation.attemptId &&
      completion?.storageKey === reservation.storageKey
    ) continue;
    if (reservation?.status === 'aborted' && job.status !== 'processing') continue;

    const leaseKey = getLocalAgentJobLeaseKey(job.jobId);
    const lease = await deps.leases.get(leaseKey);
    const projectLeaseKey = lease?.metadata?.unityProjectLeaseKey;
    const projectLeaseToken = lease?.metadata?.unityProjectLeaseToken;
    const projectLease = typeof projectLeaseKey === 'string'
      ? await deps.leases.get(projectLeaseKey)
      : undefined;
    const projectLeaseActive = projectLeaseKey === undefined || (
      typeof projectLeaseToken === 'string'
      && projectLease?.token === projectLeaseToken
      && new Date(projectLease.expiresAt).getTime() > Date.now()
    );
    const active =
      job.status === 'processing' &&
      job.stage === 'rendering-local-agent' &&
      lease?.ownerId === agentId &&
      lease.metadata?.attemptId === attemptId &&
      new Date(lease.expiresAt).getTime() > Date.now() &&
      projectLeaseActive;
    if (active) continue;

    if (reservation?.strategy === 'multipart' && reservation.uploadId) {
      await abortR2MultipartUpload({ key: reservation.storageKey, uploadId: reservation.uploadId }).catch(() => {});
    }
    await deps.storage.deletePrefix(attemptPrefix(job.jobId, attemptId)).catch(() => {});
    if (lease) await releaseAttempt(deps, job.jobId, lease.token);
    cleaned += 1;

    if (job.status === 'processing' && job.stage === 'rendering-local-agent') {
      const { localAgentUpload: _removed, ...result } = job.result || {};
      const currentDispatch = result.localAgentDispatch as Record<string, unknown> | undefined;
      if (currentDispatch) {
        const {
          claimedAttemptId: _claimedAttemptId,
          claimedByAgentId: _claimedByAgentId,
          claimedAt: _claimedAt,
          ...unclaimedDispatch
        } = currentDispatch;
        result.localAgentDispatch = unclaimedDispatch;
      }
      const priorCleanup = Array.isArray(result.localAgentAttemptCleanup)
        ? result.localAgentAttemptCleanup as Array<Record<string, unknown>>
        : [];
      await deps.jobs.update(job.jobId, {
        stage: 'awaiting-local-agent',
        progress: 30,
        result: {
          ...result,
          localAgentAttemptCleanup: [...priorCleanup.slice(-19), {
            attemptId,
            agentId,
            storageKey: reservation?.storageKey || null,
            cleanedAt: new Date().toISOString(),
            reason: 'attempt-no-longer-finalizable',
          }],
        },
      });
      requeued += 1;
    } else if (reservation && (job.status === 'failed' || job.status === 'cancelled')) {
      await deps.jobs.update(job.jobId, {
        result: withResult(job, {
          localAgentUpload: { ...reservation, status: 'aborted', updatedAt: new Date().toISOString() },
        }),
      });
    }
  }

  return { scanned: jobs.length, cleaned, requeued };
}

export async function renewLocalAgentAttempt(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  identity: unknown,
): Promise<{ expiresAt: string }> {
  const owned = await loadOwnedAttempt(deps, jobId, identity);
  const metadata = {
    ...(owned.lease.metadata || {}),
    renewedAt: new Date().toISOString(),
  };
  const projectLeaseKey = owned.lease.metadata?.unityProjectLeaseKey;
  const projectLeaseToken = owned.lease.metadata?.unityProjectLeaseToken;
  if (typeof projectLeaseKey === 'string' || typeof projectLeaseToken === 'string') {
    if (typeof projectLeaseKey !== 'string' || typeof projectLeaseToken !== 'string') {
      throw new LocalAgentCallbackError('UNITY_PROJECT_LEASE_INVALID', 'Unity project lease binding is incomplete', 409);
    }
    const projectRenewed = await deps.leases.renew(
      projectLeaseKey,
      projectLeaseToken,
      getLocalAgentJobLeaseTtlMs(),
      { ...(owned.lease.metadata || {}), renewedAt: new Date().toISOString() },
    );
    if (!projectRenewed) {
      throw new LocalAgentCallbackError('UNITY_PROJECT_LEASE_LOST', 'Unity project lease could not be renewed', 409);
    }
  }
  const renewed = await deps.leases.renew(
    getLocalAgentJobLeaseKey(jobId),
    owned.identity.leaseToken,
    getLocalAgentJobLeaseTtlMs(),
    metadata,
  );
  if (!renewed) {
    if (typeof projectLeaseKey === 'string' && typeof projectLeaseToken === 'string') {
      await deps.leases.release(projectLeaseKey, projectLeaseToken).catch(() => {});
    }
    throw new LocalAgentCallbackError('LEASE_RENEW_FAILED', 'Job lease could not be renewed', 409);
  }
  const lease = await deps.leases.get(getLocalAgentJobLeaseKey(jobId));
  if (!lease) throw new LocalAgentCallbackError('LEASE_RENEW_FAILED', 'Renewed job lease disappeared', 409);
  return { expiresAt: lease.expiresAt };
}

export async function reserveLocalAgentUpload(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  raw: unknown,
): Promise<Record<string, unknown>> {
  const request = LocalAgentUploadRequestSchema.parse(raw);
  const owned = await loadOwnedAttempt(deps, jobId, request);
  const storageKey = expectedStorageKey(jobId, request.attemptId, request.filename);
  const prior = uploadState(owned.job);
  if (prior) {
    if (prior.storageKey !== storageKey || prior.sizeBytes !== request.sizeBytes || prior.contentType !== request.contentType) {
      throw new LocalAgentCallbackError('UPLOAD_RESERVATION_CONFLICT', 'Attempt already has a different upload reservation', 409);
    }
    if (prior.status === 'aborted') {
      throw new LocalAgentCallbackError('UPLOAD_ABORTED', 'Attempt upload was already aborted', 409);
    }
  }

  const now = new Date().toISOString();
  const useMultipart =
    process.env.LOCAL_AGENT_MULTIPART_ENABLED === 'true' &&
    isR2MultipartAvailable() &&
    request.sizeBytes >= getLocalAgentMultipartThresholdBytes();
  if (useMultipart) {
    const partSizeBytes = getLocalAgentMultipartPartSizeBytes();
    const totalParts = Math.ceil(request.sizeBytes / partSizeBytes);
    if (totalParts > 10_000) throw new LocalAgentCallbackError('UPLOAD_TOO_LARGE', 'Multipart upload exceeds 10000 parts', 400);
    if (prior?.status === 'uploaded') {
      throw new LocalAgentCallbackError('UPLOAD_ALREADY_COMPLETED', 'Multipart upload was already completed', 409);
    }
    if (prior?.uploadId) {
      // A lost reservation response cannot be replayed because presigned part URLs
      // are deliberately not persisted. Abort and replace it without leaking an upload.
      await abortR2MultipartUpload({ key: storageKey, uploadId: prior.uploadId }).catch(() => {});
    }
    const multipart = await createR2MultipartUpload({
      key: storageKey,
      contentType: request.contentType,
      partCount: totalParts,
    });
    const state: LocalAgentUploadState = {
      attemptId: request.attemptId,
      agentId: request.agentId,
      storageKey,
      sizeBytes: request.sizeBytes,
      contentType: request.contentType,
      strategy: 'multipart',
      status: 'reserved',
      uploadId: multipart.uploadId,
      createdAt: prior?.createdAt || now,
      updatedAt: now,
    };
    await deps.jobs.update(jobId, { result: withResult(owned.job, { localAgentUpload: state }) });
    return {
      strategy: 'multipart',
      jobId,
      storageKey,
      uploadId: multipart.uploadId,
      partSizeBytes,
      totalParts,
      partUrls: multipart.partUrls,
      completeEndpoint: `/api/local-agent/jobs/${jobId}/multipart/complete`,
      abortEndpoint: `/api/local-agent/jobs/${jobId}/multipart/abort`,
    };
  }

  const uploadUrl = await deps.storage.getUploadUrl(storageKey, {
    contentType: request.contentType,
    maxSizeBytes: MAX_UPLOAD_BYTES,
    expiresInSeconds: 3600,
  });
  const state: LocalAgentUploadState = {
    attemptId: request.attemptId,
    agentId: request.agentId,
    storageKey,
    sizeBytes: request.sizeBytes,
    contentType: request.contentType,
    strategy: 'single-put',
    status: 'reserved',
    createdAt: prior?.createdAt || now,
    updatedAt: now,
  };
  await deps.jobs.update(jobId, { result: withResult(owned.job, { localAgentUpload: state }) });
  return { strategy: 'single-put', jobId, storageKey, uploadUrl, method: 'PUT' };
}

export async function completeLocalAgentMultipartUpload(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  raw: unknown,
): Promise<{ storageKey: string }> {
  const request = LocalAgentMultipartCompleteSchema.parse(raw);
  const owned = await loadOwnedAttempt(deps, jobId, request);
  const reservation = assertReservation(owned.job, request, request.storageKey, request.uploadId);
  if (reservation.strategy !== 'multipart') {
    throw new LocalAgentCallbackError('NOT_MULTIPART', 'Attempt is not a multipart upload', 409);
  }
  if (reservation.status === 'uploaded') return { storageKey: request.storageKey };
  if (reservation.status === 'aborted') {
    throw new LocalAgentCallbackError('UPLOAD_ABORTED', 'Multipart upload was already aborted', 409);
  }
  await completeR2MultipartUpload({
    key: request.storageKey,
    uploadId: request.uploadId,
    parts: request.parts as MultipartPartETag[],
  });
  const state = { ...reservation, status: 'uploaded' as const, updatedAt: new Date().toISOString() };
  await deps.jobs.update(jobId, { result: withResult(owned.job, { localAgentUpload: state }) });
  return { storageKey: request.storageKey };
}

export async function abortLocalAgentMultipartUpload(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  raw: unknown,
): Promise<{ aborted: true }> {
  const request = LocalAgentMultipartAbortSchema.parse(raw);
  const owned = await loadOwnedAttempt(deps, jobId, request);
  const reservation = assertReservation(owned.job, request, request.storageKey, request.uploadId);
  if (reservation.strategy !== 'multipart') {
    throw new LocalAgentCallbackError('NOT_MULTIPART', 'Attempt is not a multipart upload', 409);
  }
  if (reservation.status === 'aborted') return { aborted: true };
  if (reservation.status === 'uploaded') {
    throw new LocalAgentCallbackError('UPLOAD_ALREADY_COMPLETED', 'Multipart upload was already completed', 409);
  }
  await abortR2MultipartUpload({ key: request.storageKey, uploadId: request.uploadId });
  await deps.storage.deletePrefix(attemptPrefix(jobId, request.attemptId));
  const state = { ...reservation, status: 'aborted' as const, updatedAt: new Date().toISOString() };
  await deps.jobs.update(jobId, { result: withResult(owned.job, { localAgentUpload: state }) });
  return { aborted: true };
}

export async function finalizeLocalAgentJob(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  raw: unknown,
): Promise<{ storageKey: string; sha256: string; alreadyCompleted: boolean }> {
  const request = LocalAgentCompleteSchema.parse(raw);
  const existing = await deps.jobs.get(jobId);
  const tokenHash = leaseTokenHash(request.leaseToken);
  if (existing?.status === 'complete') {
    const completion = existing.result?.localAgentCompletion as Record<string, unknown> | undefined;
    if (
      completion?.attemptId === request.attemptId &&
      completion?.agentId === request.agentId &&
      completion?.leaseTokenHash === tokenHash &&
      completion?.storageKey === request.storageKey &&
      completion?.sha256 === request.fileSha256.toLowerCase() &&
      completion?.sizeBytes === request.fileSizeBytes
    ) {
      return { storageKey: request.storageKey, sha256: request.fileSha256.toLowerCase(), alreadyCompleted: true };
    }
    throw new LocalAgentCallbackError('TERMINAL_REPLAY_MISMATCH', 'Completed job does not match this finalize attempt', 409);
  }

  const owned = await loadOwnedAttempt(deps, jobId, request);
  const reservation = assertReservation(owned.job, request, request.storageKey);
  if (reservation.status === 'aborted') {
    throw new LocalAgentCallbackError('UPLOAD_ABORTED', 'Attempt upload was already aborted', 409);
  }
  try {
    const stat = await deps.storage.stat(request.storageKey);
    if (!stat || stat.size !== request.fileSizeBytes || stat.size !== reservation.sizeBytes) {
      throw new Error('Stored object size does not match the reserved artifact');
    }
    const bytes = await deps.storage.get(request.storageKey);
    if (!bytes) throw new Error('Stored object is missing');
    const actualSha256 = sha256(bytes);
    if (!safeEqual(actualSha256, request.fileSha256.toLowerCase())) {
      throw new Error('Stored object SHA-256 does not match the accepted artifact');
    }
    const completedAt = new Date().toISOString();
    await deps.jobs.complete(jobId, withResult(owned.job, {
      videoKey: request.storageKey,
      outputVideoKey: request.storageKey,
      localAgentUpload: { ...reservation, status: 'uploaded', updatedAt: completedAt },
      localAgentCompletion: {
        attemptId: request.attemptId,
        agentId: request.agentId,
        leaseTokenHash: tokenHash,
        storageKey: request.storageKey,
        sizeBytes: request.fileSizeBytes,
        sha256: actualSha256,
        acceptanceReceipt: request.acceptanceReceipt || null,
        completedAt,
      },
    }));
    await releaseAttempt(deps, jobId, request.leaseToken);
    return { storageKey: request.storageKey, sha256: actualSha256, alreadyCompleted: false };
  } catch (error) {
    await cleanupAttempt(deps, owned.job, request);
    await deps.jobs.update(jobId, {
      result: withResult(owned.job, {
        localAgentUpload: { ...reservation, status: 'aborted', updatedAt: new Date().toISOString() },
        localAgentFailure: {
          attemptId: request.attemptId,
          agentId: request.agentId,
          leaseTokenHash: tokenHash,
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
        },
      }),
    });
    await deps.jobs.fail(jobId, error instanceof Error ? error.message : String(error));
    await releaseAttempt(deps, jobId, request.leaseToken);
    throw new LocalAgentCallbackError('ARTIFACT_VERIFICATION_FAILED', error instanceof Error ? error.message : 'Artifact verification failed', 409);
  }
}

export async function failLocalAgentJob(
  deps: LocalAgentCallbackDeps,
  jobId: string,
  raw: unknown,
): Promise<{ alreadyFailed: boolean }> {
  const request = LocalAgentFailSchema.parse(raw);
  const existing = await deps.jobs.get(jobId);
  const tokenHash = leaseTokenHash(request.leaseToken);
  if (existing?.status === 'failed') {
    const failure = existing.result?.localAgentFailure as Record<string, unknown> | undefined;
    if (
      failure?.attemptId === request.attemptId &&
      failure?.agentId === request.agentId &&
      failure?.leaseTokenHash === tokenHash &&
      failure?.error === request.error
    ) return { alreadyFailed: true };
    throw new LocalAgentCallbackError('TERMINAL_REPLAY_MISMATCH', 'Failed job does not match this failure attempt', 409);
  }
  const owned = await loadOwnedAttempt(deps, jobId, request);
  await cleanupAttempt(deps, owned.job, request);
  await deps.jobs.update(jobId, {
    result: withResult(owned.job, {
      ...(uploadState(owned.job)
        ? { localAgentUpload: { ...uploadState(owned.job)!, status: 'aborted', updatedAt: new Date().toISOString() } }
        : {}),
      localAgentFailure: {
        attemptId: request.attemptId,
        agentId: request.agentId,
        leaseTokenHash: tokenHash,
        error: request.error,
        failedAt: new Date().toISOString(),
      },
    }),
  });
  await deps.jobs.fail(jobId, request.error);
  await releaseAttempt(deps, jobId, request.leaseToken);
  return { alreadyFailed: false };
}
