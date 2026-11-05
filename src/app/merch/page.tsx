import { listMerch } from '@/lib/merch/catalog';

export const metadata = {
  title: 'Merchandise · What Am I Appreciating Now',
  description: 'Two tees and two mugs carrying What Am I Appreciating Now as one continuous ring. Previews coming; not yet on sale.',
};

const page = { maxWidth: 960, margin: '0 auto', padding: '48px 20px', minHeight: '100vh' } as const;
const card = { border: '1px solid rgb(236 230 214 / 0.14)', borderRadius: 14, padding: 20, background: '#131829' } as const;

// Jon's four concepts, 2026-11-04 (jarvis data/waia-health-shop/MERCH-PROPOSAL-2026-11-04-four-concepts-continuous-loop.md).
// They replace the declined mockups. Each card turns into a product once its design passes intake.
const CONCEPTS = [
  { name: 'Fractal-Vortex Continual Loop Tee', kind: 'Tee' },
  { name: 'Infinity-Ribbon and Flame Orb Pivot Tee', kind: 'Tee' },
  { name: 'Carved-Wood Optical Vortex Continual Loop Mug', kind: 'Mug' },
  { name: '360 VR Horizon and Luminous Orb Continual Loop Mug', kind: 'Mug' },
];

export default function MerchPage() {
  const products = listMerch();
  return (
    <main style={page}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 24 }}>
        <a href="/" style={{ color: 'inherit' }}>Home</a>
        <a href="/store" style={{ color: 'inherit' }}>Store</a>
      </nav>
      <img src="/waia-home/carving-banner.webp" width={1600} height={802}
        alt="A carved wood panel: the words What Am I Appreciating Now in one ring around a spiral vortex."
        style={{ width: '100%', height: 'auto', borderRadius: 14, marginBottom: 24 }} />
      <h1>Merch and patrons</h1>
      <p>Four designs, each carrying the name What Am I Appreciating Now as one continuous ring, the way it reads on the wood panel above, with NOW as the hinge. Nothing here is on sale yet.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: 20, marginTop: 24 }}>
        {CONCEPTS.map((c) => (
          <section key={c.name} style={card} aria-label={c.name}>
            <p style={{ margin: 0, color: '#e6bd77', fontSize: 14 }}>{c.kind}</p>
            <h2 style={{ fontSize: 19, margin: '6px 0 10px' }}>{c.name}</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#a7a293' }}>Preview coming.</p>
          </section>
        ))}
      </div>
      {products.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 32 }}>
          {products.map((p) => (
            <a key={p.slug} href={`/merch/${p.slug}`} style={{ color: 'inherit', textDecoration: 'none', ...card, padding: 12 }}>
              <img src={p.image} alt={p.name} style={{ width: '100%', borderRadius: 8 }} />
              <h2 style={{ fontSize: 16 }}>{p.name}</h2>
              <p style={{ fontSize: 14, opacity: 0.7 }}>Not yet on sale</p>
            </a>
          ))}
        </div>
      ) : null}
      <p style={{ marginTop: 32 }}>
        Want your name on the channel while these are made? <a href="/patrons" style={{ color: '#e6bd77' }}>Join the patron wall</a>.
      </p>
    </main>
  );
}
