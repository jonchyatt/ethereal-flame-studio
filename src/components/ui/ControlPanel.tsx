'use client';

/**
 * ControlPanel - Docked side panels for controls and templates
 *
 * Features:
 * - Left panel: Templates + Advanced Editor
 * - Right panel: Core controls + audio/render
 * - Independent hide/show tabs per side
 * - Semi-transparent background (bg-black/70 backdrop-blur-md)
 * - Panels stay mounted to preserve audio state
 */

import { useState } from 'react';
import { ModeSelector } from './ModeSelector';
import { PresetSelector } from './PresetSelector';
import { AudioControls } from './AudioControls';
import { TemplateGallery } from './TemplateGallery';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { AdvancedEditor } from './AdvancedEditor';
import { RenderDialog } from './RenderDialog';
import { ScreenshotCaptureRef } from './ScreenshotCapture';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';

interface ControlPanelProps {
  screenshotRef?: React.RefObject<ScreenshotCaptureRef | null>;
  onEnterVRMode?: () => void;
}

export function ControlPanel({ screenshotRef, onEnterVRMode }: ControlPanelProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRenderDialog, setShowRenderDialog] = useState(false);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const setSkyboxRotationSpeed = useVisualStore((state) => state.setSkyboxRotationSpeed);
  const audioFile = useAudioStore((state) => state.audioFile);
  const audioUrl = useAudioStore((state) => state.audioUrl);
  const currentMode = useVisualStore((state) => state.currentMode);
  // Water state
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const setWaterEnabled = useVisualStore((state) => state.setWaterEnabled);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);
  const setWaterReflectivity = useVisualStore((state) => state.setWaterReflectivity);
  const waterColor = useVisualStore((state) => state.waterColor);
  const setWaterColor = useVisualStore((state) => state.setWaterColor);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Left panel: Templates + Advanced */}
      <div className="absolute top-2 bottom-2 left-0 flex">
        <div
          className={`
            pointer-events-auto h-full w-[300px] max-w-[85vw]
            bg-black/80 backdrop-blur-md border border-white/10 rounded-r-xl shadow-xl
            transition-transform duration-300
            ${leftOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white/80 text-sm font-medium">Library</span>
            <button
              onClick={() => setLeftOpen(false)}
              className="text-xs text-white/60 hover:text-white"
            >
              Hide
            </button>
          </div>
          <div className="h-[calc(100%-48px)] overflow-y-auto p-4">
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
                <div className="mt-3 max-h-[60vh] overflow-y-auto pr-2">
                  <AdvancedEditor />
                </div>
              )}
            </div>
          </div>
        </div>
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="
              pointer-events-auto mt-4 ml-2
              px-2 py-4
              bg-black/70 backdrop-blur-md
              border border-white/15 rounded-r-lg
              text-xs text-white/80 hover:text-white hover:bg-black/80
              transition-all
              writing-mode-vertical
            "
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Library
          </button>
        )}
      </div>

      {/* Right panel: Core controls — top-16 leaves room for VR button */}
      <div className="absolute top-16 bottom-2 right-0 flex justify-end">
        <div
          className={`
            pointer-events-auto h-full w-[300px] max-w-[85vw]
            bg-black/80 backdrop-blur-md border border-white/10 rounded-l-xl shadow-xl
            transition-transform duration-300
            ${rightOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white/80 text-sm font-medium">Controls</span>
            <button
              onClick={() => setRightOpen(false)}
              className="text-xs text-white/60 hover:text-white"
            >
              Hide
            </button>
          </div>
          <div className="h-[calc(100%-48px)] overflow-y-auto p-4 space-y-4">
            <ModeSelector />
            <PresetSelector />

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Skybox Rotation Speed: {skyboxRotationSpeed.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
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

            {/* Render Video Button */}
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowRenderDialog(true)}
                className={`
                  w-full px-4 py-3
                  ${audioFile
                    ? 'bg-gradient-to-r from-green-600/50 to-emerald-600/50 hover:from-green-500/60 hover:to-emerald-500/60 border-green-400/30'
                    : 'bg-white/10 border-white/10 cursor-not-allowed opacity-50'
                  }
                  border
                  rounded-lg
                  text-white font-medium
                  transition-all
                  flex items-center justify-center gap-2
                  min-h-[48px]
                `}
                disabled={!audioFile}
                title={audioFile ? 'Open render dialog' : 'Upload audio first'}
              >
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Render Video
              </button>
              <p className="text-white/40 text-xs mt-2 text-center">
                {audioFile ? 'Server-side render with 360 VR support' : 'Upload audio to enable rendering'}
              </p>
            </div>

            {/* VR Preview Mode Button */}
            {onEnterVRMode && (
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={onEnterVRMode}
                  className="
                    w-full px-4 py-3
                    bg-gradient-to-r from-purple-600/50 to-blue-600/50
                    hover:from-purple-500/60 hover:to-blue-500/60
                    border border-purple-400/30
                    rounded-lg
                    text-white font-medium
                    transition-all
                    flex items-center justify-center gap-2
                    min-h-[48px]
                  "
                >
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  VR Preview Mode
                </button>
                <p className="text-white/40 text-xs mt-2 text-center">
                  Use with phone + VR headset (gyroscope required)
                </p>
              </div>
            )}

            {/* Debug Toggle */}
            <div className="border-t border-white/10 pt-4 flex justify-end">
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

            {/* Audio Controls (always mounted) */}
            <div className={showDebug ? "" : "sr-only"}>
              <AudioControls />
            </div>
          </div>
        </div>
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="
              pointer-events-auto mt-4 mr-2
              px-2 py-4
              bg-black/70 backdrop-blur-md
              border border-white/15 rounded-l-lg
              text-xs text-white/80 hover:text-white hover:bg-black/80
              transition-all
            "
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Controls
          </button>
        )}
      </div>

      {/* Save Template Dialog */}
      {screenshotRef && (
        <SaveTemplateDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          screenshotRef={screenshotRef}
        />
      )}

      {/* Render Dialog */}
      <RenderDialog
        isOpen={showRenderDialog}
        onClose={() => setShowRenderDialog(false)}
        audioFile={audioFile}
        audioPath={audioUrl || undefined}
        template={currentMode}
      />
    </div>
  );
}
