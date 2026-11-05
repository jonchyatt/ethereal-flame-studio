import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreItemCard } from '@/components/store/StoreItemCard';
import type { StoreItem } from '../items';

const base: StoreItem = {
  id: 'pick', kind: 'affiliate', name: 'Pick', source: 'Thorne', blurb: 'As the maker says.',
  url: 'https://www.thorne.com/products/dp/glycine', commission: false, listedBy: 'jonathan',
  listedOn: '2026-11-03', provenance: 'Maker page.',
};
const card = (item: StoreItem) => renderToStaticMarkup(createElement(StoreItemCard, { item }));

describe('store: disclosure on every card', () => {
  it('a commission card carries the affiliate line, named for the program', () => {
    const html = card({ ...base, commission: true, program: 'Thorne' });
    expect(html).toContain('may earn a commission from Thorne');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(card(base)).not.toContain('may earn a commission');
  });

  it('a supplement card carries the FDA line; others do not', () => {
    expect(card({ ...base, supplement: true })).toContain('Food and Drug Administration');
    expect(card(base)).not.toContain('Food and Drug Administration');
  });

  it('capitalizes "Listed by Jonathan" and shows a seller warning as given', () => {
    const html = card({ ...base, warning: 'If pregnant, nursing, or trying to conceive do not use this product.' });
    expect(html).toContain('Listed by Jonathan on 2026-11-03');
    expect(html).toContain('If pregnant, nursing, or trying to conceive do not use this product.');
  });
});
