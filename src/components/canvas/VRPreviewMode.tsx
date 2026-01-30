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
 * - Audio preservation across orientation changes
 */

import { useRef, useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// IPD (Interpupillary Distance) in meters - standard is 64mm
const IPD = 0.064;

// Shared permission state context
type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'not-supported';

interface VRContextValue {
  permissionState: PermissionState;
  orientation: { alpha: number; beta: number; gamma: number } | null;
  requestPermission: () => Promise<boolean>;
}

const VRContext = createContext<VRContextValue | null>(null);

/**
 * VR Context Provider - manages shared gyroscope state
 */
export function VRContextProvider({ children }: { children: React.ReactNode }) {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [orientation, setOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('not-supported');
      return false;
    }

    // Always allow retry by setting to requesting state
    setPermissionState('requesting');

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
      // Non-iOS or older iOS - permission not required, test if it works
      setPermissionState('granted');
      return true;
    }
  }, []);

  // Set up orientation listener when permission is granted
  useEffect(() => {
    if (permissionState !== 'granted') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        setOrientation({
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
        });
      }
    };

    orientationListenerRef.current = handleOrientation;
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      if (orientationListenerRef.current) {
        window.removeEventListener('deviceorientation', orientationListenerRef.current);
      }
    };
  }, [permissionState]);

  return (
    <VRContext.Provider value={{ permissionState, orientation, requestPermission }}>
      {children}
    </VRContext.Provider>
  );
}

function useVRContext() {
  const context = useContext(VRContext);
  if (!context) {
    // Return default values if not in provider (standalone usage)
    return {
      permissionState: 'unknown' as PermissionState,
      orientation: null,
      requestPermission: async () => false,
    };
  }
  return context;
}

/**
 * Converts device orientation angles to a Three.js quaternion
 * Optimized for iOS landscape VR viewing
 *
 * Device orientation (relative to Earth):
 * - alpha: compass direction (0-360), rotation around Z
 * - beta: front-to-back tilt (-180 to 180), rotation around X
 * - gamma: left-to-right tilt (-90 to 90), rotation around Y
 */
function getQuaternionFromOrientation(
  alpha: number,
  beta: number,
  gamma: number,
  screenOrientation: number
): THREE.Quaternion {
  // Convert to radians
  const alphaRad = THREE.MathUtils.degToRad(alpha);
  const betaRad = THREE.MathUtils.degToRad(beta);
  const gammaRad = THREE.MathUtils.degToRad(gamma);
  const orientRad = THREE.MathUtils.degToRad(screenOrientation);

  const quaternion = new THREE.Quaternion();

  // For landscape orientation on iOS, we need to remap the axes
  // Screen orientation 90 = landscape left, -90/270 = landscape right
  if (Math.abs(screenOrientation) === 90 || screenOrientation === 270) {
    // Landscape mode - swap axes for proper VR viewing
    // When phone is landscape, gamma becomes pitch, beta becomes roll
    const adjustedOrientation = screenOrientation === 90 ? 1 : -1;

    // Create quaternion for landscape VR viewing
    // alpha = yaw (looking left/right)
    // gamma = pitch (looking up/down) in landscape
    // beta = roll (tilting head) in landscape
    const yaw = alphaRad;
    const pitch = gammaRad * adjustedOrientation;
    const roll = -betaRad * adjustedOrientation;

    // Build quaternion from yaw, pitch, roll
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);

    quaternion.set(
      sr * cp * cy - cr * sp * sy,  // x
      cr * sp * cy + sr * cp * sy,  // y
      cr * cp * sy - sr * sp * cy,  // z
      cr * cp * cy + sr * sp * sy   // w
    );
  } else {
    // Portrait mode - use standard device orientation
    const euler = new THREE.Euler();
    euler.set(betaRad, alphaRad, -gammaRad, 'YXZ');
    quaternion.setFromEuler(euler);

    // Apply screen orientation correction
    const screenQuat = new THREE.Quaternion();
    screenQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orientRad);
    quaternion.multiply(screenQuat);

    // Rotate -90 degrees around X to look out back of device
    const xQuat = new THREE.Quaternion();
    xQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    quaternion.multiply(xQuat);
  }

  return quaternion;
}

/**
 * VR Camera Controller - uses gyroscope for camera rotation
 */
function VRCameraController({ orientation }: { orientation: { alpha: number; beta: number; gamma: number } | null }) {
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
 * Stereoscopic Renderer - renders left/right eye views
 */
function StereoRenderer({ enabled }: { enabled: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const stereoCamera = useRef<THREE.StereoCamera | null>(null);
  const wasEnabled = useRef(false);

  useEffect(() => {
    if (enabled) {
      stereoCamera.current = new THREE.StereoCamera();
      stereoCamera.current.eyeSep = IPD;
      wasEnabled.current = true;
    } else if (wasEnabled.current) {
      // Reset viewport when transitioning from enabled to disabled
      stereoCamera.current = null;
      gl.setViewport(0, 0, size.width, size.height);
      gl.setScissor(0, 0, size.width, size.height);
      gl.setScissorTest(false);
      gl.autoClear = true;
      wasEnabled.current = false;
    }
  }, [enabled, gl, size.width, size.height]);

  // Also reset on unmount
  useEffect(() => {
    return () => {
      gl.setViewport(0, 0, size.width, size.height);
      gl.setScissor(0, 0, size.width, size.height);
      gl.setScissorTest(false);
      gl.autoClear = true;
    };
  }, [gl, size.width, size.height]);

  useFrame(() => {
    if (!enabled || !stereoCamera.current) {
      // Ensure viewport is reset every frame when not enabled
      // This catches cases where something else might have changed it
      return;
    }

    const glSize = gl.getSize(new THREE.Vector2());
    const halfWidth = glSize.x / 2;

    stereoCamera.current.update(camera as THREE.PerspectiveCamera);

    gl.setScissorTest(true);
    gl.autoClear = false;
    gl.clear();

    // Left eye
    gl.setViewport(0, 0, halfWidth, glSize.y);
    gl.setScissor(0, 0, halfWidth, glSize.y);
    gl.render(scene, stereoCamera.current.cameraL);

    // Right eye
    gl.setViewport(halfWidth, 0, halfWidth, glSize.y);
    gl.setScissor(halfWidth, 0, halfWidth, glSize.y);
    gl.render(scene, stereoCamera.current.cameraR);

    gl.setScissorTest(false);
    gl.autoClear = true;
  }, 1);

  return null;
}

interface VRPreviewModeProps {
  enabled: boolean;
  onExit: () => void;
}

/**
 * Main VR Preview Mode Component (inside Canvas)
 */
export function VRPreviewMode({ enabled, onExit }: VRPreviewModeProps) {
  const { orientation, permissionState } = useVRContext();

  // Don't auto-request permission here - let VRModeOverlay handle it
  // so the user sees the permission button UI first

  if (!enabled) return null;

  return (
    <>
      {permissionState === 'granted' && <VRCameraController orientation={orientation} />}
      <StereoRenderer enabled={enabled && permissionState === 'granted'} />
    </>
  );
}

/**
 * VR Mode Overlay (outside Canvas)
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
  const { permissionState, requestPermission } = useVRContext();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  }, [requestPermission]);

  // Auto-request on non-iOS devices
  useEffect(() => {
    if (enabled && permissionState === 'unknown') {
      // Check if explicit permission is needed (iOS)
      if (typeof DeviceOrientationEvent !== 'undefined') {
        const needsExplicit = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function';
        if (!needsExplicit) {
          requestPermission();
        }
      }
    }
  }, [enabled, permissionState, requestPermission]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[100] touch-none" onClick={onExit}>
      {/* Instructions overlay */}
      {showInstructions && permissionState === 'granted' && (
        <div
          className="absolute inset-0 bg-black/80 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onDismissInstructions(); }}
        >
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">VR Preview Mode</h2>
            <div className="space-y-3 text-lg">
              <p>Hold phone in landscape orientation</p>
              <p>Place in a VR headset</p>
              <p>Move phone to look around</p>
              <p className="text-white/60 text-base mt-6">Tap anywhere to exit</p>
            </div>
            <button
              className="mt-8 px-6 py-3 bg-white/20 rounded-lg text-lg"
              onClick={(e) => { e.stopPropagation(); onDismissInstructions(); }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* iOS Permission Request */}
      {permissionState === 'unknown' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Enable Motion Sensors</h2>
            <p className="text-lg mb-6">VR mode needs motion sensor access to track head movement.</p>
            <button
              className="px-8 py-4 bg-blue-500 rounded-lg text-xl font-semibold disabled:opacity-50"
              onClick={handleRequestPermission}
              disabled={isRequesting}
            >
              {isRequesting ? 'Requesting...' : 'Allow Motion Access'}
            </button>
            <button className="block mx-auto mt-4 text-white/60 underline" onClick={onExit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Permission Denied */}
      {permissionState === 'denied' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Motion Access Denied</h2>
            <p className="text-lg mb-4">Motion sensor access was denied.</p>
            <div className="text-left text-white/80 text-sm mb-6 bg-white/10 rounded-lg p-4">
              <p className="font-semibold mb-2">To enable on iOS Safari:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Settings app</li>
                <li>Scroll to Safari</li>
                <li>Enable "Motion & Orientation Access"</li>
                <li>Return here and try again</li>
              </ol>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                className="px-6 py-3 bg-blue-500 rounded-lg font-semibold"
                onClick={handleRequestPermission}
                disabled={isRequesting}
              >
                Try Again
              </button>
              <button className="px-6 py-3 bg-white/20 rounded-lg" onClick={onExit}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Supported */}
      {permissionState === 'not-supported' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-center text-white p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">VR Not Supported</h2>
            <p className="text-lg mb-6">Your device doesn't have motion sensors. VR mode requires a mobile device with gyroscope.</p>
            <button className="px-6 py-3 bg-white/20 rounded-lg" onClick={onExit}>
              Exit VR Mode
            </button>
          </div>
        </div>
      )}

      {/* Center divider */}
      {permissionState === 'granted' && !showInstructions && (
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/50 transform -translate-x-1/2 pointer-events-none" />
      )}

      {/* Exit hint */}
      {permissionState === 'granted' && !showInstructions && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/40 text-sm pointer-events-none">
          Tap to exit
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage VR mode state
 */
export function useVRMode() {
  const [isVRMode, setIsVRMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const enterVRMode = useCallback(async () => {
    // Don't use fullscreen - it causes issues with audio and orientation
    // Just set VR mode and let the overlay handle the UI
    setIsVRMode(true);

    // Try to lock orientation to landscape (won't block if it fails)
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape');
      }
    } catch {
      // Orientation lock not supported - that's okay
    }
  }, []);

  const exitVRMode = useCallback(() => {
    setIsVRMode(false);

    // Unlock orientation
    try {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as unknown as { unlock: () => void }).unlock();
      }
    } catch {
      // Ignore
    }
  }, []);

  const dismissInstructions = useCallback(() => {
    setShowInstructions(false);
    try {
      localStorage.setItem('vr-instructions-seen', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Check if instructions have been seen
  useEffect(() => {
    try {
      if (localStorage.getItem('vr-instructions-seen') === 'true') {
        setShowInstructions(false);
      }
    } catch {
      // Ignore
    }
  }, []);

  return {
    isVRMode,
    showInstructions,
    enterVRMode,
    exitVRMode,
    dismissInstructions,
  };
}
