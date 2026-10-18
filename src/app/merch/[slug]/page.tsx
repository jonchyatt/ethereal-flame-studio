import { notFound } from 'next/navigation';
import { getMerch } from '@/lib/merch/catalog';
import { NotifyButton } from './NotifyButton';

export default async function MerchProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getMerch(slug);
  if (!p) notFound();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p><a href="/merch" style={{ color: 'inherit' }}>← Merchandise</a></p>
      <h1>{p.name}</h1>
      <img src={p.image} alt={`${p.name}, illustrative mockup`} style={{ width: '100%', maxWidth: 480, borderRadius: 12 }} />
      <p>{p.description}</p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>
        {p.kindLabel}, printed on demand.{p.sizes.length > 0 ? ` Sizes: ${p.sizes.join(', ')}.` : ''} Colours are set in the store when it opens. Not yet on sale; the image is an illustrative mockup, not a product photo.
      </p>
      <NotifyButton slug={p.slug} sizes={p.sizes} />
    </main>
  );
}
