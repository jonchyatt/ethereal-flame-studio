/**
 * Post-processing for completed renders.
 * Handles file naming, database updates, and optional Google Drive sync.
 *
 * Phase 4, Plan 04-03
 */

import { rename, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { generateFileName } from '../utils/fileNaming';
import { updateRender, getRenderById } from '../db';

export interface PostProcessResult {
  finalPath: string;
  fileName: string;
  fileSizeBytes: number;
  gdriveUrl?: string;
  gdriveSyncError?: string;
}

/**
 * Post-process a completed render.
 * - Generates standardized file name
 * - Renames temp file to final name
 * - Updates database with completion status
 * - Optionally syncs to Google Drive
 *
 * @param renderDbId - ID of the render in the database
 * @param tempOutputPath - Path to the temporary output file
 * @returns Post-processing result with final path and file size
 */
export async function postProcessRender(
  renderDbId: string,
  tempOutputPath: string
): Promise<PostProcessResult> {
  // Get render details from database
  const render = getRenderById(renderDbId);
  if (!render) {
    throw new Error(`Render not found: ${renderDbId}`);
  }

  // Generate proper file name
  const fileName = generateFileName(
    render.audio_name,
    render.output_format,
    new Date(render.created_at)
  );

  // Determine output directory (configurable via env var)
  const outputDir = process.env.RENDER_OUTPUT_DIR || dirname(tempOutputPath);
  const finalPath = join(outputDir, fileName);

  // Rename temp file to final name
  await rename(tempOutputPath, finalPath);

  // Get file size
  const stats = await stat(finalPath);

  // Update database with final path
  updateRender(renderDbId, {
    output_path: finalPath,
    status: 'completed',
    render_completed_at: new Date().toISOString(),
  });

  let gdriveUrl: string | undefined;
  let gdriveSyncError: string | undefined;

  // Optional: Sync to Google Drive (will be implemented in 04-06)
  // Check if rclone is available and configured
  if (process.env.GDRIVE_REMOTE) {
    try {
      // Import dynamically to avoid errors if not installed
      const { syncToGoogleDrive, getGoogleDriveUrl, checkRcloneInstalled } = await import('../services/googleDrive');

      const rcloneReady = await checkRcloneInstalled();

      if (rcloneReady) {
        const syncResult = await syncToGoogleDrive(
          finalPath,
          render.batch_id || undefined
        );

        if (syncResult.success) {
          gdriveUrl = getGoogleDriveUrl(syncResult.remotePath);
          updateRender(renderDbId, { gdrive_url: gdriveUrl });
        } else {
          gdriveSyncError = syncResult.error;
          console.warn(`[PostProcess] Google Drive sync failed: ${syncResult.error}`);
        }
      }
    } catch (error) {
      // Google Drive module not available yet - skip
      console.log('[PostProcess] Google Drive sync skipped (module not available)');
    }
  }

  return {
    finalPath,
    fileName,
    fileSizeBytes: stats.size,
    gdriveUrl,
    gdriveSyncError,
  };
}

/**
 * Mark a render as failed in the database.
 */
export async function markRenderFailed(
  renderDbId: string,
  errorMessage: string
): Promise<void> {
  updateRender(renderDbId, {
    status: 'failed',
    error_message: errorMessage,
    render_completed_at: new Date().toISOString(),
  });
}

/**
 * Mark a render as processing in the database.
 */
export async function markRenderProcessing(renderDbId: string): Promise<void> {
  updateRender(renderDbId, {
    status: 'processing',
    render_started_at: new Date().toISOString(),
  });
}
