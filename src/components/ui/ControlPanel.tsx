'use client';

/**
 * ControlPanel - Main control panel container for mobile-friendly UI
 *
 * Features:
 * - Collapsible panel to maximize visual area
 * - Semi-transparent background (bg-black/70 backdrop-blur-md)
 * - Fixed position at bottom of screen
 * - Composes ModeSelector, PresetSelector, AudioControls
 * - Debug overlay toggle for development
 * - Responsive layout (stacks on narrow screens)
 */

import { useState } from 'react';
import { ModeSelector } from './ModeSelector';
import { PresetSelector } from './PresetSelector';
import { AudioControls } from './AudioControls';

export function ControlPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDebug, setShowDebug] = useState(true);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Collapse/Expand Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            px-6 py-2
            bg-black/70 backdrop-blur-md
            border border-white/10 border-b-0
            rounded-t-lg
            text-white/80 hover:text-white
            transition-all
            min-h-[44px]
          "
        >
          {isExpanded ? '▼ Hide Controls' : '▲ Show Controls'}
        </button>
      </div>

      {/* Main Control Panel */}
      {isExpanded && (
        <div className="bg-black/70 backdrop-blur-md border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Controls Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Left Column: Mode and Preset Selectors */}
              <div className="space-y-4">
                <ModeSelector />
                <PresetSelector />
              </div>

              {/* Right Column: Placeholder for future controls */}
              <div className="flex items-center justify-center">
                <div className="text-white/50 text-sm text-center">
                  <p>Additional controls will appear here</p>
                  <p className="text-xs mt-1">(Audio integration in plan 01-08)</p>
                </div>
              </div>
            </div>

            {/* Debug Toggle */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="
                  px-3 py-1 text-xs
                  bg-white/5 hover:bg-white/10
                  border border-white/10
                  rounded
                  text-white/60 hover:text-white/80
                  transition-all
                "
              >
                {showDebug ? 'Hide' : 'Show'} Debug Overlay
              </button>
            </div>

            {/* Audio Controls with Debug Overlay */}
            {showDebug && (
              <div className="mt-4">
                <AudioControls />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
