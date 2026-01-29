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

// Import FFmpeg encoder and types
import {
  FFmpegEncoder,
  checkFFmpegAvailable,
  checkNvencAvailable,
  getRecommendedCodec,
  VideoCodec,
  QualityPreset,
  OutputFormat,
  EncodeOptions,
} from '../src/lib/render/FFmpegEncoder';

import {
  SpatialMetadataInjector,
  checkPythonAvailable,
  checkSpatialMediaAvailable,
  getInstallCommand,
} from '../src/lib/render/SpatialMetadataInjector';

// Import types from lib (path relative to scripts/)
type ExportType =
  | 'flat-1080p-landscape' | 'flat-1080p-portrait'
  | 'flat-4k-landscape' | 'flat-4k-portrait'
  | '360-mono-4k' | '360-mono-6k' | '360-mono-8k'
  | '360-stereo-8k';

/**
 * Map ExportType to OutputFormat
 */
function mapExportTypeToFormat(exportType: ExportType): OutputFormat {
  const mapping: Record<ExportType, OutputFormat> = {
    'flat-1080p-landscape': 'flat-1080p',
    'flat-1080p-portrait': 'flat-1080p-vertical',
    'flat-4k-landscape': 'flat-4k',
    'flat-4k-portrait': 'flat-4k-vertical',
    '360-mono-4k': '360-mono-4k',
    '360-mono-6k': '360-mono-6k',
    '360-mono-8k': '360-mono-8k',
    '360-stereo-8k': '360-stereo-8k',
  };
  return mapping[exportType];
}

/**
 * Check if export type is 360
 */
function is360Type(type: ExportType): boolean {
  return type.startsWith('360-');
}

/**
 * Check if export type is stereo
 */
function isStereoType(type: ExportType): boolean {
  return type.includes('stereo');
}

/**
 * Encode video using FFmpegEncoder
 */
async function encodeVideo(
  framesDir: string,
  audioPath: string,
  outputPath: string,
  fps: number,
  exportType: ExportType,
  codec: VideoCodec,
  quality: QualityPreset = 'balanced'
): Promise<{ success: boolean; error?: string }> {
  const format = mapExportTypeToFormat(exportType);

  const options: EncodeOptions = {
    inputPattern: path.join(framesDir, '%05d.png'),
    outputPath,
    fps,
    codec,
    preset: quality,
    audioPath,
    format,
    onProgress: (progress) => {
      if (progress.stage === 'encoding') {
        const percent = progress.percent.toFixed(1);
        const speed = progress.speed || 'N/A';
        const frame = progress.frame;
        const total = progress.totalFrames || '?';
        process.stdout.write(`\rEncoding: ${percent}% (frame ${frame}/${total}) speed: ${speed}    `);
      } else if (progress.stage === 'complete') {
        console.log('\nEncoding complete!');
      }
    },
  };

  const encoder = new FFmpegEncoder(options);
  console.log('FFmpeg command:', encoder.getCommandString());
  console.log('');

  const result = await encoder.encode();

  if (result.success) {
    const fileSizeMB = result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(1) : 'unknown';
    console.log(`Output file: ${result.outputPath}`);
    console.log(`File size: ${fileSizeMB} MB`);
    console.log(`Encoding time: ${result.duration.toFixed(1)}s`);
    console.log(`Frames encoded: ${result.frameCount}`);
    return { success: true };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Inject VR metadata for 360 videos
 */
async function injectVRMetadata(
  inputPath: string,
  outputPath: string,
  isStereo: boolean
): Promise<{ success: boolean; error?: string }> {
  console.log('Injecting VR spatial metadata...');

  const injector = new SpatialMetadataInjector({
    inputPath,
    outputPath,
    spherical: true,
    stereoMode: isStereo ? 'top-bottom' : 'none',
    onProgress: (progress) => {
      console.log(`[${progress.stage}] ${progress.message}`);
    },
  });

  await injector.detectPython();
  const result = await injector.inject();

  if (result.success) {
    const fileSizeMB = result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(1) : 'unknown';
    console.log(`VR metadata injected: ${result.outputPath}`);
    console.log(`File size: ${fileSizeMB} MB`);
    return { success: true };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Main headless render function
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
  console.log('Checking dependencies...\n');

  // Check FFmpeg
  const ffmpegStatus = await checkFFmpegAvailable();
  if (!ffmpegStatus.available) {
    console.error('Error: FFmpeg not found. Please install FFmpeg.');
    console.error('  Windows: winget install FFmpeg');
    console.error('  macOS: brew install ffmpeg');
    console.error('  Linux: apt install ffmpeg');
    process.exit(1);
  }
  console.log(`  FFmpeg: OK (${ffmpegStatus.version})`);

  // Check NVENC
  const hasNvenc = await checkNvencAvailable();
  if (hasNvenc) {
    console.log('  NVIDIA NVENC: Available (GPU acceleration enabled)');
  } else {
    console.log('  NVIDIA NVENC: Not available (using CPU encoding)');
  }

  // Get recommended codec
  const format = mapExportTypeToFormat(config.exportType);
  const codec = await getRecommendedCodec(format);
  console.log(`  Selected codec: ${codec}`);

  // Check Python and spatial-media for 360 videos
  const is360 = is360Type(config.exportType);
  let pythonCmd = 'python3';
  let hasSpatialMedia = false;

  if (is360) {
    const pythonStatus = await checkPythonAvailable();
    if (!pythonStatus.available) {
      console.warn('  Warning: Python not found. VR metadata cannot be injected.');
    } else {
      pythonCmd = pythonStatus.command;
      console.log(`  Python: OK (${pythonStatus.version})`);

      hasSpatialMedia = await checkSpatialMediaAvailable(pythonCmd);
      if (!hasSpatialMedia) {
        console.warn(`  Warning: spatial-media not installed.`);
        console.warn(`  Install with: ${getInstallCommand(pythonCmd)}`);
        console.warn('  VR metadata will not be injected.');
      } else {
        console.log('  spatial-media: OK');
      }
    }
  }

  console.log('');

  // Note about frame rendering
  console.log('=== Frame Rendering ===');
  console.log('');
  console.log('Frame rendering requires browser automation with Puppeteer.');
  console.log('The rendering process will:');
  console.log('  1. Launch headless Chrome with GPU acceleration');
  console.log('  2. Load the Ethereal Flame Studio application');
  console.log('  3. Pre-analyze audio for deterministic playback');
  console.log('  4. Render each frame to PNG files');
  console.log('  5. Encode frames to video with FFmpeg');
  if (is360 && hasSpatialMedia) {
    console.log('  6. Inject VR spatial metadata');
  }
  console.log('');

  // Create temporary directory for frames
  const tempDir = path.join(process.cwd(), 'temp', `render-${Date.now()}`);
  const framesDir = path.join(tempDir, 'frames');

  console.log(`Temporary directory: ${tempDir}`);
  console.log(`Frames directory: ${framesDir}`);
  console.log('');

  // Check if frames already exist (for testing without Puppeteer)
  const existingFramesDir = path.join(process.cwd(), 'frames');
  if (fs.existsSync(existingFramesDir)) {
    const files = fs.readdirSync(existingFramesDir).filter(f => f.endsWith('.png'));
    if (files.length > 0) {
      console.log(`Found ${files.length} existing frames in ./frames/`);
      console.log('Skipping Puppeteer rendering, encoding existing frames...');
      console.log('');

      // Encode existing frames
      const encodeResult = await encodeVideo(
        existingFramesDir,
        config.audioPath,
        is360 ? config.outputPath.replace('.mp4', '_temp.mp4') : config.outputPath,
        config.fps,
        config.exportType,
        codec,
        'balanced'
      );

      if (!encodeResult.success) {
        console.error('Encoding failed:', encodeResult.error);
        process.exit(1);
      }

      // Inject VR metadata for 360 videos
      if (is360 && hasSpatialMedia) {
        console.log('');
        const tempOutput = config.outputPath.replace('.mp4', '_temp.mp4');
        const metadataResult = await injectVRMetadata(
          tempOutput,
          config.outputPath,
          isStereoType(config.exportType)
        );

        if (!metadataResult.success) {
          console.error('Metadata injection failed:', metadataResult.error);
          console.log('Output saved without VR metadata:', tempOutput);
        } else {
          // Clean up temp file
          if (fs.existsSync(tempOutput)) {
            fs.unlinkSync(tempOutput);
          }
        }
      }

      console.log('');
      console.log('=== Render Complete ===');
      console.log(`Output: ${config.outputPath}`);
      return;
    }
  }

  // Full implementation would launch Puppeteer here
  console.log('');
  console.log('=== Puppeteer Integration Required ===');
  console.log('');
  console.log('To render frames, the system needs:');
  console.log('  1. A running Next.js development server (npm run dev)');
  console.log('  2. Puppeteer to automate browser rendering');
  console.log('');
  console.log('Quick test without Puppeteer:');
  console.log('  1. Place PNG frames in ./frames/ directory (00001.png, 00002.png, etc.)');
  console.log('  2. Run this script again to encode them');
  console.log('');
  console.log('For full server-side rendering:');
  console.log('  1. Use Docker: docker-compose up');
  console.log('  2. Submit jobs to the render queue');
  console.log('');

  // Print the FFmpeg command that would be used
  console.log('=== FFmpeg Command Preview ===');
  console.log('');
  const previewEncoder = new FFmpegEncoder({
    inputPattern: path.join(framesDir, '%05d.png'),
    outputPath: config.outputPath,
    fps: config.fps,
    codec,
    preset: 'balanced',
    audioPath: config.audioPath,
    format,
  });
  console.log(previewEncoder.getCommandString());
  console.log('');
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
