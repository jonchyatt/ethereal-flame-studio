import { AudioPrepJobManager } from '../JobManager';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

describe('AudioPrepJobManager', () => {
  let manager: AudioPrepJobManager;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `audio-prep-jobs-${Date.now()}.db`);
    manager = new AudioPrepJobManager(dbPath);
  });

  afterEach(async () => {
    manager.close();
    await fs.unlink(dbPath).catch(() => {});
  });

  test('creates and retrieves a job', () => {
    const job = manager.create('ingest', { type: 'youtube', url: 'https://youtube.com' });
    expect(job.jobId).toBeDefined();
    expect(job.status).toBe('pending');

    const retrieved = manager.get(job.jobId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.jobId).toBe(job.jobId);
  });

  test('persists across new manager instances', () => {
    const job = manager.create('ingest', {});
    manager.complete(job.jobId, { assetId: 'abc-123' });
    manager.close();

    // New manager instance reads same DB
    const manager2 = new AudioPrepJobManager(dbPath);
    const retrieved = manager2.get(job.jobId);
    expect(retrieved!.status).toBe('complete');
    expect(retrieved!.result).toEqual({ assetId: 'abc-123' });
    manager2.close();
  });

  test('updates job status and progress', () => {
    const job = manager.create('ingest', {});
    manager.update(job.jobId, { status: 'processing', progress: 50 });

    const updated = manager.get(job.jobId);
    expect(updated!.status).toBe('processing');
    expect(updated!.progress).toBe(50);
  });

  test('completes a job with result', () => {
    const job = manager.create('ingest', {});
    manager.complete(job.jobId, { assetId: 'abc-123' });

    const completed = manager.get(job.jobId);
    expect(completed!.status).toBe('complete');
    expect(completed!.result).toEqual({ assetId: 'abc-123' });
  });

  test('fails a job with error', () => {
    const job = manager.create('ingest', {});
    manager.fail(job.jobId, 'Download timeout');

    const failed = manager.get(job.jobId);
    expect(failed!.status).toBe('failed');
    expect(failed!.error).toBe('Download timeout');
  });

  test('cancels a job and signals abort', () => {
    const job = manager.create('ingest', {});
    const signal = manager.getSignal(job.jobId);
    expect(signal?.aborted).toBe(false);

    manager.cancel(job.jobId);

    expect(signal?.aborted).toBe(true);
    const cancelled = manager.get(job.jobId);
    expect(cancelled!.status).toBe('cancelled');
  });
});
