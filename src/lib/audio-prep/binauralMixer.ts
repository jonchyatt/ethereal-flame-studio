import { spawn } from 'child_process';
import { buildBinauralFiltergraph, type BinauralMixRecipe } from './binauralFiltergraph';

// Thin exec wrapper around buildBinauralFiltergraph. Sibling to audioRenderer.ts —
// does NOT touch it or filterComplexBuilder.ts (the existing single-track/concat path).

export interface MixBinauralOptions {
  outputSampleRate?: number;
  signal?: AbortSignal;
}

/** Layers recipe.sources + recipe.musicBed into one binaural-differentiated PCM WAV at outputPath. */
export async function mixBinaural(
  recipe: BinauralMixRecipe,
  assetPaths: Record<string, string>,
  outputPath: string,
  options: MixBinauralOptions = {}
): Promise<void> {
  const { inputs, filterComplex, outputLabel } = buildBinauralFiltergraph(recipe, assetPaths, {
    outputSampleRate: options.outputSampleRate,
  });

  const args: string[] = ['-y'];
  for (const input of inputs) {
    args.push('-i', input);
  }
  args.push('-filter_complex', filterComplex);
  args.push('-map', outputLabel);
  args.push('-codec:a', 'pcm_s16le'); // PCM WAV — not lossy, per spike verification requirement
  args.push(outputPath);

  await runFFmpeg(args, options.signal);
}

function runFFmpeg(args: string[], signal?: AbortSignal): Promise<void> {
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
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1000)}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to run ffmpeg: ${err.message}`)));
  });
}
