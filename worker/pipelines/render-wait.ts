import type { JobStore, AudioPrepJob } from '../../src/lib/jobs/types';

function isTerminal(status: AudioPrepJob['status']): boolean {
  return status === 'complete' || status === 'failed' || status === 'cancelled';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface WaitForRenderCompletionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  heartbeatJobId?: string;
  heartbeatIntervalMs?: number;
  onPoll?: (job: AudioPrepJob) => Promise<void> | void;
}

/**
 * Wait for a render job to reach a terminal state. This is used by the playlist
 * orchestrator to enforce sequential render completion before dispatching the
 * next item, and can optionally be used by individual render jobs.
 */
export async function waitForRenderCompletion(
  store: JobStore,
  renderJobId: string,
  options: WaitForRenderCompletionOptions = {},
): Promise<AudioPrepJob> {
  const timeoutMs = options.timeoutMs ?? (Number(process.env.WORKER_RENDER_WAIT_TIMEOUT_MS) || 24 * 60 * 60 * 1000);
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
  const started = Date.now();
  let lastHeartbeatAt = 0;

  while (true) {
    const job = await store.get(renderJobId);
    if (!job) {
      throw new Error(`Render job ${renderJobId} not found while waiting for completion`);
    }

    if (options.onPoll) {
      await options.onPoll(job);
    }

    if (isTerminal(job.status)) {
      return job;
    }

    const now = Date.now();
    if (options.heartbeatJobId && now - lastHeartbeatAt >= heartbeatIntervalMs) {
      try {
        await store.update(options.heartbeatJobId, {});
      } catch {
        // Heartbeat failures are non-fatal; next poll may still observe terminal state.
      }
      lastHeartbeatAt = now;
    }

    if (now - started > timeoutMs) {
      throw new Error(`Timed out waiting for render job ${renderJobId} completion after ${Math.round(timeoutMs / 1000)}s`);
    }

    await sleep(pollIntervalMs);
  }
}

