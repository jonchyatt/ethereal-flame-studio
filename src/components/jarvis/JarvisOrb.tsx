'use client';

import { useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbStateManager, OrbAnimationState } from './OrbStateManager';
import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';

// Particle count optimized for mobile
const PARTICLE_COUNT = 200;
const SPAWN_RADIUS = 0.5;
const BASE_SIZE = 3.0;
const LIFETIME = 4.0;

interface JarvisOrbParticlesProps {
  animationState: OrbAnimationState | null;
}

function JarvisOrbParticles({ animationState }: JarvisOrbParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const audioLevel = useJarvisStore((s) => s.audioLevel);

  // Load soft particle texture
  const particleTexture = useLoader(THREE.TextureLoader, '/textures/circle_particle.png');

  // CPU-side particle state (mutable refs, no re-render)
  const birthTimesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const lifetimesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const birthPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const baseSizesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const particleAnglesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));

  // GPU buffer attributes
  const { positions, sizes, colors, alphas } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);

    const birthTimes = birthTimesRef.current;
    const lifetimes = lifetimesRef.current;
    const velocities = velocitiesRef.current;
    const birthPositions = birthPositionsRef.current;
    const baseSizes = baseSizesRef.current;
    const particleAngles = particleAnglesRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spherical spawn position
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = SPAWN_RADIUS * Math.pow(Math.random(), 0.5);

      birthPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      birthPositions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      birthPositions[i * 3 + 2] = Math.cos(phi) * r;

      // Random velocity direction (slow drift)
      const velPhi = Math.acos(2 * Math.random() - 1);
      const velTheta = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;
      velocities[i * 3] = Math.sin(velPhi) * Math.cos(velTheta) * speed;
      velocities[i * 3 + 1] = Math.sin(velPhi) * Math.sin(velTheta) * speed;
      velocities[i * 3 + 2] = Math.cos(velPhi) * speed;

      // Stagger birth times
      birthTimes[i] = -Math.random() * LIFETIME;
      lifetimes[i] = LIFETIME * (0.8 + Math.random() * 0.4);

      // Random base size
      baseSizes[i] = BASE_SIZE * (0.3 + Math.random() * 1.4);

      // Store angle for swirl
      particleAngles[i] = theta;

      // Initialize position
      positions[i * 3] = birthPositions[i * 3];
      positions[i * 3 + 1] = birthPositions[i * 3 + 1];
      positions[i * 3 + 2] = birthPositions[i * 3 + 2];

      // Initialize size and alpha
      sizes[i] = baseSizes[i] * 0.37;
      alphas[i] = 0;

      // Default color (blue)
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 1.0;
    }

    return { positions, sizes, colors, alphas };
  }, []);

  // Animation loop
  useFrame(({ clock }) => {
    if (!geometryRef.current || !animationState) return;

    const time = clock.getElapsedTime();
    const birthTimes = birthTimesRef.current;
    const lifetimes = lifetimesRef.current;
    const velocities = velocitiesRef.current;
    const birthPositions = birthPositionsRef.current;
    const baseSizes = baseSizesRef.current;
    const particleAngles = particleAnglesRef.current;

    const {
      color,
      particleSpread,
      driftSpeed,
      pulseAmplitude,
      swirlSpeed,
      baseIntensity,
      audioReactivity,
    } = animationState;

    // Calculate pulse effect
    const pulsePhase = Math.sin(time * 3) * pulseAmplitude;
    const currentPulse = 1 + pulsePhase;

    // Audio-reactive scale
    const audioScale = 1 + audioLevel * audioReactivity * 0.3;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Calculate age
      let age = time - birthTimes[i];
      const particleLifetime = lifetimes[i];

      // Respawn if dead
      if (age > particleLifetime) {
        // New spherical spawn position
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = SPAWN_RADIUS * Math.pow(Math.random(), 0.5);

        birthPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        birthPositions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        birthPositions[i * 3 + 2] = Math.cos(phi) * r;

        // New random velocity
        const velPhi = Math.acos(2 * Math.random() - 1);
        const velTheta = Math.random() * Math.PI * 2;
        const speed = 0.02 + Math.random() * 0.03;
        velocities[i * 3] = Math.sin(velPhi) * Math.cos(velTheta) * speed;
        velocities[i * 3 + 1] = Math.sin(velPhi) * Math.sin(velTheta) * speed;
        velocities[i * 3 + 2] = Math.cos(velPhi) * speed;

        // Reset birth time
        birthTimes[i] = time;
        age = 0;

        // Update particle angle for swirl
        particleAngles[i] = theta;
      }

      // Normalized age (0 to 1)
      const normAge = age / particleLifetime;

      // Size over lifetime curve (37% birth -> 100% at 20% -> 50% death)
      let sizeMult: number;
      const peakLifetime = 0.2;
      if (normAge < peakLifetime) {
        sizeMult = 0.37 + (1.0 - 0.37) * (normAge / peakLifetime);
      } else {
        sizeMult = 1.0 - (1.0 - 0.5) * ((normAge - peakLifetime) / (1 - peakLifetime));
      }

      // Alpha: fade in/out
      let alpha: number;
      if (normAge < 0.1) {
        alpha = normAge / 0.1;
      } else if (normAge > 0.7) {
        alpha = 1 - (normAge - 0.7) / 0.3;
      } else {
        alpha = 1;
      }

      // Apply audio reactivity to size
      const audioSizeBoost = 1 + audioLevel * audioReactivity * 0.5;

      // Final size with pulse and audio
      sizes[i] = baseSizes[i] * sizeMult * currentPulse * audioSizeBoost;

      // Final alpha
      alphas[i] = alpha * 0.6;

      // Position: base + velocity * age * driftSpeed + swirl
      const bx = birthPositions[i * 3];
      const by = birthPositions[i * 3 + 1];
      const bz = birthPositions[i * 3 + 2];
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];

      // Calculate swirl offset
      const swirlAngle = particleAngles[i] + time * swirlSpeed;
      const swirlOffset = Math.sin(swirlAngle) * 0.05 * swirlSpeed;

      // Apply spread: closer to 0 = tighter, closer to 1 = more dispersed
      const spreadScale = 0.5 + particleSpread * 0.5;

      // Apply all transformations
      const baseX = bx + vx * age * driftSpeed + swirlOffset;
      const baseY = by + vy * age * driftSpeed;
      const baseZ = bz + vz * age * driftSpeed + swirlOffset * 0.5;

      positions[i * 3] = baseX * spreadScale * audioScale;
      positions[i * 3 + 1] = baseY * spreadScale * audioScale;
      positions[i * 3 + 2] = baseZ * spreadScale * audioScale;

      // Update color from animation state
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
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
          uIntensity: { value: animationState?.baseIntensity ?? 1.7 },
          uTexture: { value: particleTexture },
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
            float distanceScale = 150.0 / length(mvPosition.xyz);
            gl_PointSize = aSize * distanceScale;
          }
        `}
        fragmentShader={`
          uniform float uIntensity;
          uniform sampler2D uTexture;

          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            // Sample the soft gradient texture
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            float texAlpha = texColor.a;

            // Distance from center for edge softening
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center) * 2.0;

            // Exponential falloff
            float edgeFade = exp(-dist * dist * 4.5);

            // Combine: texture shape + exponential softening
            float alpha = texAlpha * edgeFade;

            // Discard very transparent pixels
            if (alpha < 0.01) discard;

            // Apply color with intensity
            vec3 color = vColor * uIntensity;

            // Final alpha
            float finalAlpha = alpha * vAlpha * 0.5;

            gl_FragColor = vec4(color, finalAlpha);
          }
        `}
      />
    </points>
  );
}

function JarvisOrbScene() {
  const [animationState, setAnimationState] = useState<OrbAnimationState | null>(null);

  const handleAnimationUpdate = useCallback((state: OrbAnimationState) => {
    setAnimationState(state);
  }, []);

  return (
    <>
      <OrbStateManager onAnimationUpdate={handleAnimationUpdate} />
      <JarvisOrbParticles animationState={animationState} />
    </>
  );
}

interface JarvisOrbProps {
  /** Called when user taps the orb */
  onTap?: () => void;
}

export function JarvisOrb({ onTap }: JarvisOrbProps = {}) {
  const orbState = useJarvisStore((s) => s.orbState);

  // Handle orb tap - per CONTEXT.md: "Tap the orb to activate audio"
  const handleOrbTap = useCallback(() => {
    console.log('[JarvisOrb] Orb tapped, current state:', orbState);
    if (onTap) {
      onTap();
    }
  }, [onTap, orbState]);

  return (
    <div
      className="w-full h-full cursor-pointer select-none"
      onClick={handleOrbTap}
      onTouchStart={(e) => {
        // Prevent browser defaults (image search, text selection, etc.)
        e.preventDefault();
      }}
      onTouchEnd={(e) => {
        // Fire tap on touch end to avoid accidental triggers
        e.preventDefault();
        handleOrbTap();
      }}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      role="button"
      aria-label="Tap to speak"
      tabIndex={0}
      onKeyDown={(e) => {
        // Allow Enter/Space to activate
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOrbTap();
        }
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss gracefully
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[JarvisOrb] WebGL context lost');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('[JarvisOrb] WebGL context restored');
          });
        }}
      >
        <Suspense fallback={null}>
          <JarvisOrbScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
