"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type MaskMode = "none" | "luma" | "chroma";

type VideoSkyboxProps = {
  videoUrl: string;
  maskMode?: MaskMode;
  maskThreshold?: number;
  maskSoftness?: number;
  maskColor?: string;
  maskPreview?: boolean;
  maskPreviewSplit?: boolean;
  maskPreviewColor?: string;
  maskInvert?: boolean;
  rotationSpeed?: number;
};

// Simple video skybox with optional luma/chroma key masking.
export function VideoSkybox({
  videoUrl,
  maskMode = "none",
  maskThreshold = 0.65,
  maskSoftness = 0.08,
  maskColor = "#87ceeb",
  maskPreview = false,
  maskPreviewSplit = false,
  maskPreviewColor = "#ff00ff",
  maskInvert = false,
  rotationSpeed = 0,
}: VideoSkyboxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!videoUrl) return;
    const video = document.createElement("video");
    video.src = videoUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";

    const play = async () => {
      try {
        await video.play();
      } catch {
        // Autoplay might be blocked; ignore.
      }
    };
    play();

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    setVideoTexture(texture);

    return () => {
      try {
        video.pause();
      } catch {}
      texture.dispose();
    };
  }, [videoUrl]);

  const maskColorVec = useMemo(() => {
    const color = new THREE.Color(maskColor);
    return new THREE.Vector3(color.r, color.g, color.b);
  }, [maskColor]);

  const previewColorVec = useMemo(() => {
    const color = new THREE.Color(maskPreviewColor);
    return new THREE.Vector3(color.r, color.g, color.b);
  }, [maskPreviewColor]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.VideoTexture | null },
      uMaskMode: { value: 0.0 },
      uThreshold: { value: maskThreshold },
      uSoftness: { value: maskSoftness },
      uKeyColor: { value: maskColorVec },
      uPreview: { value: maskPreview ? 1.0 : 0.0 },
      uPreviewSplit: { value: maskPreviewSplit ? 1.0 : 0.0 },
      uPreviewColor: { value: previewColorVec },
      uInvert: { value: maskInvert ? 1.0 : 0.0 },
    }),
    [maskThreshold, maskSoftness, maskColorVec, maskPreview, maskPreviewSplit, previewColorVec, maskInvert]
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uMap.value = videoTexture;
  }, [videoTexture]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uMaskMode.value =
      maskMode === "luma" ? 1.0 : maskMode === "chroma" ? 2.0 : 0.0;
    materialRef.current.uniforms.uThreshold.value = maskThreshold;
    materialRef.current.uniforms.uSoftness.value = maskSoftness;
    materialRef.current.uniforms.uKeyColor.value = maskColorVec;
    materialRef.current.uniforms.uPreview.value = maskPreview ? 1.0 : 0.0;
    materialRef.current.uniforms.uPreviewSplit.value = maskPreviewSplit ? 1.0 : 0.0;
    materialRef.current.uniforms.uPreviewColor.value = previewColorVec;
    materialRef.current.uniforms.uInvert.value = maskInvert ? 1.0 : 0.0;
  }, [maskMode, maskThreshold, maskSoftness, maskColorVec, maskPreview, maskPreviewSplit, previewColorVec, maskInvert]);

  useFrame((_, delta) => {
    if (rotationSpeed && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  if (!videoTexture) return null;

  return (
    <mesh ref={meshRef} renderOrder={2}>
      <sphereGeometry args={[100, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        transparent={maskMode !== "none"}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uMap;
          uniform float uMaskMode;
          uniform float uThreshold;
          uniform float uSoftness;
          uniform vec3 uKeyColor;
          uniform float uPreview;
          uniform float uPreviewSplit;
          uniform vec3 uPreviewColor;
          uniform float uInvert;
          varying vec2 vUv;

          float luma(vec3 c) {
            return dot(c, vec3(0.2126, 0.7152, 0.0722));
          }

          void main() {
            vec4 color = texture2D(uMap, vUv);
            float alpha = 1.0;

            // Luma key (remove bright areas)
            if (uMaskMode > 0.5 && uMaskMode < 1.5) {
              float lum = luma(color.rgb);
              float edge = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, lum);
              alpha = 1.0 - edge;
            }

            // Chroma key (remove target color)
            if (uMaskMode > 1.5) {
              float dist = distance(color.rgb, uKeyColor);
              float edge = smoothstep(uThreshold, uThreshold + uSoftness, dist);
              alpha = edge;
            }

            if (uInvert > 0.5 && uMaskMode > 0.5) {
              alpha = 1.0 - alpha;
            }

            bool showPreview = uPreview > 0.5;
            if (uPreviewSplit > 0.5) {
              showPreview = showPreview && (vUv.x < 0.5);
            }

            if (showPreview) {
              vec3 keyedTint = mix(uPreviewColor, color.rgb, alpha);
              gl_FragColor = vec4(keyedTint, 1.0);
            } else {
              gl_FragColor = vec4(color.rgb, color.a * alpha);
            }

            if (uPreviewSplit > 0.5) {
              float edge = abs(vUv.x - 0.5);
              float line = smoothstep(0.004, 0.0, edge);
              if (line > 0.0) {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
              }
            }
          }
        `}
      />
    </mesh>
  );
}
