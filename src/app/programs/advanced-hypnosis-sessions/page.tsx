import { HYPNOSIS_PROGRAM_ID } from '@/lib/hypnosis/catalog';
import { ProgramView } from '../[id]/ProgramView';
import { FoodSample } from '@/components/site/MediaPlayer';
import { pageMetadata } from '@/lib/site/metadata';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Advanced hypnosis sessions',
  '/programs/advanced-hypnosis-sessions',
  'Hear A Gentle Reset: Making Peace with Food, the free 10:35 food-relationship audio sample.',
  'programs',
);
export default function HypnosisSessionsPage() {
  return (
    <ProgramView id={HYPNOSIS_PROGRAM_ID}>
      <div className="program-hero">
        <div>
          <p className="eyebrow">Food and personal reflection</p>
          <h1>Advanced hypnosis sessions</h1>
          <p className="lead">
            How does sitting down to eat feel for you right now?
          </p>
          <p>
            Begin with A Gentle Reset, a guided practice about food and your
            relationship with it.
          </p>
          <p>
            This is the available food-related sample. The wider collection is
            in preparation.
          </p>
        </div>
        <FoodSample />
      </div>
      <section className="section quiet-panel">
        <h2>What you can listen to today</h2>
        <p>
          <strong>A Gentle Reset: Making Peace with Food</strong>
          <br />
          10:35 · Audio · Jonathan Hyatt’s AI-cloned voice · Free sample
        </p>
        <p>
          The collection’s additional sessions and access details will be listed
          here when the finished recordings are ready.
        </p>
      </section>
    </ProgramView>
  );
}
