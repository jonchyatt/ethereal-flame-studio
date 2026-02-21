import { LocalJobStore } from '../LocalJobStore';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

describe('LocalJobStore', () => {
  let store: LocalJobStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `job-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    store = new LocalJobStore(dbPath);
  });

  afterEach(async () => {
    store.close();
    await fs.unlink(dbPath).catch(() => {});
    // Clean up WAL/SHM files
    await fs.unlink(`${dbPath}-wal`).catch(() => {});
    await fs.unlink(`${dbPath}-shm`).catch(() => {});
  });

  test('creates and retrieves a job', async () => {
    const job = await store.create('ingest', { url: 'https://youtube.com/watch?v=abc' });

    expect(job.jobId).toBeDefined();
    expect(job.type).toBe('ingest');
    expect(job.status).toBe('pending');
    expect(job.progress).toBe(0);
    expect(job.stage).toBeNull();
    expect(job.metadata).toEqual({ url: 'https://youtube.com/watch?v=abc' });
    expect(job.retryCount).toBe(0);
    expect(job.createdAt).toBeDefined();
    expect(job.updatedAt).toBeDefined();

    const retrieved = await store.get(job.jobId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.jobId).toBe(job.jobId);
    expect(retrieved!.stage).toBeNull();
    expect(retrieved!.retryCount).toBe(0);
  });

  test('updates job status, progress, and stage', async () => {
    const job = await store.create('ingest', {});

    await store.update(job.jobId, {
      status: 'processing',
      progress: 25,
      stage: 'downloading',
    });

    const updated = await store.get(job.jobId);
    expect(updated!.status).toBe('processing');
    expect(updated!.progress).toBe(25);
    expect(updated!.stage).toBe('downloading');
  });

  test('completes a job with result', async () => {
    const job = await store.create('ingest', {});

    await store.complete(job.jobId, { assetId: 'abc-123', duration: 120 });

    const completed = await store.get(job.jobId);
    expect(completed!.status).toBe('complete');
    expect(completed!.progress).toBe(100);
    expect(completed!.result).toEqual({ assetId: 'abc-123', duration: 120 });
  });

  test('fails a job with error', async () => {
    const job = await store.create('ingest', {});

    await store.fail(job.jobId, 'Download timeout');

    const failed = await store.get(job.jobId);
    expect(failed!.status).toBe('failed');
    expect(failed!.error).toBe('Download timeout');
  });

  test('cancels a pending job', async () => {
    const job = await store.create('ingest', {});

    await store.cancel(job.jobId);

    const cancelled = await store.get(job.jobId);
    expect(cancelled!.status).toBe('cancelled');
  });

  test('cancel is no-op on terminal jobs', async () => {
    const job = await store.create('ingest', {});
    await store.complete(job.jobId, { assetId: 'done' });

    // Attempt cancel on a completed job — should be no-op
    await store.cancel(job.jobId);

    const stillComplete = await store.get(job.jobId);
    expect(stillComplete!.status).toBe('complete');
  });

  test('claimNextPending returns oldest pending job as processing', async () => {
    // Create 3 jobs with slight delay to guarantee ordering
    const job1 = await store.create('ingest', { order: 1 });
    const job2 = await store.create('ingest', { order: 2 });
    const job3 = await store.create('ingest', { order: 3 });

    const claimed = await store.claimNextPending();
    expect(claimed).toBeDefined();
    expect(claimed!.jobId).toBe(job1.jobId); // FIFO — oldest first
    expect(claimed!.status).toBe('processing');

    // Verify original job in DB is now processing
    const fromDb = await store.get(job1.jobId);
    expect(fromDb!.status).toBe('processing');

    // Claim next should return job2
    const claimed2 = await store.claimNextPending();
    expect(claimed2!.jobId).toBe(job2.jobId);

    // And job3
    const claimed3 = await store.claimNextPending();
    expect(claimed3!.jobId).toBe(job3.jobId);
  });

  test('claimNextPending returns undefined when no pending jobs', async () => {
    const claimed = await store.claimNextPending();
    expect(claimed).toBeUndefined();
  });

  test('markStaleJobsFailed marks old processing jobs as failed', async () => {
    const job = await store.create('ingest', {});

    // Set to processing with an old updatedAt (simulate stuck job)
    await store.update(job.jobId, { status: 'processing' });

    // Manually set updatedAt to 10 minutes ago via raw SQL
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    // Access the db directly for test setup (casting to any for private access)
    const db = (store as unknown as { db: import('better-sqlite3').Database }).db;
    db.prepare('UPDATE audio_prep_jobs SET updatedAt = ? WHERE jobId = ?').run(
      tenMinAgo,
      job.jobId,
    );

    // Reaper with 5 minute timeout should catch this job
    const count = await store.markStaleJobsFailed(5 * 60 * 1000);
    expect(count).toBe(1);

    const reaped = await store.get(job.jobId);
    expect(reaped!.status).toBe('failed');
    expect(reaped!.error).toContain('Timeout');
  });

  test('getQueuePosition returns correct position', async () => {
    const job1 = await store.create('ingest', { order: 1 });
    const job2 = await store.create('ingest', { order: 2 });
    const job3 = await store.create('ingest', { order: 3 });

    // Ensure distinct createdAt values for deterministic ordering
    const db = (store as unknown as { db: import('better-sqlite3').Database }).db;
    db.prepare('UPDATE audio_prep_jobs SET createdAt = ? WHERE jobId = ?').run('2026-01-01T00:00:01Z', job1.jobId);
    db.prepare('UPDATE audio_prep_jobs SET createdAt = ? WHERE jobId = ?').run('2026-01-01T00:00:02Z', job2.jobId);
    db.prepare('UPDATE audio_prep_jobs SET createdAt = ? WHERE jobId = ?').run('2026-01-01T00:00:03Z', job3.jobId);

    // job1 is first in queue (0-based), job2 is second, etc.
    const pos1 = await store.getQueuePosition(job1.jobId);
    const pos2 = await store.getQueuePosition(job2.jobId);
    const pos3 = await store.getQueuePosition(job3.jobId);

    expect(pos1).toBe(0);
    expect(pos2).toBe(1);
    expect(pos3).toBe(2);
  });

  test('getQueuePosition returns -1 for non-pending jobs', async () => {
    const job = await store.create('ingest', {});
    await store.complete(job.jobId, {});

    const pos = await store.getQueuePosition(job.jobId);
    expect(pos).toBe(-1);
  });

  test('list filters by status', async () => {
    await store.create('ingest', {});
    const job2 = await store.create('ingest', {});
    await store.create('ingest', {});
    await store.complete(job2.jobId, { done: true });

    const pending = await store.list({ status: 'pending' });
    expect(pending.length).toBe(2);
    expect(pending.every((j) => j.status === 'pending')).toBe(true);

    const complete = await store.list({ status: 'complete' });
    expect(complete.length).toBe(1);
    expect(complete[0].jobId).toBe(job2.jobId);
  });

  test('list filters by type', async () => {
    await store.create('ingest', {});
    await store.create('preview', {});
    await store.create('save', {});

    const ingestJobs = await store.list({ type: 'ingest' });
    expect(ingestJobs.length).toBe(1);
    expect(ingestJobs[0].type).toBe('ingest');
  });

  test('list respects limit', async () => {
    await store.create('ingest', {});
    await store.create('ingest', {});
    await store.create('ingest', {});

    const limited = await store.list({ limit: 2 });
    expect(limited.length).toBe(2);
  });

  test('update throws for non-existent job', async () => {
    await expect(
      store.update('non-existent-id', { status: 'processing' }),
    ).rejects.toThrow('Job non-existent-id not found');
  });

  test('retryCount can be incremented', async () => {
    const job = await store.create('ingest', {});
    expect(job.retryCount).toBe(0);

    await store.update(job.jobId, { retryCount: 1 });
    const updated = await store.get(job.jobId);
    expect(updated!.retryCount).toBe(1);
  });
});
