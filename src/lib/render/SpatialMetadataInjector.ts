/**
 * SpatialMetadataInjector - VR spatial metadata injection for 360 videos
 *
 * Injects Google Spatial Media metadata required for YouTube and VR
 * headsets to recognize and play 360/VR videos correctly.
 *
 * This is the server-side implementation using child_process to spawn
 * the Python spatial-media tools.
 *
 * Phase 3, Plan 03-06
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * Stereo mode for 360 video
 */
export type StereoMode = 'none' | 'top-bottom' | 'left-right';

/**
 * VR projection type
 */
export type ProjectionType = 'equirectangular' | 'cubemap';

/**
 * Options for spatial metadata injection
 */
export interface SpatialMetadataOptions {
  /** Input video file path */
  inputPath: string;
  /** Output video file path */
  outputPath: string;
  /** Enable spherical/360 video metadata */
  spherical?: boolean;
  /** Stereo mode for 3D 360 videos */
  stereoMode?: StereoMode;
  /** Projection type (default: equirectangular) */
  projection?: ProjectionType;
  /** Field of view for VR180 (optional, 180 for VR180) */
  fieldOfView?: number;
  /** Progress callback */
  onProgress?: (progress: MetadataProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Progress information for metadata injection
 */
export interface MetadataProgress {
  /** Current stage */
  stage: 'checking' | 'injecting' | 'verifying' | 'complete' | 'error';
  /** Progress message */
  message: string;
  /** Percentage complete (0-100) */
  percent: number;
}

/**
 * Metadata injection result
 */
export interface MetadataResult {
  /** Whether injection was successful */
  success: boolean;
  /** Output file path */
  outputPath: string;
  /** Duration in seconds */
  duration: number;
  /** Output file size in bytes */
  fileSize?: number;
  /** Error message if failed */
  error?: string;
  /** Details about the injected metadata */
  metadata?: {
    spherical: boolean;
    stereoMode: StereoMode;
    projection: ProjectionType;
  };
}

/**
 * Metadata inspection result
 */
export interface MetadataInspectionResult {
  /** Whether the file has spatial metadata */
  hasSpatialMetadata: boolean;
  /** Whether it's a spherical video */
  isSpherical: boolean;
  /** Stereo mode if present */
  stereoMode?: StereoMode;
  /** Projection type if detected */
  projection?: ProjectionType;
  /** Raw metadata details */
  details?: string;
}

/**
 * Check if Python is available
 */
export async function checkPythonAvailable(): Promise<{ available: boolean; version?: string; command: string }> {
  // Try different Python commands
  const commands = ['python3', 'python', 'py'];

  for (const cmd of commands) {
    const result = await tryPythonCommand(cmd);
    if (result.available) {
      return { ...result, command: cmd };
    }
  }

  return { available: false, command: 'python' };
}

async function tryPythonCommand(cmd: string): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const process = spawn(cmd, ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });
    process.stderr?.on('data', (data) => {
      output += data.toString();
    });

    process.on('error', () => resolve({ available: false }));
    process.on('close', (code) => {
      if (code === 0) {
        const versionMatch = output.match(/Python (\S+)/i);
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
 * Check if spatial-media Python package is available
 */
export async function checkSpatialMediaAvailable(pythonCmd = 'python3'): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn(pythonCmd, ['-c', 'from spatialmedia import metadata_utils; print("OK")'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });

    process.on('error', () => resolve(false));
    process.on('close', (code) => {
      resolve(code === 0 && output.includes('OK'));
    });
  });
}

/**
 * Get install command for spatial-media package
 */
export function getInstallCommand(pythonCmd = 'python3'): string {
  const pipCmd = pythonCmd === 'python3' ? 'pip3' : 'pip';
  return `${pipCmd} install spatialmedia`;
}

/**
 * SpatialMetadataInjector class for server-side metadata injection
 */
export class SpatialMetadataInjector extends EventEmitter {
  private options: SpatialMetadataOptions;
  private pythonCommand: string = 'python3';
  private process: ChildProcess | null = null;
  private aborted = false;

  constructor(options: SpatialMetadataOptions) {
    super();
    this.options = {
      spherical: true,
      stereoMode: 'none',
      projection: 'equirectangular',
      ...options,
    };
  }

  /**
   * Set Python command to use
   */
  setPythonCommand(cmd: string): void {
    this.pythonCommand = cmd;
  }

  /**
   * Auto-detect Python command
   */
  async detectPython(): Promise<boolean> {
    const result = await checkPythonAvailable();
    if (result.available) {
      this.pythonCommand = result.command;
      return true;
    }
    return false;
  }

  /**
   * Inject spatial metadata into video file
   */
  async inject(): Promise<MetadataResult> {
    const startTime = Date.now();
    this.aborted = false;

    const { inputPath, outputPath, stereoMode, onProgress, signal } = this.options;

    // Set up abort handler
    if (signal) {
      signal.addEventListener('abort', () => {
        this.abort();
      });
    }

    try {
      // Check input file exists
      this.reportProgress({
        stage: 'checking',
        message: 'Checking input file...',
        percent: 0,
      });

      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // Check Python and spatial-media are available
      this.reportProgress({
        stage: 'checking',
        message: 'Checking dependencies...',
        percent: 10,
      });

      const hasSpatialMedia = await checkSpatialMediaAvailable(this.pythonCommand);
      if (!hasSpatialMedia) {
        throw new Error(
          `spatial-media Python package not available. ` +
          `Install with: ${getInstallCommand(this.pythonCommand)}`
        );
      }

      // Get script path
      const scriptPath = this.getScriptPath();

      // Ensure script exists
      if (!fs.existsSync(scriptPath)) {
        // Write the script if it doesn't exist
        this.writeInjectScript(scriptPath);
      }

      // Determine mode argument
      const mode = stereoMode === 'top-bottom' || stereoMode === 'left-right'
        ? 'stereo'
        : 'mono';

      // Start injection
      this.reportProgress({
        stage: 'injecting',
        message: 'Injecting spatial metadata...',
        percent: 20,
      });

      const result = await this.runInjectionScript(scriptPath, inputPath, outputPath, mode);

      if (!result.success) {
        throw new Error(result.error || 'Metadata injection failed');
      }

      // Verify output
      this.reportProgress({
        stage: 'verifying',
        message: 'Verifying output...',
        percent: 90,
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error('Output file was not created');
      }

      const stats = fs.statSync(outputPath);

      this.reportProgress({
        stage: 'complete',
        message: 'Metadata injection complete',
        percent: 100,
      });

      return {
        success: true,
        outputPath,
        duration: (Date.now() - startTime) / 1000,
        fileSize: stats.size,
        metadata: {
          spherical: true,
          stereoMode: stereoMode || 'none',
          projection: this.options.projection || 'equirectangular',
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.reportProgress({
        stage: 'error',
        message: errorMessage,
        percent: 0,
      });

      return {
        success: false,
        outputPath,
        duration: (Date.now() - startTime) / 1000,
        error: errorMessage,
      };
    }
  }

  /**
   * Run the metadata injection Python script
   */
  private runInjectionScript(
    scriptPath: string,
    inputPath: string,
    outputPath: string,
    mode: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.process = spawn(this.pythonCommand, [scriptPath, inputPath, outputPath, mode], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      this.process.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        console.log('[SpatialMetadataInjector]', text.trim());

        // Update progress based on output
        if (text.includes('Processing')) {
          this.reportProgress({
            stage: 'injecting',
            message: 'Processing video file...',
            percent: 40,
          });
        } else if (text.includes('Success')) {
          this.reportProgress({
            stage: 'injecting',
            message: 'Metadata injected successfully',
            percent: 85,
          });
        }
      });

      this.process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      this.process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to run Python script: ${error.message}`,
        });
      });

      this.process.on('close', (code) => {
        if (this.aborted) {
          resolve({ success: false, error: 'Injection aborted' });
          return;
        }

        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || stdout || `Python script exited with code ${code}`,
          });
        }
      });
    });
  }

  /**
   * Abort the injection process
   */
  abort(): void {
    if (this.process && !this.aborted) {
      this.aborted = true;
      console.log('[SpatialMetadataInjector] Aborting...');
      this.process.kill('SIGTERM');
    }
  }

  /**
   * Get the path to the injection script
   */
  private getScriptPath(): string {
    // Look for script in common locations
    const possiblePaths = [
      path.join(process.cwd(), 'scripts', 'inject-metadata.py'),
      path.join(__dirname, '..', '..', '..', 'scripts', 'inject-metadata.py'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Return default path (we'll create it if needed)
    return possiblePaths[0];
  }

  /**
   * Write the injection script to disk
   */
  private writeInjectScript(scriptPath: string): void {
    const scriptContent = `#!/usr/bin/env python3
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

    // Ensure directory exists
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log(`[SpatialMetadataInjector] Created script at ${scriptPath}`);
  }

  /**
   * Report progress to callback and emit event
   */
  private reportProgress(progress: MetadataProgress): void {
    this.emit('progress', progress);
    this.options.onProgress?.(progress);
  }

  /**
   * Check if a video file has spatial metadata
   */
  static async inspectMetadata(filePath: string, pythonCmd = 'python3'): Promise<MetadataInspectionResult> {
    return new Promise((resolve) => {
      // Use ffprobe if available
      const process = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_streams',
        '-show_format',
        '-print_format', 'json',
        filePath,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let output = '';
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('error', () => {
        // ffprobe not available, try alternative method
        resolve({
          hasSpatialMetadata: false,
          isSpherical: false,
          details: 'Unable to inspect (ffprobe not available)',
        });
      });

      process.on('close', (code) => {
        if (code !== 0) {
          resolve({
            hasSpatialMetadata: false,
            isSpherical: false,
            details: 'Unable to inspect file',
          });
          return;
        }

        try {
          const data = JSON.parse(output);

          // Look for spherical metadata in format tags
          const formatTags = data.format?.tags || {};
          const isSpherical = !!(
            formatTags['com.google.spherical'] ||
            formatTags['spherical-video'] ||
            formatTags['stereo-mode']
          );

          let stereoMode: StereoMode | undefined;
          if (formatTags['stereo-mode'] === 'top-bottom') {
            stereoMode = 'top-bottom';
          } else if (formatTags['stereo-mode'] === 'left-right') {
            stereoMode = 'left-right';
          }

          resolve({
            hasSpatialMetadata: isSpherical,
            isSpherical,
            stereoMode,
            projection: 'equirectangular',
            details: JSON.stringify(formatTags, null, 2),
          });
        } catch {
          resolve({
            hasSpatialMetadata: false,
            isSpherical: false,
            details: 'Failed to parse metadata',
          });
        }
      });
    });
  }
}

/**
 * Convenience function for quick metadata injection
 */
export async function injectSpatialMetadata(options: SpatialMetadataOptions): Promise<MetadataResult> {
  const injector = new SpatialMetadataInjector(options);
  await injector.detectPython();
  return injector.inject();
}

/**
 * YouTube 360 video requirements reference
 */
export const YOUTUBE_360_REQUIREMENTS = {
  format: 'MP4 (H.264 or H.265)',
  metadata: 'V2 Spherical Video Metadata',
  monoResolutions: ['4096x2048', '5120x2560', '5760x2880', '7680x3840', '8192x4096'],
  stereoResolutions: ['4096x4096', '5120x5120', '8192x8192'],
  stereoLayout: 'Top/Bottom (left eye on top)',
  maxBitrate: '150 Mbps',
  maxFrameRate: '60 fps',
  audioFormats: ['AAC', 'AC3'],
  audioSampleRate: '48000 Hz',
};

/**
 * VR headset compatibility notes
 */
export const VR_HEADSET_COMPATIBILITY = {
  metaQuest2: {
    formats: ['MP4 H.264', 'MP4 H.265'],
    maxResolution: '5760x2880 (mono), 5760x5760 (stereo)',
    notes: 'Best with H.265 for file size. Supports spatial audio.',
  },
  metaQuest3: {
    formats: ['MP4 H.264', 'MP4 H.265'],
    maxResolution: '8192x4096 (mono), 8192x8192 (stereo)',
    notes: 'Supports higher resolutions than Quest 2.',
  },
  appleVisionPro: {
    formats: ['MP4 H.265'],
    maxResolution: '7680x3840 (mono)',
    notes: 'Requires HEVC Main 10 profile for HDR. Supports spatial video.',
  },
  picoPro: {
    formats: ['MP4 H.264', 'MP4 H.265'],
    maxResolution: '5760x2880 (mono)',
    notes: 'Similar to Meta Quest compatibility.',
  },
  steamVR: {
    formats: ['MP4 H.264', 'MP4 H.265', 'WebM VP9'],
    maxResolution: 'Depends on headset',
    notes: 'Use SteamVR Media Player for best results.',
  },
};

/**
 * Common aspect ratios for 360 video
 */
export const ASPECT_RATIOS = {
  mono360: { width: 2, height: 1, description: 'Equirectangular 360 (2:1)' },
  stereo360TopBottom: { width: 1, height: 1, description: 'Stereo 360 Top/Bottom (1:1)' },
  stereo360SideBySide: { width: 4, height: 1, description: 'Stereo 360 Side by Side (4:1)' },
  vr180: { width: 1, height: 1, description: 'VR180 Stereo (1:1)' },
};
