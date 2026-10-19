import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SITE_NAME, FOOTER_SNIPPET_HTML, ABOUT_COPY, LANDING, LANDING_PATH, RESET_BIOLOGY_URL,
} from '../resetBiologyKit';

const doc = readFileSync(join(process.cwd(), 'docs/reset-biology/REVERSE-LINK-KIT.md'), 'utf8');
const page = readFileSync(join(process.cwd(), 'src/app/from-reset-biology/page.tsx'), 'utf8');

const readerText = [FOOTER_SNIPPET_HTML, ABOUT_COPY, LANDING.title, LANDING.description,
  LANDING.heading, LANDING.intro, ...LANDING.paragraphs, ...LANDING.links.map((l) => l.label)].join('\n');

describe('Reset Biology reverse-link kit', () => {
  it('always uses the whole name, never WAIA', () => {
    expect(readerText).not.toMatch(/\bWAIA\b/);
    expect(doc).not.toMatch(/\bWAIA\b/);
    expect(ABOUT_COPY).toContain(SITE_NAME);
  });

  it('footer snippet is one plain outbound link to the landing page', () => {
    expect(FOOTER_SNIPPET_HTML).toMatch(/^<a href="https:\/\/www\.whatamiappreciatingnow\.com\/from-reset-biology"[^>]*>What Am I Appreciating Now<\/a>$/);
    expect(FOOTER_SNIPPET_HTML).not.toMatch(/\?|utm_/);
    expect(LANDING_PATH).toBe('/from-reset-biology');
  });

  it('takes no money: no prices, no checkout words', () => {
    expect(readerText).not.toMatch(/[$€£]\s?\d|checkout|buy now|subscribe now/i);
  });

  it('says the free Reset Biology tools stay free and links back', () => {
    expect(readerText).toMatch(/stay(s)? free/i);
    expect(LANDING.links.some((l) => l.href === RESET_BIOLOGY_URL)).toBe(true);
  });

  it('landing page is noindex and the doc carries the exact snippet and copy', () => {
    expect(page).toMatch(/index: false/);
    expect(doc).toContain(FOOTER_SNIPPET_HTML);
    expect(doc).toContain(ABOUT_COPY);
  });
});
