'use client';

import { useCallback, useEffect, useRef } from 'react';
import { MicrophoneCapture } from '@/lib/jarvis/audio/MicrophoneCapture';
import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';

/**
 * PushToTalk - Hold-to-speak button with visual feedback
 *
 * Features:
 * - Press-and-hold interaction (mouse, touch, keyboard)
 * - Visual feedback (glow, scale) responding to audio level
 * - Spacebar support for desktop users
 * - Touch-action: none to prevent scroll on mobile
 * - Clean release handling (mouse leave, touch end)
 * - Optional external callbacks for voice pipeline integration
 */

export interface PushToTalkProps {
  /** Called when PTT starts (press/hold) */
  onPTTStart?: () => void;
  /** Called when PTT ends (release) */
  onPTTEnd?: () => void;
  /** Use external pipeline control (skips direct MicrophoneCapture calls) */
  usePipeline?: boolean;
  /** Hide the visual button (keep only spacebar support) */
  hideVisual?: boolean;
}

export function PushToTalk({ onPTTStart, onPTTEnd, usePipeline = false, hideVisual = false }: PushToTalkProps = {}) {
  const isCapturing = useJarvisStore((s) => s.isCapturing);
  const audioLevel = useJarvisStore((s) => s.audioLevel);
  const orbState = useJarvisStore((s) => s.orbState);
  const stateColors = useJarvisStore((s) => s.stateColors);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isHoldingRef = useRef(false);

  // Get current state color for visual feedback
  const currentColor = stateColors[orbState];
  const colorStyle = `rgb(${Math.round(currentColor[0] * 255)}, ${Math.round(currentColor[1] * 255)}, ${Math.round(currentColor[2] * 255)})`;

  // Start capturing audio
  const startCapture = useCallback(() => {
    if (isHoldingRef.current) return;
    isHoldingRef.current = true;

    // Call external callback if provided
    if (onPTTStart) {
      onPTTStart();
    }

    // If using external pipeline control, don't call MicrophoneCapture directly
    if (usePipeline) return;

    const mic = MicrophoneCapture.getInstance();
    if (mic.hasPermission()) {
      mic.start();
    }
  }, [onPTTStart, usePipeline]);

  // Stop capturing audio
  const stopCapture = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;

    // Call external callback if provided
    if (onPTTEnd) {
      onPTTEnd();
    }

    // If using external pipeline control, don't call MicrophoneCapture directly
    if (usePipeline) return;

    const mic = MicrophoneCapture.getInstance();
    mic.stop();
  }, [onPTTEnd, usePipeline]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startCapture();
    },
    [startCapture]
  );

  const handleMouseUp = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  const handleMouseLeave = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent double-tap zoom and scroll
      startCapture();
    },
    [startCapture]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      stopCapture();
    },
    [stopCapture]
  );

  const handleTouchCancel = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  // Keyboard support (spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on spacebar when not in an input field
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName
        )
      ) {
        e.preventDefault();
        startCapture();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startCapture, stopCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isHoldingRef.current) {
        // If using pipeline, let external handler cleanup
        if (usePipeline) {
          onPTTEnd?.();
        } else {
          const mic = MicrophoneCapture.getInstance();
          mic.stop();
        }
      }
    };
  }, [usePipeline, onPTTEnd]);

  // Calculate visual feedback based on audio level
  const scale = isCapturing ? 1 + audioLevel * 0.15 : 1;
  const glowIntensity = isCapturing ? 20 + audioLevel * 30 : 0;
  const pulseOpacity = isCapturing ? 0.3 + audioLevel * 0.4 : 0;

  // If hideVisual is true, only render minimal status text (spacebar handlers still work via useEffect)
  if (hideVisual) {
    return (
      <p className="text-sm text-zinc-400">
        {isCapturing ? (
          <span className="text-cyan-400">Listening...</span>
        ) : (
          <span>Hold to speak or press Space</span>
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Push-to-talk button */}
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="relative w-20 h-20 rounded-full transition-all duration-100 select-none"
        style={{
          transform: `scale(${scale})`,
          touchAction: 'none', // Prevent scroll on mobile
        }}
        aria-label={isCapturing ? 'Release to stop' : 'Hold to speak'}
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-100"
          style={{
            boxShadow: isCapturing
              ? `0 0 ${glowIntensity}px ${glowIntensity / 2}px ${colorStyle}`
              : 'none',
          }}
        />

        {/* Pulse ring animation */}
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: colorStyle,
            opacity: pulseOpacity,
            animationDuration: '1.5s',
          }}
        />

        {/* Button background */}
        <div
          className="absolute inset-0 rounded-full border-2 transition-all duration-200"
          style={{
            backgroundColor: isCapturing
              ? `rgba(${Math.round(currentColor[0] * 255)}, ${Math.round(currentColor[1] * 255)}, ${Math.round(currentColor[2] * 255)}, 0.2)`
              : 'rgba(39, 39, 42, 0.8)',
            borderColor: isCapturing ? colorStyle : 'rgb(63, 63, 70)',
          }}
        />

        {/* Microphone icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 transition-colors duration-200"
            style={{
              color: isCapturing ? colorStyle : 'rgb(161, 161, 170)',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>

        {/* Audio level indicator bar */}
        {isCapturing && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${audioLevel * 100}%`,
                backgroundColor: colorStyle,
              }}
            />
          </div>
        )}
      </button>

      {/* Status text */}
      <p className="text-sm text-zinc-400">
        {isCapturing ? (
          <span className="text-cyan-400">Listening...</span>
        ) : (
          <span>Hold to speak or press Space</span>
        )}
      </p>
    </div>
  );
}
