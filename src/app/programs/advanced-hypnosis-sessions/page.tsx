import { getProgram } from '@/lib/entitlements/catalog';
import { HYPNOSIS_PROGRAM_ID, loadCatalog, onSale } from '@/lib/hypnosis/catalog';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Advanced hypnosis sessions · What Am I Appreciating Now',
  description: 'The advanced hypnosis sessions from What Am I Appreciating Now, each with its rights and provenance.',
};

export default async function HypnosisSessionsPage() {
  const program = getProgram(HYPNOSIS_PROGRAM_ID);
  const sessions = await loadCatalog();
  const status = onSale() ? 'Subscription' : 'Not yet on sale';
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p><a href="/programs" style={{ color: 'inherit' }}>← Programs</a></p>
      <h1>{program?.title ?? 'Advanced hypnosis sessions'}</h1>
      <p>{program?.summary}</p>
      {sessions.length === 0 ? (
        <p>The first sessions are being prepared. Each one will show who wrote it, who voices it, the music, and why we may use all three.</p>
      ) : sessions.map((s) => (
        <section key={s.id} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h2><a href={`/programs/${HYPNOSIS_PROGRAM_ID}/${s.id}`} style={{ color: 'inherit' }}>{s.title}</a></h2>
          <p>{s.summary}</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            {s.durationMinutes ? `${s.durationMinutes} min · ` : ''}{status}
          </p>
        </section>
      ))}
    </main>
  );
}
