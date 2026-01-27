/**
 * FlatExporter - Orchestrates flat video export (1080p/4K)
 *
 * Coordinates pre-analysis, scene stepping, frame capture,
 * and hands off to FFmpeg for final encoding.
 *
 * Phase 3, Plan 03-03
 */

import * as THREE from 'three';
import { PreAnalyzer } from '@/lib/audio/PreAnalyzer';
import { FrameCapture, CapturedFrame, frameToPNG } from './FrameCapture';
import { RenderTargetManager, RenderPreset } from './RenderTarget';
import { SceneStepper } from './SceneStepper';
import { PreAnalysisResult, FrameAudioData } from '@/types/index';

/**
 * Export configuration for flat video
 */
export interface FlatExportConfig {
  preset: '1080p-landscape' | '1080p-portrait' | '4k-landscape' | '4k-portrait';
  fps: 30 | 60;
  audioFile: File | ArrayBuffer;
  onProgress?: (percent: number, stage: string) => void;
  signal?: AbortSignal;  // For cancellation
}

/**
 * Export result with output path and metadata
 */
export interface FlatExportResult {
  success: boolean;
  frames: CapturedFrame[];  // For now, return frames; FFmpeg encoding in 03-06
  duration: number;
  error?: string;
}

/**
 * Stage weights for progress calculation
 */
const STAGE_WEIGHTS = {
  analyze: 0.10,   // 10%
  render: 0.80,    // 80%
  finalize: 0.10,  // 10%
};

export class FlatExporter {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private targetManager: RenderTargetManager;
  private preAnalyzer: PreAnalyzer;

  // Callbacks for updating visual state during export
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
   * This should update particle positions, skybox, etc.
   */
  setFrameStepCallback(callback: (frame: number, audioData: FrameAudioData, deltaTime: number) => void): void {
    this.onStepFrame = callback;
  }

  /**
   * Export flat video
   */
  async export(config: FlatExportConfig): Promise<FlatExportResult> {
    const { preset, fps, audioFile, onProgress, signal } = config;
    const startTime = performance.now();

    try {
      // Check for abort
      if (signal?.aborted) {
        throw new DOMException('Export aborted', 'AbortError');
      }

      // Stage 1: Pre-analyze audio
      onProgress?.(0, 'Analyzing audio...');

      const audioBuffer = audioFile instanceof File
        ? await audioFile.arrayBuffer()
        : audioFile;

      const analysisResult = await this.preAnalyzer.analyze(audioBuffer, {
        fps,
        onProgress: (percent) => {
          const stageProgress = percent * STAGE_WEIGHTS.analyze;
          onProgress?.(stageProgress, 'Analyzing audio...');
        },
        signal,
        useCache: true,
      });

      // Stage 2: Set up render target
      const target = this.targetManager.getTarget(preset);
      const { width, height } = this.targetManager.getResolution(preset);

      // Update camera aspect ratio to match export resolution
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      // Stage 3: Render frames
      const frameCapture = new FrameCapture(this.renderer, target, {
        gammaCorrection: true,
      });

      const stepper = new SceneStepper(fps);
      const capturedFrames: CapturedFrame[] = [];
      const totalFrames = analysisResult.totalFrames;
      const frameDuration = 1 / fps;

      onProgress?.(STAGE_WEIGHTS.analyze * 100, 'Rendering frames...');

      for (let frame = 0; frame < totalFrames; frame++) {
        // Check for abort
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
        capturedFrames.push(capturedFrame);

        // Report progress
        const renderProgress = (frame / totalFrames) * STAGE_WEIGHTS.render;
        const totalProgress = STAGE_WEIGHTS.analyze + renderProgress;
        onProgress?.(totalProgress * 100, `Rendering frame ${frame + 1}/${totalFrames}`);

        // Yield to UI periodically (every 10 frames)
        if (frame % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Stage 4: Finalize
      onProgress?.((STAGE_WEIGHTS.analyze + STAGE_WEIGHTS.render) * 100, 'Finalizing...');

      // Cleanup
      frameCapture.dispose();

      const duration = (performance.now() - startTime) / 1000;

      onProgress?.(100, 'Complete');

      return {
        success: true,
        frames: capturedFrames,
        duration,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        frames: [],
        duration: (performance.now() - startTime) / 1000,
        error: errorMessage,
      };
    }
  }

  /**
   * Export frames as a ZIP file (browser-side, before FFmpeg integration)
   */
  async exportAsZip(config: FlatExportConfig): Promise<Blob | null> {
    const result = await this.export(config);

    if (!result.success || result.frames.length === 0) {
      return null;
    }

    // For now, we'll create individual PNGs
    // In 03-06, this will be replaced with FFmpeg encoding
    const pngBlobs: { name: string; blob: Blob }[] = [];

    for (const frame of result.frames) {
      const blob = await frameToPNG(frame);
      const name = `frame_${String(frame.frameNumber).padStart(5, '0')}.png`;
      pngBlobs.push({ name, blob });
    }

    // Simple concatenation as placeholder
    // Real ZIP creation would use JSZip or similar
    // For now, return first frame as indicator of success
    return pngBlobs[0]?.blob || null;
  }

  /**
   * Get analysis result for an audio file (for preview)
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
   * Cancel ongoing pre-analysis
   */
  cancelAnalysis(): void {
    this.preAnalyzer.cancel();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.targetManager.dispose();
  }
}
