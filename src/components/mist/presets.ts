export type GlowStyle = 'mist' | 'vortex' | 'blend'

export type GlowPosition = 'top' | 'bottom' | 'full';
export type GlowMode = 'idle' | 'searching' | 'answering';

// Indigo, violet, teal and gold: brand/prompts/vortex-ribbon.md.
// The gold is a dim adaptation of #e6bd77 in scripts/generate-brand-marks.mjs.
export const MIST_PRESETS = {
  whatAmIAppreciatingNow: {
    label: 'What Am I Appreciating Now',
    palette: ['#272b5d', '#154c49', '#6b5837', '#4c3264', '#272b5d'],
    speed: 0.65,
    intensity: 0.9,
    height: 0.85,
    grain: 0.3,
    position: 'full',
  },
  gemini: {
    label: 'Gemini',
    palette: ['#1a2e5c', '#083820', '#56440f', '#3e264b', '#1a2e5c'],
    speed: 1,
    intensity: 1,
    height: 0.5,
    grain: 0.3,
    position: 'top',
  },
  geminiColours: {
    label: 'Gemini colours · full screen',
    palette: ['#1a2e5c', '#083820', '#56440f', '#3e264b', '#1a2e5c'],
    speed: 1,
    intensity: 1,
    height: 0.85,
    grain: 0.3,
    position: 'full',
  },
} as const;

export type MistPresetId = keyof typeof MIST_PRESETS;
