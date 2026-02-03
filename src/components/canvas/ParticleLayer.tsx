'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleLayerConfig } from '@/types';
import { useRenderMode } from '@/hooks/useRenderMode';

interface ParticleLayerProps {
  config: ParticleLayerConfig;
  intensity: number;
  globalHue: number;
  colorPalette?: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
  };
  audioLevelsRef: React.MutableRefObject<{
    bass: number;
    mids: number;
    treble: number;
    amplitude: number;
    isBeat: boolean;
    currentScale: number;
  }>;
}

export function ParticleLayer({
  config,
  intensity,
  globalHue,
  colorPalette,
  audioLevelsRef,
}: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Render mode support for headless rendering
  const renderMode = useRenderMode();

  // Load soft particle texture from Unity
  const particleTexture = useLoader(THREE.TextureLoader, '/textures/circle_particle.png');

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

  // Smoothed audio values for fluid response
  const smoothedAudioRef = useRef({ amplitude: 0, beat: 1.0 });

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

    // Check mode
    const isFlame = config.id.includes('flame');

    for (let i = 0; i < particleCount; i++) {
      // Random angle on ring (horizontal plane)
      const theta = Math.random() * Math.PI * 2;

      // Speed with variation
      const speed = maxSpeed * (0.5 + Math.random() * 0.5);

      if (isFlame) {
        // FLAME: 3D organic blob with asymmetry in all axes
        const centerBias = Math.pow(Math.random(), 0.5);
        const baseRadius = spawnRadius * centerBias * 1.2;

        // 3D blob effect - asymmetric bulges in all directions
        const blobPhi = Math.acos(2 * Math.random() - 1); // Random elevation for blob
        const blobTheta = Math.random() * Math.PI * 2; // Random azimuth for blob
        const blobStrength = Math.random() * 0.06;
        const blobX = Math.sin(blobPhi) * Math.cos(blobTheta) * blobStrength;
        const blobY = Math.sin(blobPhi) * Math.sin(blobTheta) * blobStrength;
        const blobZ = Math.cos(blobPhi) * blobStrength;

        // 3D asymmetry - gentle variation in all axes
        const asymX = (Math.random() - 0.5) * 0.08;
        const asymY = (Math.random() - 0.5) * 0.08;
        const asymZ = (Math.random() - 0.5) * 0.08;

        // Spherical base position with 3D organic variation
        const phi = Math.acos(2 * Math.random() - 1);
        const basePosX = Math.sin(phi) * Math.cos(theta) * baseRadius;
        const basePosY = Math.sin(phi) * Math.sin(theta) * baseRadius;
        const basePosZ = Math.cos(phi) * baseRadius;

        birthPositions[i * 3] = basePosX + asymX + blobX;
        birthPositions[i * 3 + 1] = basePosY + asymY + blobY;
        birthPositions[i * 3 + 2] = basePosZ + asymZ + blobZ;

        // Varied velocity - particles leave in random directions from center
        const randomPhi = Math.acos(2 * Math.random() - 1); // Random elevation
        const randomTheta = Math.random() * Math.PI * 2; // Random azimuth
        const dirX = Math.sin(randomPhi) * Math.cos(randomTheta);
        const dirY = Math.sin(randomPhi) * Math.sin(randomTheta);
        const dirZ = Math.cos(randomPhi);
        const velSpeed = speed * (0.3 + Math.random() * 0.7);
        velocities[i * 3] = dirX * velSpeed;
        velocities[i * 3 + 1] = dirY * velSpeed;
        velocities[i * 3 + 2] = dirZ * velSpeed;
      } else {
        // Default/Mist: same 3D organic spawn as Flame
        const centerBias = Math.pow(Math.random(), 0.5);
        const baseRadius = spawnRadius * centerBias * 1.2;

        // 3D blob effect - asymmetric bulges in all directions
        const blobPhi = Math.acos(2 * Math.random() - 1);
        const blobTheta = Math.random() * Math.PI * 2;
        const blobStrength = Math.random() * 0.06;
        const blobX = Math.sin(blobPhi) * Math.cos(blobTheta) * blobStrength;
        const blobY = Math.sin(blobPhi) * Math.sin(blobTheta) * blobStrength;
        const blobZ = Math.cos(blobPhi) * blobStrength;

        // 3D asymmetry
        const asymX = (Math.random() - 0.5) * 0.08;
        const asymY = (Math.random() - 0.5) * 0.08;
        const asymZ = (Math.random() - 0.5) * 0.08;

        // Spherical base position with 3D organic variation
        const phi = Math.acos(2 * Math.random() - 1);
        const basePosX = Math.sin(phi) * Math.cos(theta) * baseRadius;
        const basePosY = Math.sin(phi) * Math.sin(theta) * baseRadius;
        const basePosZ = Math.cos(phi) * baseRadius;

        birthPositions[i * 3] = basePosX + asymX + blobX;
        birthPositions[i * 3 + 1] = basePosY + asymY + blobY;
        birthPositions[i * 3 + 2] = basePosZ + asymZ + blobZ;

        // Random velocity direction
        const velPhi = Math.acos(2 * Math.random() - 1);
        const velTheta = Math.random() * Math.PI * 2;
        const velDirX = Math.sin(velPhi) * Math.cos(velTheta);
        const velDirY = Math.sin(velPhi) * Math.sin(velTheta);
        const velDirZ = Math.cos(velPhi);
        const velSpeed = speed * (0.3 + Math.random() * 0.7);
        velocities[i * 3] = velDirX * velSpeed;
        velocities[i * 3 + 1] = velDirY * velSpeed;
        velocities[i * 3 + 2] = velDirZ * velSpeed;
      }

      // Stagger birth times
      birthTimes[i] = -Math.random() * lifetime;
      lifetimes[i] = lifetime * (0.8 + Math.random() * 0.4);

      // Random base size with very wide variation (0.15x to 2.0x)
      baseSizes[i] = baseSize * (0.15 + Math.random() * 1.85);

      // Initial position
      positions[i * 3] = birthPositions[i * 3];
      positions[i * 3 + 1] = birthPositions[i * 3 + 1];
      positions[i * 3 + 2] = birthPositions[i * 3 + 2];

      // Initial size and alpha
      sizes[i] = baseSizes[i] * sizeAtBirth;
      alphas[i] = 0;

      // Initial color
      const isMist = config.id.includes('mist');
      if (isMist && colorPalette) {
        // Mist: use palette with variation
        const colorMix = Math.random();
        const rgb = lerpColor(
          colorPalette.primary,
          colorPalette.secondary,
          colorMix
        );
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];
      } else if (isFlame && colorPalette) {
        // Flame: start with saturated rainbow (NOT white/yellow)
        const particleHue = (i * 0.13) % 1.0;
        const rgb = hslToRgb(particleHue, 1.0, 0.55);
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];
      } else if (colorStart) {
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

  // Detect mode for special rendering
  const isMistMode = config.id.includes('mist');
  const isFlameMode = config.id.includes('flame');

  // Animation loop
  useFrame(({ clock }) => {
    if (!geometryRef.current) return;

    // Use render mode time if active, otherwise use real clock
    const time = renderMode.isActive && renderMode.elapsedTime !== null
      ? renderMode.elapsedTime
      : clock.getElapsedTime();

    const birthTimes = birthTimesRef.current;
    const lifetimes = lifetimesRef.current;
    const velocities = velocitiesRef.current;
    const birthPositions = birthPositionsRef.current;
    const baseSizes = baseSizesRef.current;

    // Get audio levels - use render mode audio if active, otherwise use real-time ref
    const audioLevels = renderMode.isActive && renderMode.audioData
      ? {
          bass: renderMode.audioData.bass,
          mids: renderMode.audioData.mid,
          treble: renderMode.audioData.high,
          amplitude: renderMode.audioData.amplitude,
          isBeat: renderMode.audioData.isBeat,
          currentScale: 1.0,
        }
      : audioLevelsRef.current;

    // Determine which frequency band affects this layer (VIS-08, VIS-09)
    let bandAmplitude = audioLevels.amplitude; // Default: all frequencies
    const band = config.frequencyBand;
    if (band === 'bass') {
      bandAmplitude = audioLevels.bass;
    } else if (band === 'mids') {
      bandAmplitude = audioLevels.mids;
    } else if (band === 'treble') {
      bandAmplitude = audioLevels.treble;
    }

    // Asymmetric smoothing - fast attack (bloom up), slow decay (fade down)
    const smoothed = smoothedAudioRef.current;
    const attackSmoothing = 0.4; // Very fast rise when audio increases
    const releaseSmoothing = 0.04; // Slow fade when audio decreases
    const isRising = bandAmplitude > smoothed.amplitude;
    const smoothing = isRising ? attackSmoothing : releaseSmoothing;
    smoothed.amplitude += (bandAmplitude - smoothed.amplitude) * smoothing;

    // Smooth beat pulse (quick attack, slow decay) - visible but not overwhelming
    const targetBeat = audioLevels.isBeat ? 1.15 : 1.0; // Visible beat pulse
    const beatSmoothing = audioLevels.isBeat ? 0.3 : 0.05; // Quick attack, moderate decay
    smoothed.beat += (targetBeat - smoothed.beat) * beatSmoothing;

    for (let i = 0; i < particleCount; i++) {
      // Calculate age
      let age = time - birthTimes[i];
      const particleLifetime = lifetimes[i];

      // Respawn if dead
      if (age > particleLifetime) {
        const theta = Math.random() * Math.PI * 2;
        const speed = maxSpeed * (0.5 + Math.random() * 0.5);

        if (isFlameMode) {
          // FLAME: 3D organic blob respawn
          const centerBias = Math.pow(Math.random(), 0.5);
          const baseRadius = spawnRadius * centerBias * 1.2;

          // 3D blob effect
          const blobPhi = Math.acos(2 * Math.random() - 1);
          const blobTheta = Math.random() * Math.PI * 2;
          const blobStrength = Math.random() * 0.06;
          const blobX = Math.sin(blobPhi) * Math.cos(blobTheta) * blobStrength;
          const blobY = Math.sin(blobPhi) * Math.sin(blobTheta) * blobStrength;
          const blobZ = Math.cos(blobPhi) * blobStrength;

          // 3D asymmetry
          const asymX = (Math.random() - 0.5) * 0.08;
          const asymY = (Math.random() - 0.5) * 0.08;
          const asymZ = (Math.random() - 0.5) * 0.08;

          // Spherical base position
          const phi = Math.acos(2 * Math.random() - 1);
          const basePosX = Math.sin(phi) * Math.cos(theta) * baseRadius;
          const basePosY = Math.sin(phi) * Math.sin(theta) * baseRadius;
          const basePosZ = Math.cos(phi) * baseRadius;

          birthPositions[i * 3] = basePosX + asymX + blobX;
          birthPositions[i * 3 + 1] = basePosY + asymY + blobY;
          birthPositions[i * 3 + 2] = basePosZ + asymZ + blobZ;

          // Random velocity direction
          const randomPhi = Math.acos(2 * Math.random() - 1);
          const randomTheta = Math.random() * Math.PI * 2;
          const dirX = Math.sin(randomPhi) * Math.cos(randomTheta);
          const dirY = Math.sin(randomPhi) * Math.sin(randomTheta);
          const dirZ = Math.cos(randomPhi);
          const velSpeed = speed * (0.3 + Math.random() * 0.7);
          velocities[i * 3] = dirX * velSpeed;
          velocities[i * 3 + 1] = dirY * velSpeed;
          velocities[i * 3 + 2] = dirZ * velSpeed;
        } else {
          // Default/Mist: same 3D organic blob respawn
          const centerBias = Math.pow(Math.random(), 0.5);
          const baseRadius = spawnRadius * centerBias * 1.2;

          // 3D blob effect
          const blobPhi = Math.acos(2 * Math.random() - 1);
          const blobTheta = Math.random() * Math.PI * 2;
          const blobStrength = Math.random() * 0.06;
          const blobX = Math.sin(blobPhi) * Math.cos(blobTheta) * blobStrength;
          const blobY = Math.sin(blobPhi) * Math.sin(blobTheta) * blobStrength;
          const blobZ = Math.cos(blobPhi) * blobStrength;

          // 3D asymmetry
          const asymX = (Math.random() - 0.5) * 0.08;
          const asymY = (Math.random() - 0.5) * 0.08;
          const asymZ = (Math.random() - 0.5) * 0.08;

          // Spherical base position
          const phi = Math.acos(2 * Math.random() - 1);
          const basePosX = Math.sin(phi) * Math.cos(theta) * baseRadius;
          const basePosY = Math.sin(phi) * Math.sin(theta) * baseRadius;
          const basePosZ = Math.cos(phi) * baseRadius;

          birthPositions[i * 3] = basePosX + asymX + blobX;
          birthPositions[i * 3 + 1] = basePosY + asymY + blobY;
          birthPositions[i * 3 + 2] = basePosZ + asymZ + blobZ;

          // Random velocity direction
          const velPhi = Math.acos(2 * Math.random() - 1);
          const velTheta = Math.random() * Math.PI * 2;
          const velDirX = Math.sin(velPhi) * Math.cos(velTheta);
          const velDirY = Math.sin(velPhi) * Math.sin(velTheta);
          const velDirZ = Math.cos(velPhi);
          const velSpeed = speed * (0.3 + Math.random() * 0.7);
          velocities[i * 3] = velDirX * velSpeed;
          velocities[i * 3 + 1] = velDirY * velSpeed;
          velocities[i * 3 + 2] = velDirZ * velSpeed;
        }

        // Reset birth time
        birthTimes[i] = time;
        age = 0;

        // New color based on mode
        if (isMistMode && colorPalette) {
          // Mist: interpolate between palette colors with slow oscillation
          const colorOscillation = Math.sin(time * 0.3 + i * 0.1) * 0.5 + 0.5;
          const rgb = lerpColor(
            colorPalette.primary,
            colorPalette.secondary,
            colorOscillation
          );
          colors[i * 3] = rgb[0];
          colors[i * 3 + 1] = rgb[1];
          colors[i * 3 + 2] = rgb[2];
        } else if (isFlameMode && colorPalette) {
          // Flame: saturated rainbow (NOT white/yellow)
          const particleHue = (i * 0.13 + time * 0.03) % 1.0;
          const rgb = hslToRgb(particleHue, 1.0, 0.55);
          colors[i * 3] = rgb[0];
          colors[i * 3 + 1] = rgb[1];
          colors[i * 3 + 2] = rgb[2];
        } else {
          // Default: color based on global hue
          const hue = (globalHue + Math.random() * 0.1) % 1;
          const rgb = hslToRgb(hue, 0.8, 0.6);
          colors[i * 3] = rgb[0];
          colors[i * 3 + 1] = rgb[1];
          colors[i * 3 + 2] = rgb[2];
        }
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

      // ALPHA: Mode-specific fade curves
      let alpha: number;
      if (isFlameMode) {
        // Flame: sharp fade in/out for flickering effect
        if (normAge < 0.05) {
          alpha = normAge / 0.05; // 5% fade in
        } else if (normAge < 0.5) {
          alpha = 1.0; // Full opacity
        } else {
          alpha = 1.0 - ((normAge - 0.5) / 0.5); // 50% fade out
        }
      } else if (isMistMode) {
        // Mist: Slower fade in (15%), full opacity (15-60%), gradual fade out (40%)
        if (normAge < 0.15) {
          alpha = normAge / 0.15; // Slower fade in
        } else if (normAge > 0.6) {
          alpha = 1 - (normAge - 0.6) / 0.4; // Gradual fade out
        } else {
          alpha = 1; // Full opacity
        }
        // Light softness for ethereal look (fewer particles = can use higher alpha)
        alpha *= 0.6;
      } else {
        // Default: Fade in first 10%, full 10-70%, fade out last 30%
        if (normAge < 0.1) {
          alpha = normAge / 0.1; // Fade in
        } else if (normAge > 0.7) {
          alpha = 1 - (normAge - 0.7) / 0.3; // Fade out
        } else {
          alpha = 1; // Full opacity
        }
      }

      // Flame-specific: nuanced rainbow center -> warm edges
      // NO bright white/yellow - keep saturated throughout
      if (colorPalette && isFlameMode) {
        const t = normAge;
        let color: [number, number, number];

        // Rainbow hue per particle with time variation
        const particleHue = (i * 0.13 + time * 0.02) % 1.0;

        if (t < 0.35) {
          // Young/center: saturated rainbow (lightness 0.5 = no white)
          color = hslToRgb(particleHue, 1.0, 0.5);
        } else if (t < 0.65) {
          // Mid-age: rainbow fading toward warm orange
          const warmT = (t - 0.35) / 0.3;
          const rainbow = hslToRgb(particleHue, 1.0, 0.5);
          const orange: [number, number, number] = [0.95, 0.5, 0.1];
          color = lerpColor(rainbow, orange, warmT);
        } else {
          // Old/edges: orange to deep red
          const redT = (t - 0.65) / 0.35;
          const orange: [number, number, number] = [0.95, 0.5, 0.1];
          const red: [number, number, number] = [0.8, 0.2, 0.1];
          color = lerpColor(orange, red, redT);
        }

        colors[i * 3] = color[0];
        colors[i * 3 + 1] = color[1];
        colors[i * 3 + 2] = color[2];
      }

      // Apply audio reactivity to size (VIS-08, VIS-09) using smoothed values
      // Moderate multipliers - visible reaction while preserving organic look
      let audioSizeMultiplier = 1.0;
      const reactivity = config.audioReactivity || 0;
      if (reactivity > 0) {
        // Visible size reaction - up to ~1.4x at full amplitude
        const rawMultiplier = 1.0 + smoothed.amplitude * reactivity * 0.5;
        // Cap at 1.4x to prevent blowout while allowing visible response
        audioSizeMultiplier = Math.min(rawMultiplier, 1.4);
      }

      // Apply smoothed beat pulse effect (AUD-04)
      const finalSizeMultiplier = sizeMult * audioSizeMultiplier * smoothed.beat;

      // Update size
      sizes[i] = baseSizes[i] * finalSizeMultiplier;

      // Update alpha - AUDIO-DRIVEN VISIBILITY
      // Low visibility when silent, full visibility with audio
      // Use power curve for more dramatic on/off effect
      const audioVisibility = Math.pow(smoothed.amplitude, 0.5); // sqrt for faster rise
      const minVisibility = 0.15; // Low baseline - particles fade when quiet but don't vanish
      const visibilityMultiplier = minVisibility + audioVisibility * (1.0 - minVisibility);

      alphas[i] = alpha * visibilityMultiplier;

      // Apply audio reactivity to position scale (expansion/contraction) using smoothed values
      // Moderate expansion - visible "breathing" effect
      let scale = 1.0;
      if (reactivity > 0) {
        // Visible expansion - up to ~1.2x
        const rawScale = 1.0 + smoothed.amplitude * reactivity * 0.15;
        // Cap at 1.2x for visible but controlled breathing
        scale = Math.min(rawScale, 1.2);
      }
      const bx = birthPositions[i * 3];
      const by = birthPositions[i * 3 + 1];
      const bz = birthPositions[i * 3 + 2];
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];

      if (isFlameMode && age > 0) {
        // Gentle turbulence for nebula float effect
        // Lower frequency, smaller displacement
        const t1 = Math.sin(age * 6 + i * 0.7) * 0.02;
        const t2 = Math.cos(age * 4 + i * 1.3) * 0.015;
        const t3 = Math.sin(age * 2.5 + i * 2.1) * 0.01;
        const flickerX = t1 + t2;
        const flickerZ = t2 + t3;
        const flickerY = Math.sin(age * 3 + i) * 0.007; // Very subtle Y wobble

        positions[i * 3] = (bx + vx * age + flickerX) * scale;
        positions[i * 3 + 1] = (by + vy * age + flickerY) * scale;
        positions[i * 3 + 2] = (bz + vz * age + flickerZ) * scale;
      } else if (isMistMode && age > 0) {
        // Gentle drifting for mist
        const drift = Math.sin(age * 2 + i * 0.5) * 0.02;
        positions[i * 3] = (bx + vx * age + drift) * scale;
        positions[i * 3 + 1] = (by + vy * age) * scale;
        positions[i * 3 + 2] = (bz + vz * age + drift * 0.5) * scale;
      } else {
        positions[i * 3] = (bx + vx * age) * scale;
        positions[i * 3 + 1] = (by + vy * age) * scale;
        positions[i * 3 + 2] = (bz + vz * age) * scale;
      }
    }

    // Mark attributes as needing update
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.aSize.needsUpdate = true;
    geometryRef.current.attributes.aAlpha.needsUpdate = true;
    geometryRef.current.attributes.aColor.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={10}>
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
            // At camera distance 12: 150/12 = 12.5x
            // With baseSize 5.0: gl_PointSize = 5.0 * 12.5 = 62.5 pixels
            // This creates larger, more visible particles for 15-20% screen coverage
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
            // Sample the soft gradient texture from Unity
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            float texAlpha = texColor.a;

            // Distance from center for additional edge softening
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center) * 2.0; // 0 at center, 1 at edge

            // Tighter exponential falloff - more compact individual particle mist
            // Higher multiplier = tighter/smaller mist per particle
            float edgeFade = exp(-dist * dist * 4.5);

            // Combine: texture shape + exponential softening
            float alpha = texAlpha * edgeFade;

            // Discard very transparent pixels
            if (alpha < 0.01) discard;

            // Apply color - reduce intensity to prevent white blowout
            vec3 color = vColor * uIntensity * 0.7;

            // Moderate alpha for visible but ethereal particles
            float finalAlpha = alpha * vAlpha * 0.35;

            gl_FragColor = vec4(color, finalAlpha);
          }
        `}
      />
    </points>
  );
}

// Helper: Linear interpolation between two colors
function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
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
