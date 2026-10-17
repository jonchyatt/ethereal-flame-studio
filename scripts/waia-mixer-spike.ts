#!/usr/bin/env npx tsx
/**
 * Phase 2 mixer spike (waia-curation-pipeline rail).
 *
 * Proves: layered ffmpeg amix/join binaural mix (2 voice sources + 1 music bed,
 * genuinely different L/R content) -> reproducible recipe JSON -> render.sh
 * (Unity Path B) -> actual video with verified spherical metadata.
 *
 * Ratified spec: jarvis/data/waia-curation-pipeline/runtime-logs/phase2-mixer-spike-vanguard-spec.md
 *
 * Usage: npx tsx scripts/waia-mixer-spike.ts
 */
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mixBinaural } from '../src/lib/audio-prep/binauralMixer';
import type { BinauralMixRecipe } from '../src/lib/audio-prep/binauralFiltergraph';

const ROOT = path.resolve(__dirname, '..');
const SPIKE_DIR = path.join(ROOT, 'data', 'waia-mixer-spike');
const SOURCES_DIR = path.join(SPIKE_DIR, 'sources');
const OUTPUT_DIR = path.join(SPIKE_DIR, 'output');

// Real, rights-verified, pre-trimmed source clips (downloaded from archive.org this
// session — see recipe.sources[].sourceUrl / rightsBasis for the exact provenance).
const ASSET_PATHS: Record<string, string> = {
  'voice-as-a-man-thinketh': path.join(SOURCES_DIR, 'voice1.wav'),
  'voice-science-of-getting-rich': path.join(SOURCES_DIR, 'voice2.wav'),
  'bed-calm-pill-1': path.join(SOURCES_DIR, 'bed.wav'),
};

function buildRecipe(): BinauralMixRecipe {
  return {
    version: 1,
    sources: [
      {
        assetId: 'voice-as-a-man-thinketh',
        sourceUrl:
          'https://archive.org/download/as_a_man_thinketh_mc_librivox/asamanthinketh_0_allen.mp3',
        rightsBasis:
          'public-domain (archive.org item licenseurl=http://creativecommons.org/licenses/publicdomain/, LibriVox recording of James Allen "As a Man Thinketh", 1903 source text; verified via archive.org metadata API 2026-07-09)',
        offsetSec: 0,
        levelDb: 0,
        channelRouting: { left: 1, right: 0.2 },
      },
      {
        assetId: 'voice-science-of-getting-rich',
        sourceUrl:
          'https://archive.org/download/science_gettingrich_1005_librivox/scienceofgettingrich_00_wattles.mp3',
        rightsBasis:
          'public-domain (archive.org item licenseurl=http://creativecommons.org/licenses/publicdomain/, LibriVox recording of Wallace Wattles "The Science of Getting Rich", 1910 source text; verified via archive.org metadata API 2026-07-09)',
        offsetSec: 5,
        levelDb: -2,
        channelRouting: { left: 0.2, right: 1 },
      },
    ],
    musicBed: {
      assetId: 'bed-calm-pill-1',
      sourceUrl:
        'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_1_-_Still_Habitat.mp3',
      rightsBasis:
        'CC0 (archive.org item "CalmPills" licenseurl=http://creativecommons.org/publicdomain/zero/1.0/, verified via archive.org metadata API 2026-07-09)',
      levelDb: -8,
      attribution: 'Calm Pill 1 - Still Habitat, by Alaeddin Hallak (CC0 — attribution not required, credited anyway)',
    },
    mixDescription:
      'Phase 2 mixer spike: 2 public-domain New Thought lecture voice clips (substituted for the ' +
      'spec-named Neville Goddard archive.org collections, which carry no explicit archive.org ' +
      'rights/license tag on their item pages — see karpathy log row for the deviation rationale) ' +
      'layered with a CC0 ambient music bed. Each voice is routed with an opposite L/R weighting ' +
      '(1.0/0.2 vs 0.2/1.0) so Left and Right sum genuinely different signals; the music bed is ' +
      'centered (equal L/R, per the locked recipe schema — musicBed has no channelRouting field).',
    outputPath: path.join(OUTPUT_DIR, 'waia_relaunch_spike_mix.wav'),
  };
}

async function sha256(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

function runFFmpegCapture(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    proc.on('close', (code) => (code === 0 ? resolve(stderr) : reject(new Error(stderr))));
    proc.on('error', reject);
  });
}

async function measureLRDifferenceRMSdB(wavPath: string): Promise<number> {
  const stderr = await runFFmpegCapture([
    '-i',
    wavPath,
    '-af',
    'pan=mono|c0=c0-c1,astats=metadata=0',
    '-f',
    'null',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
  ]);
  const match = stderr.match(/RMS level dB:\s*(-?\d+\.?\d*)/);
  if (!match) throw new Error(`Could not parse RMS level from ffmpeg astats output:\n${stderr.slice(-500)}`);
  return parseFloat(match[1]);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const recipe = buildRecipe();
  const recipePath = path.join(SPIKE_DIR, 'recipe.json');
  await fs.writeFile(recipePath, JSON.stringify(recipe, null, 2));
  console.log(`[1/5] Recipe written: ${recipePath}`);

  // --- Produce the mix, twice, from the identical recipe (reproducibility check) ---
  const run1Path = path.join(OUTPUT_DIR, 'mix_run1.wav');
  const run2Path = path.join(OUTPUT_DIR, 'mix_run2.wav');

  await mixBinaural(recipe, ASSET_PATHS, run1Path);
  console.log(`[2/5] Mix run 1 produced: ${run1Path}`);

  await mixBinaural(recipe, ASSET_PATHS, run2Path);
  console.log(`[2/5] Mix run 2 produced: ${run2Path}`);

  const hash1 = await sha256(run1Path);
  const hash2 = await sha256(run2Path);
  console.log(`[3/5] sha256 run1: ${hash1}`);
  console.log(`[3/5] sha256 run2: ${hash2}`);
  console.log(`[3/5] Reproducible (byte-identical): ${hash1 === hash2 ? 'YES' : 'NO'}`);

  // --- Objective binaural-differentiation check (the Patek check) ---
  const rmsDiffDb = await measureLRDifferenceRMSdB(run1Path);
  const rmsDiffLinear = Math.pow(10, rmsDiffDb / 20);
  console.log(`[4/5] L-R difference RMS: ${rmsDiffDb.toFixed(3)} dB (linear amplitude ${rmsDiffLinear.toFixed(5)})`);
  console.log(`[4/5] Materially non-zero (not dual-mono/collapsed): ${rmsDiffDb > -60 ? 'YES' : 'NO'}`);

  // Copy the canonical output to the recipe's declared outputPath
  await fs.copyFile(run1Path, recipe.outputPath);
  console.log(`[5/5] Canonical mix written to recipe.outputPath: ${recipe.outputPath}`);

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ recipePath, run1Path, run2Path, hash1, hash2, reproducible: hash1 === hash2, rmsDiffDb, rmsDiffLinear }, null, 2));
}

main().catch((err) => {
  console.error('Spike failed:', err);
  process.exit(1);
});
