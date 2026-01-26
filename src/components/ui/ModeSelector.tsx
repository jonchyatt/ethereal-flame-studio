'use client';

/**
 * ModeSelector - UI for switching between visual modes (Mist/Flame)
 *
 * Features:
 * - Touch-friendly buttons (min-h-[44px])
 * - Clear visual feedback for selected mode
 * - Reads mode configs from visualStore
 */

import { useVisualStore } from '@/lib/stores/visualStore';
import type { VisualMode } from '@/types';

export function ModeSelector() {
  const currentMode = useVisualStore((state) => state.currentMode);
  const modeConfigs = useVisualStore((state) => state.modeConfigs);
  const setMode = useVisualStore((state) => state.setMode);

  const modes: VisualMode[] = ['etherealMist', 'etherealFlame'];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/80 text-sm font-medium">Visual Mode</label>
      <div className="flex gap-2">
        {modes.map((mode) => {
          const config = modeConfigs[mode];
          const isSelected = currentMode === mode;

          return (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all min-h-[44px] flex-1
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }
              `}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
