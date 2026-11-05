// The two approved atmospheres keep their own palette, placement and clock.
export const LAYERED_MIST = {
  layered: true,
  palette: ['#272b5d', '#154c49', '#6b5837', '#4c3264', '#272b5d'],
  speed: 0.65,
  intensity: 0.9,
  height: 0.85,
  grain: 0.3,
  position: 'full',
} as const

export const GEMINI_TOP_LAYER = {
  palette: ['#1a2e5c', '#083820', '#56440f', '#3e264b', '#1a2e5c'],
  speed: 1,
  intensity: 1,
  height: 0.5,
  grain: 0.3,
  position: 'top',
} as const
