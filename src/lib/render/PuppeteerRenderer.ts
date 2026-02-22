/**
 * PuppeteerRenderer - Node.js Puppeteer driver for automated frame capture
 *
 * Launches headless Chrome, controls the app via RenderModeAPI, and captures
 * frame-by-frame for deterministic video rendering.
 *
 * Features:
 * - GPU-accelerated headless Chrome
 * - Frame-by-frame capture with injected audio data
 * - Checkpoint/resume support for long renders
 * - Progress callbacks and error recovery
 * - Memory management for long renders
 *
 * Phase: Puppeteer Frame Capture Implementation
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FrameAudioData, PreAnalysisResult } from '@/types';
import { RenderVisualConfig } from './visualConfig';

/**
 * Configuration for Puppeteer renderer
 */
export interface PuppeteerRenderConfig {
  /** App URL to load (default: http://localhost:3000) */
  appUrl?: string;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frames per second (default: 30) */
  fps?: number;
  /** Template to activate (e.g., 'flame', 'mist') */
  template?: string;
  /** Full visual configuration from exported config file */
  visualConfig?: RenderVisualConfig;
  /** Use headless mode (default: true) */
  headless?: boolean;
  /** Device scale factor for HiDPI (default: 1) */
  deviceScaleFactor?: number;
}

/**
 * Options for rendering a video
 */
export interface RenderOptions {
  /** Pre-analyzed audio data */
  audioAnalysis: PreAnalysisResult;
  /** Output directory for frames */
  outputDir: string;
  /** Image format: 'png' or 'jpeg' (default: 'png') */
  format?: 'png' | 'jpeg';
  /** JPEG quality 0-100 (default: 90) */
  quality?: number;
  /** Checkpoint interval in frames (default: 100) */
  checkpointInterval?: number;
  /** Starting frame for resume (default: 0) */
  startFrame?: number;
  /** Progress callback */
  onProgress?: (progress: RenderProgress) => void;
  /** Frame capture callback */
  onFrameCaptured?: (frame: number, total: number) => void;
}

/**
 * Progress information during rendering
 */
export interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  fps: number;
}

/**
 * Result of a render operation
 */
export interface RenderResult {
  success: boolean;
  framesRendered: number;
  totalFrames: number;
  outputDir: string;
  elapsedMs: number;
  averageFps: number;
  error?: string;
}

/**
 * Checkpoint data for resume capability
 */
interface Checkpoint {
  lastFrame: number;
  totalFrames: number;
  timestamp: number;
  config: PuppeteerRenderConfig;
}

export class PuppeteerRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: PuppeteerRenderConfig;
  private isRendering = false;
  private readonly ignored404Patterns: RegExp[] = [
    /\/favicon\.ico(?:$|\?)/i,
    /\.hot-update\.(json|js)(?:$|\?)/i,
    /\/__nextjs_original-stack-frame/i,
    /[?&]_rsc=/i,
  ];

  constructor(config: PuppeteerRenderConfig) {
    this.config = {
      appUrl: 'http://localhost:3000',
      fps: 30,
      headless: true,
      deviceScaleFactor: 1,
      ...config,
    };
  }

  /**
   * Launch browser and initialize
   */
  async launch(): Promise<void> {
    if (this.browser) {
      await this.close();
    }

    console.log('[PuppeteerRenderer] Launching Chrome...');

    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        // GPU acceleration - use real GPU via ANGLE (D3D11 on Windows, GL on Linux)
        '--use-gl=angle',
        '--enable-webgl',
        '--enable-webgl2',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--enable-accelerated-2d-canvas',

        // Window size
        `--window-size=${this.config.width},${this.config.height}`,

        // Disable features that interfere with rendering
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',

        // Security (needed for some environments)
        '--no-sandbox',
        '--disable-setuid-sandbox',

        // Disable unneeded features for performance
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-default-apps',
        '--mute-audio',
      ],
      defaultViewport: {
        width: this.config.width,
        height: this.config.height,
        deviceScaleFactor: this.config.deviceScaleFactor,
      },
    });

    this.page = await this.browser.newPage();

    // Disable animations/transitions and shim globals for consistent captures.
    // IMPORTANT: pass raw JS string (not a TS function) so transpilers don't
    // inject helpers like __name into the injected script itself.
    await this.page.evaluateOnNewDocument(`
      (() => {
        if (typeof globalThis.__name !== 'function') {
          Object.defineProperty(globalThis, '__name', {
            value: function(target) { return target; },
            configurable: true,
            writable: false
          });
        }

        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: function(query) {
            return {
              matches: String(query).includes('prefers-reduced-motion'),
              media: query,
              onchange: null,
              addListener: function() {},
              removeListener: function() {},
              addEventListener: function() {},
              removeEventListener: function() {},
              dispatchEvent: function() { return false; }
            };
          }
        });
      })();
    `);

    // Log console messages from the page
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Chromium emits URL-less "Failed to load resource" console noise.
        // HTTP status logging below prints the actionable URL instead.
        if (text.includes('Failed to load resource: the server responded with a status of 404')) {
          return;
        }
        console.error(`[Browser] ${text}`);
      }
    });

    // Handle page errors
    this.page.on('pageerror', (err: unknown) => {
      if (err instanceof Error) {
        const stack = err.stack ? `\n${err.stack}` : '';
        console.error(`[Browser] Page error: ${err.message}${stack}`);
        return;
      }
      console.error(`[Browser] Page error: ${String(err)}`);
    });

    // Log HTTP failures with URLs so 404s can be diagnosed/fixed quickly.
    this.page.on('response', (response) => {
      const status = response.status();
      if (status < 400) return;
      const url = response.url();

      if (status === 404 && this.ignored404Patterns.some((rx) => rx.test(url))) {
        return;
      }

      console.warn(`[Browser] HTTP ${status}: ${url}`);
    });

    this.page.on('requestfailed', (request) => {
      const failure = request.failure();
      const reason = failure?.errorText || 'unknown';
      const url = request.url();
      if (this.ignored404Patterns.some((rx) => rx.test(url))) {
        return;
      }
      console.warn(`[Browser] Request failed (${reason}): ${url}`);
    });

    console.log('[PuppeteerRenderer] Chrome launched successfully');
  }

  /**
   * Navigate to app and initialize render mode
   */
  async initRenderMode(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const waitForRenderModeApi = async (timeoutMs: number): Promise<boolean> => {
      if (!this.page) return false;
      try {
        await this.page.waitForFunction(
          () => !!(window as any).__renderMode,
          { timeout: timeoutMs }
        );
        return true;
      } catch {
        return false;
      }
    };

    console.log(`[PuppeteerRenderer] Navigating to ${this.config.appUrl}...`);

    // Navigate to app
    // Use networkidle2 instead of networkidle0 because dev mode keeps HMR WebSocket open
    await this.page.goto(this.config.appUrl!, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for app to be ready (Three.js canvas should exist)
    await this.page.waitForSelector('canvas', { timeout: 10000 });

    // Wait for RenderModeAPI to be attached to window.
    // On cold Next.js dev compiles, this can take longer than a fixed sleep.
    let hasRenderModeApi = await waitForRenderModeApi(20000);
    if (!hasRenderModeApi) {
      console.warn('[PuppeteerRenderer] RenderModeAPI not ready after initial load, retrying with one page reload...');
      await this.page.reload({
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
      await this.page.waitForSelector('canvas', { timeout: 10000 });
      hasRenderModeApi = await waitForRenderModeApi(20000);
    }

    if (!hasRenderModeApi) {
      throw new Error(
        'RenderModeAPI not found on window after retries. Ensure the app page loads without JS chunk errors before rendering.'
      );
    }

    // Initialize render mode
    console.log('[PuppeteerRenderer] Initializing render mode...');
    const initialized = await this.page.evaluate(
      (config) => {
        const renderMode = (window as any).__renderMode;
        if (!renderMode) {
          console.error('RenderModeAPI not found on window');
          return false;
        }
        return renderMode.init({
          fps: config.fps,
          width: config.width,
          height: config.height,
          template: config.template,
        });
      },
      {
        fps: this.config.fps,
        width: this.config.width,
        height: this.config.height,
        template: this.config.template,
      }
    );

    if (!initialized) {
      throw new Error('Failed to initialize render mode');
    }

    // Hide all UI elements — only the Three.js canvas should be visible.
    // page.tsx already hides most UI when renderMode.isActive, but this CSS
    // acts as a safety net to catch any stragglers (toasts, overlays, etc.)
    await this.page.addStyleTag({
      content: `
        /* Hide everything in the Next.js root, then re-show the R3F canvas container */
        body > div > * { visibility: hidden !important; }
        /* The R3F canvas container (first child div that holds the <Canvas>) */
        body > div > div:has(> canvas) {
          visibility: visible !important;
        }
        body > div > div:has(> canvas) * {
          visibility: visible !important;
        }
        /* Hide any remaining UI that React didn't catch */
        button, [role="dialog"], [role="alert"] {
          display: none !important;
        }
        /* Ensure canvas fills the entire viewport */
        canvas {
          display: block !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
        }
      `,
    });
    console.log('[PuppeteerRenderer] UI hidden for clean render');

    // Apply visual config if provided (from exported config file)
    if (this.config.visualConfig) {
      console.log('[PuppeteerRenderer] Applying visual config...');
      await this.page.evaluate(
        (config) => {
          const renderMode = (window as any).__renderMode;
          if (renderMode?.setVisualConfig) {
            renderMode.setVisualConfig(config);
          }
        },
        this.config.visualConfig
      );
      // Wait for React to process the visual config changes
      await this.page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
      console.log('[PuppeteerRenderer] Visual config applied');
    }

    console.log('[PuppeteerRenderer] Render mode initialized');
    return true;
  }

  /**
   * Render frames from pre-analyzed audio
   */
  async renderFrames(options: RenderOptions): Promise<RenderResult> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    if (this.isRendering) {
      throw new Error('Already rendering. Wait for current render to complete.');
    }

    this.isRendering = true;
    const startTime = Date.now();

    const {
      audioAnalysis,
      outputDir,
      format = 'png',
      quality = 90,
      checkpointInterval = 100,
      startFrame = 0,
      onProgress,
      onFrameCaptured,
    } = options;

    const totalFrames = audioAnalysis.totalFrames;
    let currentFrame = startFrame;
    let framesRendered = 0;

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Set total frames in render mode
      await this.page.evaluate((total) => {
        (window as any).__renderMode.setTotalFrames(total);
      }, totalFrames);

      console.log(
        `[PuppeteerRenderer] Starting render: ${totalFrames} frames, ${startFrame > 0 ? `resuming from frame ${startFrame}` : 'from beginning'}`
      );

      // Main frame loop
      for (let frame = startFrame; frame < totalFrames; frame++) {
        currentFrame = frame;
        const frameData = audioAnalysis.frames[frame];

        // Advance scene to this frame with audio data
        await this.page.evaluate(
          (frameNum, audio) => {
            return (window as any).__renderMode.setFrame(frameNum, audio);
          },
          frame,
          frameData
        );

        // Capture the frame
        const framePath = path.join(
          outputDir,
          `frame_${frame.toString().padStart(6, '0')}.${format}`
        );

        await this.page.screenshot({
          path: framePath,
          type: format,
          quality: format === 'jpeg' ? quality : undefined,
          omitBackground: false,
        });

        framesRendered++;
        onFrameCaptured?.(frame, totalFrames);

        // Report progress
        const elapsed = Date.now() - startTime;
        const avgFrameTime = elapsed / framesRendered;
        const remainingFrames = totalFrames - frame - 1;
        const estimatedRemaining = avgFrameTime * remainingFrames;

        onProgress?.({
          currentFrame: frame,
          totalFrames,
          percent: Math.round((frame / totalFrames) * 100),
          elapsedMs: elapsed,
          estimatedRemainingMs: estimatedRemaining,
          fps: framesRendered / (elapsed / 1000),
        });

        // Save checkpoint
        if (frame > 0 && frame % checkpointInterval === 0) {
          await this.saveCheckpoint(outputDir, {
            lastFrame: frame,
            totalFrames,
            timestamp: Date.now(),
            config: this.config,
          });
        }

        // Force garbage collection hint every 100 frames
        if (frame % 100 === 0) {
          await this.page.evaluate(() => {
            // Hint to V8 that we're done with old data
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }
      }

      const totalElapsed = Date.now() - startTime;

      // Remove checkpoint file on success
      await this.removeCheckpoint(outputDir);

      console.log(
        `[PuppeteerRenderer] Render complete: ${framesRendered} frames in ${(totalElapsed / 1000).toFixed(1)}s ` +
          `(${(framesRendered / (totalElapsed / 1000)).toFixed(1)} fps)`
      );

      return {
        success: true,
        framesRendered,
        totalFrames,
        outputDir,
        elapsedMs: totalElapsed,
        averageFps: framesRendered / (totalElapsed / 1000),
      };
    } catch (error) {
      const totalElapsed = Date.now() - startTime;

      // Save checkpoint for resume
      await this.saveCheckpoint(outputDir, {
        lastFrame: currentFrame,
        totalFrames,
        timestamp: Date.now(),
        config: this.config,
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[PuppeteerRenderer] Render failed at frame ${currentFrame}: ${errorMessage}`);

      return {
        success: false,
        framesRendered,
        totalFrames,
        outputDir,
        elapsedMs: totalElapsed,
        averageFps: framesRendered > 0 ? framesRendered / (totalElapsed / 1000) : 0,
        error: errorMessage,
      };
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Capture a single frame (for testing/preview)
   */
  async captureFrame(
    frameNumber: number,
    audioData: FrameAudioData,
    outputPath: string
  ): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Set frame
    await this.page.evaluate(
      (frame, audio) => {
        return (window as any).__renderMode.setFrame(frame, audio);
      },
      frameNumber,
      audioData
    );

    // Capture
    await this.page.screenshot({
      path: outputPath,
      type: outputPath.endsWith('.jpeg') || outputPath.endsWith('.jpg') ? 'jpeg' : 'png',
    });
  }

  /**
   * Get render status from browser
   */
  async getStatus(): Promise<{ state: string; currentFrame: number; totalFrames: number }> {
    if (!this.page) {
      return { state: 'not_launched', currentFrame: 0, totalFrames: 0 };
    }

    return this.page.evaluate(() => {
      const renderMode = (window as any).__renderMode;
      if (!renderMode) {
        return { state: 'no_api', currentFrame: 0, totalFrames: 0 };
      }
      return renderMode.getStatus();
    });
  }

  /**
   * Check if GPU acceleration is available
   */
  async checkGPU(): Promise<{ available: boolean; renderer: string }> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    return this.page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        return { available: false, renderer: 'none' };
      }
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return { available: true, renderer: 'unknown' };
      }
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const isSoftware =
        renderer.toLowerCase().includes('swiftshader') ||
        renderer.toLowerCase().includes('software');
      return { available: !isSoftware, renderer };
    });
  }

  /**
   * Save checkpoint for resume capability
   */
  private async saveCheckpoint(outputDir: string, checkpoint: Checkpoint): Promise<void> {
    const checkpointPath = path.join(outputDir, '.checkpoint.json');
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }

  /**
   * Load checkpoint for resume
   */
  async loadCheckpoint(outputDir: string): Promise<Checkpoint | null> {
    const checkpointPath = path.join(outputDir, '.checkpoint.json');
    try {
      const data = await fs.readFile(checkpointPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Remove checkpoint file
   */
  private async removeCheckpoint(outputDir: string): Promise<void> {
    const checkpointPath = path.join(outputDir, '.checkpoint.json');
    try {
      await fs.unlink(checkpointPath);
    } catch {
      // Ignore if doesn't exist
    }
  }

  /**
   * Cleanup render mode and reset
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.evaluate(() => {
        const renderMode = (window as any).__renderMode;
        if (renderMode) {
          renderMode.cleanup();
        }
      });
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.cleanup();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('[PuppeteerRenderer] Browser closed');
  }
}

/**
 * Create a PuppeteerRenderer with common defaults
 */
export function createRenderer(config: Partial<PuppeteerRenderConfig> = {}): PuppeteerRenderer {
  return new PuppeteerRenderer({
    width: 1920,
    height: 1080,
    fps: 30,
    ...config,
  });
}

/**
 * Quick render function for simple use cases
 */
export async function renderVideo(
  audioAnalysis: PreAnalysisResult,
  outputDir: string,
  config: Partial<PuppeteerRenderConfig> = {},
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderResult> {
  const renderer = createRenderer(config);

  try {
    await renderer.launch();
    await renderer.initRenderMode();

    // Check GPU availability
    const gpu = await renderer.checkGPU();
    if (!gpu.available) {
      console.warn(`[PuppeteerRenderer] Warning: GPU not available (${gpu.renderer}), using software rendering`);
    } else {
      console.log(`[PuppeteerRenderer] GPU detected: ${gpu.renderer}`);
    }

    // Check for existing checkpoint
    const checkpoint = await renderer.loadCheckpoint(outputDir);
    const startFrame = checkpoint?.lastFrame ? checkpoint.lastFrame + 1 : 0;

    if (startFrame > 0) {
      console.log(`[PuppeteerRenderer] Resuming from frame ${startFrame}`);
    }

    return await renderer.renderFrames({
      audioAnalysis,
      outputDir,
      startFrame,
      onProgress,
    });
  } finally {
    await renderer.close();
  }
}
