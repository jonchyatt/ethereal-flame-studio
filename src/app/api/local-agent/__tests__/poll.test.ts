import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { getJobStore, resetJobStore } from '@/lib/jobs';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import { getLeaseStore, resetLeaseStore } from '@/lib/leases';
import { LocalLeaseStore } from '@/lib/leases/LocalLeaseStore';
import { resetStorageAdapter } from '@/lib/storage';
import { getLocalAgentJobLeaseKey, getUnityProjectLeaseKey } from '@/lib/local-agent/registry';
import { buildUnityRenderPlan } from '@/lib/render/waiaRenderPlan';
import { POST } from '../poll/route';

describe('local-agent poll route', () => {
  let tempRoot: string;
  let jobs: LocalJobStore;
  let leases: LocalLeaseStore;
  const originalEnv = {
    secret: process.env.LOCAL_AGENT_SHARED_SECRET,
    backend: process.env.JOB_STORE_BACKEND,
    dbPath: process.env.JOB_STORE_DB_PATH,
    storageBackend: process.env.STORAGE_BACKEND,
    storagePath: process.env.STORAGE_LOCAL_PATH,
  };

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'waia-agent-poll-'));
    process.env.LOCAL_AGENT_SHARED_SECRET = 'test-local-agent-secret';
    process.env.JOB_STORE_BACKEND = 'local';
    process.env.JOB_STORE_DB_PATH = path.join(tempRoot, 'jobs.db');
    process.env.STORAGE_BACKEND = 'local';
    process.env.STORAGE_LOCAL_PATH = path.join(tempRoot, 'storage');
    resetJobStore();
    resetLeaseStore();
    resetStorageAdapter();
    jobs = getJobStore() as LocalJobStore;
    leases = getLeaseStore() as LocalLeaseStore;
  });

  afterEach(async () => {
    jobs.close();
    leases.close();
    resetJobStore();
    resetLeaseStore();
    resetStorageAdapter();
    if (originalEnv.secret === undefined) delete process.env.LOCAL_AGENT_SHARED_SECRET;
    else process.env.LOCAL_AGENT_SHARED_SECRET = originalEnv.secret;
    if (originalEnv.backend === undefined) delete process.env.JOB_STORE_BACKEND;
    else process.env.JOB_STORE_BACKEND = originalEnv.backend;
    if (originalEnv.dbPath === undefined) delete process.env.JOB_STORE_DB_PATH;
    else process.env.JOB_STORE_DB_PATH = originalEnv.dbPath;
    if (originalEnv.storageBackend === undefined) delete process.env.STORAGE_BACKEND;
    else process.env.STORAGE_BACKEND = originalEnv.storageBackend;
    if (originalEnv.storagePath === undefined) delete process.env.STORAGE_LOCAL_PATH;
    else process.env.STORAGE_LOCAL_PATH = originalEnv.storagePath;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  test('claims an unassigned home job through the existing local-agent transport', async () => {
    const created = await jobs.create('render', { renderTarget: 'home', targetAgentId: null });
    await jobs.claimNextPending();
    await jobs.update(created.jobId, {
      stage: 'awaiting-local-agent',
      result: {
        localAgentDispatch: {
          schemaVersion: 1,
          jobId: created.jobId,
          renderEngine: 'puppeteer',
          renderTarget: 'home',
          audioSignedUrl: 'http://localhost:3000/api/storage/download?key=audio',
          inputArtifact: { storageKey: 'renders/input/audio.mp3', sizeBytes: 123, sha256: 'a'.repeat(64) },
          renderConfig: { version: '1.0' },
          appUrl: 'http://localhost:3000',
          targetAgentId: null,
          createdAt: new Date().toISOString(),
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/local-agent/poll', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-local-agent-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'home-agent',
        capabilities: { renderEngines: ['puppeteer'] },
        acceptUnassigned: true,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.job).toMatchObject({ jobId: created.jobId });
    expect(body.data.job.attemptId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.data.job.dispatch).toMatchObject({ renderTarget: 'home', renderEngine: 'puppeteer' });
    const lease = await leases.get(getLocalAgentJobLeaseKey(created.jobId));
    expect(lease?.metadata?.attemptId).toBe(body.data.job.attemptId);
    expect((await jobs.get(created.jobId))?.stage).toBe('rendering-local-agent');
  });

  test('requires full Unity capabilities and enforces one lease per project lock', async () => {
    const createUnityJob = async () => {
      const created = await jobs.create('render', { renderTarget: 'home', renderEngine: 'unity', targetAgentId: null });
      await jobs.claimNextPending();
      await jobs.update(created.jobId, {
        stage: 'awaiting-local-agent',
        result: {
          localAgentDispatch: {
            schemaVersion: 1,
            jobId: created.jobId,
            renderEngine: 'unity',
            renderTarget: 'home',
            audioSignedUrl: 'http://localhost:3000/api/storage/download?key=audio',
            inputArtifact: { storageKey: 'renders/input/audio.wav', sizeBytes: 123, sha256: 'a'.repeat(64) },
            renderConfig: { version: '1.0' },
            unityPlan: buildUnityRenderPlan({
              target: 'home',
              outputFormat: '360-mono-4k',
              fps: 30,
              visualConfig: { skyboxPreset: 'meditation', scene: 'Example' },
              outputName: created.jobId,
            }),
            appUrl: 'http://localhost:3000',
            targetAgentId: null,
            createdAt: new Date().toISOString(),
          },
        },
      });
      return created;
    };
    const first = await createUnityJob();
    const second = await createUnityJob();
    const unityCapabilities = {
      renderEngines: ['puppeteer', 'unity'],
      unityEditorVersion: '2021.2.8f1',
      unityProjectContractVersion: 'efs-path-b-v1',
      unityProjectLockId: 'efs-main-project',
      unityExecutionMode: 'batch',
      bashAvailable: true,
      ffmpegAvailable: true,
      ffprobeAvailable: true,
      spatialmediaAvailable: true,
      spatialmediaVersion: '2.1a1',
      supportedUnityPresets: ['meditation', 'ambient', 'fire_cinema', 'edm'],
      supportedUnityFormats: [
        'flat-1080p-landscape', 'flat-4k-landscape', '360-mono-4k',
        '360-mono-6k', '360-mono-8k', '360-stereo-8k',
      ],
      supportedUnityModes: ['flat', '360mono', '360stereo'],
    };
    const poll = (agentId: string, capabilities: Record<string, unknown>) => POST(new NextRequest(
      'http://localhost:3000/api/local-agent/poll',
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-local-agent-secret', 'content-type': 'application/json' },
        body: JSON.stringify({ agentId, capabilities, acceptUnassigned: true }),
      },
    ));

    const incomplete = await poll('generic-agent', { renderEngines: ['unity'] });
    expect((await incomplete.json()).data.job).toBeNull();

    const claimed = await poll('unity-agent-a', unityCapabilities);
    const claimedBody = await claimed.json();
    expect(claimedBody.data.job.jobId).toBe(first.jobId);
    const projectLease = await leases.get(getUnityProjectLeaseKey('efs-main-project'));
    expect(projectLease?.metadata).toMatchObject({ jobId: first.jobId, agentId: 'unity-agent-a' });

    const blocked = await poll('unity-agent-b', unityCapabilities);
    expect((await blocked.json()).data.job).toBeNull();
    expect((await jobs.get(second.jobId))?.stage).toBe('awaiting-local-agent');
  });
});
