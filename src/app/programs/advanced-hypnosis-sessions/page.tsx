import { HYPNOSIS_PROGRAM_ID } from '@/lib/hypnosis/catalog';
import { ProgramView } from '../[id]/ProgramView';
import { pageMetadata } from '@/lib/site/metadata';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Advanced hypnosis sessions',
  '/programs/advanced-hypnosis-sessions',
  'Advanced hypnosis sessions from What Am I Appreciating Now.',
  'programs',
);
export default function HypnosisSessionsPage() {
  return (
    <ProgramView id={HYPNOSIS_PROGRAM_ID}>
      <section className="program-hero">
        <div>
          <h1>Advanced hypnosis sessions</h1>
          <p className="lead">Sessions are being recorded.</p>
        </div>
      </section>
    </ProgramView>
  );
}
