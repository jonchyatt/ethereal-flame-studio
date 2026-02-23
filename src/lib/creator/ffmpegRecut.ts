import { spawn } from 'child_process';

export type RecutVideoOptions = {
  inputPath: string;
  outputPath: string;
  startSec: number;
  endSec: number;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  fps: 30 | 60;
  crf?: number;
  preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow';
};

export type RecutVideoResult = {
  success: boolean;
  outputPath: string;
  durationSec: number;
  ffmpegCommand: string;
  error?: string;
  stderrTail?: string;
};

function evenFloor(value: number): number {
  const floored = Math.max(2, Math.floor(value));
  return floored % 2 === 0 ? floored : floored - 1;
}

function buildCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let cropW = sourceWidth;
  let cropH = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceAspect > targetAspect) {
    cropH = evenFloor(sourceHeight);
    cropW = evenFloor(cropH * targetAspect);
    cropX = evenFloor((sourceWidth - cropW) / 2);
    cropY = 0;
  } else if (sourceAspect < targetAspect) {
    cropW = evenFloor(sourceWidth);
    cropH = evenFloor(cropW / targetAspect);
    cropX = 0;
    cropY = evenFloor((sourceHeight - cropH) / 2);
  } else {
    cropW = evenFloor(sourceWidth);
    cropH = evenFloor(sourceHeight);
  }

  cropW = Math.min(cropW, evenFloor(sourceWidth));
  cropH = Math.min(cropH, evenFloor(sourceHeight));
  cropX = Math.max(0, Math.min(cropX, Math.max(0, evenFloor(sourceWidth - cropW))));
  cropY = Math.max(0, Math.min(cropY, Math.max(0, evenFloor(sourceHeight - cropH))));

  return { cropW, cropH, cropX, cropY };
}

export async function runFfmpegRecut(options: RecutVideoOptions): Promise<RecutVideoResult> {
  const startSec = Math.max(0, Number(options.startSec) || 0);
  const endSec = Math.max(startSec + 0.05, Number(options.endSec) || startSec + 1);
  const durationSec = Number((endSec - startSec).toFixed(3));
  const crop = buildCrop(options.sourceWidth, options.sourceHeight, options.targetWidth, options.targetHeight);
  const crf = options.crf ?? 20;
  const preset = options.preset ?? 'medium';
  const vf = `crop=${crop.cropW}:${crop.cropH}:${crop.cropX}:${crop.cropY},scale=${evenFloor(options.targetWidth)}:${evenFloor(options.targetHeight)}:flags=lanczos,fps=${options.fps}`;

  const args = [
    '-y',
    '-ss', startSec.toFixed(3),
    '-t', durationSec.toFixed(3),
    '-i', options.inputPath,
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-movflags', '+faststart',
    options.outputPath,
  ];

  const ffmpegCommand = `ffmpeg ${args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ')}`;

  return new Promise<RecutVideoResult>((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 32_000) {
        stderr = stderr.slice(-24_000);
      }
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        outputPath: options.outputPath,
        durationSec,
        ffmpegCommand,
        error: err.message,
        stderrTail: stderr.trim().slice(-2000),
      });
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          outputPath: options.outputPath,
          durationSec,
          ffmpegCommand,
          stderrTail: stderr.trim().slice(-2000),
        });
        return;
      }

      resolve({
        success: false,
        outputPath: options.outputPath,
        durationSec,
        ffmpegCommand,
        error: `ffmpeg exited with code ${code ?? 'unknown'}`,
        stderrTail: stderr.trim().slice(-4000),
      });
    });
  });
}

