import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { generatePeaks } from '../peaksGenerator';

// Generate a 1-second silent WAV fixture so tests are self-contained
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

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const describeIfFfmpeg = hasFfmpeg ? describe : describe.skip;

describeIfFfmpeg('generatePeaks', () => {
  let testDir = '';
  let fixturePath = '';

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'peaks-test-'));
    fixturePath = path.join(testDir, 'fixture.wav');
    await fs.writeFile(fixturePath, createSilentWavBuffer());
  });

  afterAll(async () => {
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  test('generates peaks array from audio file', async () => {
    const peaks = await generatePeaks(fixturePath, { pixelsPerSecond: 50 });

    expect(peaks.length).toBeGreaterThan(0);
    // Peaks should be normalized -1 to 1
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(-1);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  test('generates multiple zoom levels', async () => {
    const result = await generatePeaks(fixturePath, {
      zoomLevels: [25, 50, 100],
    });

    expect(result).toHaveProperty('25');
    expect(result).toHaveProperty('50');
    expect(result).toHaveProperty('100');
    // Higher zoom = more peaks
    expect(result['100'].length).toBeGreaterThan(result['25'].length);
  });
});
