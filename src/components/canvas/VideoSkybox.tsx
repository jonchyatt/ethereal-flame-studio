"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualStore } from "@/lib/stores/visualStore";

type MaskMode = "none" | "luma" | "chroma";

type VideoSkyboxProps = {
  videoUrl: string;
  maskMode?: MaskMode;
  maskThreshold?: number;
  maskSoftness?: number;
  maskColor?: string;
  maskPreview?: boolean;
  maskPreviewSplit?: boolean;
  maskPreviewMode?: 'tint' | 'matte';
  maskPreviewColor?: string;
  maskInvert?: boolean;
  rectMaskEnabled?: boolean;
  rectMaskU?: number;
  rectMaskV?: number;
  rectMaskWidth?: number;
  rectMaskHeight?: number;
  rectMaskSoftness?: number;
  rectMaskInvert?: boolean;
  videoYaw?: number;
  videoPitch?: number;
  seamBlendEnabled?: boolean;
  seamBlendWidth?: number;
  holeFixEnabled?: boolean;
  holeFixThreshold?: number;
  holeFixSoftness?: number;
  poleFadeEnabled?: boolean;
  poleFadeStart?: number;
  poleFadeSoftness?: number;
  patchEnabled?: boolean;
  patchU?: number;
  patchV?: number;
  patchRadius?: number;
  patchSoftness?: number;
  patch2Enabled?: boolean;
  patch2U?: number;
  patch2V?: number;
  patch2Radius?: number;
  patch2Softness?: number;
  patch3Enabled?: boolean;
  patch3U?: number;
  patch3V?: number;
  patch3Radius?: number;
  patch3Softness?: number;
  patch4Enabled?: boolean;
  patch4U?: number;
  patch4V?: number;
  patch4Radius?: number;
  patch4Softness?: number;
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
  maskPreviewMode = "tint",
  maskPreviewColor = "#ff00ff",
  maskInvert = false,
  rectMaskEnabled = false,
  rectMaskU = 0.5,
  rectMaskV = 0.5,
  rectMaskWidth = 0.3,
  rectMaskHeight = 0.3,
  rectMaskSoftness = 0.03,
  rectMaskInvert = false,
  videoYaw = 0,
  videoPitch = 0,
  seamBlendEnabled = false,
  seamBlendWidth = 0.04,
  holeFixEnabled = true,
  holeFixThreshold = 0.02,
  holeFixSoftness = 0.05,
  poleFadeEnabled = true,
  poleFadeStart = 0.08,
  poleFadeSoftness = 0.06,
  patchEnabled = false,
  patchU = 0.5,
  patchV = 0.5,
  patchRadius = 0.08,
  patchSoftness = 0.04,
  patch2Enabled = false,
  patch2U = 0.5,
  patch2V = 0.5,
  patch2Radius = 0.08,
  patch2Softness = 0.04,
  patch3Enabled = false,
  patch3U = 0.5,
  patch3V = 0.5,
  patch3Radius = 0.08,
  patch3Softness = 0.04,
  patch4Enabled = false,
  patch4U = 0.5,
  patch4V = 0.5,
  patch4Radius = 0.08,
  patch4Softness = 0.04,
  rotationSpeed = 0,
}: VideoSkyboxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const patchPickTarget = useVisualStore((state) => state.skyboxPatchPickTarget);
  const patchPickMulti = useVisualStore((state) => state.skyboxPatchPickMulti);
  const setPatchPickTarget = useVisualStore((state) => state.setSkyboxPatchPickTarget);
  const setPatchPickCursor = useVisualStore((state) => state.setSkyboxPatchPickCursor);
  const setSkyboxPatchU = useVisualStore((state) => state.setSkyboxPatchU);
  const setSkyboxPatchV = useVisualStore((state) => state.setSkyboxPatchV);
  const setSkyboxPatch2U = useVisualStore((state) => state.setSkyboxPatch2U);
  const setSkyboxPatch2V = useVisualStore((state) => state.setSkyboxPatch2V);
  const setSkyboxPatch3U = useVisualStore((state) => state.setSkyboxPatch3U);
  const setSkyboxPatch3V = useVisualStore((state) => state.setSkyboxPatch3V);
  const setSkyboxPatch4U = useVisualStore((state) => state.setSkyboxPatch4U);
  const setSkyboxPatch4V = useVisualStore((state) => state.setSkyboxPatch4V);

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
      uPreviewMode: { value: maskPreviewMode === "matte" ? 2.0 : 1.0 },
      uPreviewColor: { value: previewColorVec },
      uInvert: { value: maskInvert ? 1.0 : 0.0 },
      uRectEnabled: { value: rectMaskEnabled ? 1.0 : 0.0 },
      uRectCenter: { value: new THREE.Vector2(rectMaskU, rectMaskV) },
      uRectSize: { value: new THREE.Vector2(rectMaskWidth, rectMaskHeight) },
      uRectSoftness: { value: rectMaskSoftness },
      uRectInvert: { value: rectMaskInvert ? 1.0 : 0.0 },
      uVideoYaw: { value: videoYaw },
      uVideoPitch: { value: videoPitch },
      uSeamBlendEnabled: { value: seamBlendEnabled ? 1.0 : 0.0 },
      uSeamBlendWidth: { value: seamBlendWidth },
      uHoleFixEnabled: { value: holeFixEnabled ? 1.0 : 0.0 },
      uHoleFixThreshold: { value: holeFixThreshold },
      uHoleFixSoftness: { value: holeFixSoftness },
      uPoleFadeEnabled: { value: poleFadeEnabled ? 1.0 : 0.0 },
      uPoleFadeStart: { value: poleFadeStart },
      uPoleFadeSoftness: { value: poleFadeSoftness },
      uPatchEnabled: { value: patchEnabled ? 1.0 : 0.0 },
      uPatchCenter: { value: new THREE.Vector2(patchU, patchV) },
      uPatchRadius: { value: patchRadius },
      uPatchSoftness: { value: patchSoftness },
      uPatch2Enabled: { value: patch2Enabled ? 1.0 : 0.0 },
      uPatch2Center: { value: new THREE.Vector2(patch2U, patch2V) },
      uPatch2Radius: { value: patch2Radius },
      uPatch2Softness: { value: patch2Softness },
      uPatch3Enabled: { value: patch3Enabled ? 1.0 : 0.0 },
      uPatch3Center: { value: new THREE.Vector2(patch3U, patch3V) },
      uPatch3Radius: { value: patch3Radius },
      uPatch3Softness: { value: patch3Softness },
      uPatch4Enabled: { value: patch4Enabled ? 1.0 : 0.0 },
      uPatch4Center: { value: new THREE.Vector2(patch4U, patch4V) },
      uPatch4Radius: { value: patch4Radius },
      uPatch4Softness: { value: patch4Softness },
    }),
    [
      maskThreshold,
      maskSoftness,
      maskColorVec,
      maskPreview,
      maskPreviewSplit,
      maskPreviewMode,
      previewColorVec,
      maskInvert,
      rectMaskEnabled,
      rectMaskU,
      rectMaskV,
      rectMaskWidth,
      rectMaskHeight,
      rectMaskSoftness,
      rectMaskInvert,
      videoYaw,
      videoPitch,
      seamBlendEnabled,
      seamBlendWidth,
      holeFixEnabled,
      holeFixThreshold,
      holeFixSoftness,
      poleFadeEnabled,
      poleFadeStart,
      poleFadeSoftness,
      patchEnabled,
      patchU,
      patchV,
      patchRadius,
      patchSoftness,
      patch2Enabled,
      patch2U,
      patch2V,
      patch2Radius,
      patch2Softness,
      patch3Enabled,
      patch3U,
      patch3V,
      patch3Radius,
      patch3Softness,
      patch4Enabled,
      patch4U,
      patch4V,
      patch4Radius,
      patch4Softness,
    ]
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
    materialRef.current.uniforms.uPreviewMode.value = maskPreviewMode === "matte" ? 2.0 : 1.0;
    materialRef.current.uniforms.uPreviewColor.value = previewColorVec;
    materialRef.current.uniforms.uInvert.value = maskInvert ? 1.0 : 0.0;
    materialRef.current.uniforms.uRectEnabled.value = rectMaskEnabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uRectCenter.value.set(rectMaskU, rectMaskV);
    materialRef.current.uniforms.uRectSize.value.set(rectMaskWidth, rectMaskHeight);
    materialRef.current.uniforms.uRectSoftness.value = rectMaskSoftness;
    materialRef.current.uniforms.uRectInvert.value = rectMaskInvert ? 1.0 : 0.0;
    materialRef.current.uniforms.uVideoYaw.value = videoYaw;
    materialRef.current.uniforms.uVideoPitch.value = videoPitch;
    materialRef.current.uniforms.uSeamBlendEnabled.value = seamBlendEnabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uSeamBlendWidth.value = seamBlendWidth;
    materialRef.current.uniforms.uHoleFixEnabled.value = holeFixEnabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uHoleFixThreshold.value = holeFixThreshold;
    materialRef.current.uniforms.uHoleFixSoftness.value = holeFixSoftness;
    materialRef.current.uniforms.uPoleFadeEnabled.value = poleFadeEnabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uPoleFadeStart.value = poleFadeStart;
    materialRef.current.uniforms.uPoleFadeSoftness.value = poleFadeSoftness;
    materialRef.current.uniforms.uPatchEnabled.value = patchEnabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uPatchCenter.value.set(patchU, patchV);
    materialRef.current.uniforms.uPatchRadius.value = patchRadius;
    materialRef.current.uniforms.uPatchSoftness.value = patchSoftness;
    materialRef.current.uniforms.uPatch2Enabled.value = patch2Enabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uPatch2Center.value.set(patch2U, patch2V);
    materialRef.current.uniforms.uPatch2Radius.value = patch2Radius;
    materialRef.current.uniforms.uPatch2Softness.value = patch2Softness;
    materialRef.current.uniforms.uPatch3Enabled.value = patch3Enabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uPatch3Center.value.set(patch3U, patch3V);
    materialRef.current.uniforms.uPatch3Radius.value = patch3Radius;
    materialRef.current.uniforms.uPatch3Softness.value = patch3Softness;
    materialRef.current.uniforms.uPatch4Enabled.value = patch4Enabled ? 1.0 : 0.0;
    materialRef.current.uniforms.uPatch4Center.value.set(patch4U, patch4V);
    materialRef.current.uniforms.uPatch4Radius.value = patch4Radius;
    materialRef.current.uniforms.uPatch4Softness.value = patch4Softness;
  }, [
    maskMode,
    maskThreshold,
    maskSoftness,
    maskColorVec,
    maskPreview,
    maskPreviewSplit,
    maskPreviewMode,
    previewColorVec,
    maskInvert,
    rectMaskEnabled,
    rectMaskU,
    rectMaskV,
    rectMaskWidth,
    rectMaskHeight,
    rectMaskSoftness,
    rectMaskInvert,
    videoYaw,
    videoPitch,
    seamBlendEnabled,
    seamBlendWidth,
    holeFixEnabled,
    holeFixThreshold,
    holeFixSoftness,
    poleFadeEnabled,
    poleFadeStart,
    poleFadeSoftness,
    patchEnabled,
    patchU,
    patchV,
    patchRadius,
    patchSoftness,
    patch2Enabled,
    patch2U,
    patch2V,
    patch2Radius,
    patch2Softness,
    patch3Enabled,
    patch3U,
    patch3V,
    patch3Radius,
    patch3Softness,
    patch4Enabled,
    patch4U,
    patch4V,
    patch4Radius,
    patch4Softness,
  ]);

  const handlePick = (event: ThreeEvent<PointerEvent>) => {
    if (patchPickTarget === "none") return;
    if (!event.uv) return;
    event.stopPropagation();
    setPatchPickCursor(event.clientX, event.clientY);
    const u = THREE.MathUtils.clamp(event.uv.x, 0, 1);
    const v = THREE.MathUtils.clamp(event.uv.y, 0, 1);

    if (patchPickTarget === "patchA") {
      setSkyboxPatchU(u);
      setSkyboxPatchV(v);
    } else if (patchPickTarget === "patchB") {
      setSkyboxPatch2U(u);
      setSkyboxPatch2V(v);
    } else if (patchPickTarget === "patchC") {
      setSkyboxPatch3U(u);
      setSkyboxPatch3V(v);
    } else if (patchPickTarget === "patchD") {
      setSkyboxPatch4U(u);
      setSkyboxPatch4V(v);
    }

    if (!patchPickMulti) {
      setPatchPickTarget("none");
    }
  };

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
    if (rotationSpeed && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  if (!videoTexture) return null;

  return (
    <mesh
      ref={meshRef}
      renderOrder={-1}
      onPointerDown={handlePick}
    >
      <sphereGeometry args={[100, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        transparent={
          maskMode !== "none" ||
          rectMaskEnabled ||
          holeFixEnabled ||
          poleFadeEnabled ||
          patchEnabled ||
          patch2Enabled ||
          patch3Enabled ||
          patch4Enabled
        }
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
          uniform float uPreviewMode;
          uniform vec3 uPreviewColor;
          uniform float uInvert;
          uniform float uRectEnabled;
          uniform vec2 uRectCenter;
          uniform vec2 uRectSize;
          uniform float uRectSoftness;
          uniform float uRectInvert;
          uniform float uVideoYaw;
          uniform float uVideoPitch;
          uniform float uSeamBlendEnabled;
          uniform float uSeamBlendWidth;
          uniform float uHoleFixEnabled;
          uniform float uHoleFixThreshold;
          uniform float uHoleFixSoftness;
          uniform float uPoleFadeEnabled;
          uniform float uPoleFadeStart;
          uniform float uPoleFadeSoftness;
          uniform float uPatchEnabled;
          uniform vec2 uPatchCenter;
          uniform float uPatchRadius;
          uniform float uPatchSoftness;
          uniform float uPatch2Enabled;
          uniform vec2 uPatch2Center;
          uniform float uPatch2Radius;
          uniform float uPatch2Softness;
          uniform float uPatch3Enabled;
          uniform vec2 uPatch3Center;
          uniform float uPatch3Radius;
          uniform float uPatch3Softness;
          uniform float uPatch4Enabled;
          uniform vec2 uPatch4Center;
          uniform float uPatch4Radius;
          uniform float uPatch4Softness;
          varying vec2 vUv;

          float luma(vec3 c) {
            return dot(c, vec3(0.2126, 0.7152, 0.0722));
          }

          void main() {
            vec2 uv = vUv;
            uv.x = fract(uv.x + uVideoYaw);
            uv.y = clamp(uv.y + uVideoPitch, 0.0, 1.0);
            vec4 color = texture2D(uMap, uv);

            if (uSeamBlendEnabled > 0.5) {
              float seam = min(uv.x, 1.0 - uv.x);
              float blend = smoothstep(0.0, uSeamBlendWidth, seam);
              vec2 seamUv = vec2(fract(uv.x + 0.5), uv.y);
              vec4 seamColor = texture2D(uMap, seamUv);
              color = mix(seamColor, color, blend);
            }
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

            if (uRectEnabled > 0.5) {
              vec2 halfSize = uRectSize * 0.5;
              vec2 d = abs(uv - uRectCenter);
              float edgeX = smoothstep(halfSize.x, halfSize.x + uRectSoftness, d.x);
              float edgeY = smoothstep(halfSize.y, halfSize.y + uRectSoftness, d.y);
              float edge = max(edgeX, edgeY);
              float rectAlpha = 1.0 - edge;
              if (uRectInvert > 0.5) {
                rectAlpha = 1.0 - rectAlpha;
              }
              alpha *= rectAlpha;
            }

            if (uHoleFixEnabled > 0.5) {
              float lum = luma(color.rgb);
              float hole = smoothstep(uHoleFixThreshold, uHoleFixThreshold + uHoleFixSoftness, lum);
              hole = pow(hole, 1.6);
              alpha *= hole;
            }

            if (uPoleFadeEnabled > 0.5) {
              float pole = min(vUv.y, 1.0 - vUv.y);
              float poleAlpha = smoothstep(uPoleFadeStart, uPoleFadeStart + uPoleFadeSoftness, pole);
              poleAlpha = pow(poleAlpha, 1.6);
              alpha *= poleAlpha;
            }

            if (uPatchEnabled > 0.5) {
              float du = abs(vUv.x - uPatchCenter.x);
              du = min(du, 1.0 - du);
              float dv = abs(vUv.y - uPatchCenter.y);
              float dist = sqrt(du * du + dv * dv);
              float patchAlpha = smoothstep(uPatchRadius, uPatchRadius + uPatchSoftness, dist);
              alpha *= patchAlpha;
            }

            if (uPatch2Enabled > 0.5) {
              float du2 = abs(vUv.x - uPatch2Center.x);
              du2 = min(du2, 1.0 - du2);
              float dv2 = abs(vUv.y - uPatch2Center.y);
              float dist2 = sqrt(du2 * du2 + dv2 * dv2);
              float patchAlpha2 = smoothstep(uPatch2Radius, uPatch2Radius + uPatch2Softness, dist2);
              alpha *= patchAlpha2;
            }

            if (uPatch3Enabled > 0.5) {
              float du3 = abs(vUv.x - uPatch3Center.x);
              du3 = min(du3, 1.0 - du3);
              float dv3 = abs(vUv.y - uPatch3Center.y);
              float dist3 = sqrt(du3 * du3 + dv3 * dv3);
              float patchAlpha3 = smoothstep(uPatch3Radius, uPatch3Radius + uPatch3Softness, dist3);
              alpha *= patchAlpha3;
            }

            if (uPatch4Enabled > 0.5) {
              float du4 = abs(vUv.x - uPatch4Center.x);
              du4 = min(du4, 1.0 - du4);
              float dv4 = abs(vUv.y - uPatch4Center.y);
              float dist4 = sqrt(du4 * du4 + dv4 * dv4);
              float patchAlpha4 = smoothstep(uPatch4Radius, uPatch4Radius + uPatch4Softness, dist4);
              alpha *= patchAlpha4;
            }

            bool showPreview = uPreview > 0.5;
            if (uPreviewSplit > 0.5) {
              showPreview = showPreview && (vUv.x < 0.5);
            }

            if (showPreview) {
              if (uPreviewMode > 1.5) {
                gl_FragColor = vec4(vec3(alpha), 1.0);
              } else {
                vec3 keyedTint = mix(uPreviewColor, color.rgb, alpha);
                gl_FragColor = vec4(keyedTint, 1.0);
              }
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
