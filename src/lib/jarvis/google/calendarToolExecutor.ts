/**
 * Calendar Tool Executor
 *
 * Executes the query_calendar chat tool, allowing Jarvis to answer
 * questions about Jonathan's schedule via Google Calendar.
 */

import {
  queryGoogleCalendarEvents,
  isGoogleCalendarConfigured,
  getTimezoneOffsetString,
} from './GoogleCalendarClient';
import { getTodayInTimezone, getDateInTimezone } from '../notion/schemas';

// =============================================================================
// Tool Executor
// =============================================================================

/**
 * Execute a calendar tool call from Claude
 */
export async function executeCalendarTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  if (name !== 'query_calendar') {
    return `Unknown calendar tool: ${name}`;
  }

  if (!isGoogleCalendarConfigured()) {
    return 'Google Calendar is not connected. Ask Jonathan to set up the service account.';
  }

  const timeframe = (input.timeframe as string) || 'today';
  const timezone = input.timezone as string | undefined;
  const today = getTodayInTimezone(timezone);
  const offset = getTimezoneOffsetString(timezone);

  let timeMin: string;
  let timeMax: string;
  let label: string;

  switch (timeframe) {
    case 'today': {
      timeMin = `${today}T00:00:00${offset}`;
      timeMax = `${today}T23:59:59${offset}`;
      label = 'today';
      break;
    }
    case 'tomorrow': {
      const tomorrow = getDateInTimezone(1, timezone);
      timeMin = `${tomorrow}T00:00:00${offset}`;
      timeMax = `${tomorrow}T23:59:59${offset}`;
      label = 'tomorrow';
      break;
    }
    case 'this_week': {
      const weekEnd = getDateInTimezone(7, timezone);
      timeMin = `${today}T00:00:00${offset}`;
      timeMax = `${weekEnd}T23:59:59${offset}`;
      label = 'this week';
      break;
    }
    case 'next_week': {
      const nextWeekStart = getDateInTimezone(7, timezone);
      const nextWeekEnd = getDateInTimezone(14, timezone);
      timeMin = `${nextWeekStart}T00:00:00${offset}`;
      timeMax = `${nextWeekEnd}T23:59:59${offset}`;
      label = 'next week';
      break;
    }
    default: {
      timeMin = `${today}T00:00:00${offset}`;
      timeMax = `${today}T23:59:59${offset}`;
      label = 'today';
    }
  }

  try {
    const events = await queryGoogleCalendarEvents({ timeMin, timeMax, timezone });

    if (events.length === 0) {
      return `No calendar events for ${label}.`;
    }

    const lines = events.map((e) => {
      if (e.allDay) {
        return `- All day: ${e.title}`;
      }

      const startFormatted = formatTime(e.startTime);
      const endFormatted = formatTime(e.endTime);
      let line = `- ${startFormatted} – ${endFormatted}: ${e.title}`;
      if (e.location) {
        line += ` (at ${e.location})`;
      }
      return line;
    });

    return `Calendar events for ${label}:\n${lines.join('\n')}`;
  } catch (error) {
    console.error('[CalendarToolExecutor] Error querying calendar:', error);
    return `Failed to fetch calendar events: ${error instanceof Error ? error.message : 'unknown error'}`;
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format an ISO datetime string to a readable time like "9:00 AM"
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}
