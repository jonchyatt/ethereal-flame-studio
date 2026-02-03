#!/usr/bin/env npx tsx
/**
 * Ethereal Flame Local Render CLI
 *
 * Renders videos locally without Redis/queue infrastructure.
 * Takes a config file exported from the web UI.
 *
 * Usage:
 *   npx tsx scripts/render-cli.ts --config render-job.json
 *   npm run render:local -- --config render-job.json
 *
 * Plan 03-12
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { RenderConfigSchema, validateConfig, getResolution, type RenderConfig } from '../src/lib/render/renderConfig';
import { renderVideo, RenderVideoProgress } from '../src/lib/render/renderVideo';
import { OutputFormat } from '../src/lib/render/FFmpegEncoder';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// Progress bar characters
const BAR_FILLED = '█';
const BAR_EMPTY = '░';
const BAR_WIDTH = 30;

/**
 * Parse command line arguments
 */
function parseArgs(): { configPath?: string; audioPath?: string; outputPath?: string; help: boolean } {
  const args = process.argv.slice(2);
  const result = { configPath: undefined as string | undefined, audioPath: undefined as string | undefined, outputPath: undefined as string | undefined, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      result.configPath = args[++i];
    } else if (arg === '--audio' || arg === '-a') {
      result.audioPath = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.outputPath = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
${colors.bright}Ethereal Flame Local Render CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx tsx scripts/render-cli.ts --config <config.json>
  npm run render:local -- --config <config.json>

${colors.cyan}Options:${colors.reset}
  -c, --config <path>   Path to render config JSON file (required)
  -a, --audio <path>    Override audio path from config
  -o, --output <path>   Override output path from config
  -h, --help            Show this help message

${colors.cyan}Config File:${colors.reset}
  Export from web UI using "Export Config" button, or create manually:

  {
    "version": "1.0",
    "audio": { "path": "./audio/song.mp3" },
    "output": {
      "path": "./output/video.mp4",
      "format": "flat-1080p-landscape",
      "fps": 30
    },
    "visual": {
      "mode": "flame",
      "skyboxPreset": "DarkWorld1",
      ...
    }
  }

${colors.cyan}Examples:${colors.reset}
  # Basic render
  npx tsx scripts/render-cli.ts -c render-job.json

  # Override paths
  npx tsx scripts/render-cli.ts -c render-job.json -a ./song.mp3 -o ./out.mp4
`);
}

/**
 * Print header banner
 */
function printHeader(): void {
  console.log(`
${colors.bright}╔══════════════════════════════════════════════════════╗
║  ${colors.cyan}Ethereal Flame Renderer${colors.reset}${colors.bright} v1.0                        ║
╚══════════════════════════════════════════════════════╝${colors.reset}
`);
}

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create a progress bar string
 */
function progressBar(percent: number): string {
  const filled = Math.round((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(empty);
}

/**
 * Print render progress
 */
function printProgress(progress: RenderVideoProgress, startTime: number): void {
  const elapsed = (Date.now() - startTime) / 1000;
  const eta = progress.overallProgress > 0
    ? (elapsed / progress.overallProgress) * (100 - progress.overallProgress)
    : 0;

  // Clear previous line and print new progress
  process.stdout.write('\r\x1b[K');

  const stageIcon = progress.stage === 'complete' ? '✓' : '►';
  const stageColor = progress.stage === 'complete' ? colors.green : colors.yellow;

  process.stdout.write(
    `${stageColor}${stageIcon}${colors.reset} ${progress.message} ` +
    `${colors.cyan}${progressBar(progress.overallProgress)}${colors.reset} ` +
    `${Math.round(progress.overallProgress)}% ` +
    `${colors.dim}(ETA: ${formatDuration(eta)})${colors.reset}`
  );
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.configPath) {
    console.error(`${colors.red}Error: --config is required${colors.reset}`);
    console.log('Use --help for usage information');
    process.exit(1);
  }

  printHeader();

  // Load config file
  console.log(`${colors.dim}Loading config: ${args.configPath}${colors.reset}`);

  let configJson: unknown;
  try {
    const configText = await fs.readFile(args.configPath, 'utf-8');
    configJson = JSON.parse(configText);
  } catch (error) {
    console.error(`${colors.red}Error loading config file:${colors.reset}`, error);
    process.exit(1);
  }

  // Validate config
  const validation = validateConfig(configJson);
  if (!validation.valid) {
    console.error(`${colors.red}Invalid config file:${colors.reset}`);
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  const config = validation.config;

  // Apply path overrides
  const audioPath = args.audioPath || config.audio.path;
  const outputPath = args.outputPath || config.output.path;

  // Resolve relative paths relative to config file directory
  const configDir = path.dirname(path.resolve(args.configPath));
  const resolvedAudioPath = path.isAbsolute(audioPath) ? audioPath : path.join(configDir, audioPath);
  const resolvedOutputPath = path.isAbsolute(outputPath) ? outputPath : path.join(configDir, outputPath);

  // Verify audio file exists
  try {
    await fs.access(resolvedAudioPath);
  } catch {
    console.error(`${colors.red}Audio file not found:${colors.reset} ${resolvedAudioPath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(resolvedOutputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Print render info
  const resolution = getResolution(config.output.format);
  console.log(`
${colors.bright}Audio:${colors.reset}   ${path.basename(resolvedAudioPath)}
${colors.bright}Output:${colors.reset}  ${resolvedOutputPath}
${colors.bright}Format:${colors.reset}  ${config.output.format} (${resolution.width}x${resolution.height})
${colors.bright}FPS:${colors.reset}     ${config.output.fps}
${colors.bright}Mode:${colors.reset}    Ethereal ${config.visual.mode === 'flame' ? 'Flame' : 'Mist'}
`);

  // Start render
  console.log(`${colors.cyan}Starting render...${colors.reset}\n`);
  const startTime = Date.now();

  try {
    const result = await renderVideo({
      audioPath: resolvedAudioPath,
      outputPath: resolvedOutputPath,
      template: config.visual.mode,
      format: config.output.format as OutputFormat,
      fps: config.output.fps,
      quality: config.options?.quality || 'balanced',
      onProgress: (progress) => {
        printProgress(progress, startTime);
      },
    });

    // Final newline after progress
    console.log('\n');

    if (result.success) {
      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`${colors.green}✓ Render complete!${colors.reset}`);
      console.log(`${colors.dim}  Output: ${resolvedOutputPath}`);
      console.log(`  Total time: ${formatDuration(totalTime)}${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Render failed${colors.reset}`);
      if (result.error) {
        console.error(`  ${result.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.log('\n');
    console.error(`${colors.red}✗ Render error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Render interrupted.${colors.reset}`);
  console.log(`${colors.dim}Progress saved - resume with same config file.${colors.reset}`);
  process.exit(130);
});

// Run
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
