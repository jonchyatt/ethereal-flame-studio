import type { LeaseStore } from './types';

let _instance: LeaseStore | null = null;

export function getLeaseStore(): LeaseStore {
  if (_instance) return _instance;

  const deployEnv = process.env.DEPLOY_ENV;
  const backend = process.env.JOB_STORE_BACKEND || (deployEnv === 'production' ? 'turso' : 'local');

  if (backend === 'turso') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TursoLeaseStore } = require('./TursoLeaseStore');
    _instance = new TursoLeaseStore(
      process.env.TURSO_DATABASE_URL!,
      process.env.TURSO_AUTH_TOKEN,
    );
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LocalLeaseStore } = require('./LocalLeaseStore');
    _instance = new LocalLeaseStore(
      process.env.JOB_STORE_DB_PATH || './audio-prep-jobs.db',
    );
  }

  return _instance!;
}

export function resetLeaseStore(): void {
  _instance = null;
}

export type { LeaseStore, LeaseRecord, AcquireLeaseResult } from './types';

