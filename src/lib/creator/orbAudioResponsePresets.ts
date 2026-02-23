export type OrbAudioResponsePresetId = 'meditation' | 'speech' | 'phonk' | 'cinematic';

export type OrbAudioResponsePresetValues = {
  beatSensitivity: number;
  attackSpeed: number;
  decaySpeed: number;
  minBrightness: number;
  audioInputGain: number;
  audioNoiseGate: number;
  audioResponseCurve: number;
  audioDynamicRange: number;
  audioTransientBoost: number;
  audioBeatPulseAmount: number;
  audioVisibilityBoost: number;
  audioSizeCapAmount: number;
  audioPositionCapAmount: number;
  audioBassWeight: number;
  audioMidsWeight: number;
  audioTrebleWeight: number;
};

export const ORB_AUDIO_RESPONSE_PRESET_VALUES: Record<OrbAudioResponsePresetId, OrbAudioResponsePresetValues> = {
  meditation: {
    beatSensitivity: 0.8,
    attackSpeed: 0.25,
    decaySpeed: 0.03,
    minBrightness: 0.2,
    audioInputGain: 1.0,
    audioNoiseGate: 0.05,
    audioResponseCurve: 0.6,
    audioDynamicRange: 0.85,
    audioTransientBoost: 0.05,
    audioBeatPulseAmount: 0.08,
    audioVisibilityBoost: 1.15,
    audioSizeCapAmount: 0.28,
    audioPositionCapAmount: 0.14,
    audioBassWeight: 0.9,
    audioMidsWeight: 1.25,
    audioTrebleWeight: 0.7,
  },
  speech: {
    beatSensitivity: 0.65,
    attackSpeed: 0.35,
    decaySpeed: 0.05,
    minBrightness: 0.16,
    audioInputGain: 1.25,
    audioNoiseGate: 0.04,
    audioResponseCurve: 0.75,
    audioDynamicRange: 1.0,
    audioTransientBoost: 0.15,
    audioBeatPulseAmount: 0.06,
    audioVisibilityBoost: 1.35,
    audioSizeCapAmount: 0.35,
    audioPositionCapAmount: 0.18,
    audioBassWeight: 0.85,
    audioMidsWeight: 1.45,
    audioTrebleWeight: 0.95,
  },
  phonk: {
    beatSensitivity: 1.9,
    attackSpeed: 0.65,
    decaySpeed: 0.09,
    minBrightness: 0.08,
    audioInputGain: 1.8,
    audioNoiseGate: 0.01,
    audioResponseCurve: 0.95,
    audioDynamicRange: 1.65,
    audioTransientBoost: 1.1,
    audioBeatPulseAmount: 0.28,
    audioVisibilityBoost: 1.9,
    audioSizeCapAmount: 0.75,
    audioPositionCapAmount: 0.42,
    audioBassWeight: 1.75,
    audioMidsWeight: 1.0,
    audioTrebleWeight: 1.05,
  },
  cinematic: {
    beatSensitivity: 1.2,
    attackSpeed: 0.45,
    decaySpeed: 0.04,
    minBrightness: 0.14,
    audioInputGain: 1.35,
    audioNoiseGate: 0.02,
    audioResponseCurve: 0.8,
    audioDynamicRange: 1.25,
    audioTransientBoost: 0.35,
    audioBeatPulseAmount: 0.16,
    audioVisibilityBoost: 1.55,
    audioSizeCapAmount: 0.5,
    audioPositionCapAmount: 0.25,
    audioBassWeight: 1.25,
    audioMidsWeight: 1.0,
    audioTrebleWeight: 0.85,
  },
};

