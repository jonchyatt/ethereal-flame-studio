import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StoreItem } from '../items';

const draft: StoreItem = {
  id: 'draft-pick', kind: 'affiliate', name: 'Draft pick', source: 'Acme', blurb: 'As the maker says.',
  url: 'https://acme.shop/pick', commission: true, listedBy: 'jonathan', listedOn: '2026-11-03',
  provenance: 'Maker page.', status: 'draft',
};
const shelf: StoreItem[] = [];
jest.mock('../shelf-items', () => ({ get SHELF_ITEMS() { return shelf; } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const html = (mod: string) => renderToStaticMarkup(createElement(require(mod).default));

describe('store: draft switch', () => {
  beforeEach(() => { shelf.length = 0; });

  it('a draft item stays off the public shelf but shows in the intake preview', () => {
    shelf.push(draft);
    const pub = html('@/app/store/shelf/page');
    expect(pub).toContain('The shelf is being stocked');
    expect(pub).not.toContain('Draft pick');
    const intake = html('@/app/store/intake/page');
    expect(intake).toContain('Draft pick');
    expect(intake).toContain('1 draft, 0 live');
  });

  it('an item without a status is a draft; only live items reach the shelf', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { liveItems, itemStatus, checkItem } = require('../items');
    const { status: _s, ...noStatus } = draft;
    expect(itemStatus(noStatus)).toBe('draft');
    expect(liveItems([draft, noStatus, { ...draft, id: 'l', status: 'live' }]).map((i: StoreItem) => i.id)).toEqual(['l']);
    expect(checkItem({ ...draft, status: 'published' })).toBe('status must be draft or live');
    shelf.push({ ...draft, status: 'live' });
    expect(html('@/app/store/shelf/page')).toContain('Draft pick');
  });
});
