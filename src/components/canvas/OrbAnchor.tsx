"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ParticleSystem } from "./ParticleSystem";
import { useVisualStore } from "@/lib/stores/visualStore";

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();

export function OrbAnchor() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const orbAnchorMode = useVisualStore((state) => state.orbAnchorMode);
  const orbDistance = useVisualStore((state) => state.orbDistance);
  const orbHeight = useVisualStore((state) => state.orbHeight);
  const orbSideOffset = useVisualStore((state) => state.orbSideOffset);
  const orbWorldX = useVisualStore((state) => state.orbWorldX);
  const orbWorldY = useVisualStore((state) => state.orbWorldY);
  const orbWorldZ = useVisualStore((state) => state.orbWorldZ);

  useFrame(() => {
    if (!groupRef.current) return;

    if (orbAnchorMode === "viewer") {
      camera.getWorldDirection(forward);
      forward.normalize();
      up.copy(camera.up).normalize();
      right.crossVectors(forward, up).normalize();

      groupRef.current.position
        .copy(camera.position)
        .add(forward.multiplyScalar(orbDistance))
        .add(up.multiplyScalar(orbHeight))
        .add(right.multiplyScalar(orbSideOffset));
    } else {
      groupRef.current.position.set(orbWorldX, orbWorldY, orbWorldZ);
    }
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem />
    </group>
  );
}
