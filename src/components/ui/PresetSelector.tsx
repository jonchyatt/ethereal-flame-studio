'use client';

/**
 * PresetSelector - UI for switching between Star Nest skybox presets
 *
 * Features:
 * - Touch-friendly select dropdown (min-h-[44px])
 * - Shows all available skybox presets
 * - Updates visualStore on change
 */

import { useVisualStore } from '@/lib/stores/visualStore';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

export function PresetSelector() {
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const setSkyboxPreset = useVisualStore((state) => state.setSkyboxPreset);
  const skyboxMode = useVisualStore((state) => state.skyboxMode);
  const skyboxMaskMode = useVisualStore((state) => state.skyboxMaskMode);
  const skyboxVideoUrl = useVisualStore((state) => state.skyboxVideoUrl);

  const showPreset = skyboxMode !== 'video' || !skyboxVideoUrl || skyboxMaskMode !== 'none';

  if (!showPreset) {
    return null;
  }

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetKey = e.target.value;
    const preset = STAR_NEST_PRESETS.find((p) => p.key === presetKey);
    if (preset) {
      setSkyboxPreset(preset);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/80 text-sm font-medium" htmlFor="preset-select">
        Skybox Preset
      </label>
      <select
        id="preset-select"
        value={skyboxPreset.key}
        onChange={handlePresetChange}
        className="
          px-4 py-2 rounded-lg min-h-[44px]
          bg-white/10 text-white
          border border-white/20
          hover:bg-white/20 focus:bg-white/20
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-all cursor-pointer
        "
      >
        {STAR_NEST_PRESETS.map((preset) => (
          <option key={preset.key} value={preset.key} className="bg-gray-900">
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
