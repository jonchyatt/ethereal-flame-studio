/**
 * Headless Render Script
 *
 * Renders Ethereal Flame Studio exports without a GUI using Puppeteer.
 * Designed for server-side batch processing.
 *
 * Usage:
 *   npx ts-node scripts/headless-render.ts \
 *     --audio input.mp3 \
 *     --template etherealFlame \
 *     --output output.mp4 \
 *     --type flat-1080p-landscape \
 *     --fps 30
 *
 * For Linux servers:
 *   xvfb-run -s "-ac -screen 0 1920x1080x24" npx ts-node scripts/headless-render.ts ...
 *
 * Phase 3, Plan 03-07
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parseArgs, RenderConfig } from './render-config';

// Import types from lib (path relative to scripts/)
type ExportType =
  | 'flat-1080p-landscape' | 'flat-1080p-portrait'
  | 'flat-4k-landscape' | 'flat-4k-portrait'
  | '360-mono-4k' | '360-mono-6k' | '360-mono-8k'
  | '360-stereo-8k';

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-version']);
    process.on('error', () => resolve(false));
    process.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Check if Python and spatialmedia are available
 */
async function checkPython(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('python3', ['-c', 'from spatialmedia import metadata_utils']);
    process.on('error', () => resolve(false));
    process.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Run FFmpeg encoding
 */
async function encodeVideo(
  framesDir: string,
  audioPath: string,
  outputPath: string,
  fps: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-framerate', String(fps),
      '-i', path.join(framesDir, '%05d.png'),
      '-i', audioPath,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      outputPath,
    ];

    console.log('Running FFmpeg:', 'ffmpeg', args.join(' '));

    const ffmpegProcess = spawn('ffmpeg', args);

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      const line = data.toString();
      // Parse FFmpeg progress
      if (line.includes('frame=')) {
        const match = line.match(/frame=\s*(\d+)/);
        if (match) {
          console.log(`Encoding frame ${match[1]}...`);
        }
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`FFmpeg failed: ${error.message}`));
    });

    ffmpegProcess.on('close', (code) => {
      console.log('');
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Inject VR metadata for 360 videos
 */
async function injectVRMetadata(
  inputPath: string,
  outputPath: string,
  isStereo: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'inject-metadata.py');
    const mode = isStereo ? 'stereo' : 'mono';

    const process = spawn('python3', [scriptPath, inputPath, outputPath, mode]);

    process.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    process.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });

    process.on('error', (error) => {
      reject(new Error(`Metadata injection failed: ${error.message}`));
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Metadata injection exited with code ${code}`));
      }
    });
  });
}

/**
 * Main headless render function
 *
 * Note: This is a CLI entrypoint. The actual browser rendering
 * would use Puppeteer to launch a headless Chrome instance
 * and execute the export pipeline in the browser context.
 */
async function main(): Promise<void> {
  console.log('Ethereal Flame Studio - Headless Renderer');
  console.log('=========================================\n');

  // Parse command line arguments
  const config = parseArgs(process.argv.slice(2));
  if (!config) {
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Audio: ${config.audioPath}`);
  console.log(`  Template: ${config.templateId}`);
  console.log(`  Output: ${config.outputPath}`);
  console.log(`  Type: ${config.exportType}`);
  console.log(`  FPS: ${config.fps}`);
  console.log('');

  // Validate input file exists
  if (!fs.existsSync(config.audioPath)) {
    console.error(`Error: Audio file not found: ${config.audioPath}`);
    process.exit(1);
  }

  // Check dependencies
  console.log('Checking dependencies...');

  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('Error: FFmpeg not found. Please install FFmpeg.');
    process.exit(1);
  }
  console.log('  FFmpeg: OK');

  const is360 = config.exportType.startsWith('360-');
  if (is360) {
    const hasPython = await checkPython();
    if (!hasPython) {
      console.warn('  Warning: Python spatialmedia not available.');
      console.warn('  VR metadata will not be injected.');
      console.warn('  Install with: pip install spatialmedia');
    } else {
      console.log('  Python spatialmedia: OK');
    }
  }

  console.log('');
  console.log('Note: Full headless rendering requires Puppeteer integration.');
  console.log('This script provides the CLI interface and encoding pipeline.');
  console.log('');
  console.log('For browser-based exports, use the web UI.');
  console.log('For full server-side rendering, use Docker with render-server.ts');
  console.log('');

  // In a full implementation, this would:
  // 1. Launch Puppeteer with GPU flags
  // 2. Navigate to localhost:3000 or a built static export
  // 3. Inject configuration
  // 4. Execute ExportPipeline.export() in browser context
  // 5. Retrieve frame data
  // 6. Encode with FFmpeg
  // 7. Inject VR metadata if 360

  console.log('Headless rendering pipeline ready.');
  console.log('Integration with Puppeteer browser automation coming in next iteration.');
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
