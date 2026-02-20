import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { probeAudio } from '../ffprobe';

function createSilentWavBuffer(
  durationSeconds = 1,
  sampleRate = 8000,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const numSamples = durationSeconds * sampleRate;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

const hasFfprobe = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
const describeIfFfprobe = hasFfprobe ? describe : describe.skip;

describeIfFfprobe('probeAudio', () => {
  let testDir = '';
  let fixturePath = '';

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffprobe-test-'));
    fixturePath = path.join(testDir, 'fixture.wav');
    await fs.writeFile(fixturePath, createSilentWavBuffer());
  });

  afterAll(async () => {
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  test('probes a generated WAV fixture and returns metadata', async () => {
    const result = await probeAudio(fixturePath);

    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBeGreaterThan(0);
    expect(result.channels).toBeGreaterThanOrEqual(1);
    expect(result.codec).toBeDefined();
    expect(result.bitrate).toBeGreaterThan(0);
    expect(result.format).toMatch(/wav|wave/i);
  });

  test('throws for nonexistent file', async () => {
    const missingPath = path.join(testDir, 'does-not-exist.wav');
    await expect(probeAudio(missingPath)).rejects.toThrow();
  });
});
