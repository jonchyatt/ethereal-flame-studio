'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ParticleLayer } from './ParticleLayer';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';

export function ParticleSystem() {
  const { layers, intensity, currentMode, modeConfigs } = useVisualStore();

  // Get color palette for current mode
  const colorPalette = modeConfigs[currentMode]?.colorPalette;

  // Global hue cycling for color variation
  const globalHueRef = useRef(0);

  // Audio reactivity refs for smooth transitions (VIS-12)
  const audioLevelsRef = useRef({
    bass: 0,
    mids: 0,
    treble: 0,
    amplitude: 0,
    isBeat: false,
    currentScale: 1.0,
  });

  useFrame(({ clock }) => {
    // Read audio state directly from store each frame
    const audioState = useAudioStore.getState();

    // Smooth lerp toward target audio levels (VIS-12)
    const lerpFactor = 0.15; // Smooth but responsive
    audioLevelsRef.current.bass += (audioState.bass - audioLevelsRef.current.bass) * lerpFactor;
    audioLevelsRef.current.mids += (audioState.mids - audioLevelsRef.current.mids) * lerpFactor;
    audioLevelsRef.current.treble += (audioState.treble - audioLevelsRef.current.treble) * lerpFactor;
    audioLevelsRef.current.amplitude += (audioState.amplitude - audioLevelsRef.current.amplitude) * lerpFactor;
    audioLevelsRef.current.currentScale = audioState.currentScale;

    // Beat detection is immediate (no lerp for beats)
    audioLevelsRef.current.isBeat = audioState.isBeat;

    // Global hue cycling with audio modulation
    globalHueRef.current += 0.003;

    // Jump faster on audio amplitude
    if (audioLevelsRef.current.amplitude > 0.5) {
      globalHueRef.current += 0.01 * audioLevelsRef.current.amplitude;
    }

    // Keep hue in 0-1 range
    if (globalHueRef.current > 1) {
      globalHueRef.current -= 1;
    }
  });

  return (
    <group>
      {layers
        .filter((layer) => layer.enabled)
        .map((config) => (
          <ParticleLayer
            key={config.id}
            config={config}
            intensity={intensity}
            globalHue={globalHueRef.current}
            colorPalette={colorPalette}
            audioLevelsRef={audioLevelsRef}
          />
        ))}
    </group>
  );
}
