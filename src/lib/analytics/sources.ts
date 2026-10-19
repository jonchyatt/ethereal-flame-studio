/**
 * Where each ranked metric and each weight comes from (project rule: no named source = not ready).
 * Checked 2026-10-19. A claim here is only what the cited page itself says.
 */
export type MetricSource = { name: string; url: string; says: string };

export const YOUTUBE_RETENTION_HELP: MetricSource = {
  name: 'YouTube Help: Measure key moments for audience retention',
  url: 'https://support.google.com/youtube/answer/9314415',
  says: 'Watch time is "the amount of time viewers have watched your video"; average view duration is "average minutes watched among those who stayed to watch".',
};
export const YOUTUBE_RECOMMENDATIONS_HELP: MetricSource = {
  name: 'YouTube Help: Recommendations',
  url: 'https://support.google.com/youtube/answer/9962575',
  says: 'Viewer surveys help the system "understand satisfaction, not just watch time"; the page gives no weights between signals.',
};
export const HUMMUS_GUIDE: MetricSource = {
  name: 'Shane Hummus, The Low-tech Guide to YouTube Success (2025 Edition)',
  url: 'https://shanehummus.com/youtube-growth/the-low-tech-guide-to-youtube-success-2025-edition/',
  says: 'Retention is the lever he returns to (value in the first 30 seconds, "70% better retention"); watch time and click-through follow from it; subscriber growth is a result of consistency, not a number he sets a target for.',
};

export const METRIC_SOURCES = {
  watchTime: {
    metric: 'estimated minutes watched per view',
    sources: [YOUTUBE_RETENTION_HELP, HUMMUS_GUIDE],
  },
  retention: {
    metric: 'average view percentage',
    sources: [YOUTUBE_RETENTION_HELP, HUMMUS_GUIDE],
  },
  subscribers: {
    metric: 'subscribers gained per 1,000 views',
    sources: [HUMMUS_GUIDE, YOUTUBE_RECOMMENDATIONS_HELP],
  },
} as const;

/**
 * NOT GROUNDED, named on purpose: no mentor or YouTube page we could reach publishes numeric weights between
 * these metrics, and YouTube says it does not disclose them. Equal weights are the no-preference default, not a finding.
 * Kallaway and Earn With Content: their material could not be retrieved in the cloud session, so nothing is attributed to them.
 */
export const UNGROUNDED = [
  'The relative weights between the three metrics (equal thirds; no published source gives numbers).',
  'The 100-view floor for confidence (a sample-size guard, not from a mentor).',
  'Views-weighting of video scores inside a group (a statistical choice, not from a mentor).',
] as const;
