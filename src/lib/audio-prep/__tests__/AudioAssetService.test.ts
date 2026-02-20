import { AudioAssetService } from '../AudioAssetService';
import { LocalStorageAdapter } from '@/lib/storage/LocalStorageAdapter';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('AudioAssetService', () => {
  let service: AudioAssetService;
  let testDir: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `audio-prep-test-${Date.now()}`);
    storage = new LocalStorageAdapter(testDir, 'http://localhost:3000');
    service = new AudioAssetService({}, storage);
    await service.init();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('init is a no-op (adapter handles directory creation)', async () => {
    // init() should not throw
    await service.init();
  });

  test('createAsset stores file and returns metadata', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const result = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    expect(result.assetId).toBeDefined();
    expect(result.assetId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    // Verify file stored via storage adapter at assets/{assetId}/original.wav
    const assetDir = path.join(testDir, 'assets', result.assetId);
    const stat = await fs.stat(assetDir);
    expect(stat.isDirectory()).toBe(true);

    const originalFile = await fs.readFile(path.join(assetDir, 'original.wav'));
    expect(originalFile.toString()).toBe('fake-audio-data');
  });

  test('getAsset returns stored metadata', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const created = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    const retrieved = await service.getAsset(created.assetId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.assetId).toBe(created.assetId);
  });

  test('getAsset returns null for nonexistent ID', async () => {
    const result = await service.getAsset('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  test('deleteAsset removes asset data', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const created = await service.createAsset(audioBuffer, 'test.wav', {
      sourceType: 'audio_file',
    });

    await service.deleteAsset(created.assetId);

    const retrieved = await service.getAsset(created.assetId);
    expect(retrieved).toBeNull();
  });

  test('listAssets returns all assets', async () => {
    await service.createAsset(Buffer.from('a'), 'a.wav', { sourceType: 'audio_file' });
    await service.createAsset(Buffer.from('b'), 'b.wav', { sourceType: 'audio_file' });

    const assets = await service.listAssets();
    expect(assets).toHaveLength(2);
  });

  test('resolveAssetPath returns prepared.wav path', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    // Write a fake prepared.wav via storage adapter
    await storage.put(`assets/${created.assetId}/prepared.wav`, Buffer.from('prepared-audio'));

    const resolved = await service.resolveAssetPath(created.assetId);
    const expectedPath = path.resolve(testDir, 'assets', created.assetId, 'prepared.wav');
    // Normalize both paths for cross-platform comparison
    expect(path.resolve(resolved)).toBe(expectedPath);
  });

  test('resolveAssetPath throws when prepared.wav missing', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    await expect(service.resolveAssetPath(created.assetId)).rejects.toThrow(
      /prepared asset not found/i
    );
  });

  test('resolveAssetToTempFile downloads prepared file to temp dir', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    await storage.put(`assets/${created.assetId}/prepared.wav`, Buffer.from('prepared-audio'));

    const tempPath = await service.resolveAssetToTempFile(created.assetId);
    expect(tempPath).toContain(os.tmpdir());
    const content = await fs.readFile(tempPath, 'utf-8');
    expect(content).toBe('prepared-audio');

    // Cleanup
    await fs.unlink(tempPath).catch(() => {});
  });

  test('getAssetPrefix returns storage key prefix', () => {
    const prefix = service.getAssetPrefix('test-id');
    expect(prefix).toBe('assets/test-id/');
  });

  // --- Lifecycle & Quota Tests ---

  test('checkQuota returns true when under quota', async () => {
    await service.createAsset(Buffer.from('small'), 'a.wav', { sourceType: 'audio_file' });
    const underQuota = await service.checkQuota();
    expect(underQuota).toBe(true);
  });

  test('getDiskUsage returns total bytes across all assets', async () => {
    await service.createAsset(Buffer.from('12345'), 'a.wav', { sourceType: 'audio_file' });
    const usage = await service.getDiskUsage();
    expect(usage).toBeGreaterThan(0);
  });

  test('deleteAssetSafe throws when asset is referenced', async () => {
    const source = await service.createAsset(Buffer.from('src'), 'src.wav', {
      sourceType: 'audio_file',
    });
    const consumer = await service.createAsset(Buffer.from('dst'), 'dst.wav', {
      sourceType: 'audio_file',
    });

    // Write an edits.json that references the source asset via storage adapter
    await storage.put(
      `assets/${consumer.assetId}/edits.json`,
      Buffer.from(JSON.stringify({
        clips: [{ sourceAssetId: source.assetId, startTime: 0, endTime: 1 }]
      }))
    );

    await expect(service.deleteAssetSafe(source.assetId)).rejects.toThrow(/referenced/i);
  });

  test('deleteAssetSafe with force=true deletes even when referenced', async () => {
    const source = await service.createAsset(Buffer.from('src'), 'src.wav', {
      sourceType: 'audio_file',
    });
    const consumer = await service.createAsset(Buffer.from('dst'), 'dst.wav', {
      sourceType: 'audio_file',
    });

    await storage.put(
      `assets/${consumer.assetId}/edits.json`,
      Buffer.from(JSON.stringify({
        clips: [{ sourceAssetId: source.assetId, startTime: 0, endTime: 1 }]
      }))
    );

    await service.deleteAssetSafe(source.assetId, true);
    const result = await service.getAsset(source.assetId);
    expect(result).toBeNull();
  });

  test('cleanupExpired removes stale assets', async () => {
    // Create a service with a very short TTL for testing
    const shortTtlService = new AudioAssetService({ ttlDays: 0 }, storage);

    const created = await shortTtlService.createAsset(Buffer.from('old'), 'old.wav', {
      sourceType: 'audio_file',
    });

    // Backdate the metadata so it's "expired" via storage adapter
    const metaKey = `assets/${created.assetId}/metadata.json`;
    const metaData = await storage.get(metaKey);
    const meta = JSON.parse(metaData!.toString('utf-8'));
    meta.updatedAt = '2020-01-01T00:00:00.000Z';
    await storage.put(metaKey, Buffer.from(JSON.stringify(meta)));

    const deleted = await shortTtlService.cleanupExpired();
    expect(deleted).toBe(1);
    expect(await shortTtlService.getAsset(created.assetId)).toBeNull();
  });

  test('cleanupExpired skips stale assets that are still referenced', async () => {
    const shortTtlService = new AudioAssetService({ ttlDays: 0 }, storage);

    const source = await shortTtlService.createAsset(Buffer.from('src'), 'src.wav', {
      sourceType: 'audio_file',
    });
    const consumer = await shortTtlService.createAsset(Buffer.from('dst'), 'dst.wav', {
      sourceType: 'audio_file',
    });

    await storage.put(
      `assets/${consumer.assetId}/edits.json`,
      Buffer.from(JSON.stringify({
        clips: [{ sourceAssetId: source.assetId, startTime: 0, endTime: 1 }],
      }))
    );

    // Backdate source metadata
    const sourceMetaKey = `assets/${source.assetId}/metadata.json`;
    const sourceMetaData = await storage.get(sourceMetaKey);
    const sourceMeta = JSON.parse(sourceMetaData!.toString('utf-8'));
    sourceMeta.updatedAt = '2020-01-01T00:00:00.000Z';
    await storage.put(sourceMetaKey, Buffer.from(JSON.stringify(sourceMeta)));

    // Keep consumer fresh
    const consumerMetaKey = `assets/${consumer.assetId}/metadata.json`;
    const consumerMetaData = await storage.get(consumerMetaKey);
    const consumerMeta = JSON.parse(consumerMetaData!.toString('utf-8'));
    consumerMeta.updatedAt = '2999-01-01T00:00:00.000Z';
    await storage.put(consumerMetaKey, Buffer.from(JSON.stringify(consumerMeta)));

    const deleted = await shortTtlService.cleanupExpired();
    expect(deleted).toBe(0);
    expect(await shortTtlService.getAsset(source.assetId)).not.toBeNull();
  });
});
