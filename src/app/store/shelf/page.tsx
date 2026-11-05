import { StoreItemCard, gridStyle } from '@/components/store/StoreItemCard';
import { WaiaFooter } from '@/components/WaiaFooter';
import { NAV_LINK_STYLE } from '@/app/legal/LegalLinks';
import { DISCLOSURE, liveItems, shelfHasCommission } from '@/lib/store/items';
import { SHELF_ITEMS } from '@/lib/store/shelf-items';

const shelfButtonStyle = {
  alignItems: 'center',
  border: '1px solid #555',
  borderRadius: 8,
  boxSizing: 'border-box',
  color: 'inherit',
  display: 'inline-flex',
  height: 44,
  padding: '10px 14px',
  textDecoration: 'none',
} as const;

export const metadata = {
  title: 'The shelf · What Am I Appreciating Now',
  description: 'Things we use and recommend, one layout, outbound links only. Nothing is sold on this page.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/store/shelf' },
};

export default function ShelfPage() {
  const items = liveItems(SHELF_ITEMS);
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" className="shelf-breadcrumb" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, marginBottom: 24 }}>
        <a href="/" style={NAV_LINK_STYLE}>Home</a>
        <a href="/store" style={NAV_LINK_STYLE}>Store</a>
        <span aria-current="page">The shelf</span>
      </nav>
      <h1 style={{ color: '#f7f3e6', fontFamily: '"Iowan Old Style", "Sitka Text", Georgia, "Times New Roman", serif', fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 400, margin: 0 }}>The shelf</h1>
      {(items.length === 0 || shelfHasCommission(items)) && (
        <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 24 }} id="disclosure"><strong>Disclosure.</strong> {DISCLOSURE}</p>
      )}
      {items.length === 0 ? (
        <>
          <p style={{ opacity: 0.7, margin: 0 }}>The shelf is being stocked. Nothing is listed yet.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <a href="/store" style={shelfButtonStyle}>Store</a>
            <a href="/" style={shelfButtonStyle}>Home</a>
          </div>
        </>
      ) : (
        <div style={gridStyle}>{items.map((i) => <StoreItemCard key={i.id} item={i} />)}</div>
      )}
      <p style={{ fontSize: 14, opacity: 0.6, marginTop: 32 }}>Links go to the seller. Nothing is bought or stored here. The free Reset Biology tools stay free.</p>
      <WaiaFooter />
    </main>
  );
}
