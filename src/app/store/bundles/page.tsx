import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/site/metadata';
export const metadata = pageMetadata(
  'Gifts and bundles',
  '/store/bundles',
  'Explore the planned program combinations.',
  'store',
);
const combinations = [
  {
    title: 'Advanced + custom session',
    copy: 'The Advanced hypnosis collection paired with a session brief built around your idea.',
    links: [
      ['/programs/advanced-hypnosis-sessions', 'Advanced hypnosis sessions'],
      ['/store/custom-order', 'Custom sessions'],
    ],
  },
  {
    title: 'Belief Lock-In + custom session',
    copy: 'The Belief Lock-In process paired with a personal session request.',
    links: [
      ['/programs/belief-lock-in', 'Belief Lock-In'],
      ['/store/custom-order', 'Custom sessions'],
    ],
  },
  {
    title: 'Advanced + Belief Lock-In',
    copy: 'Two distinct directions: advanced hypnosis sessions and a belief you choose.',
    links: [
      ['/programs/advanced-hypnosis-sessions', 'Advanced hypnosis sessions'],
      ['/programs/belief-lock-in', 'Belief Lock-In'],
    ],
  },
];
export default function Bundles() {
  return (
    <main>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/store">Store</a>
        <span>/ Gifts and bundles</span>
      </nav>
      <div className="program-hero">
        <div>
          <p className="eyebrow">Explore the combinations</p>
          <h1>Gifts and bundles</h1>
          <p className="lead">Bring two kinds of reflection together.</p>
          <p>
            Bundles are being prepared. You can explore their intended
            components.
          </p>
          <p className="meta">
            Gift delivery, redemption, final contents and custom scope will be
            confirmed before a bundle is offered.
          </p>
        </div>
      </div>
      <section className="section three-grid">
        {combinations.map((c) => (
          <article className="quiet-panel" key={c.title}>
            <h2>{c.title}</h2>
            <p>{c.copy}</p>
            {c.links.map(([href, title]) => (
              <a key={href} className="text-link" href={href}>
                {title} →
              </a>
            ))}
          </article>
        ))}
      </section>
      <ComingSoon
        id="bundle-updates"
        item="Gifts and bundles"
        question="Hear when the bundle contents are ready."
      />
    </main>
  );
}
