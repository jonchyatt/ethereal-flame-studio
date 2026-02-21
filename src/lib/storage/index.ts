import type { StorageAdapter } from './types';

/**
 * Singleton storage adapter instance.  Lazily created on first call to
 * `getStorageAdapter()` and cached for the lifetime of the process.
 */
let _instance: StorageAdapter | null = null;

/**
 * Return the storage adapter for the current environment.
 *
 * - `STORAGE_BACKEND=r2`    -> R2StorageAdapter  (production / Cloudflare R2)
 * - `STORAGE_BACKEND=local` -> LocalStorageAdapter (default, local dev)
 *
 * Uses `require()` rather than static imports so that `@aws-sdk/client-s3` is
 * never loaded in local development and does not bloat the client bundle.
 */
export function getStorageAdapter(): StorageAdapter {
  if (_instance) return _instance;

  const deployEnv = process.env.DEPLOY_ENV;
  const backend = process.env.STORAGE_BACKEND || (deployEnv === 'production' ? 'r2' : 'local');

  if (backend === 'r2') {
    // Dynamic require keeps @aws-sdk out of the local-dev bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { R2StorageAdapter } = require('./R2StorageAdapter');
    _instance = new R2StorageAdapter({
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME || 'ethereal-flame-studio',
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LocalStorageAdapter } = require('./LocalStorageAdapter');
    _instance = new LocalStorageAdapter(
      process.env.STORAGE_LOCAL_PATH || './storage',
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    );
  }

  return _instance!;
}

/**
 * Reset the cached adapter instance.  Useful in tests to switch backends
 * between test cases.
 */
export function resetStorageAdapter(): void {
  _instance = null;
}

// Re-export all types so consumers can `import { StorageAdapter } from '@/lib/storage'`
export type { StorageAdapter, FileStat, PutOptions, UploadUrlOptions, StorageConfig } from './types';
