import { TIERS } from '@/lib/patrons/tiers';
import JoinForm from './JoinForm';

export const metadata = {
  title: 'Join the patron wall · What Am I Appreciating Now',
  description: 'Add your name, or a short message, to the patron wall in What Am I Appreciating Now. Nothing is on sale yet.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/patrons/join' },
};

export default function JoinPage() {
  return (
    <main className="narrow" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      <h1>Join the patron wall</h1>
      {/* Copy v2 (Voss/NEPQ, 2026-10-19): calibrated "which" question opens on the reader; the steps follow. v1: docs/COPY-V2-VOSS-NEPQ-2026-10-19.md */}
      <p>Choose a proposed display style and send a name for review. This is a display request, not a membership or a promise of a place in a recording.</p>
      <p style={{ opacity: 0.7, fontSize: 14 }}>No payment is taken here. Every name is read by a person before it appears anywhere.</p>
      <JoinForm tiers={TIERS.map((t) => ({ tier: t.tier, label: t.label, letters: t.letters, allowsMessage: t.allowsMessage }))} />
    </main>
  );
}
