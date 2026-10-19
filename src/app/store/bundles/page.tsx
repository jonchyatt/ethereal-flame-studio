import { BUNDLES, bundlePriceCents, isOnSale, itemLabel } from '@/lib/store/bundles';

export const metadata = {
  title: 'Gifts and bundles · What Am I Appreciating Now',
  description: 'Sessions and guided processes bundled to give or keep. Nothing here is on sale yet.',
};

export default function BundlesPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Gifts and bundles</h1>
      <p>What Am I Appreciating Now, bundled to keep or to give. Nothing here is on sale yet and nothing is charged.</p>
      {BUNDLES.map((b) => {
        const cents = bundlePriceCents(b.id);
        return (
          <section key={b.id} id={b.id} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
            <h2>{b.title}</h2>
            <p>{b.summary}</p>
            <ul>{b.items.map((i, n) => <li key={n}>{itemLabel(i)}</li>)}</ul>
            <p style={{ fontSize: 14, opacity: 0.7 }}>
              {b.giftable ? 'Can be given as a gift · ' : ''}
              {isOnSale(b.id) && cents !== null ? `${(cents / 100).toFixed(2)} USD` : 'Not yet on sale'}
            </p>
          </section>
        );
      })}
      <h2>How giving will work</h2>
      <p>Choose a bundle, add a short note and an optional delivery date. You receive a one-time gift code to pass on; we keep only a scrambled copy of it, and no email address or postal address is stored.</p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>The free Reset Biology tools stay free.</p>
    </main>
  );
}
