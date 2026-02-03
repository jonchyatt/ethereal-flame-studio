"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { StarNestPreset } from "@/types";
import starNestShader from "@/lib/shaders/starnest.frag.glsl";
import { useAudioStore } from "@/lib/stores/audioStore";
import { useRenderMode } from "@/hooks/useRenderMode";

// ==========================================
// STAR NEST PRESETS
// Extracted from Unity .mat files
// ==========================================

export const STAR_NEST_PRESETS: StarNestPreset[] = [
  // ==========================================
  // 1DARKWORLD1 - THE GLORIOUS ONE
  // Exact parameters from 1DarkWorld1.mat
  // This is the primary skybox the user wants!
  // ==========================================
  {
    key: "darkWorld1",
    label: "1DarkWorld1 (THE ONE)",
    iterations: 16, // _Iterations: 15.7 rounded
    volsteps: 15,
    formuparam: 420.2,
    stepSize: 312.2,
    tile: 796.96,
    brightness: 0.63,
    darkmatter: 40,
    distfading: 50,
    saturation: 62,
    color: [1, 1, 1],
    center: [0, 0.3, 0.5, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [1, 10, 0, 0.5],
  },
  // Normal - The standard Star Nest look (original defaults)
  {
    key: "normal",
    label: "Normal (Original)",
    iterations: 15,
    volsteps: 8,
    formuparam: 420,
    stepSize: 355,
    tile: 700,
    brightness: 0.5,
    darkmatter: 555,
    distfading: 55,
    saturation: 77,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Purple Nebula - from Purple.mat
  {
    key: "purple",
    label: "Purple Nebula",
    iterations: 15,
    volsteps: 8,
    formuparam: 483,
    stepSize: 278.6,
    tile: 897.1,
    brightness: 0.5,
    darkmatter: 738.21,
    distfading: 100.3,
    saturation: 88.1,
    color: [0.757, 0.267, 0.602],
    center: [1, 0.3, 0.5, 8.09],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Purple2 - Bright purple from Purple2.mat
  {
    key: "purple2",
    label: "Purple 2 (Bright)",
    iterations: 15,
    volsteps: 8,
    formuparam: 558.7,
    stepSize: 390,
    tile: 952.4,
    brightness: 7,
    darkmatter: 2000,
    distfading: 37.8,
    saturation: 76.1,
    color: [0.909, 0.654, 1.0],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Galaxies - from Galaxies.mat
  {
    key: "galaxies",
    label: "Galaxies",
    iterations: 15,
    volsteps: 8,
    formuparam: 550.1,
    stepSize: 420,
    tile: 553,
    brightness: 1.5,
    darkmatter: 300,
    distfading: 50,
    saturation: 77,
    color: [1, 1, 1],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // ========================================
  // DARK WORLD VARIANTS
  // ========================================
  // DarkWorld2 - from DarkWorld2.mat - purple tint, negative brightness
  {
    key: "darkWorld2",
    label: "Dark World 2",
    iterations: 15,
    volsteps: 8,
    formuparam: 484.4,
    stepSize: 335,
    tile: 565.85,
    brightness: -3.9,
    darkmatter: 179.6,
    distfading: -70,
    saturation: 55.9,
    color: [0.256, 0.175, 0.581],
    center: [-0.1, 0.1, -0.3, -3000],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 3, 0, 0.01],
  },
  // DarkWorld3 - from DarkWorld3.mat - very negative brightness
  {
    key: "darkWorld3",
    label: "Dark World 3",
    iterations: 15,
    volsteps: 8,
    formuparam: 543.6,
    stepSize: 407.6,
    tile: 609.4,
    brightness: -20.5,
    darkmatter: 535.88,
    distfading: -37.9,
    saturation: 55.9,
    color: [0.256, 0.175, 0.581],
    center: [-0.1, 0.1, -0.3, -3000],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 3, 0, 0.01],
  },
  // ========================================
  // CRAZY FRACTAL VARIANTS
  // ========================================
  // CrazyFractal - from CrazyFractal.mat - red tint
  {
    key: "crazyFractal",
    label: "Crazy Fractal (Red)",
    iterations: 15,
    volsteps: 8,
    formuparam: 998,
    stepSize: 498.1,
    tile: 1046,
    brightness: 2.4,
    darkmatter: 349,
    distfading: 173.3,
    saturation: 58.29,
    color: [0.588, 0.069, 0.069],
    center: [1, 0.3, 0.5, 0],
    scroll: [1.3, 1, 0.6, 0.01],
    rotation: [0, 0, 0, 0.01],
  },
  // CrazyFractal2 - from CrazyFractal2.mat - teal/green
  {
    key: "crazyFractal2",
    label: "Crazy Fractal 2 (Teal)",
    iterations: 15,
    volsteps: 8,
    formuparam: 1114.1,
    stepSize: 338.5,
    tile: 905.7,
    brightness: 15.9,
    darkmatter: 332.47,
    distfading: 161.1,
    saturation: 58.29,
    color: [0.069, 0.588, 0.481],
    center: [1, 0.3, 0.5, 0],
    scroll: [1.3, 1, 0.6, 0.01],
    rotation: [0, 0, 0, 0.01],
  },
  // CrazyFractal3 - from CrazyFractal3.mat - dark red
  {
    key: "crazyFractal3",
    label: "Crazy Fractal 3 (Dark)",
    iterations: 15,
    volsteps: 8,
    formuparam: 907.31,
    stepSize: 498.1,
    tile: 593.5,
    brightness: 0.53,
    darkmatter: 253.8,
    distfading: 173.3,
    saturation: 58.29,
    color: [0.088, 0.021, 0.021],
    center: [-0.1, 0.1, -0.3, -3000],
    scroll: [0.1, 0.1, -0.3, 0.1],
    rotation: [0, 3, 0, 0.01],
  },
  // ========================================
  // GREEN NEBULA VARIANTS
  // ========================================
  // Green1 - from Green1.mat - dark green
  {
    key: "greenNebula1",
    label: "Green Nebula 1 (Dark)",
    iterations: 15,
    volsteps: 8,
    formuparam: 465.2,
    stepSize: 254.6,
    tile: 1194.6,
    brightness: 0.1,
    darkmatter: 181.8,
    distfading: 147.1,
    saturation: 135.8,
    color: [0.308, 0.809, 0.149],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Green2 - from Green2.mat - very bright green
  {
    key: "greenNebula2",
    label: "Green Nebula 2 (Bright)",
    iterations: 15,
    volsteps: 8,
    formuparam: 603.81,
    stepSize: 583,
    tile: 1253,
    brightness: 23.14,
    darkmatter: 0,
    distfading: 18.7,
    saturation: 27.58,
    color: [0.150, 0.478, 0.046],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // ========================================
  // OTHER PRESETS
  // ========================================
  // HotSuns - from HotSuns.mat - sparse bright stars
  {
    key: "hotSuns",
    label: "Hot Suns",
    iterations: 15,
    volsteps: 8,
    formuparam: 591,
    stepSize: 380.2,
    tile: 1605,
    brightness: 0.5,
    darkmatter: 120,
    distfading: 80,
    saturation: 77,
    color: [1, 1, 1],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Yellow - from Yellow.mat - yellow/green with negative brightness
  {
    key: "yellowNebula",
    label: "Yellow Nebula",
    iterations: 15,
    volsteps: 8,
    formuparam: 439.7,
    stepSize: 532.8,
    tile: 734.1,
    brightness: -9.3,
    darkmatter: 300,
    distfading: 29.7,
    saturation: 48.4,
    color: [0.545, 0.676, 0.174],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Odd - from Odd.mat - inverted/negative values
  {
    key: "odd",
    label: "Odd (Inverted)",
    iterations: 15,
    volsteps: 10,
    formuparam: 444,
    stepSize: -300,
    tile: 850,
    brightness: 0.5,
    darkmatter: 221.4,
    distfading: -73.7,
    saturation: 62,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
  },
  // Rotating - from Rotating.mat - same as DarkWorld1 with fast rotation
  {
    key: "rotating",
    label: "Rotating",
    iterations: 16,
    volsteps: 15,
    formuparam: 420.2,
    stepSize: 312.2,
    tile: 796.96,
    brightness: 0.63,
    darkmatter: 40,
    distfading: 50,
    saturation: 62,
    color: [1, 1, 1],
    center: [0, 0.3, 0.5, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [1, 10, 0, 0.5],
  },
  // HighQuality - from HighQuality.mat - more iterations for detail
  {
    key: "highQuality",
    label: "High Quality",
    iterations: 20,
    volsteps: 18,
    formuparam: 420,
    stepSize: 300,
    tile: 850,
    brightness: 0.5,
    darkmatter: 40,
    distfading: 50,
    saturation: 62,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [1.3, 1, 0.6, 0.01],
    rotation: [0, 0, 0, 0.01],
  },
  // Star Nest FX (2D) - from 2dMat.mat - surface rendering
  {
    key: "starNestFX",
    label: "Star Nest FX (2D Surface)",
    iterations: 17,
    volsteps: 20,
    formuparam: 530,
    stepSize: 130,
    tile: 700,
    brightness: 2.0,
    darkmatter: 25,
    distfading: 68,
    saturation: 85,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [3, 1, 0.6, 0.01],
    rotation: [35, 25, 75, 0.1],
  },
  // ========================================
  // HSV ANIMATED PRESETS - With hue cycling
  // ========================================
  {
    key: "hsvRainbow",
    label: "HSV Rainbow Cycle",
    iterations: 17,
    volsteps: 15,
    formuparam: 530,
    stepSize: 200,
    tile: 700,
    brightness: 1.5,
    darkmatter: 40,
    distfading: 60,
    saturation: 90,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [1.3, 1, 0.6, 0.01],
    rotation: [10, 5, 15, 0.05],
    hueShift: 0,
    hueSpeed: 0.1,
    postSaturation: 0.3,
  },
  // HSV Normal - from Normal_Hueshift.mat
  {
    key: "hsvNormal",
    label: "HSV Normal (Animated Hue)",
    iterations: 15,
    volsteps: 8,
    formuparam: 420,
    stepSize: 355,
    tile: 700,
    brightness: 0.5,
    darkmatter: 555,
    distfading: 55,
    saturation: 77,
    color: [1, 1, 1],
    center: [1, 0.3, 0.5, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
    hueShift: 0.4,
    hueSpeed: 0.05,
    postSaturation: 0.23,
  },
  // HSV Green - from Green1_Hueshift.mat
  {
    key: "hsvGreenNebula",
    label: "HSV Green Nebula",
    iterations: 15,
    volsteps: 8,
    formuparam: 465.2,
    stepSize: 254.6,
    tile: 1194.6,
    brightness: 0.1,
    darkmatter: 181.8,
    distfading: 147.1,
    saturation: 135.8,
    color: [0.381, 0.831, 0.238],
    center: [1, 0.63, 0.8, 0],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 0, 0, 0.01],
    hueShift: 0.54,
    hueSpeed: 0.03,
    postSaturation: 0,
  },
  // HSV DarkWorld2 - from DarkWorld2_Hueshift.mat
  {
    key: "hsvDarkWorld2",
    label: "HSV Dark World 2",
    iterations: 15,
    volsteps: 8,
    formuparam: 484.4,
    stepSize: 335,
    tile: 565.85,
    brightness: -3.9,
    darkmatter: 179.6,
    distfading: -70,
    saturation: 55.9,
    color: [0.255, 0.173, 0.580],
    center: [-0.1, 0.1, -0.3, -3000],
    scroll: [0.1, 0.1, -0.3, 0],
    rotation: [0, 3, 0, 0.01],
    hueShift: 0.77,
    hueSpeed: 0.02,
    postSaturation: 1.0,
  },
  // HSV Crazy Fractal - from CrazyFractal_Hueshift.mat
  {
    key: "hsvCrazyFractal",
    label: "HSV Crazy Fractal",
    iterations: 15,
    volsteps: 8,
    formuparam: 998,
    stepSize: 498.1,
    tile: 1046,
    brightness: 2.4,
    darkmatter: 349,
    distfading: 173.3,
    saturation: 58.29,
    color: [0.588, 0.069, 0.069],
    center: [1, 0.3, 0.5, 0],
    scroll: [1.3, 1, 0.6, 0.01],
    rotation: [0, 0, 0, 0.01],
    hueShift: 0.12,
    hueSpeed: 0.15,
    postSaturation: 1.0,
  },
];

type StarNestSkyboxProps = {
  preset?: StarNestPreset;
  rotationSpeed?: number;
  audioReactiveEnabled?: boolean;
  audioReactivity?: number;
  driftSpeed?: number;
};

/**
 * Star Nest Skybox Component
 *
 * Renders infinite procedural space background using volumetric ray marching.
 * Based on Pablo Román Andrioli's famous Shadertoy shader.
 *
 * Features:
 * - Multiple preset configurations (DarkWorld1, Normal, Purple Nebula, etc.)
 * - Automatic rotation during playback (VIS-07)
 * - Optional HSV color cycling for animated hue shifts
 * - Renders as large sphere with BackSide material (skybox)
 */
export function StarNestSkybox({
  preset = STAR_NEST_PRESETS[0], // Default to DarkWorld1
  rotationSpeed,
  audioReactiveEnabled = true,
  audioReactivity = 1.0,
  driftSpeed = 1.0,
}: StarNestSkyboxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  // Render mode support for headless rendering
  const renderMode = useRenderMode();

  // Use refs to avoid stale closure issues
  const presetRef = useRef(preset);
  // Track accumulated time for smooth audio-modulated rotation
  const accumulatedTimeRef = useRef(0);
  const lastClockTimeRef = useRef(0);

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  // Create uniforms once (memoized to prevent recreation on re-render)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIterations: { value: preset.iterations },
      uVolsteps: { value: preset.volsteps },
      uFormuparam: { value: preset.formuparam },
      uStepSize: { value: preset.stepSize },
      uTile: { value: preset.tile },
      uBrightness: { value: preset.brightness },
      uDarkmatter: { value: preset.darkmatter },
      uDistfading: { value: preset.distfading },
      uSaturation: { value: preset.saturation },
      uColor: { value: new THREE.Vector3(...preset.color) },
      uCenter: { value: new THREE.Vector4(...preset.center) },
      uScroll: { value: new THREE.Vector4(...preset.scroll) },
      uRotation: { value: new THREE.Vector4(...preset.rotation) },
      uHueShift: { value: preset.hueShift ?? 0 },
      uHueSpeed: { value: preset.hueSpeed ?? 0 },
      uPostSaturation: { value: preset.postSaturation ?? 0 },
    }),
    [] // Empty deps - only create once, useFrame will update values
  );

  // Vertex shader (passes ray direction to fragment shader)
  const vertexShader = `
    varying vec3 vRayDir;

    void main() {
      vRayDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
    const currentPreset = presetRef.current;

    // In render mode, use fixed time directly
    if (renderMode.isActive && renderMode.elapsedTime !== null) {
      materialRef.current.uniforms.uTime.value = renderMode.elapsedTime;
    } else {
      // Calculate delta time for smooth incremental updates
      const currentClockTime = clock.elapsedTime;
      const deltaTime = currentClockTime - lastClockTimeRef.current;
      lastClockTimeRef.current = currentClockTime;

      // Get audio state for rotation modulation (VIS-07)
      const audioState = useAudioStore.getState();
      const amplitude = audioState.amplitude;
      const bass = audioState.bass;

      // Modulate time increment with audio: faster rotation when louder
      // Audio boost is user-controlled via audioReactivity (0..2)
      const audioBoost = audioReactiveEnabled ? audioReactivity : 0;
      const audioModulation = 1.0 + (amplitude * 0.3 + bass * 0.2) * audioBoost;
      accumulatedTimeRef.current += deltaTime * audioModulation;

      // Update time with smoothly accumulated value (never jumps backward)
      materialRef.current.uniforms.uTime.value = accumulatedTimeRef.current;
    }

    // Update ALL preset uniforms every frame (ensures preset switching works)
    materialRef.current.uniforms.uIterations.value = currentPreset.iterations;
    materialRef.current.uniforms.uVolsteps.value = currentPreset.volsteps;
    materialRef.current.uniforms.uFormuparam.value = currentPreset.formuparam;
    materialRef.current.uniforms.uStepSize.value = currentPreset.stepSize;
    materialRef.current.uniforms.uTile.value = currentPreset.tile;
    materialRef.current.uniforms.uBrightness.value = currentPreset.brightness;
    materialRef.current.uniforms.uDarkmatter.value = currentPreset.darkmatter;
    materialRef.current.uniforms.uDistfading.value = currentPreset.distfading;
    materialRef.current.uniforms.uSaturation.value = currentPreset.saturation;
    materialRef.current.uniforms.uColor.value.set(...currentPreset.color);
    materialRef.current.uniforms.uCenter.value.set(...currentPreset.center);
    const scroll = currentPreset.scroll;
    materialRef.current.uniforms.uScroll.value.set(
      scroll[0] * driftSpeed,
      scroll[1] * driftSpeed,
      scroll[2] * driftSpeed,
      scroll[3]
    );

    // Apply rotation speed override if provided
    const rotation = [...currentPreset.rotation] as [number, number, number, number];
    if (rotationSpeed !== undefined) {
      rotation[3] = rotationSpeed;
    }
    materialRef.current.uniforms.uRotation.value.set(...rotation);

    materialRef.current.uniforms.uHueShift.value = currentPreset.hueShift ?? 0;
    materialRef.current.uniforms.uHueSpeed.value = currentPreset.hueSpeed ?? 0;
    materialRef.current.uniforms.uPostSaturation.value = currentPreset.postSaturation ?? 0;
  });

  return (
    <mesh ref={meshRef}>
      {/* Large sphere as skybox geometry - BackSide handles inside rendering */}
      <sphereGeometry args={[100, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={starNestShader}
      />
    </mesh>
  );
}
