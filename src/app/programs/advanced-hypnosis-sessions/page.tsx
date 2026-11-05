import { HYPNOSIS_PROGRAM_ID, loadCatalog, onSale } from '@/lib/hypnosis/catalog';
import { ProgramView } from '../[id]/ProgramView';

export const dynamic = 'force-dynamic';
// Free sample: audio only, the same file as /listen (the orb video was pulled 2026-11-04).

export const metadata = {
  title: 'Advanced hypnosis sessions · What Am I Appreciating Now',
  description: 'The advanced hypnosis sessions from What Am I Appreciating Now, each with its rights and provenance.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/programs/advanced-hypnosis-sessions' },
};

// This static route shadows /programs/[id] for this program, so it renders the same
// program view (buy button, access, audio player) and adds the session list below.
export default async function HypnosisSessionsPage() {
  const sessions = await loadCatalog();
  const status = onSale() ? 'Subscription' : 'Coming soon';
  return (
    <ProgramView id={HYPNOSIS_PROGRAM_ID}>
      <h2>Free sample</h2>
      <p>Hear one session in full before anything goes on sale.</p>
      <figure style={{ margin: '16px 0 32px' }}>
        <audio controls preload="metadata" src="/samples/gentle-reset-listen.m4a" style={{ width: '100%' }} aria-label="A Gentle Reset: Making Peace with Food, a guided practice" />
        <figcaption style={{ marginTop: 8 }}>
          <strong>A Gentle Reset: Making Peace with Food | Guided Practice</strong>
          <span style={{ display: 'block', fontSize: 15, opacity: 0.85, marginTop: 6 }}>
            How does sitting down to eat feel for you right now? It seems like, for a lot of us, food has turned into one more
            thing to get right. This is a gentle guided practice, about ten minutes long, for making a little peace with it.
            Would it be a bad idea to give yourself these ten minutes before your next meal?
          </span>
          <span style={{ display: 'block', fontSize: 14, opacity: 0.7, marginTop: 6 }}>
            This is not medical advice, therapy, or a promise of any outcome. Words: Reset Biology, &ldquo;Reset Your
            Relationship with Food&rdquo; (owned). Voice: Jonathan Hyatt, generated from his own recordings with an AI voice clone.
          </span>
        </figcaption>
      </figure>
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
