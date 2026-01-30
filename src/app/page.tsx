'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleSystem } from '@/components/canvas/ParticleSystem';
import { StarNestSkybox } from '@/components/canvas/StarNestSkybox';
import { WaterPlane } from '@/components/canvas/WaterPlane';
import { VRPreviewMode, VRModeOverlay, useVRMode } from '@/components/canvas/VRPreviewMode';
import { ScreenshotCapture, ScreenshotCaptureRef } from '@/components/ui/ScreenshotCapture';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { useVisualStore } from '@/lib/stores/visualStore';

export default function Home() {
  const screenshotRef = useRef<ScreenshotCaptureRef>(null);
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);

  // VR Preview Mode
  const { isVRMode, showInstructions, enterVRMode, exitVRMode, dismissInstructions } = useVRMode();

  return (
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
        {/* Star Nest skybox renders behind everything */}
        <StarNestSkybox preset={skyboxPreset} rotationSpeed={skyboxRotationSpeed} />

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
          <ParticleSystem />
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

      {/* Control panel fixed at bottom - includes mode selector, preset selector, and audio controls */}
      {/* Hidden in VR mode */}
      {!isVRMode && <ControlPanel screenshotRef={screenshotRef} onEnterVRMode={enterVRMode} />}

      {/* VR Mode Overlay - handles permission requests and instructions */}
      <VRModeOverlay
        enabled={isVRMode}
        onExit={exitVRMode}
        showInstructions={showInstructions}
        onDismissInstructions={dismissInstructions}
      />
    </main>
  );
}
