'use client';

import { useState } from 'react';
import { ParameterGroup } from './ParameterGroup';
import { LayerEditor } from './LayerEditor';
import { useVisualStore } from '@/lib/stores/visualStore';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

export function AdvancedEditor() {
  const layers = useVisualStore((state) => state.layers);
  const intensity = useVisualStore((state) => state.intensity);
  const setIntensity = useVisualStore((state) => state.setIntensity);
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const setSkyboxPreset = useVisualStore((state) => state.setSkyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const setSkyboxRotationSpeed = useVisualStore((state) => state.setSkyboxRotationSpeed);
  const skyboxAudioReactiveEnabled = useVisualStore((state) => state.skyboxAudioReactiveEnabled);
  const setSkyboxAudioReactiveEnabled = useVisualStore((state) => state.setSkyboxAudioReactiveEnabled);
  const skyboxAudioReactivity = useVisualStore((state) => state.skyboxAudioReactivity);
  const setSkyboxAudioReactivity = useVisualStore((state) => state.setSkyboxAudioReactivity);
  const skyboxDriftSpeed = useVisualStore((state) => state.skyboxDriftSpeed);
  const setSkyboxDriftSpeed = useVisualStore((state) => state.setSkyboxDriftSpeed);
  const skyboxMode = useVisualStore((state) => state.skyboxMode);
  const setSkyboxMode = useVisualStore((state) => state.setSkyboxMode);
  const skyboxVideoUrl = useVisualStore((state) => state.skyboxVideoUrl);
  const skyboxVideoFileName = useVisualStore((state) => state.skyboxVideoFileName);
  const setSkyboxVideo = useVisualStore((state) => state.setSkyboxVideo);
  const skyboxVideoYaw = useVisualStore((state) => state.skyboxVideoYaw);
  const setSkyboxVideoYaw = useVisualStore((state) => state.setSkyboxVideoYaw);
  const skyboxVideoPitch = useVisualStore((state) => state.skyboxVideoPitch);
  const setSkyboxVideoPitch = useVisualStore((state) => state.setSkyboxVideoPitch);
  const skyboxMaskMode = useVisualStore((state) => state.skyboxMaskMode);
  const setSkyboxMaskMode = useVisualStore((state) => state.setSkyboxMaskMode);
  const skyboxMaskThreshold = useVisualStore((state) => state.skyboxMaskThreshold);
  const setSkyboxMaskThreshold = useVisualStore((state) => state.setSkyboxMaskThreshold);
  const skyboxMaskSoftness = useVisualStore((state) => state.skyboxMaskSoftness);
  const setSkyboxMaskSoftness = useVisualStore((state) => state.setSkyboxMaskSoftness);
  const skyboxMaskColor = useVisualStore((state) => state.skyboxMaskColor);
  const setSkyboxMaskColor = useVisualStore((state) => state.setSkyboxMaskColor);
  const skyboxMaskPreview = useVisualStore((state) => state.skyboxMaskPreview);
  const setSkyboxMaskPreview = useVisualStore((state) => state.setSkyboxMaskPreview);
  const skyboxMaskPreviewSplit = useVisualStore((state) => state.skyboxMaskPreviewSplit);
  const setSkyboxMaskPreviewSplit = useVisualStore((state) => state.setSkyboxMaskPreviewSplit);
  const skyboxMaskPreviewMode = useVisualStore((state) => state.skyboxMaskPreviewMode);
  const setSkyboxMaskPreviewMode = useVisualStore((state) => state.setSkyboxMaskPreviewMode);
  const skyboxMaskPreviewColor = useVisualStore((state) => state.skyboxMaskPreviewColor);
  const setSkyboxMaskPreviewColor = useVisualStore((state) => state.setSkyboxMaskPreviewColor);
  const skyboxMaskInvert = useVisualStore((state) => state.skyboxMaskInvert);
  const setSkyboxMaskInvert = useVisualStore((state) => state.setSkyboxMaskInvert);
  const skyboxRectMaskEnabled = useVisualStore((state) => state.skyboxRectMaskEnabled);
  const setSkyboxRectMaskEnabled = useVisualStore((state) => state.setSkyboxRectMaskEnabled);
  const skyboxRectMaskU = useVisualStore((state) => state.skyboxRectMaskU);
  const setSkyboxRectMaskU = useVisualStore((state) => state.setSkyboxRectMaskU);
  const skyboxRectMaskV = useVisualStore((state) => state.skyboxRectMaskV);
  const setSkyboxRectMaskV = useVisualStore((state) => state.setSkyboxRectMaskV);
  const skyboxRectMaskWidth = useVisualStore((state) => state.skyboxRectMaskWidth);
  const setSkyboxRectMaskWidth = useVisualStore((state) => state.setSkyboxRectMaskWidth);
  const skyboxRectMaskHeight = useVisualStore((state) => state.skyboxRectMaskHeight);
  const setSkyboxRectMaskHeight = useVisualStore((state) => state.setSkyboxRectMaskHeight);
  const skyboxRectMaskSoftness = useVisualStore((state) => state.skyboxRectMaskSoftness);
  const setSkyboxRectMaskSoftness = useVisualStore((state) => state.setSkyboxRectMaskSoftness);
  const skyboxRectMaskInvert = useVisualStore((state) => state.skyboxRectMaskInvert);
  const setSkyboxRectMaskInvert = useVisualStore((state) => state.setSkyboxRectMaskInvert);
  const skyboxSeamBlendEnabled = useVisualStore((state) => state.skyboxSeamBlendEnabled);
  const setSkyboxSeamBlendEnabled = useVisualStore((state) => state.setSkyboxSeamBlendEnabled);
  const skyboxSeamBlendWidth = useVisualStore((state) => state.skyboxSeamBlendWidth);
  const setSkyboxSeamBlendWidth = useVisualStore((state) => state.setSkyboxSeamBlendWidth);
  const skyboxHoleFixEnabled = useVisualStore((state) => state.skyboxHoleFixEnabled);
  const setSkyboxHoleFixEnabled = useVisualStore((state) => state.setSkyboxHoleFixEnabled);
  const skyboxHoleFixThreshold = useVisualStore((state) => state.skyboxHoleFixThreshold);
  const setSkyboxHoleFixThreshold = useVisualStore((state) => state.setSkyboxHoleFixThreshold);
  const skyboxHoleFixSoftness = useVisualStore((state) => state.skyboxHoleFixSoftness);
  const setSkyboxHoleFixSoftness = useVisualStore((state) => state.setSkyboxHoleFixSoftness);
  const skyboxPoleFadeEnabled = useVisualStore((state) => state.skyboxPoleFadeEnabled);
  const setSkyboxPoleFadeEnabled = useVisualStore((state) => state.setSkyboxPoleFadeEnabled);
  const skyboxPoleFadeStart = useVisualStore((state) => state.skyboxPoleFadeStart);
  const setSkyboxPoleFadeStart = useVisualStore((state) => state.setSkyboxPoleFadeStart);
  const skyboxPoleFadeSoftness = useVisualStore((state) => state.skyboxPoleFadeSoftness);
  const setSkyboxPoleFadeSoftness = useVisualStore((state) => state.setSkyboxPoleFadeSoftness);
  const skyboxPatchEnabled = useVisualStore((state) => state.skyboxPatchEnabled);
  const setSkyboxPatchEnabled = useVisualStore((state) => state.setSkyboxPatchEnabled);
  const skyboxPatchU = useVisualStore((state) => state.skyboxPatchU);
  const setSkyboxPatchU = useVisualStore((state) => state.setSkyboxPatchU);
  const skyboxPatchV = useVisualStore((state) => state.skyboxPatchV);
  const setSkyboxPatchV = useVisualStore((state) => state.setSkyboxPatchV);
  const skyboxPatchRadius = useVisualStore((state) => state.skyboxPatchRadius);
  const setSkyboxPatchRadius = useVisualStore((state) => state.setSkyboxPatchRadius);
  const skyboxPatchSoftness = useVisualStore((state) => state.skyboxPatchSoftness);
  const setSkyboxPatchSoftness = useVisualStore((state) => state.setSkyboxPatchSoftness);
  const skyboxPatch2Enabled = useVisualStore((state) => state.skyboxPatch2Enabled);
  const setSkyboxPatch2Enabled = useVisualStore((state) => state.setSkyboxPatch2Enabled);
  const skyboxPatch2U = useVisualStore((state) => state.skyboxPatch2U);
  const setSkyboxPatch2U = useVisualStore((state) => state.setSkyboxPatch2U);
  const skyboxPatch2V = useVisualStore((state) => state.skyboxPatch2V);
  const setSkyboxPatch2V = useVisualStore((state) => state.setSkyboxPatch2V);
  const skyboxPatch2Radius = useVisualStore((state) => state.skyboxPatch2Radius);
  const setSkyboxPatch2Radius = useVisualStore((state) => state.setSkyboxPatch2Radius);
  const skyboxPatch2Softness = useVisualStore((state) => state.skyboxPatch2Softness);
  const setSkyboxPatch2Softness = useVisualStore((state) => state.setSkyboxPatch2Softness);
  const skyboxPatch3Enabled = useVisualStore((state) => state.skyboxPatch3Enabled);
  const setSkyboxPatch3Enabled = useVisualStore((state) => state.setSkyboxPatch3Enabled);
  const skyboxPatch3U = useVisualStore((state) => state.skyboxPatch3U);
  const setSkyboxPatch3U = useVisualStore((state) => state.setSkyboxPatch3U);
  const skyboxPatch3V = useVisualStore((state) => state.skyboxPatch3V);
  const setSkyboxPatch3V = useVisualStore((state) => state.setSkyboxPatch3V);
  const skyboxPatch3Radius = useVisualStore((state) => state.skyboxPatch3Radius);
  const setSkyboxPatch3Radius = useVisualStore((state) => state.setSkyboxPatch3Radius);
  const skyboxPatch3Softness = useVisualStore((state) => state.skyboxPatch3Softness);
  const setSkyboxPatch3Softness = useVisualStore((state) => state.setSkyboxPatch3Softness);
  const skyboxPatch4Enabled = useVisualStore((state) => state.skyboxPatch4Enabled);
  const setSkyboxPatch4Enabled = useVisualStore((state) => state.setSkyboxPatch4Enabled);
  const skyboxPatch4U = useVisualStore((state) => state.skyboxPatch4U);
  const setSkyboxPatch4U = useVisualStore((state) => state.setSkyboxPatch4U);
  const skyboxPatch4V = useVisualStore((state) => state.skyboxPatch4V);
  const setSkyboxPatch4V = useVisualStore((state) => state.setSkyboxPatch4V);
  const skyboxPatch4Radius = useVisualStore((state) => state.skyboxPatch4Radius);
  const setSkyboxPatch4Radius = useVisualStore((state) => state.setSkyboxPatch4Radius);
  const skyboxPatch4Softness = useVisualStore((state) => state.skyboxPatch4Softness);
  const setSkyboxPatch4Softness = useVisualStore((state) => state.setSkyboxPatch4Softness);
  const skyboxPatchPickTarget = useVisualStore((state) => state.skyboxPatchPickTarget);
  const setSkyboxPatchPickTarget = useVisualStore((state) => state.setSkyboxPatchPickTarget);
  const skyboxPatchPickMulti = useVisualStore((state) => state.skyboxPatchPickMulti);
  const setSkyboxPatchPickMulti = useVisualStore((state) => state.setSkyboxPatchPickMulti);
  const skyboxPoleLogoEnabled = useVisualStore((state) => state.skyboxPoleLogoEnabled);
  const setSkyboxPoleLogoEnabled = useVisualStore((state) => state.setSkyboxPoleLogoEnabled);
  const skyboxPoleLogoUrl = useVisualStore((state) => state.skyboxPoleLogoUrl);
  const setSkyboxPoleLogoUrl = useVisualStore((state) => state.setSkyboxPoleLogoUrl);
  const skyboxPoleLogoSize = useVisualStore((state) => state.skyboxPoleLogoSize);
  const setSkyboxPoleLogoSize = useVisualStore((state) => state.setSkyboxPoleLogoSize);
  const skyboxPoleLogoOpacity = useVisualStore((state) => state.skyboxPoleLogoOpacity);
  const setSkyboxPoleLogoOpacity = useVisualStore((state) => state.setSkyboxPoleLogoOpacity);
  const skyboxPoleLogoAutoScale = useVisualStore((state) => state.skyboxPoleLogoAutoScale);
  const setSkyboxPoleLogoAutoScale = useVisualStore((state) => state.setSkyboxPoleLogoAutoScale);
  const vrComfortMode = useVisualStore((state) => state.vrComfortMode);
  const setVrComfortMode = useVisualStore((state) => state.setVrComfortMode);
  const vrDebugOverlayEnabled = useVisualStore((state) => state.vrDebugOverlayEnabled);
  const setVrDebugOverlayEnabled = useVisualStore((state) => state.setVrDebugOverlayEnabled);
  const orbAnchorMode = useVisualStore((state) => state.orbAnchorMode);
  const setOrbAnchorMode = useVisualStore((state) => state.setOrbAnchorMode);
  const orbDistance = useVisualStore((state) => state.orbDistance);
  const setOrbDistance = useVisualStore((state) => state.setOrbDistance);
  const orbHeight = useVisualStore((state) => state.orbHeight);
  const setOrbHeight = useVisualStore((state) => state.setOrbHeight);
  const orbSideOffset = useVisualStore((state) => state.orbSideOffset);
  const setOrbSideOffset = useVisualStore((state) => state.setOrbSideOffset);
  const orbWorldX = useVisualStore((state) => state.orbWorldX);
  const setOrbWorldX = useVisualStore((state) => state.setOrbWorldX);
  const orbWorldY = useVisualStore((state) => state.orbWorldY);
  const setOrbWorldY = useVisualStore((state) => state.setOrbWorldY);
  const orbWorldZ = useVisualStore((state) => state.orbWorldZ);
  const setOrbWorldZ = useVisualStore((state) => state.setOrbWorldZ);
  const cameraLookAtOrb = useVisualStore((state) => state.cameraLookAtOrb);
  const setCameraLookAtOrb = useVisualStore((state) => state.setCameraLookAtOrb);
  const cameraOrbitEnabled = useVisualStore((state) => state.cameraOrbitEnabled);
  const setCameraOrbitEnabled = useVisualStore((state) => state.setCameraOrbitEnabled);
  const cameraOrbitRenderOnly = useVisualStore((state) => state.cameraOrbitRenderOnly);
  const setCameraOrbitRenderOnly = useVisualStore((state) => state.setCameraOrbitRenderOnly);
  const cameraOrbitSpeed = useVisualStore((state) => state.cameraOrbitSpeed);
  const setCameraOrbitSpeed = useVisualStore((state) => state.setCameraOrbitSpeed);
  const cameraOrbitRadius = useVisualStore((state) => state.cameraOrbitRadius);
  const setCameraOrbitRadius = useVisualStore((state) => state.setCameraOrbitRadius);
  const cameraOrbitHeight = useVisualStore((state) => state.cameraOrbitHeight);
  const setCameraOrbitHeight = useVisualStore((state) => state.setCameraOrbitHeight);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const setWaterEnabled = useVisualStore((state) => state.setWaterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const setWaterColor = useVisualStore((state) => state.setWaterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);
  const setWaterReflectivity = useVisualStore((state) => state.setWaterReflectivity);
  const hasStarNestOverlay =
    skyboxMode !== 'video' ||
    !skyboxVideoUrl ||
    skyboxMaskMode !== 'none' ||
    skyboxRectMaskEnabled ||
    skyboxHoleFixEnabled ||
    skyboxPoleFadeEnabled ||
    skyboxPatchEnabled ||
    skyboxPatch2Enabled ||
    skyboxPatch3Enabled ||
    skyboxPatch4Enabled;

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (skyboxVideoUrl && skyboxVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxVideoUrl);
    }
    setSkyboxVideo(url, file.name);
    setSkyboxMode('video');
    setSkyboxRotationSpeed(0);
  };

  const handleApplyVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    setSkyboxVideo(videoUrlInput.trim(), 'URL Video');
    setSkyboxMode('video');
    setSkyboxRotationSpeed(0);
    setVideoUrlInput('');
  };

  const handleClearVideo = () => {
    if (skyboxVideoUrl && skyboxVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxVideoUrl);
    }
    setSkyboxVideo(null, null);
    setSkyboxMode('shader');
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (skyboxPoleLogoUrl && skyboxPoleLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxPoleLogoUrl);
    }
    setSkyboxPoleLogoUrl(url);
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) return;
    if (skyboxPoleLogoUrl && skyboxPoleLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxPoleLogoUrl);
    }
    setSkyboxPoleLogoUrl(logoUrlInput.trim());
    setLogoUrlInput('');
  };

  const handleClearLogo = () => {
    if (skyboxPoleLogoUrl && skyboxPoleLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxPoleLogoUrl);
    }
    setSkyboxPoleLogoUrl(null);
  };

  const resetMaskSettings = () => {
    setSkyboxMaskThreshold(0.65);
    setSkyboxMaskSoftness(0.08);
    setSkyboxMaskColor('#87ceeb');
    setSkyboxMaskInvert(false);
    setSkyboxMaskPreview(false);
    setSkyboxMaskPreviewSplit(false);
    setSkyboxMaskPreviewMode('tint');
    setSkyboxMaskPreviewColor('#ff00ff');
  };

  const disableMaskDebug = () => {
    setSkyboxMaskPreview(false);
    setSkyboxMaskPreviewSplit(false);
  };

  return (
    <div className="space-y-2">
      {/* Global Settings */}
      <ParameterGroup title="Global Settings" defaultOpen={true}>
        <div>
          <label className="flex justify-between text-white/60 text-xs mb-1">
            <span>Intensity</span>
            <span className="text-white/40">{intensity.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.1}
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </ParameterGroup>

      {/* Particle Layers */}
      <ParameterGroup title={`Particle Layers (${layers.length})`}>
        <div className="space-y-2">
          {layers.map((layer) => (
            <LayerEditor key={layer.id} layer={layer} />
          ))}
        </div>
      </ParameterGroup>

      {/* Orb Placement */}
      <ParameterGroup title="Orb Placement">
        <div className="space-y-3">
          <div>
            <label className="text-white/60 text-xs mb-2 block">Anchor Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrbAnchorMode('viewer')}
                className={`
                  px-3 py-2 rounded text-sm flex-1
                  ${orbAnchorMode === 'viewer'
                    ? 'bg-blue-500/50 text-white border border-blue-400/50'
                    : 'bg-white/10 text-white/60 border border-white/20'
                  }
                `}
              >
                Viewer Anchored
              </button>
              <button
                onClick={() => setOrbAnchorMode('world')}
                className={`
                  px-3 py-2 rounded text-sm flex-1
                  ${orbAnchorMode === 'world'
                    ? 'bg-blue-500/50 text-white border border-blue-400/50'
                    : 'bg-white/10 text-white/60 border border-white/20'
                  }
                `}
              >
                World Anchored
              </button>
            </div>
            <p className="text-white/40 text-xs mt-2">
              Tip: <span className="text-white/70">World Anchored</span> places the orb inside the scene/video skybox.
            </p>
          </div>

          {orbAnchorMode === 'viewer' ? (
            <>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Distance</span>
                  <span className="text-white/40">{orbDistance.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.1}
                  value={orbDistance}
                  onChange={(e) => setOrbDistance(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Height</span>
                  <span className="text-white/40">{orbHeight.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.05}
                  value={orbHeight}
                  onChange={(e) => setOrbHeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Side Offset</span>
                  <span className="text-white/40">{orbSideOffset.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.05}
                  value={orbSideOffset}
                  onChange={(e) => setOrbSideOffset(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>World X</span>
                  <span className="text-white/40">{orbWorldX.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={orbWorldX}
                  onChange={(e) => setOrbWorldX(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>World Y</span>
                  <span className="text-white/40">{orbWorldY.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={orbWorldY}
                  onChange={(e) => setOrbWorldY(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>World Z</span>
                  <span className="text-white/40">{orbWorldZ.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={orbWorldZ}
                  onChange={(e) => setOrbWorldZ(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </ParameterGroup>

      {/* Camera Options */}
      <ParameterGroup title="Camera (Non-VR)">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Look At Orb</span>
            <button
              onClick={() => setCameraLookAtOrb(!cameraLookAtOrb)}
              className={`
                px-3 py-1 rounded text-sm
                ${cameraLookAtOrb
                  ? 'bg-blue-500/50 text-white border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
                }
              `}
            >
              {cameraLookAtOrb ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Orbit Camera</span>
            <button
              onClick={() => setCameraOrbitEnabled(!cameraOrbitEnabled)}
              className={`
                px-3 py-1 rounded text-sm
                ${cameraOrbitEnabled
                  ? 'bg-blue-500/50 text-white border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
                }
              `}
            >
              {cameraOrbitEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {cameraOrbitEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">Render-Only Orbit</span>
                <button
                  onClick={() => setCameraOrbitRenderOnly(!cameraOrbitRenderOnly)}
                  className={`
                    px-3 py-1 rounded text-xs
                    ${cameraOrbitRenderOnly
                      ? 'bg-blue-500/50 text-white border border-blue-400/50'
                      : 'bg-white/10 text-white/60 border border-white/20'
                    }
                  `}
                >
                  {cameraOrbitRenderOnly ? 'ON' : 'OFF'}
                </button>
              </div>
              {orbAnchorMode !== 'world' && (
                <p className="text-white/40 text-xs">
                  Orbit works best with <span className="text-white/70">World Anchored</span> orb.
                </p>
              )}
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Orbit Radius</span>
                  <span className="text-white/40">{cameraOrbitRadius.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.1}
                  value={cameraOrbitRadius}
                  onChange={(e) => setCameraOrbitRadius(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Orbit Speed</span>
                  <span className="text-white/40">{cameraOrbitSpeed.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.01}
                  value={cameraOrbitSpeed}
                  onChange={(e) => setCameraOrbitSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Orbit Height</span>
                  <span className="text-white/40">{cameraOrbitHeight.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={0.1}
                  value={cameraOrbitHeight}
                  onChange={(e) => setCameraOrbitHeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          )}
          <p className="text-white/40 text-xs">
            Camera options are disabled automatically in VR mode.
          </p>
        </div>
      </ParameterGroup>

      {/* Skybox Settings */}
      <ParameterGroup title="Skybox">
        <div className="space-y-3">
          {/* Skybox Mode */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Skybox Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSkyboxMode('shader')}
                className={`
                  px-3 py-2 rounded text-sm flex-1
                  ${skyboxMode === 'shader'
                    ? 'bg-blue-500/50 text-white border border-blue-400/50'
                    : 'bg-white/10 text-white/60 border border-white/20'
                  }
                `}
              >
                Star Nest Shader
              </button>
              <button
                onClick={() => {
                  setSkyboxMode('video');
                  setSkyboxRotationSpeed(0);
                }}
                className={`
                  px-3 py-2 rounded text-sm flex-1
                  ${skyboxMode === 'video'
                    ? 'bg-blue-500/50 text-white border border-blue-400/50'
                    : 'bg-white/10 text-white/60 border border-white/20'
                  }
                `}
              >
                Video Skybox
              </button>
            </div>
          </div>

          {hasStarNestOverlay && (
            <div>
              <label className="text-white/60 text-xs mb-1 block">Skybox Preset</label>
              <select
                value={skyboxPreset.key}
                onChange={(e) => {
                  const preset = STAR_NEST_PRESETS.find((p) => p.key === e.target.value);
                  if (preset) setSkyboxPreset(preset);
                }}
                className="
                  w-full px-2 py-1.5 rounded
                  bg-white/10 border border-white/20
                  text-white text-sm
                  focus:outline-none focus:border-blue-500
                "
              >
                {STAR_NEST_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key} className="bg-slate-800">
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Video Skybox Controls */}
          {skyboxMode === 'video' && (
            <div className="space-y-2 rounded-md border border-white/10 bg-white/5 p-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Upload 360 Video</label>
                <label
                  className="
                    flex items-center justify-between gap-3
                    px-3 py-2 rounded
                    bg-white/5 border border-white/20
                    text-xs text-white/70
                    hover:bg-white/10 hover:border-white/30
                    cursor-pointer
                  "
                >
                  <span className="truncate">
                    {skyboxVideoFileName ?? 'Choose file'}
                  </span>
                  <span className="shrink-0 px-2 py-1 rounded bg-white/10 border border-white/20 text-[10px] uppercase tracking-wide text-white/70">
                    Choose
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="sr-only"
                  />
                </label>
                {skyboxVideoFileName && (
                  <p className="text-xs text-white/40 mt-1">Loaded: {skyboxVideoFileName}</p>
                )}
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">Or paste a URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://example.com/sky.mp4"
                    className="flex-1 px-2 py-1.5 rounded bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleApplyVideoUrl}
                    className="px-3 py-1.5 rounded text-xs bg-blue-500/50 text-white border border-blue-400/50"
                  >
                    Load
                  </button>
                </div>
              </div>

              {skyboxVideoUrl && (
                <button
                  onClick={handleClearVideo}
                  className="px-3 py-1.5 rounded text-xs bg-white/10 text-white/70 border border-white/20"
                >
                  Clear Video
                </button>
              )}

              {/* Masking */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-white/60 text-xs mb-1 block">Masking</label>
                <select
                  value={skyboxMaskMode}
                  onChange={(e) => setSkyboxMaskMode(e.target.value as 'none' | 'luma' | 'chroma')}
                  className="w-full px-2 py-1.5 rounded bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
                >
                  <option value="none" className="bg-slate-800">None</option>
                  <option value="luma" className="bg-slate-800">Luma Key (brightness)</option>
                  <option value="chroma" className="bg-slate-800">Chroma Key (color)</option>
                </select>

                {(skyboxMaskMode !== 'none' || skyboxRectMaskEnabled) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Mask Preview</span>
                      <button
                        onClick={() => setSkyboxMaskPreview(!skyboxMaskPreview)}
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxMaskPreview
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxMaskPreview ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {skyboxMaskMode !== 'none' && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-xs">Invert Mask</span>
                        <button
                          onClick={() => setSkyboxMaskInvert(!skyboxMaskInvert)}
                          className={`
                            px-3 py-1 rounded text-xs
                            ${skyboxMaskInvert
                              ? 'bg-blue-500/50 text-white border border-blue-400/50'
                              : 'bg-white/10 text-white/60 border border-white/20'
                            }
                          `}
                        >
                          {skyboxMaskInvert ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    )}
                    {skyboxMaskPreview && (
                      <>
                        <div>
                          <label className="text-white/60 text-xs mb-1 block">Preview Mode</label>
                          <select
                            value={skyboxMaskPreviewMode}
                            onChange={(e) => setSkyboxMaskPreviewMode(e.target.value as 'tint' | 'matte')}
                            className="w-full px-2 py-1.5 rounded bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
                          >
                            <option value="tint" className="bg-slate-800">Tint</option>
                            <option value="matte" className="bg-slate-800">Matte (alpha)</option>
                          </select>
                        </div>
                        {skyboxMaskPreviewMode === 'tint' && (
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-xs">Preview Color:</span>
                            <input
                              type="color"
                              value={skyboxMaskPreviewColor}
                              onChange={(e) => setSkyboxMaskPreviewColor(e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border border-white/20"
                            />
                            <span className="text-white/40 text-xs font-mono">{skyboxMaskPreviewColor}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-xs">Split View</span>
                          <button
                            onClick={() => setSkyboxMaskPreviewSplit(!skyboxMaskPreviewSplit)}
                            className={`
                              px-3 py-1 rounded text-xs
                              ${skyboxMaskPreviewSplit
                                ? 'bg-blue-500/50 text-white border border-blue-400/50'
                                : 'bg-white/10 text-white/60 border border-white/20'
                              }
                            `}
                          >
                            {skyboxMaskPreviewSplit ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </>
                    )}
                    {skyboxMaskMode === 'chroma' && (
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-xs">Key Color:</span>
                        <input
                          type="color"
                          value={skyboxMaskColor}
                          onChange={(e) => setSkyboxMaskColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-white/20"
                        />
                        <span className="text-white/40 text-xs font-mono">{skyboxMaskColor}</span>
                      </div>
                    )}
                    {skyboxMaskMode !== 'none' && (
                      <>
                        <div>
                          <label className="flex justify-between text-white/60 text-xs mb-1">
                            <span>Threshold</span>
                            <span className="text-white/40">{skyboxMaskThreshold.toFixed(2)}</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={skyboxMaskThreshold}
                            onChange={(e) => setSkyboxMaskThreshold(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-white/60 text-xs mb-1">
                            <span>Softness</span>
                            <span className="text-white/40">{skyboxMaskSoftness.toFixed(2)}</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.01}
                            value={skyboxMaskSoftness}
                            onChange={(e) => setSkyboxMaskSoftness(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                    <button
                      onClick={disableMaskDebug}
                      className="w-full px-3 py-1.5 rounded text-xs bg-white/5 text-white/60 border border-white/20"
                    >
                      Disable Mask Debug
                    </button>
                    <button
                      onClick={resetMaskSettings}
                      className="w-full px-3 py-1.5 rounded text-xs bg-white/10 text-white/70 border border-white/20"
                    >
                      Reset Mask Defaults
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Rect Mask (feathered)</span>
                  <button
                    onClick={() => setSkyboxRectMaskEnabled(!skyboxRectMaskEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxRectMaskEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxRectMaskEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxRectMaskEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Invert Rect</span>
                      <button
                        onClick={() => setSkyboxRectMaskInvert(!skyboxRectMaskInvert)}
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxRectMaskInvert
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxRectMaskInvert ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Center U (left/right)</span>
                        <span className="text-white/40">{skyboxRectMaskU.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxRectMaskU}
                        onChange={(e) => setSkyboxRectMaskU(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Center V (bottom/top)</span>
                        <span className="text-white/40">{skyboxRectMaskV.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxRectMaskV}
                        onChange={(e) => setSkyboxRectMaskV(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Width</span>
                        <span className="text-white/40">{skyboxRectMaskWidth.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.01}
                        value={skyboxRectMaskWidth}
                        onChange={(e) => setSkyboxRectMaskWidth(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Height</span>
                        <span className="text-white/40">{skyboxRectMaskHeight.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.01}
                        value={skyboxRectMaskHeight}
                        onChange={(e) => setSkyboxRectMaskHeight(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Softness</span>
                        <span className="text-white/40">{skyboxRectMaskSoftness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.2}
                        step={0.005}
                        value={skyboxRectMaskSoftness}
                        onChange={(e) => setSkyboxRectMaskSoftness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-white/60 text-xs font-medium">Video Alignment</div>
                <div>
                  <label className="flex justify-between text-white/60 text-xs mb-1">
                    <span>Yaw Offset</span>
                    <span className="text-white/40">{skyboxVideoYaw.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    value={skyboxVideoYaw}
                    onChange={(e) => setSkyboxVideoYaw(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-white/60 text-xs mb-1">
                    <span>Pitch Offset</span>
                    <span className="text-white/40">{skyboxVideoPitch.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={-0.25}
                    max={0.25}
                    step={0.01}
                    value={skyboxVideoPitch}
                    onChange={(e) => setSkyboxVideoPitch(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Seam Blend</span>
                  <button
                    onClick={() => setSkyboxSeamBlendEnabled(!skyboxSeamBlendEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxSeamBlendEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxSeamBlendEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxSeamBlendEnabled && (
                  <div>
                    <label className="flex justify-between text-white/60 text-xs mb-1">
                      <span>Blend Width</span>
                      <span className="text-white/40">{skyboxSeamBlendWidth.toFixed(3)}</span>
                    </label>
                    <input
                      type="range"
                      min={0.005}
                      max={0.2}
                      step={0.005}
                      value={skyboxSeamBlendWidth}
                      onChange={(e) => setSkyboxSeamBlendWidth(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="text-white/50 text-xs leading-relaxed border-t border-white/10 pt-2">
                <div className="text-white/70 font-medium mb-1">Video Skybox Quickstart</div>
                <p>Start with <span className="text-white/80">Luma Key</span> for bright skies.</p>
                <p>Try Threshold <span className="text-white/80">0.55–0.75</span>, Softness <span className="text-white/80">0.05–0.15</span>.</p>
                <p>For blue/green skies, use <span className="text-white/80">Chroma Key</span> and pick the sky color.</p>
                <p>Try Threshold <span className="text-white/80">0.12–0.30</span>, Softness <span className="text-white/80">0.02–0.08</span>.</p>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Hole Fix (near-black)</span>
                  <button
                    onClick={() => setSkyboxHoleFixEnabled(!skyboxHoleFixEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxHoleFixEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxHoleFixEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxHoleFixEnabled && (
                  <>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Hole Threshold</span>
                        <span className="text-white/40">{skyboxHoleFixThreshold.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.6}
                        step={0.01}
                        value={skyboxHoleFixThreshold}
                        onChange={(e) => setSkyboxHoleFixThreshold(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Hole Softness</span>
                        <span className="text-white/40">{skyboxHoleFixSoftness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.4}
                        step={0.01}
                        value={skyboxHoleFixSoftness}
                        onChange={(e) => setSkyboxHoleFixSoftness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Pole Fade (top/bottom)</span>
                  <button
                    onClick={() => setSkyboxPoleFadeEnabled(!skyboxPoleFadeEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPoleFadeEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPoleFadeEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxPoleFadeEnabled && (
                  <>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Pole Start</span>
                        <span className="text-white/40">{skyboxPoleFadeStart.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.6}
                        step={0.01}
                        value={skyboxPoleFadeStart}
                        onChange={(e) => setSkyboxPoleFadeStart(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Pole Softness</span>
                        <span className="text-white/40">{skyboxPoleFadeSoftness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.4}
                        step={0.01}
                        value={skyboxPoleFadeSoftness}
                        onChange={(e) => setSkyboxPoleFadeSoftness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Pole Logo (cover poles)</span>
                  <button
                    onClick={() => setSkyboxPoleLogoEnabled(!skyboxPoleLogoEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPoleLogoEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPoleLogoEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-white/40 text-xs">
                  Places the WAIAN logo at the top/bottom poles.
                </p>
                {skyboxPoleLogoEnabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-white/60 text-xs mb-1 block">Upload Logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="w-full text-xs text-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs mb-1 block">Or paste a URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="flex-1 px-2 py-1.5 rounded bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
                        />
                        <button
                          onClick={handleApplyLogoUrl}
                          className="px-3 py-1.5 rounded text-xs bg-blue-500/50 text-white border border-blue-400/50"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleClearLogo}
                      className="px-3 py-1.5 rounded text-xs bg-white/10 text-white/70 border border-white/20"
                    >
                      Reset to Default Logo
                    </button>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Auto-scale (1080p baseline)</span>
                      <button
                        onClick={() => setSkyboxPoleLogoAutoScale(!skyboxPoleLogoAutoScale)}
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxPoleLogoAutoScale
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxPoleLogoAutoScale ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Logo Size</span>
                        <span className="text-white/40">{skyboxPoleLogoSize.toFixed(1)}</span>
                      </label>
                      <input
                        type="range"
                        min={6}
                        max={60}
                        step={0.5}
                        value={skyboxPoleLogoSize}
                        onChange={(e) => setSkyboxPoleLogoSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Logo Opacity</span>
                        <span className="text-white/40">{skyboxPoleLogoOpacity.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.01}
                        value={skyboxPoleLogoOpacity}
                        onChange={(e) => setSkyboxPoleLogoOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Multi-pick</span>
                  <button
                    onClick={() => setSkyboxPatchPickMulti(!skyboxPatchPickMulti)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPatchPickMulti
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPatchPickMulti ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-white/40 text-xs">
                  Keep picking centers without re-clicking Pick.
                </p>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Patch Mask A (camouflage)</span>
                  <button
                    onClick={() => setSkyboxPatchEnabled(!skyboxPatchEnabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPatchEnabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPatchEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxPatchEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Pick Center</span>
                      <button
                        onClick={() =>
                          setSkyboxPatchPickTarget(
                            skyboxPatchPickTarget === 'patchA' ? 'none' : 'patchA'
                          )
                        }
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxPatchPickTarget === 'patchA'
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxPatchPickTarget === 'patchA' ? 'Cancel' : 'Pick'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch U (left/right)</span>
                        <span className="text-white/40">{skyboxPatchU.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatchU}
                        onChange={(e) => setSkyboxPatchU(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch V (bottom/top)</span>
                        <span className="text-white/40">{skyboxPatchV.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatchV}
                        onChange={(e) => setSkyboxPatchV(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Radius</span>
                        <span className="text-white/40">{skyboxPatchRadius.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.01}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatchRadius}
                        onChange={(e) => setSkyboxPatchRadius(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Softness</span>
                        <span className="text-white/40">{skyboxPatchSoftness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatchSoftness}
                        onChange={(e) => setSkyboxPatchSoftness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Patch Mask B (camouflage)</span>
                  <button
                    onClick={() => setSkyboxPatch2Enabled(!skyboxPatch2Enabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPatch2Enabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPatch2Enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxPatch2Enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Pick Center</span>
                      <button
                        onClick={() =>
                          setSkyboxPatchPickTarget(
                            skyboxPatchPickTarget === 'patchB' ? 'none' : 'patchB'
                          )
                        }
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxPatchPickTarget === 'patchB'
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxPatchPickTarget === 'patchB' ? 'Cancel' : 'Pick'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch U (left/right)</span>
                        <span className="text-white/40">{skyboxPatch2U.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch2U}
                        onChange={(e) => setSkyboxPatch2U(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch V (bottom/top)</span>
                        <span className="text-white/40">{skyboxPatch2V.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch2V}
                        onChange={(e) => setSkyboxPatch2V(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Radius</span>
                        <span className="text-white/40">{skyboxPatch2Radius.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.01}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch2Radius}
                        onChange={(e) => setSkyboxPatch2Radius(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Softness</span>
                        <span className="text-white/40">{skyboxPatch2Softness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch2Softness}
                        onChange={(e) => setSkyboxPatch2Softness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Patch Mask C (camouflage)</span>
                  <button
                    onClick={() => setSkyboxPatch3Enabled(!skyboxPatch3Enabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPatch3Enabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPatch3Enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxPatch3Enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Pick Center</span>
                      <button
                        onClick={() =>
                          setSkyboxPatchPickTarget(
                            skyboxPatchPickTarget === 'patchC' ? 'none' : 'patchC'
                          )
                        }
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxPatchPickTarget === 'patchC'
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxPatchPickTarget === 'patchC' ? 'Cancel' : 'Pick'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch U (left/right)</span>
                        <span className="text-white/40">{skyboxPatch3U.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch3U}
                        onChange={(e) => setSkyboxPatch3U(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch V (bottom/top)</span>
                        <span className="text-white/40">{skyboxPatch3V.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch3V}
                        onChange={(e) => setSkyboxPatch3V(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Radius</span>
                        <span className="text-white/40">{skyboxPatch3Radius.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.01}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch3Radius}
                        onChange={(e) => setSkyboxPatch3Radius(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Softness</span>
                        <span className="text-white/40">{skyboxPatch3Softness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch3Softness}
                        onChange={(e) => setSkyboxPatch3Softness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Patch Mask D (camouflage)</span>
                  <button
                    onClick={() => setSkyboxPatch4Enabled(!skyboxPatch4Enabled)}
                    className={`
                      px-3 py-1 rounded text-xs
                      ${skyboxPatch4Enabled
                        ? 'bg-blue-500/50 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20'
                      }
                    `}
                  >
                    {skyboxPatch4Enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {skyboxPatch4Enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Pick Center</span>
                      <button
                        onClick={() =>
                          setSkyboxPatchPickTarget(
                            skyboxPatchPickTarget === 'patchD' ? 'none' : 'patchD'
                          )
                        }
                        className={`
                          px-3 py-1 rounded text-xs
                          ${skyboxPatchPickTarget === 'patchD'
                            ? 'bg-blue-500/50 text-white border border-blue-400/50'
                            : 'bg-white/10 text-white/60 border border-white/20'
                          }
                        `}
                      >
                        {skyboxPatchPickTarget === 'patchD' ? 'Cancel' : 'Pick'}
                      </button>
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch U (left/right)</span>
                        <span className="text-white/40">{skyboxPatch4U.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch4U}
                        onChange={(e) => setSkyboxPatch4U(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch V (bottom/top)</span>
                        <span className="text-white/40">{skyboxPatch4V.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={skyboxPatch4V}
                        onChange={(e) => setSkyboxPatch4V(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Radius</span>
                        <span className="text-white/40">{skyboxPatch4Radius.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.01}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch4Radius}
                        onChange={(e) => setSkyboxPatch4Radius(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-white/60 text-xs mb-1">
                        <span>Patch Softness</span>
                        <span className="text-white/40">{skyboxPatch4Softness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.005}
                        value={skyboxPatch4Softness}
                        onChange={(e) => setSkyboxPatch4Softness(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Rotation Speed */}
          <div>
            <label className="flex justify-between text-white/60 text-xs mb-1">
              <span>Rotation Speed</span>
              <span className="text-white/40">{skyboxRotationSpeed.toFixed(2)}x</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={skyboxRotationSpeed}
              onChange={(e) => setSkyboxRotationSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* VR Comfort */}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">VR Comfort Mode</span>
            <button
              onClick={() => setVrComfortMode(!vrComfortMode)}
              className={`
                px-3 py-1 rounded text-sm
                ${vrComfortMode
                  ? 'bg-blue-500/50 text-white border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
                }
              `}
            >
              {vrComfortMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-white/40 text-xs">
            Disables skybox rotation and drift while in VR to reduce motion discomfort.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">VR Debug Overlay</span>
            <button
              onClick={() => setVrDebugOverlayEnabled(!vrDebugOverlayEnabled)}
              className={`
                px-3 py-1 rounded text-sm
                ${vrDebugOverlayEnabled
                  ? 'bg-blue-500/50 text-white border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
                }
              `}
            >
              {vrDebugOverlayEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-white/40 text-xs">
            Shows gyroscope values and screen orientation while in VR.
          </p>

          {hasStarNestOverlay && (
            <>
              {/* Audio Reactivity Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Audio Reactive</span>
                <button
                  onClick={() => setSkyboxAudioReactiveEnabled(!skyboxAudioReactiveEnabled)}
                  className={`
                    px-3 py-1 rounded text-sm
                    ${skyboxAudioReactiveEnabled
                      ? 'bg-blue-500/50 text-white border border-blue-400/50'
                      : 'bg-white/10 text-white/60 border border-white/20'
                    }
                  `}
                >
                  {skyboxAudioReactiveEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Audio Reactivity Strength */}
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Audio Reactivity</span>
                  <span className="text-white/40">{skyboxAudioReactivity.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={skyboxAudioReactivity}
                  onChange={(e) => setSkyboxAudioReactivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Drift / Scroll Speed */}
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Drift Speed</span>
                  <span className="text-white/40">{skyboxDriftSpeed.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={skyboxDriftSpeed}
                  onChange={(e) => setSkyboxDriftSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </ParameterGroup>

      {/* Water Settings */}
      <ParameterGroup title="Water">
        <div className="space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Enable Water</span>
            <button
              onClick={() => setWaterEnabled(!waterEnabled)}
              className={`
                px-3 py-1 rounded text-sm
                ${waterEnabled
                  ? 'bg-blue-500/50 text-white border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
                }
              `}
            >
              {waterEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {waterEnabled && (
            <>
              {/* Color */}
              <div className="flex items-center gap-3">
                <span className="text-white/60 text-xs">Color:</span>
                <input
                  type="color"
                  value={waterColor}
                  onChange={(e) => setWaterColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-white/20"
                />
                <span className="text-white/40 text-xs font-mono">{waterColor}</span>
              </div>

              {/* Reflectivity */}
              <div>
                <label className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Reflectivity</span>
                  <span className="text-white/40">{waterReflectivity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={waterReflectivity}
                  onChange={(e) => setWaterReflectivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </ParameterGroup>
    </div>
  );
}
