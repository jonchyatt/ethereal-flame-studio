import { CHANNEL } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
import { Hinge } from '@/components/site/scrollcraft/Hinge';
export const metadata = pageMetadata(
  'About Jonathan and the work',
  '/about',
  'The carving, the question, and Jonathan Hyatt’s original appreciation work.',
);
export default function About() {
  return (
    <ScrollPage name="about">
      <section className="split-section sc-about sc-about-lead" data-sc-act="flow">
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
          <a className="button primary" href="/listen?clip=19">
            Begin with a moment · 0:41
          </a>
        </div>
        <div className="sc-about-plane" data-sc-parallax="-0.6">
          <img src="/brand/carving/05.png" alt="Jonathan Hyatt’s original CNC-carved wooden panel" width="2048" height="1026" />
        </div>
      </section>
      <section className="section split-section sc-about-origin" data-sc-act="flow">
        <Hinge alt="Jonathan Hyatt’s original CNC-carved wooden panel" />
        <div>
          <p>
            Jonathan’s CNC-carved wood panel is the mark at the heart of it. The
            words travel in one unbroken ring: NOW brings the question back
            around, inviting another moment of attention.
          </p>
        </div>
      </section>
      <section className="section sc-about-voice" data-sc-act="flow">
        <div data-sc-reveal="up" data-sc-reveal-at="0 0.25">
          <p>
            The short original reflections use Jonathan’s voice, generated with
            an AI clone made from his own recordings. The channel archive also
            includes 360° pieces featuring Abraham Hicks, each credited
            separately. The readings name their author and reader.
          </p>
        </div>
      </section>
      <section className="section quiet-panel" data-sc-act="flow" data-sc-in>
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
    </ScrollPage>
  );
}
