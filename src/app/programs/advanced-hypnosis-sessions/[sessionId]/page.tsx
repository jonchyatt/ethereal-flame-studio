import { notFound } from 'next/navigation';
import { HYPNOSIS_PROGRAM_ID, getSession, onSale } from '@/lib/hypnosis/catalog';
import { SAFETY_NOTE } from '@/app/legal/LegalLinks';

export const dynamic = 'force-dynamic';

export default async function HypnosisSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const s = await getSession(sessionId);
  if (!s) notFound();
  const p = s.provenance;
  return (
    <main className="narrow">
      <p><a href={`/programs/${HYPNOSIS_PROGRAM_ID}`} style={{ color: 'inherit' }}>← Advanced hypnosis sessions</a></p>
      <h1>{s.title}</h1>
      <p>{s.summary}</p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>
        {s.durationMinutes ? `${s.durationMinutes} min · ` : ''}{onSale() ? 'Included with the subscription' : 'Coming soon'}
      </p>
      <h2>Rights and provenance</h2>
      <ul style={{ fontSize: 14, opacity: 0.85 }}>
        <li>Script: {p.scriptAuthor}</li>
        <li>Voice: {p.voice}</li>
        <li>Music: {p.music}</li>
        <li>Rights basis: {p.rightsBasis} ({p.rightsVerified ? 'checked' : 'not yet checked'})</li>
      </ul>
      <p style={{ fontSize: 14, opacity: 0.85 }}><strong>Safety:</strong> {SAFETY_NOTE}</p>
    </main>
  );
}
