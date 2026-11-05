import { notFound } from 'next/navigation';
import { WaiaFooter } from '@/components/WaiaFooter';
import { NAV_LINK_STYLE } from '@/app/legal/LegalLinks';
import { VR_SESSIONS, vrPublic } from './sessions';

// Read the flag per request, so turning it on needs no rebuild. Not in the sitemap or on the home page.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VR sessions · What Am I Appreciating Now',
  description: '360 VR sessions from What Am I Appreciating Now.',
  robots: { index: false, follow: false },
};

export default function VrPage() {
  if (!vrPublic()) notFound();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 24 }}>
        <a href="/" style={NAV_LINK_STYLE}>Home</a>
        <a href="/store" style={NAV_LINK_STYLE}>Store</a>
        <a href="/programs" style={NAV_LINK_STYLE}>Programs</a>
      </nav>
      <h1>VR sessions</h1>
      <p>360 sessions to watch in a headset or on your phone. Sit somewhere safe, never while driving or moving around.</p>
      {VR_SESSIONS.length === 0 ? (
        <p>The first VR sessions are being prepared.</p>
      ) : VR_SESSIONS.map((s) => (
        <section key={s.youtube} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h2><a href={s.youtube} rel="noopener" style={{ color: 'inherit' }}>{s.title}</a></h2>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{s.length}</p>
          <p>Goes with: <a href={s.goesWith.href} style={{ color: 'inherit' }}>{s.goesWith.label}</a></p>
        </section>
      ))}
      <p><a href="/store/custom-order/brief" style={NAV_LINK_STYLE}>Ask for a custom VR session made for you</a></p>
      <WaiaFooter />
    </main>
  );
}
