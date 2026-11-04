import type { Metadata } from 'next';
import MistExperience from './MistExperience';

export const metadata: Metadata = {
  title: 'Mist · What Am I Appreciating Now',
  description: 'A quiet, rising atmosphere in indigo, teal, gold and violet.',
  robots: { index: false, follow: false },
};

export default function MistPage() {
  return <MistExperience />;
}
