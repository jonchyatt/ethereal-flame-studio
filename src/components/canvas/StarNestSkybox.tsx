"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { StarNestPreset } from "@/types";
import starNestShader from "@/lib/shaders/starnest.frag.glsl";

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
    scroll: [0.1, 0.1, -0.3, 0], // Note: w=0 means no scroll animation
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
  // HSV VERSION PRESETS - With hue cycling
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
    hueSpeed: 0.1, // Slow rainbow cycling
    postSaturation: 0.3,
  },
];

type StarNestSkyboxProps = {
  preset?: StarNestPreset;
  rotationSpeed?: number;
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
}: StarNestSkyboxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Use refs to avoid stale closure issues
  const presetRef = useRef(preset);

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
    const currentPreset = presetRef.current;

    // Update time
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;

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
    materialRef.current.uniforms.uScroll.value.set(...currentPreset.scroll);

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
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      {/* Large sphere as skybox geometry */}
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
