'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ParticleLayer } from './ParticleLayer';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';

export function ParticleSystem() {
  const { layers, intensity, currentMode, modeConfigs } = useVisualStore();
  const { bass, mids, treble, amplitude } = useAudioStore();

  // Get color palette for current mode
  const colorPalette = modeConfigs[currentMode]?.colorPalette;

  // Global hue cycling for color variation
  const globalHueRef = useRef(0);

  useFrame(({ clock }) => {
    // Slowly cycle hue
    globalHueRef.current += 0.003;

    // Jump faster on audio amplitude
    if (amplitude > 0.5) {
      globalHueRef.current += 0.01 * amplitude;
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
            bass={bass}
            mids={mids}
            treble={treble}
            amplitude={amplitude}
            intensity={intensity}
            globalHue={globalHueRef.current}
            colorPalette={colorPalette}
          />
        ))}
    </group>
  );
}
