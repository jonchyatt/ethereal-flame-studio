/**
 * RenderModeAPI - Browser-side API for headless rendering control
 *
 * Exposes window.__renderMode for Puppeteer to control frame-by-frame rendering.
 * When active, the scene uses fixed time steps and injected audio data
 * instead of real-time updates.
 *
 * Phase: Puppeteer Frame Capture Implementation
 */

import { FrameAudioData } from '@/types';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

// Types for the render mode API
export interface RenderConfig {
  fps: number;
  width: number;
  height: number;
  template?: string;
  exportType?: string;
}

export interface RenderStatus {
  state: 'idle' | 'initializing' | 'ready' | 'rendering' | 'capturing' | 'error';
  currentFrame: number;
  totalFrames: number;
  error?: string;
}

export interface RenderModeState {
  active: boolean;
  config: RenderConfig | null;
  currentFrame: number;
  totalFrames: number;
  elapsedTime: number;
  audioData: FrameAudioData | null;
  captureRequested: boolean;
  capturedImage: string | null;
  status: RenderStatus;
}

// Global state - accessible from components via hook
let renderModeState: RenderModeState = {
  active: false,
  config: null,
  currentFrame: 0,
  totalFrames: 0,
  elapsedTime: 0,
  audioData: null,
  captureRequested: false,
  capturedImage: null,
  status: {
    state: 'idle',
    currentFrame: 0,
    totalFrames: 0,
  },
};

// Listeners for state changes
type StateListener = (state: RenderModeState) => void;
const listeners: Set<StateListener> = new Set();

function notifyListeners() {
  // Spread to create a new object reference so React's useState detects the change
  // (React uses Object.is() which compares references — same ref = skip re-render)
  const snapshot = { ...renderModeState };
  listeners.forEach((listener) => listener(snapshot));
}

/**
 * Subscribe to render mode state changes
 */
export function subscribeToRenderMode(listener: StateListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener(renderModeState);
  return () => listeners.delete(listener);
}

/**
 * Get current render mode state (for non-reactive access)
 */
export function getRenderModeState(): RenderModeState {
  return renderModeState;
}

/**
 * Check if render mode is active
 */
export function isRenderModeActive(): boolean {
  return renderModeState.active;
}

/**
 * Get current frame's audio data (for components)
 */
export function getCurrentAudioData(): FrameAudioData | null {
  return renderModeState.audioData;
}

/**
 * Get current elapsed time (for components)
 */
export function getCurrentElapsedTime(): number {
  return renderModeState.elapsedTime;
}

/**
 * Set captured image data (called by ScreenshotCapture component)
 */
export function setCapturedImage(base64: string) {
  renderModeState.capturedImage = base64;
  renderModeState.captureRequested = false;
  renderModeState.status.state = 'ready';
  notifyListeners();
}

// ============================================================================
// Window API - Exposed to Puppeteer
// ============================================================================

/**
 * Visual config shape passed from CLI/Puppeteer to apply user's exported settings
 */
interface VisualConfigPayload {
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
}

interface WindowRenderModeAPI {
  init: (config: RenderConfig) => Promise<boolean>;
  setVisualConfig: (config: VisualConfigPayload) => void;
  setTotalFrames: (frames: number) => void;
  setFrame: (frameNumber: number, audioData: FrameAudioData) => Promise<void>;
  captureFrame: () => Promise<string>;
  getStatus: () => RenderStatus;
  cleanup: () => void;
}

const renderModeAPI: WindowRenderModeAPI = {
  /**
   * Initialize render mode
   */
  async init(config: RenderConfig): Promise<boolean> {
    console.log('[RenderMode] Initializing with config:', config);

    renderModeState = {
      active: true,
      config,
      currentFrame: 0,
      totalFrames: 0,
      elapsedTime: 0,
      audioData: null,
      captureRequested: false,
      capturedImage: null,
      status: {
        state: 'initializing',
        currentFrame: 0,
        totalFrames: 0,
      },
    };

    notifyListeners();

    // Wait for React to re-render with render mode active
    await new Promise((resolve) => setTimeout(resolve, 100));

    renderModeState.status.state = 'ready';
    notifyListeners();

    console.log('[RenderMode] Initialized and ready');
    return true;
  },

  /**
   * Apply visual configuration from exported render config.
   * Maps CLI config format to visualStore state.
   */
  setVisualConfig(config: VisualConfigPayload) {
    console.log('[RenderMode] Applying visual config:', config);
    const store = useVisualStore;

    // Build settings object for applyTemplateSettings
    const settings: Record<string, unknown> = {};

    if (config.intensity !== undefined) settings.intensity = config.intensity;
    if (config.skyboxRotationSpeed !== undefined) settings.skyboxRotationSpeed = config.skyboxRotationSpeed;
    if (config.skyboxAudioReactiveEnabled !== undefined) settings.skyboxAudioReactiveEnabled = config.skyboxAudioReactiveEnabled;
    if (config.skyboxAudioReactivity !== undefined) settings.skyboxAudioReactivity = config.skyboxAudioReactivity;
    if (config.skyboxDriftSpeed !== undefined) settings.skyboxDriftSpeed = config.skyboxDriftSpeed;
    if (config.waterEnabled !== undefined) settings.waterEnabled = config.waterEnabled;
    if (config.waterColor !== undefined) settings.waterColor = config.waterColor;
    if (config.waterReflectivity !== undefined) settings.waterReflectivity = config.waterReflectivity;
    if (config.layers) settings.layers = config.layers;

    // Camera orbit
    if (config.cameraOrbitEnabled !== undefined) settings.cameraOrbitEnabled = config.cameraOrbitEnabled;
    if (config.cameraOrbitRenderOnly !== undefined) settings.cameraOrbitRenderOnly = config.cameraOrbitRenderOnly;
    if (config.cameraOrbitSpeed !== undefined) settings.cameraOrbitSpeed = config.cameraOrbitSpeed;
    if (config.cameraOrbitRadius !== undefined) settings.cameraOrbitRadius = config.cameraOrbitRadius;
    if (config.cameraOrbitHeight !== undefined) settings.cameraOrbitHeight = config.cameraOrbitHeight;
    if (config.cameraLookAtOrb !== undefined) settings.cameraLookAtOrb = config.cameraLookAtOrb;

    // Orb placement
    if (config.orbAnchorMode !== undefined) settings.orbAnchorMode = config.orbAnchorMode;
    if (config.orbDistance !== undefined) settings.orbDistance = config.orbDistance;
    if (config.orbHeight !== undefined) settings.orbHeight = config.orbHeight;
    if (config.orbSideOffset !== undefined) settings.orbSideOffset = config.orbSideOffset;
    if (config.orbWorldX !== undefined) settings.orbWorldX = config.orbWorldX;
    if (config.orbWorldY !== undefined) settings.orbWorldY = config.orbWorldY;
    if (config.orbWorldZ !== undefined) settings.orbWorldZ = config.orbWorldZ;

    // Resolve skybox preset by key
    if (config.skyboxPreset) {
      const preset = STAR_NEST_PRESETS.find((p) => p.key === config.skyboxPreset);
      if (preset) {
        settings.skyboxPreset = preset;
      }
    }

    // Set the mode (without replacing layers, since we set them explicitly)
    if (config.mode) {
      const mode = config.mode === 'flame' ? 'etherealFlame' : 'etherealMist';
      store.setState({ currentMode: mode } as any);
    }

    // Apply all visual settings
    store.getState().applyTemplateSettings(settings as any);
    console.log('[RenderMode] Visual config applied');
  },

  /**
   * Set total frame count (for progress tracking)
   */
  setTotalFrames(frames: number) {
    renderModeState.totalFrames = frames;
    renderModeState.status.totalFrames = frames;
    notifyListeners();
  },

  /**
   * Advance scene to specific frame with audio data
   */
  async setFrame(frameNumber: number, audioData: FrameAudioData): Promise<void> {
    if (!renderModeState.active) {
      throw new Error('Render mode not active');
    }

    const fps = renderModeState.config?.fps || 30;
    const elapsedTime = frameNumber / fps;

    renderModeState.currentFrame = frameNumber;
    renderModeState.elapsedTime = elapsedTime;
    renderModeState.audioData = audioData;
    renderModeState.status.state = 'rendering';
    renderModeState.status.currentFrame = frameNumber;

    // Bridge audio data into audioStore so ALL visual components
    // (ParticleSystem, StarNestSkybox, etc.) see the injected levels
    useAudioStore.getState().setLevels({
      amplitude: audioData.amplitude,
      bass: audioData.bass,
      mid: audioData.mid,
      high: audioData.high,
      isBeat: audioData.isBeat,
      currentScale: 1.0 + audioData.amplitude * 0.5,
    });

    notifyListeners();

    // Wait for React to process the new frame
    // Use requestAnimationFrame to ensure render completes
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    renderModeState.status.state = 'ready';
    notifyListeners();
  },

  /**
   * Capture current frame as base64 PNG
   */
  async captureFrame(): Promise<string> {
    if (!renderModeState.active) {
      throw new Error('Render mode not active');
    }

    renderModeState.captureRequested = true;
    renderModeState.capturedImage = null;
    renderModeState.status.state = 'capturing';
    notifyListeners();

    // Wait for capture to complete (set by ScreenshotCapture component)
    const timeout = 5000;
    const start = Date.now();

    while (!renderModeState.capturedImage) {
      if (Date.now() - start > timeout) {
        renderModeState.status.state = 'error';
        renderModeState.status.error = 'Capture timeout';
        throw new Error('Frame capture timeout');
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const image = renderModeState.capturedImage;
    renderModeState.capturedImage = null;
    renderModeState.status.state = 'ready';

    return image;
  },

  /**
   * Get current render status
   */
  getStatus(): RenderStatus {
    return { ...renderModeState.status };
  },

  /**
   * Exit render mode and cleanup
   */
  cleanup() {
    console.log('[RenderMode] Cleaning up');

    renderModeState = {
      active: false,
      config: null,
      currentFrame: 0,
      totalFrames: 0,
      elapsedTime: 0,
      audioData: null,
      captureRequested: false,
      capturedImage: null,
      status: {
        state: 'idle',
        currentFrame: 0,
        totalFrames: 0,
      },
    };

    notifyListeners();
  },
};

// Expose to window for Puppeteer access
if (typeof window !== 'undefined') {
  (window as unknown as { __renderMode: WindowRenderModeAPI }).__renderMode = renderModeAPI;
}

export default renderModeAPI;
