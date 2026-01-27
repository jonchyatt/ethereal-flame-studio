'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterPlaneProps {
  color?: string;
  reflectivity?: number;
}

/**
 * WaterPlane Component
 *
 * Animated water surface with wave displacement and subtle reflections.
 * Positioned below the particle system to create a "flame over water" effect.
 *
 * Features:
 * - 3-layer wave animation in vertex shader
 * - Reflectivity-based highlights in fragment shader
 * - Distance-based alpha fade at edges
 * - Configurable color and reflectivity
 */
export function WaterPlane({
  color = '#0a1828',
  reflectivity = 0.4,
}: WaterPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Parse hex color to RGB components
  const colorRGB = useMemo(() => {
    const c = new THREE.Color(color);
    return [c.r, c.g, c.b];
  }, [color]);

  // Create uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(...colorRGB) },
      uReflectivity: { value: reflectivity },
    }),
    [] // Only create once
  );

  // Update uniforms on each frame
  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uReflectivity.value = reflectivity;

    // Update color if it changes
    const c = new THREE.Color(color);
    materialRef.current.uniforms.uColor.value.set(c.r, c.g, c.b);
  });

  const vertexShader = `
    uniform float uTime;

    varying vec2 vUv;
    varying float vWave;
    varying float vDist;

    void main() {
      vUv = uv;

      // Calculate distance from center for edge fade
      vec2 centerOffset = uv - 0.5;
      vDist = length(centerOffset);

      // 3 wave layers for organic water movement
      float wave1 = sin(position.x * 0.5 + uTime * 0.5) * 0.1;
      float wave2 = sin(position.y * 0.3 + uTime * 0.3) * 0.08;
      float wave3 = sin((position.x + position.y) * 0.2 + uTime * 0.4) * 0.05;

      // Combined wave displacement
      float totalWave = wave1 + wave2 + wave3;
      vWave = totalWave;

      // Apply wave to Z position (which becomes Y after rotation)
      vec3 newPosition = position;
      newPosition.z += totalWave;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uReflectivity;
    uniform float uTime;

    varying vec2 vUv;
    varying float vWave;
    varying float vDist;

    void main() {
      // Base water color
      vec3 baseColor = uColor;

      // Wave-based highlight (simulates light reflection on wave peaks)
      float highlight = vWave * uReflectivity * 3.0;
      highlight = max(0.0, highlight);

      // Add subtle shimmer based on wave height
      vec3 finalColor = baseColor + vec3(highlight * 0.5, highlight * 0.6, highlight * 0.8);

      // Fade at far edges only (UV-based, fade starts at 0.4 from center)
      float edgeFade = 1.0 - smoothstep(0.4, 0.5, vDist);

      // Base opacity - more visible
      float alpha = 0.85 * edgeFade;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.8, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[60, 60, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
