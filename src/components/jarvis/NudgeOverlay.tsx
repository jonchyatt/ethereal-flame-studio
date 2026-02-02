'use client';

/**
 * NudgeOverlay - Visual nudge indicator
 *
 * Displays a subtle overlay when a nudge is active.
 * Per CONTEXT.md: NOT a blocking modal - just a visual indicator.
 *
 * User can:
 * - Tap overlay to dismiss
 * - Tap orb to engage with voice
 * - Voice "okay" / "got it" to dismiss
 */

import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';
import { getNudgeManager } from '@/lib/jarvis/executive/NudgeManager';

interface NudgeOverlayProps {
  /** Called when user wants to engage with the nudge (tap orb) */
  onEngage?: () => void;
}

export function NudgeOverlay({ onEngage }: NudgeOverlayProps) {
  const activeNudge = useJarvisStore((s) => s.activeNudge);
  const acknowledgeNudge = useJarvisStore((s) => s.acknowledgeNudge);

  if (!activeNudge) return null;

  // Handle overlay tap - dismiss the nudge
  const handleOverlayClick = () => {
    getNudgeManager().acknowledgeNudge(activeNudge.id);
    acknowledgeNudge();
  };

  // Get icon based on nudge type
  const getTypeIcon = () => {
    switch (activeNudge.type) {
      case 'calendar':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case 'deadline':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'bill':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'business':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2
                 bg-black/70 backdrop-blur-md rounded-xl
                 px-4 py-3 border border-white/20
                 animate-fade-in-up pointer-events-auto z-30
                 max-w-sm mx-4 cursor-pointer
                 hover:bg-black/80 transition-colors"
      onClick={handleOverlayClick}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {/* Pulse indicator */}
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />

        {/* Type icon */}
        <span className="text-amber-400 flex-shrink-0">{getTypeIcon()}</span>

        {/* Message */}
        <p className="text-white/90 text-sm flex-1">{activeNudge.message}</p>
      </div>

      {/* Hint text */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
        <span className="text-white/40 text-xs">Tap to dismiss</span>
        <span className="text-white/40 text-xs">Tap orb to respond</span>
      </div>
    </div>
  );
}

export default NudgeOverlay;
