/**
 * Render Configuration Types
 *
 * Shared configuration types for headless rendering.
 *
 * Phase 3, Plan 03-07
 */

import type { ExportType } from '../src/lib/render/ExportPipeline';

/**
 * Configuration for a render job
 */
export interface RenderConfig {
  audioPath: string;
  templateId: string;
  outputPath: string;
  exportType: ExportType;
  fps: 30 | 60;
}

/**
 * Parse command line arguments into RenderConfig
 */
export function parseArgs(args: string[]): RenderConfig | null {
  const config: Partial<RenderConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--audio':
        config.audioPath = args[++i];
        break;
      case '--template':
        config.templateId = args[++i];
        break;
      case '--output':
        config.outputPath = args[++i];
        break;
      case '--type':
        config.exportType = args[++i] as ExportType;
        break;
      case '--fps':
        config.fps = parseInt(args[++i]) as 30 | 60;
        break;
      case '--help':
        printHelp();
        return null;
    }
  }

  // Validate required fields
  if (!config.audioPath || !config.templateId || !config.outputPath || !config.exportType) {
    console.error('Missing required arguments');
    printHelp();
    return null;
  }

  // Default fps
  if (!config.fps) {
    config.fps = 30;
  }

  return config as RenderConfig;
}

/**
 * Print usage help
 */
function printHelp(): void {
  console.log(`
Ethereal Flame Studio - Headless Renderer

Usage:
  npx ts-node scripts/headless-render.ts [options]

Required Options:
  --audio <path>      Path to audio file (MP3, WAV, etc.)
  --template <id>     Template ID (e.g., "etherealFlame", "etherealMist")
  --output <path>     Output video file path
  --type <type>       Export type:
                        flat-1080p-landscape, flat-1080p-portrait
                        flat-4k-landscape, flat-4k-portrait
                        360-mono-4k, 360-mono-6k, 360-mono-8k
                        360-stereo-8k

Optional:
  --fps <30|60>       Frame rate (default: 30)
  --help              Show this help message

Examples:
  npx ts-node scripts/headless-render.ts \\
    --audio input.mp3 \\
    --template etherealFlame \\
    --output output.mp4 \\
    --type flat-1080p-landscape \\
    --fps 30

For Linux servers without display:
  xvfb-run -s "-ac -screen 0 1920x1080x24" npx ts-node scripts/headless-render.ts ...
`);
}

/**
 * Validate export type
 */
export function isValidExportType(type: string): type is ExportType {
  const validTypes = [
    'flat-1080p-landscape', 'flat-1080p-portrait',
    'flat-4k-landscape', 'flat-4k-portrait',
    '360-mono-4k', '360-mono-6k', '360-mono-8k',
    '360-stereo-8k',
  ];
  return validTypes.includes(type);
}
