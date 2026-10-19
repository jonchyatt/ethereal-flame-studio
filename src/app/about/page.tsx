import { LegalLinks, OPERATOR } from '@/app/legal/LegalLinks';

export const metadata = {
  title: 'About · What Am I Appreciating Now',
  description: 'Who runs What Am I Appreciating Now and how to reach us.',
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p><a href="/" style={{ color: 'inherit' }}>← What Am I Appreciating Now</a></p>
      <h1>About</h1>
      <p>What Am I Appreciating Now is an immersive 360° and VR collection of curated appreciation, with no host and no narration.</p>
      <h2>Who runs it</h2>
      <p>Operated by {OPERATOR.name}.</p>
      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${OPERATOR.contact}`} style={{ color: '#9cf' }}>{OPERATOR.contact}</a> with any question about the
        site, a purchase, a refund or your data.
      </p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>
        <a href="/store" style={{ color: 'inherit' }}>Store</a> · <a href="/programs" style={{ color: 'inherit' }}>Programs</a>
      </p>
      <LegalLinks />
    </main>
  );
}
