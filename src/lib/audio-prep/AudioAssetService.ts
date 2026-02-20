import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { promises as fs } from 'fs';
import type { AssetMetadata, AssetProvenance, AudioPrepConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import type { StorageAdapter } from '@/lib/storage';
import { getStorageAdapter } from '@/lib/storage';

export class AudioAssetService {
  readonly config: AudioPrepConfig;
  private readonly storage: StorageAdapter;

  constructor(config: Partial<AudioPrepConfig> = {}, storage?: StorageAdapter) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = storage ?? getStorageAdapter();
  }

  /**
   * No-op for storage adapter (adapter handles directory creation on put).
   * Kept for backward compatibility with existing callers.
   */
  async init(): Promise<void> {
    // StorageAdapter.put() creates parent directories as needed.
    // No initialization required.
  }

  async createAsset(
    audioBuffer: Buffer,
    filename: string,
    provenance: Partial<AssetProvenance>
  ): Promise<AssetMetadata> {
    const assetId = crypto.randomUUID();
    const ext = path.extname(filename) || '.wav';

    await this.storage.put(`assets/${assetId}/original${ext}`, audioBuffer);

    const now = new Date().toISOString();
    const metadata: AssetMetadata = {
      assetId,
      createdAt: now,
      updatedAt: now,
      audio: {
        duration: 0,
        sampleRate: 0,
        channels: 0,
        codec: 'unknown',
        bitrate: 0,
        format: ext.replace('.', ''),
      },
      provenance: {
        sourceType: provenance.sourceType ?? 'audio_file',
        ...provenance,
      },
      originalFilename: filename,
    };

    await this.storage.put(
      `assets/${assetId}/metadata.json`,
      Buffer.from(JSON.stringify(metadata, null, 2))
    );

    return metadata;
  }

  async getAsset(assetId: string): Promise<AssetMetadata | null> {
    try {
      const data = await this.storage.get(`assets/${assetId}/metadata.json`);
      if (!data) return null;
      return JSON.parse(data.toString('utf-8')) as AssetMetadata;
    } catch {
      return null;
    }
  }

  async listAssets(): Promise<AssetMetadata[]> {
    try {
      const keys = await this.storage.list('assets/');
      // Extract unique assetId segments from keys like "assets/{assetId}/metadata.json"
      const assetIds = new Set<string>();
      for (const key of keys) {
        const parts = key.split('/');
        // key format: assets/{assetId}/{filename}
        if (parts.length >= 3 && parts[0] === 'assets') {
          assetIds.add(parts[1]);
        }
      }

      const assets: AssetMetadata[] = [];
      for (const assetId of assetIds) {
        const asset = await this.getAsset(assetId);
        if (asset) assets.push(asset);
      }
      return assets;
    } catch {
      return [];
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.storage.deletePrefix(`assets/${assetId}/`);
  }

  /**
   * Resolve the path to a prepared asset file.
   *
   * For LocalStorageAdapter: returns a direct filesystem path via `resolveKey()`.
   * For cloud storage: falls back to `resolveAssetToTempFile()` which downloads
   * to a local temp file suitable for ffmpeg processing.
   */
  async resolveAssetPath(assetId: string): Promise<string> {
    const keys = await this.storage.list(`assets/${assetId}/`);
    const preparedKey = keys.find(k => {
      const filename = k.split('/').pop() || '';
      return filename.startsWith('prepared.');
    });
    if (!preparedKey) {
      throw new Error(`Prepared asset not found for ${assetId}. Save edits first.`);
    }

    // If the adapter exposes resolveKey (LocalStorageAdapter), use it for a direct path
    if ('resolveKey' in this.storage && typeof (this.storage as any).resolveKey === 'function') {
      return (this.storage as any).resolveKey(preparedKey) as string;
    }

    // For cloud adapters, download to temp file
    return this.resolveAssetToTempFile(assetId);
  }

  /**
   * Download a prepared asset to a local temp file and return the temp file path.
   * This is the cloud-compatible approach for operations that need filesystem paths
   * (e.g., ffmpeg processing).
   *
   * **Callers are responsible for cleaning up the temp file when done.**
   *
   * @transitional Phase 14 worker will handle temp file lifecycle.
   */
  async resolveAssetToTempFile(assetId: string): Promise<string> {
    const keys = await this.storage.list(`assets/${assetId}/`);
    const preparedKey = keys.find(k => {
      const filename = k.split('/').pop() || '';
      return filename.startsWith('prepared.');
    });
    if (!preparedKey) {
      throw new Error(`Prepared asset not found for ${assetId}. Save edits first.`);
    }

    const data = await this.storage.get(preparedKey);
    if (!data) {
      throw new Error(`Failed to read prepared asset for ${assetId}`);
    }

    const ext = path.extname(preparedKey) || '.wav';
    const tempPath = path.join(os.tmpdir(), `asset-${assetId}-prepared${ext}`);
    await fs.writeFile(tempPath, data);
    return tempPath;
  }

  async updateMetadata(assetId: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const existing = await this.getAsset(assetId);
    if (!existing) throw new Error(`Asset ${assetId} not found`);

    const updated: AssetMetadata = {
      ...existing,
      ...updates,
      assetId: existing.assetId, // Never override ID
      updatedAt: new Date().toISOString(),
    };

    await this.storage.put(
      `assets/${assetId}/metadata.json`,
      Buffer.from(JSON.stringify(updated, null, 2))
    );
    return updated;
  }

  /**
   * @deprecated Use `getAssetPrefix(assetId)` for storage key-based access.
   * This method returns a filesystem path and only works with LocalStorageAdapter.
   * Kept for backward compatibility during the transition period.
   */
  getAssetDir(assetId: string): string {
    // If the adapter exposes resolveKey (LocalStorageAdapter), derive path from it
    if ('resolveKey' in this.storage && typeof (this.storage as any).resolveKey === 'function') {
      return (this.storage as any).resolveKey(`assets/${assetId}`) as string;
    }
    // Fallback for non-local adapters (shouldn't be called, but provides a sensible default)
    const storageBasePath = process.env.STORAGE_LOCAL_PATH || './storage';
    return path.resolve(storageBasePath, 'assets', assetId);
  }

  /**
   * Returns the storage key prefix for an asset. Use this with the StorageAdapter
   * for key-based access instead of the deprecated `getAssetDir()`.
   */
  getAssetPrefix(assetId: string): string {
    return `assets/${assetId}/`;
  }

  /**
   * Get a reference to the underlying storage adapter.
   * Useful for routes that need direct adapter access for put/get operations.
   */
  getStorage(): StorageAdapter {
    return this.storage;
  }

  // --- Lifecycle & Quota Methods ---

  /** Check if any saved recipe references this asset as a source */
  async isReferenced(assetId: string): Promise<boolean> {
    const allAssets = await this.listAssets();
    for (const asset of allAssets) {
      if (asset.assetId === assetId) continue;
      try {
        const data = await this.storage.get(`assets/${asset.assetId}/edits.json`);
        if (!data) continue;
        const recipe = JSON.parse(data.toString('utf-8'));
        if (recipe.clips?.some((c: any) => c.sourceAssetId === assetId)) return true;
      } catch { /* no edits file */ }
    }
    return false;
  }

  /** Delete asset with reference check. Throws if referenced unless force=true. */
  async deleteAssetSafe(assetId: string, force = false): Promise<void> {
    if (!force && await this.isReferenced(assetId)) {
      throw new Error(`Asset ${assetId} is referenced by other recipes. Use force=true to delete anyway.`);
    }
    await this.deleteAsset(assetId);
  }

  /** Get total disk usage of all assets in bytes */
  async getDiskUsage(): Promise<number> {
    let total = 0;
    try {
      const keys = await this.storage.list('assets/');
      for (const key of keys) {
        const stat = await this.storage.stat(key);
        if (stat) total += stat.size;
      }
    } catch { /* empty storage */ }
    return total;
  }

  /** Enforce disk quota. Returns true if under quota. */
  async checkQuota(): Promise<boolean> {
    const usage = await this.getDiskUsage();
    return usage < this.config.diskQuotaGB * 1024 * 1024 * 1024;
  }

  /** Delete assets whose updatedAt is older than ttlDays. Returns count of deleted assets. */
  async cleanupExpired(): Promise<number> {
    const cutoff = Date.now() - this.config.ttlDays * 24 * 60 * 60 * 1000;
    const assets = await this.listAssets();
    let deleted = 0;
    for (const asset of assets) {
      const lastUsed = new Date(asset.updatedAt).getTime();
      if (lastUsed < cutoff) {
        if (await this.isReferenced(asset.assetId)) {
          continue;
        }
        await this.deleteAsset(asset.assetId);
        deleted++;
      }
    }
    return deleted;
  }
}
