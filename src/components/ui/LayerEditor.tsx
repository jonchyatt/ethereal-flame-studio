'use client';

import { ParticleLayerConfig, FrequencyBand } from '@/types';
import { useVisualStore } from '@/lib/stores/visualStore';

interface LayerEditorProps {
  layer: ParticleLayerConfig;
}

// Slider helper component
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <label className="flex justify-between text-white/60 text-xs mb-1">
        <span>{label}</span>
        <span className="text-white/40">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

export function LayerEditor({ layer }: LayerEditorProps) {
  const updateLayer = useVisualStore((state) => state.updateLayer);
  const toggleLayer = useVisualStore((state) => state.toggleLayer);

  const update = (key: keyof ParticleLayerConfig, value: ParticleLayerConfig[typeof key]) => {
    updateLayer(layer.id, { [key]: value });
  };

  const frequencyBands: FrequencyBand[] = ['bass', 'mids', 'treble', 'all'];

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Layer Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
        <span className="text-white/80 text-sm font-medium">{layer.name}</span>
        <button
          onClick={() => toggleLayer(layer.id)}
          className={`
            px-2 py-0.5 text-xs rounded
            ${layer.enabled
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : 'bg-white/10 text-white/50 border border-white/20'
            }
          `}
        >
          {layer.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Layer Parameters */}
      {layer.enabled && (
        <div className="p-3 space-y-3 bg-black/20">
          {/* Core Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Particles"
              value={layer.particleCount}
              min={5}
              max={200}
              step={5}
              onChange={(v) => update('particleCount', v)}
            />
            <Slider
              label="Base Size"
              value={layer.baseSize}
              min={1}
              max={20}
              step={0.5}
              onChange={(v) => update('baseSize', v)}
            />
            <Slider
              label="Spawn Radius"
              value={layer.spawnRadius}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={(v) => update('spawnRadius', v)}
            />
            <Slider
              label="Max Speed"
              value={layer.maxSpeed}
              min={0.001}
              max={0.1}
              step={0.001}
              onChange={(v) => update('maxSpeed', v)}
            />
          </div>

          {/* Lifetime Parameters */}
          <div className="border-t border-white/10 pt-3">
            <p className="text-white/50 text-xs mb-2">Lifetime Curve</p>
            <div className="grid grid-cols-2 gap-3">
              <Slider
                label="Lifetime"
                value={layer.lifetime}
                min={0.5}
                max={10}
                step={0.5}
                unit="s"
                onChange={(v) => update('lifetime', v)}
              />
              <Slider
                label="Peak At"
                value={layer.peakLifetime}
                min={0.1}
                max={0.9}
                step={0.05}
                onChange={(v) => update('peakLifetime', v)}
              />
              <Slider
                label="Size @ Birth"
                value={layer.sizeAtBirth}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => update('sizeAtBirth', v)}
              />
              <Slider
                label="Size @ Peak"
                value={layer.sizeAtPeak}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => update('sizeAtPeak', v)}
              />
              <Slider
                label="Size @ Death"
                value={layer.sizeAtDeath}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => update('sizeAtDeath', v)}
              />
            </div>
          </div>

          {/* Audio Reactivity */}
          <div className="border-t border-white/10 pt-3">
            <p className="text-white/50 text-xs mb-2">Audio Reactivity</p>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Slider
                label="Reactivity"
                value={layer.audioReactivity}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => update('audioReactivity', v)}
              />
              <div>
                <label className="text-white/60 text-xs mb-1 block">Frequency Band</label>
                <select
                  value={layer.frequencyBand}
                  onChange={(e) => update('frequencyBand', e.target.value as FrequencyBand)}
                  className="
                    w-full px-2 py-1.5 rounded
                    bg-white/10 border border-white/20
                    text-white text-sm
                    focus:outline-none focus:border-blue-500
                  "
                >
                  {frequencyBands.map((band) => (
                    <option key={band} value={band} className="bg-slate-800">
                      {band.charAt(0).toUpperCase() + band.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
