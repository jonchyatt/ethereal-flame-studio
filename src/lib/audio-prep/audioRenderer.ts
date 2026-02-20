import { spawn } from 'child_process';
import path from 'path';
import { buildFilterComplex } from './filterComplexBuilder';
import type { EditRecipe } from './types';

interface RenderOptions {
  preview?: boolean;
  twoPassNormalize?: boolean;
  signal?: AbortSignal;
}

export async function renderRecipe(
  recipe: EditRecipe,
  assetPaths: Record<string, string>,
  outputPath: string,
  options: RenderOptions = {}
): Promise<void> {
  const { preview = false, twoPassNormalize = false, signal } = options;

  // Preview: include 1-pass loudnorm in filter graph.
  // Save: skip loudnorm in graph; 2-pass loudnorm runs after render (avoids double normalization).
  const { inputs, filterComplex, outputLabel } = buildFilterComplex(recipe, assetPaths, {
    includeNormalize: preview, // Only for preview
  });

  const args: string[] = ['-y']; // Overwrite output

  // Add inputs
  for (const input of inputs) {
    args.push('-i', input);
  }

  // Add filter_complex
  args.push('-filter_complex', filterComplex);

  // Map output
  args.push('-map', outputLabel);

  if (preview) {
    // Low-quality MP3 for preview
    args.push('-codec:a', 'libmp3lame', '-b:a', '128k');
  } else {
    // High-quality output
    if (outputPath.endsWith('.wav')) {
      args.push('-codec:a', 'pcm_s16le');
    } else {
      args.push('-codec:a', 'aac', '-b:a', '384k');
    }
  }

  args.push(outputPath);

  await runFFmpeg(args, signal);

  // 2-pass loudnorm for save (not preview)
  if (twoPassNormalize && recipe.normalize) {
    await twoPassLoudnorm(outputPath, signal);
  }
}

function codecForExtension(filePath: string): string[] {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.wav': return ['-codec:a', 'pcm_s16le'];
    case '.aac':
    case '.m4a': return ['-codec:a', 'aac', '-b:a', '384k'];
    case '.mp3': return ['-codec:a', 'libmp3lame', '-b:a', '320k'];
    default:     return ['-codec:a', 'pcm_s16le'];
  }
}

async function twoPassLoudnorm(filePath: string, signal?: AbortSignal): Promise<void> {
  // Pass 1: Measure loudness
  const measureArgs = [
    '-i', filePath,
    '-af', 'loudnorm=print_format=json',
    '-f', 'null',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
  ];

  const measureOutput = await runFFmpeg(measureArgs, signal, true);

  // Parse loudnorm JSON from stderr
  const jsonMatch = measureOutput.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (!jsonMatch) return; // Skip if can't parse

  const stats = JSON.parse(jsonMatch[0]);

  // Pass 2: Apply measured loudness (match original format)
  const tempPath = filePath.replace(/(\.\w+)$/, '_normalized$1');
  const normalizeArgs = [
    '-y', '-i', filePath,
    '-af', `loudnorm=measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:linear=true`,
    ...codecForExtension(filePath),
    tempPath,
  ];

  await runFFmpeg(normalizeArgs, signal);

  // Replace original with normalized
  const { promises: fs } = await import('fs');
  await fs.rename(tempPath, filePath);
}

function runFFmpeg(args: string[], signal?: AbortSignal, captureStderr = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    if (signal) {
      signal.addEventListener('abort', () => proc.kill('SIGTERM'), { once: true });
    }

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(captureStderr ? stderr : '');
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to run ffmpeg: ${err.message}`)));
  });
}
