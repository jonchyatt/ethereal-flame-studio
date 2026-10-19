/** Choices on the brief form. Client-safe: no server imports here. */

export const LENGTHS = [10, 20, 30, 45, 60] as const;
export const VOICES = { feminine: 'a feminine voice', masculine: 'a masculine voice', 'no-preference': 'either voice' } as const;
export const MUSIC = {
  none: 'no music',
  ambient: 'soft ambient music',
  binaural: 'binaural tones',
  nature: 'nature sounds',
  'no-preference': 'whatever suits it',
} as const;
export const VR_SCENES = {
  forest: 'a forest',
  ocean: 'an ocean shore',
  mountain: 'a mountain',
  'night-sky': 'a night sky',
  'abstract-loop': 'the abstract infinity loop',
  other: 'something else (described below)',
} as const;
