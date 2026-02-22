/**
 * Render Job Schema Types
 *
 * Core type definitions for the render pipeline.
 * Based on RENDER_JOB_SCHEMA.md specification.
 *
 * Phase 3/4 Integration
 */

import { z } from 'zod';

// =============================================================================
// BRANDED TYPES
// =============================================================================

/**
 * Unique identifier types for type safety
 */
export type JobId = string & { readonly __brand: 'JobId' };
export type BatchId = string & { readonly __brand: 'BatchId' };
export type MachineId = string & { readonly __brand: 'MachineId' };

/**
 * Generate typed IDs
 */
export function createJobId(): JobId {
  return `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as JobId;
}

export function createBatchId(): BatchId {
  return `batch_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as BatchId;
}

export function createMachineId(): MachineId {
  return `machine_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as MachineId;
}

// =============================================================================
// JOB STATUS
// =============================================================================

/**
 * All possible states for a render job.
 * Transitions are strictly controlled - see State Machine section.
 */
export type JobStatus =
  | 'pending'       // Job created, waiting in queue
  | 'queued'        // Added to BullMQ, waiting for worker
  | 'analyzing'     // Pre-analyzing audio (extracting amplitude data)
  | 'transcribing'  // Running Whisper transcription
  | 'rendering'     // Capturing frames
  | 'encoding'      // FFmpeg encoding frames to video
  | 'injecting'     // Adding VR metadata (360 only)
  | 'uploading'     // Uploading to Google Drive
  | 'completed'     // Successfully finished
  | 'failed'        // Error occurred, may retry
  | 'cancelled'     // User cancelled
  | 'stalled';      // Worker died mid-job, needs recovery

/**
 * Status metadata for UI display
 */
export const JOB_STATUS_META: Record<JobStatus, {
  label: string;
  color: string;
  isTerminal: boolean;
  isActive: boolean;
}> = {
  pending:      { label: 'Pending',      color: 'gray',   isTerminal: false, isActive: false },
  queued:       { label: 'Queued',       color: 'blue',   isTerminal: false, isActive: false },
  analyzing:    { label: 'Analyzing',    color: 'cyan',   isTerminal: false, isActive: true },
  transcribing: { label: 'Transcribing', color: 'purple', isTerminal: false, isActive: true },
  rendering:    { label: 'Rendering',    color: 'orange', isTerminal: false, isActive: true },
  encoding:     { label: 'Encoding',     color: 'yellow', isTerminal: false, isActive: true },
  injecting:    { label: 'VR Metadata',  color: 'indigo', isTerminal: false, isActive: true },
  uploading:    { label: 'Uploading',    color: 'green',  isTerminal: false, isActive: true },
  completed:    { label: 'Completed',    color: 'green',  isTerminal: true,  isActive: false },
  failed:       { label: 'Failed',       color: 'red',    isTerminal: true,  isActive: false },
  cancelled:    { label: 'Cancelled',    color: 'gray',   isTerminal: true,  isActive: false },
  stalled:      { label: 'Stalled',      color: 'red',    isTerminal: false, isActive: false },
};

export const JOB_STATUSES = Object.keys(JOB_STATUS_META) as JobStatus[];

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

/**
 * Output format specification
 */
export type OutputFormat =
  | 'flat-1080p-landscape'   // 1920x1080
  | 'flat-1080p-portrait'    // 1080x1920
  | 'flat-4k-landscape'      // 3840x2160
  | 'flat-4k-portrait'       // 2160x3840
  | '360-mono-4k'            // 4096x2048 equirectangular
  | '360-mono-6k'            // 6144x3072 equirectangular
  | '360-mono-8k'            // 8192x4096 equirectangular
  | '360-stereo-8k';         // 8192x8192 top/bottom stereo

/**
 * Output format metadata
 */
export const OUTPUT_FORMAT_META: Record<OutputFormat, {
  width: number;
  height: number;
  is360: boolean;
  isStereo: boolean;
  aspectRatio: string;
  estimatedFileSizeMB: (durationSec: number, fps: number) => number;
}> = {
  'flat-1080p-landscape': {
    width: 1920, height: 1080, is360: false, isStereo: false,
    aspectRatio: '16:9',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.015,
  },
  'flat-1080p-portrait': {
    width: 1080, height: 1920, is360: false, isStereo: false,
    aspectRatio: '9:16',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.015,
  },
  'flat-4k-landscape': {
    width: 3840, height: 2160, is360: false, isStereo: false,
    aspectRatio: '16:9',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.06,
  },
  'flat-4k-portrait': {
    width: 2160, height: 3840, is360: false, isStereo: false,
    aspectRatio: '9:16',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.06,
  },
  '360-mono-4k': {
    width: 4096, height: 2048, is360: true, isStereo: false,
    aspectRatio: '2:1',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.08,
  },
  '360-mono-6k': {
    width: 6144, height: 3072, is360: true, isStereo: false,
    aspectRatio: '2:1',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.15,
  },
  '360-mono-8k': {
    width: 8192, height: 4096, is360: true, isStereo: false,
    aspectRatio: '2:1',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.25,
  },
  '360-stereo-8k': {
    width: 8192, height: 8192, is360: true, isStereo: true,
    aspectRatio: '1:1',
    estimatedFileSizeMB: (dur, fps) => dur * fps * 0.5,
  },
};

export const OUTPUT_FORMATS = Object.keys(OUTPUT_FORMAT_META) as OutputFormat[];

// =============================================================================
// RENDER SETTINGS
// =============================================================================

/**
 * Serialized particle layer (JSON-safe)
 */
export interface ParticleLayerSerialized {
  id: string;
  enabled: boolean;
  particleCount: number;
  baseSize: number;
  colorStart: string;
  colorEnd: string;
  velocityMultiplier: number;
  turbulence: number;
  audioReactivity: {
    sizeSensitivity: number;
    velocitySensitivity: number;
    colorShiftSensitivity: number;
  };
}

/**
 * Visual rendering configuration - subset of template settings
 * that affect the rendered output.
 */
export interface RenderSettings {
  /** Template ID to use (null = use provided settings) */
  templateId: string | null;

  /** Visual mode: 'flame' | 'mist' */
  visualMode: 'flame' | 'mist';

  /** Overall effect intensity (0-2) */
  intensity: number;

  /** Skybox preset name */
  skyboxPreset: string;

  /** Skybox rotation speed (0-1) */
  skyboxRotationSpeed: number;

  /** Enable water reflection plane */
  waterEnabled: boolean;

  /** Water color (hex string) */
  waterColor: string;

  /** Water reflectivity (0-1) */
  waterReflectivity: number;

  /** Particle layer configurations (serialized) */
  particleLayers: ParticleLayerSerialized[];
}

// =============================================================================
// RENDER OUTPUT
// =============================================================================

/**
 * Completed output information
 */
export interface RenderOutput {
  /** Output format that was rendered */
  format: OutputFormat;

  /** Local file path to rendered video */
  localPath: string;

  /** File size in bytes */
  fileSizeBytes: number;

  /** Video duration in seconds */
  durationSeconds: number;

  /** Actual resolution (may differ slightly from target) */
  resolution: {
    width: number;
    height: number;
  };

  /** Encoding settings used */
  encoding: {
    codec: 'h264' | 'h265' | 'vp9';
    bitrate: number;  // kbps
    crf: number;
    preset: string;
  };

  /** Google Drive URL (if uploaded) */
  gdriveUrl: string | null;

  /** Google Drive file ID (if uploaded) */
  gdriveFileId: string | null;

  /** VR metadata injection status (360 only) */
  vrMetadata?: {
    injected: boolean;
    spherical: boolean;
    stereoMode: 'mono' | 'top-bottom' | null;
    projectionType: 'equirectangular';
  };

  /** Timestamps */
  renderStartedAt: string;
  renderCompletedAt: string;
  uploadedAt: string | null;
}

// =============================================================================
// RENDER JOB
// =============================================================================

/**
 * Complete render job - the main entity.
 * This is the source of truth for a render operation.
 */
export interface RenderJob {
  /** Unique job identifier */
  id: JobId;

  /** Batch ID if part of a batch (null for single jobs) */
  batchId: BatchId | null;

  /** Current job status */
  status: JobStatus;

  /** Progress percentage (0-100) */
  progress: number;

  /** Current stage description for UI */
  currentStage: string;

  // === Audio Input ===

  /** Original audio file name */
  audioName: string;

  /** Path to audio file on render machine */
  audioPath: string;

  /** Audio file hash (SHA-256) for cache validation */
  audioHash: string;

  /** Audio duration in seconds */
  audioDuration: number;

  // === Render Configuration ===

  /** Output format to render */
  outputFormat: OutputFormat;

  /** Frames per second */
  fps: 30 | 60;

  /** Visual settings for rendering */
  renderSettings: RenderSettings;

  /** Target render machine ID */
  targetMachineId: MachineId | null;

  // === Outputs ===

  /** Rendered output details (populated on completion) */
  output: RenderOutput | null;

  /** Pre-analyzed audio data (stored separately, referenced here) */
  audioAnalysisPath: string | null;

  // === Metadata ===

  /** Job priority (1 = highest, 10 = lowest) */
  priority: number;

  /** Retry attempt count */
  attemptCount: number;

  /** Maximum retry attempts */
  maxAttempts: number;

  /** Error message if failed */
  errorMessage: string | null;

  /** Error stack trace (for debugging) */
  errorStack: string | null;

  /** Worker ID that processed this job */
  workerId: string | null;

  // === Timestamps ===

  /** Job creation time */
  createdAt: string;

  /** Time job was queued to BullMQ */
  queuedAt: string | null;

  /** Time job started processing */
  startedAt: string | null;

  /** Time job completed or failed */
  completedAt: string | null;

  /** Last status update time */
  updatedAt: string;

  // === External References ===

  /** Custom user metadata */
  userMetadata: Record<string, unknown>;
}

/**
 * Minimal job data for list views
 */
export interface RenderJobSummary {
  id: JobId;
  batchId: BatchId | null;
  status: JobStatus;
  progress: number;
  currentStage: string;
  audioName: string;
  outputFormat: OutputFormat;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

// =============================================================================
// STATE MACHINE
// =============================================================================

/**
 * Valid state transitions
 */
export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending:      ['queued', 'cancelled'],
  queued:       ['analyzing', 'cancelled', 'stalled'],
  analyzing:    ['transcribing', 'rendering', 'failed', 'cancelled', 'stalled'],
  transcribing: ['rendering', 'failed', 'cancelled', 'stalled'],
  rendering:    ['encoding', 'failed', 'cancelled', 'stalled'],
  encoding:     ['injecting', 'uploading', 'completed', 'failed', 'cancelled', 'stalled'],
  injecting:    ['uploading', 'completed', 'failed', 'cancelled', 'stalled'],
  uploading:    ['completed', 'failed', 'cancelled', 'stalled'],
  completed:    [],  // Terminal state
  failed:       ['pending'],  // Can retry -> back to pending
  cancelled:    [],  // Terminal state
  stalled:      ['pending', 'failed'],  // Recover or mark failed
};

/**
 * Check if a transition is valid
 */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get next expected states
 */
export function getNextStates(current: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Check if state is terminal
 */
export function isTerminalState(status: JobStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

/**
 * Check if state is active (job is being processed)
 */
export function isActiveState(status: JobStatus): boolean {
  return ['analyzing', 'transcribing', 'rendering', 'encoding', 'injecting', 'uploading'].includes(status);
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Output format Zod schema
 */
export const OutputFormatSchema = z.enum([
  'flat-1080p-landscape', 'flat-1080p-portrait',
  'flat-4k-landscape', 'flat-4k-portrait',
  '360-mono-4k', '360-mono-6k', '360-mono-8k',
  '360-stereo-8k',
]);

/**
 * FPS Zod schema
 */
export const FpsSchema = z.union([z.literal(30), z.literal(60)]);

/**
 * Job status Zod schema
 */
export const JobStatusSchema = z.enum([
  'pending', 'queued', 'analyzing', 'transcribing', 'rendering',
  'encoding', 'injecting', 'uploading', 'completed', 'failed',
  'cancelled', 'stalled',
]);

/**
 * Particle layer Zod schema
 */
export const ParticleLayerSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  particleCount: z.number().int().min(0).max(100000),
  baseSize: z.number().min(0).max(10),
  colorStart: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  colorEnd: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  velocityMultiplier: z.number().min(0).max(5),
  turbulence: z.number().min(0).max(2),
  audioReactivity: z.object({
    sizeSensitivity: z.number().min(0).max(2),
    velocitySensitivity: z.number().min(0).max(2),
    colorShiftSensitivity: z.number().min(0).max(2),
  }),
});

/**
 * Render settings Zod schema
 */
export const RenderSettingsSchema = z.object({
  templateId: z.string().nullable().optional(),
  visualMode: z.enum(['flame', 'mist']).optional(),
  intensity: z.number().min(0).max(2).optional(),
  skyboxPreset: z.string().optional(),
  skyboxRotationSpeed: z.number().min(0).max(1).optional(),
  waterEnabled: z.boolean().optional(),
  waterColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  waterReflectivity: z.number().min(0).max(1).optional(),
  particleLayers: z.array(ParticleLayerSchema).optional(),
});

/**
 * Audio input Zod schema (multiple formats supported)
 */
export const AudioInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('base64'),
    data: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().regex(/^audio\//),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
    filename: z.string().optional(),
  }),
  z.object({
    type: z.literal('path'),
    path: z.string().min(1),
  }),
  z.object({
    type: z.literal('asset'),
    assetId: z.string().uuid(),
  }),
]);

/**
 * Notification settings Zod schema
 */
export const NotificationSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z.array(z.enum(['ntfy', 'email', 'webhook'])).default(['ntfy']),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
});

/**
 * Submit render request Zod schema
 */
export const SubmitRenderRequestSchema = z.object({
  // Audio input (required)
  audio: AudioInputSchema,

  // Output configuration
  outputFormat: OutputFormatSchema,
  fps: z.union([z.literal(30), z.literal(60), z.literal('30'), z.literal('60')])
    .transform((v) => typeof v === 'string' ? parseInt(v, 10) as 30 | 60 : v),

  // Template and settings
  templateId: z.string().optional(),
  renderSettings: RenderSettingsSchema.optional(),

  // Target machine (optional, auto-select if not provided)
  targetMachine: z.string().optional(),

  // Post-processing options
  transcribe: z.boolean().default(false),
  upload: z.boolean().default(true),
  driveFolderId: z.string().optional(),

  // Notifications
  notifications: NotificationSettingsSchema.optional(),

  // Job metadata
  priority: z.number().int().min(1).max(10).default(5),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SubmitRenderRequest = z.infer<typeof SubmitRenderRequestSchema>;

/**
 * List jobs query params Zod schema
 */
export const ListJobsQuerySchema = z.object({
  status: JobStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;
