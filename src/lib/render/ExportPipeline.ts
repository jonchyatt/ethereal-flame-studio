/**
 * ExportPipeline - Unified export API for all video types
 *
 * Routes exports to the appropriate pipeline (flat, 360 mono, 360 stereo)
 * and coordinates stages: analyze -> render -> encode -> metadata
 *
 * Phase 3, Plan 03-06
 */

import * as THREE from 'three';
import { PreAnalyzer } from '@/lib/audio/PreAnalyzer';
import { FrameCapture, CapturedFrame } from './FrameCapture';
import { RenderTargetManager, RenderPreset, PRESET_RESOLUTIONS } from './RenderTarget';
import { SceneStepper } from './SceneStepper';
import { CubemapCapture, EQUIRECT_TO_CUBE, CubemapResolution } from './CubemapCapture';
import { EquirectangularConverter } from './EquirectangularConverter';
import { StereoCapture } from './StereoCapture';
import { StereoStacker } from './StereoStacker';
import { FrameAudioData, PreAnalysisResult } from '@/types/index';

/**
 * Export type options
 */
export type ExportType =
  | 'flat-1080p-landscape' | 'flat-1080p-portrait'
  | 'flat-4k-landscape' | 'flat-4k-portrait'
  | '360-mono-4k' | '360-mono-6k' | '360-mono-8k'
  | '360-stereo-8k';

/**
 * Export configuration
 */
export interface ExportConfig {
  type: ExportType;
  fps: 30 | 60;
  audioFile: File | ArrayBuffer;
  templateId?: string;
  outputName: string;
  onProgress?: (percent: number, stage: string) => void;
  signal?: AbortSignal;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  outputPath: string;
  duration: number;
  frames?: CapturedFrame[];  // Available for browser exports
  error?: string;
}

/**
 * Stage weights for progress calculation
 *
 * Total must equal 100
 */
const STAGE_WEIGHTS = {
  analyze: 10,    // Pre-analysis
  render: 70,     // Frame rendering
  encode: 15,     // FFmpeg encoding (server-side)
  metadata: 5,    // VR metadata injection (server-side)
};

/**
 * Map export type to render preset
 */
function getPresetFromType(type: ExportType): RenderPreset | null {
  switch (type) {
    case 'flat-1080p-landscape': return '1080p-landscape';
    case 'flat-1080p-portrait': return '1080p-portrait';
    case 'flat-4k-landscape': return '4k-landscape';
    case 'flat-4k-portrait': return '4k-portrait';
    case '360-mono-4k': return '360-4k';
    case '360-mono-6k': return '360-6k';
    case '360-mono-8k': return '360-8k';
    case '360-stereo-8k': return '360-stereo-8k';
    default: return null;
  }
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
 * Get 360 output width for export type
 */
function get360Width(type: ExportType): number {
  switch (type) {
    case '360-mono-4k': return 4096;
    case '360-mono-6k': return 6144;
    case '360-mono-8k': return 8192;
    case '360-stereo-8k': return 8192;
    default: return 4096;
  }
}

export class ExportPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private targetManager: RenderTargetManager;
  private preAnalyzer: PreAnalyzer;

  // Optional 360 capture components (created on demand)
  private cubemapCapture: CubemapCapture | null = null;
  private equirectConverter: EquirectangularConverter | null = null;
  private stereoCapture: StereoCapture | null = null;
  private stereoStacker: StereoStacker | null = null;

  // Frame step callback
  private onStepFrame?: (frame: number, audioData: FrameAudioData, deltaTime: number) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.targetManager = new RenderTargetManager(renderer);
    this.preAnalyzer = new PreAnalyzer();
  }

  /**
   * Set callback for stepping the scene each frame
   */
  setFrameStepCallback(callback: (frame: number, audioData: FrameAudioData, deltaTime: number) => void): void {
    this.onStepFrame = callback;
  }

  /**
   * Main export method - routes to appropriate pipeline
   */
  async export(config: ExportConfig): Promise<ExportResult> {
    const { type, fps, audioFile, onProgress, signal } = config;
    const startTime = performance.now();

    try {
      // Check for abort
      if (signal?.aborted) {
        throw new DOMException('Export aborted', 'AbortError');
      }

      // Stage 1: Pre-analyze audio
      this.reportProgress(onProgress, 0, 'Analyzing audio...');

      const audioBuffer = audioFile instanceof File
        ? await audioFile.arrayBuffer()
        : audioFile;

      const analysisResult = await this.preAnalyzer.analyze(audioBuffer, {
        fps,
        onProgress: (percent) => {
          const stageProgress = percent * (STAGE_WEIGHTS.analyze / 100);
          this.reportProgress(onProgress, stageProgress * 100, 'Analyzing audio...');
        },
        signal,
        useCache: true,
      });

      // Stage 2: Render frames based on export type
      let frames: CapturedFrame[];

      if (is360Type(type)) {
        if (isStereoType(type)) {
          frames = await this.render360Stereo(type, fps, analysisResult, onProgress, signal);
        } else {
          frames = await this.render360Mono(type, fps, analysisResult, onProgress, signal);
        }
      } else {
        frames = await this.renderFlat(type, fps, analysisResult, onProgress, signal);
      }

      // Stage 3: Finalize (in browser, return frames; server-side would encode)
      const analyzeProgress = STAGE_WEIGHTS.analyze;
      const renderProgress = STAGE_WEIGHTS.render;
      this.reportProgress(onProgress, analyzeProgress + renderProgress, 'Finalizing...');

      const duration = (performance.now() - startTime) / 1000;

      this.reportProgress(onProgress, 100, 'Complete');

      return {
        success: true,
        outputPath: config.outputName,
        duration,
        frames,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        outputPath: '',
        duration: (performance.now() - startTime) / 1000,
        error: errorMessage,
      };
    }
  }

  /**
   * Render flat video frames
   */
  private async renderFlat(
    type: ExportType,
    fps: number,
    analysisResult: PreAnalysisResult,
    onProgress?: (percent: number, stage: string) => void,
    signal?: AbortSignal
  ): Promise<CapturedFrame[]> {
    const preset = getPresetFromType(type) as RenderPreset;
    const target = this.targetManager.getTarget(preset);
    const { width, height } = PRESET_RESOLUTIONS[preset];

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const frameCapture = new FrameCapture(this.renderer, target, {
      gammaCorrection: true,
    });

    const frames: CapturedFrame[] = [];
    const totalFrames = analysisResult.totalFrames;
    const frameDuration = 1 / fps;
    const analyzeWeight = STAGE_WEIGHTS.analyze;
    const renderWeight = STAGE_WEIGHTS.render;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Export aborted', 'AbortError');
      }

      const audioData = analysisResult.frames[frame];

      // Step the scene
      if (this.onStepFrame) {
        this.onStepFrame(frame, audioData, frameDuration);
      }

      // Render to target
      const originalTarget = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(originalTarget);

      // Capture frame
      const capturedFrame = await frameCapture.captureFrame(frame);
      frames.push(capturedFrame);

      // Report progress
      const frameProgress = (frame / totalFrames) * renderWeight;
      const totalProgress = analyzeWeight + frameProgress;
      this.reportProgress(onProgress, totalProgress, `Rendering frame ${frame + 1}/${totalFrames}`);

      // Yield to UI
      if (frame % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    frameCapture.dispose();
    return frames;
  }

  /**
   * Render 360 monoscopic frames
   */
  private async render360Mono(
    type: ExportType,
    fps: number,
    analysisResult: PreAnalysisResult,
    onProgress?: (percent: number, stage: string) => void,
    signal?: AbortSignal
  ): Promise<CapturedFrame[]> {
    const outputWidth = get360Width(type);
    const cubeResolution = EQUIRECT_TO_CUBE[outputWidth] as CubemapResolution || 1024;

    // Initialize 360 capture components
    if (!this.cubemapCapture) {
      this.cubemapCapture = new CubemapCapture(this.renderer, cubeResolution);
    } else {
      this.cubemapCapture.setResolution(cubeResolution);
    }

    if (!this.equirectConverter) {
      this.equirectConverter = new EquirectangularConverter(this.renderer);
    }

    const frames: CapturedFrame[] = [];
    const totalFrames = analysisResult.totalFrames;
    const frameDuration = 1 / fps;
    const analyzeWeight = STAGE_WEIGHTS.analyze;
    const renderWeight = STAGE_WEIGHTS.render;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Export aborted', 'AbortError');
      }

      const audioData = analysisResult.frames[frame];

      // Step the scene
      if (this.onStepFrame) {
        this.onStepFrame(frame, audioData, frameDuration);
      }

      // Capture cubemap
      const cubemap = this.cubemapCapture.captureFrame(this.scene);

      // Convert to equirectangular
      const equirectFrame = this.equirectConverter.convertSync(cubemap, outputWidth, frame);
      frames.push(equirectFrame);

      // Report progress
      const frameProgress = (frame / totalFrames) * renderWeight;
      const totalProgress = analyzeWeight + frameProgress;
      this.reportProgress(onProgress, totalProgress, `Rendering 360 frame ${frame + 1}/${totalFrames}`);

      // Yield to UI
      if (frame % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return frames;
  }

  /**
   * Render 360 stereoscopic frames
   */
  private async render360Stereo(
    type: ExportType,
    fps: number,
    analysisResult: PreAnalysisResult,
    onProgress?: (percent: number, stage: string) => void,
    signal?: AbortSignal
  ): Promise<CapturedFrame[]> {
    const outputWidth = get360Width(type);
    const cubeResolution = EQUIRECT_TO_CUBE[outputWidth] as CubemapResolution || 2048;

    // Initialize stereo capture components
    if (!this.equirectConverter) {
      this.equirectConverter = new EquirectangularConverter(this.renderer);
    }

    if (!this.stereoCapture) {
      this.stereoCapture = new StereoCapture(this.renderer, this.equirectConverter, {
        resolution: cubeResolution,
      });
    } else {
      this.stereoCapture.setResolution(cubeResolution);
    }

    if (!this.stereoStacker) {
      this.stereoStacker = new StereoStacker();
    }

    const frames: CapturedFrame[] = [];
    const totalFrames = analysisResult.totalFrames;
    const frameDuration = 1 / fps;
    const analyzeWeight = STAGE_WEIGHTS.analyze;
    const renderWeight = STAGE_WEIGHTS.render;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Export aborted', 'AbortError');
      }

      const audioData = analysisResult.frames[frame];

      // Step the scene
      if (this.onStepFrame) {
        this.onStepFrame(frame, audioData, frameDuration);
      }

      // Capture stereo pair
      const stereoPair = this.stereoCapture.captureStereoFrameSync(
        this.scene,
        outputWidth,
        frame
      );

      // Stack into top/bottom format
      const stackedFrame = this.stereoStacker.stackTopBottom(stereoPair);
      frames.push(stackedFrame);

      // Report progress
      const frameProgress = (frame / totalFrames) * renderWeight;
      const totalProgress = analyzeWeight + frameProgress;
      this.reportProgress(onProgress, totalProgress, `Rendering stereo frame ${frame + 1}/${totalFrames}`);

      // Yield to UI more frequently for stereo (heavier processing)
      if (frame % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return frames;
  }

  /**
   * Report progress with stage info
   */
  private reportProgress(
    callback: ((percent: number, stage: string) => void) | undefined,
    percent: number,
    stage: string
  ): void {
    callback?.(Math.min(100, Math.max(0, percent)), stage);
  }

  /**
   * Get pre-analysis result for preview
   */
  async preAnalyze(
    audioFile: File | ArrayBuffer,
    fps: 30 | 60
  ): Promise<PreAnalysisResult> {
    const audioBuffer = audioFile instanceof File
      ? await audioFile.arrayBuffer()
      : audioFile;

    return this.preAnalyzer.analyze(audioBuffer, { fps, useCache: true });
  }

  /**
   * Cancel ongoing operations
   */
  cancel(): void {
    this.preAnalyzer.cancel();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.targetManager.dispose();
    this.cubemapCapture?.dispose();
    this.equirectConverter?.dispose();
    this.stereoCapture?.dispose();
  }
}
