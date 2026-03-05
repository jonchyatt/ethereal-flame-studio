'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbAnchor } from '@/components/canvas/OrbAnchor';
import { StarNestSkybox } from '@/components/canvas/StarNestSkybox';
import { VideoSkybox } from '@/components/canvas/VideoSkybox';
import { WaterPlane } from '@/components/canvas/WaterPlane';
import { CameraRig } from '@/components/canvas/CameraRig';
import { PoleLogoOverlay } from '@/components/canvas/PoleLogoOverlay';
import { DragLookControls } from '@/components/canvas/DragLookControls';
import { VRPreviewMode, VRModeOverlay, useVRMode, VRContextProvider } from '@/components/canvas/VRPreviewMode';
import { ScreenshotCapture, ScreenshotCaptureRef } from '@/components/ui/ScreenshotCapture';
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
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const screenshotRef = useRef<ScreenshotCaptureRef>(null);
  const audioControlsRef = useRef<AudioControlsRef>(null);
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const skyboxAudioReactiveEnabled = useVisualStore((state) => state.skyboxAudioReactiveEnabled);
  const skyboxAudioReactivity = useVisualStore((state) => state.skyboxAudioReactivity);
  const skyboxDriftSpeed = useVisualStore((state) => state.skyboxDriftSpeed);
  const skyboxMode = useVisualStore((state) => state.skyboxMode);
  const skyboxVideoUrl = useVisualStore((state) => state.skyboxVideoUrl);
  const skyboxVideoYaw = useVisualStore((state) => state.skyboxVideoYaw);
  const skyboxVideoPitch = useVisualStore((state) => state.skyboxVideoPitch);
  const skyboxMaskMode = useVisualStore((state) => state.skyboxMaskMode);
  const skyboxMaskThreshold = useVisualStore((state) => state.skyboxMaskThreshold);
  const skyboxMaskSoftness = useVisualStore((state) => state.skyboxMaskSoftness);
  const skyboxMaskColor = useVisualStore((state) => state.skyboxMaskColor);
  const skyboxMaskPreview = useVisualStore((state) => state.skyboxMaskPreview);
  const skyboxMaskPreviewSplit = useVisualStore((state) => state.skyboxMaskPreviewSplit);
  const skyboxMaskPreviewMode = useVisualStore((state) => state.skyboxMaskPreviewMode);
  const skyboxMaskPreviewColor = useVisualStore((state) => state.skyboxMaskPreviewColor);
  const skyboxMaskInvert = useVisualStore((state) => state.skyboxMaskInvert);
  const skyboxRectMaskEnabled = useVisualStore((state) => state.skyboxRectMaskEnabled);
  const skyboxRectMaskU = useVisualStore((state) => state.skyboxRectMaskU);
  const skyboxRectMaskV = useVisualStore((state) => state.skyboxRectMaskV);
  const skyboxRectMaskWidth = useVisualStore((state) => state.skyboxRectMaskWidth);
  const skyboxRectMaskHeight = useVisualStore((state) => state.skyboxRectMaskHeight);
  const skyboxRectMaskSoftness = useVisualStore((state) => state.skyboxRectMaskSoftness);
  const skyboxRectMaskInvert = useVisualStore((state) => state.skyboxRectMaskInvert);
  const skyboxSeamBlendEnabled = useVisualStore((state) => state.skyboxSeamBlendEnabled);
  const skyboxSeamBlendWidth = useVisualStore((state) => state.skyboxSeamBlendWidth);
  const skyboxHoleFixEnabled = useVisualStore((state) => state.skyboxHoleFixEnabled);
  const skyboxHoleFixThreshold = useVisualStore((state) => state.skyboxHoleFixThreshold);
  const skyboxHoleFixSoftness = useVisualStore((state) => state.skyboxHoleFixSoftness);
  const skyboxPoleFadeEnabled = useVisualStore((state) => state.skyboxPoleFadeEnabled);
  const skyboxPoleFadeStart = useVisualStore((state) => state.skyboxPoleFadeStart);
  const skyboxPoleFadeSoftness = useVisualStore((state) => state.skyboxPoleFadeSoftness);
  const skyboxPatchEnabled = useVisualStore((state) => state.skyboxPatchEnabled);
  const skyboxPatchU = useVisualStore((state) => state.skyboxPatchU);
  const skyboxPatchV = useVisualStore((state) => state.skyboxPatchV);
  const skyboxPatchRadius = useVisualStore((state) => state.skyboxPatchRadius);
  const skyboxPatchSoftness = useVisualStore((state) => state.skyboxPatchSoftness);
  const skyboxPatch2Enabled = useVisualStore((state) => state.skyboxPatch2Enabled);
  const skyboxPatch2U = useVisualStore((state) => state.skyboxPatch2U);
  const skyboxPatch2V = useVisualStore((state) => state.skyboxPatch2V);
  const skyboxPatch2Radius = useVisualStore((state) => state.skyboxPatch2Radius);
  const skyboxPatch2Softness = useVisualStore((state) => state.skyboxPatch2Softness);
  const skyboxPatch3Enabled = useVisualStore((state) => state.skyboxPatch3Enabled);
  const skyboxPatch3U = useVisualStore((state) => state.skyboxPatch3U);
  const skyboxPatch3V = useVisualStore((state) => state.skyboxPatch3V);
  const skyboxPatch3Radius = useVisualStore((state) => state.skyboxPatch3Radius);
  const skyboxPatch3Softness = useVisualStore((state) => state.skyboxPatch3Softness);
  const skyboxPatch4Enabled = useVisualStore((state) => state.skyboxPatch4Enabled);
  const skyboxPatch4U = useVisualStore((state) => state.skyboxPatch4U);
  const skyboxPatch4V = useVisualStore((state) => state.skyboxPatch4V);
  const skyboxPatch4Radius = useVisualStore((state) => state.skyboxPatch4Radius);
  const skyboxPatch4Softness = useVisualStore((state) => state.skyboxPatch4Softness);
  const skyboxPatchPickTarget = useVisualStore((state) => state.skyboxPatchPickTarget);
  const skyboxPatchPickCursorX = useVisualStore((state) => state.skyboxPatchPickCursorX);
  const skyboxPatchPickCursorY = useVisualStore((state) => state.skyboxPatchPickCursorY);
  const skyboxPoleLogoEnabled = useVisualStore((state) => state.skyboxPoleLogoEnabled);
  const skyboxPoleLogoUrl = useVisualStore((state) => state.skyboxPoleLogoUrl);
  const skyboxPoleLogoSize = useVisualStore((state) => state.skyboxPoleLogoSize);
  const skyboxPoleLogoOpacity = useVisualStore((state) => state.skyboxPoleLogoOpacity);
  const skyboxPoleLogoAutoScale = useVisualStore((state) => state.skyboxPoleLogoAutoScale);
  const vrComfortMode = useVisualStore((state) => state.vrComfortMode);
  const vrDebugOverlayEnabled = useVisualStore((state) => state.vrDebugOverlayEnabled);
  const orbAnchorMode = useVisualStore((state) => state.orbAnchorMode);
  const cameraLookAtOrb = useVisualStore((state) => state.cameraLookAtOrb);
  const cameraOrbitEnabled = useVisualStore((state) => state.cameraOrbitEnabled);
  const cameraOrbitRenderOnly = useVisualStore((state) => state.cameraOrbitRenderOnly);
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);

  // VR Preview Mode
  const { isVRMode, showInstructions, enterVRMode, exitVRMode, dismissInstructions } = useVRMode();
  const renderMode = useRenderMode();

  const effectiveSkyboxRotation = isVRMode && vrComfortMode ? 0 : skyboxRotationSpeed;
  const effectiveSkyboxDrift = isVRMode && vrComfortMode ? 0 : skyboxDriftSpeed;
  const isOrbitMode = orbAnchorMode === 'orbit';
  const orbitActive = !isVRMode && !isOrbitMode && cameraOrbitEnabled && (!cameraOrbitRenderOnly || renderMode.isActive);
  const lookAtActive = !isVRMode && !isOrbitMode && cameraLookAtOrb;
  const lockOrbitToOrb = orbAnchorMode === 'world';
  const pickCursorX =
    skyboxPatchPickCursorX >= 0
      ? skyboxPatchPickCursorX
      : typeof window !== 'undefined'
        ? window.innerWidth / 2
        : 0;
  const pickCursorY =
    skyboxPatchPickCursorY >= 0
      ? skyboxPatchPickCursorY
      : typeof window !== 'undefined'
        ? window.innerHeight / 2
        : 0;

  return (
    <VRContextProvider>
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,  // Required for screenshot capture (plan 02-04)
        }}
        style={{ background: '#000000', position: 'absolute', zIndex: 1 }}
      >
        {/* Skybox rendering (shader or video) */}
        {skyboxMode === 'video' && skyboxVideoUrl && (
          <VideoSkybox
            videoUrl={skyboxVideoUrl}
            maskMode={skyboxMaskMode}
            maskThreshold={skyboxMaskThreshold}
            maskSoftness={skyboxMaskSoftness}
            maskColor={skyboxMaskColor}
            maskPreview={skyboxMaskPreview}
            maskPreviewSplit={skyboxMaskPreviewSplit}
            maskPreviewMode={skyboxMaskPreviewMode}
            maskPreviewColor={skyboxMaskPreviewColor}
            maskInvert={skyboxMaskInvert}
            rectMaskEnabled={skyboxRectMaskEnabled}
            rectMaskU={skyboxRectMaskU}
            rectMaskV={skyboxRectMaskV}
            rectMaskWidth={skyboxRectMaskWidth}
            rectMaskHeight={skyboxRectMaskHeight}
            rectMaskSoftness={skyboxRectMaskSoftness}
            rectMaskInvert={skyboxRectMaskInvert}
            videoYaw={skyboxVideoYaw}
            videoPitch={skyboxVideoPitch}
            seamBlendEnabled={skyboxSeamBlendEnabled}
            seamBlendWidth={skyboxSeamBlendWidth}
            holeFixEnabled={skyboxHoleFixEnabled}
            holeFixThreshold={skyboxHoleFixThreshold}
            holeFixSoftness={skyboxHoleFixSoftness}
            poleFadeEnabled={skyboxPoleFadeEnabled}
            poleFadeStart={skyboxPoleFadeStart}
            poleFadeSoftness={skyboxPoleFadeSoftness}
            patchEnabled={skyboxPatchEnabled}
            patchU={skyboxPatchU}
            patchV={skyboxPatchV}
            patchRadius={skyboxPatchRadius}
            patchSoftness={skyboxPatchSoftness}
            patch2Enabled={skyboxPatch2Enabled}
            patch2U={skyboxPatch2U}
            patch2V={skyboxPatch2V}
            patch2Radius={skyboxPatch2Radius}
            patch2Softness={skyboxPatch2Softness}
            patch3Enabled={skyboxPatch3Enabled}
            patch3U={skyboxPatch3U}
            patch3V={skyboxPatch3V}
            patch3Radius={skyboxPatch3Radius}
            patch3Softness={skyboxPatch3Softness}
            patch4Enabled={skyboxPatch4Enabled}
            patch4U={skyboxPatch4U}
            patch4V={skyboxPatch4V}
            patch4Radius={skyboxPatch4Radius}
            patch4Softness={skyboxPatch4Softness}
            rotationSpeed={effectiveSkyboxRotation}
          />
        )}

        {(skyboxMode !== 'video' ||
          !skyboxVideoUrl ||
          skyboxMaskMode !== 'none' ||
          skyboxRectMaskEnabled ||
          skyboxHoleFixEnabled ||
          skyboxPoleFadeEnabled ||
          skyboxPatchEnabled ||
          skyboxPatch2Enabled ||
          skyboxPatch3Enabled ||
          skyboxPatch4Enabled) && (
          <StarNestSkybox
            preset={skyboxPreset}
            rotationSpeed={effectiveSkyboxRotation}
            audioReactiveEnabled={skyboxAudioReactiveEnabled}
            audioReactivity={skyboxAudioReactivity}
            driftSpeed={effectiveSkyboxDrift}
          />
        )}

        {skyboxMode === 'video' && skyboxPoleLogoEnabled && (
          <PoleLogoOverlay
            textureUrl={skyboxPoleLogoUrl ?? '/overlays/WAIANCircle.png'}
            size={skyboxPoleLogoSize}
            opacity={skyboxPoleLogoOpacity}
            autoScale={skyboxPoleLogoAutoScale}
          />
        )}

        {/* Screenshot capture component for template thumbnails */}
        <ScreenshotCapture ref={screenshotRef} />

        {/* Water plane (optional) - renders below particles */}
        {waterEnabled && (
          <Suspense fallback={null}>
            <WaterPlane color={waterColor} reflectivity={waterReflectivity} />
          </Suspense>
        )}

        {/* VR Preview Mode - handles stereoscopic rendering and gyro camera */}
        <VRPreviewMode enabled={isVRMode} onExit={exitVRMode} />

        {/* CameraRig applies look-at/orbit in non-VR mode */}
        <CameraRig enabled={!isVRMode} />

        {/* OrbitControls: in orbit mode, targets origin with damping for sculpture feel */}
        {!isVRMode && isOrbitMode && (
          <OrbitControls
            enabled={viewMode !== 'landing'}
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={25}
            target={[0, 0, 0]}
          />
        )}
        {/* OrbitControls: default free-look when no camera rig is active */}
        {!isVRMode && !isOrbitMode && (
          <OrbitControls
            enabled={viewMode !== 'landing' && !orbitActive && !lookAtActive && !lockOrbitToOrb}
          />
        )}
        {!isVRMode && !isOrbitMode && lockOrbitToOrb && (
          <DragLookControls enabled={viewMode !== 'landing'} />
        )}
        <Suspense fallback={null}>
          <OrbAnchor />
{/* Bloom disabled - was washing out skybox
          <EffectComposer multisampling={4}>
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.7}
              luminanceSmoothing={0.3}
              mipmapBlur={true}
            />
          </EffectComposer>
*/}
        </Suspense>
      </Canvas>

      {/* Floating VR Button - hidden in VR mode, render mode, and landing */}
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

      {/* Landing Overlay */}
      <LandingOverlay viewMode={viewMode} onSelectMode={setViewMode} />

      {/* Experience Overlay */}
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

      {/* Widget Layer - floating panels on designer screen */}
      {viewMode === 'designer' && !isVRMode && !renderMode.isActive && (
        <WidgetLayer />
      )}

      {/* TEMPORARY: Widget demo button -- remove in Phase 20 when real widgets are wired */}
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

      {/* Create Overlay */}
      <CreateOverlay
        viewMode={viewMode}
        onBack={() => setViewMode('landing')}
        onGoToDesigner={() => setViewMode('designer')}
        audioControlsRef={audioControlsRef}
      />

      {/* Mask preview split label */}
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
        <div className="fixed top-14 left-1/2 z-[70] -translate-x-1/2 pointer-events-none">
          <div className="rounded-full bg-black/60 px-4 py-1 text-xs text-white/80 border border-white/10">
            Click video to set{' '}
            <span className="text-white">
              {skyboxPatchPickTarget === 'patchA'
                ? 'Patch A'
                : skyboxPatchPickTarget === 'patchB'
                  ? 'Patch B'
                  : skyboxPatchPickTarget === 'patchC'
                    ? 'Patch C'
                    : 'Patch D'}
            </span>{' '}
            center
          </div>
        </div>
      )}

      {!isVRMode && skyboxMode === 'video' && skyboxPatchPickTarget !== 'none' && (
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
      )}

      {/* VR Mode Overlay - handles permission requests and instructions */}
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
