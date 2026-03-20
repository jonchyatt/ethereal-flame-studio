'use client';

/**
 * ModeSelector - Visual mode picker with WebGL and Cinema tiers
 */

import { useVisualStore } from '@/lib/stores/visualStore';
import type { VisualMode } from '@/types';

const WEBGL_MODES: { mode: VisualMode; label: string }[] = [
  { mode: 'etherealMist', label: 'Mist' },
  { mode: 'etherealFlame', label: 'Flame' },
  { mode: 'solarBreath', label: 'Solar' },
];

const CINEMA_MODES = [
  { id: 'cinema-fire', label: 'Fire', color: 'from-orange-600 to-red-700' },
  { id: 'cinema-water', label: 'Water', color: 'from-cyan-600 to-blue-700' },
  { id: 'cinema-edm', label: 'EDM', color: 'from-violet-600 to-fuchsia-700' },
  { id: 'cinema-luminous', label: 'Luminous', color: 'from-sky-600 to-indigo-700' },
  { id: 'cinema-combo', label: 'Fire+Water', color: 'from-orange-600 to-cyan-700' },
];

export function ModeSelector() {
  const currentMode = useVisualStore((state) => state.currentMode);
  const modeConfigs = useVisualStore((state) => state.modeConfigs);
  const setMode = useVisualStore((state) => state.setMode);

  return (
    <div className="flex flex-col gap-3">
      {/* WebGL Modes */}
      <div>
        <label className="text-white/60 text-[11px] font-semibold uppercase tracking-widest mb-1.5 block">
          WebGL Modes
        </label>
        <div className="flex gap-1.5">
          {WEBGL_MODES.map(({ mode, label }) => {
            const isSelected = currentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] flex-1
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                    : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cinema Modes */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">
            Cinema
          </label>
          <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold uppercase leading-none">
            Blender
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CINEMA_MODES.map(({ id, label, color }) => (
            <button
              key={id}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                bg-gradient-to-r ${color} text-white/80
                hover:text-white hover:shadow-lg hover:scale-[1.03]
                opacity-80 hover:opacity-100
              `}
              title={`Renders with Blender Cycles — select in Create Video to use`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
