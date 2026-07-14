import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import { getStorageAdapter, resetStorageAdapter } from '@/lib/storage';
import { runRenderPipeline } from '../../../../worker/pipelines/render';

describe('render worker local-agent dispatch', () => {
  let tempRoot: string;
  let jobs: LocalJobStore;
  const originalEnv = {
    backend: process.env.STORAGE_BACKEND,
    storagePath: process.env.STORAGE_LOCAL_PATH,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  };

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'waia-render-pipeline-'));
    process.env.STORAGE_BACKEND = 'local';
    process.env.STORAGE_LOCAL_PATH = path.join(tempRoot, 'storage');
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
    resetStorageAdapter();
    jobs = new LocalJobStore(path.join(tempRoot, 'jobs.db'));
  });

  afterEach(async () => {
    jobs.close();
    resetStorageAdapter();
    if (originalEnv.backend === undefined) delete process.env.STORAGE_BACKEND;
    else process.env.STORAGE_BACKEND = originalEnv.backend;
    if (originalEnv.storagePath === undefined) delete process.env.STORAGE_LOCAL_PATH;
    else process.env.STORAGE_LOCAL_PATH = originalEnv.storagePath;
    if (originalEnv.baseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = originalEnv.baseUrl;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  async function createProcessingRender(metadata: Record<string, unknown>) {
    await jobs.create('render', metadata);
    const claimed = await jobs.claimNextPending();
    if (!claimed) throw new Error('Test render was not claimed');
    return claimed;
  }

  test('routes home through local-agent and binds the resolved input digest', async () => {
    const audio = Buffer.from('phase-2-approved-audio');
    const audioStorageKey = 'assets/test/prepared.wav';
    await getStorageAdapter().put(audioStorageKey, audio);
    const job = await createProcessingRender({
      renderEngine: 'puppeteer',
      renderTarget: 'home',
      audioStorageKey,
      audioName: 'approved.wav',
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      callbackUrl: 'http://localhost:3000',
    });

    await runRenderPipeline(jobs, job, { current: null });
    const staged = await jobs.get(job.jobId);
    const dispatch = staged?.result?.localAgentDispatch as Record<string, unknown>;

    expect(staged?.stage).toBe('awaiting-local-agent');
    expect(dispatch).toMatchObject({ renderEngine: 'puppeteer', renderTarget: 'home' });
    expect(dispatch.inputArtifact).toEqual({
      storageKey: audioStorageKey,
      sizeBytes: audio.length,
      sha256: createHash('sha256').update(audio).digest('hex'),
    });
  });

  test('rejects bytes that do not match an explicitly approved input digest', async () => {
    const audio = Buffer.from('different-audio');
    const audioStorageKey = 'assets/test/prepared.wav';
    await getStorageAdapter().put(audioStorageKey, audio);
    const job = await createProcessingRender({
      renderEngine: 'puppeteer',
      renderTarget: 'local-agent',
      targetAgentId: 'waia-agent',
      audioStorageKey,
      audioName: 'approved.wav',
      approvedInputSha256: 'a'.repeat(64),
      approvedInputSizeBytes: audio.length,
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      callbackUrl: 'http://localhost:3000',
    });

    await expect(runRenderPipeline(jobs, job, { current: null }))
      .rejects.toThrow('Resolved audio SHA-256 does not match the approved input artifact');
    expect((await jobs.get(job.jobId))?.stage).not.toBe('awaiting-local-agent');
  });
});
