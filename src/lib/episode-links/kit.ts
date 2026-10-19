import { assertWholeName } from '@/lib/creator/shorts/captions';
import { EPISODES, FULL_NAME, SITE_ORIGIN, episodeLink, surfaceFor, type Episode } from './episodes';

/**
 * Text Jonathan pastes into a description or end-screen note. One quiet line and a link:
 * no ask to like or subscribe (HB-8: no engagement bait), and the name always whole.
 */
export type EpisodeLinkKit = {
  slug: string;
  number: number;
  workingTitle: string;
  format: Episode['format'];
  link: string;
  /** Appended to the episode description (long) or caption (Short / Reel). */
  descriptionLine: string;
  /** Short text for a long episode's end-screen link card; empty for Shorts and Reels. */
  endScreenText: string;
  endScreenLink: string | null;
};

export function buildEpisodeLinkKit(origin = SITE_ORIGIN): EpisodeLinkKit[] {
  return EPISODES.map((ep) => {
    const link = episodeLink(ep, surfaceFor(ep.format), origin);
    const long = ep.format === 'long';
    const endScreenLink = long ? episodeLink(ep, 'endscreen', origin) : null;
    return {
      slug: ep.slug,
      number: ep.number,
      workingTitle: ep.workingTitle,
      format: ep.format,
      link,
      descriptionLine: assertWholeName(`More from ${FULL_NAME}: ${link}`),
      endScreenText: long ? assertWholeName(`Visit ${FULL_NAME}`) : '',
      endScreenLink,
    };
  });
}

export function renderKitMarkdown(origin = SITE_ORIGIN): string {
  const rows = buildEpisodeLinkKit(origin);
  const lines = [
    '# Episode links kit',
    '',
    'Generated from `src/lib/episode-links/episodes.ts` (regenerate with `UPDATE_EPISODE_KIT=1 npx jest src/lib/episode-links`). Paste the description line into each episode, Short or Reel. Titles are working titles; they stay Jonathan\'s call.',
    '',
    '| # | Working title | Format | Description line | End-screen link |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.number} | ${r.workingTitle} | ${r.format} | \`${r.descriptionLine}\` | ${r.endScreenLink ? `\`${r.endScreenLink}\` ("${r.endScreenText}")` : 'none'} |`),
    '',
  ];
  return lines.join('\n');
}
