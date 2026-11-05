import type { Metadata } from 'next';
import '../../public/scrollcraft/scrollcraft.css';
import './home.css';
import { RingMark } from '@/components/waia/RingMark';
import { NOW_TURN_DEG } from '@/components/waia/ring';
import { CHANNEL_URL } from '@/components/waia/WaiaHeader';
import { HomeEngine } from '@/components/waia/HomeEngine';
import { OPERATOR } from '@/app/legal/LegalLinks';

/*
 * The public face, built with the Scrollcraft skill (gallery grammar). Brief,
 * journey, feeling curve and score: docs/scrollcraft/WAIA-HOME-BRIEF.md.
 * Every image and clip here is our own render or recording (public/waia-home/).
 */
export const metadata: Metadata = {
  title: 'What Am I Appreciating Now',
  description: 'Short gratitude practices and 360° scenes: a glowing orb over night water. What Am I Appreciating Now.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/' },
};

const CREDIT = 'Voice: Jonathan Hyatt, from an AI clone of his own recordings. Music: Still Habitat, Alaeddin Hallak (CC0).';

// Lengths measured from the files (ffprobe): 41.3 s, 59.3 s, 65.5 s.
const PRACTICES = [
  { id: 'hand', title: 'Put one hand on your chest.', length: '0:41',
    text: 'Rest one hand on your chest and notice what has carried you through today.' },
  { id: 'thanks', title: 'Let that thank-you land again.', length: '0:59',
    text: 'Remember a time someone thanked you and meant it. Give yourself a moment to receive it again.' },
  { id: 'breath', title: 'Take one long breath out with me.', length: '1:05',
    text: 'Pause for a few gentle breaths at your own pace. If anything feels uncomfortable, breathe normally.' },
];

// Jon's four merch concepts, 2026-11-04 (jarvis data/waia-health-shop/MERCH-PROPOSAL-2026-11-04-...).
const MERCH = [
  'Fractal-Vortex Continual Loop Tee',
  'Infinity-Ribbon and Flame Orb Pivot Tee',
  'Carved-Wood Optical Vortex Continual Loop Mug',
  '360 VR Horizon and Luminous Orb Continual Loop Mug',
];

function Plane({ name, rate, src }: { name: string; rate: number; src: string }) {
  return (
    <div className={`plane plane--${name}`} style={{ '--rate': rate } as React.CSSProperties} aria-hidden="true">
      <div className="plane__move" data-sc-parallax={rate}>
        <picture>
          <source media="(max-width: 860px)" srcSet={`/waia-home/${src}-m.webp`} />
          <img src={`/waia-home/${src}.webp`} alt="" width={1920} height={1200} decoding="async" />
        </picture>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main id="waia-home" className="waia-home">
      <noscript><style>{'[data-sc-cue]{opacity:1!important}'}</style></noscript>

      {/* 1. Arrival: object one, a light over night water. Layered planes: sky, orb, ocean. */}
      <section id="top" className="act-hero" data-sc-act="pin" data-sc-span="1.5" aria-labelledby="home-title">
        <div data-sc-stage className="hero">
          <Plane name="sky" rate={0.3} src="hero-L1" />
          <Plane name="orb" rate={-0.45} src="hero-L2" />
          <Plane name="ocean" rate={0.9} src="hero-L3" />
          <div className="label label--plate label--hero" data-sc-cue="0 1 0 0">
            <h1 id="home-title">What Am I Appreciating Now</h1>
            <p className="label__kind">A curated loop. Gratitude practices and 360° scenes.</p>
            <p>A light over night water, made in our own studio. Short practices in Jonathan Hyatt&rsquo;s voice, and scenes you can look around in.</p>
            <a className="label__action label__action--solid" href="#practices">Try a practice</a>
          </div>
        </div>
      </section>

      {/* 2. Practice: the three gratitude clips, a lateral rail of labelled objects. */}
      <section id="practices" className="act-practices" data-sc-act="pan" data-sc-span="2.6" aria-labelledby="practices-title">
        <div data-sc-stage className="practices">
          <div className="vortex" aria-hidden="true" />
          <div className="rail" data-sc-pan="0.04">
            <div className="rail__lead label">
              <h2 id="practices-title">Three short practices</h2>
              <p className="label__kind">Free to play here. About a minute each.</p>
              <p>Press play, put the phone down, and follow along.</p>
              <p className="label__credit">For relaxation and reflection, not treatment. Do not listen while driving.</p>
            </div>
            {PRACTICES.map((p, i) => (
              <article key={p.id} className="piece" style={{ '--i': i + 1 } as React.CSSProperties} aria-labelledby={`practice-${p.id}`}>
                <div className="piece__media">
                  <video controls playsInline preload="none" poster={`/waia-home/practice-${p.id}.webp`}
                    aria-label={`${p.title} Guided practice, ${p.length}.`} data-practice>
                    <source src={`/waia-home/practice-${p.id}.mp4`} type="video/mp4" />
                  </video>
                </div>
                <div className="label">
                  <h3 id={`practice-${p.id}`}>{p.title}</h3>
                  <p className="label__kind">Practice. {p.length}.</p>
                  <p>{p.text}</p>
                  <p className="label__credit">{CREDIT}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The turn (peak): the push-in across the water; the name ring hinges on NOW. */}
      <section id="breath" className="act-peak" data-sc-act="scrub" data-sc-span="3.4" data-sc-dwell="0.4"
        style={{ '--hinge': `${(NOW_TURN_DEG + 360).toFixed(2)}deg` } as React.CSSProperties} aria-labelledby="peak-q">
        <div data-sc-stage className="peak">
          <picture>
            <source media="(max-width: 860px)" srcSet="/waia-home/peak-poster-m.webp" />
            <img className="sc-stage__poster" src="/waia-home/peak-poster.webp" alt="" />
          </picture>
          <video data-sc-scrub data-sc-src="/waia-home/peak.mp4" data-sc-src-mobile="/waia-home/peak-m.mp4" muted playsInline />
          <div className="hinge" aria-hidden="true">
            <RingMark className="hinge__ring" />
          </div>
          <div className="label label--plate label--peak" data-sc-cue="0 1 0 0">
            <p className="label__kind">One long breath out.</p>
            <h2 id="peak-q" className="peak__q">What am I appreciating now?</h2>
            <p className="peak__a">Now, what am I appreciating?</p>
          </div>
        </div>
      </section>

      {/* 4. The house: each branch an object with the same label schema, wiping in as it arrives. */}
      <div className="house">
        <section id="programs" className="obj obj--programs" data-sc-act="flow" aria-labelledby="programs-title">
          <figure className="obj__media" data-sc-reveal="up" data-sc-reveal-at="0.05 0.32">
            <img src="/waia-home/programs.webp" width={900} height={900}
              alt="A many-coloured orb of light in a starfield, from a What Am I Appreciating Now session." />
          </figure>
          <div className="label" data-sc-in data-sc-stagger="60">
            <h2 id="programs-title">Programs</h2>
            <p className="label__kind">Hypnosis and meditation. Not on sale yet.</p>
            <p>Longer guided sessions, and a guided process for locking in a belief you choose, for people who want to go further than the free practices.</p>
            <p className="label__credit">Sessions are for relaxation and reflection. They are not medical or psychological treatment.</p>
            <a className="label__action" href="/programs">See the programs</a>
          </div>
        </section>

        <section id="vr" className="obj obj--vr" data-sc-act="flow" aria-labelledby="vr-title">
          <figure className="obj__media vr-window" data-sc-reveal="left" data-sc-reveal-at="0.05 0.34">
            <div className="vr-window__strip" role="img"
              aria-label="A 360° starfield scene with the orb at its centre, turning slowly as you scroll." />
          </figure>
          <div className="label" data-sc-in data-sc-stagger="60">
            <h2 id="vr-title">VR and 360°</h2>
            <p className="label__kind">Scenes. On the channel.</p>
            <p>The orb in starfields and open skies you can turn around inside, on a phone, a screen or a VR headset.</p>
            <p className="label__credit">Rendered in our own Ethereal Flame Studio pipeline.</p>
            <a className="label__action" href={CHANNEL_URL} target="_blank" rel="noopener">Watch on YouTube</a>
          </div>
        </section>

        <section id="shop" className="obj obj--shop" data-sc-act="flow" aria-labelledby="shop-title">
          <div className="label label--plate" data-sc-in data-sc-stagger="60">
            <h2 id="shop-title">Health shop</h2>
            <p className="label__kind">Supplements and wellness items. Being stocked.</p>
            <p>A short shelf of items from practitioner makers. Every link says plainly where we may earn a commission.</p>
            <p className="label__credit">Nothing on the shelf treats or cures a condition. Ask your own clinician about anything you take.</p>
            <a className="label__action" href="/store/shelf">Visit the shelf</a>
          </div>
        </section>

        <section id="merch" className="obj obj--merch" data-sc-act="flow" aria-labelledby="merch-title">
          <figure className="obj__media" data-sc-reveal="right" data-sc-reveal-at="0.04 0.3">
            <picture>
              <source media="(max-width: 860px)" srcSet="/waia-home/carving-banner-m.webp" />
              <img src="/waia-home/carving-banner.webp" width={1600} height={802}
                alt="A carved wood panel: the words What Am I Appreciating Now in one ring around a spiral vortex." />
            </picture>
          </figure>
          <div className="label label--plate" data-sc-in data-sc-stagger="60">
            <h2 id="merch-title">Merch and patrons</h2>
            <p className="label__kind">Four designs in progress. Patron wall open.</p>
            <ul className="label__list">
              {MERCH.map((m) => <li key={m}>{m}<span> Preview coming.</span></li>)}
            </ul>
            <p className="label__credit">Each carries the name as one continuous ring, the way it reads on the wood panel Jonathan Hyatt carved. Patrons support the channel by name.</p>
            <p className="label__actions">
              <a className="label__action" href="/merch">See the designs</a>
              <a className="label__action" href="/patrons">Join the patron wall</a>
            </p>
          </div>
        </section>
      </div>

      {/* 5. Following along: the page stops; one plate, every door, holding. */}
      <section id="channel" className="act-close" data-sc-act="pin" data-sc-span="1.25" aria-labelledby="channel-title">
        <div data-sc-stage className="close">
          <picture>
            <source media="(max-width: 860px)" srcSet="/waia-home/close-m.webp" />
            <img className="close__ground" src="/waia-home/close.webp" alt="" width={1920} height={1200} />
          </picture>
          <div className="label label--plate label--close" data-sc-cue="0.06">
            <h2 id="channel-title">The channel</h2>
            <p className="label__kind">YouTube. New pieces as they are ready.</p>
            <p>Would you be opposed to following along? The 360° scenes play on a phone, a screen or a VR headset.</p>
            <a className="label__action label__action--solid" href={CHANNEL_URL} target="_blank" rel="noopener">Watch on YouTube</a>
            <nav aria-label="Every door" className="doors">
              <a href="#practices">Try a practice</a>
              <a href="/programs">Programs</a>
              <a href="#vr">VR and 360°</a>
              <a href="/store/shelf">Health shop</a>
              <a href="/merch">Merch</a>
              <a href="/patrons">Patrons</a>
              <a href="/about">About</a>
            </nav>
            <footer className="small-print">
              <nav aria-label="Footer">
                <a href="/legal/terms">Terms</a><a href="/legal/privacy">Privacy</a><a href="/legal/refunds">Refunds</a><a href="/support">Support</a>
              </nav>
              <p>Operated by {OPERATOR.name}.</p>
            </footer>
          </div>
        </div>
      </section>

      <HomeEngine />
    </main>
  );
}
