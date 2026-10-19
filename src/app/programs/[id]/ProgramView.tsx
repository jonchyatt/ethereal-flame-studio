import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadProgramContent } from '@/lib/entitlements/content';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { loadAudioManifest } from '@/lib/entitlements/audio';
import { paymentsLive } from '@/lib/entitlements/stripe';
import { LegalLinks, SAFETY_NOTE } from '@/app/legal/LegalLinks';
import { AudioPlayer } from './AudioPlayer';
import { BuyButton } from './BuyButton';
import { ComingSoon } from '@/components/ComingSoon';
import { CounterBeacon } from '@/components/CounterBeacon';

/**
 * One program page: buy button, or (with access) the guided link, audio player and words.
 * Shared by /programs/[id] and the static /programs/advanced-hypnosis-sessions page, which
 * would otherwise shadow the dynamic route and drop all of this. `children` render last.
 */
const COMING_SOON_QUESTION: Record<string, string> = {
  'advanced-hypnosis-sessions': 'What would you want the first session to help with?',
  'yale-inversion-protocol': 'What would you want this process to help you turn around first?',
};

export async function ProgramView({ id, children }: { id: string; children?: React.ReactNode }) {
  const program = getProgram(id);
  if (!program) notFound();

  let allowed = false;
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    allowed = !!customerId && hasAccess(await loadRecord(customerId), id);
  } catch { /* storage or secret unavailable: fail closed */ }
  const content = allowed ? await loadProgramContent(id) : null;
  let tracks: { id: string; title: string }[] = [];
  if (allowed) {
    try { tracks = (await loadAudioManifest(id)).map(({ id: tid, title }) => ({ id: tid, title })); } catch { /* no audio shown */ }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <CounterBeacon page="program" slug={program.id} />
      <p><a href="/programs" style={{ color: 'inherit' }}>← Programs</a></p>
      <h1>{program.title}</h1>
      <p>{program.summary}</p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>{program.provenance}</p>
      <p style={{ fontSize: 14, opacity: 0.85 }}><strong>Safety:</strong> {SAFETY_NOTE}</p>
      {allowed && program.guided && (
        <p><a href={`/programs/${id}/session`} style={{ color: 'inherit', fontWeight: 600 }}>Open the guided process →</a></p>
      )}
      {allowed && tracks.length > 0 && <AudioPlayer programId={program.id} tracks={tracks} />}
      {allowed ? (
        content ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{content}</pre>
          : <p>You have access. The program words have not been handed over yet.</p>
      ) : (
        // The payment switch decides: off (today) shows the pre-launch state, on shows checkout.
        paymentsLive()
          ? <BuyButton programId={program.id} kind={program.kind} live />
          : <ComingSoon id={`${program.id}-soon`} item={program.title} question={COMING_SOON_QUESTION[program.id]} />
      )}
      {children}
      <LegalLinks />
    </main>
  );
}
