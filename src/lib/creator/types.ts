import { z } from 'zod';
import { OutputFormatSchema } from '@/lib/render/schema/types';

export const CreatorTargetSchema = z.enum(['cloud', 'home', 'local-agent']);
export const CreatorPublishPlatformSchema = z.enum([
  'youtube',
  'youtube-shorts',
  'youtube-vr',
  'youtube-vr-3d',
  'tiktok',
  'instagram-reels',
  'instagram-feed',
]);

export const CreatorStyleVariantSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  visualMode: z.enum(['flame', 'mist']).optional(),
  orbAudioPreset: z.enum(['meditation', 'speech', 'phonk', 'cinematic']).optional(),
  description: z.string().max(240).optional(),
});

export const CreatorRenderVariantSchema = z.object({
  variantId: z.string().min(1).max(120),
  outputFormat: OutputFormatSchema,
  fps: z.union([z.literal(30), z.literal(60)]),
  styleVariant: CreatorStyleVariantSchema,
  platformTargets: z.array(z.string().min(1).max(64)).default([]),
  durationCapSec: z.number().int().positive().max(60 * 60).nullable().optional(),
  safeZonePresetId: z.string().min(1).max(64).nullable().optional(),
  renderJobId: z.string().min(1).max(128),
  renderTarget: CreatorTargetSchema.default('cloud'),
  targetAgentId: z.string().min(1).max(128).nullable().optional(),
});

export const CreatorPublishDraftSchema = z.object({
  channelPresetId: z.string().min(1).max(64),
  platform: z.string().min(1).max(64),
  titleVariants: z.array(z.string().min(1).max(200)).min(1).max(20),
  description: z.string().max(5000),
  hashtags: z.array(z.string().min(1).max(64)).max(50),
  ctas: z.array(z.string().min(1).max(300)).max(20).default([]),
  keywordPacks: z.array(z.string().min(1).max(64)).max(30).default([]),
});

export const ThumbnailCandidateSchema = z.object({
  timestampSec: z.number().min(0).max(60 * 60 * 24),
  score: z.number().min(0).max(1),
  reason: z.string().max(200),
});

export const ThumbnailSafeZoneRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  label: z.string().min(1).max(64),
});

export const ThumbnailPlanSchema = z.object({
  platform: z.string().min(1).max(64),
  aspectRatio: z.string().min(1).max(32),
  safeZonePresetId: z.string().min(1).max(64),
  safeZones: z.array(ThumbnailSafeZoneRectSchema).min(1),
  candidates: z.array(ThumbnailCandidateSchema).min(1),
  selectedTimestampSec: z.number().min(0).nullable().optional(),
  videoSignedUrl: z.string().url().nullable().optional(),
});

export const RecutSegmentSuggestionSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  score: z.number().min(0).max(1),
  reason: z.string().max(200),
  reviewStatus: z.enum(['pending', 'accepted', 'rejected']).optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  reviewNotes: z.string().max(500).nullable().optional(),
});

export const RecutPlanSchema = z.object({
  sourceVariantId: z.string().min(1).max(120).nullable().optional(),
  platform: z.string().min(1).max(64),
  aspectRatio: z.string().min(1).max(32),
  durationCapSec: z.number().int().positive().max(60 * 60),
  segments: z.array(RecutSegmentSuggestionSchema).max(50),
});

export const CreatorRecutExecutionSchema = z.object({
  recutId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sourceVariantId: z.string().min(1).max(120),
  sourceRenderJobId: z.string().min(1).max(128),
  platform: z.string().min(1).max(64),
  aspectRatio: z.string().min(1).max(32),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  score: z.number().min(0).max(1).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
  targetWidth: z.number().int().positive(),
  targetHeight: z.number().int().positive(),
  fps: z.union([z.literal(30), z.literal(60)]),
  jobId: z.string().min(1).max(128),
  status: z.enum(['queued', 'processing', 'complete', 'failed', 'cancelled']).default('queued'),
  outputVideoKey: z.string().min(1).max(1024).nullable().optional(),
  outputSignedUrl: z.string().url().nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  error: z.string().max(2000).nullable().optional(),
});

export const CreatorPublishTaskSchema = z.object({
  publishId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  platform: CreatorPublishPlatformSchema,
  mode: z.enum(['draft', 'schedule']).default('draft'),
  scheduledFor: z.string().datetime().nullable().optional(),
  sourceKind: z.enum(['render', 'recut']).default('render'),
  sourceVariantId: z.string().min(1).max(120),
  sourceRenderJobId: z.string().min(1).max(128),
  sourceRecutJobId: z.string().min(1).max(128).nullable().optional(),
  sourceVideoKey: z.string().min(1).max(1024),
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  hashtags: z.array(z.string().min(1).max(64)).max(50).default([]),
  cta: z.string().max(300).nullable().optional(),
  keywords: z.array(z.string().min(1).max(64)).max(30).default([]),
  channelPresetId: z.string().min(1).max(64).nullable().optional(),
  publishJobId: z.string().min(1).max(128),
  status: z.enum(['queued', 'processing', 'scheduled', 'complete', 'failed', 'cancelled']).default('queued'),
  connector: z.object({
    provider: z.enum(['youtube', 'tiktok', 'instagram']),
    mode: z.enum(['api', 'manual-draft']).default('manual-draft'),
  }),
  externalId: z.string().max(256).nullable().optional(),
  providerStatus: z.string().max(256).nullable().optional(),
  providerUrl: z.string().url().nullable().optional(),
  draftManifestKey: z.string().max(1024).nullable().optional(),
  error: z.string().max(2000).nullable().optional(),
});

export const ContentLibraryItemSchema = z.object({
  itemId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  packId: z.string().uuid(),
  sourceAudioName: z.string().min(1).max(255),
  sourceAssetId: z.string().uuid().nullable().optional(),
  tags: z.object({
    moods: z.array(z.string().min(1).max(64)).default([]),
    topics: z.array(z.string().min(1).max(64)).default([]),
    keywords: z.array(z.string().min(1).max(64)).default([]),
    bpm: z.number().int().min(1).max(300).nullable().optional(),
  }),
  variants: z.array(CreatorRenderVariantSchema),
  recutPlans: z.array(RecutPlanSchema).default([]),
  recutExecutions: z.array(CreatorRecutExecutionSchema).default([]),
  thumbnailPlans: z.array(ThumbnailPlanSchema).default([]),
  notes: z.string().max(2000).nullable().optional(),
});

export const CreatorRenderPackSchema = z.object({
  packId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['queued', 'partial', 'complete', 'failed']).default('queued'),
  source: z.object({
    audioName: z.string().min(1).max(255),
    assetId: z.string().uuid().nullable().optional(),
    audioPath: z.string().nullable().optional(),
    sourceUrl: z.string().url().nullable().optional(),
  }),
  bundleId: z.string().min(1).max(64).nullable().optional(),
  bundleLabel: z.string().min(1).max(120).nullable().optional(),
  exportPackIds: z.array(z.string().min(1).max(64)).default([]),
  variants: z.array(CreatorRenderVariantSchema).min(1),
  recutExecutions: z.array(CreatorRecutExecutionSchema).default([]),
  publishTasks: z.array(CreatorPublishTaskSchema).default([]),
  publishDrafts: z.array(CreatorPublishDraftSchema).default([]),
  contentLibraryItemId: z.string().uuid().nullable().optional(),
  target: CreatorTargetSchema.default('cloud'),
  targetAgentId: z.string().min(1).max(128).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreatorStyleVariant = z.infer<typeof CreatorStyleVariantSchema>;
export type CreatorRenderVariant = z.infer<typeof CreatorRenderVariantSchema>;
export type CreatorPublishDraft = z.infer<typeof CreatorPublishDraftSchema>;
export type ThumbnailPlan = z.infer<typeof ThumbnailPlanSchema>;
export type RecutPlan = z.infer<typeof RecutPlanSchema>;
export type CreatorRecutExecution = z.infer<typeof CreatorRecutExecutionSchema>;
export type CreatorPublishTask = z.infer<typeof CreatorPublishTaskSchema>;
export type ContentLibraryItem = z.infer<typeof ContentLibraryItemSchema>;
export type CreatorRenderPack = z.infer<typeof CreatorRenderPackSchema>;
