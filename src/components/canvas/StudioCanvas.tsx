'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbAnchor } from './OrbAnchor';
import { StarNestSkybox } from './StarNestSkybox';
import { VideoSkybox } from './VideoSkybox';
import { WaterPlane } from './WaterPlane';
import { CameraRig } from './CameraRig';
import { PoleLogoOverlay } from './PoleLogoOverlay';
import { DragLookControls } from './DragLookControls';
import { VRPreviewMode } from './VRPreviewMode';
import { ScreenshotCapture, ScreenshotCaptureRef } from '@/components/ui/ScreenshotCapture';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useRenderMode } from '@/hooks/useRenderMode';

interface StudioCanvasProps {
  screenshotRef: React.RefObject<ScreenshotCaptureRef | null>;
  isVRMode: boolean;
  exitVRMode: () => void;
  interactionDisabled: boolean;
}

export function StudioCanvas({ screenshotRef, isVRMode, exitVRMode, interactionDisabled }: StudioCanvasProps) {
  // Read all visual state in one place
  const skyboxPreset = useVisualStore((s) => s.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((s) => s.skyboxRotationSpeed);
  const skyboxAudioReactiveEnabled = useVisualStore((s) => s.skyboxAudioReactiveEnabled);
  const skyboxAudioReactivity = useVisualStore((s) => s.skyboxAudioReactivity);
  const skyboxDriftSpeed = useVisualStore((s) => s.skyboxDriftSpeed);
  const skyboxMode = useVisualStore((s) => s.skyboxMode);
  const skyboxVideoUrl = useVisualStore((s) => s.skyboxVideoUrl);
  const skyboxVideoYaw = useVisualStore((s) => s.skyboxVideoYaw);
  const skyboxVideoPitch = useVisualStore((s) => s.skyboxVideoPitch);
  const skyboxMaskMode = useVisualStore((s) => s.skyboxMaskMode);
  const skyboxMaskThreshold = useVisualStore((s) => s.skyboxMaskThreshold);
  const skyboxMaskSoftness = useVisualStore((s) => s.skyboxMaskSoftness);
  const skyboxMaskColor = useVisualStore((s) => s.skyboxMaskColor);
  const skyboxMaskPreview = useVisualStore((s) => s.skyboxMaskPreview);
  const skyboxMaskPreviewSplit = useVisualStore((s) => s.skyboxMaskPreviewSplit);
  const skyboxMaskPreviewMode = useVisualStore((s) => s.skyboxMaskPreviewMode);
  const skyboxMaskPreviewColor = useVisualStore((s) => s.skyboxMaskPreviewColor);
  const skyboxMaskInvert = useVisualStore((s) => s.skyboxMaskInvert);
  const skyboxRectMaskEnabled = useVisualStore((s) => s.skyboxRectMaskEnabled);
  const skyboxRectMaskU = useVisualStore((s) => s.skyboxRectMaskU);
  const skyboxRectMaskV = useVisualStore((s) => s.skyboxRectMaskV);
  const skyboxRectMaskWidth = useVisualStore((s) => s.skyboxRectMaskWidth);
  const skyboxRectMaskHeight = useVisualStore((s) => s.skyboxRectMaskHeight);
  const skyboxRectMaskSoftness = useVisualStore((s) => s.skyboxRectMaskSoftness);
  const skyboxRectMaskInvert = useVisualStore((s) => s.skyboxRectMaskInvert);
  const skyboxSeamBlendEnabled = useVisualStore((s) => s.skyboxSeamBlendEnabled);
  const skyboxSeamBlendWidth = useVisualStore((s) => s.skyboxSeamBlendWidth);
  const skyboxHoleFixEnabled = useVisualStore((s) => s.skyboxHoleFixEnabled);
  const skyboxHoleFixThreshold = useVisualStore((s) => s.skyboxHoleFixThreshold);
  const skyboxHoleFixSoftness = useVisualStore((s) => s.skyboxHoleFixSoftness);
  const skyboxPoleFadeEnabled = useVisualStore((s) => s.skyboxPoleFadeEnabled);
  const skyboxPoleFadeStart = useVisualStore((s) => s.skyboxPoleFadeStart);
  const skyboxPoleFadeSoftness = useVisualStore((s) => s.skyboxPoleFadeSoftness);
  const skyboxPatchEnabled = useVisualStore((s) => s.skyboxPatchEnabled);
  const skyboxPatchU = useVisualStore((s) => s.skyboxPatchU);
  const skyboxPatchV = useVisualStore((s) => s.skyboxPatchV);
  const skyboxPatchRadius = useVisualStore((s) => s.skyboxPatchRadius);
  const skyboxPatchSoftness = useVisualStore((s) => s.skyboxPatchSoftness);
  const skyboxPatch2Enabled = useVisualStore((s) => s.skyboxPatch2Enabled);
  const skyboxPatch2U = useVisualStore((s) => s.skyboxPatch2U);
  const skyboxPatch2V = useVisualStore((s) => s.skyboxPatch2V);
  const skyboxPatch2Radius = useVisualStore((s) => s.skyboxPatch2Radius);
  const skyboxPatch2Softness = useVisualStore((s) => s.skyboxPatch2Softness);
  const skyboxPatch3Enabled = useVisualStore((s) => s.skyboxPatch3Enabled);
  const skyboxPatch3U = useVisualStore((s) => s.skyboxPatch3U);
  const skyboxPatch3V = useVisualStore((s) => s.skyboxPatch3V);
  const skyboxPatch3Radius = useVisualStore((s) => s.skyboxPatch3Radius);
  const skyboxPatch3Softness = useVisualStore((s) => s.skyboxPatch3Softness);
  const skyboxPatch4Enabled = useVisualStore((s) => s.skyboxPatch4Enabled);
  const skyboxPatch4U = useVisualStore((s) => s.skyboxPatch4U);
  const skyboxPatch4V = useVisualStore((s) => s.skyboxPatch4V);
  const skyboxPatch4Radius = useVisualStore((s) => s.skyboxPatch4Radius);
  const skyboxPatch4Softness = useVisualStore((s) => s.skyboxPatch4Softness);
  const skyboxPoleLogoEnabled = useVisualStore((s) => s.skyboxPoleLogoEnabled);
  const skyboxPoleLogoUrl = useVisualStore((s) => s.skyboxPoleLogoUrl);
  const skyboxPoleLogoSize = useVisualStore((s) => s.skyboxPoleLogoSize);
  const skyboxPoleLogoOpacity = useVisualStore((s) => s.skyboxPoleLogoOpacity);
  const skyboxPoleLogoAutoScale = useVisualStore((s) => s.skyboxPoleLogoAutoScale);
  const vrComfortMode = useVisualStore((s) => s.vrComfortMode);
  const orbAnchorMode = useVisualStore((s) => s.orbAnchorMode);
  const cameraLookAtOrb = useVisualStore((s) => s.cameraLookAtOrb);
  const cameraOrbitEnabled = useVisualStore((s) => s.cameraOrbitEnabled);
  const cameraOrbitRenderOnly = useVisualStore((s) => s.cameraOrbitRenderOnly);
  const waterEnabled = useVisualStore((s) => s.waterEnabled);
  const waterColor = useVisualStore((s) => s.waterColor);
  const waterReflectivity = useVisualStore((s) => s.waterReflectivity);

  const renderMode = useRenderMode();

  const effectiveSkyboxRotation = isVRMode && vrComfortMode ? 0 : skyboxRotationSpeed;
  const effectiveSkyboxDrift = isVRMode && vrComfortMode ? 0 : skyboxDriftSpeed;
  const isOrbitMode = orbAnchorMode === 'orbit';
  const orbitActive = !isVRMode && !isOrbitMode && cameraOrbitEnabled && (!cameraOrbitRenderOnly || renderMode.isActive);
  const lookAtActive = !isVRMode && !isOrbitMode && cameraLookAtOrb;
  const lockOrbitToOrb = orbAnchorMode === 'world';

  return (
    <Canvas
      camera={{ position: [0, 2, 10], fov: 50 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      style={{ background: '#000000', position: 'absolute', zIndex: 1 }}
    >
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

      <ScreenshotCapture ref={screenshotRef} />

      {waterEnabled && (
        <Suspense fallback={null}>
          <WaterPlane color={waterColor} reflectivity={waterReflectivity} />
        </Suspense>
      )}

      <VRPreviewMode enabled={isVRMode} onExit={exitVRMode} />
      <CameraRig enabled={!isVRMode} />

      {!isVRMode && isOrbitMode && (
        <OrbitControls
          enabled={!interactionDisabled}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={25}
          target={[0, 0, 0]}
        />
      )}
      {!isVRMode && !isOrbitMode && (
        <OrbitControls
          enabled={!interactionDisabled && !orbitActive && !lookAtActive && !lockOrbitToOrb}
        />
      )}
      {!isVRMode && !isOrbitMode && lockOrbitToOrb && (
        <DragLookControls enabled={!interactionDisabled} />
      )}

      <Suspense fallback={null}>
        <OrbAnchor />
      </Suspense>
    </Canvas>
  );
}
