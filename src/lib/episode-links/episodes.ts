import { FULL_NAME } from '@/lib/creator/shorts/captions';

/**
 * The ten launch episodes (docs/WAIA-LAUNCH-SLATE-2026-10.md section 3). Titles are working
 * titles; cadence and titles stay Jonathan's call (HB-4). The slug is the only thing a click
 * is attributed to, so it carries no person and no tracking id.
 */
export type EpisodeFormat = 'long' | 'short' | 'reel';

export type Episode = {
  slug: string;
  number: number;
  workingTitle: string;
  format: EpisodeFormat;
  /** Slug of the long episode a Short or Reel is cut from. */
  parent?: string;
};

export const EPISODES: readonly Episode[] = [
  { slug: 'ep01', number: 1, workingTitle: 'Thought and Character', format: 'long' },
  { slug: 'ep02', number: 2, workingTitle: 'The Thoughts You Choose', format: 'short', parent: 'ep01' },
  { slug: 'ep03', number: 3, workingTitle: 'A Quiet Mind', format: 'reel', parent: 'ep01' },
  { slug: 'ep04', number: 4, workingTitle: 'The Science of Getting Rich, Part 1', format: 'long' },
  { slug: 'ep05', number: 5, workingTitle: 'The Right to Be Rich', format: 'short', parent: 'ep04' },
  { slug: 'ep06', number: 6, workingTitle: 'The Way of Peace', format: 'long' },
  { slug: 'ep07', number: 7, workingTitle: 'Peace in a Single Thought', format: 'reel', parent: 'ep06' },
  { slug: 'ep08', number: 8, workingTitle: 'The Science of Being Great', format: 'long' },
  { slug: 'ep09', number: 9, workingTitle: 'Growing Into More', format: 'short', parent: 'ep08' },
  { slug: 'ep10', number: 10, workingTitle: 'Mixtape: Evening Loop', format: 'long' },
];

/** Only these site paths can ever be a redirect target, so the route cannot be an open redirect. */
export const LANDING_PATHS = ['/store'] as const;
export const DEFAULT_LANDING = '/store';

/** Where the viewer saw the link. Allow-listed so a query value is never stored as free text. */
export const SURFACES = ['description', 'endscreen', 'short', 'reel'] as const;
export type Surface = (typeof SURFACES)[number];

export const SITE_ORIGIN = 'https://www.whatamiappreciatingnow.com';

export function findEpisode(slug: string): Episode | undefined {
  return EPISODES.find((e) => e.slug === slug);
}

export function surfaceFor(format: EpisodeFormat): Surface {
  return format === 'long' ? 'description' : format;
}

export function episodeLink(episode: Episode, surface: Surface, origin = SITE_ORIGIN): string {
  return `${origin}/e/${episode.slug}?s=${surface}`;
}

export { FULL_NAME };
