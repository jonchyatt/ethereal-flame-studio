import { HomeHero } from '@/components/site/HomeHero';
import { EmailSignup } from '@/components/EmailSignup';
import { clips } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
import { Hinge } from '@/components/site/scrollcraft/Hinge';
export const metadata = pageMetadata(
  'A moment of appreciation',
  '/',
  'Put one hand on your chest. Begin with a 41-second original reflection in Jonathan Hyatt’s voice.',
);
export default function Home() {
  return (
    <ScrollPage name="home">
      <div data-sc-act="flow"><HomeHero /></div>
      <section className="section" data-sc-act="flow">
        <div className="section-heading">
          <h2>Another way into the moment</h2>
          <a className="text-link" href="/listen">
            All original listening →
          </a>
        </div>
        <div className="two-grid sc-listening-gallery">
          {clips.slice(1).map((clip) => (
            <article className="card clip-card sc-object" key={clip.id} data-sc-in={clip.id === '12' || undefined}>
              <div className="reactive-art clip-card-image" data-sc-reveal={clip.id === '04' ? 'right' : undefined} data-sc-reveal-at="0.1 0.35">
                <img
                  src={`/media/appreciation/${clip.id}.png`}
                  alt={`Frame from ${clip.title}`}
                  width="1080"
                  height="1920"
                  loading="lazy"
                />
              </div>
              <div className="card-content sc-object-copy">
                <h3>{clip.title}</h3>
                <p>{clip.description}</p>
                <p className="meta">{clip.topic}</p>
                <a className="button" href={`/listen?clip=${clip.id}`} data-sc-primary>
                  Listen · {clip.duration}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section split-section sc-carving-peak" data-sc-act="flow">
        <Hinge />
        <div>
          <h2>What Am I Appreciating Now</h2>
          <p className="meta">The question comes around</p>
          <p>
            Jonathan Hyatt’s carving holds the name in one continuous ring. NOW
            leads back into WHAT: a question you can return to, wherever you
            are.
          </p>
          <p>
            Here, original reflections in Jonathan’s AI-cloned voice sit
            alongside a separately credited collection of 360° videos.
          </p>
          <a className="text-link" href="/about">
            Meet Jonathan and the work →
          </a>
        </div>
      </section>
      <section className="section sc-curiosity" data-sc-act="flow">
        <h2>Follow your curiosity</h2>
        <div className="three-grid">
          <article className="quiet-panel" data-sc-in>
            <h3>Guided programs</h3>
            <p>
              Explore programs and get told when more opens.
            </p>
            <a className="text-link" href="/programs">
              Explore programs →
            </a>
          </article>
          <article className="quiet-panel" data-sc-in>
            <h3>Your own session</h3>
            <p>
              Start with a real example, then describe the session you have in
              mind.
            </p>
            <a className="text-link" href="/store/custom-order">
              Explore custom sessions →
            </a>
          </article>
          <article className="quiet-panel" data-sc-in>
            <h3>Carry the question</h3>
            <p>Four new concepts for objects you can wear and hold.</p>
            <a className="text-link" href="/merch">
              View design concepts →
            </a>
          </article>
        </div>
      </section>
      <EmailSignup />
    </ScrollPage>
  );
}
