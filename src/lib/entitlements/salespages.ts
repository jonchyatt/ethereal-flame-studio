/**
 * Four sales-page previews per program (D = the Voss/NEPQ rewrite, 2026-10-19,
 * beside A-C so Jonathan compares v1 and v2 side by side) (backlog: "Three sales pages per program").
 *
 * Jonathan picks (HB-4), so all four are built and live only at
 * /programs/<id>/preview/a|b|c|d, noindex, with no buy button and no price.
 * Every page leads with the loop: desire, passion, achievement, peace
 * (boring on its own), contrast, new desire, and "Now" brings it back around.
 *
 * Copy describes the offer, never the protocol or the session words (those are
 * handed over by Jonathan and live in private storage). The Yale program uses
 * a neutral public name until Jonathan answers the naming card.
 */

import { getProgram } from './catalog';

export const VARIANT_IDS = ['a', 'b', 'c', 'd'] as const;
export type VariantId = (typeof VARIANT_IDS)[number];

export const LOOP_STAGES = ['desire', 'passion', 'achievement', 'peace', 'contrast', 'new desire'] as const;

export interface Section {
  heading: string;
  body: string[];
  /** Sales technique this block uses (variant D). Shown on the noindex preview for Jonathan's pick, never as a promise. */
  technique?: string;
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
  /** Technique behind the headline (variant D). */
  headlineTechnique?: string;
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
  {
    programId: 'advanced-hypnosis-sessions',
    variant: 'd',
    angle: 'Voss and NEPQ (2026-10-19): questions first, a label, the sessions as the quiet answer, a no-oriented close',
    displayName: 'Advanced hypnosis sessions',
    headline: 'It seems like the free collection took you somewhere. What would it mean to go further?',
    headlineTechnique: 'Voss label ("It seems like"), then an NEPQ solution-awareness question. Opens on the reader, not the product.',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('You are somewhere on this circle right now. Where?'),
      technique: 'Calibrated "where" question (Voss): the reader places themselves before anything is offered.',
    },
    sections: [
      {
        heading: 'Where are you on the circle today?',
        body: [
          'Is it the pull of a new desire, the energy of passion, the quiet after something you finished, or the restlessness that comes when things have been calm a little too long?',
          'And what happens when that restlessness has nowhere to go?',
        ],
        technique: 'NEPQ problem-awareness question, then an NEPQ consequence question. No health framing.',
      },
      {
        heading: 'It sounds like you want more than a quick listen',
        body: [
          'Each advanced session is made for one place on the circle, so you start from where you are, not from the beginning.',
          'Every session lists its script author, voice, music and rights basis before it can go on sale.',
        ],
        technique: 'Voss label as the heading; the sessions arrive as the quiet answer, one fact per line, no feature list.',
      },
      {
        heading: 'What it is not',
        body: ['Not a cure, not a diagnosis, not a promise of any result.', HYPNOSIS_SAFETY],
        technique: 'Voss accusation audit: name the worry first so the reader does not have to.',
      },
      {
        heading: 'Before you decide',
        body: ['When the sessions open, would you be opposed to starting with the one made for where you are right now?'],
        technique: 'Voss no-oriented question: "no" is the safe answer, so the reader keeps control. Replaces "would it be useful?".',
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
  {
    programId: 'yale-inversion-protocol',
    variant: 'd',
    angle: 'Voss and NEPQ (2026-10-19): questions first, a label, the process as the quiet answer, a no-oriented close',
    displayName: YALE_NAME,
    headline: 'It seems like one contrast keeps coming back around. What has it been costing you?',
    headlineTechnique: 'Voss label, then an NEPQ consequence question. The reader names the problem; the page does not.',
    loopSection: {
      heading: 'The loop',
      body: LOOP_BODY('Contrast is part of the circle, not the end of it.'),
      technique: 'Reframe in the loop words from variant A, before any offer.',
    },
    sections: [
      {
        heading: 'What keeps coming back?',
        body: [
          'What is the one thing that returns, however many times you set it down?',
          'And if it stays exactly the same for another six months, what does that do to the rest of your days?',
        ],
        technique: 'NEPQ problem-awareness question, then the NEPQ six-to-twelve-month consequence question.',
      },
      {
        heading: 'It sounds like you want to move through it, not read about it',
        body: [
          'This is a guided process: one step at a time, an optional timer, and private notes that stay in your browser tab.',
          'The steps are handed over by Jonathan and are not summarised or rewritten on this page.',
        ],
        technique: 'Voss label as the heading; the process is the quiet answer, facts only.',
      },
      {
        heading: 'What it is not',
        body: ['Not therapy, not medical care, not a promise of any result. You can stop at any time.', YALE_NAMING_NOTE],
        technique: 'Voss accusation audit: the limits are said first, plainly.',
      },
      {
        heading: 'Before you decide',
        body: ['When it opens, would it be a bad idea to take the first step and see how it sits with you?'],
        technique: 'Voss no-oriented question in place of a yes-trap close.',
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
