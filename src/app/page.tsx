'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbAnchor } from '@/components/canvas/OrbAnchor';
import { StarNestSkybox } from '@/components/canvas/StarNestSkybox';
import { VideoSkybox } from '@/components/canvas/VideoSkybox';
import { WaterPlane } from '@/components/canvas/WaterPlane';
import { VRPreviewMode, VRModeOverlay, useVRMode, VRContextProvider } from '@/components/canvas/VRPreviewMode';
import { ScreenshotCapture, ScreenshotCaptureRef } from '@/components/ui/ScreenshotCapture';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { useVisualStore } from '@/lib/stores/visualStore';

export default function Home() {
  const screenshotRef = useRef<ScreenshotCaptureRef>(null);
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const skyboxAudioReactiveEnabled = useVisualStore((state) => state.skyboxAudioReactiveEnabled);
  const skyboxAudioReactivity = useVisualStore((state) => state.skyboxAudioReactivity);
  const skyboxDriftSpeed = useVisualStore((state) => state.skyboxDriftSpeed);
  const skyboxMode = useVisualStore((state) => state.skyboxMode);
  const skyboxVideoUrl = useVisualStore((state) => state.skyboxVideoUrl);
  const skyboxMaskMode = useVisualStore((state) => state.skyboxMaskMode);
  const skyboxMaskThreshold = useVisualStore((state) => state.skyboxMaskThreshold);
  const skyboxMaskSoftness = useVisualStore((state) => state.skyboxMaskSoftness);
  const skyboxMaskColor = useVisualStore((state) => state.skyboxMaskColor);
  const skyboxMaskPreview = useVisualStore((state) => state.skyboxMaskPreview);
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);

  // VR Preview Mode
  const { isVRMode, showInstructions, enterVRMode, exitVRMode, dismissInstructions } = useVRMode();

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
            rotationSpeed={skyboxRotationSpeed}
          />
        )}

        {(skyboxMode !== 'video' || !skyboxVideoUrl || skyboxMaskMode !== 'none') && (
          <StarNestSkybox
            preset={skyboxPreset}
            rotationSpeed={skyboxRotationSpeed}
            audioReactiveEnabled={skyboxAudioReactiveEnabled}
            audioReactivity={skyboxAudioReactivity}
            driftSpeed={skyboxDriftSpeed}
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

        {/* OrbitControls disabled in VR mode */}
        {!isVRMode && <OrbitControls />}
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

      {/* Floating VR Button - always visible, high z-index */}
      {!isVRMode && (
        <button
          onClick={enterVRMode}
          className="
            fixed top-4 right-4 z-[60]
            px-4 py-3
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

      {/* Control panel fixed at bottom - includes mode selector, preset selector, and audio controls */}
      {/* Always mounted to preserve audio state, hidden and non-interactive in VR mode */}
      <div className={isVRMode ? "invisible pointer-events-none absolute -z-50" : ""}>
        <ControlPanel screenshotRef={screenshotRef} />
      </div>

      {/* VR Mode Overlay - handles permission requests and instructions */}
      <VRModeOverlay
        enabled={isVRMode}
        onExit={exitVRMode}
        showInstructions={showInstructions}
        onDismissInstructions={dismissInstructions}
      />
    </main>
    </VRContextProvider>
  );
}
