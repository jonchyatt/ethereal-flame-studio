'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleLayerConfig } from '@/types';

interface ParticleLayerProps {
  config: ParticleLayerConfig;
  bass: number;
  mids: number;
  treble: number;
  amplitude: number;
  intensity: number;
  globalHue: number;
}

export function ParticleLayer({
  config,
  bass,
  mids,
  treble,
  amplitude,
  intensity,
  globalHue,
}: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const {
    particleCount,
    baseSize,
    spawnRadius,
    maxSpeed,
    lifetime,
    sizeAtBirth,
    sizeAtPeak,
    sizeAtDeath,
    peakLifetime,
    colorStart,
    colorEnd,
  } = config;

  // CPU-side particle state (mutable refs, no re-render)
  const birthTimesRef = useRef<Float32Array>(new Float32Array(particleCount));
  const lifetimesRef = useRef<Float32Array>(new Float32Array(particleCount));
  const velocitiesRef = useRef<Float32Array>(new Float32Array(particleCount * 3));
  const birthPositionsRef = useRef<Float32Array>(new Float32Array(particleCount * 3));
  const baseSizesRef = useRef<Float32Array>(new Float32Array(particleCount));

  // GPU buffer attributes
  const { positions, sizes, colors, alphas } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);

    // Initialize particles
    const birthTimes = birthTimesRef.current;
    const lifetimes = lifetimesRef.current;
    const velocities = velocitiesRef.current;
    const birthPositions = birthPositionsRef.current;
    const baseSizes = baseSizesRef.current;

    for (let i = 0; i < particleCount; i++) {
      // Random direction on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);

      // Spawn position
      const spawnDist = spawnRadius * Math.random();
      birthPositions[i * 3] = dirX * spawnDist;
      birthPositions[i * 3 + 1] = dirY * spawnDist;
      birthPositions[i * 3 + 2] = dirZ * spawnDist;

      // Outward velocity
      const speed = maxSpeed * (0.5 + Math.random() * 0.5);
      velocities[i * 3] = dirX * speed;
      velocities[i * 3 + 1] = dirY * speed;
      velocities[i * 3 + 2] = dirZ * speed;

      // Stagger birth times
      birthTimes[i] = -Math.random() * lifetime;
      lifetimes[i] = lifetime * (0.8 + Math.random() * 0.4);

      // Random base size with variation
      baseSizes[i] = baseSize * (0.7 + Math.random() * 0.6);

      // Initial position
      positions[i * 3] = birthPositions[i * 3];
      positions[i * 3 + 1] = birthPositions[i * 3 + 1];
      positions[i * 3 + 2] = birthPositions[i * 3 + 2];

      // Initial size and alpha
      sizes[i] = baseSizes[i] * sizeAtBirth;
      alphas[i] = 0;

      // Initial color
      if (colorStart) {
        colors[i * 3] = colorStart[0];
        colors[i * 3 + 1] = colorStart[1];
        colors[i * 3 + 2] = colorStart[2];
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }
    }

    return { positions, sizes, colors, alphas };
  }, [
    particleCount,
    baseSize,
    spawnRadius,
    maxSpeed,
    lifetime,
    sizeAtBirth,
    sizeAtPeak,
    sizeAtDeath,
    peakLifetime,
    colorStart,
  ]);

  // Animation loop
  useFrame(({ clock }) => {
    if (!geometryRef.current) return;

    const time = clock.getElapsedTime();
    const birthTimes = birthTimesRef.current;
    const lifetimes = lifetimesRef.current;
    const velocities = velocitiesRef.current;
    const birthPositions = birthPositionsRef.current;
    const baseSizes = baseSizesRef.current;

    for (let i = 0; i < particleCount; i++) {
      // Calculate age
      let age = time - birthTimes[i];
      const particleLifetime = lifetimes[i];

      // Respawn if dead
      if (age > particleLifetime) {
        // New random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dirX = Math.sin(phi) * Math.cos(theta);
        const dirY = Math.sin(phi) * Math.sin(theta);
        const dirZ = Math.cos(phi);

        // New spawn position
        const spawnDist = spawnRadius * Math.random();
        birthPositions[i * 3] = dirX * spawnDist;
        birthPositions[i * 3 + 1] = dirY * spawnDist;
        birthPositions[i * 3 + 2] = dirZ * spawnDist;

        // New velocity
        const speed = maxSpeed * (0.5 + Math.random() * 0.5);
        velocities[i * 3] = dirX * speed;
        velocities[i * 3 + 1] = dirY * speed;
        velocities[i * 3 + 2] = dirZ * speed;

        // Reset birth time
        birthTimes[i] = time;
        age = 0;

        // New color based on global hue
        const hue = (globalHue + Math.random() * 0.1) % 1;
        const rgb = hslToRgb(hue, 0.8, 0.6);
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];
      }

      // Normalized age (0 to 1)
      const normAge = age / particleLifetime;

      // SIZE OVER LIFETIME CURVE (VIS-10) - THE MAGIC
      let sizeMult: number;
      if (normAge < peakLifetime) {
        // Birth to peak: 37% -> 100%
        sizeMult =
          sizeAtBirth +
          (sizeAtPeak - sizeAtBirth) * (normAge / peakLifetime);
      } else {
        // Peak to death: 100% -> 50%
        sizeMult =
          sizeAtPeak -
          (sizeAtPeak - sizeAtDeath) *
            ((normAge - peakLifetime) / (1 - peakLifetime));
      }

      // ALPHA: Fade in first 10%, full 10-70%, fade out last 30%
      let alpha: number;
      if (normAge < 0.1) {
        alpha = normAge / 0.1; // Fade in
      } else if (normAge > 0.7) {
        alpha = 1 - (normAge - 0.7) / 0.3; // Fade out
      } else {
        alpha = 1; // Full opacity
      }

      // Update size
      sizes[i] = baseSizes[i] * sizeMult;

      // Update alpha
      alphas[i] = alpha;

      // Update position
      const scale = 1.0;
      positions[i * 3] =
        birthPositions[i * 3] + velocities[i * 3] * age * scale;
      positions[i * 3 + 1] =
        birthPositions[i * 3 + 1] + velocities[i * 3 + 1] * age * scale;
      positions[i * 3 + 2] =
        birthPositions[i * 3 + 2] + velocities[i * 3 + 2] * age * scale;
    }

    // Mark attributes as needing update
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.aSize.needsUpdate = true;
    geometryRef.current.attributes.aAlpha.needsUpdate = true;
    geometryRef.current.attributes.aColor.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aAlpha"
          args={[alphas, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uIntensity: { value: intensity },
        }}
        vertexShader={`
          attribute float aSize;
          attribute float aAlpha;
          attribute vec3 aColor;

          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vAlpha = aAlpha;
            vColor = aColor;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Distance-based size attenuation
            float distanceScale = 100.0 / length(mvPosition.xyz);
            gl_PointSize = aSize * distanceScale;
          }
        `}
        fragmentShader={`
          uniform float uIntensity;

          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);

            // Soft circular gradient with smooth falloff
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            alpha = pow(alpha, 0.8); // Softer falloff for glow

            // Bright core + soft bloom + halo
            float core = exp(-dist * 4.0) * 0.8;
            float bloom = exp(-dist * 1.5) * 0.3;
            float halo = exp(-dist * 8.0) * 0.4;

            vec3 color = vColor * uIntensity * (1.0 + core + bloom);
            float finalAlpha = (alpha + halo) * vAlpha * 0.85;

            gl_FragColor = vec4(color, finalAlpha);
          }
        `}
      />
    </points>
  );
}

// Helper: HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}
