"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function DragLookControls({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const dom = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      isDragging.current = true;
      lastX.current = event.clientX;
      lastY.current = event.clientY;
      dom.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = event.clientX - lastX.current;
      const dy = event.clientY - lastY.current;
      lastX.current = event.clientX;
      lastY.current = event.clientY;

      const sensitivity = 0.0025;
      yaw.current -= dx * sensitivity;
      pitch.current -= dy * sensitivity;
      const limit = Math.PI / 2 - 0.01;
      pitch.current = THREE.MathUtils.clamp(pitch.current, -limit, limit);

      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    };

    const endDrag = (event: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      dom.releasePointerCapture(event.pointerId);
    };

    dom.addEventListener("pointerdown", handlePointerDown);
    dom.addEventListener("pointermove", handlePointerMove);
    dom.addEventListener("pointerup", endDrag);
    dom.addEventListener("pointercancel", endDrag);
    dom.addEventListener("pointerleave", endDrag);

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
      dom.removeEventListener("pointermove", handlePointerMove);
      dom.removeEventListener("pointerup", endDrag);
      dom.removeEventListener("pointercancel", endDrag);
      dom.removeEventListener("pointerleave", endDrag);
    };
  }, [camera, gl, enabled]);

  return null;
}
