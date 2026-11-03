import { LegalLinks, OPERATOR } from '@/app/legal/LegalLinks';

export const metadata = {
  title: 'About · What Am I Appreciating Now',
  description: 'Who runs What Am I Appreciating Now and how to reach us.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/about' },
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 24 }}>
        <a href="/" style={{ color: 'inherit' }}>Home</a>
        <a href="/store" style={{ color: 'inherit' }}>Store</a>
      </nav>
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
      <p style={{ display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, opacity: 0.7 }}>
        <a href="/store" style={{ color: 'inherit' }}>Store</a><a href="/programs" style={{ color: 'inherit' }}>Programs</a>
      </p>
      <LegalLinks />
    </main>
  );
}
