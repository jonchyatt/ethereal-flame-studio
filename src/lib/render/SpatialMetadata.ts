/**
 * SpatialMetadata - VR spatial metadata injection for 360 videos
 *
 * Injects Google Spatial Media metadata required for YouTube and VR
 * headsets to recognize and play 360/VR videos correctly.
 *
 * Phase 3, Plan 03-06
 */

/**
 * Options for spatial metadata injection
 */
export interface SpatialMetadataOptions {
  inputPath: string;
  outputPath: string;
  isStereo: boolean;
  stereoMode?: 'top-bottom' | 'left-right';
}

/**
 * Metadata injection result
 */
export interface SpatialMetadataResult {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Build Python command for spatial media injection
 *
 * Uses Google's spatial-media library:
 * https://github.com/google/spatial-media
 */
export function buildSpatialMediaCommand(options: SpatialMetadataOptions): string[] {
  const { inputPath, outputPath, isStereo, stereoMode = 'top-bottom' } = options;

  const args: string[] = [];

  // Use the spatialmedia CLI
  args.push('spatialmedia');

  // Inject spherical metadata
  args.push('-i');
  args.push('--stereo=' + (isStereo ? stereoMode : 'none'));

  // Input and output files
  args.push(inputPath);
  args.push(outputPath);

  return args;
}

/**
 * Get Python script content for spatial metadata injection
 *
 * This script is saved to scripts/inject-metadata.py and called from Node.js
 */
export function getSpatialMediaScript(): string {
  return `#!/usr/bin/env python3
"""
Inject VR spatial metadata into MP4 files for YouTube 360/VR playback.

Usage:
  python inject-metadata.py input.mp4 output.mp4 mono
  python inject-metadata.py input.mp4 output.mp4 stereo

Requires: pip install spatialmedia
"""

import sys
import os

def main():
    if len(sys.argv) < 4:
        print("Usage: python inject-metadata.py <input> <output> <mono|stereo>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3]

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    try:
        from spatialmedia import metadata_utils
    except ImportError:
        print("Error: spatialmedia not installed. Run: pip install spatialmedia")
        sys.exit(1)

    try:
        # Create metadata object
        metadata = metadata_utils.Metadata()
        metadata.video = metadata_utils.generate_spherical_xml(
            stereo_mode="top-bottom" if mode == "stereo" else None
        )

        # Inject metadata
        metadata_utils.inject_metadata(input_path, output_path, metadata)

        print(f"Success: Metadata injected into {output_path}")

    except Exception as e:
        print(f"Error: Failed to inject metadata: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
}

/**
 * Validate that spatial-media Python package is available
 */
export function getPythonValidationScript(): string {
  return 'python3 -c "from spatialmedia import metadata_utils; print(\'spatial-media available\')"';
}

/**
 * Get pip install command for spatial-media
 */
export function getInstallCommand(): string {
  return 'pip install spatialmedia';
}

/**
 * Placeholder class for server-side metadata injection
 *
 * Actual implementation requires Node.js child_process
 */
export class SpatialMetadataInjector {
  /**
   * Inject spatial metadata into video file
   *
   * Note: This is a placeholder. Actual implementation in scripts/headless-render.ts
   */
  static async inject(options: SpatialMetadataOptions): Promise<SpatialMetadataResult> {
    console.log('SpatialMetadataInjector.inject() - Server-side injection required');
    console.log('Options:', options);

    return {
      success: false,
      outputPath: options.outputPath,
      error: 'Server-side injection required. Use scripts/headless-render.ts',
    };
  }

  /**
   * Check if input file has spatial metadata
   */
  static async checkMetadata(filePath: string): Promise<{ hasSpatialMetadata: boolean; details?: string }> {
    console.log('SpatialMetadataInjector.checkMetadata() - Server-side check required');
    console.log('File:', filePath);

    return {
      hasSpatialMetadata: false,
      details: 'Server-side check required',
    };
  }
}

/**
 * YouTube 360 video requirements
 */
export const YOUTUBE_360_REQUIREMENTS = {
  format: 'MP4 (H.264 or H.265)',
  metadata: 'V2 Spherical Video Metadata',
  monoResolutions: ['4096x2048', '5120x2560', '5760x2880', '7680x3840'],
  stereoResolutions: ['4096x4096', '5120x5120', '8192x8192'],
  stereoLayout: 'Top/Bottom (left eye on top)',
  maxBitrate: '150 Mbps',
  maxFrameRate: '60 fps',
};

/**
 * VR headset compatibility notes
 */
export const VR_HEADSET_COMPATIBILITY = {
  metaQuest: {
    formats: ['MP4 H.264', 'MP4 H.265'],
    maxResolution: '5760x2880 (mono), 5760x5760 (stereo)',
    notes: 'Best with H.265 for file size',
  },
  appleVisionPro: {
    formats: ['MP4 H.265'],
    maxResolution: '7680x3840 (mono)',
    notes: 'Requires HEVC Main 10 profile for HDR',
  },
  picoPro: {
    formats: ['MP4 H.264', 'MP4 H.265'],
    maxResolution: '5760x2880 (mono)',
    notes: 'Similar to Meta Quest',
  },
};
