import { z } from 'zod';
import { CreatorPublishPlatformSchema } from './types';
import { OutputFormatSchema } from '@/lib/render/schema/types';

export const CreatorPackSyncJobMetadataSchema = z.object({
  creatorPackId: z.string().uuid(),
  requestedBy: z.string().max(64).optional(),
});

export const CreatorRecutJobMetadataSchema = z.object({
  creatorPackId: z.string().uuid(),
  contentLibraryItemId: z.string().uuid().nullable().optional(),
  recutId: z.string().uuid(),
  sourceVariantId: z.string().min(1).max(120),
  sourceRenderJobId: z.string().min(1).max(128),
  sourceOutputFormat: OutputFormatSchema,
  sourceVideoKey: z.string().min(1).max(1024),
  sourceWidth: z.number().int().positive(),
  sourceHeight: z.number().int().positive(),
  platform: z.string().min(1).max(64),
  aspectRatio: z.string().min(1).max(32),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  targetWidth: z.number().int().positive(),
  targetHeight: z.number().int().positive(),
  fps: z.union([z.literal(30), z.literal(60)]),
  score: z.number().min(0).max(1).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
});

export const CreatorPublishJobMetadataSchema = z.object({
  creatorPackId: z.string().uuid(),
  publishId: z.string().uuid(),
  platform: CreatorPublishPlatformSchema,
  provider: z.enum(['youtube', 'tiktok', 'instagram']),
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
});

export type CreatorPackSyncJobMetadata = z.infer<typeof CreatorPackSyncJobMetadataSchema>;
export type CreatorRecutJobMetadata = z.infer<typeof CreatorRecutJobMetadataSchema>;
export type CreatorPublishJobMetadata = z.infer<typeof CreatorPublishJobMetadataSchema>;

