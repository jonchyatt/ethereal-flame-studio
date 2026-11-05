import IntakeForm from './IntakeForm';
import { StoreItemCard, gridStyle } from '@/components/store/StoreItemCard';
import { itemStatus, renderableItems } from '@/lib/store/items';
import { SHELF_ITEMS } from '@/lib/store/shelf-items';

export default function IntakePage() {
  const stocked = renderableItems(SHELF_ITEMS);
  const drafts = stocked.filter((i) => itemStatus(i) === 'draft').length;
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Shelf intake</h1>
      <p>Paste one item per line. Each shows below exactly as visitors will see it. Nothing is sent or saved; this page only previews and prints lines for the shelf file.</p>
      <IntakeForm />
      <h2>In the shelf file ({stocked.length}: {drafts} draft, {stocked.length - drafts} live)</h2>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Everything in src/lib/store/shelf-items.ts. Only live items appear on the public /store/shelf; drafts show here only.</p>
      {stocked.length === 0 ? <p style={{ opacity: 0.6 }}>Nothing stocked yet.</p> : <div style={gridStyle}>{stocked.map((i) => <StoreItemCard key={i.id} item={i} />)}</div>}
    </main>
  );
}
