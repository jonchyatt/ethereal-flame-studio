/**
 * Google Sheets integration for render metadata export.
 * Uses service account authentication for unattended operation.
 *
 * Phase 4, Plan 04-08
 */

import { google, sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Get authenticated Google Sheets client.
 */
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Sheets credentials not configured');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: SCOPES,
  });
}

/**
 * Get Google Sheets client.
 */
function getSheets(): sheets_v4.Sheets {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Row data for Google Sheets export.
 */
export interface RenderRow {
  date: string;
  audioName: string;
  template: string;
  format: string;
  status: string;
  fileName: string;
  gdriveUrl: string;
  description: string;
  duration: string;
  batchId: string;
}

const HEADER_ROW = [
  'Date',
  'Audio Name',
  'Template',
  'Format',
  'Status',
  'File Name',
  'Google Drive URL',
  'Description',
  'Duration',
  'Batch ID',
];

/**
 * Ensure sheet has headers.
 */
export async function ensureSheetHeaders(
  spreadsheetId: string,
  sheetName: string = 'Renders'
): Promise<void> {
  const sheets = getSheets();

  // Check if sheet exists and has headers
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:J1`,
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADER_ROW],
        },
      });
      console.log('[Sheets] Headers added');
    }
  } catch (error) {
    // Sheet might not exist, try to add headers anyway
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:J1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADER_ROW],
      },
    });
    console.log('[Sheets] Headers added');
  }
}

/**
 * Append rows to Google Sheets.
 */
export async function appendToGoogleSheets(
  spreadsheetId: string,
  rows: RenderRow[],
  sheetName: string = 'Renders'
): Promise<number> {
  if (rows.length === 0) return 0;

  const sheets = getSheets();

  // Ensure headers exist
  await ensureSheetHeaders(spreadsheetId, sheetName);

  // Convert rows to array format
  const values = rows.map(row => [
    row.date,
    row.audioName,
    row.template,
    row.format,
    row.status,
    row.fileName,
    row.gdriveUrl,
    row.description,
    row.duration,
    row.batchId,
  ]);

  // Append rows
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:J`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });

  const rowsAdded = response.data.updates?.updatedRows || 0;
  console.log(`[Sheets] Appended ${rowsAdded} rows`);
  return rowsAdded;
}

/**
 * Export rows to Google Sheets, optionally clearing existing data.
 */
export async function exportToGoogleSheets(
  spreadsheetId: string,
  rows: RenderRow[],
  sheetName: string = 'Renders',
  clearExisting: boolean = false
): Promise<number> {
  const sheets = getSheets();

  if (clearExisting) {
    // Clear all data except headers
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:J`,
      });
      console.log('[Sheets] Cleared existing data');
    } catch {
      // Sheet might not exist yet
    }
  }

  return appendToGoogleSheets(spreadsheetId, rows, sheetName);
}

/**
 * Check if Google Sheets is configured.
 */
export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEETS_ID
  );
}
