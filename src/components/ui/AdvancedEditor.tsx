'use client';

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
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const setWaterEnabled = useVisualStore((state) => state.setWaterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const setWaterColor = useVisualStore((state) => state.setWaterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);
  const setWaterReflectivity = useVisualStore((state) => state.setWaterReflectivity);

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
          {/* Preset Selector */}
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
