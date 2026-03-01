/**
 * Google Calendar Client
 *
 * Service account JWT auth (native crypto, zero deps), event fetching,
 * retry/circuit breaker (mirrors NotionClient patterns).
 *
 * READ-ONLY: Only fetches events. No creating/updating/deleting.
 *
 * Environment variables:
 * - GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: Full JSON key file contents
 * - GOOGLE_CALENDAR_ID: Calendar ID(s) — single email or comma-separated for multiple calendars
 *   e.g., "jonathan@gmail.com" or "jonathan@gmail.com,family123@group.calendar.google.com"
 */

import crypto from 'crypto';
import { withRetry } from '../resilience/withRetry';
import { getBreaker } from '../resilience/CircuitBreaker';

// =============================================================================
// Types
// =============================================================================

export interface GoogleCalendarEvent {
  id: string;
  title: string;        // from summary
  startTime: string;    // ISO datetime or date (all-day)
  endTime: string;      // ISO datetime or date
  allDay: boolean;      // true if start.date (not dateTime)
  location: string | null;
  description: string | null;  // truncated to 200 chars
}

interface ServiceAccountConfig {
  client_email: string;
  private_key: string;
}

// =============================================================================
// Configuration Validation
// =============================================================================

let configError: string | null = null;
let parsedConfig: ServiceAccountConfig | null = null;
let configWarningLogged = false;

function getServiceAccountConfig(): ServiceAccountConfig | null {
  if (configError) return null;
  if (parsedConfig) return parsedConfig;

  const json = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!json || !calendarId) {
    if (!configWarningLogged) {
      console.warn('[GoogleCalendar] Not configured — skipping (set GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON + GOOGLE_CALENDAR_ID)');
      configWarningLogged = true;
    }
    return null;
  }

  try {
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) {
      configError = 'Service account JSON missing client_email or private_key';
      console.error(`[GoogleCalendar] ${configError}`);
      return null;
    }
    parsedConfig = { client_email: parsed.client_email, private_key: parsed.private_key };
    return parsedConfig;
  } catch (e) {
    configError = `Invalid JSON in GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: ${e instanceof Error ? e.message : 'parse error'}`;
    console.error(`[GoogleCalendar] ${configError}`);
    return null;
  }
}

/**
 * Check if Google Calendar is configured and ready to use
 */
export function isGoogleCalendarConfigured(): boolean {
  return getServiceAccountConfig() !== null;
}

// =============================================================================
// JWT Token Management
// =============================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64urlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (60s buffer before actual expiry)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getServiceAccountConfig();
  if (!config) throw new Error('Google Calendar not configured');

  // Create JWT assertion
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: config.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const segments = [
    base64urlEncode(JSON.stringify(header)),
    base64urlEncode(JSON.stringify(claims)),
  ];
  const signingInput = segments.join('.');

  // Sign with RSA-SHA256 using Node.js crypto
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(config.private_key, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return cachedToken.token;
}

// =============================================================================
// RFC 3339 Timezone Offset Utility
// =============================================================================

/**
 * Convert IANA timezone to RFC 3339 offset string (e.g., "-05:00", "+09:00")
 * Falls back to "Z" (UTC) if timezone is invalid or not provided
 */
export function getTimezoneOffsetString(timezone?: string): string {
  if (!timezone) return 'Z';
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const diffMinutes = Math.round((local.getTime() - utc.getTime()) / 60000);
    const sign = diffMinutes >= 0 ? '+' : '-';
    const absMin = Math.abs(diffMinutes);
    const h = String(Math.floor(absMin / 60)).padStart(2, '0');
    const m = String(absMin % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
  } catch {
    console.warn(`[GoogleCalendar] Invalid timezone "${timezone}", using UTC`);
    return 'Z';
  }
}

// =============================================================================
// Core Query Function
// =============================================================================

// Google Calendar API response types
interface GCalEventTime {
  dateTime?: string;
  date?: string;
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: GCalEventTime;
  end: GCalEventTime;
  location?: string;
  description?: string;
}

interface GCalResponse {
  items?: GCalEvent[];
}

const calendarBreaker = getBreaker('google-calendar');

/**
 * Fetch events from a single calendar ID
 */
async function fetchSingleCalendar(
  calendarId: string,
  options: { timeMin: string; timeMax: string; timezone?: string; maxResults?: number }
): Promise<GoogleCalendarEvent[]> {
  return calendarBreaker.execute(async () => {
    return withRetry(async () => {
      const token = await getAccessToken();

      const params = new URLSearchParams({
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: String(options.maxResults || 50),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      if (options.timezone) {
        params.set('timeZone', options.timezone);
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Auth failures: log clearly, don't retry, return empty
      if (response.status === 401 || response.status === 403) {
        const text = await response.text();
        console.error(`[GoogleCalendar] Auth failed for "${calendarId}" (${response.status}): ${text.slice(0, 200)}`);
        console.error('[GoogleCalendar] Check service account permissions — calendar must be shared with the service account email');
        return [];
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google Calendar API error (${response.status}): ${text.slice(0, 200)}`);
      }

      const data: GCalResponse = await response.json();
      const items = data.items || [];

      return items.map((item) => ({
        id: item.id,
        title: item.summary || 'Untitled',
        startTime: item.start.dateTime || item.start.date || '',
        endTime: item.end.dateTime || item.end.date || '',
        allDay: !item.start.dateTime,
        location: item.location || null,
        description: item.description ? item.description.slice(0, 200) : null,
      }));
    }, 'google-calendar', { maxAttempts: 2, initialDelayMs: 500 });
  });
}

/**
 * Query Google Calendar events within a time range
 * Supports multiple calendars via comma-separated GOOGLE_CALENDAR_ID
 *
 * @param options.timeMin - RFC 3339 datetime (e.g., "2026-02-28T00:00:00-05:00")
 * @param options.timeMax - RFC 3339 datetime (e.g., "2026-02-28T23:59:59-05:00")
 * @param options.timezone - IANA timezone for all-day event interpretation
 * @param options.maxResults - Maximum events to return per calendar (default 50)
 * @param options.calendarId - Calendar ID override (defaults to GOOGLE_CALENDAR_ID env, supports comma-separated)
 */
export async function queryGoogleCalendarEvents(options: {
  timeMin: string;
  timeMax: string;
  timezone?: string;
  maxResults?: number;
  calendarId?: string;
}): Promise<GoogleCalendarEvent[]> {
  const config = getServiceAccountConfig();
  if (!config) return [];

  const rawIds = options.calendarId || process.env.GOOGLE_CALENDAR_ID;
  if (!rawIds) return [];

  // Support comma-separated calendar IDs
  const calendarIds = rawIds.split(',').map(id => id.trim()).filter(Boolean);
  if (calendarIds.length === 0) return [];

  // Warn if time boundaries lack timezone offset (common mistake)
  if (options.timeMin.includes('T') && !options.timeMin.match(/[+-]\d{2}:\d{2}$/) && !options.timeMin.endsWith('Z')) {
    console.warn('[GoogleCalendar] timeMin lacks RFC 3339 timezone offset — may be interpreted as UTC');
  }

  console.log(`[GoogleCalendar] Fetching events from ${calendarIds.length} calendar(s): ${options.timeMin} → ${options.timeMax}`);

  // Fetch all calendars in parallel, merge results
  const results = await Promise.allSettled(
    calendarIds.map(id => fetchSingleCalendar(id, options))
  );

  const allEvents: GoogleCalendarEvent[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
    // Rejected calendars silently skipped — errors already logged in fetchSingleCalendar
  }

  // Sort merged events: all-day first, then by start time
  allEvents.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  console.log(`[GoogleCalendar] Found ${allEvents.length} events across ${calendarIds.length} calendar(s)`);
  return allEvents;
}
