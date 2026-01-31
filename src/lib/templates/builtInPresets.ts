import { VisualTemplate, TemplateSettings } from './types';
import { ETHEREAL_FLAME_CONFIG, ETHEREAL_MIST_CONFIG } from '@/lib/stores/visualStore';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';
import { ParticleLayerConfig } from '@/types';

// Note: Thumbnail images will be generated after UI is built
// For now, TemplateCard will show a gradient fallback if thumbnail missing

// Helper to find skybox preset by key
const getSkyboxPreset = (key: string) =>
  STAR_NEST_PRESETS.find(p => p.key === key) || STAR_NEST_PRESETS[0];

const BASE_TEMPLATE_SETTINGS: Omit<TemplateSettings, 'intensity' | 'layers' | 'skyboxPreset' | 'skyboxRotationSpeed' | 'currentMode' | 'waterEnabled' | 'waterColor' | 'waterReflectivity'> = {
  skyboxAudioReactiveEnabled: true,
  skyboxAudioReactivity: 1.0,
  skyboxDriftSpeed: 1.0,
  skyboxMode: 'shader',
  skyboxVideoUrl: null,
  skyboxMaskMode: 'none',
  skyboxMaskThreshold: 0.65,
  skyboxMaskSoftness: 0.08,
  skyboxMaskColor: '#87ceeb',
  skyboxMaskInvert: false,
  vrComfortMode: false,
  orbAnchorMode: 'viewer',
  orbDistance: 6,
  orbHeight: 0,
  orbSideOffset: 0,
  orbWorldX: 0,
  orbWorldY: 0,
  orbWorldZ: 0,
  cameraLookAtOrb: false,
  cameraOrbitEnabled: false,
  cameraOrbitRenderOnly: false,
  cameraOrbitSpeed: 0.4,
  cameraOrbitRadius: 8,
  cameraOrbitHeight: 0,
};

// 1. Ethereal Flame - Warm fire orb (existing config)
const ETHEREAL_FLAME_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 1.0,
  layers: ETHEREAL_FLAME_CONFIG.layers,
  skyboxPreset: getSkyboxPreset('darkWorld1'),
  skyboxRotationSpeed: 0.5,
  currentMode: 'etherealFlame',
  waterEnabled: false,
  waterColor: '#0a1828',
  waterReflectivity: 0.4,
};

// 2. Ethereal Mist - Soft cloud-like (existing config)
const ETHEREAL_MIST_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 1.0,
  layers: ETHEREAL_MIST_CONFIG.layers,
  skyboxPreset: getSkyboxPreset('darkWorld1'),
  skyboxRotationSpeed: 0.3,
  currentMode: 'etherealMist',
  waterEnabled: false,
  waterColor: '#1a0a28',
  waterReflectivity: 0.3,
};

// 3. Cosmic Void - Deep space, minimal particles, dark ambient
const COSMIC_VOID_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'void-core',
    name: 'Void Core',
    enabled: true,
    particleCount: 15,
    baseSize: 8.0,
    spawnRadius: 0.08,
    maxSpeed: 0.005,
    lifetime: 6.0,
    audioReactivity: 1.5,
    frequencyBand: 'bass',
    sizeAtBirth: 0.1,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.2,
    peakLifetime: 0.4,
    colorStart: [0.2, 0.3, 0.5],
    colorEnd: [0.1, 0.1, 0.3],
  },
  {
    id: 'void-dust',
    name: 'Cosmic Dust',
    enabled: true,
    particleCount: 25,
    baseSize: 4.0,
    spawnRadius: 0.2,
    maxSpeed: 0.008,
    lifetime: 5.0,
    audioReactivity: 1.2,
    frequencyBand: 'treble',
    sizeAtBirth: 0.15,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.1,
    peakLifetime: 0.5,
    colorStart: [0.4, 0.4, 0.6],
    colorEnd: [0.2, 0.2, 0.4],
  },
];

const COSMIC_VOID_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 0.8,
  layers: COSMIC_VOID_LAYERS,
  skyboxPreset: getSkyboxPreset('darkWorld2'),
  skyboxRotationSpeed: 0.2,
  currentMode: 'etherealMist',
  waterEnabled: false,
  waterColor: '#050510',
  waterReflectivity: 0.2,
};

// 4. Solar Flare - High-energy, very reactive, intense warmth
const SOLAR_FLARE_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'flare-core',
    name: 'Flare Core',
    enabled: true,
    particleCount: 80,
    baseSize: 5.0,
    spawnRadius: 0.05,
    maxSpeed: 0.025,
    lifetime: 2.5,
    audioReactivity: 3.5,
    frequencyBand: 'bass',
    sizeAtBirth: 0.4,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.3,
    peakLifetime: 0.2,
    colorStart: [1.0, 1.0, 0.8],
    colorEnd: [1.0, 0.6, 0.0],
  },
  {
    id: 'flare-corona',
    name: 'Corona',
    enabled: true,
    particleCount: 50,
    baseSize: 7.0,
    spawnRadius: 0.1,
    maxSpeed: 0.03,
    lifetime: 2.0,
    audioReactivity: 3.0,
    frequencyBand: 'mids',
    sizeAtBirth: 0.3,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.2,
    peakLifetime: 0.25,
    colorStart: [1.0, 0.5, 0.1],
    colorEnd: [1.0, 0.2, 0.0],
  },
  {
    id: 'flare-ejections',
    name: 'Ejections',
    enabled: true,
    particleCount: 30,
    baseSize: 4.0,
    spawnRadius: 0.15,
    maxSpeed: 0.04,
    lifetime: 1.5,
    audioReactivity: 4.0,
    frequencyBand: 'treble',
    sizeAtBirth: 0.5,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.1,
    peakLifetime: 0.15,
    colorStart: [1.0, 0.8, 0.3],
    colorEnd: [1.0, 0.3, 0.0],
  },
];

const SOLAR_FLARE_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 1.2,
  layers: SOLAR_FLARE_LAYERS,
  skyboxPreset: getSkyboxPreset('darkWorld1'),
  skyboxRotationSpeed: 0.8,
  currentMode: 'etherealFlame',
  waterEnabled: false,
  waterColor: '#0a0500',
  waterReflectivity: 0.5,
};

// 5. Aurora - Cool blues/greens, flowing movement
const AURORA_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'aurora-veil',
    name: 'Aurora Veil',
    enabled: true,
    particleCount: 40,
    baseSize: 9.0,
    spawnRadius: 0.12,
    maxSpeed: 0.01,
    lifetime: 5.0,
    audioReactivity: 2.0,
    frequencyBand: 'mids',
    sizeAtBirth: 0.2,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.3,
    peakLifetime: 0.5,
    colorStart: [0.2, 0.9, 0.5],
    colorEnd: [0.1, 0.5, 0.9],
  },
  {
    id: 'aurora-ribbons',
    name: 'Ribbons',
    enabled: true,
    particleCount: 30,
    baseSize: 6.0,
    spawnRadius: 0.18,
    maxSpeed: 0.015,
    lifetime: 4.0,
    audioReactivity: 1.8,
    frequencyBand: 'treble',
    sizeAtBirth: 0.25,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.2,
    peakLifetime: 0.45,
    colorStart: [0.3, 0.7, 1.0],
    colorEnd: [0.5, 1.0, 0.7],
  },
];

const AURORA_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 1.0,
  layers: AURORA_LAYERS,
  skyboxPreset: getSkyboxPreset('darkWorld2'),
  skyboxRotationSpeed: 0.4,
  currentMode: 'etherealMist',
  waterEnabled: true,
  waterColor: '#051020',
  waterReflectivity: 0.6,
};

// 6. Neon Pulse - Vibrant synthwave aesthetic, highly reactive
const NEON_PULSE_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'neon-core',
    name: 'Neon Core',
    enabled: true,
    particleCount: 50,
    baseSize: 5.0,
    spawnRadius: 0.06,
    maxSpeed: 0.02,
    lifetime: 2.5,
    audioReactivity: 3.0,
    frequencyBand: 'bass',
    sizeAtBirth: 0.35,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.25,
    peakLifetime: 0.2,
    colorStart: [1.0, 0.0, 0.8],
    colorEnd: [0.0, 1.0, 1.0],
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    enabled: true,
    particleCount: 35,
    baseSize: 7.0,
    spawnRadius: 0.1,
    maxSpeed: 0.018,
    lifetime: 3.0,
    audioReactivity: 2.5,
    frequencyBand: 'mids',
    sizeAtBirth: 0.3,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.2,
    peakLifetime: 0.25,
    colorStart: [0.0, 1.0, 1.0],
    colorEnd: [1.0, 0.0, 0.5],
  },
  {
    id: 'neon-sparks',
    name: 'Sparks',
    enabled: true,
    particleCount: 25,
    baseSize: 3.0,
    spawnRadius: 0.14,
    maxSpeed: 0.035,
    lifetime: 1.5,
    audioReactivity: 3.5,
    frequencyBand: 'treble',
    sizeAtBirth: 0.5,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.1,
    peakLifetime: 0.15,
    colorStart: [1.0, 1.0, 0.0],
    colorEnd: [1.0, 0.0, 1.0],
  },
];

const NEON_PULSE_SETTINGS: TemplateSettings = {
  ...BASE_TEMPLATE_SETTINGS,
  intensity: 1.1,
  layers: NEON_PULSE_LAYERS,
  skyboxPreset: getSkyboxPreset('darkWorld1'),
  skyboxRotationSpeed: 0.7,
  currentMode: 'etherealFlame',
  waterEnabled: false,
  waterColor: '#0a0020',
  waterReflectivity: 0.5,
};

// Built-in presets array
export const BUILT_IN_PRESETS: VisualTemplate[] = [
  {
    id: 'builtin-ethereal-flame',
    name: 'Ethereal Flame',
    description: 'Fiery orb with warm center and orange edges - the classic look',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/ethereal-flame.jpg',
    isBuiltIn: true,
    settings: ETHEREAL_FLAME_SETTINGS,
  },
  {
    id: 'builtin-ethereal-mist',
    name: 'Ethereal Mist',
    description: 'Soft cloud-like particles with pastel colors - calm and meditative',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/ethereal-mist.jpg',
    isBuiltIn: true,
    settings: ETHEREAL_MIST_SETTINGS,
  },
  {
    id: 'builtin-cosmic-void',
    name: 'Cosmic Void',
    description: 'Deep space ambience with minimal particles - dark and mysterious',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/cosmic-void.jpg',
    isBuiltIn: true,
    settings: COSMIC_VOID_SETTINGS,
  },
  {
    id: 'builtin-solar-flare',
    name: 'Solar Flare',
    description: 'High-energy eruptions with intense warmth - explosive and reactive',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/solar-flare.jpg',
    isBuiltIn: true,
    settings: SOLAR_FLARE_SETTINGS,
  },
  {
    id: 'builtin-aurora',
    name: 'Aurora',
    description: 'Flowing northern lights with cool greens and blues - ethereal and peaceful',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/aurora.jpg',
    isBuiltIn: true,
    settings: AURORA_SETTINGS,
  },
  {
    id: 'builtin-neon-pulse',
    name: 'Neon Pulse',
    description: 'Vibrant synthwave aesthetic with cyan and magenta - energetic and modern',
    createdAt: 0,
    updatedAt: 0,
    thumbnail: '/presets/neon-pulse.jpg',
    isBuiltIn: true,
    settings: NEON_PULSE_SETTINGS,
  },
];

/**
 * Initialize built-in presets in the template store
 * Call this on app startup to merge built-ins with user templates
 */
export function initializeBuiltInPresets(
  setTemplates: (updater: (templates: VisualTemplate[]) => VisualTemplate[]) => void
) {
  setTemplates((existing) => {
    // Filter out any old built-in versions, add fresh ones
    const userTemplates = existing.filter(t => !t.isBuiltIn);
    return [...BUILT_IN_PRESETS, ...userTemplates];
  });
}
