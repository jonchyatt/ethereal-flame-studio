import type { OutputFormat } from '@/lib/render/schema/types';
import type { CreatorStyleVariant } from './types';

export type OrbAudioPresetId = 'meditation' | 'speech' | 'phonk' | 'cinematic';

export type ChannelMetadataPreset = {
  id: string;
  label: string;
  platform: 'youtube' | 'youtube-shorts' | 'tiktok' | 'instagram-reels' | 'instagram-feed';
  titleTemplates: string[];
  descriptionTemplate: string;
  hashtagSets: string[][];
  ctaTemplates: string[];
  keywordPacks: string[];
};

export type ExportPackPreset = {
  id: string;
  label: string;
  description: string;
  variants: Array<{
    outputFormat: OutputFormat;
    fps: 30 | 60;
    platformTargets: string[];
    durationCapSec: number | null;
    safeZonePresetId: 'safe-16x9' | 'safe-9x16' | 'safe-1x1';
  }>;
};

export type CreatorBundlePreset = {
  id: 'brand-a' | 'meditation-series' | 'phonk-series';
  label: string;
  description: string;
  defaultExportPackIds: string[];
  styleVariants: CreatorStyleVariant[];
  channelPresetIds: string[];
};

export const SAFE_ZONE_PRESETS = {
  'safe-16x9': {
    id: 'safe-16x9',
    label: 'YouTube 16:9',
    aspectRatio: '16:9',
    safeZones: [
      { x: 0.06, y: 0.08, width: 0.88, height: 0.18, label: 'Top Title Safe' },
      { x: 0.08, y: 0.76, width: 0.84, height: 0.14, label: 'Bottom CTA Safe' },
      { x: 0.12, y: 0.2, width: 0.76, height: 0.56, label: 'Primary Subject Zone' },
    ],
  },
  'safe-9x16': {
    id: 'safe-9x16',
    label: 'Shorts / Reels / TikTok 9:16',
    aspectRatio: '9:16',
    safeZones: [
      { x: 0.08, y: 0.1, width: 0.84, height: 0.14, label: 'Hook Text Safe' },
      { x: 0.1, y: 0.22, width: 0.8, height: 0.56, label: 'Face / Orb Focus Zone' },
      { x: 0.08, y: 0.74, width: 0.84, height: 0.1, label: 'Caption Safe (above UI)' },
    ],
  },
  'safe-1x1': {
    id: 'safe-1x1',
    label: 'Square 1:1 Feed Crop',
    aspectRatio: '1:1',
    safeZones: [
      { x: 0.08, y: 0.08, width: 0.84, height: 0.14, label: 'Title Safe' },
      { x: 0.1, y: 0.2, width: 0.8, height: 0.6, label: 'Subject Zone' },
      { x: 0.08, y: 0.82, width: 0.84, height: 0.1, label: 'CTA Safe' },
    ],
  },
} as const;

export const EXPORT_PACK_PRESETS: ExportPackPreset[] = [
  {
    id: 'standard-all-core',
    label: 'Standard All (4 Core)',
    description: 'Queues the four standard formats shown in the render dialog: 1080p/4K landscape + portrait.',
    variants: [
      {
        outputFormat: 'flat-1080p-landscape',
        fps: 30,
        platformTargets: ['youtube'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: 'flat-1080p-portrait',
        fps: 30,
        platformTargets: ['youtube-shorts', 'tiktok', 'instagram-reels'],
        durationCapSec: 60,
        safeZonePresetId: 'safe-9x16',
      },
      {
        outputFormat: 'flat-4k-landscape',
        fps: 30,
        platformTargets: ['youtube'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: 'flat-4k-portrait',
        fps: 30,
        platformTargets: ['tiktok', 'instagram-reels'],
        durationCapSec: 90,
        safeZonePresetId: 'safe-9x16',
      },
    ],
  },
  {
    id: 'yt-longform-plus-shorts',
    label: 'YouTube Longform + Shorts',
    description: '16:9 longform plus 9:16 short variant for highlights/shorts.',
    variants: [
      {
        outputFormat: 'flat-1080p-landscape',
        fps: 30,
        platformTargets: ['youtube'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: 'flat-1080p-portrait',
        fps: 30,
        platformTargets: ['youtube-shorts'],
        durationCapSec: 60,
        safeZonePresetId: 'safe-9x16',
      },
    ],
  },
  {
    id: 'shorts-reels-tiktok',
    label: 'Shorts / Reels / TikTok',
    description: 'Single 9:16 render used across short-form platforms.',
    variants: [
      {
        outputFormat: 'flat-1080p-portrait',
        fps: 30,
        platformTargets: ['youtube-shorts', 'tiktok', 'instagram-reels'],
        durationCapSec: 60,
        safeZonePresetId: 'safe-9x16',
      },
    ],
  },
  {
    id: 'high-end-crosspost',
    label: 'Cross-Platform HQ',
    description: '4K longform + 4K vertical plus standard vertical quick-post.',
    variants: [
      {
        outputFormat: 'flat-4k-landscape',
        fps: 30,
        platformTargets: ['youtube'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: 'flat-4k-portrait',
        fps: 30,
        platformTargets: ['instagram-reels', 'tiktok'],
        durationCapSec: 90,
        safeZonePresetId: 'safe-9x16',
      },
      {
        outputFormat: 'flat-1080p-portrait',
        fps: 60,
        platformTargets: ['youtube-shorts'],
        durationCapSec: 60,
        safeZonePresetId: 'safe-9x16',
      },
    ],
  },
  {
    id: 'square-feed-plus-reels',
    label: 'IG Feed + Reels (1:1 + 9:16)',
    description: 'Includes square feed render and vertical reel render with safe-zone presets.',
    variants: [
      {
        outputFormat: 'flat-1080p-square',
        fps: 30,
        platformTargets: ['instagram-feed'],
        durationCapSec: 60,
        safeZonePresetId: 'safe-1x1',
      },
      {
        outputFormat: 'flat-1080p-portrait',
        fps: 30,
        platformTargets: ['instagram-reels'],
        durationCapSec: 90,
        safeZonePresetId: 'safe-9x16',
      },
    ],
  },
  {
    id: 'vr-mono-all',
    label: '360 VR Mono (4K/6K/8K)',
    description: 'Queues all three mono 360 VR outputs for YouTube VR quality testing and uploads.',
    variants: [
      {
        outputFormat: '360-mono-4k',
        fps: 30,
        platformTargets: ['youtube-vr'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: '360-mono-6k',
        fps: 30,
        platformTargets: ['youtube-vr'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
      {
        outputFormat: '360-mono-8k',
        fps: 30,
        platformTargets: ['youtube-vr'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
    ],
  },
  {
    id: 'vr-stereo-3d',
    label: '360 VR 3D Stereo (8K)',
    description: 'Queues the stereo top/bottom 8K render for YouTube VR 3D uploads.',
    variants: [
      {
        outputFormat: '360-stereo-8k',
        fps: 30,
        platformTargets: ['youtube-vr-3d'],
        durationCapSec: null,
        safeZonePresetId: 'safe-16x9',
      },
    ],
  },
];

export const CHANNEL_METADATA_PRESETS: ChannelMetadataPreset[] = [
  {
    id: 'youtube-meditation',
    label: 'YouTube Meditation',
    platform: 'youtube',
    titleTemplates: [
      '{topic}: {mood} ambient journey for focus + calm',
      '{mood} {topic} visuals | immersive audio meditation',
      '{topic} session | {mood} energy reset (visualizer)',
    ],
    descriptionTemplate:
      'Immerse in {mood} {topic} visuals designed for focus, reflection, and calm. {cta_primary}\\n\\nKeywords: {keywords}\\n\\n#shorts #meditation #ambient',
    hashtagSets: [['#meditation', '#ambient', '#healing', '#focusmusic'], ['#visualizer', '#relaxingmusic', '#mindfulness']],
    ctaTemplates: ['Comment your mood and I will build the next variant pack.', 'Subscribe for weekly visual meditations.'],
    keywordPacks: ['meditation music', 'ambient visuals', 'breathing exercise music'],
  },
  {
    id: 'shorts-growth',
    label: 'Shorts Growth',
    platform: 'youtube-shorts',
    titleTemplates: [
      '{mood} orb visualizer in {seconds}s',
      '{topic} energy shift | {mood} shorts visual',
      'POV: your focus locks in ({mood} visual)',
    ],
    descriptionTemplate:
      '{cta_primary}\\n\\n{topic} | {mood}\\n{keywords}',
    hashtagSets: [['#shorts', '#visualizer', '#musicvisualizer'], ['#focus', '#motivation', '#aesthetic']],
    ctaTemplates: ['Watch the full version on the channel.', 'Save this for your next reset.'],
    keywordPacks: ['shorts visualizer', 'orb visual', 'music edit'],
  },
  {
    id: 'tiktok-phonk',
    label: 'TikTok Phonk',
    platform: 'tiktok',
    titleTemplates: [
      '{mood} phonk orb drop',
      '{topic} x phonk visualizer',
      'dark phonk energy visual ({mood})',
    ],
    descriptionTemplate:
      '{cta_primary}\\n{keywords}',
    hashtagSets: [['#phonk', '#tiktokmusic', '#visualizer', '#editaudio'], ['#driftphonk', '#aesthetic', '#orb']],
    ctaTemplates: ['Which version drops harder: flame or mist?', 'Comment the next phonk track vibe.'],
    keywordPacks: ['phonk visualizer', 'drift phonk edit', 'music visuals'],
  },
  {
    id: 'instagram-reels-brand',
    label: 'Instagram Reels Brand',
    platform: 'instagram-reels',
    titleTemplates: [
      '{mood} visual reset',
      '{topic} atmosphere - {mood}',
      '{mood} energy sequence',
    ],
    descriptionTemplate:
      '{cta_primary}\\n\\n{keywords}',
    hashtagSets: [['#reels', '#visualart', '#musicvisualizer'], ['#ambientart', '#digitalart', '#healing']],
    ctaTemplates: ['Save this reel for later.', 'Share with someone who needs this vibe.'],
    keywordPacks: ['reels visual art', 'digital aura visual', 'music visual'],
  },
];

export const DEFAULT_STYLE_VARIANTS: CreatorStyleVariant[] = [
  { id: 'current', label: 'Current Style', description: 'Uses the current editor state and orb settings.' },
  { id: 'ethereal-flame', label: 'Ethereal Flame', visualMode: 'flame', description: 'Warm energetic flame look.' },
  { id: 'ethereal-mist', label: 'Ethereal Mist', visualMode: 'mist', description: 'Soft ethereal mist look.' },
];

export const CREATOR_BUNDLE_PRESETS: CreatorBundlePreset[] = [
  {
    id: 'brand-a',
    label: 'Brand A',
    description: 'Balanced cross-platform bundle with brand-safe metadata and mixed styles.',
    defaultExportPackIds: ['yt-longform-plus-shorts', 'square-feed-plus-reels'],
    styleVariants: DEFAULT_STYLE_VARIANTS,
    channelPresetIds: ['youtube-meditation', 'shorts-growth', 'instagram-reels-brand'],
  },
  {
    id: 'meditation-series',
    label: 'Meditation Series',
    description: 'Calmer pacing, speech/meditation metadata presets, short + long versions.',
    defaultExportPackIds: ['yt-longform-plus-shorts'],
    styleVariants: [
      { id: 'current-meditation', label: 'Current + Meditation Audio Response', orbAudioPreset: 'meditation' },
      { id: 'mist-meditation', label: 'Mist + Meditation', visualMode: 'mist', orbAudioPreset: 'meditation' },
      { id: 'flame-cinematic', label: 'Flame + Cinematic', visualMode: 'flame', orbAudioPreset: 'cinematic' },
    ],
    channelPresetIds: ['youtube-meditation', 'shorts-growth'],
  },
  {
    id: 'phonk-series',
    label: 'Phonk Series',
    description: 'High energy phonk-friendly presets with punchier orb response and short-form focus.',
    defaultExportPackIds: ['shorts-reels-tiktok', 'high-end-crosspost'],
    styleVariants: [
      { id: 'current-phonk', label: 'Current + Phonk Audio Response', orbAudioPreset: 'phonk' },
      { id: 'flame-phonk', label: 'Flame + Phonk', visualMode: 'flame', orbAudioPreset: 'phonk' },
      { id: 'mist-phonk', label: 'Mist + Phonk', visualMode: 'mist', orbAudioPreset: 'phonk' },
    ],
    channelPresetIds: ['tiktok-phonk', 'shorts-growth', 'instagram-reels-brand'],
  },
];

export function getBundlePreset(bundleId: string | null | undefined): CreatorBundlePreset | undefined {
  if (!bundleId) return undefined;
  return CREATOR_BUNDLE_PRESETS.find((bundle) => bundle.id === bundleId);
}

export function getExportPackPreset(exportPackId: string): ExportPackPreset | undefined {
  return EXPORT_PACK_PRESETS.find((pack) => pack.id === exportPackId);
}

export function getChannelMetadataPreset(presetId: string): ChannelMetadataPreset | undefined {
  return CHANNEL_METADATA_PRESETS.find((preset) => preset.id === presetId);
}
