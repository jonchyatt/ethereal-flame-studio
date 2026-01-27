/**
 * Google Drive integration via rclone.
 * Provides file sync for completed renders.
 *
 * Phase 4, Plan 04-06
 */

import { spawn } from 'child_process';
import { basename } from 'path';

const GDRIVE_REMOTE = process.env.GDRIVE_REMOTE || 'gdrive';
const GDRIVE_OUTPUT_FOLDER = process.env.GDRIVE_OUTPUT_FOLDER || 'EtherealFlame/Renders';

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  success: boolean;
  remotePath: string;
  bytesTransferred?: number;
  error?: string;
}

/**
 * Check if rclone is installed and accessible.
 */
export async function checkRcloneInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('rclone', ['version']);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Check if the configured Google Drive remote exists.
 */
export async function checkRemoteConfigured(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('rclone', ['listremotes']);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(false);
        return;
      }
      // Check if our remote is in the list
      const remotes = output.split('\n').map(r => r.trim().replace(':', ''));
      resolve(remotes.includes(GDRIVE_REMOTE));
    });

    proc.on('error', () => resolve(false));
  });
}

/**
 * Sync a local file to Google Drive.
 *
 * @param localPath - Path to the local file
 * @param subFolder - Optional subfolder (e.g., batch ID)
 * @returns Sync result with remote path
 */
export async function syncToGoogleDrive(
  localPath: string,
  subFolder?: string
): Promise<SyncResult> {
  const fileName = basename(localPath);
  const remotePath = subFolder
    ? `${GDRIVE_REMOTE}:${GDRIVE_OUTPUT_FOLDER}/${subFolder}/${fileName}`
    : `${GDRIVE_REMOTE}:${GDRIVE_OUTPUT_FOLDER}/${fileName}`;

  return new Promise((resolve) => {
    const args = [
      'copyto',           // Copy single file to specific destination
      localPath,
      remotePath,
      '--progress',
      '--stats', '5s',
      '--retries', '3',
      '--low-level-retries', '10',
      '-v',               // Verbose for logging
    ];

    console.log(`[GDrive] Syncing: ${fileName} -> ${remotePath}`);

    const proc = spawn('rclone', args);
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      // Parse progress output for bytes
      const match = output.match(/Transferred:\s+([\d.]+\s*\w+)/);
      if (match) {
        console.log(`[GDrive] ${match[0]}`);
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[GDrive] Complete: ${fileName}`);
        resolve({
          success: true,
          remotePath,
        });
      } else {
        console.error(`[GDrive] Failed: ${fileName} - ${stderr}`);
        resolve({
          success: false,
          remotePath,
          error: stderr || `rclone exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      console.error(`[GDrive] Error: ${err.message}`);
      resolve({
        success: false,
        remotePath,
        error: err.message,
      });
    });
  });
}

/**
 * Generate a Google Drive search URL for a file.
 * Note: For proper direct URLs, would need Google Drive API.
 */
export function getGoogleDriveUrl(remotePath: string): string {
  const pathParts = remotePath.replace(`${GDRIVE_REMOTE}:`, '').split('/');
  const encoded = encodeURIComponent(pathParts.join('/'));
  return `https://drive.google.com/drive/search?q=${encoded}`;
}

/**
 * Sync an entire batch folder to Google Drive.
 */
export async function syncBatchFolder(
  localFolder: string,
  batchId: string
): Promise<SyncResult> {
  const remotePath = `${GDRIVE_REMOTE}:${GDRIVE_OUTPUT_FOLDER}/${batchId}`;

  return new Promise((resolve) => {
    const args = [
      'sync',             // Sync entire folder
      localFolder,
      remotePath,
      '--progress',
      '--stats', '5s',
      '--retries', '3',
      '-v',
    ];

    console.log(`[GDrive] Syncing batch folder: ${batchId}`);

    const proc = spawn('rclone', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[GDrive] Batch sync complete: ${batchId}`);
        resolve({
          success: true,
          remotePath,
        });
      } else {
        resolve({
          success: false,
          remotePath,
          error: stderr || `rclone exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        remotePath,
        error: err.message,
      });
    });
  });
}

/**
 * Check if Google Drive sync is configured.
 */
export function isGoogleDriveConfigured(): boolean {
  return Boolean(process.env.GDRIVE_REMOTE);
}
