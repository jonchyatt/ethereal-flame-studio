/**
 * SpatialMetadata - VR spatial metadata injection for 360 videos
 *
 * This file provides backward compatibility exports.
 * The main implementation is in SpatialMetadataInjector.ts
 *
 * Phase 3, Plan 03-06
 */

// Re-export everything from the main implementation
export {
  SpatialMetadataInjector,
  injectSpatialMetadata,
  checkPythonAvailable,
  checkSpatialMediaAvailable,
  getInstallCommand,
  YOUTUBE_360_REQUIREMENTS,
  VR_HEADSET_COMPATIBILITY,
  ASPECT_RATIOS,
  type StereoMode,
  type ProjectionType,
  type SpatialMetadataOptions,
  type MetadataProgress,
  type MetadataResult,
  type MetadataInspectionResult,
} from './SpatialMetadataInjector';

// Backward compatibility types
/**
 * @deprecated Use SpatialMetadataOptions from SpatialMetadataInjector instead
 */
export interface SpatialMetadataOptionsLegacy {
  inputPath: string;
  outputPath: string;
  isStereo: boolean;
  stereoMode?: 'top-bottom' | 'left-right';
}

/**
 * @deprecated Use MetadataResult from SpatialMetadataInjector instead
 */
export interface SpatialMetadataResult {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Build Python command for spatial media injection
 *
 * @deprecated Use SpatialMetadataInjector class instead
 */
export function buildSpatialMediaCommand(options: SpatialMetadataOptionsLegacy): string[] {
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
 * @deprecated The script is now managed by SpatialMetadataInjector
 */
export function getSpatialMediaScript(): string {
  return `#!/usr/bin/env python3
"""
Inject VR spatial metadata into MP4 files for YouTube 360/VR playback.

Usage:
  python inject-metadata.py input.mp4 output.mp4 mono
  python inject-metadata.py input.mp4 output.mp4 stereo

Requires: pip install spatialmedia

Phase 3, Plan 03-06
"""

import sys
import os


def main():
    if len(sys.argv) < 4:
        print("Usage: python inject-metadata.py <input> <output> <mono|stereo>")
        print("")
        print("Arguments:")
        print("  input   - Input MP4 file (without spatial metadata)")
        print("  output  - Output MP4 file (with spatial metadata)")
        print("  mode    - 'mono' for monoscopic 360, 'stereo' for stereoscopic 3D 360")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3].lower()

    if mode not in ['mono', 'stereo']:
        print(f"Error: Mode must be 'mono' or 'stereo', got '{mode}'")
        sys.exit(1)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    try:
        from spatialmedia import metadata_utils
    except ImportError:
        print("Error: spatialmedia not installed.")
        print("Install with: pip install spatialmedia")
        print("Or: pip3 install spatialmedia")
        sys.exit(1)

    try:
        print(f"Processing: {input_path}")
        print(f"Mode: {mode}")

        # Create metadata object
        metadata = metadata_utils.Metadata()

        # Generate spherical video metadata
        # For stereo, use top-bottom layout (left eye on top, YouTube VR spec)
        stereo_mode = "top-bottom" if mode == "stereo" else None
        metadata.video = metadata_utils.generate_spherical_xml(
            stereo_mode=stereo_mode
        )

        # Inject metadata into the video file
        metadata_utils.inject_metadata(input_path, output_path, metadata)

        # Verify output exists
        if not os.path.exists(output_path):
            print("Error: Output file was not created")
            sys.exit(1)

        output_size = os.path.getsize(output_path)
        print(f"Success: Metadata injected into {output_path}")
        print(f"Output size: {output_size / 1024 / 1024:.1f} MB")

    except Exception as e:
        print(f"Error: Failed to inject metadata: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
`;
}

/**
 * Validate that spatial-media Python package is available
 *
 * @deprecated Use checkSpatialMediaAvailable from SpatialMetadataInjector instead
 */
export function getPythonValidationScript(): string {
  return 'python3 -c "from spatialmedia import metadata_utils; print(\'spatial-media available\')"';
}
