import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShelfPage from '@/app/store/shelf/page';
import IntakePage from '@/app/store/intake/page';
import { checkItem, parseIntake, itemsToSource, renderableItems, liveItems, linkRel, DISCLOSURE, type StoreItem } from '../items';
import { SHELF_ITEMS } from '../shelf-items';

const opts = { kind: 'affiliate' as const, commission: true, provenance: 'From Jonathan.', today: '2026-10-19' };

describe('store: unified item layout and intake', () => {
  it('ships six picks: STEMREGEN live on its approved link, Thorne draft until its program link exists', () => {
    expect(SHELF_ITEMS).toHaveLength(6);
    expect(renderableItems(SHELF_ITEMS)).toHaveLength(6);
    expect(liveItems(SHELF_ITEMS).map((i) => i.source)).toEqual(['StemRegen', 'StemRegen']);
    for (const i of SHELF_ITEMS) {
      expect(i).toMatchObject({ commission: true });
      if (i.source === 'Thorne') {
        expect(i).toMatchObject({ status: 'draft', provenance: 'Maker page; swap for program-issued link when approved.' });
        expect(i.url).toMatch(/^https:\/\/www\.thorne\.com\/products\//);
      } else {
        expect(i).toMatchObject({ status: 'live' });
        expect(i.url).toBe('https://stemregen.co/resetbiology');
      }
    }
    expect(JSON.stringify(SHELF_ITEMS)).not.toMatch(/\$\d/);
    const pub = renderToStaticMarkup(createElement(ShelfPage));
    expect(pub).not.toMatch(/thorne/i);
    expect(pub).toContain('href="https://stemregen.co/resetbiology"');
    expect(pub).toContain('may earn a commission from STEMREGEN');
    const intake = renderToStaticMarkup(createElement(IntakePage));
    for (const i of SHELF_ITEMS) expect(intake).toContain(`href="${i.url}"`);
    expect(intake).toContain('4 draft, 2 live');
    expect(intake.match(/may earn a commission from Thorne/g)).toHaveLength(4);
    expect(intake.match(/may earn a commission from STEMREGEN/g)).toHaveLength(2);
    expect(intake.match(/Food and Drug Administration/g)).toHaveLength(5);
    expect(intake).toContain('If pregnant, nursing, or trying to conceive do not use this product.');
  });

  it('parses the pipe, dash and bare-link shapes', () => {
    const rows = parseIntake(
      ['Magnesium | Acme | https://acme.shop/mag?ref=ab12 | As the merchant describes it.',
        'Scale - https://other.shop/scale - Plain description',
        'https://third.shop/thing'].join('\n'), opts);
    expect(rows.map((r) => r.error)).toEqual([null, null, 'missing name']);
    expect(rows[0].item).toMatchObject({ name: 'Magnesium', source: 'Acme', blurb: 'As the merchant describes it.', url: 'https://acme.shop/mag?ref=ab12', id: 'magnesium' });
    expect(rows[1].item).toMatchObject({ name: 'Scale', source: 'Other', blurb: 'Plain description' });
  });

  it('reports lines without a link and rejects placeholder or non-https links', () => {
    const rows = parseIntake('just words\nA | http://x.shop/a\nB | https://x.shop/?ref={ID}\n\nC | https://x.shop/c', opts);
    expect(rows.map((r) => r.error)).toEqual(['no https link on this line', 'url must be https', 'url is a placeholder', null]);
  });

  it('gives duplicate names distinct ids', () => {
    const rows = parseIntake('A | https://x.shop/1\nA | https://x.shop/2', opts);
    expect(rows.map((r) => r.item?.id)).toEqual(['a', 'a-2']);
  });

  it('requires provenance, so a blank one blocks the item', () => {
    expect(parseIntake('A | https://x.shop/1', { ...opts, provenance: ' ' })[0].error).toBe('missing provenance');
  });

  it('marks commission links sponsored and plain ones not', () => {
    expect(linkRel({ commission: true })).toBe('sponsored noopener noreferrer');
    expect(linkRel({ commission: false })).toBe('noopener noreferrer');
  });

  it('prints source lines that round-trip through checkItem', () => {
    const items = parseIntake('A | Acme | https://acme.shop/a | Blurb', opts).flatMap((r) => (r.item ? [r.item] : []));
    const back = JSON.parse('[' + itemsToSource(items).replace(/,\s*$/, '') + ']') as StoreItem[];
    expect(back.map(checkItem)).toEqual([null]);
    expect(renderableItems([...back, { ...back[0], url: 'nope' }])).toHaveLength(1);
  });

  it('prints supplement and program from the intake fields, as drafts', () => {
    const [row] = parseIntake('Glycine | Thorne | https://www.thorne.com/products/dp/glycine | Maker words.', { ...opts, supplement: true, program: ' Thorne ' });
    expect(row.error).toBeNull();
    const printed = itemsToSource([row.item as StoreItem]);
    expect(printed).toContain('"supplement":true');
    expect(printed).toContain('"program":"Thorne"');
    expect(printed).toContain('"status":"draft"');
    const plain = itemsToSource(parseIntake('A | https://x.shop/a', opts).map((r) => r.item as StoreItem));
    expect(plain).toContain('"supplement":false');
    expect(plain).not.toContain('"program"');
  });

  it('keeps the disclosure wording', () => {
    expect(DISCLOSURE).toMatch(/no extra cost/);
    expect(DISCLOSURE).toMatch(/nothing here is medical advice/i);
  });
});
