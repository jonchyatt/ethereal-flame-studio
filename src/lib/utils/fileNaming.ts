/**
 * File naming convention utilities.
 * Convention: [YYYYMMDD]_[AudioName]_[Format]_v[N].mp4
 *
 * Examples:
 *   20260127_morning_meditation_1080p_v1.mp4
 *   20260127_deep_space_ambient_4k_v2.mp4
 */

/**
 * Sanitize a name for use in file names.
 * - Removes file extension if present
 * - Replaces non-alphanumeric with underscores
 * - Collapses multiple underscores
 * - Lowercases
 * - Trims underscores from ends
 */
export function sanitizeName(name: string): string {
  return name
    // Remove file extension
    .replace(/\.[^/.]+$/, '')
    // Replace non-alphanumeric with underscores
    .replace(/[^a-zA-Z0-9]+/g, '_')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Lowercase
    .toLowerCase()
    // Trim underscores from ends
    .replace(/^_|_$/g, '');
}

/**
 * Format a date as YYYYMMDD.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a file name following the convention.
 *
 * @param audioName - Original audio file name (will be sanitized)
 * @param format - Output format (1080p, 4k, 360mono, 360stereo)
 * @param date - Date to use (defaults to now)
 * @param version - Version number (defaults to 1)
 * @returns Formatted file name with .mp4 extension
 */
export function generateFileName(
  audioName: string,
  format: string,
  date: Date = new Date(),
  version: number = 1
): string {
  const dateStr = formatDate(date);
  const sanitized = sanitizeName(audioName);
  return `${dateStr}_${sanitized}_${format}_v${version}.mp4`;
}

/**
 * Parsed components of a file name.
 */
export interface ParsedFileName {
  date: string;      // YYYYMMDD
  audioName: string; // sanitized name
  format: string;    // 1080p, 4k, 360mono, 360stereo
  version: number;   // 1, 2, 3...
}

/**
 * Parse a file name back into its components.
 *
 * @param fileName - File name to parse
 * @returns Parsed components or null if doesn't match convention
 */
export function parseFileName(fileName: string): ParsedFileName | null {
  // Remove .mp4 extension if present
  const baseName = fileName.replace(/\.mp4$/i, '');

  // Pattern: YYYYMMDD_name_format_vN
  const match = baseName.match(/^(\d{8})_(.+)_(1080p|1080p_vertical|4k|360mono|360stereo)_v(\d+)$/);

  if (!match) {
    return null;
  }

  const [, date, audioName, format, versionStr] = match;

  return {
    date,
    audioName,
    format,
    version: parseInt(versionStr, 10),
  };
}

/**
 * Find the next version number for a file with the same base name.
 *
 * @param existingFiles - List of existing file names
 * @param audioName - Audio name to match
 * @param format - Format to match
 * @param date - Date to match (defaults to today)
 * @returns Next version number (starting from 1)
 */
export function getNextVersion(
  existingFiles: string[],
  audioName: string,
  format: string,
  date: Date = new Date()
): number {
  const dateStr = formatDate(date);
  const sanitized = sanitizeName(audioName);

  // Find highest version for matching files
  let maxVersion = 0;

  for (const file of existingFiles) {
    const parsed = parseFileName(file);
    if (
      parsed &&
      parsed.date === dateStr &&
      parsed.audioName === sanitized &&
      parsed.format === format
    ) {
      maxVersion = Math.max(maxVersion, parsed.version);
    }
  }

  return maxVersion + 1;
}
