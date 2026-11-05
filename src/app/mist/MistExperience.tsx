'use client';

import { useEffect, useState } from 'react';
import ThinkingGlow from '@/components/mist/ThinkingGlow';
import { MIST_PRESETS, type GlowStyle, type MistPresetId } from '@/components/mist/presets';

export default function MistExperience() {
  const [preset, setPreset] = useState<MistPresetId>('whatAmIAppreciatingNow');
  const [style, setStyle] = useState<GlowStyle>('mist');
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setControlsOpen(params.get('controls') === '1');
    const selectedStyle = params.get('style');
    if (selectedStyle === 'vortex' || selectedStyle === 'blend') setStyle(selectedStyle);
    const selected = params.get('preset');
    if (selected && Object.hasOwn(MIST_PRESETS, selected)) setPreset(selected as MistPresetId);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black" data-testid="mist-stage">
      <ThinkingGlow {...MIST_PRESETS[preset]} mode="searching" style={style} />
      <button
        type="button"
        aria-label={controlsOpen ? 'Close mist controls' : 'Open mist controls'}
        aria-expanded={controlsOpen}
        aria-controls="mist-controls"
        onClick={() => setControlsOpen((open) => !open)}
        className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full opacity-20 transition hover:opacity-80 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="h-1 w-1 rounded-full bg-white" aria-hidden="true" />
      </button>
      {controlsOpen && (
        <aside id="mist-controls" aria-label="Mist controls" className="absolute top-16 right-4 max-w-[calc(100%-2rem)] rounded-2xl border border-white/15 bg-black/80 p-4 text-sm text-white backdrop-blur-xl">
          <label className="grid gap-2">
            Palette
            <select value={preset} onChange={(event) => setPreset(event.target.value as MistPresetId)} className="rounded-lg border border-white/20 bg-[#0b0b14] p-2">
              {Object.entries(MIST_PRESETS).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
            </select>
          </label>
          <label className="mt-4 grid gap-2">
            Style
            <select value={style} onChange={(event) => setStyle(event.target.value as GlowStyle)} className="rounded-lg border border-white/20 bg-[#0b0b14] p-2">
              <option value="mist">Mist</option>
              <option value="vortex">Vortex</option>
              <option value="blend">Blend</option>
            </select>
          </label>
        </aside>
      )}
    </main>
  );
}
