/**
 * FFmpegEncoder - Server-side video encoding using FFmpeg
 *
 * Encodes frame sequences into video files with H.264 or H.265 codecs.
 * Supports NVIDIA NVENC hardware acceleration for dramatically faster encoding.
 * Designed for Node.js/server-side execution.
 *
 * Phase 3, Plan 03-06
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * Video codec options
 */
export type VideoCodec =
  | 'h264'          // libx264 - CPU encoding, maximum compatibility
  | 'h264_nvenc'    // NVIDIA GPU H.264 encoding
  | 'h265'          // libx265 - CPU encoding, better compression
  | 'hevc_nvenc';   // NVIDIA GPU H.265 encoding

/**
 * Quality preset - affects encoding speed vs quality tradeoff
 */
export type QualityPreset = 'fast' | 'balanced' | 'quality';

/**
 * Output format type
 */
export type OutputFormat =
  | 'flat-1080p'
  | 'flat-4k'
  | 'flat-1080p-vertical'
  | 'flat-4k-vertical'
  | '360-mono-4k'
  | '360-mono-6k'
  | '360-mono-8k'
  | '360-stereo-4k'
  | '360-stereo-8k';

/**
 * Encoding options
 */
export interface EncodeOptions {
  /** Path to frame directory (e.g., "/tmp/frames") or pattern (e.g., "frames/%05d.png") */
  inputPattern: string;
  /** Output video file path */
  outputPath: string;
  /** Frame rate (30 or 60) */
  fps: number;
  /** Video codec to use */
  codec?: VideoCodec;
  /** Quality preset */
  preset?: QualityPreset;
  /** Path to audio file to mux */
  audioPath?: string;
  /** Target bitrate (e.g., "15M") - overrides preset defaults */
  bitrate?: string;
  /** Maximum bitrate for VBR (e.g., "20M") */
  maxBitrate?: string;
  /** Output width (optional, for scaling) */
  width?: number;
  /** Output height (optional, for scaling) */
  height?: number;
  /** Output format type - used to select optimal encoding settings */
  format?: OutputFormat;
  /** Progress callback */
  onProgress?: (progress: EncodingProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Use two-pass encoding for better quality (slower) */
  twoPass?: boolean;
}

/**
 * Encoding progress information
 */
export interface EncodingProgress {
  /** Current frame being encoded */
  frame: number;
  /** Total frames (if known) */
  totalFrames?: number;
  /** Percentage complete (0-100) */
  percent: number;
  /** Encoding speed (e.g., "2.5x") */
  speed?: string;
  /** Current bitrate being used */
  bitrate?: string;
  /** Estimated time remaining in seconds */
  eta?: number;
  /** Current stage of encoding */
  stage: 'starting' | 'encoding' | 'muxing' | 'complete' | 'error';
}

/**
 * Encoding result
 */
export interface EncodeResult {
  success: boolean;
  outputPath: string;
  /** Encoding time in seconds */
  duration: number;
  /** Number of frames encoded */
  frameCount?: number;
  /** Final file size in bytes */
  fileSize?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * NVENC preset mapping (RTX 30/40 series)
 * p1 = fastest, p7 = highest quality
 */
const NVENC_PRESETS: Record<QualityPreset, string> = {
  fast: 'p4',
  balanced: 'p5',
  quality: 'p7',
};

/**
 * CPU preset mapping
 */
const CPU_PRESETS: Record<QualityPreset, string> = {
  fast: 'fast',
  balanced: 'slow',
  quality: 'slower',
};

/**
 * CQ/CRF values by quality preset (lower = better quality, larger file)
 */
const QUALITY_VALUES: Record<QualityPreset, number> = {
  fast: 23,
  balanced: 20,
  quality: 18,
};

/**
 * Bitrate recommendations by format and quality
 */
const BITRATE_PRESETS: Record<OutputFormat, Record<QualityPreset, { bitrate: string; maxBitrate: string; bufsize: string }>> = {
  'flat-1080p': {
    fast: { bitrate: '12M', maxBitrate: '15M', bufsize: '30M' },
    balanced: { bitrate: '15M', maxBitrate: '20M', bufsize: '40M' },
    quality: { bitrate: '20M', maxBitrate: '25M', bufsize: '50M' },
  },
  'flat-4k': {
    fast: { bitrate: '40M', maxBitrate: '50M', bufsize: '100M' },
    balanced: { bitrate: '50M', maxBitrate: '65M', bufsize: '130M' },
    quality: { bitrate: '65M', maxBitrate: '80M', bufsize: '160M' },
  },
  'flat-1080p-vertical': {
    fast: { bitrate: '12M', maxBitrate: '15M', bufsize: '30M' },
    balanced: { bitrate: '15M', maxBitrate: '20M', bufsize: '40M' },
    quality: { bitrate: '20M', maxBitrate: '25M', bufsize: '50M' },
  },
  'flat-4k-vertical': {
    fast: { bitrate: '40M', maxBitrate: '50M', bufsize: '100M' },
    balanced: { bitrate: '50M', maxBitrate: '65M', bufsize: '130M' },
    quality: { bitrate: '65M', maxBitrate: '80M', bufsize: '160M' },
  },
  '360-mono-4k': {
    fast: { bitrate: '35M', maxBitrate: '45M', bufsize: '90M' },
    balanced: { bitrate: '45M', maxBitrate: '60M', bufsize: '120M' },
    quality: { bitrate: '55M', maxBitrate: '70M', bufsize: '140M' },
  },
  '360-mono-6k': {
    fast: { bitrate: '50M', maxBitrate: '65M', bufsize: '130M' },
    balanced: { bitrate: '65M', maxBitrate: '85M', bufsize: '170M' },
    quality: { bitrate: '80M', maxBitrate: '100M', bufsize: '200M' },
  },
  '360-mono-8k': {
    fast: { bitrate: '80M', maxBitrate: '100M', bufsize: '200M' },
    balanced: { bitrate: '100M', maxBitrate: '130M', bufsize: '260M' },
    quality: { bitrate: '120M', maxBitrate: '150M', bufsize: '300M' },
  },
  '360-stereo-4k': {
    fast: { bitrate: '45M', maxBitrate: '55M', bufsize: '110M' },
    balanced: { bitrate: '55M', maxBitrate: '70M', bufsize: '140M' },
    quality: { bitrate: '70M', maxBitrate: '90M', bufsize: '180M' },
  },
  '360-stereo-8k': {
    fast: { bitrate: '100M', maxBitrate: '130M', bufsize: '260M' },
    balanced: { bitrate: '130M', maxBitrate: '160M', bufsize: '320M' },
    quality: { bitrate: '150M', maxBitrate: '180M', bufsize: '360M' },
  },
};

/**
 * Audio encoding settings
 */
const AUDIO_SETTINGS = {
  codec: 'aac',
  bitrate: '384k',
  sampleRate: '48000',
};

/**
 * Check if NVIDIA NVENC is available
 */
export async function checkNvencAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-encoders'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });

    process.on('error', () => resolve(false));
    process.on('close', () => {
      resolve(output.includes('h264_nvenc') || output.includes('hevc_nvenc'));
    });
  });
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });

    process.on('error', () => resolve({ available: false }));
    process.on('close', (code) => {
      if (code === 0) {
        const versionMatch = output.match(/ffmpeg version (\S+)/);
        resolve({
          available: true,
          version: versionMatch ? versionMatch[1] : 'unknown',
        });
      } else {
        resolve({ available: false });
      }
    });
  });
}

/**
 * Count frames in a directory
 */
export function countFrames(frameDir: string, pattern = '*.png'): number {
  try {
    const files = fs.readdirSync(frameDir);
    const frameFiles = files.filter(f => {
      if (pattern === '*.png') return f.endsWith('.png');
      if (pattern === '*.jpg') return f.endsWith('.jpg') || f.endsWith('.jpeg');
      return f.match(new RegExp(pattern.replace('*', '.*')));
    });
    return frameFiles.length;
  } catch {
    return 0;
  }
}

/**
 * Build FFmpeg command arguments
 */
export function buildFFmpegCommand(options: EncodeOptions): string[] {
  const {
    inputPattern,
    outputPath,
    fps,
    codec = 'h264',
    preset = 'balanced',
    audioPath,
    bitrate,
    maxBitrate,
    width,
    height,
    format,
  } = options;

  const args: string[] = [];
  const isNvenc = codec.includes('nvenc');
  const isHEVC = codec.includes('265') || codec.includes('hevc');

  // Global options
  args.push('-y'); // Overwrite output without asking

  // Input frame rate (before input to set expected rate)
  args.push('-framerate', String(fps));

  // Input frame pattern
  args.push('-i', inputPattern);

  // Audio input (if provided)
  if (audioPath) {
    args.push('-i', audioPath);
  }

  // Video codec
  if (isNvenc) {
    // NVIDIA NVENC settings
    args.push('-c:v', codec);
    args.push('-preset', NVENC_PRESETS[preset]);
    args.push('-tune', 'hq');
    args.push('-rc', 'vbr');
    args.push('-cq', String(QUALITY_VALUES[preset]));
  } else {
    // CPU encoding settings
    args.push('-c:v', codec === 'h264' ? 'libx264' : 'libx265');
    args.push('-preset', CPU_PRESETS[preset]);
    args.push('-crf', String(QUALITY_VALUES[preset]));
  }

  // Bitrate settings
  const formatPreset = format ? BITRATE_PRESETS[format]?.[preset] : null;
  const targetBitrate = bitrate || formatPreset?.bitrate || '15M';
  const targetMaxBitrate = maxBitrate || formatPreset?.maxBitrate || '20M';
  const targetBufsize = formatPreset?.bufsize || '40M';

  args.push('-b:v', targetBitrate);
  args.push('-maxrate', targetMaxBitrate);
  args.push('-bufsize', targetBufsize);

  // Pixel format (required for most players)
  args.push('-pix_fmt', 'yuv420p');

  // Video filter for scaling (if dimensions provided)
  const filters: string[] = [];
  if (width && height) {
    // Use scaling with padding to maintain aspect ratio
    filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // HEVC compatibility tag for Apple devices
  if (isHEVC) {
    args.push('-tag:v', 'hvc1');
  }

  // Audio codec (if audio provided)
  if (audioPath) {
    args.push('-c:a', AUDIO_SETTINGS.codec);
    args.push('-b:a', AUDIO_SETTINGS.bitrate);
    args.push('-ar', AUDIO_SETTINGS.sampleRate);
    args.push('-shortest'); // Use shortest stream length
  }

  // Enable fast start for web streaming (moves moov atom to beginning)
  args.push('-movflags', '+faststart');

  // Output file
  args.push(outputPath);

  return args;
}

/**
 * Parse FFmpeg progress from stderr output
 */
function parseFFmpegProgress(line: string, totalFrames?: number): Partial<EncodingProgress> | null {
  // FFmpeg outputs progress like:
  // frame=  123 fps=60.5 q=28.0 size=    1234kB time=00:00:04.10 bitrate=2464.0kbits/s speed=2.02x

  const frameMatch = line.match(/frame=\s*(\d+)/);
  const speedMatch = line.match(/speed=\s*(\S+)/);
  const bitrateMatch = line.match(/bitrate=\s*(\S+)/);
  const timeMatch = line.match(/time=\s*(\d+:\d+:\d+\.\d+)/);

  if (!frameMatch) return null;

  const frame = parseInt(frameMatch[1], 10);
  const progress: Partial<EncodingProgress> = {
    frame,
    stage: 'encoding',
  };

  if (speedMatch) {
    progress.speed = speedMatch[1];
  }

  if (bitrateMatch) {
    progress.bitrate = bitrateMatch[1];
  }

  if (totalFrames && totalFrames > 0) {
    progress.totalFrames = totalFrames;
    progress.percent = Math.min(100, (frame / totalFrames) * 100);

    // Calculate ETA based on speed
    if (speedMatch) {
      const speedValue = parseFloat(speedMatch[1].replace('x', ''));
      if (speedValue > 0) {
        const remainingFrames = totalFrames - frame;
        const framesPerSecond = 30 * speedValue; // Approximate
        progress.eta = remainingFrames / framesPerSecond;
      }
    }
  } else {
    progress.percent = 0;
  }

  return progress;
}

/**
 * FFmpeg Encoder class for server-side video encoding
 */
export class FFmpegEncoder extends EventEmitter {
  private options: EncodeOptions;
  private process: ChildProcess | null = null;
  private aborted = false;
  private totalFrames = 0;

  constructor(options: EncodeOptions) {
    super();
    this.options = options;
  }

  /**
   * Get the FFmpeg command that would be executed
   */
  getCommand(): string[] {
    return buildFFmpegCommand(this.options);
  }

  /**
   * Get command as string for logging
   */
  getCommandString(): string {
    return `ffmpeg ${this.getCommand().join(' ')}`;
  }

  /**
   * Detect total frame count from input
   */
  private detectFrameCount(): number {
    const { inputPattern } = this.options;

    // If inputPattern is a directory pattern like "frames/%05d.png"
    if (inputPattern.includes('%')) {
      const dir = path.dirname(inputPattern);
      if (fs.existsSync(dir)) {
        return countFrames(dir);
      }
    }

    // If inputPattern is a directory path
    if (fs.existsSync(inputPattern) && fs.statSync(inputPattern).isDirectory()) {
      return countFrames(inputPattern);
    }

    return 0;
  }

  /**
   * Start encoding
   */
  async encode(): Promise<EncodeResult> {
    const startTime = Date.now();
    this.aborted = false;

    // Detect frame count
    this.totalFrames = this.detectFrameCount();

    // Set up abort handler
    if (this.options.signal) {
      this.options.signal.addEventListener('abort', () => {
        this.abort();
      });
    }

    return new Promise((resolve) => {
      const args = this.getCommand();

      this.reportProgress({
        frame: 0,
        totalFrames: this.totalFrames,
        percent: 0,
        stage: 'starting',
      });

      console.log('[FFmpegEncoder] Starting encode...');
      console.log('[FFmpegEncoder] Command:', 'ffmpeg', args.join(' '));

      // Spawn FFmpeg process
      this.process = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stderrBuffer = '';

      // Parse progress from stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderrBuffer += text;

        // Parse each line for progress
        const lines = stderrBuffer.split(/[\r\n]+/);
        stderrBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const progress = parseFFmpegProgress(line, this.totalFrames);
          if (progress) {
            this.reportProgress({
              frame: progress.frame || 0,
              totalFrames: this.totalFrames,
              percent: progress.percent || 0,
              speed: progress.speed,
              bitrate: progress.bitrate,
              eta: progress.eta,
              stage: 'encoding',
            });
          }
        }
      });

      // Handle process errors
      this.process.on('error', (error) => {
        console.error('[FFmpegEncoder] Process error:', error);
        resolve({
          success: false,
          outputPath: this.options.outputPath,
          duration: (Date.now() - startTime) / 1000,
          error: `FFmpeg process error: ${error.message}`,
        });
      });

      // Handle process completion
      this.process.on('close', (code) => {
        const duration = (Date.now() - startTime) / 1000;

        if (this.aborted) {
          resolve({
            success: false,
            outputPath: this.options.outputPath,
            duration,
            error: 'Encoding aborted',
          });
          return;
        }

        if (code === 0) {
          // Get output file size
          let fileSize: number | undefined;
          try {
            const stats = fs.statSync(this.options.outputPath);
            fileSize = stats.size;
          } catch {
            // File size unavailable
          }

          this.reportProgress({
            frame: this.totalFrames,
            totalFrames: this.totalFrames,
            percent: 100,
            stage: 'complete',
          });

          console.log(`[FFmpegEncoder] Encoding complete in ${duration.toFixed(1)}s`);

          resolve({
            success: true,
            outputPath: this.options.outputPath,
            duration,
            frameCount: this.totalFrames,
            fileSize,
          });
        } else {
          this.reportProgress({
            frame: 0,
            percent: 0,
            stage: 'error',
          });

          resolve({
            success: false,
            outputPath: this.options.outputPath,
            duration,
            error: `FFmpeg exited with code ${code}`,
          });
        }
      });
    });
  }

  /**
   * Abort encoding
   */
  abort(): void {
    if (this.process && !this.aborted) {
      this.aborted = true;
      console.log('[FFmpegEncoder] Aborting encode...');

      // Send quit signal to FFmpeg
      this.process.stdin?.write('q');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  /**
   * Report progress to callback and emit event
   */
  private reportProgress(progress: EncodingProgress): void {
    this.emit('progress', progress);
    this.options.onProgress?.(progress);
  }
}

/**
 * Convenience function for quick encoding
 */
export async function encodeVideo(options: EncodeOptions): Promise<EncodeResult> {
  const encoder = new FFmpegEncoder(options);
  return encoder.encode();
}

/**
 * Get recommended codec based on availability and format
 */
export async function getRecommendedCodec(format?: OutputFormat): Promise<VideoCodec> {
  const hasNvenc = await checkNvencAvailable();

  // For 4K+ and 360 content, prefer HEVC for better compression
  const preferHEVC = format && (
    format.includes('4k') ||
    format.includes('6k') ||
    format.includes('8k') ||
    format.includes('360')
  );

  if (hasNvenc) {
    return preferHEVC ? 'hevc_nvenc' : 'h264_nvenc';
  }

  return preferHEVC ? 'h265' : 'h264';
}

/**
 * Get recommended bitrate for resolution
 */
export function getRecommendedBitrate(width: number, height: number, fps: number): string {
  const pixels = width * height;
  const baseBitrate = Math.round(pixels / 1000); // 1 kbps per 1000 pixels

  // Adjust for frame rate
  const fpsMultiplier = fps / 30;

  // Calculate final bitrate in Mbps
  const bitrateMbps = Math.ceil(baseBitrate * fpsMultiplier / 1000);

  // Clamp to reasonable range
  const minBitrate = 5;
  const maxBitrate = 150;
  const finalBitrate = Math.max(minBitrate, Math.min(maxBitrate, bitrateMbps));

  return `${finalBitrate}M`;
}

/**
 * Preset recommendations by resolution
 */
export const BITRATE_RECOMMENDATIONS: Record<string, { min: string; recommended: string; max: string }> = {
  '1080p-30': { min: '8M', recommended: '12M', max: '15M' },
  '1080p-60': { min: '12M', recommended: '15M', max: '20M' },
  '4k-30': { min: '35M', recommended: '50M', max: '65M' },
  '4k-60': { min: '50M', recommended: '65M', max: '80M' },
  '360-4k-30': { min: '35M', recommended: '45M', max: '60M' },
  '360-6k-30': { min: '50M', recommended: '65M', max: '85M' },
  '360-8k-30': { min: '80M', recommended: '100M', max: '130M' },
  '360-8k-stereo-30': { min: '100M', recommended: '130M', max: '160M' },
};

/**
 * Validate FFmpeg is available (for use in server-side code)
 */
export function getFFmpegValidationScript(): string {
  return 'ffmpeg -version';
}

/**
 * Get FFmpeg command as string (for debugging/logging)
 */
export function getFFmpegCommandString(options: EncodeOptions): string {
  const args = buildFFmpegCommand(options);
  return `ffmpeg ${args.join(' ')}`;
}
