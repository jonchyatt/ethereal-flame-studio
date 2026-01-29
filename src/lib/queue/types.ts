/**
 * Type definitions for batch render queue jobs.
 *
 * Phase 3/4 Integration - Updated to match RENDER_JOB_SCHEMA.md
 */

import type {
  JobId,
  BatchId,
  JobStatus as SchemaJobStatus,
  OutputFormat,
  RenderSettings,
} from '../render/schema/types';

// Re-export schema types for convenience
export type { JobId, BatchId, OutputFormat, RenderSettings };

// Re-export JobStatus under its original name for compatibility
export type JobStatus = SchemaJobStatus;

/**
 * Represents an audio file to be processed.
 */
export interface AudioFile {
  /** File identifier */
  id: string;
  /** Path to the audio file */
  path: string;
  /** Original file name */
  originalName: string;
  /** File hash for caching */
  hash?: string;
  /** Duration in seconds */
  duration?: number;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  sizeBytes?: number;
}

/**
 * Data for a batch job containing multiple audio files.
 */
export interface BatchJobData {
  /** Unique batch identifier */
  batchId: BatchId;
  /** Audio files to process */
  audioFiles: AudioFile[];
  /** Template ID to use */
  templateId: string | null;
  /** Output formats to generate */
  outputFormats: OutputFormat[];
  /** Common render settings */
  renderSettings?: Partial<RenderSettings>;
  /** Created timestamp */
  createdAt: string;
  /** Priority (1 = highest, 10 = lowest) */
  priority?: number;
  /** Post-processing options */
  options?: {
    transcribe?: boolean;
    upload?: boolean;
    driveFolderId?: string;
    notifications?: {
      enabled: boolean;
      channels: ('ntfy' | 'email' | 'webhook')[];
    };
  };
}

/**
 * Data for an individual render job in BullMQ.
 */
export interface RenderQueueJobData {
  /** Database job ID */
  jobId: JobId;

  /** Job type for routing */
  type: 'single' | 'batch-item';

  /** Batch reference (if part of batch) */
  batchId?: BatchId;

  /** Audio file information */
  audio: {
    name: string;
    path: string;
    hash: string;
    duration: number;
  };

  /** Output configuration */
  output: {
    format: OutputFormat;
    fps: 30 | 60;
    outputDir: string;
    fileName: string;
  };

  /** Visual settings */
  renderSettings: RenderSettings;

  /** Pre-analyzed audio path (if available) */
  analysisPath: string | null;

  /** Request transcription after render */
  transcribe: boolean;

  /** Upload to Google Drive after render */
  upload: boolean;

  /** Google Drive folder ID for upload */
  driveFolderId?: string;

  /** Notification settings */
  notify: {
    enabled: boolean;
    channels: ('ntfy' | 'email' | 'webhook')[];
  };
}

/**
 * Transcription queue job data
 */
export interface TranscriptionQueueJobData {
  /** Parent render job ID */
  jobId: JobId;

  /** Audio file info */
  audio: {
    path: string;
    name: string;
    hash: string;
    duration: number;
  };

  /** Whisper model to use */
  model: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

  /** Language hint (optional) */
  languageHint?: string;
}

/**
 * Upload queue job data
 */
export interface UploadQueueJobData {
  /** Parent render job ID */
  jobId: JobId;

  /** File to upload */
  file: {
    localPath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };

  /** Google Drive destination */
  destination: {
    folderId: string;
    folderPath: string;
  };

  /** Delete local file after upload */
  deleteAfterUpload: boolean;
}

/**
 * Notification queue job data
 */
export interface NotificationQueueJobData {
  /** Event type */
  event: 'job_completed' | 'job_failed' | 'batch_completed' | 'batch_failed';

  /** Job or batch ID */
  entityId: JobId | BatchId;

  /** Notification channels to use */
  channels: ('ntfy' | 'email' | 'webhook')[];

  /** Notification payload */
  payload: {
    title: string;
    message: string;
    priority: 'low' | 'default' | 'high';
    url?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
  };

  /** Email-specific options */
  email?: {
    to: string;
    subject: string;
    templateId?: string;
  };

  /** Webhook-specific options */
  webhook?: {
    url: string;
    secret?: string;
  };
}

/**
 * Job progress update
 */
export interface JobProgressUpdate {
  jobId: JobId;
  status: JobStatus;
  progress: number;
  stage: string;
  timestamp: string;
}

/**
 * Queue event types
 */
export type QueueEventType =
  | 'job:submitted'
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled'
  | 'batch:started'
  | 'batch:progress'
  | 'batch:completed'
  | 'batch:failed';

/**
 * Queue event data
 */
export interface QueueEvent {
  type: QueueEventType;
  timestamp: string;
  data: {
    jobId?: JobId;
    batchId?: BatchId;
    status?: JobStatus;
    progress?: number;
    stage?: string;
    error?: string;
    output?: unknown;
  };
}

/**
 * Queue statistics
 */
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Legacy RenderJobData type for backward compatibility with Phase 4 BullMQ worker.
 * Maps to the simplified job structure used by bullmqQueue.ts and renderWorker.ts.
 */
export interface RenderJobData {
  /** Batch ID reference */
  batchId: string;
  /** Audio file info */
  audioFile: AudioFile;
  /** Template name */
  template: string;
  /** Output format string */
  outputFormat: string;
  /** Database render ID (set by worker) */
  renderDbId: string;
}
