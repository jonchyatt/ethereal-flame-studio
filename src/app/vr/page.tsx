import { videos360 } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  '360° appreciation',
  '/vr',
  'Four existing 360° videos featuring Abraham Hicks, with screen and headset viewing links.',
);
export default function VrPage() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">From the channel archive</p>
        <h1>360° appreciation</h1>
        <p className="lead">
          Watch on a screen or open on YouTube in a compatible headset.
        </p>
      </header>
      <div className="two-grid">
        {videos360.map((v) => (
          <article className="card vr-card" key={v.id}>
            <div className="reactive-art">
              <img
                src={`/media/360/${v.id}.png`}
                alt={`Actual video poster: ${v.title}`}
                width="480"
                height="360"
              />
            </div>
            <div className="card-content">
              <p className="eyebrow">Abraham Hicks · 360° · {v.duration}</p>
              <h2>{v.title}</h2>
              <p className="meta">
                Teacher recording: Abraham Hicks. Existing channel video;
                separate from Jonathan’s original voice work.
              </p>
              <a
                className="button primary"
                href={`https://www.youtube.com/watch?v=${v.id}`}
              >
                Watch on YouTube · {v.duration} ↗
              </a>
            </div>
          </article>
        ))}
      </div>
      <section className="section quiet-panel">
        <h2>Choose how you watch</h2>
        <p>
          On a screen, open the video on YouTube and use its 360° controls to
          look around. For a headset, open the link in a compatible YouTube
          viewer. Viewer and device support varies.
        </p>
        <p>
          Sit somewhere safe. Pause if the movement feels uncomfortable. The
          directory itself is an ordinary web page.
        </p>
        <div className="actions">
          <a className="button" href="/listen">
            Hear Jonathan’s original appreciation
          </a>
          <a className="text-link" href="/store/custom-order">
            Discuss an idea for a custom session →
          </a>
        </div>
      </section>
    </main>
  );
}
