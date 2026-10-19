/**
 * Three sales-page previews per program (backlog: "Three sales pages per program").
 *
 * Jonathan picks (HB-4), so all three are built and live only at
 * /programs/<id>/preview/a|b|c, noindex, with no buy button and no price.
 * Every page leads with the loop: desire, passion, achievement, peace
 * (boring on its own), contrast, new desire, and "Now" brings it back around.
 *
 * Copy describes the offer, never the protocol or the session words (those are
 * handed over by Jonathan and live in private storage). The Yale program uses
 * a neutral public name until Jonathan answers the naming card.
 */

import { getProgram } from './catalog';

export const VARIANT_IDS = ['a', 'b', 'c'] as const;
export type VariantId = (typeof VARIANT_IDS)[number];

export const LOOP_STAGES = ['desire', 'passion', 'achievement', 'peace', 'contrast', 'new desire'] as const;

export interface Section {
  heading: string;
  body: string[];
}

export interface SalesPage {
  programId: string;
  variant: VariantId;
  /** Short label for Jonathan's picker, never shown as a promise to buyers. */
  angle: string;
  /** Name shown to a person reading the page. */
  displayName: string;
  headline: string;
  /** Always first: the loop, in the six stages, ending on Now. */
  loopSection: Section;
  sections: Section[];
  ctaNote: string;
}

const LOOP_BODY = (lead: string): string[] => [
  lead,
  'Desire, passion, achievement, peace, contrast, new desire. Peace on its own is boring, so contrast shows up and a new desire is born. Wanting is the intake of energy.',
  'Now brings it back around.',
];

const CTA = 'Not yet on sale. Nothing here can be bought today.';

const HYPNOSIS_SAFETY =
  'Listen somewhere safe, never while driving or operating anything. You can stop any time. Sessions are not medical care.';

const YALE_NAME = 'The inversion protocol: a guided process';
const YALE_NAMING_NOTE =
  'Public name is neutral on purpose while the naming question is open. No claim is made about where the protocol was first tested.';

export const SALES_PAGES: readonly SalesPage[] = [
  // Advanced hypnosis sessions
  {
    programId: 'advanced-hypnosis-sessions',
    variant: 'a',
    angle: 'Story-led: the loop is the hero, the sessions are how you travel it',
    displayName: 'Advanced hypnosis sessions',
    headline: 'Wanting, having, and wanting again: the loop you are already in',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Every life moves around one circle.'),
    },
    sections: [
      {
        heading: 'Where the sessions meet the loop',
        body: [
          'Each advanced session is made for one place on the circle: the pull of a new desire, the energy of passion, the quiet after an achievement, or the restlessness of contrast.',
          'Every session lists its script author, voice, music and rights basis before it can go on sale.',
        ],
      },
      { heading: 'Before you listen', body: [HYPNOSIS_SAFETY] },
    ],
    ctaNote: CTA,
  },
  {
    programId: 'advanced-hypnosis-sessions',
    variant: 'b',
    angle: 'Question-led: the two readings of the name, then plain answers',
    displayName: 'Advanced hypnosis sessions',
    headline: 'Now, what am I appreciating? What am I appreciating now?',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Both readings of the name are the same circle.'),
    },
    sections: [
      {
        heading: 'Two readings, one practice',
        body: [
          '"Now, what am I appreciating?" brings you to the centre. "What am I appreciating now?" keeps you moving forward. The sessions hold both.',
        ],
      },
      {
        heading: 'Questions',
        body: [
          'Who is it for? People who want to go further than the free collection.',
          'How do I pay? You cannot yet. The sessions are not on sale.',
          'Where do the words and voice come from? Each session names its script author, voice and music.',
        ],
      },
      { heading: 'Before you listen', body: [HYPNOSIS_SAFETY] },
    ],
    ctaNote: CTA,
  },
  {
    programId: 'advanced-hypnosis-sessions',
    variant: 'c',
    angle: 'Quiet and short: loop, what you get, what it is not',
    displayName: 'Advanced hypnosis sessions',
    headline: 'Go further than the free collection',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Start where you are on the circle.'),
    },
    sections: [
      {
        heading: 'What you get',
        body: ['Deeper sessions, each with its sources shown. Joy and appreciation are the point.'],
      },
      {
        heading: 'What it is not',
        body: ['Not a cure, not a diagnosis, not a promise of any result.', HYPNOSIS_SAFETY],
      },
    ],
    ctaNote: CTA,
  },
  // Yale inversion protocol, guided process
  {
    programId: 'yale-inversion-protocol',
    variant: 'a',
    angle: 'Story-led: the loop is the hero, the process turns a contrast around',
    displayName: YALE_NAME,
    headline: 'Contrast is not the end of the loop. It is the way into the next desire.',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Every life moves around one circle.'),
    },
    sections: [
      {
        heading: 'A guided process, one step at a time',
        body: [
          'You move through the process one step at a time, with an optional timer and private notes that stay in your browser tab.',
          'The steps are handed over by Jonathan and are not summarised or rewritten on this page.',
        ],
      },
      { heading: 'Your choice, every step', body: ['You choose to take part, and you can stop at any time. ' + YALE_NAMING_NOTE] },
    ],
    ctaNote: CTA,
  },
  {
    programId: 'yale-inversion-protocol',
    variant: 'b',
    angle: 'Question-led: the two readings of the name, then plain answers',
    displayName: YALE_NAME,
    headline: 'Now, what am I appreciating? What am I appreciating now?',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Both readings of the name are the same circle.'),
    },
    sections: [
      {
        heading: 'Questions',
        body: [
          'What is it? A guided process you take at your own pace.',
          'What do I need? Time, somewhere quiet, and a willingness to stop. You can stop at any time.',
          'Can I buy it? Not yet. It is not on sale.',
        ],
      },
      { heading: 'About the name', body: [YALE_NAMING_NOTE] },
    ],
    ctaNote: CTA,
  },
  {
    programId: 'yale-inversion-protocol',
    variant: 'c',
    angle: 'Quiet and short: loop, what you get, what it is not',
    displayName: YALE_NAME,
    headline: 'One guided process, at your pace',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Start where you are on the circle.'),
    },
    sections: [
      { heading: 'What you get', body: ['A step-by-step player, a timer if you want one, and notes only you can see.'] },
      {
        heading: 'What it is not',
        body: ['Not therapy, not medical care, not a promise of any result. You can stop at any time. ' + YALE_NAMING_NOTE],
      },
    ],
    ctaNote: CTA,
  },
];

export function isVariantId(v: string): v is VariantId {
  return (VARIANT_IDS as readonly string[]).includes(v);
}

/** Only programs in the paid catalog have previews; unknown ids or variants give null. */
export function getSalesPage(programId: string, variant: string): SalesPage | null {
  if (!getProgram(programId) || !isVariantId(variant)) return null;
  return SALES_PAGES.find((p) => p.programId === programId && p.variant === variant) ?? null;
}

export function salesPagesFor(programId: string): SalesPage[] {
  return SALES_PAGES.filter((p) => p.programId === programId);
}
