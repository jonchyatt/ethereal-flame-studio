"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualStore } from "@/lib/stores/visualStore";
import { useRenderMode } from "@/hooks/useRenderMode";

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const orbPos = new THREE.Vector3();

export function CameraRig({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const orbAnchorMode = useVisualStore((state) => state.orbAnchorMode);
  const orbDistance = useVisualStore((state) => state.orbDistance);
  const orbHeight = useVisualStore((state) => state.orbHeight);
  const orbSideOffset = useVisualStore((state) => state.orbSideOffset);
  const orbWorldX = useVisualStore((state) => state.orbWorldX);
  const orbWorldY = useVisualStore((state) => state.orbWorldY);
  const orbWorldZ = useVisualStore((state) => state.orbWorldZ);
  const cameraLookAtOrb = useVisualStore((state) => state.cameraLookAtOrb);
  const cameraOrbitEnabled = useVisualStore((state) => state.cameraOrbitEnabled);
  const cameraOrbitRenderOnly = useVisualStore((state) => state.cameraOrbitRenderOnly);
  const cameraOrbitSpeed = useVisualStore((state) => state.cameraOrbitSpeed);
  const cameraOrbitRadius = useVisualStore((state) => state.cameraOrbitRadius);
  const cameraOrbitHeight = useVisualStore((state) => state.cameraOrbitHeight);
  const orbitAngleRef = useRef(0);
  const renderMode = useRenderMode();

  useFrame((_, delta) => {
    if (!enabled) return;

    if (orbAnchorMode === "viewer") {
      camera.getWorldDirection(forward);
      forward.normalize();
      up.copy(camera.up).normalize();
      right.crossVectors(forward, up).normalize();

      orbPos
        .copy(camera.position)
        .add(forward.multiplyScalar(orbDistance))
        .add(up.multiplyScalar(orbHeight))
        .add(right.multiplyScalar(orbSideOffset));
    } else {
      orbPos.set(orbWorldX, orbWorldY, orbWorldZ);
    }

    const orbitActive =
      cameraOrbitEnabled &&
      (!cameraOrbitRenderOnly || renderMode.isActive) &&
      orbAnchorMode === "world";

    if (orbitActive) {
      orbitAngleRef.current += cameraOrbitSpeed * delta;
      const angle = orbitAngleRef.current;
      camera.position.set(
        orbPos.x + Math.cos(angle) * cameraOrbitRadius,
        orbPos.y + cameraOrbitHeight,
        orbPos.z + Math.sin(angle) * cameraOrbitRadius
      );
      camera.lookAt(orbPos);
      return;
    }

    if (cameraLookAtOrb) {
      camera.lookAt(orbPos);
    }
  });

  return null;
}
