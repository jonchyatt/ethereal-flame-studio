import { z } from 'zod';

// --- Asset Metadata ---

export const AudioMetadataSchema = z.object({
  duration: z.number(),
  sampleRate: z.number(),
  channels: z.number(),
  codec: z.string(),
  bitrate: z.number(),
  format: z.string(),
});

export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;

export const AssetProvenanceSchema = z.object({
  sourceType: z.enum(['youtube', 'video_file', 'audio_file', 'url']),
  sourceUrl: z.string().optional(),
  sourceVideoId: z.string().optional(),
  rightsAttestedAt: z.string().optional(),
  ingestToolVersions: z.record(z.string()).optional(),
});

export type AssetProvenance = z.infer<typeof AssetProvenanceSchema>;

export const AssetMetadataSchema = z.object({
  assetId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  audio: AudioMetadataSchema,
  provenance: AssetProvenanceSchema,
  sourceHash: z.string().optional(),
  originalFilename: z.string().optional(),
});

export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;

// --- Edit Recipe ---

export const ClipSchema = z.object({
  id: z.string(),
  sourceAssetId: z.string().uuid(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  volume: z.number().min(0).max(2).default(1),
  fadeIn: z.number().min(0).default(0),
  fadeOut: z.number().min(0).default(0),
});

export type Clip = z.infer<typeof ClipSchema>;

export const EditRecipeSchema = z.object({
  version: z.literal(1),
  assetId: z.string().uuid(),
  clips: z.array(ClipSchema).min(1).max(50),
  normalize: z.boolean().default(false),
  outputFormat: z.enum(['wav', 'aac']).default('wav'),
  outputSampleRate: z.number().default(44100),
});

export type EditRecipe = z.infer<typeof EditRecipeSchema>;

// --- Ingest Job ---

// IngestSource variants match how data actually arrives:
// - youtube/url: parsed from JSON body
// - video_file/audio_file: multipart form-data (File object from request.formData())
export type IngestSource =
  | { type: 'youtube'; url: string; rightsAttested: boolean }
  | { type: 'video_file'; file: File; filename: string }
  | { type: 'audio_file'; file: File; filename: string }
  | { type: 'url'; url: string };

export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';

export interface IngestJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  source: IngestSource;
  assetId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  type: 'preview' | 'save';
  recipe: EditRecipe;
  outputPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Config ---

export interface AudioPrepConfig {
  assetsDir: string;
  maxFileSizeMB: number;
  maxDurationMinutes: number;
  maxClipsPerRecipe: number;
  diskQuotaGB: number;
  ttlDays: number;
  youtubeAllowedDomains: string[];
  cookieFilePath?: string;
}

export const DEFAULT_CONFIG: AudioPrepConfig = {
  assetsDir: './audio-assets',
  maxFileSizeMB: 100,
  maxDurationMinutes: 30,
  maxClipsPerRecipe: 50,
  diskQuotaGB: 5,
  ttlDays: 30,
  youtubeAllowedDomains: ['youtube.com', 'youtu.be', 'www.youtube.com'],
  cookieFilePath: undefined,
};
