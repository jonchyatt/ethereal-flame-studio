/**
 * Type definitions for batch render queue jobs.
 */

/**
 * Represents an audio file to be processed.
 */
export interface AudioFile {
  id: string;
  path: string;
  originalName: string;
}

/**
 * Data for a batch job containing multiple audio files.
 */
export interface BatchJobData {
  batchId: string;
  audioFiles: AudioFile[];
  template: string;
  outputFormats: string[]; // ['1080p', '4k', '360stereo']
  createdAt: string;
}

/**
 * Data for an individual render job.
 */
export interface RenderJobData {
  batchId: string;
  audioFile: AudioFile;
  template: string;
  outputFormat: string;
  renderDbId: string; // ID in SQLite renders table
}

/**
 * Possible job status values.
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
