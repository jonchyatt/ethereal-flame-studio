import { HYPNOSIS_PROGRAM_ID, loadCatalog, onSale } from '@/lib/hypnosis/catalog';
import { ProgramView } from '../[id]/ProgramView';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Advanced hypnosis sessions · What Am I Appreciating Now',
  description: 'The advanced hypnosis sessions from What Am I Appreciating Now, each with its rights and provenance.',
};

// This static route shadows /programs/[id] for this program, so it renders the same
// program view (buy button, access, audio player) and adds the session list below.
export default async function HypnosisSessionsPage() {
  const sessions = await loadCatalog();
  const status = onSale() ? 'Subscription' : 'Not yet on sale';
  return (
    <ProgramView id={HYPNOSIS_PROGRAM_ID}>
      <h2>Sessions</h2>
      {sessions.length === 0 ? (
        <p>The first sessions are being prepared. Each one will show who wrote it, who voices it, the music, and why we may use all three.</p>
      ) : sessions.map((s) => (
        <section key={s.id} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h3><a href={`/programs/${HYPNOSIS_PROGRAM_ID}/${s.id}`} style={{ color: 'inherit' }}>{s.title}</a></h3>
          <p>{s.summary}</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            {s.durationMinutes ? `${s.durationMinutes} min · ` : ''}{status}
          </p>
        </section>
      ))}
    </ProgramView>
  );
}
