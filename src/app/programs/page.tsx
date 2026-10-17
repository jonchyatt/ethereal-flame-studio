import { PROGRAMS } from '@/lib/entitlements/catalog';

export const metadata = {
  title: 'Programs · What Am I Appreciating Now',
  description: 'Advanced hypnosis sessions and guided processes from What Am I Appreciating Now. Test mode: nothing is on sale yet.',
};

export default function ProgramsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Programs</h1>
      <p>What Am I Appreciating Now programs. Nothing here is on sale yet; checkout is in test mode.</p>
      {PROGRAMS.map((p) => (
        <section key={p.id} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h2><a href={`/programs/${p.id}`} style={{ color: 'inherit' }}>{p.title}</a></h2>
          <p>{p.summary}</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{p.kind === 'subscription' ? 'Subscription' : 'One-time purchase'} · Not yet on sale</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{p.provenance}</p>
        </section>
      ))}
      <p style={{ fontSize: 14, opacity: 0.7 }}>The free Reset Biology tools stay free.</p>
    </main>
  );
}
