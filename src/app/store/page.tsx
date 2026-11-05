import { ProgramCards } from '@/components/site/ProgramCards';
import { ClipPlayer } from '@/components/site/MediaPlayer';
import { EmailSignup } from '@/components/EmailSignup';
import { clips, concepts } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'Explore the store',
  '/store',
  'Programs, custom sessions and design concepts for the everyday.',
  'store',
);
export default function Store() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">Take the question with you</p>
        <h1>
          Programs, custom sessions
          <br />
          and objects for the everyday
        </h1>
        <p className="lead">
          Hear a sample, describe an idea, or explore the new designs.
        </p>
      </header>
      <ProgramCards />
      <section className="section split-section">
        <div>
          <p className="eyebrow">Made around your idea</p>
          <h2>A session made for you</h2>
          <p>
            Begin with this original appreciation style example, then tell us
            what you have in mind.
          </p>
          <div className="actions">
            <a className="button primary" href="/store/custom-order/brief">
              Describe a session
            </a>
            <a className="text-link" href="/store/custom-order#lookup">
              Check my request →
            </a>
          </div>
          <p className="meta">
            Sending a brief does not take payment. Scope and delivery are
            discussed before any agreement.
          </p>
        </div>
        <div>
          <ClipPlayer clip={clips[0]} />
          <p className="meta">
            Put one hand on your chest · 0:41 · Original appreciation style
            example
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Design concepts</p>
            <h2>Objects with a question at their heart</h2>
          </div>
          <a className="text-link" href="/merch">
            All four designs →
          </a>
        </div>
        <div className="merch-strip">
          {concepts.map((c) => (
            <article key={c.slug}>
              <a href={`/merch/${c.slug}`}>
                <img
                  src={`/brand/concepts/${c.image}`}
                  alt={c.title}
                  width="1024"
                  height="1024"
                  loading="lazy"
                />
              </a>
              <p className="concept-label">Design concept</p>
              <h3>{c.short}</h3>
              <a className="text-link" href={`/merch/${c.slug}`}>
                View design →
              </a>
            </article>
          ))}
        </div>
        <p className="meta">
          Gemini concept renders. Print artwork and physical proofs are still to
          come.
        </p>
      </section>
      <section id="free-tools" className="section quiet-panel">
        <h2>The free tools stay free</h2>
        <p>Return to the tools you already use at Reset Biology.</p>
        <a className="text-link" href="https://resetbiology.com/">
          Open Reset Biology ↗
        </a>
      </section>
      <EmailSignup />
    </main>
  );
}
