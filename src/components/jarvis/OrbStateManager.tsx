'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';
import { OrbState, DEFAULT_TRANSITIONS } from '@/lib/jarvis/types';

// Animation parameters per state
interface StateAnimation {
  // Particle behavior
  particleSpread: number;      // 0 = tight core, 1 = dispersed cloud
  driftSpeed: number;          // Movement speed multiplier
  pulseAmplitude: number;      // 0 = no pulse, 1 = strong pulse
  swirlSpeed: number;          // Rotation/swirl rate

  // Visual intensity
  baseIntensity: number;       // 1.7 = Ethereal Flame default
  audioReactivity: number;     // How much audio affects visuals
}

const STATE_ANIMATIONS: Record<OrbState, StateAnimation> = {
  idle: {
    particleSpread: 0.7,       // Particles dispersed as cloud
    driftSpeed: 0.3,           // Slow drift
    pulseAmplitude: 0,
    swirlSpeed: 0.1,
    baseIntensity: 1.7,
    audioReactivity: 0,
  },
  listening: {
    particleSpread: 0.3,       // Particles draw inward
    driftSpeed: 0.5,           // Keep motion visible (NOT frozen)
    pulseAmplitude: 0.1,
    swirlSpeed: 0.2,
    baseIntensity: 1.8,
    audioReactivity: 0.5,      // Subtle audio response
  },
  thinking: {
    particleSpread: 0.5,
    driftSpeed: 0.4,
    pulseAmplitude: 0.3,       // Gentle pulse
    swirlSpeed: 0.5,           // Swirl motion
    baseIntensity: 1.9,
    audioReactivity: 0,
  },
  speaking: {
    particleSpread: 0.8,       // Particles expand outward
    driftSpeed: 0.6,
    pulseAmplitude: 0.2,
    swirlSpeed: 0.3,
    baseIntensity: 2.0,
    audioReactivity: 1.0,      // Full audio reactivity
  },
};

export interface OrbAnimationState {
  color: [number, number, number];
  particleSpread: number;
  driftSpeed: number;
  pulseAmplitude: number;
  swirlSpeed: number;
  baseIntensity: number;
  audioReactivity: number;
  transitionProgress: number;
}

interface Props {
  onAnimationUpdate: (state: OrbAnimationState) => void;
}

export function OrbStateManager({ onAnimationUpdate }: Props) {
  const orbState = useJarvisStore((s) => s.orbState);
  const stateColors = useJarvisStore((s) => s.stateColors);
  const importance = useJarvisStore((s) => s.importance);

  // Animation state refs (no re-renders)
  const currentState = useRef<OrbAnimationState>({
    color: stateColors.idle,
    ...STATE_ANIMATIONS.idle,
    transitionProgress: 1,
  });
  const targetState = useRef<OrbState>('idle');
  const transitionStartTime = useRef(0);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const current = currentState.current;

    // Check for state change
    if (orbState !== targetState.current) {
      targetState.current = orbState;
      transitionStartTime.current = time;
    }

    // Calculate transition duration based on importance
    // Higher importance = faster transitions (more urgent)
    const { minDuration, maxDuration } = DEFAULT_TRANSITIONS;
    const transitionDuration = (maxDuration - (maxDuration - minDuration) * importance) / 1000;

    // Calculate transition progress
    const elapsed = time - transitionStartTime.current;
    const progress = Math.min(1, elapsed / transitionDuration);

    // Smooth easing (ease-in-out)
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Get target animation params
    const targetAnim = STATE_ANIMATIONS[orbState];
    const targetColor = stateColors[orbState];

    // Lerp all animation values
    current.color = [
      current.color[0] + (targetColor[0] - current.color[0]) * eased,
      current.color[1] + (targetColor[1] - current.color[1]) * eased,
      current.color[2] + (targetColor[2] - current.color[2]) * eased,
    ];
    current.particleSpread += (targetAnim.particleSpread - current.particleSpread) * eased;
    current.driftSpeed += (targetAnim.driftSpeed - current.driftSpeed) * eased;
    current.pulseAmplitude += (targetAnim.pulseAmplitude - current.pulseAmplitude) * eased;
    current.swirlSpeed += (targetAnim.swirlSpeed - current.swirlSpeed) * eased;
    current.baseIntensity += (targetAnim.baseIntensity - current.baseIntensity) * eased;
    current.audioReactivity += (targetAnim.audioReactivity - current.audioReactivity) * eased;
    current.transitionProgress = progress;

    // Apply importance multiplier to intensity
    // Higher importance = more intense visuals
    const intensityBoost = 1 + importance * 0.3;
    const finalIntensity = current.baseIntensity * intensityBoost;

    // Apply audio reactivity boost based on importance
    const reactivityBoost = 1 + importance * 0.5;
    const finalReactivity = current.audioReactivity * reactivityBoost;

    onAnimationUpdate({
      ...current,
      baseIntensity: finalIntensity,
      audioReactivity: finalReactivity,
    });
  });

  return null; // Pure logic component
}
