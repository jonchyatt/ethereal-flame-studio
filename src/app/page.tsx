'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#000000' }}
      >
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#3FBFB5" />
        </mesh>
      </Canvas>
    </main>
  );
}
