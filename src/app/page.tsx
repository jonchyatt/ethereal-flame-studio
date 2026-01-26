'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParticleSystem } from '@/components/canvas/ParticleSystem';
import { StarNestSkybox } from '@/components/canvas/StarNestSkybox';
import { useVisualStore } from '@/lib/stores/visualStore';

export default function Home() {
  const skyboxPreset = useVisualStore((state) => state.skyboxPreset);
  const skyboxRotationSpeed = useVisualStore((state) => state.skyboxRotationSpeed);

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#000000' }}
      >
        {/* Star Nest skybox renders behind everything */}
        <StarNestSkybox preset={skyboxPreset} rotationSpeed={skyboxRotationSpeed} />

        <OrbitControls />
        <ParticleSystem />
      </Canvas>
    </main>
  );
}
