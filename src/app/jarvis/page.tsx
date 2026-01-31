'use client';

import { useEffect, useState, useCallback } from 'react';
import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';
import { MicrophoneCapture } from '@/lib/jarvis/audio/MicrophoneCapture';
import { PermissionPrompt } from '@/components/jarvis/PermissionPrompt';
import { PushToTalk } from '@/components/jarvis/PushToTalk';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const JarvisOrb = dynamic(
  () => import('@/components/jarvis/JarvisOrb').then((mod) => mod.JarvisOrb),
  { ssr: false }
);

type PermissionUIState = 'loading' | 'prompt' | 'denied' | 'ready';

export default function JarvisPage() {
  const isAudioPermissionGranted = useJarvisStore((s) => s.isAudioPermissionGranted);
  const audioLevel = useJarvisStore((s) => s.audioLevel);
  const orbState = useJarvisStore((s) => s.orbState);
  const isCapturing = useJarvisStore((s) => s.isCapturing);

  const [permissionUIState, setPermissionUIState] = useState<PermissionUIState>('loading');
  const [showDebug, setShowDebug] = useState(false);

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      // Skip permission check on server side
      if (typeof window === 'undefined') return;

      // Check if browser supports audio capture
      if (!MicrophoneCapture.isSupported()) {
        console.warn('[JarvisPage] Audio capture not supported in this browser');
        setPermissionUIState('denied');
        return;
      }

      // Check existing permission state
      const state = await MicrophoneCapture.checkPermission();
      console.log('[JarvisPage] Initial permission state:', state);

      if (state === 'granted') {
        // Initialize capture (don't start yet, wait for button press)
        const mic = MicrophoneCapture.getInstance();
        const granted = await mic.requestPermission();
        if (granted) {
          setPermissionUIState('ready');
        } else {
          setPermissionUIState('prompt');
        }
      } else if (state === 'denied') {
        setPermissionUIState('denied');
      } else {
        setPermissionUIState('prompt');
      }
    };

    checkPermission();

    // Cleanup on unmount
    return () => {
      const mic = MicrophoneCapture.getInstance();
      mic.cleanup();
    };
  }, []);

  // Handle permission granted from PermissionPrompt
  const handlePermissionGranted = useCallback(() => {
    setPermissionUIState('ready');
  }, []);

  // Toggle debug overlay
  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  return (
    <main className="relative flex flex-col h-full w-full bg-black overflow-hidden">
      {/* Orb visualization - always visible, dimmed behind permission prompt */}
      <div
        className={`flex-1 w-full transition-opacity duration-300 ${
          permissionUIState !== 'ready' ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <JarvisOrb />
      </div>

      {/* Permission prompt overlay */}
      {(permissionUIState === 'prompt' || permissionUIState === 'denied') && (
        <PermissionPrompt
          onPermissionGranted={handlePermissionGranted}
          permissionState={permissionUIState}
        />
      )}

      {/* Loading state */}
      {permissionUIState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white/50 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Initializing...
          </div>
        </div>
      )}

      {/* Push-to-talk controls - only shown when permission granted */}
      {permissionUIState === 'ready' && (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center">
          <PushToTalk />

          {/* Debug toggle button */}
          <button
            onClick={toggleDebug}
            className="mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
      )}

      {/* Debug overlay */}
      {showDebug && permissionUIState === 'ready' && (
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white/70 space-y-1 z-40">
          <p>
            State: <span className="text-white">{orbState}</span>
          </p>
          <p>
            Capturing: <span className="text-white">{isCapturing ? 'Yes' : 'No'}</span>
          </p>
          <p>
            Audio Level:{' '}
            <span className="text-white">{(audioLevel * 100).toFixed(0)}%</span>
          </p>
          <p>
            Permission:{' '}
            <span className="text-white">
              {isAudioPermissionGranted ? 'Granted' : 'Not Granted'}
            </span>
          </p>
          <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-cyan-500 transition-all duration-75"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
