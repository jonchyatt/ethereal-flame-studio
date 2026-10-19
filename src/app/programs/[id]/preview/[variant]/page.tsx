import { notFound } from 'next/navigation';
import { getSalesPage, LOOP_STAGES, VARIANT_IDS } from '@/lib/entitlements/salespages';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string; variant: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id, variant } = await params;
  const page = getSalesPage(id, variant);
  return {
    title: `${page ? page.displayName : 'Preview'} · What Am I Appreciating Now`,
    robots: { index: false, follow: false },
  };
}

const wrap = { maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' } as const;

export default async function SalesPagePreview({ params }: { params: Params }) {
  const { id, variant } = await params;
  const page = getSalesPage(id, variant);
  if (!page) notFound();

  return (
    <main style={wrap}>
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Preview {page.variant.toUpperCase()} of {VARIANT_IDS.length}: {page.angle}. Not indexed.{' '}
        {VARIANT_IDS.map((v) => (
          <a key={v} href={`/programs/${id}/preview/${v}`} style={{ color: 'inherit', marginRight: 8 }}>
            {v.toUpperCase()}
          </a>
        ))}
      </p>
      <section aria-labelledby="loop">
        <h2 id="loop">{page.loopSection.heading}</h2>
        <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 0, listStyle: 'none' }}>
          {LOOP_STAGES.map((s) => (
            <li key={s} style={{ border: '1px solid #555', borderRadius: 999, padding: '4px 12px' }}>{s}</li>
          ))}
          <li style={{ borderRadius: 999, padding: '4px 12px', background: '#eee', color: '#0b0b14' }}>Now</li>
        </ol>
        {page.loopSection.body.map((t, i) => <p key={i}>{t}</p>)}
      </section>
      <h1>{page.headline}</h1>
      <p style={{ opacity: 0.8 }}>{page.displayName}</p>
      {page.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.body.map((t, i) => <p key={i}>{t}</p>)}
        </section>
      ))}
      <p role="status" style={{ marginTop: 32, padding: 12, border: '1px solid #555', borderRadius: 8 }}>{page.ctaNote}</p>
      <p style={{ fontSize: 13, opacity: 0.6 }}>What Am I Appreciating Now</p>
    </main>
  );
}
