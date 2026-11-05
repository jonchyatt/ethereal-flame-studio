import { ProgramCards } from '@/components/site/ProgramCards';
import { EmailSignup } from '@/components/EmailSignup';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'Guided programs',
  '/programs',
  'Explore guided programs from What Am I Appreciating Now, including a food-relationship audio sample.',
  'programs',
);
export default function Programs() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">Listen, then explore</p>
        <h1>Guided programs</h1>
        <p className="lead">
          Two different directions for personal reflection. Begin with what you
          can hear today.
        </p>
      </header>
      <ProgramCards />
      <section className="section quiet-panel">
        <h2>Start with something free</h2>
        <p>
          The original appreciation moments and food-relationship sample are
          free to play here. The program collections are still being prepared;
          their finished contents and access details will be shown when
          available.
        </p>
        <div className="actions">
          <a className="button primary" href="/listen?clip=19">
            Try appreciation · 0:41
          </a>
          <a className="text-link" href="https://resetbiology.com/">
            The free Reset Biology tools stay free ↗
          </a>
        </div>
      </section>
      <EmailSignup />
    </main>
  );
}
