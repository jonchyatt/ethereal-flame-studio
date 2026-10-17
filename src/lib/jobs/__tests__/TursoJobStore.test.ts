import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { TursoJobStore } from '../TursoJobStore';

describe('TursoJobStore CAS parity', () => {
  let store: TursoJobStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `turso-job-store-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    store = new TursoJobStore(`file:${dbPath.replace(/\\/g, '/')}`);
  });

  afterEach(async () => {
    store.close();
    await fs.unlink(dbPath).catch(() => {});
    await fs.unlink(`${dbPath}-wal`).catch(() => {});
    await fs.unlink(`${dbPath}-shm`).catch(() => {});
  });

  test('two concurrent projection writers produce exactly one winner', async () => {
    const job = await store.create('playlist', {});
    await store.update(job.jobId, { result: { projectionVersion: 0, marker: 'before' } });

    const results = await Promise.all([
      store.compareAndSetResult(job.jobId, 0, { projectionVersion: 1, marker: 'writer-a' }),
      store.compareAndSetResult(job.jobId, 0, { projectionVersion: 1, marker: 'writer-b' }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(['writer-a', 'writer-b']).toContain((await store.get(job.jobId))?.result?.marker);
  });

  test('deterministic create-if-absent produces one child row under concurrency', async () => {
    const jobId = 'b89eea40-df3f-565c-9e4f-e85549e36ff1';
    const metadata = { playlistRenderIntentId: jobId, engine: 'puppeteer' };
    const jobs = await Promise.all([
      store.create('render', metadata, { jobId }),
      store.create('render', metadata, { jobId }),
    ]);

    expect(jobs[0].jobId).toBe(jobs[1].jobId);
    expect(await store.list({ type: 'render' })).toHaveLength(1);
  });
});
