// Copy for the Reset Biology reverse-link kit (backlog item 13). One source for the
// landing page, the footer snippet and the About paragraph so they cannot drift apart.
// Plain outbound links only: no prices, no tracking parameters, no money taken.

export const SITE_NAME = 'What Am I Appreciating Now';
export const SITE_URL = 'https://www.whatamiappreciatingnow.com/';
export const RESET_BIOLOGY_URL = 'https://resetbiology.com/';
export const LANDING_PATH = '/from-reset-biology';

export const FOOTER_TEXT = `${SITE_NAME}`;

export const FOOTER_SNIPPET_HTML =
  `<a href="${SITE_URL.replace(/\/$/, '')}${LANDING_PATH}" rel="noopener">${FOOTER_TEXT}</a>`;

export const ABOUT_COPY =
  `${SITE_NAME} is a companion to Reset Biology: guided hypnosis, appreciation sessions and ` +
  `visual meditations made to help people find joy. The Reset Biology tools stay free here. ` +
  `${SITE_NAME} is where the sessions and programs live.`;

export const LANDING = {
  title: `From Reset Biology · ${SITE_NAME}`,
  description: `Welcome from Reset Biology. ${SITE_NAME} is a place for guided sessions and visual meditations made to inspire joy.`,
  heading: 'Welcome from Reset Biology',
  intro:
    `${SITE_NAME} is the loop of desire, passion, achievement, peace, contrast and new desire, ` +
    `and "Now" brings it back around. Come to the centre, or move on to what you want next.`,
  // Copy v2 (Voss/NEPQ, 2026-10-19): Voss label on why they clicked, accusation audit on the
  // free tools, NEPQ situation question before the links. v1 in docs/COPY-V2-VOSS-NEPQ-2026-10-19.md
  paragraphs: [
    'It seems like you came over from Reset Biology looking for something beyond the tools.',
    'You might be wondering whether the free tools are about to cost something. They are not: Reset Biology and its free tools stay exactly where they are, and stay free.',
    'Here you will find guided hypnosis sessions, appreciation sessions and visual meditations. Nothing here is on sale yet. Where would you like to start?',
  ],
  links: [
    { label: 'See the programs', href: '/programs' },
    { label: 'Back to Reset Biology', href: RESET_BIOLOGY_URL },
  ],
};
