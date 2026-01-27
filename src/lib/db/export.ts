/**
 * Database export utilities for Google Sheets integration.
 * Converts render records to spreadsheet format.
 *
 * Phase 4, Plan 04-08
 */

import { getRecentRenders, getRendersByBatch, getRendersByStatus, Render } from './index';
import { RenderRow, appendToGoogleSheets, exportToGoogleSheets, isGoogleSheetsConfigured } from '../services/googleSheets';

/**
 * Format duration in seconds as MM:SS.
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format ISO date string as YYYY-MM-DD.
 */
function formatDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/**
 * Convert a render record to a spreadsheet row.
 */
function renderToRow(render: Render): RenderRow {
  return {
    date: formatDate(render.created_at),
    audioName: render.audio_name,
    template: render.template,
    format: render.output_format,
    status: render.status,
    fileName: render.output_path?.split('/').pop() || '',
    gdriveUrl: render.gdrive_url || '',
    description: render.whisper_description?.slice(0, 500) || '',
    duration: formatDuration(render.duration_seconds),
    batchId: render.batch_id || '',
  };
}

/**
 * Export options.
 */
export interface ExportOptions {
  spreadsheetId?: string;
  sheetName?: string;
  clearExisting?: boolean;
}

/**
 * Export recent renders to Google Sheets.
 */
export async function exportRecentToSheets(
  limit: number = 100,
  options: ExportOptions = {}
): Promise<{ exported: number; error?: string }> {
  if (!isGoogleSheetsConfigured()) {
    return { exported: 0, error: 'Google Sheets not configured' };
  }

  const spreadsheetId = options.spreadsheetId || process.env.GOOGLE_SHEETS_ID!;

  try {
    const renders = getRecentRenders(limit);
    const rows = renders.map(renderToRow);

    const exported = options.clearExisting
      ? await exportToGoogleSheets(spreadsheetId, rows, options.sheetName, true)
      : await appendToGoogleSheets(spreadsheetId, rows, options.sheetName);

    return { exported };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exported: 0, error: message };
  }
}

/**
 * Export a specific batch to Google Sheets.
 */
export async function exportBatchToSheets(
  batchId: string,
  options: ExportOptions = {}
): Promise<{ exported: number; error?: string }> {
  if (!isGoogleSheetsConfigured()) {
    return { exported: 0, error: 'Google Sheets not configured' };
  }

  const spreadsheetId = options.spreadsheetId || process.env.GOOGLE_SHEETS_ID!;

  try {
    const renders = getRendersByBatch(batchId);
    const rows = renders.map(renderToRow);

    const exported = await appendToGoogleSheets(spreadsheetId, rows, options.sheetName);
    return { exported };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exported: 0, error: message };
  }
}

/**
 * Export all completed renders to Google Sheets.
 */
export async function exportCompletedToSheets(
  options: ExportOptions = {}
): Promise<{ exported: number; error?: string }> {
  if (!isGoogleSheetsConfigured()) {
    return { exported: 0, error: 'Google Sheets not configured' };
  }

  const spreadsheetId = options.spreadsheetId || process.env.GOOGLE_SHEETS_ID!;

  try {
    const renders = getRendersByStatus('completed');
    const rows = renders.map(renderToRow);

    const exported = options.clearExisting
      ? await exportToGoogleSheets(spreadsheetId, rows, options.sheetName, true)
      : await appendToGoogleSheets(spreadsheetId, rows, options.sheetName);

    return { exported };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exported: 0, error: message };
  }
}
