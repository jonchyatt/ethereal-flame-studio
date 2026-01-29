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
import { TemplateGallery } from './TemplateGallery';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { AdvancedEditor } from './AdvancedEditor';
import { ScreenshotCaptureRef } from './ScreenshotCapture';
import { useVisualStore } from '@/lib/stores/visualStore';

interface ControlPanelProps {
  screenshotRef?: React.RefObject<ScreenshotCaptureRef | null>;
}

export function ControlPanel({ screenshotRef }: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const setSkyboxRotationSpeed = useVisualStore((state) => state.setSkyboxRotationSpeed);
  // Water state
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const setWaterEnabled = useVisualStore((state) => state.setWaterEnabled);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);
  const setWaterReflectivity = useVisualStore((state) => state.setWaterReflectivity);
  const waterColor = useVisualStore((state) => state.waterColor);
  const setWaterColor = useVisualStore((state) => state.setWaterColor);

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
        <div className="bg-black/70 backdrop-blur-md border-t border-white/10 p-4 max-h-[70vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Templates Section - Collapsible */}
            <div className="mb-4 border-b border-white/10 pb-4">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="
                  flex items-center justify-between w-full
                  text-white/80 hover:text-white
                  text-sm font-medium
                  py-2
                "
              >
                <span>Templates</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTemplates && (
                <div className="mt-3">
                  <TemplateGallery onSaveNew={() => setShowSaveDialog(true)} />
                </div>
              )}
            </div>

            {/* Advanced Editor - Collapsible */}
            <div className="mb-4 border-b border-white/10 pb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="
                  flex items-center justify-between w-full
                  text-white/80 hover:text-white
                  text-sm font-medium
                  py-2
                "
              >
                <span>Advanced Editor</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="mt-3 max-h-[50vh] overflow-y-auto pr-2">
                  <AdvancedEditor />
                </div>
              )}
            </div>

            {/* Controls Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Left Column: Mode and Preset Selectors */}
              <div className="space-y-4">
                <ModeSelector />
                <PresetSelector />
              </div>

              {/* Right Column: Skybox Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Skybox Rotation Speed: {skyboxRotationSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={skyboxRotationSpeed}
                    onChange={(e) => setSkyboxRotationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>Stopped</span>
                    <span>Normal</span>
                    <span>Fast</span>
                  </div>
                </div>

                {/* Water Controls */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-white/80 text-sm font-medium">
                      Water Reflection
                    </label>
                    <button
                      onClick={() => setWaterEnabled(!waterEnabled)}
                      className={`
                        px-3 py-1 rounded text-sm min-h-[32px]
                        transition-all
                        ${waterEnabled
                          ? 'bg-blue-500/50 text-white border border-blue-400/50'
                          : 'bg-white/10 text-white/60 border border-white/10'
                        }
                      `}
                    >
                      {waterEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {waterEnabled && (
                    <div className="space-y-3">
                      {/* Reflectivity Slider */}
                      <div>
                        <label className="block text-white/60 text-xs mb-1">
                          Reflectivity: {waterReflectivity.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={waterReflectivity}
                          onChange={(e) => setWaterReflectivity(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Water Color Picker */}
                      <div className="flex items-center gap-3">
                        <label className="text-white/60 text-xs">Color:</label>
                        <input
                          type="color"
                          value={waterColor}
                          onChange={(e) => setWaterColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-white/20"
                        />
                        <span className="text-white/40 text-xs font-mono">{waterColor}</span>
                      </div>
                    </div>
                  )}
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
                {/* Placeholder - actual AudioControls rendered below */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AudioControls ALWAYS mounted - visibility controlled by CSS */}
      <div className={isExpanded && showDebug ? "" : "sr-only"}>
        <AudioControls />
      </div>

      {/* Save Template Dialog */}
      {screenshotRef && (
        <SaveTemplateDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          screenshotRef={screenshotRef}
        />
      )}
    </div>
  );
}
