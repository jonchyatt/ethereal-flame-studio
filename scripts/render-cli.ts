#!/usr/bin/env npx tsx
/**
 * Ethereal Flame Local Render CLI
 *
 * Renders videos locally without Redis/queue infrastructure.
 * Takes a config file exported from the web UI.
 * Auto-starts the dev server if not already running.
 *
 * Usage:
 *   npx tsx scripts/render-cli.ts --config render-job.json
 *   npm run render:local -- --config render-job.json
 *
 * Plan 03-12
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import * as readline from 'readline';
import { validateConfig, getResolution } from '../src/lib/render/renderConfig';
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
const BAR_FILLED = '\u2588';
const BAR_EMPTY = '\u2591';
const BAR_WIDTH = 30;

// Track child processes for cleanup
let devServerProcess: ChildProcess | null = null;
let devServerStartedByUs = false;

/**
 * Parse command line arguments
 */
function parseArgs(): {
  configPath?: string;
  audioPath?: string;
  outputPath?: string;
  appUrl?: string;
  noServer?: boolean;
  preview?: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result: ReturnType<typeof parseArgs> = { help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      result.configPath = args[++i];
    } else if (arg === '--audio' || arg === '-a') {
      result.audioPath = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.outputPath = args[++i];
    } else if (arg === '--url' || arg === '-u') {
      result.appUrl = args[++i];
    } else if (arg === '--no-server') {
      result.noServer = true;
    } else if (arg === '--preview' || arg === '-p') {
      result.preview = true;
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
  -u, --url <url>       App URL (default: http://localhost:3000)
  -p, --preview         Open visible browser to verify settings before rendering
      --no-server       Don't auto-start dev server
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
      "skyboxRotationSpeed": 0,
      "waterEnabled": false,
      "waterColor": "#0a1828",
      "waterReflectivity": 0.6,
      "layers": [...]
    }
  }

${colors.cyan}Examples:${colors.reset}
  # Basic render (auto-starts dev server if needed)
  npx tsx scripts/render-cli.ts -c render-job.json

  # Override paths
  npx tsx scripts/render-cli.ts -c render-job.json -a ./song.mp3 -o ./out.mp4

  # Preview settings in visible browser before rendering
  npx tsx scripts/render-cli.ts -c render-job.json --preview

  # Use a specific app URL (e.g., Vercel preview)
  npx tsx scripts/render-cli.ts -c render-job.json -u https://my-preview.vercel.app
`);
}

/**
 * Print header banner
 */
function printHeader(): void {
  console.log(`
${colors.bright}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  ${colors.cyan}Ethereal Flame Renderer${colors.reset}${colors.bright} v1.0                        \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d${colors.reset}
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
 * Check if a URL is responding
 */
function checkServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const req = http.get(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: '/',
        timeout: 3000,
      },
      (res) => {
        res.resume(); // Drain the response
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Build the Next.js production bundle if needed
 */
async function ensureProductionBuild(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const buildIdPath = path.join(projectRoot, '.next', 'BUILD_ID');

  try {
    await fs.access(buildIdPath);
    console.log(`${colors.dim}[Build] Using existing production build${colors.reset}`);
    return;
  } catch {
    // No build exists
  }

  console.log(`${colors.yellow}[Build]${colors.reset} Building production bundle...`);
  const { execSync } = await import('child_process');
  try {
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log(`${colors.green}[Build]${colors.reset} Production build complete`);
  } catch {
    throw new Error('Production build failed. Fix build errors before rendering.');
  }
}

/**
 * Start the Next.js production server and wait until it's ready
 */
async function startServer(appUrl: string): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');

  // Build first if needed
  await ensureProductionBuild();

  const port = new URL(appUrl).port || '3000';
  console.log(`${colors.yellow}[Server]${colors.reset} Starting production server on port ${port}...`);

  devServerProcess = spawn('npx', ['next', 'start', '-p', port], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: false,
  });

  devServerStartedByUs = true;

  // Forward server output (dimmed)
  devServerProcess.stdout?.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line) {
      process.stderr.write(`${colors.dim}  [server] ${line}${colors.reset}\n`);
    }
  });

  devServerProcess.stderr?.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line && !line.includes('ExperimentalWarning')) {
      process.stderr.write(`${colors.dim}  [server] ${line}${colors.reset}\n`);
    }
  });

  devServerProcess.on('error', (err) => {
    console.error(`${colors.red}Failed to start server:${colors.reset}`, err.message);
  });

  // Poll until server responds
  const maxWait = 30000; // 30 seconds (production server starts faster)
  const pollInterval = 500;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const ready = await checkServer(appUrl);
    if (ready) {
      console.log(`${colors.green}[Server]${colors.reset} Production server ready at ${appUrl}`);
      return;
    }
  }

  throw new Error(`Server failed to start within ${maxWait / 1000}s`);
}

/**
 * Stop the server if we started it
 */
function stopServer(): void {
  if (devServerProcess && devServerStartedByUs) {
    console.log(`\n${colors.dim}[Server] Stopping server...${colors.reset}`);
    // On Windows, need to kill the process tree
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(devServerProcess.pid), '/f', '/t'], {
        stdio: 'ignore',
      });
    } else {
      devServerProcess.kill('SIGTERM');
    }
    devServerProcess = null;
  }
}

/**
 * Print render progress
 */
function printProgress(progress: RenderVideoProgress, startTime: number): void {
  const elapsed = (Date.now() - startTime) / 1000;
  const eta =
    progress.overallProgress > 0
      ? (elapsed / progress.overallProgress) * (100 - progress.overallProgress)
      : 0;

  // Clear previous line and print new progress
  process.stdout.write('\r\x1b[K');

  const stageIcon = progress.stage === 'complete' ? '\u2713' : '\u25ba';
  const stageColor = progress.stage === 'complete' ? colors.green : colors.yellow;

  // Truncate message to fit terminal
  const msg = progress.message.length > 30 ? progress.message.substring(0, 30) + '...' : progress.message;

  process.stdout.write(
    `${stageColor}${stageIcon}${colors.reset} ${msg} ` +
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

  // ========================================================================
  // LOAD AND VALIDATE CONFIG
  // ========================================================================
  console.log(`${colors.dim}Loading config: ${args.configPath}${colors.reset}`);

  let configJson: unknown;
  try {
    const configText = await fs.readFile(args.configPath, 'utf-8');
    configJson = JSON.parse(configText);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${colors.red}Error loading config file:${colors.reset} ${msg}`);
    process.exit(1);
  }

  // Validate config
  const validation = validateConfig(configJson);
  if (!validation.valid) {
    console.error(`${colors.red}Invalid config file:${colors.reset}`);
    validation.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  const config = validation.config;

  // ========================================================================
  // RESOLVE PATHS
  // ========================================================================
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

  // ========================================================================
  // PRINT RENDER INFO
  // ========================================================================
  const resolution = getResolution(config.output.format);
  console.log(`
${colors.bright}Audio:${colors.reset}   ${path.basename(resolvedAudioPath)}
${colors.bright}Output:${colors.reset}  ${resolvedOutputPath}
${colors.bright}Format:${colors.reset}  ${config.output.format} (${resolution.width}x${resolution.height})
${colors.bright}FPS:${colors.reset}     ${config.output.fps}
${colors.bright}Mode:${colors.reset}    Ethereal ${config.visual.mode === 'flame' ? 'Flame' : 'Mist'}
${colors.bright}Skybox:${colors.reset}  ${config.visual.skyboxPreset}
${colors.bright}Layers:${colors.reset}  ${config.visual.layers.filter((l) => l.enabled).length} active
`);

  // ========================================================================
  // ENSURE DEV SERVER IS RUNNING
  // ========================================================================
  const appUrl = args.appUrl || 'http://localhost:3000';

  if (!args.noServer) {
    const serverRunning = await checkServer(appUrl);
    if (!serverRunning) {
      await startServer(appUrl);
    } else {
      console.log(`${colors.green}[Server]${colors.reset} Using existing server at ${appUrl}`);
    }
  }

  // ========================================================================
  // PREVIEW MODE - wait for user confirmation
  // ========================================================================
  if (args.preview) {
    console.log(`${colors.yellow}[Preview]${colors.reset} Browser will open with your settings applied.`);
    console.log(`${colors.yellow}[Preview]${colors.reset} Verify the visuals, then press Enter to start rendering.`);
    console.log(`${colors.dim}          (The browser stays visible during rendering so you can watch.)${colors.reset}\n`);
  }

  // ========================================================================
  // START RENDER
  // ========================================================================
  console.log(`${colors.cyan}Starting render...${colors.reset}\n`);
  const startTime = Date.now();

  try {
    const result = await renderVideo({
      audioPath: resolvedAudioPath,
      outputPath: resolvedOutputPath,
      template: config.visual.mode,
      headless: !args.preview,
      visualConfig: {
        mode: config.visual.mode,
        intensity: config.visual.intensity,
        skyboxPreset: config.visual.skyboxPreset,
        skyboxRotationSpeed: config.visual.skyboxRotationSpeed,
        skyboxAudioReactiveEnabled: config.visual.skyboxAudioReactiveEnabled,
        skyboxAudioReactivity: config.visual.skyboxAudioReactivity,
        skyboxDriftSpeed: config.visual.skyboxDriftSpeed,
        waterEnabled: config.visual.waterEnabled,
        waterColor: config.visual.waterColor,
        waterReflectivity: config.visual.waterReflectivity,
        cameraOrbitEnabled: config.visual.cameraOrbitEnabled,
        cameraOrbitRenderOnly: config.visual.cameraOrbitRenderOnly,
        cameraOrbitSpeed: config.visual.cameraOrbitSpeed,
        cameraOrbitRadius: config.visual.cameraOrbitRadius,
        cameraOrbitHeight: config.visual.cameraOrbitHeight,
        cameraLookAtOrb: config.visual.cameraLookAtOrb,
        orbAnchorMode: config.visual.orbAnchorMode,
        orbDistance: config.visual.orbDistance,
        orbHeight: config.visual.orbHeight,
        orbSideOffset: config.visual.orbSideOffset,
        orbWorldX: config.visual.orbWorldX,
        orbWorldY: config.visual.orbWorldY,
        orbWorldZ: config.visual.orbWorldZ,
        layers: config.visual.layers,
      },
      format: config.output.format as OutputFormat,
      fps: config.output.fps,
      quality: config.options?.quality || 'balanced',
      appUrl,
      onBeforeRender: args.preview
        ? async () => {
            console.log(`\n${colors.green}[Preview]${colors.reset} Browser is open with your settings.`);
            console.log(`${colors.green}[Preview]${colors.reset} Check the visuals, then press ${colors.bright}Enter${colors.reset} to start rendering.\n`);
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            await new Promise<void>((resolve) => {
              rl.question('', () => {
                rl.close();
                resolve();
              });
            });
            console.log(`${colors.cyan}Rendering...${colors.reset}\n`);
          }
        : undefined,
      onProgress: (progress) => {
        printProgress(progress, startTime);
      },
    });

    // Final newline after progress
    console.log('\n');

    if (result.success) {
      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`${colors.green}\u2713 Render complete!${colors.reset}`);
      console.log(`${colors.dim}  Output: ${resolvedOutputPath}`);
      console.log(`  Total time: ${formatDuration(totalTime)}`);
      if (result.stages.capture.frames > 0) {
        console.log(`  Frames: ${result.stages.capture.frames}`);
        console.log(`  Avg capture speed: ${(result.stages.capture.frames / result.stages.capture.duration).toFixed(1)} fps`);
      }
      console.log(`${colors.reset}`);
    } else {
      console.error(`${colors.red}\u2717 Render failed${colors.reset}`);
      if (result.error) {
        console.error(`  ${result.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.log('\n');
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${colors.red}\u2717 Render error:${colors.reset} ${msg}`);
    process.exit(1);
  } finally {
    stopServer();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Render interrupted.${colors.reset}`);
  console.log(`${colors.dim}Progress saved - resume with same config file.${colors.reset}`);
  stopServer();
  process.exit(130);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`\n${colors.red}Uncaught error:${colors.reset}`, error.message);
  stopServer();
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error('Unexpected error:', error);
  stopServer();
  process.exit(1);
});
