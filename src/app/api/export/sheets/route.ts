/**
 * API endpoint for Google Sheets export.
 * Provides on-demand export of render metadata.
 *
 * Phase 4, Plan 04-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportRecentToSheets, exportBatchToSheets, exportCompletedToSheets } from '@/lib/db/export';
import { isGoogleSheetsConfigured } from '@/lib/services/googleSheets';

/**
 * GET: Check configuration and show usage.
 */
export async function GET() {
  // Check configuration
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json(
      { error: 'Google Sheets not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    configured: true,
    endpoints: {
      'POST /api/export/sheets': 'Export renders to Google Sheets',
    },
    params: {
      type: 'recent | batch | completed',
      limit: 'number (for recent, default 100)',
      batchId: 'string (required for batch type)',
      clear: 'boolean (clear existing data first)',
    },
  });
}

/**
 * POST: Trigger export with options.
 */
export async function POST(request: NextRequest) {
  // Check configuration
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json(
      { error: 'Google Sheets not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { type = 'recent', limit = 100, batchId, clear = false } = body;

    let result;

    switch (type) {
      case 'recent':
        result = await exportRecentToSheets(limit, { clearExisting: clear });
        break;

      case 'batch':
        if (!batchId) {
          return NextResponse.json(
            { error: 'batchId required for batch export' },
            { status: 400 }
          );
        }
        result = await exportBatchToSheets(batchId);
        break;

      case 'completed':
        result = await exportCompletedToSheets({ clearExisting: clear });
        break;

      default:
        return NextResponse.json(
          { error: `Invalid type: ${type}. Use: recent, batch, or completed` },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exported: result.exported,
      type,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
