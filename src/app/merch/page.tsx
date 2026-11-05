import { concepts } from '@/lib/site/content';
import { EmailSignup } from '@/components/EmailSignup';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'Design concepts',
  '/merch',
  'Four new concepts inspired by the carving, continuous lettering and luminous orb.',
  'store',
);
export default function Merch() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">Design concepts</p>
        <h1>Carry the question with you</h1>
        <p className="lead">
          Four ideas for things you can wear and hold. Gemini concept renders,
          with print artwork and physical proofs still to come.
        </p>
      </header>
      <div className="merch-grid">
        {concepts.map((c) => (
          <article className="card merch-card" key={c.slug}>
            <a className="design-image" href={`/merch/${c.slug}`}>
              <img
                src={`/brand/concepts/${c.image}`}
                alt={c.title}
                width="1024"
                height="1024"
              />
            </a>
            <div className="card-content">
              <p className="concept-label">Design concept</p>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <a className="button" href={`/merch/${c.slug}`}>
                View design →
              </a>
            </div>
          </article>
        ))}
      </div>
      <section className="section split-section">
        <img
          className="story-mark"
          src="/brand/carving/04.png"
          alt="The original continuous ring: NOW at the left, WHAT at the top, APPRECIATING upside down below"
          width="1024"
          height="1024"
        />
        <div>
          <p className="eyebrow">Where the ring begins</p>
          <h2>One uninterrupted question</h2>
          <p>
            The name follows a continuous clockwise ring, every baseline facing
            inward. APPRECIATING turns upside down below; NOW climbs the left
            and returns to WHAT.
          </p>
          <p>
            The infinity concept carries NOW at the flame-orb crossover.
            Generated lettering and placement still need correction against the
            carving before any design goes to print.
          </p>
        </div>
      </section>
      <EmailSignup question="Hear when the designs move from concept to finished work." />
    </main>
  );
}
