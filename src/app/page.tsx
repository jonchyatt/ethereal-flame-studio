'use client';

import { useRef, useState, useEffect } from 'react';
import { StudioCanvas } from '@/components/canvas/StudioCanvas';
import { VRModeOverlay, useVRMode, VRContextProvider } from '@/components/canvas/VRPreviewMode';
import { ScreenshotCaptureRef } from '@/components/ui/ScreenshotCapture';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { AudioControls, AudioControlsRef } from '@/components/ui/AudioControls';
import { LandingOverlay } from '@/components/ui/LandingOverlay';
import { ExperienceOverlay } from '@/components/ui/ExperienceOverlay';
import { CreateOverlay } from '@/components/ui/CreateOverlay';
import { WidgetLayer } from '@/components/ui/WidgetLayer';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useWidgetStore } from '@/lib/stores/widgetStore';
import { useRenderMode } from '@/hooks/useRenderMode';

type ViewMode = 'landing' | 'experience' | 'designer' | 'create';

export default function Home() {
  useEffect(() => {
    document.body.classList.add('canvas-page');
    return () => { document.body.classList.remove('canvas-page'); };
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const screenshotRef = useRef<ScreenshotCaptureRef>(null);
  const audioControlsRef = useRef<AudioControlsRef>(null);

  // Only read the few values page.tsx itself needs for overlay logic
  const skyboxMode = useVisualStore((s) => s.skyboxMode);
  const skyboxMaskPreview = useVisualStore((s) => s.skyboxMaskPreview);
  const skyboxMaskPreviewSplit = useVisualStore((s) => s.skyboxMaskPreviewSplit);
  const skyboxPatchPickTarget = useVisualStore((s) => s.skyboxPatchPickTarget);
  const skyboxPatchPickCursorX = useVisualStore((s) => s.skyboxPatchPickCursorX);
  const skyboxPatchPickCursorY = useVisualStore((s) => s.skyboxPatchPickCursorY);
  const vrDebugOverlayEnabled = useVisualStore((s) => s.vrDebugOverlayEnabled);

  const { isVRMode, showInstructions, enterVRMode, exitVRMode, dismissInstructions } = useVRMode();
  const renderMode = useRenderMode();

  const pickCursorX = skyboxPatchPickCursorX >= 0
    ? skyboxPatchPickCursorX
    : typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const pickCursorY = skyboxPatchPickCursorY >= 0
    ? skyboxPatchPickCursorY
    : typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  return (
    <VRContextProvider>
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      <StudioCanvas
        screenshotRef={screenshotRef}
        isVRMode={isVRMode}
        exitVRMode={exitVRMode}
        interactionDisabled={viewMode === 'landing'}
      />

      {/* Floating VR Button */}
      {!isVRMode && !renderMode.isActive && viewMode !== 'landing' && (
        <button
          onClick={enterVRMode}
          className="
            fixed top-3 right-3 z-[200]
            px-4 py-2.5
            bg-gradient-to-r from-purple-600 to-blue-600
            hover:from-purple-500 hover:to-blue-500
            border border-purple-400/50
            rounded-full
            text-white font-medium text-sm
            shadow-lg shadow-purple-500/30
            transition-all
            flex items-center gap-2
          "
          aria-label="Enter VR Preview Mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          VR
        </button>
      )}

      {/* AudioControls — always mounted to preserve <audio> element + rAF loop */}
      <div style={{ display: viewMode === 'designer' ? 'block' : 'none' }}
           className="fixed bottom-0 left-0 right-0 z-50">
        <AudioControls ref={audioControlsRef} />
      </div>

      <LandingOverlay viewMode={viewMode} onSelectMode={setViewMode} />

      <ExperienceOverlay
        viewMode={viewMode}
        onBack={() => setViewMode('landing')}
        audioControlsRef={audioControlsRef}
      />

      {/* Designer: ControlPanel */}
      <div className={(isVRMode || renderMode.isActive || viewMode !== 'designer') ? "invisible pointer-events-none absolute -z-50" : ""}>
        <ControlPanel
          screenshotRef={screenshotRef}
          onGoToCreate={() => setViewMode('create')}
          onBack={() => setViewMode('landing')}
        />
      </div>

      {/* Widget Layer */}
      {viewMode === 'designer' && !isVRMode && !renderMode.isActive && (
        <WidgetLayer />
      )}

      {viewMode === 'designer' && !isVRMode && !renderMode.isActive && (
        <button
          onClick={() => {
            const store = useWidgetStore.getState();
            const ids = ['global', 'audio', 'particles'] as const;
            ids.forEach(id => {
              if (!store.widgets[id].isOpen) {
                store.openWidget(id);
              }
            });
          }}
          className="
            fixed bottom-20 right-4 z-[90]
            px-3 py-2
            bg-purple-600/60 hover:bg-purple-500/70
            border border-purple-400/40
            rounded-lg text-white text-xs font-medium
            transition-all shadow-lg
          "
        >
          Open Demo Widgets
        </button>
      )}

      <CreateOverlay
        viewMode={viewMode}
        onBack={() => setViewMode('landing')}
        onGoToDesigner={() => setViewMode('designer')}
        audioControlsRef={audioControlsRef}
      />

      {/* Video mask preview indicators */}
      {!isVRMode && skyboxMode === 'video' && skyboxMaskPreview && skyboxMaskPreviewSplit && (
        <div className="fixed top-4 left-1/2 z-[70] -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-1 text-xs uppercase tracking-wide text-white/80 border border-white/10">
            <span>Preview</span>
            <span className="text-white/30">|</span>
            <span>Live</span>
          </div>
        </div>
      )}

      {!isVRMode && skyboxMode === 'video' && skyboxPatchPickTarget !== 'none' && (
        <>
          <div className="fixed top-14 left-1/2 z-[70] -translate-x-1/2 pointer-events-none">
            <div className="rounded-full bg-black/60 px-4 py-1 text-xs text-white/80 border border-white/10">
              Click video to set{' '}
              <span className="text-white">
                {skyboxPatchPickTarget === 'patchA' ? 'Patch A'
                  : skyboxPatchPickTarget === 'patchB' ? 'Patch B'
                  : skyboxPatchPickTarget === 'patchC' ? 'Patch C'
                  : 'Patch D'}
              </span>{' '}center
            </div>
          </div>
          <div
            className="fixed z-[70] pointer-events-none"
            style={{ left: pickCursorX, top: pickCursorY }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 rounded-full border border-white/70" />
              <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-white/70" />
              <div className="absolute top-1/2 left-0 w-6 h-px -translate-y-1/2 bg-white/70" />
            </div>
          </div>
        </>
      )}

      <VRModeOverlay
        enabled={isVRMode}
        onExit={exitVRMode}
        showInstructions={showInstructions}
        onDismissInstructions={dismissInstructions}
        showDebugOverlay={vrDebugOverlayEnabled}
      />
    </main>
    </VRContextProvider>
  );
}
