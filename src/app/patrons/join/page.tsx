import { TIERS } from '@/lib/patrons/tiers';
import JoinForm from './JoinForm';

export const metadata = {
  title: 'Join the patron wall · What Am I Appreciating Now',
  description: 'Add your name, or a short message, to the patron wall in What Am I Appreciating Now. Nothing is on sale yet.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/patrons/join' },
};

export default function JoinPage() {
  return (
    <main className="narrow">
      <h1>Join the patron wall</h1>
      <p>Choose a display style and send a name for review. This is a free display request, not a membership or a promise of a place in a recording.</p>
      <p className="meta">Every name is read by a person before it appears anywhere.</p>
      <JoinForm tiers={TIERS.map((t) => ({ tier: t.tier, label: t.label, letters: t.letters, allowsMessage: t.allowsMessage }))} />
    </main>
  );
}
