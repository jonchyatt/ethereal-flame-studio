import { spawn } from 'child_process';
import type { RgbFrame } from './score';

function run(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c) => { stderr += String(c); });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-400)}`))));
  });
}

/** Grabs one small RGB frame at a timestamp, for scoring. */
export async function grabRgbFrame(videoPath: string, timestampSec: number, width = 160, height = 90): Promise<RgbFrame> {
  const buf = await run(['-ss', String(timestampSec), '-i', videoPath, '-frames:v', '1', '-vf', `scale=${width}:${height}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  if (buf.length < width * height * 3) throw new Error(`no frame at ${timestampSec}s (past the end of the video?)`);
  return { width, height, data: new Uint8Array(buf.buffer, buf.byteOffset, width * height * 3) };
}

/** Writes a 1280x720 PNG still at a timestamp. */
export async function writeStill(videoPath: string, timestampSec: number, outPath: string, width = 1280, height = 720): Promise<void> {
  await run(['-y', '-ss', String(timestampSec), '-i', videoPath, '-frames:v', '1', '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`, outPath]);
}

/** Tiles stills into one contact sheet so the options can be compared at a glance. */
export async function writeContactSheet(stillPaths: string[], outPath: string, tileWidth = 640): Promise<void> {
  const inputs = stillPaths.flatMap((p) => ['-i', p]);
  const scaled = stillPaths.map((_, i) => `[${i}:v]scale=${tileWidth}:-2[s${i}]`).join(';');
  const stack = stillPaths.map((_, i) => `[s${i}]`).join('') + `hstack=inputs=${stillPaths.length}[out]`;
  await run([...inputs, '-y', '-filter_complex', `${scaled};${stack}`, '-map', '[out]', '-frames:v', '1', outPath]);
}

export async function probeDurationSec(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => { out += String(c); });
    child.on('error', reject);
    child.on('exit', (code) => {
      const d = Number(out.trim());
      return code === 0 && Number.isFinite(d) && d > 0 ? resolve(d) : reject(new Error(`ffprobe could not read a duration (${code})`));
    });
  });
}
