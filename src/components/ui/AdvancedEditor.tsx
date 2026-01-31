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
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const setWaterEnabled = useVisualStore((state) => state.setWaterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const setWaterColor = useVisualStore((state) => state.setWaterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);
  const setWaterReflectivity = useVisualStore((state) => state.setWaterReflectivity);
  const hasStarNestOverlay = skyboxMode !== 'video' || !skyboxVideoUrl || skyboxMaskMode !== 'none';

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (skyboxVideoUrl && skyboxVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxVideoUrl);
    }
    setSkyboxVideo(url, file.name);
    setSkyboxMode('video');
  };

  const handleApplyVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    setSkyboxVideo(videoUrlInput.trim(), 'URL Video');
    setSkyboxMode('video');
    setVideoUrlInput('');
  };

  const handleClearVideo = () => {
    if (skyboxVideoUrl && skyboxVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(skyboxVideoUrl);
    }
    setSkyboxVideo(null, null);
    setSkyboxMode('shader');
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
                onClick={() => setSkyboxMode('video')}
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
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="w-full text-xs text-white/70"
                />
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

                {skyboxMaskMode !== 'none' && (
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
              </div>

              <div className="text-white/50 text-xs leading-relaxed border-t border-white/10 pt-2">
                <div className="text-white/70 font-medium mb-1">Video Skybox Quickstart</div>
                <p>Start with <span className="text-white/80">Luma Key</span> for bright skies.</p>
                <p>Try Threshold <span className="text-white/80">0.55–0.75</span>, Softness <span className="text-white/80">0.05–0.15</span>.</p>
                <p>For blue/green skies, use <span className="text-white/80">Chroma Key</span> and pick the sky color.</p>
                <p>Try Threshold <span className="text-white/80">0.12–0.30</span>, Softness <span className="text-white/80">0.02–0.08</span>.</p>
              </div>
            </div>
          )}

          {/* Rotation Speed */}
          <div>
            <label className="flex justify-between text-white/60 text-xs mb-1">
              <span>Rotation Speed</span>
              <span className="text-white/40">{skyboxRotationSpeed.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={skyboxRotationSpeed}
              onChange={(e) => setSkyboxRotationSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

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
