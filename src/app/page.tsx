import { HomeHero } from '@/components/site/HomeHero';
import { Reading } from '@/components/site/Listening';
import { EmailSignup } from '@/components/EmailSignup';
import { clips } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'A moment of appreciation',
  '/',
  'Put one hand on your chest. Begin with a 41-second original reflection in Jonathan Hyatt’s voice.',
);
export default function Home() {
  return (
    <main>
      <HomeHero />
      <section className="section">
        <div className="section-heading">
          <h2>Another way into the moment</h2>
          <a className="text-link" href="/listen">
            All original listening →
          </a>
        </div>
        <div className="two-grid">
          {clips.slice(1).map((clip) => (
            <article className="card clip-card" key={clip.id}>
              <div className="reactive-art clip-card-image">
                <img
                  src={`/media/appreciation/${clip.id}.png`}
                  alt={`Frame from ${clip.title}`}
                  width="1080"
                  height="1920"
                  loading="lazy"
                />
              </div>
              <div className="card-content">
                <p className="eyebrow">{clip.topic}</p>
                <h3>{clip.title}</h3>
                <p>{clip.description}</p>
                <a className="button" href={`/listen?clip=${clip.id}`}>
                  Listen · {clip.duration}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Reading />
      <section className="section split-section">
        <img
          className="story-mark"
          src="/brand/carving/04.png"
          alt="Jonathan’s original carved wood panel"
          width="1024"
          height="1024"
          loading="lazy"
        />
        <div>
          <p className="eyebrow">The question comes around</p>
          <h2>What Am I Appreciating Now</h2>
          <p>
            Jonathan Hyatt’s carving holds the name in one continuous ring. NOW
            leads back into WHAT: a question you can return to, wherever you
            are.
          </p>
          <p>
            Here, original reflections in Jonathan’s AI-cloned voice sit
            alongside readings and a separately credited collection of 360°
            videos.
          </p>
          <a className="text-link" href="/about">
            Meet Jonathan and the work →
          </a>
        </div>
      </section>
      <section className="section">
        <h2>Follow your curiosity</h2>
        <div className="three-grid">
          <article className="quiet-panel">
            <h3>Guided programs</h3>
            <p>
              Explore programs and get told when more opens.
            </p>
            <a className="text-link" href="/programs">
              Explore programs →
            </a>
          </article>
          <article className="quiet-panel">
            <h3>Your own session</h3>
            <p>
              Start with a real example, then describe the session you have in
              mind.
            </p>
            <a className="text-link" href="/store/custom-order">
              Explore custom sessions →
            </a>
          </article>
          <article className="quiet-panel">
            <h3>Carry the question</h3>
            <p>Four new concepts for objects you can wear and hold.</p>
            <a className="text-link" href="/merch">
              View design concepts →
            </a>
          </article>
        </div>
      </section>
      <EmailSignup />
    </main>
  );
}
