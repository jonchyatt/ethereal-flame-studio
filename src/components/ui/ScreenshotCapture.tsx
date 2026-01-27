'use client';

import { useThree } from '@react-three/fiber';
import { useImperativeHandle, forwardRef } from 'react';

export interface ScreenshotCaptureRef {
  capture: () => Promise<string>;
}

/**
 * Invisible component that provides screenshot capture functionality
 * Must be placed inside Canvas tree to access gl context
 */
export const ScreenshotCapture = forwardRef<ScreenshotCaptureRef>((_, ref) => {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(ref, () => ({
    capture: async (): Promise<string> => {
      // Force render to ensure current state is drawn
      gl.render(scene, camera);

      // Capture full canvas as JPEG
      const fullDataUrl = gl.domElement.toDataURL('image/jpeg', 0.8);

      // Resize to thumbnail (150x150, center-cropped square)
      return resizeToThumbnail(fullDataUrl, 150, 150);
    },
  }));

  return null; // Invisible component
});

ScreenshotCapture.displayName = 'ScreenshotCapture';

/**
 * Resize image to square thumbnail using offscreen canvas
 */
function resizeToThumbnail(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      // Center crop to square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.drawImage(img, sx, sy, size, size, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
