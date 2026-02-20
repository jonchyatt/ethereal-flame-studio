import { spawn } from 'child_process';

interface PeaksOptions {
  pixelsPerSecond?: number;
  zoomLevels?: number[];
}

export async function generatePeaks(
  filePath: string,
  options: PeaksOptions & { zoomLevels: number[] }
): Promise<Record<string, number[]>>;
export async function generatePeaks(
  filePath: string,
  options: PeaksOptions & { pixelsPerSecond: number }
): Promise<number[]>;
export async function generatePeaks(
  filePath: string,
  options: PeaksOptions
): Promise<number[] | Record<string, number[]>> {
  if (options.zoomLevels) {
    const result: Record<string, number[]> = {};
    for (const pps of options.zoomLevels) {
      result[String(pps)] = await generateSingleLevel(filePath, pps);
    }
    return result;
  }
  return generateSingleLevel(filePath, options.pixelsPerSecond ?? 50);
}

async function generateSingleLevel(filePath: string, pixelsPerSecond: number): Promise<number[]> {
  // Decode to raw 16-bit PCM mono at target sample rate
  const sampleRate = pixelsPerSecond * 256; // 256 samples per pixel bucket
  const args = [
    '-i', filePath,
    '-f', 's16le',
    '-ac', '1',
    '-ar', String(Math.min(sampleRate, 44100)),
    '-acodec', 'pcm_s16le',
    'pipe:1',
  ];

  const rawPcm = await runProcessBuffer('ffmpeg', args);
  const samples = new Int16Array(rawPcm.buffer, rawPcm.byteOffset, rawPcm.byteLength / 2);

  // Compute actual samples per pixel
  const actualSampleRate = Math.min(sampleRate, 44100);
  const samplesPerPixel = Math.floor(actualSampleRate / pixelsPerSecond);
  const peaks: number[] = [];

  for (let i = 0; i < samples.length; i += samplesPerPixel) {
    let min = 0;
    let max = 0;
    const end = Math.min(i + samplesPerPixel, samples.length);
    for (let j = i; j < end; j++) {
      const val = samples[j] / 32768;
      if (val < min) min = val;
      if (val > max) max = val;
    }
    peaks.push(min, max);
  }

  return peaks;
}

function runProcessBuffer(command: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on('data', () => {}); // Discard ffmpeg stderr progress

    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`${command} exited with code ${code}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to run ${command}: ${err.message}`)));
  });
}
