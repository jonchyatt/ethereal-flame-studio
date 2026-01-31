'use client';

import { useState } from 'react';
import { MicrophoneCapture } from '@/lib/jarvis/audio/MicrophoneCapture';

interface PermissionPromptProps {
  /** Called when permission is granted */
  onPermissionGranted: () => void;
  /** Current permission state from parent */
  permissionState: 'prompt' | 'denied';
}

/**
 * PermissionPrompt - Explanatory UI shown BEFORE browser microphone prompt
 *
 * Features:
 * - Clear explanation of WHY microphone is needed
 * - Privacy assurance (processed locally, not stored)
 * - Denial recovery instructions
 * - Refresh button for denied state
 */
export function PermissionPrompt({
  onPermissionGranted,
  permissionState,
}: PermissionPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showDeniedHelp, setShowDeniedHelp] = useState(
    permissionState === 'denied'
  );

  const handleEnableMicrophone = async () => {
    setIsRequesting(true);

    try {
      const mic = MicrophoneCapture.getInstance();
      const granted = await mic.requestPermission();

      if (granted) {
        onPermissionGranted();
      } else {
        setShowDeniedHelp(true);
      }
    } catch (error) {
      console.error('[PermissionPrompt] Error requesting permission:', error);
      setShowDeniedHelp(true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Show denial recovery instructions
  if (showDeniedHelp) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
        <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">
              Microphone Access Blocked
            </h2>
          </div>

          <p className="text-zinc-400 mb-4">
            You blocked microphone access. To use voice features, you will need to
            re-enable it in your browser settings.
          </p>

          <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              How to re-enable:
            </h3>
            <ol className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-cyan-400 font-medium">1.</span>
                Click the lock/info icon in your browser address bar
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-medium">2.</span>
                Find &ldquo;Microphone&rdquo; in the permissions list
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-medium">3.</span>
                Change it from &ldquo;Block&rdquo; to &ldquo;Allow&rdquo;
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-medium">4.</span>
                Refresh this page
              </li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => setShowDeniedHelp(false)}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show initial permission explanation
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-cyan-400"
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
          <h2 className="text-xl font-semibold text-white">
            Enable Microphone
          </h2>
        </div>

        <p className="text-zinc-400 mb-4">
          Jarvis needs microphone access to hear your voice. Press and hold the
          button to speak, and Jarvis will respond.
        </p>

        <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Your privacy matters:
          </h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Audio is processed when you hold the button
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              No audio is recorded or stored locally
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              You control when Jarvis listens
            </li>
          </ul>
        </div>

        <button
          onClick={handleEnableMicrophone}
          disabled={isRequesting}
          className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isRequesting ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Requesting...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
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
              Enable Microphone
            </>
          )}
        </button>
      </div>
    </div>
  );
}
