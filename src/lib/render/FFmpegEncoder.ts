/**
 * FFmpegEncoder - Server-side video encoding using FFmpeg
 *
 * Encodes frame sequences into video files with H.264 or H.265 codecs.
 * Designed for Node.js/server-side execution.
 *
 * Phase 3, Plan 03-06
 */

/**
 * Encoding preset options
 */
export type EncodingPreset =
  | 'h264-web'       // H.264, CRF 18, good compatibility
  | 'h265-quality'   // H.265, CRF 20, better compression
  | 'h265-nvenc';    // H.265 with NVIDIA hardware acceleration

/**
 * Encoding options
 */
export interface EncodeOptions {
  inputPattern: string;        // e.g., "frames/%05d.png"
  outputPath: string;
  fps: number;
  preset: EncodingPreset;
  audioPath?: string;          // Mux audio track
  bitrate?: string;            // e.g., "35M" for 4K
  width?: number;              // Output width (optional, for scaling)
  height?: number;             // Output height (optional, for scaling)
  onProgress?: (percent: number) => void;
}

/**
 * Encoding result
 */
export interface EncodeResult {
  success: boolean;
  outputPath: string;
  duration: number;       // Encoding time in seconds
  frameCount?: number;
  error?: string;
}

/**
 * FFmpeg command builder
 */
export function buildFFmpegCommand(options: EncodeOptions): string[] {
  const {
    inputPattern,
    outputPath,
    fps,
    preset,
    audioPath,
    bitrate,
    width,
    height,
  } = options;

  const args: string[] = [];

  // Input frame rate
  args.push('-framerate', String(fps));

  // Input pattern
  args.push('-i', inputPattern);

  // Audio input (if provided)
  if (audioPath) {
    args.push('-i', audioPath);
  }

  // Video codec based on preset
  switch (preset) {
    case 'h264-web':
      args.push('-c:v', 'libx264');
      args.push('-preset', 'slow');
      args.push('-crf', '18');
      break;

    case 'h265-quality':
      args.push('-c:v', 'libx265');
      args.push('-preset', 'slow');
      args.push('-crf', '20');
      break;

    case 'h265-nvenc':
      args.push('-c:v', 'hevc_nvenc');
      args.push('-preset', 'slow');
      args.push('-cq', '20');
      break;
  }

  // Pixel format (required for most players)
  args.push('-pix_fmt', 'yuv420p');

  // Scaling (if dimensions provided)
  if (width && height) {
    args.push('-vf', `scale=${width}:${height}`);
  }

  // Bitrate (if provided)
  if (bitrate) {
    args.push('-b:v', bitrate);
  }

  // Audio codec (if audio provided)
  if (audioPath) {
    args.push('-c:a', 'aac');
    args.push('-b:a', '192k');
    args.push('-shortest'); // Use shortest stream length
  }

  // Output file
  args.push('-y'); // Overwrite without asking
  args.push(outputPath);

  return args;
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
  const maxBitrate = 100;
  const finalBitrate = Math.max(minBitrate, Math.min(maxBitrate, bitrateMbps));

  return `${finalBitrate}M`;
}

/**
 * Preset recommendations by resolution
 */
export const BITRATE_RECOMMENDATIONS: Record<string, { min: string; recommended: string; max: string }> = {
  '1080p-30': { min: '5M', recommended: '8M', max: '12M' },
  '1080p-60': { min: '8M', recommended: '12M', max: '18M' },
  '4k-30': { min: '20M', recommended: '35M', max: '50M' },
  '4k-60': { min: '35M', recommended: '50M', max: '80M' },
  '360-4k-30': { min: '25M', recommended: '40M', max: '60M' },
  '360-8k-30': { min: '80M', recommended: '100M', max: '150M' },
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

/**
 * Server-side FFmpeg encoder class
 * This is a placeholder that documents the expected interface.
 * Actual implementation requires Node.js child_process which isn't available in browser.
 */
export class FFmpegEncoder {
  private options: EncodeOptions;

  constructor(options: EncodeOptions) {
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
    return getFFmpegCommandString(this.options);
  }

  /**
   * Placeholder encode method
   * Actual implementation in scripts/headless-render.ts uses child_process
   */
  async encode(): Promise<EncodeResult> {
    // This is a placeholder - actual encoding happens server-side
    console.log('FFmpegEncoder.encode() - Server-side encoding required');
    console.log('Command:', this.getCommandString());

    return {
      success: false,
      outputPath: this.options.outputPath,
      duration: 0,
      error: 'Server-side encoding required. Use scripts/headless-render.ts',
    };
  }
}
