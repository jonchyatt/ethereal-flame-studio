/**
 * Shared render constants and API utilities
 * Used by both RenderDialog and CreateOverlay
 */

export type OutputCategory = 'flat' | '360-mono' | '360-stereo';

export interface OutputFormatOption {
  value: string;
  label: string;
  resolution: string;
  category: OutputCategory;
  description?: string;
  estimateMinutes: number; // rough estimate for manifest display
}

export const OUTPUT_FORMATS: OutputFormatOption[] = [
  // Flat formats
  { value: 'flat-1080p-landscape', label: '1080p Landscape', resolution: '1920x1080', category: 'flat', estimateMinutes: 3 },
  { value: 'flat-1080p-portrait', label: '1080p Portrait', resolution: '1080x1920', category: 'flat', description: 'Shorts, TikTok, Reels', estimateMinutes: 3 },
  { value: 'flat-1080p-square', label: '1080p Square', resolution: '1080x1080', category: 'flat', description: 'Instagram Feed', estimateMinutes: 3 },
  { value: 'flat-4k-landscape', label: '4K Landscape', resolution: '3840x2160', category: 'flat', estimateMinutes: 12 },
  { value: 'flat-4k-portrait', label: '4K Portrait', resolution: '2160x3840', category: 'flat', estimateMinutes: 12 },

  // 360 Mono formats
  { value: '360-mono-4k', label: '360 Mono 4K', resolution: '4096x2048', category: '360-mono', description: 'YouTube VR', estimateMinutes: 20 },
  { value: '360-mono-6k', label: '360 Mono 6K', resolution: '6144x3072', category: '360-mono', estimateMinutes: 35 },
  { value: '360-mono-8k', label: '360 Mono 8K', resolution: '8192x4096', category: '360-mono', description: 'Best quality VR', estimateMinutes: 50 },

  // 360 Stereo formats
  { value: '360-stereo-8k', label: '360 Stereo 8K', resolution: '8192x8192', category: '360-stereo', description: 'YouTube VR 3D', estimateMinutes: 90 },
];

export const CATEGORY_LABELS: Record<OutputCategory, string> = {
  'flat': 'Standard',
  '360-mono': '360 VR',
  '360-stereo': '360 VR 3D',
};
