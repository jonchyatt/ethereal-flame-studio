import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import { LocalLeaseStore } from '@/lib/leases/LocalLeaseStore';
import { LocalStorageAdapter } from '@/lib/storage/LocalStorageAdapter';
import { getLocalAgentJobLeaseKey, getUnityProjectLeaseKey } from '../registry';
import {
  failLocalAgentJob,
  finalizeLocalAgentJob,
  LocalAgentCallbackError,
  reconcileAbandonedLocalAgentAttempts,
  renewLocalAgentAttempt,
  reserveLocalAgentUpload,
  type LocalAgentCallbackDeps,
} from '../jobCallbacks';

const AGENT_ID = 'waia-test-agent';

describe('local-agent job callbacks', () => {
  let tempRoot: string;
  let jobs: LocalJobStore;
  let leases: LocalLeaseStore;
  let storage: LocalStorageAdapter;
  let deps: LocalAgentCallbackDeps;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'waia-agent-callbacks-'));
    jobs = new LocalJobStore(path.join(tempRoot, 'jobs.db'));
    leases = new LocalLeaseStore(path.join(tempRoot, 'leases.db'));
    storage = new LocalStorageAdapter(path.join(tempRoot, 'storage'), 'http://localhost:3000');
    deps = { jobs, leases, storage };
    process.env.STORAGE_BACKEND = 'local';
  });

  afterEach(async () => {
    jobs.close();
    leases.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  async function createAttempt(ttlMs = 60_000, unityProjectLockId?: string) {
    const created = await jobs.create('render', { renderEngine: 'puppeteer', renderTarget: 'home' });
    await jobs.claimNextPending();
    await jobs.update(created.jobId, {
      stage: 'rendering-local-agent',
      result: { localAgentDispatch: { lineageMarker: 'preserve-me' } },
    });
    const attemptId = randomUUID();
    const projectLeaseKey = unityProjectLockId ? getUnityProjectLeaseKey(unityProjectLockId) : undefined;
    const projectLease = projectLeaseKey
      ? await leases.acquire(projectLeaseKey, `unity:${attemptId}`, ttlMs, { metadata: { attemptId } })
      : undefined;
    const acquired = await leases.acquire(getLocalAgentJobLeaseKey(created.jobId), AGENT_ID, ttlMs, {
      metadata: {
        attemptId,
        ...(projectLeaseKey && projectLease?.lease ? {
          unityProjectLeaseKey: projectLeaseKey,
          unityProjectLeaseToken: projectLease.lease.token,
          unityProjectLockId,
        } : {}),
      },
    });
    if (!acquired.lease) throw new Error('Test lease was not acquired');
    return {
      jobId: created.jobId,
      identity: {
        agentId: AGENT_ID,
        attemptId,
        leaseToken: acquired.lease.token,
      },
      projectLeaseKey,
    };
  }

  async function reserveAndUpload(attempt: Awaited<ReturnType<typeof createAttempt>>, bytes: Buffer) {
    const reservation = await reserveLocalAgentUpload(deps, attempt.jobId, {
      ...attempt.identity,
      filename: 'waia-render.mp4',
      contentType: 'video/mp4',
      sizeBytes: bytes.length,
    }) as { storageKey: string };
    await storage.put(reservation.storageKey, bytes, { contentType: 'video/mp4' });
    return reservation.storageKey;
  }

  test('renews an owned active attempt', async () => {
    const attempt = await createAttempt();
    const before = await leases.get(getLocalAgentJobLeaseKey(attempt.jobId));
    const result = await renewLocalAgentAttempt(deps, attempt.jobId, attempt.identity);

    expect(new Date(result.expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(before!.expiresAt).getTime());
  });

  test('renews and releases the bound Unity project lease with the job attempt', async () => {
    const attempt = await createAttempt(60_000, 'efs-main-project');
    const projectBefore = await leases.get(attempt.projectLeaseKey!);
    await renewLocalAgentAttempt(deps, attempt.jobId, attempt.identity);
    const projectAfter = await leases.get(attempt.projectLeaseKey!);
    expect(new Date(projectAfter!.expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(projectBefore!.expiresAt).getTime());

    await failLocalAgentJob(deps, attempt.jobId, { ...attempt.identity, error: 'unity failed' });
    expect(await leases.get(attempt.projectLeaseKey!)).toBeUndefined();
    expect(await leases.get(getLocalAgentJobLeaseKey(attempt.jobId))).toBeUndefined();
  });

  test('completes an attempt only after server-side size and digest verification', async () => {
    const attempt = await createAttempt();
    const bytes = Buffer.from('verified-waia-render');
    const storageKey = await reserveAndUpload(attempt, bytes);
    expect(storageKey).toBe(`renders/${attempt.jobId}/${attempt.identity.attemptId}/waia-render.mp4`);
    const fileSha256 = createHash('sha256').update(bytes).digest('hex');

    const completed = await finalizeLocalAgentJob(deps, attempt.jobId, {
      ...attempt.identity,
      storageKey,
      fileSizeBytes: bytes.length,
      fileSha256,
    });
    expect(completed.alreadyCompleted).toBe(false);

    const job = await jobs.get(attempt.jobId);
    expect(job?.status).toBe('complete');
    expect(job?.result?.videoKey).toBe(storageKey);
    expect((job?.result?.localAgentDispatch as Record<string, unknown>).lineageMarker).toBe('preserve-me');
    expect(await leases.get(getLocalAgentJobLeaseKey(attempt.jobId))).toBeUndefined();

    await expect(finalizeLocalAgentJob(deps, attempt.jobId, {
      ...attempt.identity,
      storageKey,
      fileSizeBytes: bytes.length,
      fileSha256,
    })).resolves.toMatchObject({ alreadyCompleted: true, sha256: fileSha256 });
  });

  test('rejects a stale lease token before reserving storage', async () => {
    const attempt = await createAttempt();
    await expect(reserveLocalAgentUpload(deps, attempt.jobId, {
      ...attempt.identity,
      leaseToken: randomUUID(),
      filename: 'waia-render.mp4',
      contentType: 'video/mp4',
      sizeBytes: 100,
    })).rejects.toMatchObject<Partial<LocalAgentCallbackError>>({ code: 'LEASE_MISMATCH', status: 403 });
  });

  test('rejects path separators in the caller-supplied output filename', async () => {
    const attempt = await createAttempt();
    await expect(reserveLocalAgentUpload(deps, attempt.jobId, {
      ...attempt.identity,
      filename: '../escape.mp4',
      contentType: 'video/mp4',
      sizeBytes: 100,
    })).rejects.toThrow();
    expect(await storage.list('renders/')).toEqual([]);
  });

  test('keeps R2 multipart unreachable without the explicit rollout switch', async () => {
    const priorBackend = process.env.STORAGE_BACKEND;
    const priorThreshold = process.env.LOCAL_AGENT_MULTIPART_THRESHOLD_BYTES;
    const priorEnabled = process.env.LOCAL_AGENT_MULTIPART_ENABLED;
    try {
      process.env.STORAGE_BACKEND = 'r2';
      process.env.LOCAL_AGENT_MULTIPART_THRESHOLD_BYTES = '1';
      delete process.env.LOCAL_AGENT_MULTIPART_ENABLED;
      const attempt = await createAttempt();
      await expect(reserveLocalAgentUpload(deps, attempt.jobId, {
        ...attempt.identity,
        filename: 'guarded.mp4',
        contentType: 'video/mp4',
        sizeBytes: 100,
      })).resolves.toMatchObject({ strategy: 'single-put' });
    } finally {
      if (priorBackend === undefined) delete process.env.STORAGE_BACKEND;
      else process.env.STORAGE_BACKEND = priorBackend;
      if (priorThreshold === undefined) delete process.env.LOCAL_AGENT_MULTIPART_THRESHOLD_BYTES;
      else process.env.LOCAL_AGENT_MULTIPART_THRESHOLD_BYTES = priorThreshold;
      if (priorEnabled === undefined) delete process.env.LOCAL_AGENT_MULTIPART_ENABLED;
      else process.env.LOCAL_AGENT_MULTIPART_ENABLED = priorEnabled;
    }
  });

  test('fails closed and removes the attempt artifact on digest mismatch', async () => {
    const attempt = await createAttempt();
    const bytes = Buffer.from('corrupt-output');
    const storageKey = await reserveAndUpload(attempt, bytes);

    await expect(finalizeLocalAgentJob(deps, attempt.jobId, {
      ...attempt.identity,
      storageKey,
      fileSizeBytes: bytes.length,
      fileSha256: 'a'.repeat(64),
    })).rejects.toMatchObject<Partial<LocalAgentCallbackError>>({ code: 'ARTIFACT_VERIFICATION_FAILED' });

    expect((await jobs.get(attempt.jobId))?.status).toBe('failed');
    expect(await storage.exists(storageKey)).toBe(false);
    expect(await leases.get(getLocalAgentJobLeaseKey(attempt.jobId))).toBeUndefined();
  });

  test('records explicit failure, cleans storage, and accepts an identical retry', async () => {
    const attempt = await createAttempt();
    const storageKey = await reserveAndUpload(attempt, Buffer.from('partial-output'));
    const request = { ...attempt.identity, error: 'renderer exited with code 17' };

    await expect(failLocalAgentJob(deps, attempt.jobId, request)).resolves.toEqual({ alreadyFailed: false });
    expect(await storage.exists(storageKey)).toBe(false);
    await expect(failLocalAgentJob(deps, attempt.jobId, request)).resolves.toEqual({ alreadyFailed: true });
  });

  test('cancellation callback cleans attempt artifacts and releases the lease', async () => {
    const attempt = await createAttempt();
    const storageKey = await reserveAndUpload(attempt, Buffer.from('cancelled-output'));
    await jobs.cancel(attempt.jobId);

    await expect(renewLocalAgentAttempt(deps, attempt.jobId, attempt.identity))
      .rejects.toMatchObject<Partial<LocalAgentCallbackError>>({ code: 'JOB_CANCELLED' });
    expect(await storage.exists(storageKey)).toBe(false);
    expect(await leases.get(getLocalAgentJobLeaseKey(attempt.jobId))).toBeUndefined();
  });

  test('rejects an expired lease row', async () => {
    const attempt = await createAttempt(1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(renewLocalAgentAttempt(deps, attempt.jobId, attempt.identity))
      .rejects.toMatchObject<Partial<LocalAgentCallbackError>>({ code: 'LEASE_EXPIRED' });
  });

  test('sweeps an expired attempt artifact and requeues the render', async () => {
    const attempt = await createAttempt();
    const storageKey = await reserveAndUpload(attempt, Buffer.from('abandoned-output'));
    await leases.acquire(getLocalAgentJobLeaseKey(attempt.jobId), AGENT_ID, 1, {
      metadata: { attemptId: attempt.identity.attemptId },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    await expect(reconcileAbandonedLocalAgentAttempts(deps)).resolves.toMatchObject({ cleaned: 1, requeued: 1 });
    expect(await storage.exists(storageKey)).toBe(false);
    expect(await leases.get(getLocalAgentJobLeaseKey(attempt.jobId))).toBeUndefined();
    const job = await jobs.get(attempt.jobId);
    expect(job?.stage).toBe('awaiting-local-agent');
    expect(job?.result?.localAgentUpload).toBeUndefined();
    expect(job?.result?.localAgentDispatch).toEqual({ lineageMarker: 'preserve-me' });
  });

  test('requeues an expired render even when it died before upload reservation', async () => {
    const attempt = await createAttempt();
    const job = await jobs.get(attempt.jobId);
    await jobs.update(attempt.jobId, {
      result: {
        ...(job?.result || {}),
        localAgentDispatch: {
          lineageMarker: 'preserve-me',
          claimedAttemptId: attempt.identity.attemptId,
          claimedByAgentId: attempt.identity.agentId,
          claimedAt: new Date().toISOString(),
        },
      },
    });
    await leases.acquire(getLocalAgentJobLeaseKey(attempt.jobId), AGENT_ID, 1, {
      metadata: { attemptId: attempt.identity.attemptId },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    await expect(reconcileAbandonedLocalAgentAttempts(deps)).resolves.toMatchObject({ cleaned: 1, requeued: 1 });
    const requeued = await jobs.get(attempt.jobId);
    expect(requeued?.stage).toBe('awaiting-local-agent');
    expect(requeued?.result?.localAgentDispatch).toEqual({ lineageMarker: 'preserve-me' });
  });
});
