import { CHANNEL } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'About Jonathan and the work',
  '/about',
  'The carving, the question, and Jonathan Hyatt’s original appreciation work.',
);
export default function About() {
  return (
    <main>
      <section className="split-section">
        <div>
          <p className="eyebrow">The person behind the question</p>
          <h1>
            Jonathan Hyatt,
            <br />
            and a question to return to
          </h1>
          <p className="lead">
            What Am I Appreciating Now brings together original voice-led
            reflections, readings and clearly attributed 360° work.
          </p>
          <p>
            Jonathan’s CNC-carved wood panel is the mark at the heart of it. The
            words travel in one unbroken ring: NOW brings the question back
            around, inviting another moment of attention.
          </p>
          <p>
            The short original reflections use Jonathan’s voice, generated with
            an AI clone made from his own recordings. The channel archive also
            includes 360° pieces featuring Abraham Hicks, each credited
            separately. The readings name their author and reader.
          </p>
          <a className="button primary" href="/listen?clip=19">
            Begin with a moment · 0:41
          </a>
        </div>
        <img
          className="story-mark"
          src="/brand/carving/04.png"
          alt="Jonathan Hyatt’s original CNC-carved wooden panel"
          width="1024"
          height="1024"
        />
      </section>
      <section className="section quiet-panel">
        <h2>Find the work</h2>
        <div className="actions">
          <a className="text-link" href={CHANNEL}>
            What Am I Appreciating Now on YouTube ↗
          </a>
          <a className="text-link" href="https://resetbiology.com/">
            Free Reset Biology tools ↗
          </a>
          <a className="text-link" href="/support">
            Contact and support →
          </a>
        </div>
        <p className="meta">Operated by Hyatt Studio.</p>
      </section>
    </main>
  );
}
