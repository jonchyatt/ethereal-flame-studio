/**
 * BriefingClient - Client-side wrapper for briefing data
 *
 * Fetches briefing data via API route since NotionClient uses
 * child_process which only works server-side.
 */

import type { BriefingData, CheckInType, CheckInProgress, EveningWrapData, WeeklyReviewData } from './types';

/**
 * Fetch morning briefing data from server
 */
export async function fetchBriefingData(): Promise<BriefingData> {
  const response = await fetch('/api/jarvis/briefing');

  if (!response.ok) {
    throw new Error('Failed to fetch briefing data');
  }

  return response.json();
}

/**
 * Fetch check-in data from server
 */
export async function fetchCheckInData(type: CheckInType): Promise<{
  briefing: BriefingData;
  progress: CheckInProgress;
}> {
  const response = await fetch(`/api/jarvis/briefing?type=${type}`);

  if (!response.ok) {
    throw new Error('Failed to fetch check-in data');
  }

  return response.json();
}

/**
 * Fetch evening wrap data from server
 */
export async function fetchEveningWrapData(): Promise<EveningWrapData> {
  const response = await fetch('/api/jarvis/briefing?type=evening_wrap');

  if (!response.ok) {
    throw new Error('Failed to fetch evening wrap data');
  }

  return response.json();
}

/**
 * Fetch weekly review data from server
 */
export async function fetchWeeklyReviewData(): Promise<WeeklyReviewData> {
  const response = await fetch('/api/jarvis/briefing?type=weekly_review');

  if (!response.ok) {
    throw new Error('Failed to fetch weekly review data');
  }

  return response.json();
}

// Re-export as buildMorningBriefing for compatibility with existing code
export { fetchBriefingData as buildMorningBriefing };
export { fetchCheckInData as buildCheckInData };
export { fetchEveningWrapData as buildEveningWrapData };
export { fetchWeeklyReviewData as buildWeeklyReviewData };
