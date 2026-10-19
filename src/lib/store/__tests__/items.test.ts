import { checkItem, parseIntake, itemsToSource, renderableItems, linkRel, DISCLOSURE, type StoreItem } from '../items';
import { SHELF_ITEMS } from '../shelf-items';

const opts = { kind: 'affiliate' as const, commission: true, provenance: 'From Jonathan.', today: '2026-10-19' };

describe('store: unified item layout and intake', () => {
  it('ships an empty shelf, nothing invented', () => {
    expect(SHELF_ITEMS).toEqual([]);
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

  it('keeps the disclosure wording', () => {
    expect(DISCLOSURE).toMatch(/no extra cost/);
    expect(DISCLOSURE).toMatch(/nothing here is medical advice/i);
  });
});
