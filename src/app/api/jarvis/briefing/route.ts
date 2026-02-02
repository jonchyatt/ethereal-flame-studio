/**
 * Briefing API Route
 *
 * Server-side endpoint for fetching briefing data from Notion.
 * Required because NotionClient uses child_process which only works server-side.
 *
 * Supports types:
 * - morning: Full morning briefing (default)
 * - midday: Midday check-in with progress
 * - evening: Evening check-in with progress
 * - evening_wrap: Comprehensive evening wrap with day review (Plan 06-01)
 */

import { NextResponse } from 'next/server';
import {
  buildMorningBriefing as buildBriefingFromNotion,
  buildCheckInData as buildCheckInFromNotion,
  buildEveningWrapData as buildEveningWrapFromNotion,
} from '@/lib/jarvis/executive/BriefingBuilder';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'morning';

  try {
    if (type === 'evening_wrap') {
      const data = await buildEveningWrapFromNotion();
      return NextResponse.json(data);
    } else if (type === 'midday' || type === 'evening') {
      const data = await buildCheckInFromNotion(type as 'midday' | 'evening');
      return NextResponse.json(data);
    } else {
      const data = await buildBriefingFromNotion();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('[Briefing API] Error fetching briefing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch briefing data' },
      { status: 500 }
    );
  }
}
