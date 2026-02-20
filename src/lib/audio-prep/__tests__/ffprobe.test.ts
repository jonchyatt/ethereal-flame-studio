import { probeAudio } from '../ffprobe';
import path from 'path';

describe('probeAudio', () => {
  test('probes a real audio file and returns metadata', async () => {
    // Use any audio file from the audio/ directory
    const testFile = path.resolve('audio/SirAnthony.mp3');
    const result = await probeAudio(testFile);

    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBeGreaterThan(0);
    expect(result.channels).toBeGreaterThanOrEqual(1);
    expect(result.codec).toBeDefined();
    expect(result.bitrate).toBeGreaterThan(0);
    expect(result.format).toBeDefined();
  });

  test('throws for nonexistent file', async () => {
    await expect(probeAudio('/nonexistent/file.wav')).rejects.toThrow();
  });
});
