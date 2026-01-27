'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleSystem } from '@/components/canvas/ParticleSystem';
import { StarNestSkybox } from '@/components/canvas/StarNestSkybox';
import { WaterPlane } from '@/components/canvas/WaterPlane';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { useVisualStore } from '@/lib/stores/visualStore';

export default function Home() {
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);
  const waterEnabled = useVisualStore((state) => state.waterEnabled);
  const waterColor = useVisualStore((state) => state.waterColor);
  const waterReflectivity = useVisualStore((state) => state.waterReflectivity);

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#000000', position: 'absolute', zIndex: 1 }}
      >
        {/* Star Nest skybox renders behind everything */}
        <StarNestSkybox preset={skyboxPreset} rotationSpeed={skyboxRotationSpeed} />

        {/* Water plane (optional) - renders below particles */}
        {waterEnabled && (
          <Suspense fallback={null}>
            <WaterPlane color={waterColor} reflectivity={waterReflectivity} />
          </Suspense>
        )}

        <OrbitControls />
        <Suspense fallback={null}>
          <ParticleSystem />
{/* Bloom disabled - was washing out skybox
          <EffectComposer multisampling={4}>
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.7}
              luminanceSmoothing={0.3}
              mipmapBlur={true}
            />
          </EffectComposer>
*/}
        </Suspense>
      </Canvas>

      {/* Control panel fixed at bottom - includes mode selector, preset selector, and audio controls */}
      <ControlPanel />
    </main>
  );
}
