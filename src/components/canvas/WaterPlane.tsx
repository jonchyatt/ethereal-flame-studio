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
 * Animated water surface with realistic reflections and wave dynamics.
 * Positioned below the particle system to create a "flame over water" effect.
 *
 * Features:
 * - Multi-layer wave displacement (5 octaves)
 * - Analytical normal calculation from wave derivatives
 * - Fresnel effect (view-angle dependent reflectivity)
 * - Fake environment/sky reflection
 * - Specular highlights from directional light
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
      uCameraPos: { value: new THREE.Vector3(0, 2, 10) },
    }),
    [] // Only create once
  );

  // Update uniforms on each frame
  useFrame(({ clock, camera }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uReflectivity.value = reflectivity;
    materialRef.current.uniforms.uCameraPos.value.copy(camera.position);

    // Update color if it changes
    const c = new THREE.Color(color);
    materialRef.current.uniforms.uColor.value.set(c.r, c.g, c.b);
  });

  const vertexShader = `
    uniform float uTime;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vDist;

    // Wave function: returns height and partial derivatives (dH/dx, dH/dy)
    vec3 waveLayer(vec2 pos, float freq, float amp, float speed, vec2 dir) {
      float phase = dot(pos, dir) * freq + uTime * speed;
      float h = amp * sin(phase);
      float dh = amp * freq * cos(phase);
      return vec3(h, dh * dir.x, dh * dir.y);
    }

    void main() {
      vUv = uv;

      // Distance from center for edge fade
      vec2 centerOffset = uv - 0.5;
      vDist = length(centerOffset);

      // 5-octave wave displacement with analytical derivatives
      vec3 wave = vec3(0.0);

      // Layer 1: Large, slow ocean swell
      wave += waveLayer(position.xy, 0.15, 0.18, 0.4, normalize(vec2(1.0, 0.6)));

      // Layer 2: Medium cross-waves
      wave += waveLayer(position.xy, 0.3, 0.10, 0.6, normalize(vec2(-0.7, 1.0)));

      // Layer 3: Smaller choppy waves
      wave += waveLayer(position.xy, 0.6, 0.05, 0.9, normalize(vec2(0.8, -0.5)));

      // Layer 4: Fine ripples
      wave += waveLayer(position.xy, 1.2, 0.025, 1.3, normalize(vec2(-0.4, -0.8)));

      // Layer 5: Micro detail
      wave += waveLayer(position.xy, 2.5, 0.012, 1.8, normalize(vec2(0.6, 0.9)));

      // Apply displacement to Z (becomes Y after rotation)
      vec3 newPosition = position;
      newPosition.z += wave.x;

      // Calculate normal from wave derivatives
      // Since the plane is rotated -PI/2 around X, the displaced Z maps to world Y
      // Normal in local space: (-dH/dx, -dH/dy, 1.0) normalized
      vec3 localNormal = normalize(vec3(-wave.y, -wave.z, 1.0));
      vNormal = normalize(normalMatrix * localNormal);

      // World position for Fresnel
      vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
      vWorldPos = worldPos.xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uReflectivity;
    uniform float uTime;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vDist;

    // Schlick Fresnel approximation
    float fresnel(vec3 viewDir, vec3 normal, float power) {
      float base = 1.0 - max(dot(viewDir, normal), 0.0);
      return pow(base, power);
    }

    // Fake environment reflection - generates a sky-like gradient
    vec3 sampleEnvironment(vec3 reflectDir) {
      // Map reflection direction to a color
      float up = reflectDir.y * 0.5 + 0.5; // 0 = looking down, 1 = looking up

      // Dark space at top, subtle glow near horizon
      vec3 skyHigh = vec3(0.02, 0.03, 0.08);      // Deep dark blue
      vec3 skyMid = vec3(0.06, 0.08, 0.18);        // Subtle blue
      vec3 skyHorizon = vec3(0.12, 0.10, 0.20);    // Warm horizon glow

      vec3 sky = mix(skyHorizon, skyMid, smoothstep(0.3, 0.6, up));
      sky = mix(sky, skyHigh, smoothstep(0.6, 0.9, up));

      // Add subtle warm glow from orb direction (center/above)
      float orbInfluence = max(0.0, reflectDir.y) * max(0.0, 1.0 - length(reflectDir.xz) * 0.8);
      vec3 orbGlow = vec3(0.3, 0.15, 0.05) * orbInfluence * 0.5;

      return sky + orbGlow;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(uCameraPos - vWorldPos);

      // Fresnel: more reflective at glancing angles
      float fres = fresnel(viewDir, normal, 3.0);
      float reflectAmount = mix(0.04, 1.0, fres) * uReflectivity;

      // Reflection direction
      vec3 reflectDir = reflect(-viewDir, normal);

      // Sample fake environment
      vec3 reflectionColor = sampleEnvironment(reflectDir);

      // Deep water color (darker with depth-like variation)
      vec3 deepColor = uColor * 0.6;
      vec3 shallowColor = uColor * 1.2 + vec3(0.02, 0.04, 0.06);

      // Use normal.y variation for depth feel
      float depthFactor = smoothstep(-0.5, 0.5, normal.y);
      vec3 waterBase = mix(deepColor, shallowColor, depthFactor * 0.3);

      // Specular highlight (simulates sun/light reflection)
      vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);
      vec3 specularColor = vec3(0.6, 0.65, 0.8) * spec * uReflectivity * 2.0;

      // Secondary softer specular for broader sheen
      float softSpec = pow(max(dot(normal, halfDir), 0.0), 16.0);
      vec3 sheenColor = vec3(0.1, 0.12, 0.18) * softSpec * uReflectivity;

      // Combine: water color mixed with reflection based on Fresnel
      vec3 finalColor = mix(waterBase, reflectionColor, reflectAmount);
      finalColor += specularColor + sheenColor;

      // Subtle animated caustics pattern
      float caustic1 = sin(vWorldPos.x * 2.0 + uTime * 0.7) * sin(vWorldPos.z * 2.5 + uTime * 0.5);
      float caustic2 = sin(vWorldPos.x * 3.0 - uTime * 0.4) * sin(vWorldPos.z * 1.8 + uTime * 0.6);
      float caustics = max(0.0, (caustic1 + caustic2) * 0.5) * 0.03 * uReflectivity;
      finalColor += vec3(caustics * 0.5, caustics * 0.7, caustics);

      // Edge fade
      float edgeFade = 1.0 - smoothstep(0.35, 0.5, vDist);

      // Alpha: more opaque in center, Fresnel also affects opacity
      float alpha = mix(0.7, 0.92, fres) * edgeFade;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.8, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[60, 60, 128, 128]} />
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
