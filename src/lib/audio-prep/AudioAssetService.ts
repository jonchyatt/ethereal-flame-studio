import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AssetMetadata, AssetProvenance, AudioPrepConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export class AudioAssetService {
  readonly config: AudioPrepConfig;

  constructor(config: Partial<AudioPrepConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    await fs.mkdir(this.config.assetsDir, { recursive: true });
  }

  async createAsset(
    audioBuffer: Buffer,
    filename: string,
    provenance: Partial<AssetProvenance>
  ): Promise<AssetMetadata> {
    const assetId = crypto.randomUUID();
    const ext = path.extname(filename) || '.wav';
    const assetDir = path.join(this.config.assetsDir, assetId);

    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, `original${ext}`), audioBuffer);

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

    await fs.writeFile(
      path.join(assetDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    return metadata;
  }

  async getAsset(assetId: string): Promise<AssetMetadata | null> {
    const metadataPath = path.join(this.config.assetsDir, assetId, 'metadata.json');
    try {
      const raw = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(raw) as AssetMetadata;
    } catch {
      return null;
    }
  }

  async listAssets(): Promise<AssetMetadata[]> {
    try {
      const entries = await fs.readdir(this.config.assetsDir, { withFileTypes: true });
      const assets: AssetMetadata[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const asset = await this.getAsset(entry.name);
          if (asset) assets.push(asset);
        }
      }
      return assets;
    } catch {
      return [];
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    const assetDir = path.join(this.config.assetsDir, assetId);
    await fs.rm(assetDir, { recursive: true, force: true });
  }

  async resolveAssetPath(assetId: string): Promise<string> {
    const preparedPath = path.join(this.config.assetsDir, assetId, 'prepared.wav');
    try {
      await fs.access(preparedPath);
      return preparedPath;
    } catch {
      throw new Error(`Prepared asset not found for ${assetId}. Save edits first.`);
    }
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

    const metadataPath = path.join(this.config.assetsDir, assetId, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2));
    return updated;
  }

  getAssetDir(assetId: string): string {
    return path.join(this.config.assetsDir, assetId);
  }

  // --- Lifecycle & Quota Methods ---

  /** Check if any saved recipe references this asset as a source */
  async isReferenced(assetId: string): Promise<boolean> {
    const allAssets = await this.listAssets();
    for (const asset of allAssets) {
      if (asset.assetId === assetId) continue;
      const editsPath = path.join(this.config.assetsDir, asset.assetId, 'edits.json');
      try {
        const raw = await fs.readFile(editsPath, 'utf-8');
        const recipe = JSON.parse(raw);
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
    const entries = await fs.readdir(this.config.assetsDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = await fs.readdir(path.join(this.config.assetsDir, entry.name));
      for (const file of files) {
        const stat = await fs.stat(path.join(this.config.assetsDir, entry.name, file));
        total += stat.size;
      }
    }
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
