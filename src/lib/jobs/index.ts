/**
 * JobStore singleton factory — mirrors the StorageAdapter pattern.
 *
 * - JOB_STORE_BACKEND=turso  -> TursoJobStore  (production / Turso cloud)
 * - JOB_STORE_BACKEND=local  -> LocalJobStore   (default, local dev)
 *
 * Uses dynamic require() so @libsql/client is never loaded in local
 * development (keeps the dev bundle lean).
 */

import type { JobStore } from './types';

let _instance: JobStore | null = null;

/**
 * Return the JobStore for the current environment.
 */
export function getJobStore(): JobStore {
  if (_instance) return _instance;

  const deployEnv = process.env.DEPLOY_ENV;
  const backend = process.env.JOB_STORE_BACKEND || (deployEnv === 'production' ? 'turso' : 'local');

  if (backend === 'turso') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TursoJobStore } = require('./TursoJobStore');
    _instance = new TursoJobStore(
      process.env.TURSO_DATABASE_URL!,
      process.env.TURSO_AUTH_TOKEN,
    );
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LocalJobStore } = require('./LocalJobStore');
    _instance = new LocalJobStore(
      process.env.JOB_STORE_DB_PATH || './audio-prep-jobs.db',
    );
  }

  return _instance!;
}

/**
 * Reset the cached JobStore instance. Useful in tests to switch
 * backends between test cases.
 */
export function resetJobStore(): void {
  _instance = null;
}

// Re-export types so consumers can `import { JobStore } from '@/lib/jobs'`
export type { JobStore, AudioPrepJob, JobUpdate, ListOptions } from './types';
