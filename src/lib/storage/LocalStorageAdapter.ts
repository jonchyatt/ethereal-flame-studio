import { promises as fs } from 'fs';
import path from 'path';
import type { StorageAdapter, PutOptions, UploadUrlOptions, FileStat } from './types';

/**
 * Filesystem-backed StorageAdapter for local development.
 *
 * Files are stored under `basePath` using the key as a relative path.
 * Signed/upload URLs point to local API routes that will be created in plan 12-03.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(basePath = './storage', baseUrl = 'http://localhost:3000') {
    this.basePath = path.resolve(basePath);
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // strip trailing slashes
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async put(key: string, data: Buffer | Uint8Array, _options?: PutOptions): Promise<void> {
    const fullPath = this.resolve(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err: unknown) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err: unknown) {
      if (isEnoent(err)) return; // no-op
      throw err;
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const keys = await this.list(prefix);
    for (const key of keys) {
      await this.delete(key);
    }
    // Clean up empty directories walking upward from prefix
    await this.pruneEmptyDirs(path.join(this.basePath, prefix));
  }

  // ---------------------------------------------------------------------------
  // List / Exists / Stat
  // ---------------------------------------------------------------------------

  async list(prefix: string): Promise<string[]> {
    const dir = path.join(this.basePath, prefix);
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relative = path.posix.join(prefix, entry.name);
        if (entry.isDirectory()) {
          const nested = await this.list(relative);
          results.push(...nested);
        } else {
          results.push(relative);
        }
      }
    } catch (err: unknown) {
      if (isEnoent(err)) return [];
      throw err;
    }

    return results;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<FileStat | null> {
    try {
      const s = await fs.stat(this.resolve(key));
      return { size: s.size, lastModified: s.mtime };
    } catch (err: unknown) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // URLs (local API routes — implemented in plan 12-03)
  // ---------------------------------------------------------------------------

  async getSignedUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    return `${this.baseUrl}/api/storage/download?key=${encodeURIComponent(key)}`;
  }

  async getUploadUrl(key: string, _options?: UploadUrlOptions): Promise<string> {
    return `${this.baseUrl}/api/storage/upload?key=${encodeURIComponent(key)}`;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve a storage key to an absolute filesystem path.
   * Public so that callers (e.g. AudioAssetService) can derive local paths
   * from storage keys when they need filesystem access (ffmpeg, etc.).
   */
  resolveKey(key: string): string {
    // Normalise forward-slash keys to OS-native paths
    return path.join(this.basePath, ...key.split('/'));
  }

  /** @internal Alias kept for backward-compat within this class. */
  private resolve(key: string): string {
    return this.resolveKey(key);
  }

  /** Remove empty directories walking upward, stopping at basePath. */
  private async pruneEmptyDirs(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        const parent = path.dirname(dir);
        if (parent.startsWith(this.basePath) && parent !== this.basePath) {
          await this.pruneEmptyDirs(parent);
        }
      }
    } catch {
      // Directory may already be gone
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function isEnoent(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT';
}
