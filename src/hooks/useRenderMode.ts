/**
 * useRenderMode - React hook for render mode integration
 *
 * Allows components to detect render mode and get frame-specific data.
 * When active, components should use fixed time steps and injected audio
 * instead of real-time values.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  subscribeToRenderMode,
  getRenderModeState,
  RenderModeState,
  isRenderModeActive,
  getCurrentAudioData,
  getCurrentElapsedTime,
  setCapturedImage,
} from '@/lib/render/RenderModeAPI';
import { FrameAudioData } from '@/types';

/**
 * Hook to subscribe to render mode state
 */
export function useRenderMode() {
  const [state, setState] = useState<RenderModeState>(getRenderModeState);

  useEffect(() => {
    return subscribeToRenderMode(setState);
  }, []);

  return useMemo(
    () => ({
      isActive: state.active,
      currentFrame: state.currentFrame,
      totalFrames: state.totalFrames,
      elapsedTime: state.elapsedTime,
      audioData: state.audioData,
      fps: state.config?.fps || 30,
      captureRequested: state.captureRequested,
      status: state.status,
    }),
    [state]
  );
}

/**
 * Hook for components that need audio data
 * Returns either render mode audio or null (component should use real-time)
 */
export function useRenderModeAudio(): FrameAudioData | null {
  const { isActive, audioData } = useRenderMode();

  if (!isActive) {
    return null; // Use real-time audio
  }

  return audioData;
}

/**
 * Hook for components that need elapsed time
 * Returns either render mode time or null (component should use real clock)
 */
export function useRenderModeTime(): number | null {
  const { isActive, elapsedTime } = useRenderMode();

  if (!isActive) {
    return null; // Use real time
  }

  return elapsedTime;
}

/**
 * Hook for ScreenshotCapture to know when to capture
 */
export function useRenderModeCapture() {
  const { isActive, captureRequested } = useRenderMode();

  return {
    shouldCapture: isActive && captureRequested,
    onCaptured: setCapturedImage,
  };
}

// Re-export for convenience
export { isRenderModeActive, getCurrentAudioData, getCurrentElapsedTime };
