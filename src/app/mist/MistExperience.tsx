'use client';

import { useEffect, useState } from 'react';
import ThinkingGlow from '@/components/mist/ThinkingGlow';
import { MIST_PRESETS, type GlowStyle, type MistPresetId } from '@/components/mist/presets';
import '@/components/scenes/public-scene.css';

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
    <main className="fixed inset-0 overflow-hidden bg-black" data-testid="mist-stage" data-scene-ui="mist">
      <ThinkingGlow {...MIST_PRESETS[preset]} mode="searching" style={style} />
      <header className="scene-toolbar">
        <h1 className="scene-title">Mist</h1>
        <button
          type="button"
          data-sc-primary
          aria-label={controlsOpen ? 'Close mist controls' : 'Open mist controls'}
          aria-expanded={controlsOpen}
          aria-controls="mist-controls"
          onClick={() => setControlsOpen((open) => !open)}
          className="scene-controls-toggle"
        >
          {controlsOpen ? 'Close mist controls' : 'Open mist controls'}
        </button>
      </header>
      {controlsOpen && (
        <aside id="mist-controls" aria-label="Mist controls" className="scene-control-panel">
          <label>
            Palette
            <select value={preset} onChange={(event) => setPreset(event.target.value as MistPresetId)}>
              {Object.entries(MIST_PRESETS).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
            </select>
          </label>
          <label>
            Style
            <select value={style} onChange={(event) => setStyle(event.target.value as GlowStyle)}>
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
