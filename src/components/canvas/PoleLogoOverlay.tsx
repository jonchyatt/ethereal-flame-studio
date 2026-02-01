'use client';

import { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type PoleLogoOverlayProps = {
  textureUrl?: string;
  radius?: number;
  size?: number;
  opacity?: number;
  autoScale?: boolean;
  baseHeight?: number;
};

export function PoleLogoOverlay({
  textureUrl = '/overlays/WAIANCircle.png',
  radius = 95,
  size = 22,
  opacity = 0.95,
  autoScale = true,
  baseHeight = 1080,
}: PoleLogoOverlayProps) {
  const { size: viewportSize } = useThree();
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  const effectiveSize = useMemo(() => {
    if (!autoScale) return size;
    if (!viewportSize.height) return size;
    const scale = baseHeight / viewportSize.height;
    return size * scale;
  }, [autoScale, baseHeight, size, viewportSize.height]);

  const material = useMemo(() => {
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return mat;
  }, [texture, opacity]);

  return (
    <>
      <sprite position={[0, radius, 0]} scale={[effectiveSize, effectiveSize, 1]} material={material} />
      <sprite position={[0, -radius, 0]} scale={[effectiveSize, effectiveSize, 1]} material={material} />
    </>
  );
}
