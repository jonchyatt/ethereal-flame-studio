'use client';

/**
 * VRPreviewMode - Mobile VR Preview with Gyroscope Camera Control
 *
 * Features:
 * - Stereoscopic split-screen rendering (left/right eye views)
 * - DeviceOrientationEvent API for gyroscope camera control
 * - iOS 13+ permission request handling
 * - 64mm IPD (interpupillary distance) for proper 3D depth
 * - Tap to exit VR mode
 * - First-use instruction overlay
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface VRPreviewModeProps {
  enabled: boolean;
  onExit: () => void;
}

// IPD (Interpupillary Distance) in meters - standard is 64mm
const IPD = 0.064;

/**
 * Hook to handle device orientation (gyroscope) for camera rotation
 * Handles iOS 13+ permission request flow
 */
function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<{
    alpha: number;
    beta: number;
    gamma: number;
  } | null>(null);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'not-supported'>('unknown');

  const requestPermission = useCallback(async () => {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('not-supported');
      return false;
    }

    // iOS 13+ requires explicit permission request
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission === 'granted') {
          setPermissionState('granted');
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error);
        setPermissionState('denied');
        return false;
      }
    } else {
      // Non-iOS or older iOS - permission not required
      setPermissionState('granted');
      return true;
    }
  }, []);

  useEffect(() => {
    if (permissionState !== 'granted') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        setOrientation({
          alpha: event.alpha, // Z-axis rotation (compass direction)
          beta: event.beta,   // X-axis rotation (front-back tilt)
          gamma: event.gamma, // Y-axis rotation (left-right tilt)
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [permissionState]);

  return { orientation, permissionState, requestPermission };
}

/**
 * Converts device orientation angles to a Three.js quaternion
 * Based on the screen orientation and device tilt
 */
function getQuaternionFromOrientation(
  alpha: number,
  beta: number,
  gamma: number,
  screenOrientation: number
): THREE.Quaternion {
  // Convert degrees to radians
  const alphaRad = THREE.MathUtils.degToRad(alpha);
  const betaRad = THREE.MathUtils.degToRad(beta);
  const gammaRad = THREE.MathUtils.degToRad(gamma);
  const screenOrientationRad = THREE.MathUtils.degToRad(screenOrientation);

  // Create Euler angles
  const euler = new THREE.Euler();

  // ZXY order for device orientation
  // Alpha: around Z (yaw/compass)
  // Beta: around X (pitch/tilt forward-back)
  // Gamma: around Y (roll/tilt left-right)
  euler.set(betaRad, alphaRad, -gammaRad, 'YXZ');

  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);

  // Adjust for screen orientation (landscape)
  const screenQuaternion = new THREE.Quaternion();
  screenQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientationRad);
  quaternion.multiply(screenQuaternion);

  // Initial rotation to align with Three.js coordinate system
  // Device "forward" should look into the scene
  const worldQuaternion = new THREE.Quaternion();
  worldQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  quaternion.multiply(worldQuaternion);

  return quaternion;
}

/**
 * VR Camera Controller Component
 * Handles gyroscope-based camera rotation inside the Canvas
 */
function VRCameraController({
  orientation,
}: {
  orientation: { alpha: number; beta: number; gamma: number } | null;
}) {
  const { camera } = useThree();
  const screenOrientationRef = useRef(0);

  useEffect(() => {
    const updateScreenOrientation = () => {
      screenOrientationRef.current = window.screen.orientation?.angle || 0;
    };

    updateScreenOrientation();
    window.addEventListener('orientationchange', updateScreenOrientation);
    return () => window.removeEventListener('orientationchange', updateScreenOrientation);
  }, []);

  useFrame(() => {
    if (!orientation) return;

    const quaternion = getQuaternionFromOrientation(
      orientation.alpha,
      orientation.beta,
      orientation.gamma,
      screenOrientationRef.current
    );

    camera.quaternion.copy(quaternion);
  });

  return null;
}

/**
 * Stereoscopic Render Manager
 * Renders the scene twice with offset cameras for left/right eye views
 */
function StereoRenderer({ enabled }: { enabled: boolean }) {
  const { gl, scene, camera } = useThree();
  const stereoCamera = useRef<THREE.StereoCamera | null>(null);

  useEffect(() => {
    if (enabled) {
      stereoCamera.current = new THREE.StereoCamera();
      stereoCamera.current.eyeSep = IPD;
    }
    return () => {
      stereoCamera.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      // Reset viewport when VR mode is disabled
      gl.setViewport(0, 0, gl.domElement.width, gl.domElement.height);
      gl.setScissorTest(false);
    }
  }, [enabled, gl]);

  useFrame(() => {
    if (!enabled || !stereoCamera.current) return;

    const size = gl.getSize(new THREE.Vector2());
    const halfWidth = size.x / 2;

    // Update stereo camera from main camera
    stereoCamera.current.update(camera as THREE.PerspectiveCamera);

    // Enable scissor test for split rendering
    gl.setScissorTest(true);
    gl.autoClear = false;
    gl.clear();

    // Left eye (left half of screen)
    gl.setViewport(0, 0, halfWidth, size.y);
    gl.setScissor(0, 0, halfWidth, size.y);
    gl.render(scene, stereoCamera.current.cameraL);

    // Right eye (right half of screen)
    gl.setViewport(halfWidth, 0, halfWidth, size.y);
    gl.setScissor(halfWidth, 0, halfWidth, size.y);
    gl.render(scene, stereoCamera.current.cameraR);

    // Reset for next frame
    gl.setScissorTest(false);
    gl.autoClear = true;
  }, 1); // Priority 1 to run after other useFrame hooks

  return null;
}

/**
 * Main VR Preview Mode Component
 * Renders inside the Canvas
 */
export function VRPreviewMode({ enabled, onExit }: VRPreviewModeProps) {
  const { orientation, permissionState, requestPermission } = useDeviceOrientation();

  // Request permission when VR mode is enabled
  useEffect(() => {
    if (enabled && permissionState === 'unknown') {
      requestPermission();
    }
  }, [enabled, permissionState, requestPermission]);

  if (!enabled) return null;

  return (
    <>
      <VRCameraController orientation={orientation} />
      <StereoRenderer enabled={enabled} />
    </>
  );
}

/**
 * VR Mode Overlay Component
 * Renders outside the Canvas for UI elements
 */
export function VRModeOverlay({
  enabled,
  onExit,
  showInstructions,
  onDismissInstructions,
}: {
  enabled: boolean;
  onExit: () => void;
  showInstructions: boolean;
  onDismissInstructions: () => void;
}) {
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'not-supported'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const requestGyroPermission = useCallback(async () => {
    setIsRequestingPermission(true);

    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('not-supported');
      setIsRequestingPermission(false);
      return;
    }

    // iOS 13+ requires explicit permission request
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        setPermissionState(permission === 'granted' ? 'granted' : 'denied');
      } catch {
        setPermissionState('denied');
      }
    } else {
      // Non-iOS or older iOS - assume granted
      setPermissionState('granted');
    }

    setIsRequestingPermission(false);
  }, []);

  // Auto-request on non-iOS devices when enabled
  useEffect(() => {
    if (enabled && permissionState === 'unknown') {
      // Check if we need to show permission button (iOS) or can auto-request
      if (typeof DeviceOrientationEvent !== 'undefined') {
        const needsExplicitPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function';
        if (!needsExplicitPermission) {
          setPermissionState('granted');
        }
      } else {
        setPermissionState('not-supported');
      }
    }
  }, [enabled, permissionState]);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 z-[100] touch-none"
      onClick={onExit}
    >
      {/* Instruction Overlay (first use) */}
      {showInstructions && permissionState === 'granted' && (
        <div
          className="absolute inset-0 bg-black/80 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onDismissInstructions();
          }}
        >
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">VR Preview Mode</h2>
            <div className="space-y-3 text-lg">
              <p>Hold your phone in landscape orientation</p>
              <p>Place in a VR headset or cardboard viewer</p>
              <p>Move your phone to look around</p>
              <p className="text-white/60 text-base mt-6">Tap anywhere to exit VR mode</p>
            </div>
            <button
              className="mt-8 px-6 py-3 bg-white/20 rounded-lg text-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDismissInstructions();
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* iOS Permission Request */}
      {permissionState === 'unknown' && (
        <div
          className="absolute inset-0 bg-black/90 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Enable Motion Sensors</h2>
            <p className="text-lg mb-6">
              VR mode needs access to your device's motion sensors to track head movement.
            </p>
            <button
              className="px-8 py-4 bg-blue-500 rounded-lg text-xl font-semibold disabled:opacity-50"
              onClick={requestGyroPermission}
              disabled={isRequestingPermission}
            >
              {isRequestingPermission ? 'Requesting...' : 'Allow Motion Access'}
            </button>
            <button
              className="block mx-auto mt-4 text-white/60 underline"
              onClick={onExit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Permission Denied Message */}
      {permissionState === 'denied' && (
        <div
          className="absolute inset-0 bg-black/90 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Motion Access Denied</h2>
            <p className="text-lg mb-6">
              VR mode requires motion sensor access. Please enable it in your browser settings and try again.
            </p>
            <button
              className="px-6 py-3 bg-white/20 rounded-lg"
              onClick={onExit}
            >
              Exit VR Mode
            </button>
          </div>
        </div>
      )}

      {/* Not Supported Message */}
      {permissionState === 'not-supported' && (
        <div
          className="absolute inset-0 bg-black/90 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">VR Not Supported</h2>
            <p className="text-lg mb-6">
              Your device doesn't support motion sensors. VR mode requires a mobile device with gyroscope.
            </p>
            <button
              className="px-6 py-3 bg-white/20 rounded-lg"
              onClick={onExit}
            >
              Exit VR Mode
            </button>
          </div>
        </div>
      )}

      {/* Center divider line for stereoscopic view */}
      {permissionState === 'granted' && !showInstructions && (
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/50 transform -translate-x-1/2" />
      )}

      {/* Exit hint (always visible in corner) */}
      {permissionState === 'granted' && !showInstructions && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/40 text-sm pointer-events-none">
          Tap to exit
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage VR mode state including fullscreen and screen lock
 */
export function useVRMode() {
  const [isVRMode, setIsVRMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const enterVRMode = useCallback(async () => {
    // Request fullscreen
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } catch (error) {
      console.warn('Could not enter fullscreen:', error);
    }

    // Try to lock screen orientation to landscape
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('landscape');
      }
    } catch (error) {
      console.warn('Could not lock screen orientation:', error);
    }

    setIsVRMode(true);
  }, []);

  const exitVRMode = useCallback(() => {
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Unlock screen orientation
    try {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as unknown as { unlock: () => void }).unlock();
      }
    } catch {
      // Ignore errors
    }

    setIsVRMode(false);
  }, []);

  const dismissInstructions = useCallback(() => {
    setShowInstructions(false);
    // Store preference in localStorage
    try {
      localStorage.setItem('vr-instructions-seen', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Check if instructions have been seen before
  useEffect(() => {
    try {
      const seen = localStorage.getItem('vr-instructions-seen');
      if (seen === 'true') {
        setShowInstructions(false);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Handle escape key and fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isVRMode) {
        exitVRMode();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isVRMode, exitVRMode]);

  return {
    isVRMode,
    showInstructions,
    enterVRMode,
    exitVRMode,
    dismissInstructions,
  };
}
