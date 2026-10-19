import { notFound } from 'next/navigation';
import { salesPagesFor } from '@/lib/entitlements/salespages';

export const metadata = { title: 'Sales page previews · What Am I Appreciating Now', robots: { index: false, follow: false } };

export default async function PreviewIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pages = salesPagesFor(id);
  if (pages.length === 0) notFound();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Pick a sales page</h1>
      <ul>
        {pages.map((p) => (
          <li key={p.variant}><a href={`/programs/${id}/preview/${p.variant}`} style={{ color: 'inherit' }}>{p.variant.toUpperCase()}</a>: {p.angle}</li>
        ))}
      </ul>
    </main>
  );
}
