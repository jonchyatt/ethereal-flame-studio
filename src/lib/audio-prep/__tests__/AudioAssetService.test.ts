import { AudioAssetService } from '../AudioAssetService';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('AudioAssetService', () => {
  let service: AudioAssetService;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `audio-prep-test-${Date.now()}`);
    service = new AudioAssetService({ assetsDir: testDir });
    await service.init();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('init creates assets directory', async () => {
    const stat = await fs.stat(testDir);
    expect(stat.isDirectory()).toBe(true);
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

    const assetDir = path.join(testDir, result.assetId);
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

  test('deleteAsset removes asset directory', async () => {
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

    // Write a fake prepared.wav
    const preparedPath = path.join(testDir, created.assetId, 'prepared.wav');
    await fs.writeFile(preparedPath, 'prepared-audio');

    const resolved = await service.resolveAssetPath(created.assetId);
    expect(resolved).toBe(preparedPath);
  });

  test('resolveAssetPath throws when prepared.wav missing', async () => {
    const created = await service.createAsset(Buffer.from('a'), 'a.wav', {
      sourceType: 'audio_file',
    });

    await expect(service.resolveAssetPath(created.assetId)).rejects.toThrow(
      /prepared asset not found/i
    );
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

    // Write an edits.json that references the source asset
    const editsPath = path.join(testDir, consumer.assetId, 'edits.json');
    await fs.writeFile(editsPath, JSON.stringify({
      clips: [{ sourceAssetId: source.assetId, startTime: 0, endTime: 1 }]
    }));

    await expect(service.deleteAssetSafe(source.assetId)).rejects.toThrow(/referenced/i);
  });

  test('deleteAssetSafe with force=true deletes even when referenced', async () => {
    const source = await service.createAsset(Buffer.from('src'), 'src.wav', {
      sourceType: 'audio_file',
    });
    const consumer = await service.createAsset(Buffer.from('dst'), 'dst.wav', {
      sourceType: 'audio_file',
    });

    const editsPath = path.join(testDir, consumer.assetId, 'edits.json');
    await fs.writeFile(editsPath, JSON.stringify({
      clips: [{ sourceAssetId: source.assetId, startTime: 0, endTime: 1 }]
    }));

    await service.deleteAssetSafe(source.assetId, true);
    const result = await service.getAsset(source.assetId);
    expect(result).toBeNull();
  });

  test('cleanupExpired removes stale assets', async () => {
    // Create a service with a very short TTL for testing
    const shortTtlService = new AudioAssetService({ assetsDir: testDir, ttlDays: 0 });

    const created = await shortTtlService.createAsset(Buffer.from('old'), 'old.wav', {
      sourceType: 'audio_file',
    });

    // Backdate the metadata so it's "expired"
    const metadataPath = path.join(testDir, created.assetId, 'metadata.json');
    const meta = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    meta.updatedAt = '2020-01-01T00:00:00.000Z';
    await fs.writeFile(metadataPath, JSON.stringify(meta));

    const deleted = await shortTtlService.cleanupExpired();
    expect(deleted).toBe(1);
    expect(await shortTtlService.getAsset(created.assetId)).toBeNull();
  });
});
