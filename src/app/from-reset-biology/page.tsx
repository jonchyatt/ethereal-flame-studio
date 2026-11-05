import { ClipPlayer } from '@/components/site/MediaPlayer';
import { clips } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = {
  ...pageMetadata(
    'Welcome from Reset Biology',
    '/from-reset-biology',
    'The free Reset Biology tools stay free. Begin with a short appreciation moment.',
  ),
  robots: { index: false, follow: true },
};
export default function Handoff() {
  return (
    <main>
      <section className="custom-hero handoff-hero">
        <div className="custom-copy">
          <p className="eyebrow">A little space to notice</p>
          <h1>Welcome from Reset Biology</h1>
          <p className="lead">
            The free Reset Biology tools stay free. Take a moment here, then
            return whenever you’re ready.
          </p>
          <div className="actions">
            <a className="button primary" href="https://resetbiology.com/">
              Back to Reset Biology ↗
            </a>
          </div>
        </div>
        <div className="custom-example">
          <ClipPlayer clip={clips[0]} />
          <p className="meta">
            Put one hand on your chest · 0:41 · Original appreciation
          </p>
        </div>
      </section>
      <section className="section">
        <h2>Where would you like to go next?</h2>
        <div className="three-grid">
          <article className="quiet-panel">
            <h3>Another moment</h3>
            <p>Three short reflections in Jonathan’s AI-cloned voice.</p>
            <a className="text-link" href="/listen">
              Explore original appreciation →
            </a>
          </article>
          <article className="quiet-panel">
            <h3>Explore an idea</h3>
            <p>
              Explore guided programs or describe a custom session.
            </p>
            <a className="text-link" href="/programs">
              Guided programs →
            </a>
            <a className="text-link" href="/store/custom-order">
              Custom sessions →
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
