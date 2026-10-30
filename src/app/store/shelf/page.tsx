import { StoreItemCard, gridStyle } from '@/components/store/StoreItemCard';
import { DISCLOSURE, renderableItems, shelfHasCommission } from '@/lib/store/items';
import { SHELF_ITEMS } from '@/lib/store/shelf-items';

export const metadata = {
  title: 'The shelf · What Am I Appreciating Now',
  description: 'Things we use and recommend, one layout, outbound links only. Nothing is sold on this page.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/store/shelf' },
};

export default function ShelfPage() {
  const items = renderableItems(SHELF_ITEMS);
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>The shelf</h1>
      {(items.length === 0 || shelfHasCommission(items)) && (
        <p style={{ fontSize: 14, opacity: 0.75 }} id="disclosure"><strong>Disclosure.</strong> {DISCLOSURE}</p>
      )}
      {items.length === 0 ? (
        <p style={{ opacity: 0.7 }}>The shelf is being stocked. Nothing is listed yet.</p>
      ) : (
        <div style={gridStyle}>{items.map((i) => <StoreItemCard key={i.id} item={i} />)}</div>
      )}
      <p style={{ fontSize: 14, opacity: 0.6, marginTop: 32 }}>Links go to the seller. Nothing is bought or stored here. The free Reset Biology tools stay free.</p>
    </main>
  );
}
