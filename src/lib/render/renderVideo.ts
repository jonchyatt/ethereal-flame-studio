/**
 * renderVideo - High-level orchestration for automated video rendering
 *
 * Combines all render pipeline components:
 * 1. Pre-analyze audio for frame-accurate data
 * 2. Launch Puppeteer and capture frames
 * 3. Encode frames to video with FFmpeg
 * 4. Inject VR metadata (for 360 videos)
 * 5. Clean up temporary files
 *
 * Phase: Puppeteer Frame Capture Implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PreAnalyzer } from '../audio/PreAnalyzer';
import { PuppeteerRenderer, RenderProgress } from './PuppeteerRenderer';
import {
  FFmpegEncoder,
  OutputFormat,
  QualityPreset,
  getRecommendedCodec,
  EncodingProgress,
} from './FFmpegEncoder';
import { injectSpatialMetadata, ProjectionType } from './SpatialMetadataInjector';
import { PreAnalysisResult } from '@/types';

/**
 * Video render configuration
 */
export interface RenderVideoConfig {
  /** Path to audio file */
  audioPath: string;
  /** Output video file path */
  outputPath: string;
  /** Template to use (e.g., 'flame', 'mist') */
  template?: string;
  /** Full visual configuration from exported config file */
  visualConfig?: {
    mode?: 'flame' | 'mist';
    intensity?: number;
    skyboxPreset?: string;
    skyboxRotationSpeed?: number;
    skyboxAudioReactiveEnabled?: boolean;
    skyboxAudioReactivity?: number;
    skyboxDriftSpeed?: number;
    waterEnabled?: boolean;
    waterColor?: string;
    waterReflectivity?: number;
    cameraOrbitEnabled?: boolean;
    cameraOrbitRenderOnly?: boolean;
    cameraOrbitSpeed?: number;
    cameraOrbitRadius?: number;
    cameraOrbitHeight?: number;
    cameraLookAtOrb?: boolean;
    orbAnchorMode?: 'viewer' | 'world';
    orbDistance?: number;
    orbHeight?: number;
    orbSideOffset?: number;
    orbWorldX?: number;
    orbWorldY?: number;
    orbWorldZ?: number;
    layers?: any[];
  };
  /** Output format */
  format: OutputFormat;
  /** Frames per second (default: 30) */
  fps?: number;
  /** Quality preset (default: 'balanced') */
  quality?: QualityPreset;
  /** App URL (default: http://localhost:3000) */
  appUrl?: string;
  /** Run browser visibly for preview (default: true) */
  headless?: boolean;
  /** Called after visual config is applied but before rendering starts.
   *  Use for preview confirmation prompts. */
  onBeforeRender?: () => Promise<void>;
  /** Keep temporary frames after encoding (default: false) */
  keepFrames?: boolean;
  /** Temporary directory for frames (default: system temp) */
  tempDir?: string;
  /** Progress callback */
  onProgress?: (progress: RenderVideoProgress) => void;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Progress information for the full render pipeline
 */
export interface RenderVideoProgress {
  stage: 'analyzing' | 'capturing' | 'encoding' | 'metadata' | 'complete' | 'error';
  stageProgress: number; // 0-100 for current stage
  overallProgress: number; // 0-100 for entire pipeline
  message: string;
  details?: {
    currentFrame?: number;
    totalFrames?: number;
    fps?: number;
    eta?: number;
  };
}

/**
 * Result of a video render operation
 */
export interface RenderVideoResult {
  success: boolean;
  outputPath: string;
  duration: number; // Total time in seconds
  stages: {
    analysis: { success: boolean; duration: number };
    capture: { success: boolean; duration: number; frames: number };
    encoding: { success: boolean; duration: number };
    metadata?: { success: boolean; duration: number };
  };
  error?: string;
}

/**
 * Get resolution for output format
 */
function getResolution(format: OutputFormat): { width: number; height: number } {
  const resolutions: Record<string, { width: number; height: number }> = {
    // Legacy format names
    'flat-1080p': { width: 1920, height: 1080 },
    'flat-4k': { width: 3840, height: 2160 },
    'flat-1080p-vertical': { width: 1080, height: 1920 },
    'flat-4k-vertical': { width: 2160, height: 3840 },
    // New format names (from renderConfig)
    'flat-1080p-landscape': { width: 1920, height: 1080 },
    'flat-1080p-portrait': { width: 1080, height: 1920 },
    'flat-4k-landscape': { width: 3840, height: 2160 },
    'flat-4k-portrait': { width: 2160, height: 3840 },
    // 360 formats
    '360-mono-4k': { width: 4096, height: 2048 },
    '360-mono-6k': { width: 6144, height: 3072 },
    '360-mono-8k': { width: 8192, height: 4096 },
    '360-stereo-4k': { width: 3840, height: 3840 }, // Top/bottom stereo
    '360-stereo-8k': { width: 8192, height: 8192 }, // Top/bottom stereo
  };
  const resolution = resolutions[format];
  if (!resolution) {
    throw new Error(`Unknown output format: ${format}`);
  }
  return resolution;
}

/**
 * Check if format is 360
 */
function is360Format(format: OutputFormat): boolean {
  return format.startsWith('360-');
}

/**
 * Check if format is stereo
 */
function isStereoFormat(format: OutputFormat): boolean {
  return format.includes('stereo');
}

/**
 * Main render video function
 */
export async function renderVideo(config: RenderVideoConfig): Promise<RenderVideoResult> {
  const {
    audioPath,
    outputPath,
    template,
    visualConfig,
    format,
    fps = 30,
    quality = 'balanced',
    appUrl = 'http://localhost:3000',
    headless = true,
    onBeforeRender,
    keepFrames = false,
    tempDir,
    onProgress,
    signal,
  } = config;

  const startTime = Date.now();
  const resolution = getResolution(format);

  // Create temp directory for frames
  const framesDir = tempDir
    ? path.join(tempDir, `frames_${Date.now()}`)
    : path.join(process.env.TEMP || '/tmp', `ethereal_frames_${Date.now()}`);

  const result: RenderVideoResult = {
    success: false,
    outputPath,
    duration: 0,
    stages: {
      analysis: { success: false, duration: 0 },
      capture: { success: false, duration: 0, frames: 0 },
      encoding: { success: false, duration: 0 },
    },
  };

  let renderer: PuppeteerRenderer | null = null;

  try {
    // Check for abort
    if (signal?.aborted) {
      throw new Error('Render aborted');
    }

    // ========================================================================
    // STAGE 1: Pre-analyze audio
    // ========================================================================
    console.log('[renderVideo] Stage 1: Analyzing audio...');
    reportProgress(onProgress, {
      stage: 'analyzing',
      stageProgress: 0,
      overallProgress: 0,
      message: 'Analyzing audio...',
    });

    const analysisStart = Date.now();

    // Convert MP3/other formats to WAV for Node.js analysis
    let audioPathForAnalysis = audioPath;
    const audioExt = path.extname(audioPath).toLowerCase();
    if (audioExt !== '.wav') {
      console.log(`[renderVideo] Converting ${audioExt} to WAV for analysis...`);
      reportProgress(onProgress, {
        stage: 'analyzing',
        stageProgress: 0,
        overallProgress: 0,
        message: 'Converting audio to WAV...',
      });

      const wavPath = audioPath.replace(/\.[^.]+$/, '_converted.wav');
      const { execSync } = await import('child_process');
      try {
        // Convert to 16-bit PCM WAV at 44.1kHz
        execSync(`ffmpeg -y -i "${audioPath}" -ar 44100 -ac 1 -sample_fmt s16 "${wavPath}"`, {
          stdio: 'pipe',
        });
        audioPathForAnalysis = wavPath;
        console.log(`[renderVideo] Converted to WAV: ${wavPath}`);
      } catch (ffmpegError) {
        console.error('[renderVideo] FFmpeg conversion failed:', ffmpegError);
        throw new Error(`Failed to convert audio to WAV: ${ffmpegError instanceof Error ? ffmpegError.message : 'FFmpeg error'}`);
      }
    }

    const audioBuffer = await fs.readFile(audioPathForAnalysis);
    const preAnalyzer = new PreAnalyzer();

    let audioAnalysis: PreAnalysisResult;
    try {
      audioAnalysis = await preAnalyzer.analyze(audioBuffer.buffer, {
        fps,
        signal,
        onProgress: (percent) => {
          reportProgress(onProgress, {
            stage: 'analyzing',
            stageProgress: percent,
            overallProgress: percent * 0.1, // Analysis is 10% of total
            message: `Analyzing audio... ${percent}%`,
          });
        },
      });
    } catch (error) {
      // If WAV parsing fails, try to inform the user
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('WAV')) {
        throw new Error(
          `Audio analysis failed: ${msg}. For server-side rendering, convert audio to WAV format first.`
        );
      }
      throw error;
    }

    result.stages.analysis = {
      success: true,
      duration: (Date.now() - analysisStart) / 1000,
    };

    console.log(
      `[renderVideo] Audio analyzed: ${audioAnalysis.totalFrames} frames, ${audioAnalysis.duration.toFixed(1)}s`
    );

    // ========================================================================
    // STAGE 2: Capture frames with Puppeteer
    // ========================================================================
    console.log('[renderVideo] Stage 2: Capturing frames...');
    reportProgress(onProgress, {
      stage: 'capturing',
      stageProgress: 0,
      overallProgress: 10,
      message: 'Starting frame capture...',
      details: {
        totalFrames: audioAnalysis.totalFrames,
      },
    });

    if (signal?.aborted) {
      throw new Error('Render aborted');
    }

    const captureStart = Date.now();

    // Create renderer
    renderer = new PuppeteerRenderer({
      appUrl,
      width: resolution.width,
      height: resolution.height,
      fps,
      template,
      visualConfig,
      headless,
    });

    // Launch and initialize
    await renderer.launch();
    await renderer.initRenderMode();

    // Check GPU availability
    const gpu = await renderer.checkGPU();
    if (!gpu.available) {
      console.warn(
        `[renderVideo] Warning: No GPU detected (${gpu.renderer}), using software rendering`
      );
    }

    // Capture a preview screenshot (frame 0) for verification
    const previewPath = path.join(path.dirname(outputPath), 'preview.png');
    try {
      const silentFrame = {
        amplitude: 0, bass: 0, mid: 0, high: 0,
        isBeat: false, spectralCentroid: 0, spectralFlux: 0,
      };
      await renderer.captureFrame(0, silentFrame as any, previewPath);
      console.log(`[renderVideo] Preview saved: ${previewPath}`);
    } catch (previewErr) {
      console.warn(`[renderVideo] Preview capture failed (non-fatal): ${previewErr}`);
    }

    // Allow caller to inspect before rendering (e.g., preview confirmation)
    if (onBeforeRender) {
      await onBeforeRender();
    }

    // Check for existing checkpoint
    const checkpoint = await renderer.loadCheckpoint(framesDir);
    const startFrame = checkpoint?.lastFrame ? checkpoint.lastFrame + 1 : 0;

    // Render frames
    const captureResult = await renderer.renderFrames({
      audioAnalysis,
      outputDir: framesDir,
      format: 'png',
      startFrame,
      checkpointInterval: 100,
      onProgress: (progress: RenderProgress) => {
        reportProgress(onProgress, {
          stage: 'capturing',
          stageProgress: progress.percent,
          overallProgress: 10 + progress.percent * 0.6, // Capture is 60% of total (10-70)
          message: `Capturing frame ${progress.currentFrame}/${progress.totalFrames}...`,
          details: {
            currentFrame: progress.currentFrame,
            totalFrames: progress.totalFrames,
            fps: progress.fps,
            eta: progress.estimatedRemainingMs / 1000,
          },
        });
      },
    });

    // Close renderer
    await renderer.close();
    renderer = null;

    if (!captureResult.success) {
      throw new Error(`Frame capture failed: ${captureResult.error}`);
    }

    result.stages.capture = {
      success: true,
      duration: (Date.now() - captureStart) / 1000,
      frames: captureResult.framesRendered,
    };

    console.log(
      `[renderVideo] Captured ${captureResult.framesRendered} frames in ${result.stages.capture.duration.toFixed(1)}s ` +
        `(${captureResult.averageFps.toFixed(1)} fps)`
    );

    // ========================================================================
    // STAGE 3: Encode video with FFmpeg
    // ========================================================================
    console.log('[renderVideo] Stage 3: Encoding video...');
    reportProgress(onProgress, {
      stage: 'encoding',
      stageProgress: 0,
      overallProgress: 70,
      message: 'Starting video encoding...',
    });

    if (signal?.aborted) {
      throw new Error('Render aborted');
    }

    const encodeStart = Date.now();

    // Get recommended codec
    const codec = await getRecommendedCodec(format);
    console.log(`[renderVideo] Using codec: ${codec}`);

    // Create encoder
    const encoder = new FFmpegEncoder({
      inputPattern: path.join(framesDir, 'frame_%06d.png'),
      outputPath: is360Format(format) ? outputPath.replace(/\.[^.]+$/, '_temp.mp4') : outputPath,
      fps,
      codec,
      preset: quality,
      format,
      audioPath,
      signal,
      onProgress: (progress: EncodingProgress) => {
        reportProgress(onProgress, {
          stage: 'encoding',
          stageProgress: progress.percent,
          overallProgress: 70 + progress.percent * 0.25, // Encoding is 25% of total (70-95)
          message: `Encoding video... ${progress.percent.toFixed(0)}%`,
          details: {
            currentFrame: progress.frame,
            totalFrames: progress.totalFrames,
            eta: progress.eta,
          },
        });
      },
    });

    const encodeResult = await encoder.encode();

    if (!encodeResult.success) {
      throw new Error(`Video encoding failed: ${encodeResult.error}`);
    }

    result.stages.encoding = {
      success: true,
      duration: (Date.now() - encodeStart) / 1000,
    };

    console.log(
      `[renderVideo] Encoded video in ${result.stages.encoding.duration.toFixed(1)}s`
    );

    // ========================================================================
    // STAGE 4: Inject VR metadata (for 360 videos)
    // ========================================================================
    if (is360Format(format)) {
      console.log('[renderVideo] Stage 4: Injecting VR metadata...');
      reportProgress(onProgress, {
        stage: 'metadata',
        stageProgress: 0,
        overallProgress: 95,
        message: 'Injecting VR metadata...',
      });

      if (signal?.aborted) {
        throw new Error('Render aborted');
      }

      const metadataStart = Date.now();
      const tempVideoPath = outputPath.replace(/\.[^.]+$/, '_temp.mp4');

      try {
        await injectSpatialMetadata({
          inputPath: tempVideoPath,
          outputPath,
          projection: 'equirectangular' as ProjectionType,
          stereoMode: isStereoFormat(format) ? 'top-bottom' : 'none',
        });

        // Remove temp file
        await fs.unlink(tempVideoPath);

        result.stages.metadata = {
          success: true,
          duration: (Date.now() - metadataStart) / 1000,
        };

        console.log('[renderVideo] VR metadata injected');
      } catch (error) {
        // If metadata injection fails, use the temp file as output
        console.warn(
          `[renderVideo] Warning: VR metadata injection failed, using video without metadata`
        );
        await fs.rename(tempVideoPath, outputPath);
        result.stages.metadata = {
          success: false,
          duration: (Date.now() - metadataStart) / 1000,
        };
      }
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================
    if (!keepFrames) {
      console.log('[renderVideo] Cleaning up temporary frames...');
      try {
        await fs.rm(framesDir, { recursive: true, force: true });
      } catch {
        console.warn('[renderVideo] Warning: Failed to cleanup temp frames');
      }
    }

    // ========================================================================
    // COMPLETE
    // ========================================================================
    result.success = true;
    result.duration = (Date.now() - startTime) / 1000;

    reportProgress(onProgress, {
      stage: 'complete',
      stageProgress: 100,
      overallProgress: 100,
      message: 'Render complete!',
    });

    console.log(
      `[renderVideo] Complete! Total time: ${result.duration.toFixed(1)}s, Output: ${outputPath}`
    );

    return result;
  } catch (error) {
    // Cleanup on error
    if (renderer) {
      try {
        await renderer.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    result.error = errorMessage;
    result.duration = (Date.now() - startTime) / 1000;

    reportProgress(onProgress, {
      stage: 'error',
      stageProgress: 0,
      overallProgress: 0,
      message: `Error: ${errorMessage}`,
    });

    console.error(`[renderVideo] Failed: ${errorMessage}`);
    return result;
  }
}

/**
 * Helper to report progress
 */
function reportProgress(
  callback: ((progress: RenderVideoProgress) => void) | undefined,
  progress: RenderVideoProgress
): void {
  if (callback) {
    callback(progress);
  }
}

/**
 * Quick render for common use cases
 */
export async function quickRender(
  audioPath: string,
  outputPath: string,
  options: Partial<RenderVideoConfig> = {}
): Promise<RenderVideoResult> {
  return renderVideo({
    audioPath,
    outputPath,
    format: 'flat-1080p',
    fps: 30,
    quality: 'balanced',
    ...options,
  });
}

/**
 * Render 360 video
 */
export async function render360(
  audioPath: string,
  outputPath: string,
  options: {
    stereo?: boolean;
    resolution?: '4k' | '6k' | '8k';
    template?: string;
    quality?: QualityPreset;
    onProgress?: (progress: RenderVideoProgress) => void;
  } = {}
): Promise<RenderVideoResult> {
  const { stereo = false, resolution = '4k', template, quality, onProgress } = options;

  let format: OutputFormat;
  if (stereo) {
    format = resolution === '8k' ? '360-stereo-8k' : '360-stereo-4k';
  } else {
    format =
      resolution === '8k'
        ? '360-mono-8k'
        : resolution === '6k'
          ? '360-mono-6k'
          : '360-mono-4k';
  }

  return renderVideo({
    audioPath,
    outputPath,
    format,
    template,
    quality,
    onProgress,
  });
}
