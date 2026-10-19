import { notFound } from 'next/navigation';
import { listMerch } from '@/lib/merch/catalog';

export const metadata = {
  title: 'Merchandise · What Am I Appreciating Now',
  description: 'T-shirts, hats and mugs carrying the What Am I Appreciating Now infinity loop. Not yet on sale.',
};

const page = { maxWidth: 960, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' } as const;

export default function MerchPage() {
  const products = listMerch();
  // An unfinished page is never public: with no approved design the route does not exist.
  if (products.length === 0) notFound();
  return (
    <main style={page}>
      <h1>Merchandise</h1>
      <p>The infinity loop of desire, passion, achievement, peace, contrast and new desire, on things you can wear and hold. Nothing here is on sale yet.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 24 }}>
        {products.map((p) => (
          <a key={p.slug} href={`/merch/${p.slug}`} style={{ color: 'inherit', textDecoration: 'none', border: '1px solid #333', borderRadius: 12, padding: 12 }}>
            <img src={p.image} alt={p.name} style={{ width: '100%', borderRadius: 8 }} />
            <h2 style={{ fontSize: 16 }}>{p.name}</h2>
            <p style={{ fontSize: 14, opacity: 0.7 }}>Not yet on sale</p>
          </a>
        ))}
      </div>
    </main>
  );
}
